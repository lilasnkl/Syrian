import hashlib
import json

from django.conf import settings
from django.core.cache import cache

from apps.customer_assistant.services.prompt_builder import CustomerRagPromptBuilder


class AnswerCacheService:
    KEY_PREFIX = "rag:answer:v1"

    @classmethod
    def get(cls, *, question: str, provider, retrieved_chunks: list) -> dict | None:
        ttl_seconds = cls.ttl_seconds()
        if ttl_seconds <= 0:
            return None
        payload = cache.get(cls.key(question=question, provider=provider, retrieved_chunks=retrieved_chunks))
        return payload if isinstance(payload, dict) else None

    @classmethod
    def set(cls, *, question: str, provider, retrieved_chunks: list, answer_payload: dict) -> None:
        ttl_seconds = cls.ttl_seconds()
        if ttl_seconds <= 0:
            return
        cache.set(
            cls.key(question=question, provider=provider, retrieved_chunks=retrieved_chunks),
            answer_payload,
            timeout=ttl_seconds,
        )

    @staticmethod
    def ttl_seconds() -> int:
        return int(getattr(settings, "RAG_ANSWER_CACHE_TTL_SECONDS", 10 * 60))

    @classmethod
    def key(cls, *, question: str, provider, retrieved_chunks: list) -> str:
        fingerprint = {
            "model": getattr(settings, "OPENAI_CUSTOMER_QA_MODEL", "gpt-4o-mini"),
            "prompt_version": CustomerRagPromptBuilder.PROMPT_VERSION,
            "provider_id": provider.id,
            "provider_updated_at": str(getattr(provider, "updated_at", "")),
            "question": question,
            "evidence": [
                {
                    "chunk_id": item.chunk.id,
                    "chunk_hash": item.chunk.chunk_hash,
                    "source_id": item.chunk.source_id,
                    "source_version": item.chunk.source.source_version,
                    "visibility": item.chunk.visibility,
                }
                for item in retrieved_chunks
            ],
        }
        serialized = json.dumps(fingerprint, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        return f"{cls.KEY_PREFIX}:{digest}"
