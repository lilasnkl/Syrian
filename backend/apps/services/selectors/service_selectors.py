from django.db.models import QuerySet

from apps.services.models import ServiceListing


def services_queryset() -> QuerySet[ServiceListing]:
    return ServiceListing.objects.select_related("provider", "provider__user").all().order_by("-created_at")
