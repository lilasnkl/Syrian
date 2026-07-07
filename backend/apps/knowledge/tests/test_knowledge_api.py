from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.knowledge.models import KnowledgeChunk, KnowledgeDocument, KnowledgeIngestionJob, KnowledgeSource
from apps.knowledge.services import EmbeddingService, KnowledgeIngestionService, RetrievalService
from apps.knowledge.services.vector_backends.zvec_backend import ZvecVectorRetrievalBackend
from apps.knowledge.services.zvec_index_service import ZvecIndexUnavailable, ZvecSearchHit
from apps.providers.models import ProviderProfile


class KnowledgeApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.provider_user = User.objects.create_user(
            email="knowledge-provider@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.customer_user = User.objects.create_user(
            email="knowledge-customer@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Knowledge Provider",
            category="electrical",
        )

    def test_provider_can_submit_knowledge_source_and_job_is_queued(self):
        self.client.force_authenticate(self.provider_user)
        response = self.client.post(
            reverse("knowledge-sources"),
            {
                "title": "Emergency services",
                "description": "Customer-facing service facts",
                "visibility": KnowledgeSource.VISIBILITY_PUBLIC,
                "file": SimpleUploadedFile("services.txt", b"Emergency repair available.", content_type="text/plain"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        source = KnowledgeSource.objects.get()
        self.assertEqual(source.provider, self.provider)
        self.assertEqual(source.status, KnowledgeSource.STATUS_PENDING)
        self.assertTrue(source.storage_path.startswith(f"knowledge_uploads/{self.provider.id}/{source.id}/"))
        self.assertEqual(KnowledgeIngestionJob.objects.filter(source=source, status=KnowledgeIngestionJob.STATUS_QUEUED).count(), 1)

    def test_customer_cannot_submit_knowledge_source(self):
        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            reverse("knowledge-sources"),
            {
                "title": "Not allowed",
                "visibility": KnowledgeSource.VISIBILITY_PUBLIC,
                "file": SimpleUploadedFile("source.txt", b"Not allowed.", content_type="text/plain"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_ingestion_extracts_chunks_embeds_and_activates_source(self, mock_embed_texts):
        mock_embed_texts.return_value = [[1.0, 0.0, 0.0]]
        self.client.force_authenticate(self.provider_user)
        self.client.post(
            reverse("knowledge-sources"),
            {
                "title": "Electrical FAQ",
                "visibility": KnowledgeSource.VISIBILITY_PUBLIC,
                "file": SimpleUploadedFile("faq.txt", b"Emergency electrical repair is available.", content_type="text/plain"),
            },
            format="multipart",
        )
        job = KnowledgeIngestionJob.objects.get()

        KnowledgeIngestionService.process_job(job)

        source = KnowledgeSource.objects.get()
        source.refresh_from_db()
        self.assertEqual(source.status, KnowledgeSource.STATUS_ACTIVE)
        self.assertIsNotNone(source.last_indexed_at)
        chunk = KnowledgeChunk.objects.get(source=source)
        self.assertTrue(chunk.is_active)
        self.assertEqual(chunk.embedding, [1.0, 0.0, 0.0])
        self.assertEqual(chunk.embedding_model, "text-embedding-3-large")

    @override_settings(RAG_MIN_SIMILARITY=0.0)
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_retrieval_filters_private_chunks_from_customer(self, mock_embed_texts):
        mock_embed_texts.return_value = [[1.0, 0.0]]
        public_chunk = self._create_chunk(
            title="Public FAQ",
            visibility=KnowledgeSource.VISIBILITY_PUBLIC,
            text="Emergency repair is available for residential customers.",
            embedding=[1.0, 0.0],
        )
        self._create_chunk(
            title="Private notes",
            visibility=KnowledgeSource.VISIBILITY_PROVIDER_PRIVATE,
            text="Private admin pricing notes.",
            embedding=[1.0, 0.0],
        )

        results = RetrievalService.retrieve(
            actor=self.customer_user,
            provider_id=self.provider.id,
            question="Do you provide emergency repair?",
        )

        self.assertEqual([item.chunk.id for item in results], [public_chunk.id])

    @override_settings(RAG_EMBEDDING_CACHE_TTL_SECONDS=600)
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_query_embedding_cache_reuses_repeated_question_embedding(self, mock_embed_texts):
        mock_embed_texts.return_value = [[1.0, 0.0]]

        first = EmbeddingService.embed_query("Do you provide emergency repair?")
        second = EmbeddingService.embed_query("Do you provide emergency repair?")

        self.assertEqual(first, [1.0, 0.0])
        self.assertEqual(second, [1.0, 0.0])
        mock_embed_texts.assert_called_once_with(["Do you provide emergency repair?"])

    @override_settings(RAG_MIN_SIMILARITY=0.0, RAG_VECTOR_BACKEND="zvec")
    @patch("apps.knowledge.services.zvec_index_service.ZvecKnowledgeIndexService.search_provider")
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_retrieval_falls_back_to_postgres_when_zvec_is_unavailable(self, mock_embed_texts, mock_search_provider):
        mock_embed_texts.return_value = [[1.0, 0.0]]
        mock_search_provider.side_effect = ZvecIndexUnavailable("zvec is not installed")
        public_chunk = self._create_chunk(
            title="Public fallback FAQ",
            visibility=KnowledgeSource.VISIBILITY_PUBLIC,
            text="Emergency repair is available for residential customers.",
            embedding=[1.0, 0.0],
        )

        results = RetrievalService.retrieve(
            actor=self.customer_user,
            provider_id=self.provider.id,
            question="Do you provide emergency repair?",
        )

        self.assertEqual([item.chunk.id for item in results], [public_chunk.id])
        mock_search_provider.assert_called_once()

    @patch("apps.knowledge.services.zvec_index_service.ZvecKnowledgeIndexService.search_provider")
    def test_zvec_backend_refetches_only_authorized_postgres_chunks(self, mock_search_provider):
        public_chunk = self._create_chunk(
            title="Public zvec FAQ",
            visibility=KnowledgeSource.VISIBILITY_PUBLIC,
            text="Emergency repair is available for residential customers.",
            embedding=[1.0, 0.0],
        )
        private_chunk = self._create_chunk(
            title="Private zvec FAQ",
            visibility=KnowledgeSource.VISIBILITY_PROVIDER_PRIVATE,
            text="Private provider operations note.",
            embedding=[1.0, 0.0],
        )
        mock_search_provider.return_value = [
            ZvecSearchHit(chunk_id=private_chunk.id, score=0.99),
            ZvecSearchHit(chunk_id=public_chunk.id, score=0.98),
        ]

        candidates = ZvecVectorRetrievalBackend.search(
            provider=self.provider,
            allowed_visibilities=[KnowledgeSource.VISIBILITY_PUBLIC],
            query_embedding=[1.0, 0.0],
            normalized_question="Do you provide emergency repair?",
            service_id=None,
            candidate_limit=10,
        )

        self.assertEqual([candidate.chunk.id for candidate in candidates], [public_chunk.id])

    @override_settings(RAG_VECTOR_BACKEND="zvec")
    @patch("apps.knowledge.services.ingestion_service.ZvecKnowledgeIndexService.sync_source")
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_ingestion_schedules_zvec_sync_after_successful_commit(self, mock_embed_texts, mock_sync_source):
        mock_embed_texts.return_value = [[1.0, 0.0, 0.0]]
        self.client.force_authenticate(self.provider_user)
        self.client.post(
            reverse("knowledge-sources"),
            {
                "title": "Electrical Zvec FAQ",
                "visibility": KnowledgeSource.VISIBILITY_PUBLIC,
                "file": SimpleUploadedFile("zvec-faq.txt", b"Emergency electrical repair is available.", content_type="text/plain"),
            },
            format="multipart",
        )
        job = KnowledgeIngestionJob.objects.get()

        with self.captureOnCommitCallbacks(execute=True):
            KnowledgeIngestionService.process_job(job)

        mock_sync_source.assert_called_once()

    def _create_chunk(self, *, title: str, visibility: str, text: str, embedding: list[float]):
        source = KnowledgeSource.objects.create(
            provider=self.provider,
            created_by=self.provider_user,
            title=title,
            visibility=visibility,
            status=KnowledgeSource.STATUS_ACTIVE,
        )
        document = KnowledgeDocument.objects.create(
            source=source,
            provider=self.provider,
            extraction_status=KnowledgeDocument.STATUS_EXTRACTED,
            raw_text=text,
            normalized_text_hash=title,
            token_count=len(text.split()),
        )
        return KnowledgeChunk.objects.create(
            document=document,
            source=source,
            provider=self.provider,
            chunk_index=0,
            chunk_text=text,
            chunk_hash=title,
            embedding=embedding,
            embedding_model="text-embedding-3-large",
            token_count=len(text.split()),
            visibility=visibility,
            is_active=True,
        )
