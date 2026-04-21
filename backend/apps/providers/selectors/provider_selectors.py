from django.db.models import QuerySet

from apps.providers.models import ProviderProfile, VerificationRequest


def providers_queryset() -> QuerySet[ProviderProfile]:
    return ProviderProfile.objects.select_related("user").all().order_by("-created_at")


def verification_queryset() -> QuerySet[VerificationRequest]:
    return VerificationRequest.objects.select_related("provider", "provider__user").all().order_by("-submitted_at")
