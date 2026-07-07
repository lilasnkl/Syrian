from apps.knowledge.selectors import candidate_chunks_queryset
from apps.knowledge.services.retrieval_scoring_service import RetrievalScoringService
from apps.knowledge.services.retrieval_types import VectorSearchCandidate
from apps.knowledge.services.vector_backends.base import VectorRetrievalBackendUnavailable
from apps.knowledge.services.zvec_index_service import ZvecIndexUnavailable, ZvecKnowledgeIndexService


class ZvecVectorRetrievalBackend:
    index_service_class = ZvecKnowledgeIndexService
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
        try:
            hits = cls.index_service_class.search_provider(
                provider=provider,
                query_embedding=query_embedding,
                top_k=candidate_limit,
            )
        except ZvecIndexUnavailable as exc:
            raise VectorRetrievalBackendUnavailable(str(exc)) from exc

        if not hits:
            return []

        hit_ids = [hit.chunk_id for hit in hits]
        queryset = candidate_chunks_queryset(provider=provider, allowed_visibilities=allowed_visibilities).filter(id__in=hit_ids)
        if service_id:
            queryset = queryset.filter(metadata__service_id__in=[service_id, str(service_id)]) | queryset.filter(
                metadata__service_id__isnull=True
            )
        chunks_by_id = {chunk.id: chunk for chunk in queryset}

        candidates = []
        for hit in hits:
            chunk = chunks_by_id.get(hit.chunk_id)
            if not chunk or not chunk.embedding:
                continue
            candidates.append(
                VectorSearchCandidate(
                    chunk=chunk,
                    vector_score=cls.scoring_service_class.cosine_similarity(query_embedding, chunk.embedding),
                )
            )
        return candidates

