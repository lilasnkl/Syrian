from apps.knowledge.selectors import candidate_chunks_queryset
from apps.knowledge.services.retrieval_scoring_service import RetrievalScoringService
from apps.knowledge.services.retrieval_types import VectorSearchCandidate


class PostgresJsonVectorRetrievalBackend:
    scoring_service_class = RetrievalScoringService

    @classmethod
    def search(
        cls,
        *,
        provider,
        allowed_visibilities,
        query_embedding: list[float],
        normalized_question: str,
        service_id: int | None,
        candidate_limit: int,
    ) -> list[VectorSearchCandidate]:
        queryset = candidate_chunks_queryset(provider=provider, allowed_visibilities=allowed_visibilities)
        if service_id:
            queryset = queryset.filter(metadata__service_id__in=[service_id, str(service_id)]) | queryset.filter(
                metadata__service_id__isnull=True
            )

        candidates = []
        for chunk in queryset:
            if not chunk.embedding:
                continue
            candidates.append(
                VectorSearchCandidate(
                    chunk=chunk,
                    vector_score=cls.scoring_service_class.cosine_similarity(query_embedding, chunk.embedding),
                )
            )
        return candidates

