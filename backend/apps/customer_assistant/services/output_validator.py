import json

from apps.customer_assistant.models import AssistantTurn
from shared.exceptions import ExternalServiceError


class AssistantOutputValidator:
    VALID_STATUSES = {
        AssistantTurn.STATUS_ANSWERED,
        AssistantTurn.STATUS_INSUFFICIENT,
        AssistantTurn.STATUS_BLOCKED,
    }

    @classmethod
    def validate(cls, raw_output: str, *, retrieved_chunks) -> dict:
        try:
            payload = json.loads(raw_output)
        except json.JSONDecodeError as exc:
            raise ExternalServiceError(
                detail="Assistant returned invalid JSON.",
                code="assistant_output_invalid_json",
            ) from exc

        if not isinstance(payload, dict):
            raise ExternalServiceError(detail="Assistant returned invalid output.", code="assistant_output_invalid")

        answer_status = payload.get("answer_status")
        if answer_status not in cls.VALID_STATUSES:
            raise ExternalServiceError(detail="Assistant returned invalid status.", code="assistant_output_invalid_status")

        citations = payload.get("citations")
        if not isinstance(citations, list):
            raise ExternalServiceError(detail="Assistant returned invalid citations.", code="assistant_output_invalid_citations")

        retrieved_chunk_ids = {item.chunk.id for item in retrieved_chunks}
        for citation in citations:
            if citation.get("chunk_id") not in retrieved_chunk_ids:
                raise ExternalServiceError(
                    detail="Assistant cited evidence that was not retrieved.",
                    code="assistant_output_unretrieved_citation",
                )

        if answer_status == AssistantTurn.STATUS_ANSWERED and not citations:
            raise ExternalServiceError(
                detail="Assistant answered without citations.",
                code="assistant_answer_missing_citation",
            )

        return {
            "answer_status": answer_status,
            "answer": str(payload.get("answer", "")).strip(),
            "citations": citations,
            "customer_next_step": str(payload.get("customer_next_step", "")).strip(),
        }

