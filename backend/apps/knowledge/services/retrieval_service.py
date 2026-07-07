import logging

from django.conf import settings

from apps.knowledge.services.retrieval_scoring_service import RetrievalScoringService
from apps.knowledge.services.retrieval_types import RetrievedChunk
from apps.knowledge.services.embedding_service import EmbeddingService
from apps.knowledge.services.vector_backends import VectorRetrievalBackendFactory
from apps.knowledge.services.vector_backends.base import VectorRetrievalBackendUnavailable
from apps.knowledge.services.visibility_policy import KnowledgeVisibilityPolicy
from apps.orders.models import Order
from apps.providers.repositories import ProviderRepository
from shared.exceptions import ResourceNotFound

logger = logging.getLogger(__name__)


class RetrievalService:
    embedding_service_class = EmbeddingService
    scoring_service_class = RetrievalScoringService
    vector_backend_factory_class = VectorRetrievalBackendFactory
    visibility_policy_class = KnowledgeVisibilityPolicy

    @classmethod
    def retrieve(
        cls,
        *,
        actor,
        provider_id: int,
        question: str,
        service_id: int | None = None,
        order_id: int | None = None,
        limit: int | None = None,
    ) -> list[RetrievedChunk]:
        provider = ProviderRepository.get_by_id(provider_id)
        if not provider:
            raise ResourceNotFound("Provider not found.")

        order = None
        if order_id:
            order = Order.objects.filter(id=order_id).first()
            if not order:
                raise ResourceNotFound("Order not found.")

        normalized_question = cls.normalize_question(question)
        query_embedding = cls.embedding_service_class.embed_query(normalized_question)
        allowed_visibilities = cls.visibility_policy_class.allowed_visibilities(actor=actor, provider=provider, order=order)
        top_k = limit or int(getattr(settings, "RAG_TOP_K", 8))
        candidates = cls._search_candidates(
            provider=provider,
            allowed_visibilities=allowed_visibilities,
            query_embedding=query_embedding,
            normalized_question=normalized_question,
            service_id=service_id,
            candidate_limit=cls.candidate_limit(top_k=top_k),
        )
        scored = [
            cls.scoring_service_class.score_candidate(
                normalized_question=normalized_question,
                chunk=candidate.chunk,
                vector_score=candidate.vector_score,
            )
            for candidate in candidates
        ]

        threshold = float(getattr(settings, "RAG_MIN_SIMILARITY", 0.0))
        return sorted([item for item in scored if item.score >= threshold], key=lambda item: item.score, reverse=True)[:top_k]

    @classmethod
    def _search_candidates(
        cls,
        *,
        provider,
        allowed_visibilities,
        query_embedding: list[float],
        normalized_question: str,
        service_id: int | None,
        candidate_limit: int,
    ):
        backend_class = cls.vector_backend_factory_class.selected_backend_class()
        fallback_backend_class = cls.vector_backend_factory_class.fallback_backend_class()
        if backend_class == fallback_backend_class:
            return backend_class.search(
                provider=provider,
                allowed_visibilities=allowed_visibilities,
                query_embedding=query_embedding,
                normalized_question=normalized_question,
                service_id=service_id,
                candidate_limit=candidate_limit,
            )

        try:
            candidates = backend_class.search(
                provider=provider,
                allowed_visibilities=allowed_visibilities,
                query_embedding=query_embedding,
                normalized_question=normalized_question,
                service_id=service_id,
                candidate_limit=candidate_limit,
            )
            if candidates:
                return candidates
            logger.info("Configured vector backend returned no candidates; falling back to postgres_json.")
        except VectorRetrievalBackendUnavailable as exc:
            logger.warning("Configured vector backend is unavailable; falling back to postgres_json. detail=%s", exc)
        except Exception:
            logger.exception("Configured vector backend failed; falling back to postgres_json.")

        return fallback_backend_class.search(
            provider=provider,
            allowed_visibilities=allowed_visibilities,
            query_embedding=query_embedding,
            normalized_question=normalized_question,
            service_id=service_id,
            candidate_limit=candidate_limit,
        )

    @staticmethod
    def candidate_limit(*, top_k: int) -> int:
        configured_limit = int(getattr(settings, "RAG_VECTOR_CANDIDATE_LIMIT", 0))
        if configured_limit > 0:
            return max(top_k, configured_limit)
        multiplier = max(1, int(getattr(settings, "RAG_VECTOR_CANDIDATE_MULTIPLIER", 8)))
        return max(top_k, top_k * multiplier)

    @staticmethod
    def normalize_question(question: str) -> str:
        return RetrievalScoringService.normalize_question(question)

    @staticmethod
    def cosine_similarity(left: list[float], right: list[float]) -> float:
        return RetrievalScoringService.cosine_similarity(left, right)

    @staticmethod
    def lexical_score(question: str, text: str) -> float:
        return RetrievalScoringService.lexical_score(question, text)

    @staticmethod
    def source_quality_score(chunk) -> float:
        return RetrievalScoringService.source_quality_score(chunk)
