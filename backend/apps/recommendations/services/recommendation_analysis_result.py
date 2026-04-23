from typing import Any

from shared.exceptions import ExternalServiceError

from .recommendation_taxonomy import RecommendationTaxonomy
from .recommendation_text import RecommendationTextProcessor


class RecommendationAliasMatcher:
    taxonomy_class = RecommendationTaxonomy
    text_processor_class = RecommendationTextProcessor

    @classmethod
    def match_value(cls, value: Any, aliases: dict[str, set[str]]) -> str:
        normalized_value = cls.text_processor_class.normalize_lookup_text(value)
        if not normalized_value:
            return ""

        for canonical, options in aliases.items():
            if normalized_value in cls.normalized_alias_options(canonical, options):
                return canonical

        for canonical, options in aliases.items():
            normalized_options = cls.normalized_alias_options(canonical, options)
            if any(option and (option in normalized_value or normalized_value in option) for option in normalized_options):
                return canonical
        return ""

    @classmethod
    def best_text_match(cls, text: str, aliases: dict[str, set[str]]) -> str:
        best_match = ""
        best_score = 0

        for canonical, options in aliases.items():
            score = sum(
                1
                for option in cls.normalized_alias_options(canonical, options)
                if cls.text_processor_class.contains_term(text, option)
            )
            if score > best_score:
                best_match = canonical
                best_score = score

        return best_match

    @classmethod
    def normalized_alias_options(cls, canonical: str, options: set[str]) -> set[str]:
        normalized_options = {cls.text_processor_class.normalize_lookup_text(option) for option in options}
        normalized_options.add(cls.text_processor_class.normalize_lookup_text(canonical))
        return {option for option in normalized_options if option}


