from django.db import transaction

from apps.providers.services import ProviderService
from apps.services.repositories import ServiceRepository
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound


class ServiceListingService:
    @staticmethod
    @transaction.atomic
    def create_service(*, actor, attrs):
        if actor.role != "provider":
            raise PermissionDeniedDomain("Only providers can create services.")

        provider = ProviderService.get_or_create_for_user(actor)
        normalized_attrs = dict(attrs)
        normalized_attrs["category"] = provider.category
        return ServiceRepository.create(provider=provider, **normalized_attrs)

    @staticmethod
    @transaction.atomic
    def update_service(*, actor, service, attrs):
        if actor.role != "provider" or service.provider.user_id != actor.id:
            raise PermissionDeniedDomain("Not allowed to update this service.")

        normalized_attrs = dict(attrs)
        normalized_attrs["category"] = service.provider.category

        for field in ["title", "description", "category", "price", "price_type", "duration", "is_active"]:
            if field in normalized_attrs:
                setattr(service, field, normalized_attrs[field])
        service.save()
        return service

    @staticmethod
    @transaction.atomic
    def delete_service(*, actor, service):
        if actor.role != "provider" or service.provider.user_id != actor.id:
            raise PermissionDeniedDomain("Not allowed to delete this service.")
        service.delete()

    @staticmethod
    def get_service_or_404(service_id: int):
        service = ServiceRepository.get_by_id(service_id)
        if not service:
            raise ResourceNotFound("Service not found.")
        return service
