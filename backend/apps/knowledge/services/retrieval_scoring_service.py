import math
import re

from apps.knowledge.services.retrieval_types import RetrievedChunk


class RetrievalScoringService:
    @classmethod
    def score_candidate(cls, *, normalized_question: str, chunk, vector_score: float) -> RetrievedChunk:
        lexical_score = cls.lexical_score(normalized_question, chunk.chunk_text)
        final_score = (0.70 * vector_score) + (0.20 * lexical_score) + (0.10 * cls.source_quality_score(chunk))
        return RetrievedChunk(
            chunk=chunk,
            score=final_score,
            lexical_score=lexical_score,
            vector_score=vector_score,
        )

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
        question_terms = {
            term.lower()
            for term in re.findall(r"[\w\u0600-\u06FF]+", question or "")
            if len(term) > 2
        }
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

