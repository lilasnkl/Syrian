import hashlib
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction

from apps.knowledge.models import KnowledgeIngestionJob, KnowledgeSource
from apps.knowledge.repositories import KnowledgeSourceRepository
from apps.providers.services import ProviderService
from shared.constants import ACTIVE
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain


class SourceSubmissionService:
    DEFAULT_ALLOWED_CONTENT_TYPES = {
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/csv",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    @classmethod
    @transaction.atomic
    def submit_file(
        cls,
        *,
        actor,
        title: str,
        uploaded_file,
        description: str = "",
        visibility: str = KnowledgeSource.VISIBILITY_PROVIDER_PRIVATE,
        source_type: str = KnowledgeSource.TYPE_UPLOADED_FILE,
    ):
        provider = cls._get_actor_provider(actor)
        cls._validate_visibility(actor=actor, visibility=visibility)
        cls._validate_file(uploaded_file)

        checksum = cls._checksum(uploaded_file)
        suffix = Path(uploaded_file.name).suffix
        source = KnowledgeSourceRepository.create_source(
            provider=provider,
            created_by=actor,
            title=title,
            description=description,
            source_type=source_type,
            original_filename=uploaded_file.name,
            content_type=getattr(uploaded_file, "content_type", "") or "application/octet-stream",
            file_size=uploaded_file.size,
            checksum_sha256=checksum,
            visibility=visibility,
            status=KnowledgeSource.STATUS_PENDING,
        )

        storage_path = default_storage.save(
            f"knowledge_uploads/{provider.id}/{source.id}/{uuid4().hex}{suffix}",
            uploaded_file,
        )
        source.storage_path = storage_path
        source.save(update_fields=["storage_path", "updated_at"])
        KnowledgeSourceRepository.create_job(source=source, job_type=KnowledgeIngestionJob.TYPE_FULL)
        return source

    @staticmethod
    def _get_actor_provider(actor):
        if actor.role != "provider":
            raise PermissionDeniedDomain("Only providers can submit knowledge sources.")
        if actor.status != ACTIVE:
            raise PermissionDeniedDomain("Blocked account cannot submit knowledge sources.")
        return ProviderService.get_or_create_for_user(actor)

    @staticmethod
    def _validate_visibility(*, actor, visibility: str) -> None:
        if visibility == KnowledgeSource.VISIBILITY_ADMIN_ONLY and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can create admin-only sources.")
        valid = {choice for choice, _label in KnowledgeSource.VISIBILITY_CHOICES}
        if visibility not in valid:
            raise BusinessRuleViolation("Unsupported knowledge source visibility.", code="unsupported_visibility")

    @classmethod
    def _validate_file(cls, uploaded_file) -> None:
        if not uploaded_file:
            raise BusinessRuleViolation("Knowledge source file is required.", code="knowledge_file_required")

        max_mb = int(getattr(settings, "RAG_MAX_UPLOAD_MB", 10))
        if uploaded_file.size > max_mb * 1024 * 1024:
            raise BusinessRuleViolation(
                f"Knowledge source file must be {max_mb}MB or smaller.",
                code="knowledge_file_too_large",
            )

        allowed_types = set(getattr(settings, "RAG_ALLOWED_MIME_TYPES", cls.DEFAULT_ALLOWED_CONTENT_TYPES))
        content_type = getattr(uploaded_file, "content_type", "") or ""
        if allowed_types and content_type not in allowed_types:
            raise BusinessRuleViolation(
                "Unsupported knowledge source file type.",
                code="unsupported_knowledge_file_type",
                details={"content_type": content_type},
            )

    @staticmethod
    def _checksum(uploaded_file) -> str:
        hasher = hashlib.sha256()
        position = uploaded_file.tell() if hasattr(uploaded_file, "tell") else None
        for chunk in uploaded_file.chunks():
            hasher.update(chunk)
        if position is not None:
            uploaded_file.seek(position)
        else:
            uploaded_file.seek(0)
        return hasher.hexdigest()

