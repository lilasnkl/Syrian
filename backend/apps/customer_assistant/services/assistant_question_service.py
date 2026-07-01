from django.conf import settings
from django.db import transaction

from apps.customer_assistant.models import AssistantTurn
from apps.customer_assistant.repositories import AssistantRepository
from apps.customer_assistant.services.answer_generation_service import AnswerGenerationService
from apps.customer_assistant.services.citation_service import CitationService
from apps.customer_assistant.services.prompt_builder import CustomerRagPromptBuilder
from apps.knowledge.services import RetrievalService
from apps.orders.models import Order
from apps.providers.repositories import ProviderRepository
from apps.services.models import ServiceListing
from shared.constants import ACTIVE
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound


class AssistantQuestionService:
    retrieval_service_class = RetrievalService
    answer_generation_service_class = AnswerGenerationService
    citation_service_class = CitationService

    @classmethod
    @transaction.atomic
    def ask(
        cls,
        *,
        actor,
        provider_id: int,
        question: str,
        service_id: int | None = None,
        order_id: int | None = None,
        session_id: int | None = None,
    ):
        cls._validate_actor(actor)
        provider = cls._get_provider(provider_id)
        service = cls._get_service(service_id, provider=provider) if service_id else None
        order = cls._get_order(order_id, actor=actor, provider=provider) if order_id else None
        session = cls._get_or_create_session(
            actor=actor,
            provider=provider,
            service=service,
            order=order,
            session_id=session_id,
        )
        normalized_question = cls.retrieval_service_class.normalize_question(question)
        retrieved_chunks = cls.retrieval_service_class.retrieve(
            actor=actor,
            provider_id=provider.id,
            service_id=service.id if service else None,
            order_id=order.id if order else None,
            question=normalized_question,
        )
        answer_payload = cls.answer_generation_service_class.generate(
            question=normalized_question,
            provider=provider,
            retrieved_chunks=retrieved_chunks,
        )
        usage = answer_payload.get("usage", {})
        turn = AssistantRepository.create_turn(
            session=session,
            customer=actor,
            provider=provider,
            question=question,
            normalized_question=normalized_question,
            answer=answer_payload["answer"],
            answer_status=answer_payload["answer_status"],
            customer_next_step=answer_payload.get("customer_next_step", ""),
            model=getattr(settings, "OPENAI_CUSTOMER_QA_MODEL", "gpt-4o-mini"),
            embedding_model=getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
            prompt_version=CustomerRagPromptBuilder.PROMPT_VERSION,
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            cached_input_tokens=usage.get("cached_input_tokens", 0),
            answer_cache_hit=answer_payload.get("cache_hit", False),
            latency_ms=answer_payload.get("latency_ms", 0),
        )
        cls.citation_service_class.create_citations(
            turn=turn,
            citations=answer_payload.get("citations", []),
            retrieved_chunks=retrieved_chunks,
        )
        return turn

    @staticmethod
    def _validate_actor(actor):
        if actor.status != ACTIVE:
            raise PermissionDeniedDomain("Blocked account cannot use the customer assistant.")
        if actor.role != "customer":
            raise PermissionDeniedDomain("Only customers can ask provider knowledge questions.")

    @staticmethod
    def _get_provider(provider_id: int):
        provider = ProviderRepository.get_by_id(provider_id)
        if not provider:
            raise ResourceNotFound("Provider not found.")
        return provider

    @staticmethod
    def _get_service(service_id: int, *, provider):
        service = ServiceListing.objects.filter(id=service_id, provider=provider, is_active=True).first()
        if not service:
            raise ResourceNotFound("Service not found.")
        return service

    @staticmethod
    def _get_order(order_id: int, *, actor, provider):
        order = Order.objects.filter(id=order_id, customer=actor).first()
        if not order:
            raise ResourceNotFound("Order not found.")
        if order.awarded_provider_id and order.awarded_provider_id != provider.id:
            raise PermissionDeniedDomain("Not allowed to ask this provider about that order.")
        return order

    @staticmethod
    def _get_or_create_session(*, actor, provider, service=None, order=None, session_id=None):
        if session_id:
            session = AssistantRepository.get_session(session_id)
            if not session:
                raise ResourceNotFound("Assistant session not found.")
            if session.customer_id != actor.id:
                raise PermissionDeniedDomain("Not allowed to use this assistant session.")
            if session.provider_id != provider.id:
                raise PermissionDeniedDomain("Assistant session belongs to a different provider.")
            return session

        return AssistantRepository.create_session(
            customer=actor,
            provider=provider,
            service=service,
            order=order,
        )
