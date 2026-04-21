from typing import Optional

from apps.providers.models import ProviderProfile, VerificationRequest


class ProviderRepository:
    @staticmethod
    def list_all():
        return ProviderProfile.objects.select_related("user").all()

    @staticmethod
    def get_by_id(provider_id: int) -> Optional[ProviderProfile]:
        return ProviderProfile.objects.select_related("user").filter(id=provider_id).first()

    @staticmethod
    def get_by_user_id(user_id: int) -> Optional[ProviderProfile]:
        return ProviderProfile.objects.select_related("user").filter(user_id=user_id).first()

    @staticmethod
    def create(**kwargs):
        return ProviderProfile.objects.create(**kwargs)


class VerificationRepository:
    @staticmethod
    def create(**kwargs):
        return VerificationRequest.objects.create(**kwargs)

    @staticmethod
    def get_by_id(verification_id: int):
        return VerificationRequest.objects.select_related("provider", "provider__user").filter(id=verification_id).first()
