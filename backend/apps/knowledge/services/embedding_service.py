from django.conf import settings

from apps.knowledge.clients import OpenAIEmbeddingClient
from apps.knowledge.services.embedding_cache_service import EmbeddingCacheService


class EmbeddingService:
    embedding_client_class = OpenAIEmbeddingClient
    cache_service_class = EmbeddingCacheService

    @classmethod
    def embed_chunks(cls, chunks) -> list:
        chunks = list(chunks)
        if not chunks:
            return []

        model = getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
        texts = [chunk.chunk_text for chunk in chunks]
        embeddings_by_text = cls._embed_texts_with_cache(texts, model=model)
        for chunk in chunks:
            embedding = embeddings_by_text.get(chunk.chunk_text, [])
            chunk.embedding = embedding
            chunk.embedding_model = model
            chunk.save(update_fields=["embedding", "embedding_model", "updated_at"])
        return chunks

    @classmethod
    def embed_query(cls, query: str) -> list[float]:
        model = getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
        embeddings_by_text = cls._embed_texts_with_cache([query], model=model)
        return embeddings_by_text.get(query, [])

    @classmethod
    def _embed_texts_with_cache(cls, texts: list[str], *, model: str) -> dict[str, list[float]]:
        cached_embeddings = cls.cache_service_class.get_many(model=model, texts=texts)
        missing_texts = [text for text in dict.fromkeys(texts) if text not in cached_embeddings]
        if not missing_texts:
            return cached_embeddings

        fresh_embeddings = cls.embedding_client_class.embed_texts(missing_texts)
        fresh_by_text = {
            text: embedding
            for text, embedding in zip(missing_texts, fresh_embeddings)
        }
        cls.cache_service_class.set_many(model=model, embeddings_by_text=fresh_by_text)
        return {**cached_embeddings, **fresh_by_text}
