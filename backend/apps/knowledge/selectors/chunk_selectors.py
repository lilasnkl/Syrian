from apps.knowledge.models import KnowledgeChunk


def candidate_chunks_queryset(*, provider, allowed_visibilities):
    return KnowledgeChunk.objects.select_related("source", "document", "provider").filter(
        provider=provider,
        visibility__in=allowed_visibilities,
        source__status="active",
        is_active=True,
    )

