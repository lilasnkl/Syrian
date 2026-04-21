from typing import Optional

from apps.services.models import ServiceListing


class ServiceRepository:
    @staticmethod
    def list_all():
        return ServiceListing.objects.select_related("provider", "provider__user").all()

    @staticmethod
    def get_by_id(service_id: int) -> Optional[ServiceListing]:
        return ServiceListing.objects.select_related("provider", "provider__user").filter(id=service_id).first()

    @staticmethod
    def create(**kwargs):
        return ServiceListing.objects.create(**kwargs)
