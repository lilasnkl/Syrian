import ast
import json
import re
from typing import Any

from .recommendation_taxonomy import RecommendationTaxonomy


class RecommendationTextProcessor:
    taxonomy_class = RecommendationTaxonomy

    @staticmethod
    def normalize_text(value: Any) -> str:
        if value is None:
            return ""
        return re.sub(r"\s+", " ", str(value)).strip().lower()

    @classmethod
    def normalize_lookup_text(cls, value: Any) -> str:
        if value is None:
            return ""
        normalized = str(value).strip().lower().translate(cls.taxonomy_class.ARABIC_CHAR_TRANSLATIONS)
        normalized = re.sub(r"[\u064B-\u065F\u0670\u0640]", "", normalized)
        normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
        normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
        return re.sub(r"\s+", " ", normalized).strip()

    @staticmethod
    def normalize_free_text(value: Any) -> str:
        if value is None:
            return ""
        cleaned = re.sub(r"^[\-\*\u2022\s]+", "", str(value)).strip().strip('"').strip("'")
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def coerce_list(cls, value: Any) -> list[Any]:
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
    def normalize_text_list(cls, value: Any, *, limit: int = 10) -> list[str]:
        normalized_items = []
        for item in cls.coerce_list(value):
            normalized = cls.normalize_text(item)
            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)
            if len(normalized_items) >= limit:
                break
        return normalized_items

    @classmethod
    def normalize_free_text_list(cls, value: Any, *, limit: int = 5) -> list[str]:
        normalized_items = []
        for item in cls.coerce_list(value):
            normalized = cls.normalize_free_text(item)
            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)
            if len(normalized_items) >= limit:
                break
        return normalized_items

    @classmethod
    def to_snake_case(cls, value: Any) -> str:
        normalized = cls.normalize_text(value)
        normalized = re.sub(r"[^a-z0-9]+", "_", normalized)
        return normalized.strip("_")

    @staticmethod
    def contains_term(text: str, term: str) -> bool:
        if not text or not term:
            return False
        return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) is not None
