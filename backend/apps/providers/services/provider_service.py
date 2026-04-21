from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.core.files.storage import default_storage
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.providers.models import VerificationRequest
from apps.providers.repositories import ProviderRepository, VerificationRepository
from shared.constants import ACTIVE
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain, ResourceNotFound


class ProviderService:
    @staticmethod
    def get_or_create_for_user(user):
        if user.status != ACTIVE:
            raise PermissionDeniedDomain("Blocked account cannot access provider profile.")

        provider = ProviderRepository.get_by_user_id(user.id)
        if provider:
            return provider

        if user.role != "provider":
            raise PermissionDeniedDomain("Only providers can own provider profiles.")

        return ProviderRepository.create(
            user=user,
            display_name=user.get_full_name() or user.username,
            category="cleaning",
        )

    @staticmethod
    def update_profile(*, actor, attrs):
        if actor.role != "provider":
            raise PermissionDeniedDomain("Only providers can update provider profile.")

        provider = ProviderService.get_or_create_for_user(actor)
        for field in [
            "display_name",
            "bio",
            "category",
            "location",
            "hourly_rate",
            "years_experience",
            "skills",
            "availability",
            "response_time",
        ]:
            if field in attrs:
                setattr(provider, field, attrs[field])

        provider.save()
        return provider


class VerificationService:
    @staticmethod
    @transaction.atomic
    def submit_request(*, actor, documents, description="", files=None, years_experience=None, service_areas=None):
        if actor.role != "provider":
            raise PermissionDeniedDomain("Only providers can submit verification requests.")
        provider = ProviderService.get_or_create_for_user(actor)

        pending_exists = provider.verification_requests.filter(status="pending").exists()
        if pending_exists:
            raise BusinessRuleViolation("Pending verification request already exists.", code="pending_verification_exists")

        stored_files = []
        for uploaded_file in files or []:
            suffix = Path(uploaded_file.name).suffix
            stored_path = default_storage.save(
                f"verification_uploads/{provider.id}/{uuid4().hex}{suffix}",
                uploaded_file,
            )
            stored_files.append(
                {
                    "name": uploaded_file.name,
                    "type": uploaded_file.content_type or "application/octet-stream",
                    "size": uploaded_file.size,
                    "path": stored_path,
                }
            )

        verification_request = VerificationRepository.create(
            provider=provider,
            documents=documents,
            description=description,
            files=stored_files,
            years_experience=years_experience,
            service_areas=service_areas or [],
        )
        NotificationService.create_for_admins(
            type=Notification.TYPE_VERIFICATION,
            title="New verification request",
            description=f"{provider.display_name} submitted a verification request.",
            link="/admin/verification",
        )
        return verification_request

    @staticmethod
    @transaction.atomic
    def review_request(*, actor, verification_id: int, approve: bool, rejection_reason: str = ""):
        if actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can review verification requests.")

        req = VerificationRepository.get_by_id(verification_id)
        if not req:
            raise ResourceNotFound("Verification request not found.")

        if req.status != "pending":
            raise BusinessRuleViolation("Verification request already reviewed.", code="already_reviewed")

        if approve:
            req.status = "approved"
            req.provider.is_verified = True
            req.provider.save(update_fields=["is_verified", "updated_at"])
            req.rejection_reason = ""
        else:
            if not rejection_reason:
                raise BusinessRuleViolation("Rejection reason is required.", code="rejection_reason_required")
            req.status = "rejected"
            req.rejection_reason = rejection_reason

        req.reviewed_by = actor
        req.reviewed_at = timezone.now()
        req.save()
        return req

    @staticmethod
    @transaction.atomic
    def revoke_request(*, actor, verification_id: int):
        if actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can revoke verification.")

        req = VerificationRepository.get_by_id(verification_id)
        if not req:
            raise ResourceNotFound("Verification request not found.")

        if req.status != VerificationRequest.STATUS_APPROVED or not req.provider.is_verified:
            raise BusinessRuleViolation("Only active verified providers can be revoked.", code="verification_not_active")

        req.status = VerificationRequest.STATUS_REVOKED
        req.provider.is_verified = False
        req.provider.save(update_fields=["is_verified", "updated_at"])
        req.reviewed_by = actor
        req.reviewed_at = timezone.now()
        req.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        NotificationService.create(
            recipient=req.provider.user,
            type=Notification.TYPE_SYSTEM,
            title="Verification revoked",
            description="Your provider verification has been revoked by an administrator.",
            link="/provider/verification",
        )
        return req

    @staticmethod
    @transaction.atomic
    def revoke_provider(*, actor, provider_id: int):
        if actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can revoke verification.")

        provider = ProviderRepository.get_by_id(provider_id)
        if not provider:
            raise ResourceNotFound("Provider not found.")

        if not provider.is_verified:
            raise BusinessRuleViolation("Only verified providers can be revoked.", code="verification_not_active")

        approved_request = (
            provider.verification_requests.filter(status=VerificationRequest.STATUS_APPROVED)
            .order_by("-reviewed_at", "-submitted_at")
            .first()
        )
        if not approved_request:
            raise BusinessRuleViolation("Approved verification record not found.", code="verification_record_missing")

        return VerificationService.revoke_request(actor=actor, verification_id=approved_request.id)
