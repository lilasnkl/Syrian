import ast
import json
import logging
import math
import re
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db.models import Prefetch, Q

from apps.providers.selectors import providers_queryset
from apps.services.models import ServiceListing
from shared.constants import ACTIVE
from shared.exceptions import ExternalServiceError


logger = logging.getLogger(__name__)


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
            parsed = cls._try_parse_json(candidate)
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
        cls.validate_required_keys(payload, analysis_keys=analysis_keys)
        return {key: payload.get(key) for key in analysis_keys}

    @staticmethod
    def validate_required_keys(payload: dict[str, Any], *, analysis_keys: tuple[str, ...]) -> None:
        missing_keys = [key for key in analysis_keys if key not in payload]
        if missing_keys:
            raise ExternalServiceError(
                detail="Unable to analyze the problem right now.",
                code="ollama_analysis_incomplete",
                details={
                    "detail": "The model response is missing required analysis fields.",
                    "missing_fields": missing_keys,
                },
            )

    @classmethod
    def _candidate_strings(cls, raw_analysis: str) -> list[str]:
        candidates = []
        stripped = cls._clean_text(raw_analysis)
        if stripped:
            candidates.append(stripped)

        without_fences = cls._strip_code_fences(stripped)
        if without_fences and without_fences not in candidates:
            candidates.append(without_fences)

        extracted_object = cls._extract_json_object(without_fences)
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
    def _clean_text(value: str) -> str:
        return (
            value.replace("\ufeff", "")
            .replace("“", '"')
            .replace("”", '"')
            .replace("’", "'")
            .strip()
        )

    @staticmethod
    def _strip_code_fences(value: str) -> str:
        return re.sub(r"^```(?:json)?\s*|\s*```$", "", value.strip(), flags=re.IGNORECASE)

    @staticmethod
    def _extract_json_object(value: str) -> str:
        start = value.find("{")
        end = value.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return ""
        return value[start : end + 1]

    @staticmethod
    def _try_parse_json(value: str) -> dict[str, Any] | None:
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