class ProblemAnalysisInferenceEngine:
    taxonomy_class = RecommendationTaxonomy
    text_processor_class = RecommendationTextProcessor
    alias_matcher_class = RecommendationAliasMatcher

    @classmethod
    def resolve_service_category(cls, value: Any) -> str:
        matched_category = cls.alias_matcher_class.match_value(value, cls.taxonomy_class.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return matched_category

        matched_provider_type = cls.alias_matcher_class.match_value(value, cls.taxonomy_class.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return cls.taxonomy_class.service_category_for_provider_type(matched_provider_type)

        normalized = cls.text_processor_class.to_snake_case(value)
        return normalized if normalized in cls.taxonomy_class.SUPPORTED_SERVICE_CATEGORIES else ""

    @classmethod
    def resolve_provider_type(cls, value: Any, *, service_category: str = "") -> str:
        matched_provider_type = cls.alias_matcher_class.match_value(value, cls.taxonomy_class.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return matched_provider_type

        matched_category = cls.alias_matcher_class.match_value(value, cls.taxonomy_class.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return cls.taxonomy_class.provider_type_for_category(matched_category)

        normalized = cls.text_processor_class.to_snake_case(value)
        if normalized in cls.taxonomy_class.SUPPORTED_PROVIDER_TYPES:
            return normalized

        if service_category:
            return cls.taxonomy_class.provider_type_for_category(service_category)
        return ""

    @classmethod
    def resolve_urgency(cls, value: Any) -> str:
        matched_urgency = cls.alias_matcher_class.match_value(value, cls.taxonomy_class.URGENCY_ALIASES)
        if matched_urgency:
            return matched_urgency

        normalized = cls.text_processor_class.normalize_lookup_text(value)
        if any(token in normalized for token in cls.taxonomy_class.HIGH_URGENCY_TOKENS):
            return "high"
        if any(token in normalized for token in cls.taxonomy_class.LOW_URGENCY_TOKENS):
            return "low"
        if normalized:
            return "medium"
        return ""

    @classmethod
    def infer_service_category(cls, problem_description: str, payload: dict[str, Any]) -> str:
        combined_text = cls._combined_text(problem_description, payload)
        if not combined_text:
            return ""

        matched_category = cls.alias_matcher_class.best_text_match(combined_text, cls.taxonomy_class.SERVICE_CATEGORY_ALIASES)
        if matched_category:
            return matched_category

        matched_provider_type = cls.alias_matcher_class.best_text_match(combined_text, cls.taxonomy_class.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return cls.taxonomy_class.service_category_for_provider_type(matched_provider_type)

        best_match = ""
        best_score = 0
        for category, hints in cls.taxonomy_class.SERVICE_CATEGORY_HINTS.items():
            score = sum(
                1
                for hint in hints
                if hint and cls.text_processor_class.contains_term(combined_text, cls.text_processor_class.normalize_lookup_text(hint))
            )
            if score > best_score:
                best_match = category
                best_score = score
        return best_match

    @classmethod
    def infer_provider_type(cls, problem_description: str, payload: dict[str, Any], *, service_category: str = "") -> str:
        explicit_provider_type = cls.alias_matcher_class.match_value(payload.get("provider_type"), cls.taxonomy_class.PROVIDER_TYPE_ALIASES)
        if explicit_provider_type:
            return explicit_provider_type

        combined_text = cls._combined_text(problem_description, payload)
        matched_provider_type = cls.alias_matcher_class.best_text_match(combined_text, cls.taxonomy_class.PROVIDER_TYPE_ALIASES)
        if matched_provider_type:
            return matched_provider_type

        inferred_category = service_category or cls.infer_service_category(problem_description, payload)
        return cls.taxonomy_class.provider_type_for_category(inferred_category)

    @classmethod
    def infer_urgency(cls, problem_description: str, payload: dict[str, Any]) -> str:
        combined_text = cls._combined_text(problem_description, payload)
        if not combined_text:
            return ""

        if any(token in combined_text for token in cls.taxonomy_class.HIGH_URGENCY_TOKENS):
            return "high"
        if any(token in combined_text for token in cls.taxonomy_class.LOW_URGENCY_TOKENS):
            return "low"
        return "medium"

    @classmethod
    def _combined_text(cls, problem_description: str, payload: dict[str, Any]) -> str:
        parts = [problem_description]
        parts.extend(
            str(payload.get(key) or "")
            for key in ["service_category", "provider_type", "likely_issue", "urgency", "suggested_solution"]
        )
        parts.extend(str(item) for item in cls.text_processor_class.coerce_list(payload.get("keywords")))
        parts.extend(str(item) for item in cls.text_processor_class.coerce_list(payload.get("quick_tips")))
        return cls.text_processor_class.normalize_lookup_text(" ".join(part for part in parts if part))


class ProblemAnalysisResponseBuilder:
    taxonomy_class = RecommendationTaxonomy
    text_processor_class = RecommendationTextProcessor
    inference_engine_class = ProblemAnalysisInferenceEngine

    @classmethod
    def build(cls, payload: dict[str, Any], *, problem_description: str = "") -> dict[str, Any]:
        service_category = cls.inference_engine_class.resolve_service_category(payload.get("service_category"))
        if not service_category:
            service_category = cls.inference_engine_class.infer_service_category(problem_description, payload)

        provider_type = cls.inference_engine_class.resolve_provider_type(
            payload.get("provider_type"),
            service_category=service_category,
        )
        if not provider_type:
            provider_type = cls.inference_engine_class.infer_provider_type(
                problem_description,
                payload,
                service_category=service_category,
            )

        if not service_category and provider_type:
            service_category = cls.taxonomy_class.service_category_for_provider_type(provider_type)
        if not provider_type and service_category:
            provider_type = cls.taxonomy_class.provider_type_for_category(service_category)

        urgency = cls.inference_engine_class.resolve_urgency(payload.get("urgency"))
        if not urgency:
            urgency = cls.inference_engine_class.infer_urgency(problem_description, payload)

        likely_issue = cls.text_processor_class.normalize_free_text(payload.get("likely_issue"))
        if not likely_issue:
            likely_issue = cls._fallback_likely_issue(problem_description)

        return {
            "service_category": service_category,
            "provider_type": provider_type,
            "likely_issue": likely_issue,
            "urgency": urgency,
            "keywords": cls.text_processor_class.normalize_text_list(payload.get("keywords", [])),
            "suggested_solution": cls.text_processor_class.normalize_free_text(payload.get("suggested_solution")),
            "quick_tips": cls.text_processor_class.normalize_free_text_list(payload.get("quick_tips", []), limit=5),
        }

    @classmethod
    def _fallback_likely_issue(cls, problem_description: str) -> str:
        cleaned_problem = cls.text_processor_class.normalize_free_text(problem_description)
        if not cleaned_problem:
            return ""

        first_segment = cleaned_problem.splitlines()[0].strip()
        if not first_segment:
            return ""

        return first_segment[:180].strip()


class ProblemAnalysisResponseValidator:
    @staticmethod
    def validate(analysis: dict[str, Any]) -> None:
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
