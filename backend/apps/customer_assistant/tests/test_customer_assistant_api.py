import json
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.customer_assistant.models import AssistantCitation, AssistantTurn
from apps.knowledge.models import KnowledgeChunk, KnowledgeDocument, KnowledgeSource
from apps.providers.models import ProviderProfile


class CustomerAssistantApiTests(APITestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            email="assistant-customer@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.provider_user = User.objects.create_user(
            email="assistant-provider@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Assistant Provider",
            category="electrical",
            is_verified=True,
        )

    @override_settings(RAG_MIN_SIMILARITY=0.0)
    @patch("apps.customer_assistant.clients.openai_responses_client.OpenAIResponsesClient.generate_json")
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_customer_question_returns_grounded_answer_with_citation(self, mock_embed_texts, mock_generate_json):
        chunk = self._create_public_chunk()
        mock_embed_texts.return_value = [[1.0, 0.0]]
        mock_generate_json.return_value = json.dumps(
            {
                "answer_status": "answered",
                "answer": "Yes. Emergency electrical repair is available.",
                "citations": [
                    {
                        "chunk_id": chunk.id,
                        "source_id": chunk.source_id,
                        "quote": "Emergency electrical repair is available.",
                        "reason": "The provider FAQ states this directly.",
                    }
                ],
                "customer_next_step": "Contact the provider to confirm timing.",
            }
        )

        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            reverse("customer-assistant-question"),
            {
                "provider_id": self.provider.id,
                "question": "Do they offer emergency electrical repair?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payload = response.json()["data"]["turn"]
        self.assertEqual(payload["answer_status"], "answered")
        self.assertEqual(payload["citations"][0]["chunk_id"], chunk.id)
        self.assertEqual(AssistantTurn.objects.count(), 1)
        self.assertEqual(AssistantCitation.objects.count(), 1)

    @override_settings(RAG_MIN_SIMILARITY=0.0)
    @patch("apps.customer_assistant.clients.openai_responses_client.OpenAIResponsesClient.generate_json")
    @patch("apps.knowledge.clients.openai_embedding_client.OpenAIEmbeddingClient.embed_texts")
    def test_customer_question_without_evidence_returns_insufficient_evidence_without_llm(self, mock_embed_texts, mock_generate_json):
        mock_embed_texts.return_value = [[1.0, 0.0]]
        self.client.force_authenticate(self.customer_user)

        response = self.client.post(
            reverse("customer-assistant-question"),
            {
                "provider_id": self.provider.id,
                "question": "What warranty do they offer?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["data"]["turn"]["answer_status"], "insufficient_evidence")
        mock_generate_json.assert_not_called()

    def test_provider_cannot_use_customer_question_endpoint(self):
        self.client.force_authenticate(self.provider_user)
        response = self.client.post(
            reverse("customer-assistant-question"),
            {
                "provider_id": self.provider.id,
                "question": "Can I ask about myself?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def _create_public_chunk(self):
        source = KnowledgeSource.objects.create(
            provider=self.provider,
            created_by=self.provider_user,
            title="Electrical FAQ",
            visibility=KnowledgeSource.VISIBILITY_PUBLIC,
            status=KnowledgeSource.STATUS_ACTIVE,
        )
        document = KnowledgeDocument.objects.create(
            source=source,
            provider=self.provider,
            extraction_status=KnowledgeDocument.STATUS_EXTRACTED,
            raw_text="Emergency electrical repair is available.",
            normalized_text_hash="faq",
            token_count=5,
        )
        return KnowledgeChunk.objects.create(
            document=document,
            source=source,
            provider=self.provider,
            chunk_index=0,
            chunk_text="Emergency electrical repair is available.",
            chunk_hash="faq",
            embedding=[1.0, 0.0],
            embedding_model="text-embedding-3-large",
            token_count=5,
            visibility=KnowledgeSource.VISIBILITY_PUBLIC,
            is_active=True,
        )

