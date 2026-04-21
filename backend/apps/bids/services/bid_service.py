from django.db import transaction

from apps.bids.models import BidStatusHistory
from apps.bids.repositories import BidRepository
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.providers.services import ProviderService
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain, ResourceNotFound


class BidService:
    @staticmethod
    def get_or_404(bid_id: int):
        bid = BidRepository.get_by_id(bid_id)
        if not bid:
            raise ResourceNotFound("Bid not found.")
        return bid

    @staticmethod
    def assert_can_view(*, actor, bid):
        if actor.role in {"admin", "moderator"}:
            return

        if actor.role == "customer" and bid.order.customer_id == actor.id:
            return

        if actor.role == "provider" and bid.provider.user_id == actor.id:
            return

        raise PermissionDeniedDomain("Not allowed to view this bid.")

    @staticmethod
    @transaction.atomic
    def create_bid(*, actor, order, attrs):
        if actor.role != "provider":
            raise PermissionDeniedDomain("Only providers can place bids.")

        provider = ProviderService.get_or_create_for_user(actor)

        if order.status != Order.STATUS_OPEN:
            raise BusinessRuleViolation("Bids can only be placed on open requests.", code="order_not_open")

        if order.service_id:
            if order.service.provider_id != provider.id:
                raise PermissionDeniedDomain("Only the selected service provider can send an offer for this request.")
        elif order.category != provider.category:
            raise BusinessRuleViolation(
                "Providers can only bid on requests in their own category.",
                code="provider_category_mismatch",
            )

        existing = order.bids.filter(provider=provider).first()
        if existing:
            raise BusinessRuleViolation("Provider already bid on this order.", code="duplicate_bid")

        bid = BidRepository.create(order=order, provider=provider, **attrs)
        NotificationService.create(
            recipient=order.customer,
            type=Notification.TYPE_BID,
            title="New offer received",
            description=f"{provider.display_name} sent an offer for '{order.title}'.",
            link="/my-bids",
        )
        return bid

    @staticmethod
    @transaction.atomic
    def update_bid(*, actor, bid, attrs):
        if actor.role != "provider" or bid.provider.user_id != actor.id:
            raise PermissionDeniedDomain("Only bid owner can update bid.")
        if bid.status != "pending":
            raise BusinessRuleViolation("Only pending bids can be updated.", code="bid_not_editable")
        if bid.order.status != Order.STATUS_OPEN:
            raise BusinessRuleViolation("Only open requests can be updated.", code="order_not_open")

        for field in ["amount", "message", "estimated_duration"]:
            if field in attrs:
                setattr(bid, field, attrs[field])
        bid.save()
        return bid

    @staticmethod
    @transaction.atomic
    def withdraw_bid(*, actor, bid):
        if actor.role != "provider" or bid.provider.user_id != actor.id:
            raise PermissionDeniedDomain("Only bid owner can withdraw bid.")
        if bid.status != "pending":
            raise BusinessRuleViolation("Only pending bids can be withdrawn.", code="bid_not_pending")
        if bid.order.status != Order.STATUS_OPEN:
            raise BusinessRuleViolation("Only open requests can be updated.", code="order_not_open")
        BidService._set_status(bid=bid, actor=actor, to_status="withdrawn")
        return bid

    @staticmethod
    @transaction.atomic
    def accept_bid(*, actor, bid):
        if actor.id != bid.order.customer_id and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only order owner/admin/moderator can accept bids.")
        if bid.status != "pending":
            raise BusinessRuleViolation("Only pending bids can be accepted.", code="bid_not_pending")
        if bid.order.status != Order.STATUS_OPEN:
            raise BusinessRuleViolation("Only open requests can accept offers.", code="order_not_open")

        BidService._set_status(bid=bid, actor=actor, to_status="accepted")

        others = bid.order.bids.filter(status="pending").exclude(id=bid.id)
        for other in others:
            BidService._set_status(bid=other, actor=actor, to_status="rejected")
            NotificationService.create(
                recipient=other.provider.user,
                type=Notification.TYPE_BID,
                title="Offer rejected",
                description=f"Your offer for '{other.order.title}' was not accepted.",
                link="/provider/offers",
            )

        OrderService.sync_offer_status(actor=actor, order=bid.order, note=f"Bid {bid.id} accepted.")
        NotificationService.create(
            recipient=bid.provider.user,
            type=Notification.TYPE_BID,
            title="Offer accepted",
            description=f"Your offer for '{bid.order.title}' was accepted.",
            link="/provider/in-progress",
        )
        return bid

    @staticmethod
    @transaction.atomic
    def reject_bid(*, actor, bid):
        if actor.id != bid.order.customer_id and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only order owner/admin/moderator can reject bids.")
        if bid.status != "pending":
            raise BusinessRuleViolation("Only pending bids can be rejected.", code="bid_not_pending")
        if bid.order.status != Order.STATUS_OPEN:
            raise BusinessRuleViolation("Only open requests can reject offers.", code="order_not_open")

        BidService._set_status(bid=bid, actor=actor, to_status="rejected")
        OrderService.sync_offer_status(actor=actor, order=bid.order, note=f"Bid {bid.id} rejected.")
        NotificationService.create(
            recipient=bid.provider.user,
            type=Notification.TYPE_BID,
            title="Offer rejected",
            description=f"Your offer for '{bid.order.title}' was rejected.",
            link="/provider/offers",
        )
        return bid

    @staticmethod
    def _set_status(*, bid, actor, to_status: str, note: str = ""):
        from_status = bid.status
        bid.status = to_status
        bid.save(update_fields=["status", "updated_at"])
        BidStatusHistory.objects.create(
            bid=bid,
            from_status=from_status,
            to_status=to_status,
            changed_by=actor,
            note=note,
        )
