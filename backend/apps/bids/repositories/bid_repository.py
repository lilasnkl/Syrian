from typing import Optional

from apps.bids.models import Bid


class BidRepository:
    @staticmethod
    def list_all():
        return Bid.objects.select_related("order", "provider", "provider__user").all()

    @staticmethod
    def get_by_id(bid_id: int) -> Optional[Bid]:
        return Bid.objects.select_related("order", "provider", "provider__user").filter(id=bid_id).first()

    @staticmethod
    def create(**kwargs):
        return Bid.objects.create(**kwargs)
