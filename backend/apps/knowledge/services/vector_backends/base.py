from typing import Protocol

from apps.knowledge.services.retrieval_types import VectorSearchCandidate


class VectorRetrievalBackendUnavailable(Exception):
    pass


class VectorRetrievalBackend(Protocol):
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
        ...

