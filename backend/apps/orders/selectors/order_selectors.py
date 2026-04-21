from django.db.models import QuerySet

from apps.orders.models import Order


def orders_queryset() -> QuerySet[Order]:
    return (
        Order.objects.select_related("customer", "service", "awarded_provider", "awarded_provider__user")
        .prefetch_related("bids")
        .all()
        .order_by("-created_at")
    )
