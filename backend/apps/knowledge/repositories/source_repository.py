from apps.knowledge.models import KnowledgeIngestionJob, KnowledgeSource


class KnowledgeSourceRepository:
    @staticmethod
    def create_source(**kwargs):
        return KnowledgeSource.objects.create(**kwargs)

    @staticmethod
    def get_by_id(source_id: int):
        return KnowledgeSource.objects.select_related("provider", "provider__user", "created_by").filter(id=source_id).first()

    @staticmethod
    def create_job(*, source, job_type=KnowledgeIngestionJob.TYPE_FULL):
        return KnowledgeIngestionJob.objects.create(source=source, job_type=job_type)

    @staticmethod
    def next_queued_job():
        return (
            KnowledgeIngestionJob.objects.select_related("source", "source__provider")
            .filter(status=KnowledgeIngestionJob.STATUS_QUEUED)
            .order_by("created_at")
            .first()
        )

