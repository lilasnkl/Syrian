from django.conf import settings

from shared.exceptions import ExternalServiceError


class OpenAIResponsesClient:
    @classmethod
    def generate_json(cls, *, system_prompt: str, user_prompt: str, schema: dict) -> str:
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            raise ExternalServiceError(
                detail="OpenAI API key is not configured.",
                code="openai_api_key_missing",
                details={"detail": "Set OPENAI_API_KEY before generating customer assistant answers."},
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
            response = client.responses.create(
                model=getattr(settings, "OPENAI_CUSTOMER_QA_MODEL", "gpt-4o-mini"),
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "customer_rag_answer",
                        "schema": schema,
                        "strict": True,
                    },
                    "verbosity": getattr(settings, "OPENAI_CUSTOMER_QA_VERBOSITY", "medium"),
                },
                reasoning={"effort": getattr(settings, "OPENAI_CUSTOMER_QA_REASONING_EFFORT", "medium")},
                timeout=getattr(settings, "OPENAI_CUSTOMER_QA_TIMEOUT", 45),
            )
        except Exception as exc:
            raise ExternalServiceError(
                detail="Unable to answer the question right now.",
                code="openai_response_failed",
                details={"detail": str(exc)},
            ) from exc

        output_text = getattr(response, "output_text", "")
        if not output_text:
            raise ExternalServiceError(
                detail="OpenAI response did not include answer text.",
                code="openai_response_empty",
            )
        return output_text

