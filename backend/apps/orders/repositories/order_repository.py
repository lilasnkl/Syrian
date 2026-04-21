from typing import Optional

from apps.orders.models import Order


class OrderRepository:
    @staticmethod
    def list_all():
        return (
            Order.objects.select_related("customer", "service", "awarded_provider", "awarded_provider__user")
            .prefetch_related("bids")
            .all()
        )

    @staticmethod
    def get_by_id(order_id: int) -> Optional[Order]:
        return (
            Order.objects.select_related("customer", "service", "awarded_provider", "awarded_provider__user")
            .prefetch_related("bids")
            .filter(id=order_id)
            .first()
        )

    @staticmethod
    def create(**kwargs):
        return Order.objects.create(**kwargs)
