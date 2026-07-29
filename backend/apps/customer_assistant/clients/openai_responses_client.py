from dataclasses import dataclass
from time import perf_counter

from django.conf import settings

from apps.customer_assistant.clients.openai_usage import OpenAIUsageSnapshot
from shared.exceptions import ExternalServiceError


@dataclass(frozen=True)
class OpenAIJsonResponse:
    text: str
    usage: OpenAIUsageSnapshot
    latency_ms: int


class OpenAIResponsesClient:
    @classmethod
    def generate_json(
        cls,
        *,
        system_prompt: str,
        user_prompt: str,
        schema: dict,
        prompt_cache_key: str = "",
    ) -> OpenAIJsonResponse:
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
            started_at = perf_counter()
            request_kwargs = {
                "model": getattr(settings, "OPENAI_CUSTOMER_QA_MODEL", "gpt-4o-mini"),
                "input": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "customer_rag_answer",
                        "schema": schema,
                        "strict": True,
                    },
                    "verbosity": getattr(settings, "OPENAI_CUSTOMER_QA_VERBOSITY", "medium"),
                },
                "reasoning": {"effort": getattr(settings, "OPENAI_CUSTOMER_QA_REASONING_EFFORT", "medium")},
                "max_output_tokens": getattr(settings, "OPENAI_CUSTOMER_QA_MAX_OUTPUT_TOKENS", 600),
                "timeout": getattr(settings, "OPENAI_CUSTOMER_QA_TIMEOUT", 45),
            }
            if prompt_cache_key:
                request_kwargs["prompt_cache_key"] = prompt_cache_key
            prompt_cache_retention = getattr(settings, "OPENAI_CUSTOMER_QA_PROMPT_CACHE_RETENTION", "")
            if prompt_cache_retention:
                request_kwargs["prompt_cache_retention"] = prompt_cache_retention

            response = client.responses.create(
                **request_kwargs
            )
            latency_ms = int((perf_counter() - started_at) * 1000)
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
        return OpenAIJsonResponse(
            text=output_text,
            usage=OpenAIUsageSnapshot.from_response(response),
            latency_ms=latency_ms,
        )
