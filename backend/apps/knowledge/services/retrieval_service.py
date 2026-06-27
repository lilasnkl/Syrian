import math
import re
from dataclasses import dataclass

from django.conf import settings

from apps.knowledge.selectors import candidate_chunks_queryset
from apps.knowledge.services.embedding_service import EmbeddingService
from apps.knowledge.services.visibility_policy import KnowledgeVisibilityPolicy
from apps.orders.models import Order
from apps.providers.repositories import ProviderRepository
from shared.exceptions import ResourceNotFound


@dataclass(frozen=True)
class RetrievedChunk:
    chunk: object
    score: float
    lexical_score: float
    vector_score: float


class RetrievalService:
    embedding_service_class = EmbeddingService
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
        queryset = candidate_chunks_queryset(provider=provider, allowed_visibilities=allowed_visibilities)

        if service_id:
            queryset = queryset.filter(metadata__service_id__in=[service_id, str(service_id)]) | queryset.filter(metadata__service_id__isnull=True)

        scored = []
        for chunk in queryset:
            if not chunk.embedding:
                continue
            vector_score = cls.cosine_similarity(query_embedding, chunk.embedding)
            lexical_score = cls.lexical_score(normalized_question, chunk.chunk_text)
            final_score = (0.70 * vector_score) + (0.20 * lexical_score) + (0.10 * cls.source_quality_score(chunk))
            scored.append(RetrievedChunk(chunk=chunk, score=final_score, lexical_score=lexical_score, vector_score=vector_score))

        threshold = float(getattr(settings, "RAG_MIN_SIMILARITY", 0.0))
        top_k = limit or int(getattr(settings, "RAG_TOP_K", 8))
        return sorted([item for item in scored if item.score >= threshold], key=lambda item: item.score, reverse=True)[:top_k]

    @staticmethod
    def normalize_question(question: str) -> str:
        return re.sub(r"\s+", " ", (question or "")).strip()

    @staticmethod
    def cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        dot = sum(a * b for a, b in zip(left, right))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if not left_norm or not right_norm:
            return 0.0
        return dot / (left_norm * right_norm)

    @staticmethod
    def lexical_score(question: str, text: str) -> float:
        question_terms = {term.lower() for term in re.findall(r"[\w\u0600-\u06FF]+", question or "") if len(term) > 2}
        if not question_terms:
            return 0.0
        text_terms = {term.lower() for term in re.findall(r"[\w\u0600-\u06FF]+", text or "")}
        return len(question_terms & text_terms) / len(question_terms)

    @staticmethod
    def source_quality_score(chunk) -> float:
        score = 0.0
        if getattr(chunk.provider, "is_verified", False):
            score += 0.4
        if chunk.source.status == "active":
            score += 0.4
        if chunk.source.last_indexed_at:
            score += 0.2
        return min(score, 1.0)

