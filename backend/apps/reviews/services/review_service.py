from django.db import transaction
from django.db.models import Avg, Count

from apps.orders.models import Order
from apps.providers.models import ProviderProfile
from apps.reviews.models import Review, ReviewAggregate
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain, ResourceNotFound


class ReviewService:
    @staticmethod
    @transaction.atomic
    def create_review(*, actor, order_id: int, rating: int, comment: str = ""):
        order = Order.objects.select_related("awarded_provider", "customer").filter(id=order_id).first()
        if not order:
            raise ResourceNotFound("Order not found.")
        if order.customer_id != actor.id:
            raise PermissionDeniedDomain("Only order owner can review this order.")
        if order.status != "completed":
            raise BusinessRuleViolation("Only completed orders can be reviewed.", code="order_not_completed")
        if not order.awarded_provider:
            raise BusinessRuleViolation("Order has no awarded provider.", code="provider_missing")
        if Review.objects.filter(order=order).exists():
            raise BusinessRuleViolation("Review already exists for this order.", code="review_exists")

        review = Review.objects.create(
            order=order,
            provider=order.awarded_provider,
            customer=actor,
            rating=rating,
            comment=comment,
        )
        ReviewService._refresh_provider_rating(order.awarded_provider)
        return review

    @staticmethod
    def _refresh_provider_rating(provider: ProviderProfile):
        stats = provider.reviews.aggregate(avg=Avg("rating"), total=Count("id"))
        avg = stats["avg"] or 0
        total = stats["total"] or 0

        agg, _ = ReviewAggregate.objects.get_or_create(provider=provider)
        agg.average_rating = avg
        agg.total_reviews = total
        agg.save(update_fields=["average_rating", "total_reviews", "updated_at"])

        provider.rating = avg
        provider.review_count = total
        provider.save(update_fields=["rating", "review_count", "updated_at"])
