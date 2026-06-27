from django.db import transaction
from django.utils import timezone

from apps.knowledge.models import KnowledgeIngestionJob, KnowledgeSource
from apps.knowledge.repositories import KnowledgeChunkRepository, KnowledgeSourceRepository
from apps.knowledge.services.chunking_service import ChunkingService
from apps.knowledge.services.document_extraction_service import DocumentExtractionService
from apps.knowledge.services.embedding_service import EmbeddingService


class KnowledgeIngestionService:
    extraction_service_class = DocumentExtractionService
    chunking_service_class = ChunkingService
    embedding_service_class = EmbeddingService

    @classmethod
    def process_next_queued(cls):
        job = KnowledgeSourceRepository.next_queued_job()
        if not job:
            return None
        return cls.process_job(job)

    @classmethod
    @transaction.atomic
    def process_job(cls, job):
        now = timezone.now()
        job.status = KnowledgeIngestionJob.STATUS_RUNNING
        job.attempt_count += 1
        job.locked_at = now
        job.started_at = now
        job.error_code = ""
        job.error_detail = ""
        job.save(update_fields=["status", "attempt_count", "locked_at", "started_at", "error_code", "error_detail", "updated_at"])

        source = job.source
        try:
            document = cls.extraction_service_class.extract(source)
            chunks = cls.chunking_service_class.create_chunks(document)
            cls.embedding_service_class.embed_chunks(chunks)
            KnowledgeChunkRepository.deactivate_source_chunks(source)
            for chunk in chunks:
                chunk.is_active = True
                chunk.save(update_fields=["is_active", "updated_at"])
            source.status = KnowledgeSource.STATUS_ACTIVE
            source.last_indexed_at = timezone.now()
            source.error_code = ""
            source.error_detail = ""
            source.save(update_fields=["status", "last_indexed_at", "error_code", "error_detail", "updated_at"])
            job.status = KnowledgeIngestionJob.STATUS_SUCCEEDED
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "finished_at", "updated_at"])
            return source
        except Exception as exc:
            source.status = KnowledgeSource.STATUS_FAILED
            source.error_code = getattr(exc, "code", "knowledge_ingestion_failed")
            source.error_detail = getattr(exc, "detail", str(exc))
            source.save(update_fields=["status", "error_code", "error_detail", "updated_at"])
            job.status = KnowledgeIngestionJob.STATUS_FAILED
            job.error_code = source.error_code
            job.error_detail = source.error_detail
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_code", "error_detail", "finished_at", "updated_at"])
            raise

