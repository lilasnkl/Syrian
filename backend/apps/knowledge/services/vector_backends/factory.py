from django.conf import settings

from apps.knowledge.services.vector_backends.postgres_json_backend import PostgresJsonVectorRetrievalBackend
from apps.knowledge.services.vector_backends.zvec_backend import ZvecVectorRetrievalBackend


class VectorRetrievalBackendFactory:
    POSTGRES_JSON = "postgres_json"
    ZVEC = "zvec"

    @classmethod
    def selected_backend_class(cls):
        backend_name = getattr(settings, "RAG_VECTOR_BACKEND", cls.POSTGRES_JSON)
        if backend_name == cls.ZVEC:
            return ZvecVectorRetrievalBackend
        return PostgresJsonVectorRetrievalBackend

    @classmethod
    def fallback_backend_class(cls):
        return PostgresJsonVectorRetrievalBackend

