import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings

from apps.knowledge.models import KnowledgeChunk

logger = logging.getLogger(__name__)


class ZvecIndexUnavailable(Exception):
    pass


@dataclass(frozen=True)
class ZvecSearchHit:
    chunk_id: int
    score: float


class ZvecKnowledgeIndexService:
    DEFAULT_VECTOR_FIELD = "embedding"

    @classmethod
    def sync_source(cls, source) -> bool:
        if not cls.is_enabled():
            return False
        try:
            return cls._sync_source(source)
        except Exception:
            logger.exception("Unable to sync knowledge source %s into Zvec.", source.id)
            return False

    @classmethod
    def rebuild_provider(cls, provider) -> int:
        if not cls.is_enabled():
            return 0

        chunks = list(
            KnowledgeChunk.objects.select_related("source", "document", "provider").filter(
                provider=provider,
                source__status="active",
                is_active=True,
            )
        )
        cls.destroy_provider_collection(provider)
        if not chunks:
            return 0

        indexable_chunks = cls._indexable_chunks(chunks)
        if not indexable_chunks:
            return 0
        collection = cls.open_collection(
            provider=provider,
            dimension=len(indexable_chunks[0].embedding),
            create_if_missing=True,
        )
        cls._insert_chunks(collection, indexable_chunks)
        cls._optimize(collection)
        return len(indexable_chunks)

    @classmethod
    def search_provider(cls, *, provider, query_embedding: list[float], top_k: int) -> list[ZvecSearchHit]:
        if not query_embedding:
            return []
        collection = cls.open_collection(
            provider=provider,
            dimension=len(query_embedding),
            create_if_missing=False,
        )
        zvec = cls.zvec_module()
        field_name = cls.vector_field_name()
        query_class = getattr(zvec, "Query", None) or getattr(zvec, "VectorQuery", None)
        if query_class is None:
            raise ZvecIndexUnavailable("Installed zvec package does not expose Query or VectorQuery.")

        try:
            query = query_class(field_name=field_name, vector=query_embedding)
        except TypeError:
            query = query_class(field_name, query_embedding)

        try:
            raw_results = collection.query(queries=query, topk=top_k)
        except TypeError:
            raw_results = collection.query(query, topk=top_k)
        return cls._parse_search_hits(raw_results)

    @classmethod
    def destroy_provider_collection(cls, provider) -> None:
        base_path = cls.base_path().resolve()
        provider_path = cls.provider_path(provider).resolve()
        if provider_path == base_path or base_path not in provider_path.parents:
            raise ZvecIndexUnavailable("Refusing to remove a Zvec path outside the configured base directory.")
        if provider_path.exists():
            shutil.rmtree(provider_path)

    @classmethod
    def open_collection(cls, *, provider, dimension: int, create_if_missing: bool):
        path = cls.provider_path(provider)
        if path.exists():
            return cls.zvec_module().open(str(path))
        if not create_if_missing:
            raise ZvecIndexUnavailable(f"Zvec provider collection does not exist: {path}")

        path.parent.mkdir(parents=True, exist_ok=True)
        zvec = cls.zvec_module()
        schema = cls.collection_schema(zvec=zvec, provider=provider, dimension=dimension)
        return zvec.create_and_open(path=str(path), schema=schema)

    @classmethod
    def collection_schema(cls, *, zvec, provider, dimension: int):
        vector_schema_kwargs = {
            "name": cls.vector_field_name(),
            "data_type": zvec.DataType.VECTOR_FP32,
            "dimension": dimension,
        }
        hnsw_param_class = getattr(zvec, "HnswIndexParam", None)
        metric_type = getattr(getattr(zvec, "MetricType", object), "COSINE", None)
        if hnsw_param_class is not None and metric_type is not None:
            try:
                vector_schema_kwargs["index_param"] = hnsw_param_class(metric_type=metric_type)
            except TypeError:
                vector_schema_kwargs["index_param"] = hnsw_param_class(metric_type)

        vector_schema = zvec.VectorSchema(**vector_schema_kwargs)
        try:
            return zvec.CollectionSchema(
                name=f"provider_{provider.id}_knowledge",
                vectors=vector_schema,
            )
        except TypeError:
            return zvec.CollectionSchema(
                name=f"provider_{provider.id}_knowledge",
                vectors=[vector_schema],
            )

    @classmethod
    def provider_path(cls, provider) -> Path:
        return cls.base_path() / f"provider_{provider.id}"

    @classmethod
    def base_path(cls) -> Path:
        configured_path = getattr(settings, "RAG_ZVEC_PATH", "")
        if configured_path:
            return Path(configured_path)
        return Path(settings.BASE_DIR) / "var" / "zvec" / "knowledge"

    @classmethod
    def vector_field_name(cls) -> str:
        return getattr(settings, "RAG_ZVEC_VECTOR_FIELD", cls.DEFAULT_VECTOR_FIELD)

    @classmethod
    def is_enabled(cls) -> bool:
        return getattr(settings, "RAG_VECTOR_BACKEND", "postgres_json") == "zvec"

    @staticmethod
    def zvec_module():
        try:
            import zvec
        except ImportError as exc:
            raise ZvecIndexUnavailable("Install zvec to enable RAG_VECTOR_BACKEND=zvec.") from exc
        return zvec

    @classmethod
    def _sync_source(cls, source) -> bool:
        chunks = list(KnowledgeChunk.objects.select_related("source", "document", "provider").filter(source=source))
        if not chunks:
            return False

        indexable_chunks = cls._indexable_chunks(chunks)
        if not indexable_chunks:
            try:
                collection = cls.open_collection(
                    provider=source.provider,
                    dimension=1,
                    create_if_missing=False,
                )
            except ZvecIndexUnavailable:
                return True
            cls._delete_chunk_ids(collection, [chunk.id for chunk in chunks])
            cls._optimize(collection)
            return True

        collection = cls.open_collection(
            provider=source.provider,
            dimension=len(indexable_chunks[0].embedding),
            create_if_missing=True,
        )
        cls._delete_chunk_ids(collection, [chunk.id for chunk in chunks])
        cls._insert_chunks(collection, indexable_chunks)
        cls._optimize(collection)
        return True

    @staticmethod
    def _indexable_chunks(chunks) -> list:
        return [
            chunk
            for chunk in chunks
            if chunk.is_active and chunk.source.status == "active" and chunk.embedding
        ]

    @classmethod
    def _insert_chunks(cls, collection, chunks) -> None:
        zvec = cls.zvec_module()
        docs = [
            zvec.Doc(
                id=str(chunk.id),
                vectors={cls.vector_field_name(): [float(value) for value in chunk.embedding]},
            )
            for chunk in chunks
        ]
        if not docs:
            return
        try:
            collection.insert(docs)
        except TypeError:
            for doc in docs:
                collection.insert(doc)

    @staticmethod
    def _delete_chunk_ids(collection, chunk_ids) -> None:
        ids = [str(chunk_id) for chunk_id in chunk_ids]
        if not ids:
            return
        try:
            collection.delete(ids=ids)
        except Exception:
            for chunk_id in ids:
                try:
                    collection.delete(ids=chunk_id)
                except Exception:
                    logger.debug("Zvec chunk %s was not present during delete.", chunk_id)

    @staticmethod
    def _optimize(collection) -> None:
        optimize = getattr(collection, "optimize", None)
        if callable(optimize):
            optimize()

    @classmethod
    def _parse_search_hits(cls, raw_results) -> list[ZvecSearchHit]:
        hits = []
        for item in raw_results or []:
            raw_id = cls._read_result_value(item, "id")
            if raw_id is None:
                raw_id = cls._read_result_value(cls._read_result_value(item, "doc"), "id")
            try:
                chunk_id = int(raw_id)
            except (TypeError, ValueError):
                continue
            hits.append(
                ZvecSearchHit(
                    chunk_id=chunk_id,
                    score=cls._read_float_result_value(item, "score"),
                )
            )
        return hits

    @staticmethod
    def _read_result_value(item, field_name: str):
        if item is None:
            return None
        if isinstance(item, dict):
            return item.get(field_name)
        return getattr(item, field_name, None)

    @classmethod
    def _read_float_result_value(cls, item, field_name: str) -> float:
        try:
            return float(cls._read_result_value(item, field_name) or 0.0)
        except (TypeError, ValueError):
            return 0.0
