import json
import logging
from decimal import Decimal
from typing import Any

from shared.exceptions import ExternalServiceError

from .recommendation_analysis import (
    OllamaAnalysisClient,
    ProblemAnalysisNormalizer,
    ProblemAnalysisPayloadParser,
    ProblemLanguageResolver,
)
from .recommendation_provider_engine import ProviderRecommendationFinder, ProviderRecommendationRanker


logger = logging.getLogger(__name__)


class ProblemAnalysisService:
    MAX_ANALYSIS_ATTEMPTS = 2
    ANALYSIS_KEYS = ProblemAnalysisNormalizer.ANALYSIS_KEYS
    language_resolver_class = ProblemLanguageResolver
    analysis_client_class = OllamaAnalysisClient
    payload_parser_class = ProblemAnalysisPayloadParser
    normalizer_class = ProblemAnalysisNormalizer

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
        return cls.analysis_client_class.generate(
            problem_description,
            language=language,
            attempt_number=attempt_number,
        )

    @classmethod
    def _resolve_output_language(cls, problem_description: str, *, requested_language: Any) -> str:
        return cls.language_resolver_class.resolve_output_language(
            problem_description,
            requested_language=requested_language,
        )

    @classmethod
    def _parse_analysis_payload(cls, raw_analysis: str) -> dict[str, Any]:
        return cls.payload_parser_class.parse(raw_analysis)

    @classmethod
    def _validate_analysis_payload(cls, payload: dict[str, Any]) -> None:
        cls.payload_parser_class.validate_required_keys(payload, analysis_keys=cls.ANALYSIS_KEYS)

    @classmethod
    def _prepare_analysis_payload(cls, payload: dict[str, Any]) -> dict[str, Any]:
        return cls.payload_parser_class.prepare(payload, analysis_keys=cls.ANALYSIS_KEYS)

    @classmethod
    def _normalize_analysis(cls, payload: dict[str, Any], *, problem_description: str = "") -> dict[str, Any]:
        return cls.normalizer_class.normalize(payload, problem_description=problem_description)

    @classmethod
    def _validate_normalized_analysis(cls, analysis: dict[str, Any]) -> None:
        cls.normalizer_class.validate(analysis)


class ProviderRecommendationService:
    finder_class = ProviderRecommendationFinder
    ranker_class = ProviderRecommendationRanker
    MAX_DISTANCE_KM = ProviderRecommendationRanker.MAX_DISTANCE_KM

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
        provider_contexts = cls.finder_class.build_contexts(analysis)
        return cls.ranker_class.rank(
            provider_contexts,
            analysis,
            user_lat=user_lat,
            user_lng=user_lng,
            budget=budget,
            limit=limit,
        )
