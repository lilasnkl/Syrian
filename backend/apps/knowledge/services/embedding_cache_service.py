import hashlib

from django.conf import settings
from django.core.cache import cache


class EmbeddingCacheService:
    KEY_PREFIX = "rag:embedding:v1"

    @classmethod
    def get_many(cls, *, model: str, texts: list[str]) -> dict[str, list[float]]:
        ttl_seconds = cls.ttl_seconds()
        if ttl_seconds <= 0 or not texts:
            return {}

        key_by_text = {text: cls.key(model=model, text=text) for text in texts}
        cached_by_key = cache.get_many(key_by_text.values())
        return {
            text: cached_by_key[key]
            for text, key in key_by_text.items()
            if key in cached_by_key and isinstance(cached_by_key[key], list)
        }

    @classmethod
    def set_many(cls, *, model: str, embeddings_by_text: dict[str, list[float]]) -> None:
        ttl_seconds = cls.ttl_seconds()
        if ttl_seconds <= 0 or not embeddings_by_text:
            return

        cache.set_many(
            {cls.key(model=model, text=text): embedding for text, embedding in embeddings_by_text.items()},
            timeout=ttl_seconds,
        )

    @staticmethod
    def ttl_seconds() -> int:
        return int(getattr(settings, "RAG_EMBEDDING_CACHE_TTL_SECONDS", 7 * 24 * 60 * 60))

    @classmethod
    def key(cls, *, model: str, text: str) -> str:
        text_hash = hashlib.sha256((text or "").encode("utf-8")).hexdigest()
        return f"{cls.KEY_PREFIX}:{model}:{text_hash}"
