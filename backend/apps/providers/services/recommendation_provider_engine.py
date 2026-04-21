import json
import math
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.db.models import Prefetch, Q

from apps.providers.selectors import providers_queryset
from apps.services.models import ServiceListing
from shared.constants import ACTIVE

from .recommendation_analysis import ProblemAnalysisNormalizer


@dataclass(frozen=True)
class ProviderRecommendationContext:
    provider: Any
    relevant_services: list[ServiceListing]
    reference_price: Decimal | None
    price_range: str
    provider_text: str


class ProviderRecommendationFinder:
    @classmethod
    def build_contexts(cls, analysis: dict[str, Any]) -> list[ProviderRecommendationContext]:
        providers = list(cls._filter_providers(analysis))
        return [cls._build_provider_context(provider, analysis) for provider in providers]

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
        service_category = ProblemAnalysisNormalizer.normalize_text(analysis.get("service_category")).replace("_", " ")
        service_category_raw = ProblemAnalysisNormalizer.normalize_text(analysis.get("service_category"))
        provider_type = ProblemAnalysisNormalizer.normalize_text(analysis.get("provider_type")).replace("_", " ")
        keywords = [ProblemAnalysisNormalizer.normalize_text(keyword) for keyword in analysis.get("keywords", [])]

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
    def _build_provider_context(cls, provider, analysis: dict[str, Any]) -> ProviderRecommendationContext:
        relevant_services = cls._relevant_services(provider, analysis)
        price_sources = relevant_services or list(provider.services.all())
        return ProviderRecommendationContext(
            provider=provider,
            relevant_services=relevant_services,
            reference_price=cls._reference_price(provider, price_sources),
            price_range=cls._price_range(provider, price_sources),
            provider_text=cls._provider_text(provider, relevant_services or list(provider.services.all())),
        )

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
        return ProblemAnalysisNormalizer.normalize_lookup_text(value)

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


class ProviderRecommendationRanker:
    MAX_DISTANCE_KM = 50.0
    SPECIALIZATION_WEIGHT = 0.40
    RATING_WEIGHT = 0.20
    DISTANCE_WEIGHT = 0.15
    PRICE_WEIGHT = 0.10
    RESPONSE_SPEED_WEIGHT = 0.10
    AVAILABILITY_WEIGHT = 0.05

    @classmethod
    def rank(
        cls,
        provider_contexts: list[ProviderRecommendationContext],
        analysis: dict[str, Any],
        *,
        user_lat: float | None = None,
        user_lng: float | None = None,
        budget: Decimal | None = None,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        if not provider_contexts:
            return []

        priced_contexts = [context for context in provider_contexts if context.reference_price is not None]
        min_price = min((context.reference_price for context in priced_contexts), default=None)
        max_price = max((context.reference_price for context in priced_contexts), default=None)

        scored_providers = []
        for context in provider_contexts:
            provider = context.provider
            distance_km = cls._distance_km(provider, user_lat=user_lat, user_lng=user_lng)

            total_score = (
                cls.SPECIALIZATION_WEIGHT * cls._specialization_match(context, analysis)
                + cls.RATING_WEIGHT * cls._rating_score(provider)
                + cls.DISTANCE_WEIGHT * cls._distance_score(distance_km)
                + cls.PRICE_WEIGHT * cls._price_score(context.reference_price, budget=budget, min_price=min_price, max_price=max_price)
                + cls.RESPONSE_SPEED_WEIGHT * cls._response_speed_score(provider.response_time)
                + cls.AVAILABILITY_WEIGHT * cls._availability_score(provider.availability)
            )

            scored_providers.append(
                {
                    "id": provider.id,
                    "name": provider.display_name,
                    "rating": round(float(provider.rating or 0), 2),
                    "distance": round(distance_km or 0.0, 2),
                    "price_range": context.price_range,
                    "score": round(total_score, 4),
                    "_sort_distance": distance_km if distance_km is not None else cls.MAX_DISTANCE_KM + 1,
                    "_sort_price": float(context.reference_price) if context.reference_price is not None else float("inf"),
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
    def _specialization_match(cls, context: ProviderRecommendationContext, analysis: dict[str, Any]) -> float:
        provider = context.provider
        relevant_services = context.relevant_services
        provider_text = context.provider_text
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
    def _normalize_match_text(value: str) -> str:
        return ProblemAnalysisNormalizer.normalize_lookup_text(value)

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
