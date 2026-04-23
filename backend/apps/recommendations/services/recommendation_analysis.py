import ast
import json
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from shared.exceptions import ExternalServiceError


class ProblemLanguageResolver:
    @staticmethod
    def normalize_language(value: Any) -> str:
        return "ar" if str(value).strip().lower() == "ar" else "en"

    @classmethod
    def resolve_output_language(cls, problem_description: str, *, requested_language: Any) -> str:
        detected_language = cls._detect_problem_language(problem_description)
        if detected_language:
            return detected_language
        return cls.normalize_language(requested_language)

    @staticmethod
    def _detect_problem_language(problem_description: str) -> str | None:
        if re.search(r"[\u0600-\u06FF]", problem_description or ""):
            return "ar"
        if re.search(r"[A-Za-z]", problem_description or ""):
            return "en"
        return None


class ProblemAnalysisPromptBuilder:
    @staticmethod
    def build_system_prompt() -> str:
        return (
            "You are a service-triage assistant for a professional home-services marketplace. "
            "Return valid JSON only. Do not include markdown, code fences, comments, or explanatory text. "
            "Use exactly this schema: "
            '{"service_category":"","provider_type":"","likely_issue":"","urgency":"","keywords":[],"suggested_solution":"","quick_tips":[]}. '
            "Every key must always be present."
        )

    @staticmethod
    def _language_instruction(language: str) -> str:
        return "Arabic" if language == "ar" else "English"

    @staticmethod
    def _retry_instruction(attempt_number: int) -> str:
        if attempt_number <= 1:
            return ""
        return (
            "The previous response was invalid or incomplete. "
            "Return every schema key with valid JSON only and do not omit fields."
        )

    @classmethod
    def build_user_prompt(cls, problem_description: str, *, language: str, attempt_number: int) -> str:
        normalized_message = re.sub(r"\s+", " ", (problem_description or "")).strip()
        instructions = [
            "Analyze the following raw customer message and convert it into a structured service recommendation.",
            "The message may contain greetings, filler text, typos, short fragments, mixed Arabic and English, or irrelevant context.",
            "Ignore conversational noise and extract the single strongest service need from the full message.",
            "If the message mentions more than one issue, prioritize the most urgent or safety-critical issue.",
            "service_category, provider_type, and urgency must always be lowercase English identifiers only.",
            "Allowed service_category values: plumbing, electrical, cleaning, painting, landscaping, moving, carpentry, air_conditioning.",
            "Allowed provider_type values: plumber, electrician, cleaner, painter, landscaper, mover, carpenter, ac_technician.",
            "Allowed urgency values: low, medium, high.",
            "If category or provider type is implied but not written directly, infer the best supported match from the message.",
            "Example Arabic mapping: 'عندي تسريب ماء تحت المغسلة' -> service_category='plumbing', provider_type='plumber', urgency='medium'.",
            f"Write likely_issue, suggested_solution, and quick_tips in {cls._language_instruction(language)}.",
            "suggested_solution must be one short professional next step.",
            "quick_tips must contain 2 to 5 short, safe, practical actions the customer can try before booking a provider.",
            "keywords must contain short search terms that reflect the service need.",
        ]
        retry_instruction = cls._retry_instruction(attempt_number)
        if retry_instruction:
            instructions.append(retry_instruction)
        instructions.extend([
            "Customer message:",
            normalized_message,
        ])
        return "\n".join(instructions)

    @classmethod
    def build_payload(cls, problem_description: str, *, language: str, attempt_number: int) -> dict[str, Any]:
        return {
            "model": getattr(settings, "OLLAMA_MODEL", "qwen2.5:3b"),
            "stream": False,
            "format": "json",
            "system": cls.build_system_prompt(),
            "prompt": cls.build_user_prompt(
                problem_description,
                language=language,
                attempt_number=attempt_number,
            ),
            "options": {
                "temperature": 0.1,
            },
        }


class OllamaAnalysisClient:
    @classmethod
    def generate(cls, problem_description: str, *, language: str, attempt_number: int = 1) -> str:
        payload = ProblemAnalysisPromptBuilder.build_payload(
            problem_description,
            language=language,
            attempt_number=attempt_number,
        )
        request = Request(
            url=getattr(settings, "OLLAMA_API_URL", "http://localhost:11434/api/generate"),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=getattr(settings, "OLLAMA_TIMEOUT", 30)) as response:
                body = response.read().decode("utf-8")
        except (HTTPError, URLError, OSError, TimeoutError) as exc:
            raise ExternalServiceError(
                detail="Unable to analyze the problem right now.",
                code="ollama_unavailable",
                details={"detail": "Failed to reach the local Ollama service."},
            ) from exc

        try:
            response_payload = json.loads(body)
        except json.JSONDecodeError as exc:
            raise ExternalServiceError(
                detail="Unable to analyze the problem right now.",
                code="ollama_response_invalid",
                details={"detail": "Ollama returned an invalid response payload."},
            ) from exc

        generated_text = response_payload.get("response")
        if not isinstance(generated_text, str) or not generated_text.strip():
            raise ExternalServiceError(
                detail="Unable to analyze the problem right now.",
                code="ollama_response_invalid",
                details={"detail": "Ollama response did not include generated analysis text."},
            )

        return generated_text


class ProblemAnalysisPayloadParser:
    @classmethod
    def parse(cls, raw_analysis: str) -> dict[str, Any]:
        for candidate in cls._candidate_strings(raw_analysis):
            parsed = cls.try_parse_json(candidate)
            unwrapped_payload = cls._unwrap_analysis_payload(parsed)
            if isinstance(unwrapped_payload, dict):
                return unwrapped_payload

        raise ExternalServiceError(
            detail="Unable to analyze the problem right now.",
            code="ollama_analysis_invalid",
            details={"detail": "The model response could not be cleaned into valid JSON."},
        )

    @classmethod
    def prepare(cls, payload: dict[str, Any], *, analysis_keys: tuple[str, ...]) -> dict[str, Any]:
        return {key: payload.get(key) for key in analysis_keys}

    @classmethod
    def _candidate_strings(cls, raw_analysis: str) -> list[str]:
        candidates = []
        stripped = cls.clean_text(raw_analysis)
        if stripped:
            candidates.append(stripped)

        without_fences = cls.strip_code_fences(stripped)
        if without_fences and without_fences not in candidates:
            candidates.append(without_fences)

        extracted_object = cls.extract_json_object(without_fences)
        if extracted_object and extracted_object not in candidates:
            candidates.append(extracted_object)

        return candidates

    @staticmethod
    def _unwrap_analysis_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
        if not isinstance(payload, dict):
            return None

        for key in ["analysis", "data", "result"]:
            nested_payload = payload.get(key)
            if isinstance(nested_payload, dict):
                return nested_payload
        return payload

    @staticmethod
    def clean_text(value: str) -> str:
        return (
            value.replace("\ufeff", "")
            .replace("“", '"')
            .replace("”", '"')
            .replace("’", "'")
            .strip()
        )

    @staticmethod
    def strip_code_fences(value: str) -> str:
        return re.sub(r"^```(?:json)?\s*|\s*```$", "", value.strip(), flags=re.IGNORECASE)

    @staticmethod
    def extract_json_object(value: str) -> str:
        start = value.find("{")
        end = value.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return ""
        return value[start : end + 1]

    @staticmethod
    def try_parse_json(value: str) -> dict[str, Any] | None:
        if not value:
            return None

        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                return None

        return parsed if isinstance(parsed, dict) else None