class ProblemAnalysisService:
    MAX_ANALYSIS_ATTEMPTS = 2
    ANALYSIS_KEYS = (
        "service_category",
        "provider_type",
        "likely_issue",
        "urgency",
        "keywords",
        "suggested_solution",
        "quick_tips",
    )
    SUPPORTED_SERVICE_CATEGORIES = {
        "plumbing",
        "electrical",
        "cleaning",
        "painting",
        "landscaping",
        "moving",
        "carpentry",
        "air_conditioning",
    }
    SUPPORTED_PROVIDER_TYPES = {
        "plumber",
        "electrician",
        "cleaner",
        "painter",
        "landscaper",
        "mover",
        "carpenter",
        "ac_technician",
    }
    SUPPORTED_URGENCY_LEVELS = {"low", "medium", "high"}
    SERVICE_CATEGORY_TO_PROVIDER_TYPE = {
        "plumbing": "plumber",
        "electrical": "electrician",
        "cleaning": "cleaner",
        "painting": "painter",
        "landscaping": "landscaper",
        "moving": "mover",
        "carpentry": "carpenter",
        "air_conditioning": "ac_technician",
    }
    SERVICE_CATEGORY_HINTS = {
        "plumbing": {
            "leak",
            "leaking",
            "water",
            "pipe",
            "pipes",
            "sink",
            "faucet",
            "drain",
            "toilet",
            "shower",
            "tap",
            "under sink",
            "تسريب",
            "تسرب",
            "ماء",
            "ماسورة",
            "مواسير",
            "انبوب",
            "أنبوب",
            "مغسلة",
            "حنفية",
            "صنبور",
            "بالوعة",
            "صرف",
            "مرحاض",
            "دش",
        },
        "electrical": {
            "power",
            "electricity",
            "electrical",
            "socket",
            "outlet",
            "switch",
            "panel",
            "breaker",
            "wire",
            "wiring",
            "light",
            "lights",
            "buzzing",
            "كهرباء",
            "كهربائي",
            "مقبس",
            "فيش",
            "مفتاح",
            "لوحة",
            "قاطع",
            "سلك",
            "اسلاك",
            "أسلاك",
            "لمبة",
            "إضاءة",
            "اضاءة",
        },
        "cleaning": {
            "clean",
            "cleaning",
            "dirty",
            "dirt",
            "stain",
            "stains",
            "dust",
            "deep clean",
            "mess",
            "تنظيف",
            "نظافة",
            "نظافه",
            "وسخ",
            "بقعة",
            "بقع",
            "غبار",
            "تعزيل",
        },
        "painting": {
            "paint",
            "painting",
            "repaint",
            "wall",
            "walls",
            "ceiling",
            "color",
            "دهان",
            "دهانات",
            "صباغ",
            "طلاء",
            "حائط",
            "جدار",
            "سقف",
        },
        "landscaping": {
            "garden",
            "yard",
            "lawn",
            "grass",
            "tree",
            "plants",
            "irrigation",
            "backyard",
            "حديقة",
            "حديقه",
            "حدائق",
            "حدايق",
            "عشب",
            "شجر",
            "زرع",
            "ري",
        },
        "moving": {
            "move",
            "moving",
            "relocation",
            "furniture",
            "boxes",
            "pack",
            "packing",
            "office move",
            "نقل",
            "ترحيل",
            "اثاث",
            "أثاث",
            "صناديق",
            "تحميل",
        },
        "carpentry": {
            "wood",
            "wooden",
            "door",
            "cabinet",
            "drawer",
            "shelf",
            "table",
            "chair",
            "furniture repair",
            "نجارة",
            "نجاره",
            "نجار",
            "خشب",
            "باب",
            "خزانة",
            "خزانه",
            "درج",
            "رف",
            "طاولة",
            "طاوله",
            "كرسي",
        },
        "air_conditioning": {
            "ac",
            "a c",
            "a/c",
            "air conditioner",
            "air conditioning",
            "hvac",
            "cooling",
            "cool",
            "not cooling",
            "temperature",
            "refrigerant",
            "compressor",
            "مكيف",
            "مكيفات",
            "تكييف",
            "التكييف",
            "تبريد",
            "لا يبرد",
            "مو بارد",
            "حرارة",
            "فريون",
            "كمبروسر",
        },
    }
    PROVIDER_TYPE_TO_SERVICE_CATEGORY = {
        "plumber": "plumbing",
        "electrician": "electrical",
        "cleaner": "cleaning",
        "painter": "painting",
        "landscaper": "landscaping",
        "mover": "moving",
        "carpenter": "carpentry",
        "ac_technician": "air_conditioning",
    }
    SERVICE_CATEGORY_ALIASES = {
        "plumbing": {
            "plumbing",
            "plumbing service",
            "plumbing services",
            "pipe repair",
            "water leak",
            "سباكة",
            "سباكه",
            "السباكة",
            "السباكه",
            "تمديدات صحية",
            "تمديدات صحيه",
            "صحي",
            "فني صحي",
            "سباك",
        },
        "electrical": {
            "electrical",
            "electric",
            "electrician",
            "electrical service",
            "electrical services",
            "كهرباء",
            "الكهرباء",
            "كهربائي",
            "فني كهرباء",
            "صيانة كهرباء",
            "صيانه كهرباء",
        },
        "cleaning": {
            "cleaning",
            "cleaner",
            "house cleaning",
            "deep cleaning",
            "janitorial",
            "تنظيف",
            "التنظيف",
            "عامل نظافة",
            "عامل نظافه",
            "شركة تنظيف",
            "خدمة تنظيف",
            "خدمات تنظيف",
        },
        "painting": {
            "painting",
            "painter",
            "paint",
            "painting service",
            "دهان",
            "دهانات",
            "صباغ",
            "طلاء",
            "دهن",
        },
        "landscaping": {
            "landscaping",
            "landscape",
            "landscaper",
            "gardening",
            "garden",
            "تنسيق حدائق",
            "تنسيق حدايق",
            "حدائق",
            "حدايق",
            "بستنة",
            "بستاني",
            "حديقة",
            "حديقه",
        },
        "moving": {
            "moving",
            "mover",
            "relocation",
            "moving service",
            "moving company",
            "نقل",
            "نقل اثاث",
            "نقل أثاث",
            "شركة نقل",
            "عمال نقل",
            "ترحيل",
        },
        "carpentry": {
            "carpentry",
            "carpenter",
            "woodwork",
            "نجارة",
            "نجاره",
            "نجار",
            "اعمال خشب",
            "أعمال خشب",
            "خشب",
        },
        "air_conditioning": {
            "air conditioning",
            "air_conditioning",
            "ac",
            "a c",
            "a/c",
            "hvac",
            "cooling",
            "air conditioner",
            "ac repair",
            "hvac repair",
            "تكييف",
            "التكييف",
            "مكيف",
            "مكيفات",
            "صيانة مكيفات",
            "صيانه مكيفات",
            "تبريد",
            "تكييف وتبريد",
            "مكيف هواء",
        },
    }
    PROVIDER_TYPE_ALIASES = {
        "plumber": {
            "plumber",
            "plumbing technician",
            "plumbing specialist",
            "سباك",
            "فني سباكة",
            "فني سباكه",
            "فني صحي",
            "عامل صحي",
        },
        "electrician": {
            "electrician",
            "electrical technician",
            "electrical specialist",
            "كهربائي",
            "فني كهرباء",
            "مختص كهرباء",
        },
        "cleaner": {
            "cleaner",
            "cleaning service",
            "cleaning crew",
            "house cleaner",
            "عامل نظافة",
            "عامل نظافه",
            "شركة تنظيف",
            "فريق تنظيف",
        },
        "painter": {
            "painter",
            "painting contractor",
            "دهان",
            "صباغ",
            "فني دهان",
            "فني طلاء",
        },
        "landscaper": {
            "landscaper",
            "gardener",
            "garden specialist",
            "منسق حدائق",
            "منسق حدايق",
            "بستاني",
            "فني حدائق",
        },
        "mover": {
            "mover",
            "moving company",
            "moving crew",
            "عمال نقل",
            "ناقل اثاث",
            "ناقل أثاث",
            "شركة نقل",
            "مختص نقل",
        },
        "carpenter": {
            "carpenter",
            "woodworker",
            "نجار",
            "فني نجارة",
            "فني نجاره",
            "عامل خشب",
        },
        "ac_technician": {
            "ac technician",
            "air conditioning technician",
            "hvac technician",
            "cooling technician",
            "ac specialist",
            "فني تكييف",
            "فني مكيفات",
            "فني تبريد",
            "فني تكييف وتبريد",
            "مختص تكييف",
            "مصلح مكيف",
        },
    }
    URGENCY_ALIASES = {
        "high": {
            "high",
            "urgent",
            "emergency",
            "asap",
            "immediate",
            "critical",
            "right away",
            "عاجل",
            "طارئ",
            "طاري",
            "فوري",
            "فورا",
            "فوراً",
            "حالاً",
            "حالا",
            "باسرع وقت",
            "بأسرع وقت",
            "ضروري",
            "خطير",
            "مرتفعة",
            "مرتفع",
        },
        "medium": {
            "medium",
            "moderate",
            "normal",
            "soon",
            "standard",
            "متوسط",
            "متوسطة",
            "عادي",
            "عادية",
            "قريبا",
            "قريباً",
            "خلال اليوم",
            "اليوم",
        },
        "low": {
            "low",
            "minor",
            "routine",
            "whenever",
            "not urgent",
            "flexible",
            "منخفض",
            "منخفضة",
            "بسيط",
            "بسيطة",
            "غير عاجل",
            "غير مستعجل",
        },
    }
    ARABIC_CHAR_TRANSLATIONS = str.maketrans(
        {
            "أ": "ا",
            "إ": "ا",
            "آ": "ا",
            "ٱ": "ا",
            "ؤ": "و",
            "ئ": "ي",
            "ى": "ي",
        }
    )

    @classmethod
    def analyze(cls, problem_description: str, *, language: str = "en") -> dict[str, Any]:
        output_language = cls._resolve_output_language(problem_description, requested_language=language)
        last_error = None

        for attempt_number in range(1, cls.MAX_ANALYSIS_ATTEMPTS + 1):
            try:
                raw_analysis = cls._generate_analysis(
                    problem_description,
                    language=output_language,
                    attempt_number=attempt_number,
                )
                logger.info("Problem analysis raw model output: %s", raw_analysis)
                parsed_analysis = cls._prepare_analysis_payload(cls._parse_analysis_payload(raw_analysis))
                normalized_analysis = cls._normalize_analysis(parsed_analysis, problem_description=problem_description)
                logger.info("Problem analysis normalized output: %s", json.dumps(normalized_analysis, ensure_ascii=False))
                cls._validate_normalized_analysis(normalized_analysis)
                return normalized_analysis
            except ExternalServiceError as exc:
                last_error = exc
                logger.warning(
                    "Problem analysis attempt %s failed with code=%s",
                    attempt_number,
                    getattr(exc, "code", "unknown_error"),
                )
                if getattr(exc, "code", "") not in {
                    "ollama_analysis_invalid",
                    "ollama_analysis_incomplete",
                    "ollama_response_invalid",
                }:
                    raise

        raise last_error or ExternalServiceError(detail="Unable to analyze the problem right now.")

    @classmethod
    def _generate_analysis(cls, problem_description: str, *, language: str, attempt_number: int = 1) -> str:
        return OllamaAnalysisClient.generate(
            problem_description,
            language=language,
            attempt_number=attempt_number,
        )

    @staticmethod
    def _normalize_language(value: Any) -> str:
        return "ar" if str(value).strip().lower() == "ar" else "en"

    @classmethod
    def _resolve_output_language(cls, problem_description: str, *, requested_language: Any) -> str:
        detected_language = cls._detect_problem_language(problem_description)
        if detected_language:
            return detected_language
        return cls._normalize_language(requested_language)

    @staticmethod
    def _detect_problem_language(problem_description: str) -> str | None:
        if re.search(r"[\u0600-\u06FF]", problem_description or ""):
            return "ar"
        if re.search(r"[A-Za-z]", problem_description or ""):
            return "en"
        return None

    @classmethod
    def _parse_analysis_payload(cls, raw_analysis: str) -> dict[str, Any]:
        return ProblemAnalysisPayloadParser.parse(raw_analysis)

    @classmethod
    def _validate_analysis_payload(cls, payload: dict[str, Any]) -> None:
        ProblemAnalysisPayloadParser.validate_required_keys(payload, analysis_keys=cls.ANALYSIS_KEYS)

    @classmethod
    def _prepare_analysis_payload(cls, payload: dict[str, Any]) -> dict[str, Any]:
        return ProblemAnalysisPayloadParser.prepare(payload, analysis_keys=cls.ANALYSIS_KEYS)

    @staticmethod
    def _clean_text(value: str) -> str:
        return ProblemAnalysisPayloadParser._clean_text(value)

    @staticmethod
    def _strip_code_fences(value: str) -> str:
        return ProblemAnalysisPayloadParser._strip_code_fences(value)

    @staticmethod
    def _extract_json_object(value: str) -> str:
        return ProblemAnalysisPayloadParser._extract_json_object(value)

    @staticmethod
    def _try_parse_json(value: str) -> dict[str, Any] | None:
        return ProblemAnalysisPayloadParser._try_parse_json(value)

    @classmethod
    def _normalize_analysis(cls, payload: dict[str, Any], *, problem_description: str = "") -> dict[str, Any]:
        service_category = cls._normalize_service_category(payload.get("service_category"))
        if not service_category:
            service_category = cls._infer_service_category(problem_description, payload)

        provider_type = cls._normalize_provider_type(payload.get("provider_type"), service_category=service_category)
        if not provider_type:
            provider_type = cls._infer_provider_type(problem_description, payload, service_category=service_category)

        if not service_category and provider_type:
            service_category = cls.PROVIDER_TYPE_TO_SERVICE_CATEGORY.get(provider_type, "")
        if not provider_type and service_category:
            provider_type = cls.SERVICE_CATEGORY_TO_PROVIDER_TYPE.get(service_category, "")

        urgency = cls._normalize_urgency(payload.get("urgency"))
        if not urgency:
            urgency = cls._infer_urgency(problem_description, payload)

        return {
            "service_category": service_category,
            "provider_type": provider_type,
            "likely_issue": cls._normalize_free_text(payload.get("likely_issue")),
            "urgency": urgency,
            "keywords": cls._normalize_text_list(payload.get("keywords", [])),
            "suggested_solution": cls._normalize_free_text(payload.get("suggested_solution")),
            "quick_tips": cls._normalize_free_text_list(payload.get("quick_tips", []), limit=5),
        }

    @classmethod
    def _validate_normalized_analysis(cls, analysis: dict[str, Any]) -> None:
        missing_fields = []

        if not analysis.get("service_category") and not analysis.get("provider_type"):
            missing_fields.append("service_category/provider_type")

        for field in ["likely_issue", "urgency", "suggested_solution"]:
            if not analysis.get(field):
                missing_fields.append(field)

        if not analysis.get("quick_tips"):
            missing_fields.append("quick_tips")

        if missing_fields:
            raise ExternalServiceError(
                detail="Unable to analyze the problem right now.",
                code="ollama_analysis_incomplete",
                details={
                    "detail": "The model response did not contain enough usable analysis data.",
                    "missing_fields": missing_fields,
                },
            )

    @staticmethod
    def _normalize_text(value: Any) -> str:
        if value is None:
            return ""
        return re.sub(r"\s+", " ", str(value)).strip().lower()

    @classmethod
    def _normalize_lookup_text(cls, value: Any) -> str:
        if value is None:
            return ""
        normalized = str(value).strip().lower().translate(cls.ARABIC_CHAR_TRANSLATIONS)
        normalized = re.sub(r"[\u064B-\u065F\u0670\u0640]", "", normalized)
        normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
        normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
        return re.sub(r"\s+", " ", normalized).strip()

    @staticmethod
    def _normalize_free_text(value: Any) -> str:
        if value is None:
            return ""
        cleaned = re.sub(r"^[\-\*\u2022\s]+", "", str(value)).strip().strip('"').strip("'")
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def _normalize_text_list(cls, value: Any, *, limit: int = 10) -> list[str]:
        normalized_items = []
        for item in cls._coerce_list_value(value):
            normalized = cls._normalize_text(item)
            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)
            if len(normalized_items) >= limit:
                break
        return normalized_items

    @classmethod
    def _normalize_free_text_list(cls, value: Any, *, limit: int = 5) -> list[str]:
        normalized_items = []
        for item in cls._coerce_list_value(value):
            normalized = cls._normalize_free_text(item)
            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)
            if len(normalized_items) >= limit:
                break
        return normalized_items

    @staticmethod
    def _coerce_list_value(value: Any) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, tuple):
            return list(value)
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    parsed = json.loads(stripped)
                except json.JSONDecodeError:
                    try:
                        parsed = ast.literal_eval(stripped)
                    except (SyntaxError, ValueError):
                        parsed = None
                if isinstance(parsed, list):
                    return parsed
            lines = [line.strip("- *\t") for line in re.split(r"\r?\n", stripped) if line.strip()]
            if len(lines) > 1:
                return lines
            return [part.strip() for part in re.split(r",|;|،", stripped) if part.strip()]
        return [value]

    @classmethod
    def _normalize_service_category(cls, value: Any) -> str:
        matched_category = cls._match_alias(value, cls.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return matched_category

        matched_provider_type = cls._match_alias(value, cls.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return cls.PROVIDER_TYPE_TO_SERVICE_CATEGORY.get(matched_provider_type, "")

        normalized = cls._to_snake_case(value)
        return normalized if normalized in cls.SUPPORTED_SERVICE_CATEGORIES else ""

    @classmethod
    def _normalize_provider_type(cls, value: Any, *, service_category: str = "") -> str:
        matched_provider_type = cls._match_alias(value, cls.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return matched_provider_type

        matched_category = cls._match_alias(value, cls.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return cls.SERVICE_CATEGORY_TO_PROVIDER_TYPE.get(matched_category, "")

        normalized = cls._to_snake_case(value)
        if normalized in cls.SUPPORTED_PROVIDER_TYPES:
            return normalized

        if service_category:
            return cls.SERVICE_CATEGORY_TO_PROVIDER_TYPE.get(service_category, "")
        return ""

    @classmethod
    def _match_alias(cls, value: Any, aliases: dict[str, set[str]]) -> str:
        normalized_value = cls._normalize_lookup_text(value)
        if not normalized_value:
            return ""

        for canonical, options in aliases.items():
            normalized_options = cls._normalized_alias_options(canonical, options)
            if normalized_value in normalized_options:
                return canonical

        for canonical, options in aliases.items():
            normalized_options = cls._normalized_alias_options(canonical, options)
            if any(option and (option in normalized_value or normalized_value in option) for option in normalized_options):
                return canonical
        return ""

    @classmethod
    def _normalized_alias_options(cls, canonical: str, options: set[str]) -> set[str]:
        normalized_options = {cls._normalize_lookup_text(option) for option in options}
        normalized_options.add(cls._normalize_lookup_text(canonical))
        return {option for option in normalized_options if option}

    @classmethod
    def _best_text_alias_match(cls, text: str, aliases: dict[str, set[str]]) -> str:
        best_match = ""
        best_score = 0

        for canonical, options in aliases.items():
            score = sum(1 for option in cls._normalized_alias_options(canonical, options) if cls._text_contains_term(text, option))
            if score > best_score:
                best_match = canonical
                best_score = score

        return best_match

    @staticmethod
    def _text_contains_term(text: str, term: str) -> bool:
        if not text or not term:
            return False
        return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) is not None

    @classmethod
    def _to_snake_case(cls, value: Any) -> str:
        normalized = cls._normalize_text(value)
        normalized = re.sub(r"[^a-z0-9]+", "_", normalized)
        return normalized.strip("_")

    @classmethod
    def _normalize_urgency(cls, value: Any) -> str:
        matched_urgency = cls._match_alias(value, cls.URGENCY_ALIASES)
        if matched_urgency:
            return matched_urgency

        normalized = cls._normalize_lookup_text(value)
        if any(token in normalized for token in ["urgent", "emergency", "asap", "immediate", "high", "عاجل", "طارئ", "فوري"]):
            return "high"
        if any(token in normalized for token in ["low", "minor", "routine", "منخفض", "بسيط", "غير عاجل"]):
            return "low"
        if normalized:
            return "medium"
        return ""

    @classmethod
    def _infer_service_category(cls, problem_description: str, payload: dict[str, Any]) -> str:
        combined_text = cls._combined_analysis_text(problem_description, payload)
        if not combined_text:
            return ""

        matched_category = cls._best_text_alias_match(combined_text, cls.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return matched_category

        matched_provider_type = cls._best_text_alias_match(combined_text, cls.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return cls.PROVIDER_TYPE_TO_SERVICE_CATEGORY.get(matched_provider_type, "")

        best_match = ""
        best_score = 0
        for category, hints in cls.SERVICE_CATEGORY_HINTS.items():
            score = sum(
                1
                for hint in hints
                if hint and cls._text_contains_term(combined_text, cls._normalize_lookup_text(hint))
            )
            if score > best_score:
                best_match = category
                best_score = score
        return best_match

    @classmethod
    def _infer_provider_type(cls, problem_description: str, payload: dict[str, Any], *, service_category: str = "") -> str:
        explicit_provider_type = cls._match_alias(payload.get("provider_type"), cls.PROVIDER_TYPE_ALIASES)
        if explicit_provider_type:
            return explicit_provider_type

        combined_text = cls._combined_analysis_text(problem_description, payload)
        matched_provider_type = cls._best_text_alias_match(combined_text, cls.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return matched_provider_type

        inferred_category = service_category or cls._infer_service_category(problem_description, payload)
        return cls.SERVICE_CATEGORY_TO_PROVIDER_TYPE.get(inferred_category, "")

    @classmethod
    def _infer_urgency(cls, problem_description: str, payload: dict[str, Any]) -> str:
        combined_text = cls._combined_analysis_text(problem_description, payload)
        if not combined_text:
            return ""

        if any(
            token in combined_text
            for token in [
                "urgent",
                "emergency",
                "asap",
                "immediate",
                "right away",
                "عاجل",
                "طارئ",
                "فوري",
                "ضروري",
                "باسرع وقت",
                "بأسرع وقت",
            ]
        ):
            return "high"
        if any(token in combined_text for token in ["not urgent", "routine", "whenever", "غير عاجل", "بسيط", "منخفض"]):
            return "low"
        return "medium"

    @classmethod
    def _combined_analysis_text(cls, problem_description: str, payload: dict[str, Any]) -> str:
        parts = [problem_description]
        parts.extend(
            str(payload.get(key) or "")
            for key in ["service_category", "provider_type", "likely_issue", "urgency", "suggested_solution"]
        )
        parts.extend(str(item) for item in cls._coerce_list_value(payload.get("keywords")))
        parts.extend(str(item) for item in cls._coerce_list_value(payload.get("quick_tips")))
        return cls._normalize_lookup_text(" ".join(part for part in parts if part))


class ProviderRecommendationService:
    MAX_DISTANCE_KM = 50.0

    @classmethod
    def recommend(
        cls,
        *,
        analysis: dict[str, Any],
        user_lat: float | None = None,
        user_lng: float | None = None,
        budget: Decimal | None = None,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        providers = list(cls._filter_providers(analysis))
        if not providers:
            return []

        provider_contexts = [cls._build_provider_context(provider, analysis) for provider in providers]
        priced_contexts = [context for context in provider_contexts if context["reference_price"] is not None]

        min_price = min((context["reference_price"] for context in priced_contexts), default=None)
        max_price = max((context["reference_price"] for context in priced_contexts), default=None)

        scored_providers = []
        for context in provider_contexts:
            provider = context["provider"]
            distance_km = cls._distance_km(provider, user_lat=user_lat, user_lng=user_lng)

            specialization_match = cls._specialization_match(context, analysis)
            rating_score = cls._rating_score(provider)
            distance_score = cls._distance_score(distance_km)
            price_score = cls._price_score(context["reference_price"], budget=budget, min_price=min_price, max_price=max_price)
            response_speed_score = cls._response_speed_score(provider.response_time)
            availability_score = cls._availability_score(provider.availability)

            total_score = (
                0.40 * specialization_match
                + 0.20 * rating_score
                + 0.15 * distance_score
                + 0.10 * price_score
                + 0.10 * response_speed_score
                + 0.05 * availability_score
            )

            scored_providers.append(
                {
                    "id": provider.id,
                    "name": provider.display_name,
                    "rating": round(float(provider.rating or 0), 2),
                    "distance": round(distance_km or 0.0, 2),
                    "price_range": context["price_range"],
                    "score": round(total_score, 4),
                    "_sort_distance": distance_km if distance_km is not None else cls.MAX_DISTANCE_KM + 1,
                    "_sort_price": float(context["reference_price"]) if context["reference_price"] is not None else float("inf"),
                }
            )

        ranked = sorted(
            scored_providers,
            key=lambda item: (-item["score"], -item["rating"], item["_sort_distance"], item["_sort_price"]),
        )

        top_results = []
        for provider in ranked[:limit]:
            provider.pop("_sort_distance", None)
            provider.pop("_sort_price", None)
            top_results.append(provider)
        return top_results

    @classmethod
    def _filter_providers(cls, analysis: dict[str, Any]):
        queryset = providers_queryset().filter(user__status=ACTIVE).prefetch_related(
            Prefetch("services", queryset=ServiceListing.objects.filter(is_active=True).order_by("price", "id"))
        )
        filters = cls._build_filter_query(analysis)
        if filters is None:
            return queryset
        return queryset.filter(filters).distinct()

    @classmethod
    def _build_filter_query(cls, analysis: dict[str, Any]) -> Q | None:
        service_category = ProblemAnalysisService._normalize_text(analysis.get("service_category")).replace("_", " ")
        service_category_raw = ProblemAnalysisService._normalize_text(analysis.get("service_category"))
        provider_type = ProblemAnalysisService._normalize_text(analysis.get("provider_type")).replace("_", " ")
        keywords = [ProblemAnalysisService._normalize_text(keyword) for keyword in analysis.get("keywords", [])]

        filters = Q()
        has_filters = False

        if service_category_raw:
            filters |= Q(category__iexact=service_category_raw)
            filters |= Q(category__icontains=service_category)
            filters |= Q(display_name__icontains=service_category)
            filters |= Q(bio__icontains=service_category)
            filters |= Q(services__is_active=True, services__category__iexact=service_category_raw)
            filters |= Q(services__is_active=True, services__category__icontains=service_category)
            filters |= Q(services__is_active=True, services__title__icontains=service_category)
            filters |= Q(services__is_active=True, services__description__icontains=service_category)
            has_filters = True

        if provider_type:
            filters |= Q(display_name__icontains=provider_type)
            filters |= Q(bio__icontains=provider_type)
            filters |= Q(services__is_active=True, services__title__icontains=provider_type)
            filters |= Q(services__is_active=True, services__description__icontains=provider_type)
            has_filters = True

        for keyword in keywords:
            if not keyword:
                continue
            filters |= Q(display_name__icontains=keyword)
            filters |= Q(bio__icontains=keyword)
            filters |= Q(services__is_active=True, services__title__icontains=keyword)
            filters |= Q(services__is_active=True, services__description__icontains=keyword)
            has_filters = True

        return filters if has_filters else None

    @classmethod
    def _build_provider_context(cls, provider, analysis: dict[str, Any]) -> dict[str, Any]:
        relevant_services = cls._relevant_services(provider, analysis)
        price_sources = relevant_services or list(provider.services.all())
        reference_price = cls._reference_price(provider, price_sources)
        price_range = cls._price_range(provider, price_sources)
        return {
            "provider": provider,
            "relevant_services": relevant_services,
            "reference_price": reference_price,
            "price_range": price_range,
            "provider_text": cls._provider_text(provider, relevant_services or list(provider.services.all())),
        }

    @classmethod
    def _relevant_services(cls, provider, analysis: dict[str, Any]) -> list[ServiceListing]:
        services = list(provider.services.all())
        if not services:
            return []

        match_terms = cls._analysis_terms(analysis)
        if not match_terms:
            return services

        relevant = []
        for service in services:
            service_text = cls._normalize_match_text(" ".join([service.category, service.title, service.description]))
            if any(term in service_text for term in match_terms):
                relevant.append(service)
        return relevant

    @classmethod
    def _analysis_terms(cls, analysis: dict[str, Any]) -> list[str]:
        terms = []
        for raw_value in [analysis.get("service_category"), analysis.get("provider_type"), *(analysis.get("keywords") or [])]:
            normalized = cls._normalize_match_text(str(raw_value or ""))
            if normalized:
                terms.append(normalized)
        return list(dict.fromkeys(terms))

    @classmethod
    def _provider_text(cls, provider, services: list[ServiceListing]) -> str:
        parts = [provider.category, provider.display_name, provider.bio, provider.location, provider.availability, provider.response_time]
        parts.extend(str(skill) for skill in (provider.skills or []))
        for service in services:
            parts.extend([service.category, service.title, service.description])
        return cls._normalize_match_text(" ".join(part for part in parts if part))

    @staticmethod
    def _normalize_match_text(value: str) -> str:
        return ProblemAnalysisService._normalize_lookup_text(value)

    @classmethod
    def _specialization_match(cls, context: dict[str, Any], analysis: dict[str, Any]) -> float:
        provider = context["provider"]
        relevant_services = context["relevant_services"]
        provider_text = context["provider_text"]
        service_category = cls._normalize_match_text(str(analysis.get("service_category") or ""))
        provider_type = cls._normalize_match_text(str(analysis.get("provider_type") or ""))
        keywords = [cls._normalize_match_text(str(keyword)) for keyword in analysis.get("keywords", []) if keyword]

        category_score = 0.0
        provider_category = cls._normalize_match_text(provider.category)
        service_categories = {cls._normalize_match_text(service.category) for service in relevant_services or provider.services.all()}
        if service_category:
            if service_category == provider_category or service_category in service_categories:
                category_score = 1.0
            elif service_category in provider_text:
                category_score = 0.7

        provider_type_score = 0.0
        if provider_type:
            if provider_type in provider_text:
                provider_type_score = 1.0
            elif cls._has_token_overlap(provider_type, provider_text):
                provider_type_score = 0.55

        keyword_score = 0.0
        if keywords:
            matches = sum(1 for keyword in keywords if keyword and (keyword in provider_text or cls._has_token_overlap(keyword, provider_text)))
            keyword_score = matches / len(keywords)

        total_weight = 0.0
        weighted_score = 0.0
        if service_category:
            weighted_score += category_score * 1.0
            total_weight += 1.0
        if provider_type:
            weighted_score += provider_type_score * 0.9
            total_weight += 0.9
        if keywords:
            weighted_score += keyword_score * 0.6
            total_weight += 0.6

        if total_weight == 0:
            return 0.0
        return round(min(1.0, weighted_score / total_weight), 4)

    @staticmethod
    def _has_token_overlap(term: str, text: str) -> bool:
        term_tokens = set(term.split())
        text_tokens = set(text.split())
        return bool(term_tokens and term_tokens.intersection(text_tokens))

    @staticmethod
    def _rating_score(provider) -> float:
        rating = float(provider.rating or 0)
        return max(0.0, min(1.0, rating / 5.0))

    @classmethod
    def _distance_km(cls, provider, *, user_lat: float | None, user_lng: float | None) -> float | None:
        if user_lat is None or user_lng is None:
            return None

        provider_coords = cls._extract_provider_coordinates(provider.location)
        if provider_coords is None:
            return None

        provider_lat, provider_lng = provider_coords
        return cls._haversine_distance(user_lat, user_lng, provider_lat, provider_lng)

    @classmethod
    def _distance_score(cls, distance_km: float | None) -> float:
        if distance_km is None:
            return 0.5
        capped_distance = min(distance_km, cls.MAX_DISTANCE_KM)
        return round(max(0.0, 1.0 - (capped_distance / cls.MAX_DISTANCE_KM)), 4)

    @classmethod
    def _extract_provider_coordinates(cls, location: str | None) -> tuple[float, float] | None:
        if not location:
            return None

        location = location.strip()
        try:
            parsed = json.loads(location)
        except json.JSONDecodeError:
            parsed = None

        if isinstance(parsed, dict):
            lat = parsed.get("lat", parsed.get("latitude"))
            lng = parsed.get("lng", parsed.get("longitude"))
            if cls._is_coordinate_pair(lat, lng):
                return float(lat), float(lng)

        coordinate_match = re.search(
            r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)",
            location,
        )
        if coordinate_match:
            lat, lng = coordinate_match.groups()
            if cls._is_coordinate_pair(lat, lng):
                return float(lat), float(lng)
        return None

    @staticmethod
    def _is_coordinate_pair(lat: Any, lng: Any) -> bool:
        try:
            lat_value = float(lat)
            lng_value = float(lng)
        except (TypeError, ValueError):
            return False
        return -90 <= lat_value <= 90 and -180 <= lng_value <= 180

    @staticmethod
    def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        earth_radius_km = 6371.0
        lat1_rad = math.radians(lat1)
        lng1_rad = math.radians(lng1)
        lat2_rad = math.radians(lat2)
        lng2_rad = math.radians(lng2)

        delta_lat = lat2_rad - lat1_rad
        delta_lng = lng2_rad - lng1_rad

        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return earth_radius_km * c

    @staticmethod
    def _reference_price(provider, services: list[ServiceListing]) -> Decimal | None:
        service_prices = [service.price for service in services if service.price is not None]
        if service_prices:
            return min(service_prices)
        if provider.hourly_rate is not None and provider.hourly_rate > 0:
            return provider.hourly_rate
        return None

    @staticmethod
    def _price_range(provider, services: list[ServiceListing]) -> str:
        service_prices = sorted({service.price for service in services if service.price is not None})
        if service_prices:
            low = service_prices[0]
            high = service_prices[-1]
            if low == high:
                return f"{low:.2f}"
            return f"{low:.2f} - {high:.2f}"
        if provider.hourly_rate is not None and provider.hourly_rate > 0:
            return f"{provider.hourly_rate:.2f}/hour"
        return ""

    @staticmethod
    def _price_score(
        reference_price: Decimal | None,
        *,
        budget: Decimal | None,
        min_price: Decimal | None,
        max_price: Decimal | None,
    ) -> float:
        if reference_price is None:
            return 0.5

        if budget is not None:
            if budget == 0:
                return 1.0 if reference_price == 0 else 0.0
            if reference_price <= budget:
                variance = (budget - reference_price) / budget
                return round(float(max(Decimal("0.70"), Decimal("1.00") - (variance * Decimal("0.30")))), 4)
            excess = (reference_price - budget) / budget
            return round(float(max(Decimal("0.00"), Decimal("1.00") - excess)), 4)

        if min_price is None or max_price is None or max_price == min_price:
            return 1.0

        return round(float((max_price - reference_price) / (max_price - min_price)), 4)

    @staticmethod
    def _response_speed_score(response_time: str | None) -> float:
        if not response_time:
            return 0.5

        text = response_time.lower()
        if "instant" in text or "immediate" in text:
            return 1.0
        if "same day" in text:
            return 0.6

        match = re.search(r"(\d+(?:\.\d+)?)\s*(minute|min|minutes|hour|hours|hr|hrs|day|days)", text)
        if not match:
            return 0.6

        value = float(match.group(1))
        unit = match.group(2)
        if unit.startswith("min"):
            if value <= 30:
                return 1.0
            if value <= 60:
                return 0.95
            return 0.85
        if unit in {"hour", "hours", "hr", "hrs"}:
            if value <= 1:
                return 0.95
            if value <= 2:
                return 0.85
            if value <= 6:
                return 0.7
            if value <= 12:
                return 0.55
            if value <= 24:
                return 0.4
            return 0.25
        if value <= 1:
            return 0.3
        if value <= 2:
            return 0.2
        return 0.1

    @staticmethod
    def _availability_score(availability: str | None) -> float:
        if not availability:
            return 0.5

        text = availability.lower()
        normalized = text.replace("/", " ")
        if "24/7" in text or "24 7" in normalized or "anytime" in normalized:
            return 1.0
        if "daily" in normalized or "every day" in normalized:
            return 0.9
        if "today" in normalized or "now" in normalized:
            return 0.9
        if re.search(r"\d{1,2}:\d{2}", normalized):
            return 0.8
        if any(day in normalized for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]):
            return 0.75
        if "weekend" in normalized:
            return 0.65
        return 0.7
