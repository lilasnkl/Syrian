from apps.knowledge.models import KnowledgeChunk


class KnowledgeChunkRepository:
    @staticmethod
    def active_chunks_for_provider(*, provider, allowed_visibilities):
        return KnowledgeChunk.objects.select_related("source", "document", "provider").filter(
            provider=provider,
            visibility__in=allowed_visibilities,
            source__status="active",
            is_active=True,
        )

    @staticmethod
    def deactivate_source_chunks(source):
        return KnowledgeChunk.objects.filter(source=source, is_active=True).update(is_active=False)

