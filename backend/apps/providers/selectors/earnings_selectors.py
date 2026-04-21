from datetime import date

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.bids.models import Bid


def _recent_month_starts(count: int):
    current = timezone.localdate().replace(day=1)
    months = []
    year = current.year
    month = current.month

    for offset in range(count - 1, -1, -1):
        target_month = month - offset
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        months.append(date(target_year, target_month, 1))

    return months


def get_provider_earnings_snapshot(provider):
    accepted_bids = (
        Bid.objects.filter(provider=provider, status=Bid.STATUS_ACCEPTED)
        .select_related("order")
        .order_by("-updated_at", "-created_at")
    )

    total_earnings_decimal = accepted_bids.aggregate(total=Sum("amount"))["total"] or 0
    total_earnings = float(total_earnings_decimal)
    accepted_count = accepted_bids.count()
    avg_per_job = round(total_earnings / accepted_count, 2) if accepted_count else 0

    monthly_earnings_map = {
        item["month"].date().replace(day=1): float(item["total"] or 0)
        for item in accepted_bids.annotate(month=TruncMonth("updated_at"))
        .values("month")
        .annotate(total=Sum("amount"))
        .order_by("month")
        if item["month"]
    }

    month_starts = _recent_month_starts(6)
    monthly_earnings = [
        {
            "month": month_start.strftime("%b"),
            "earnings": monthly_earnings_map.get(month_start, 0),
        }
        for month_start in month_starts
    ]
    this_month = monthly_earnings[-1]["earnings"] if monthly_earnings else 0

    transactions = [
        {
            "id": bid.id,
            "job": bid.order.title,
            "amount": float(bid.amount),
            "date": bid.updated_at.date().isoformat(),
            "status": bid.status,
        }
        for bid in accepted_bids
    ]

    return {
        "stats": {
            "total_earnings": total_earnings,
            "this_month": this_month,
            "avg_per_job": avg_per_job,
        },
        "monthly_earnings": monthly_earnings,
        "transactions": transactions,
    }
