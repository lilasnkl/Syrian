from apps.customer_assistant.clients import OpenAIResponsesClient
from apps.customer_assistant.models import AssistantTurn
from apps.customer_assistant.services.answer_cache_service import AnswerCacheService
from apps.customer_assistant.services.evidence_budget_service import EvidenceBudgetService
from apps.customer_assistant.services.output_validator import AssistantOutputValidator
from apps.customer_assistant.services.prompt_builder import CustomerRagPromptBuilder


class AnswerGenerationService:
    responses_client_class = OpenAIResponsesClient
    prompt_builder_class = CustomerRagPromptBuilder
    output_validator_class = AssistantOutputValidator
    answer_cache_service_class = AnswerCacheService
    evidence_budget_service_class = EvidenceBudgetService

    @classmethod
    def generate(cls, *, question: str, provider, retrieved_chunks) -> dict:
        retrieved_chunks = list(retrieved_chunks)
        if not retrieved_chunks:
            return {
                "answer_status": AssistantTurn.STATUS_INSUFFICIENT,
                "answer": "I do not have enough provider evidence to answer that question yet.",
                "citations": [],
                "customer_next_step": "Contact the provider or check back after they publish more information.",
            }
        prompt_chunks = cls.evidence_budget_service_class.select_for_prompt(retrieved_chunks)

        cached_answer = cls.answer_cache_service_class.get(
            question=question,
            provider=provider,
            retrieved_chunks=prompt_chunks,
        )
        if cached_answer:
            return {
                **cached_answer,
                "cache_hit": True,
                "usage": {"input_tokens": 0, "output_tokens": 0, "cached_input_tokens": 0},
                "latency_ms": 0,
            }

        client_result = cls.responses_client_class.generate_json(
            system_prompt=cls.prompt_builder_class.build_system_prompt(),
            user_prompt=cls.prompt_builder_class.build_user_prompt(
                question=question,
                provider=provider,
                retrieved_chunks=prompt_chunks,
            ),
            schema=cls.prompt_builder_class.output_schema(),
            prompt_cache_key=cls.prompt_builder_class.prompt_cache_key(provider=provider),
        )
        raw_output = getattr(client_result, "text", client_result)
        answer_payload = cls.output_validator_class.validate(raw_output, retrieved_chunks=prompt_chunks)
        cls.answer_cache_service_class.set(
            question=question,
            provider=provider,
            retrieved_chunks=prompt_chunks,
            answer_payload=answer_payload,
        )
        usage = getattr(client_result, "usage", None)
        return {
            **answer_payload,
            "cache_hit": False,
            "usage": {
                "input_tokens": getattr(usage, "input_tokens", 0),
                "output_tokens": getattr(usage, "output_tokens", 0),
                "cached_input_tokens": getattr(usage, "cached_input_tokens", 0),
            },
            "latency_ms": getattr(client_result, "latency_ms", 0),
        }
