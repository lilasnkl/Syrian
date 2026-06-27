from django.conf import settings

from apps.knowledge.clients import OpenAIEmbeddingClient


class EmbeddingService:
    embedding_client_class = OpenAIEmbeddingClient

    @classmethod
    def embed_chunks(cls, chunks) -> list:
        chunks = list(chunks)
        if not chunks:
            return []

        texts = [chunk.chunk_text for chunk in chunks]
        embeddings = cls.embedding_client_class.embed_texts(texts)
        model = getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
            chunk.embedding_model = model
            chunk.save(update_fields=["embedding", "embedding_model", "updated_at"])
        return chunks

    @classmethod
    def embed_query(cls, query: str) -> list[float]:
        vectors = cls.embedding_client_class.embed_texts([query])
        return vectors[0] if vectors else []

