from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.bids.models import Bid
from apps.complaints.models import Complaint
from apps.orders.models import Order
from apps.providers.models import ProviderProfile


def _full_name_or_email(user):
    full_name = user.get_full_name().strip()
    return full_name or user.email


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


def get_dashboard_snapshot():
    User = get_user_model()

    total_users = User.objects.count()
    total_providers = ProviderProfile.objects.count()
    total_requests = Order.objects.count()
    total_complaints = Complaint.objects.count()
    total_revenue = Bid.objects.filter(status=Bid.STATUS_ACCEPTED).aggregate(total=Sum("amount"))["total"] or 0

    monthly_counts = {
        item["month"].date().replace(day=1): item["count"]
        for item in Order.objects.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
        if item["month"]
    }

    monthly_requests = [
        {
            "month": month_start.strftime("%b"),
            "requests": monthly_counts.get(month_start, 0),
        }
        for month_start in _recent_month_starts(6)
    ]

    recent_requests = [
        {
            "id": order.id,
            "title": order.title,
            "customer_name": _full_name_or_email(order.customer),
            "status": order.status,
        }
        for order in Order.objects.select_related("customer").order_by("-created_at")[:3]
    ]

    recent_bids = [
        {
            "id": bid.id,
            "amount": float(bid.amount),
            "provider_name": bid.provider.display_name,
            "status": bid.status,
        }
        for bid in Bid.objects.select_related("provider").order_by("-created_at")[:3]
    ]

    recent_complaints = [
        {
            "id": complaint.id,
            "subject": complaint.subject,
            "complainant_name": _full_name_or_email(complaint.complainant),
            "status": complaint.status,
        }
        for complaint in Complaint.objects.select_related("complainant").order_by("-created_at")[:2]
    ]

    return {
        "stats": {
            "total_users": total_users,
            "providers": total_providers,
            "requests": total_requests,
            "complaints": total_complaints,
            "revenue": float(total_revenue),
        },
        "activity": {
            "monthly_requests": monthly_requests,
        },
        "recent_requests": recent_requests,
        "recent_bids": recent_bids,
        "recent_complaints": recent_complaints,
    }
