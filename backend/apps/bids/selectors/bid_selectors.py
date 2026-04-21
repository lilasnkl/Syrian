from django.db.models import QuerySet

from apps.bids.models import Bid


def bids_queryset() -> QuerySet[Bid]:
    return Bid.objects.select_related("order", "provider", "provider__user").all().order_by("-created_at")
