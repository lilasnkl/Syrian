from django.db import transaction

from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.orders.models import Order
from apps.orders.models import OrderStatusHistory
from apps.orders.repositories import OrderRepository
from shared.exceptions import BusinessRuleViolation, InvalidStateTransition, PermissionDeniedDomain, ResourceNotFound


class OrderService:
    ALLOWED_TRANSITIONS = {
        "open": {"in_progress", "awarded", "cancelled"},
        "awarded": {"in_progress", "completed", "cancelled"},
        "in_progress": {"completed", "cancelled", "disputed"},
        "completed": set(),
        "cancelled": set(),
        "disputed": {"completed", "cancelled"},
    }

    @staticmethod
    @transaction.atomic
    def create_order(*, actor, attrs):
        if actor.role != "customer":
            raise PermissionDeniedDomain("Only customers can create orders.")
        OrderService._validate_service_reference(service=attrs.get("service"), category=attrs.get("category"))
        order = OrderRepository.create(customer=actor, **attrs)

        if order.service_id:
            NotificationService.create(
                recipient=order.service.provider.user,
                type=Notification.TYPE_ORDER,
                title="New service request",
                description=f"{actor.email} sent a request for '{order.service.title}'.",
                link="/provider/requests",
            )

        return order

    @staticmethod
    def get_or_404(order_id: int):
        order = OrderRepository.get_by_id(order_id)
        if not order:
            raise ResourceNotFound("Order not found.")
        return order

    @staticmethod
    def assert_can_view(*, actor, order):
        if actor.role in {"admin", "moderator"}:
            return

        if actor.role == "customer" and order.customer_id == actor.id:
            return

        if actor.role == "provider":
            provider_profile = getattr(actor, "provider_profile", None)
            if not provider_profile:
                raise PermissionDeniedDomain("Provider profile is required.")

            if order.service_id and order.service.provider_id == provider_profile.id:
                return

            if order.status == Order.STATUS_OPEN and order.service_id is None and order.category == provider_profile.category:
                return

            if order.awarded_provider_id == provider_profile.id:
                return

            if order.bids.filter(provider=provider_profile).exists():
                return

        raise PermissionDeniedDomain("Not allowed to view this order.")

    @staticmethod
    @transaction.atomic
    def update_order(*, actor, order, attrs):
        if order.customer_id != actor.id:
            raise PermissionDeniedDomain("Only order owner can update this order.")
        if order.status != "open":
            raise BusinessRuleViolation("Only open orders can be updated.", code="order_not_editable")

        if "service" in attrs:
            requested_service = attrs["service"]
            requested_service_id = requested_service.id if requested_service else None
            if requested_service_id != order.service_id:
                raise BusinessRuleViolation(
                    "Selected service cannot be changed after the request is created.",
                    code="service_not_editable",
                )

        OrderService._validate_service_reference(service=order.service, category=attrs.get("category", order.category))

        for field in ["title", "description", "category", "budget", "location", "urgency", "preferred_time"]:
            if field in attrs:
                setattr(order, field, attrs[field])
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def transition(*, actor, order, to_status: str, note: str = "", awarded_provider=None):
        from_status = order.status
        allowed = OrderService.ALLOWED_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise InvalidStateTransition(
                detail=f"Cannot move order from {from_status} to {to_status}.",
                details={"from_status": from_status, "to_status": to_status},
            )

        if to_status == "cancelled" and actor.id != order.customer_id and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only order owner/admin/moderator can cancel order.")

        if to_status == "awarded" and actor.id != order.customer_id and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only order owner/admin/moderator can award order.")

        if to_status == "awarded":
            if not awarded_provider:
                raise BusinessRuleViolation("Awarded provider is required.", code="awarded_provider_required")
            order.awarded_provider = awarded_provider

        if to_status == "in_progress":
            if actor.role in {"admin", "moderator"}:
                pass
            elif actor.role == "provider":
                if not order.awarded_provider_id or order.awarded_provider.user_id != actor.id:
                    raise PermissionDeniedDomain("Only awarded provider can start the order.")
            else:
                raise PermissionDeniedDomain("Only awarded provider/admin/moderator can start order.")

        if to_status == "completed":
            if actor.role in {"admin", "moderator"}:
                pass
            elif actor.role == "provider":
                if not order.awarded_provider_id or order.awarded_provider.user_id != actor.id:
                    raise PermissionDeniedDomain("Only awarded provider can mark completed.")
            else:
                raise PermissionDeniedDomain("Only awarded provider/admin/moderator can mark completed.")

        if to_status == "disputed":
            provider_user_id = order.awarded_provider.user_id if order.awarded_provider_id else None
            if actor.role not in {"admin", "moderator"} and actor.id not in {order.customer_id, provider_user_id}:
                raise PermissionDeniedDomain("Only order participants/admin/moderator can dispute order.")

        order.status = to_status
        order.save(update_fields=["status", "updated_at", "awarded_provider"])

        OrderStatusHistory.objects.create(
            order=order,
            from_status=from_status,
            to_status=to_status,
            changed_by=actor,
            note=note,
        )

        if to_status == Order.STATUS_COMPLETED:
            NotificationService.create(
                recipient=order.customer,
                type=Notification.TYPE_ORDER,
                title="Service completed",
                description=f"'{order.title}' was marked as completed.",
                link="/my-requests",
            )
        return order

    @staticmethod
    @transaction.atomic
    def sync_offer_status(*, actor, order, note: str = ""):
        accepted_bid = order.bids.filter(status="accepted").select_related("provider").first()
        pending_exists = order.bids.filter(status="pending").exists()
        rejected_exists = order.bids.filter(status="rejected").exists()

        if accepted_bid:
            next_status = Order.STATUS_IN_PROGRESS
            next_awarded_provider = accepted_bid.provider
        elif pending_exists:
            next_status = Order.STATUS_OPEN
            next_awarded_provider = None
        elif rejected_exists:
            next_status = Order.STATUS_CANCELLED
            next_awarded_provider = None
        else:
            next_status = Order.STATUS_OPEN
            next_awarded_provider = None

        previous_status = order.status
        previous_awarded_provider_id = order.awarded_provider_id
        next_awarded_provider_id = next_awarded_provider.id if next_awarded_provider else None
        if previous_status == next_status and previous_awarded_provider_id == next_awarded_provider_id:
            return order

        order.status = next_status
        order.awarded_provider = next_awarded_provider
        order.save(update_fields=["status", "updated_at", "awarded_provider"])

        if previous_status != next_status:
            OrderStatusHistory.objects.create(
                order=order,
                from_status=previous_status,
                to_status=next_status,
                changed_by=actor,
                note=note,
            )
        return order

    @staticmethod
    def _validate_service_reference(*, service, category):
        if not service:
            return

        if not service.is_active:
            raise BusinessRuleViolation("Only active services can receive direct requests.", code="inactive_service")

        if service.category != category:
            raise BusinessRuleViolation(
                "Order category must match the selected service category.",
                code="service_category_mismatch",
                details={"service_category": service.category, "request_category": category},
            )
