from apps.customer_assistant.clients import OpenAIResponsesClient
from apps.customer_assistant.models import AssistantTurn
from apps.customer_assistant.services.output_validator import AssistantOutputValidator
from apps.customer_assistant.services.prompt_builder import CustomerRagPromptBuilder


class AnswerGenerationService:
    responses_client_class = OpenAIResponsesClient
    prompt_builder_class = CustomerRagPromptBuilder
    output_validator_class = AssistantOutputValidator

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

        raw_output = cls.responses_client_class.generate_json(
            system_prompt=cls.prompt_builder_class.build_system_prompt(),
            user_prompt=cls.prompt_builder_class.build_user_prompt(
                question=question,
                provider=provider,
                retrieved_chunks=retrieved_chunks,
            ),
            schema=cls.prompt_builder_class.output_schema(),
        )
        return cls.output_validator_class.validate(raw_output, retrieved_chunks=retrieved_chunks)

