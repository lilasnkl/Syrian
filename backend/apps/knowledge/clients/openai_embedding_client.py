from django.conf import settings

from shared.exceptions import ExternalServiceError


class OpenAIEmbeddingClient:
    @classmethod
    def embed_texts(cls, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            raise ExternalServiceError(
                detail="OpenAI API key is not configured.",
                code="openai_api_key_missing",
                details={"detail": "Set OPENAI_API_KEY before embedding knowledge chunks."},
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ExternalServiceError(
                detail="OpenAI SDK is not installed.",
                code="openai_sdk_missing",
                details={"detail": "Install the openai package."},
            ) from exc

        try:
            client = OpenAI(api_key=api_key)
            response = client.embeddings.create(
                model=getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
                input=texts,
            )
        except Exception as exc:
            raise ExternalServiceError(
                detail="Unable to embed knowledge right now.",
                code="openai_embedding_failed",
                details={"detail": str(exc)},
            ) from exc

        return [item.embedding for item in sorted(response.data, key=lambda item: item.index)]

