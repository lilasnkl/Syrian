from django.db import transaction

from apps.knowledge.models import KnowledgeIngestionJob, KnowledgeSource
from apps.knowledge.repositories import KnowledgeChunkRepository, KnowledgeSourceRepository
from apps.knowledge.services.zvec_index_service import ZvecKnowledgeIndexService
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound


class SourceLifecycleService:
    vector_index_service_class = ZvecKnowledgeIndexService

    @classmethod
    @transaction.atomic
    def archive(cls, *, actor, source_id: int):
        source = cls._get_owned_source(actor=actor, source_id=source_id)
        source.status = KnowledgeSource.STATUS_ARCHIVED
        source.save(update_fields=["status", "updated_at"])
        KnowledgeChunkRepository.deactivate_source_chunks(source)
        transaction.on_commit(lambda source=source: cls.vector_index_service_class.sync_source(source))
        return source

    @classmethod
    @transaction.atomic
    def reindex(cls, *, actor, source_id: int):
        source = cls._get_owned_source(actor=actor, source_id=source_id)
        source.status = KnowledgeSource.STATUS_PENDING
        source.error_code = ""
        source.error_detail = ""
        source.source_version += 1
        source.save(update_fields=["status", "error_code", "error_detail", "source_version", "updated_at"])
        return KnowledgeSourceRepository.create_job(source=source, job_type=KnowledgeIngestionJob.TYPE_REINDEX)

    @staticmethod
    def _get_owned_source(*, actor, source_id: int):
        source = KnowledgeSourceRepository.get_by_id(source_id)
        if not source:
            raise ResourceNotFound("Knowledge source not found.")
        if actor.role not in {"admin", "moderator"} and source.provider.user_id != actor.id:
            raise PermissionDeniedDomain("Not allowed to manage this knowledge source.")
        return source
