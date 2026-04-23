import type {
  RecommendationAnalysis,
  RecommendationResult,
  RecommendedProviderMatch,
} from "./types";

interface BackendRecommendationAnalysis {
  service_category: string;
  provider_type: string;
  likely_issue: string;
  urgency: string;
  keywords: string[];
  suggested_solution: string;
  quick_tips: string[];
}

interface BackendRecommendedProviderMatch {
  id: number | string;
  name: string;
  rating: number;
  distance: number;
  price_range: string;
  score: number;
}

export interface BackendRecommendationResult {
  analysis: BackendRecommendationAnalysis;
  top_providers: BackendRecommendedProviderMatch[];
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapRecommendationAnalysis(analysis: BackendRecommendationAnalysis): RecommendationAnalysis {
  return {
    serviceCategory: analysis.service_category,
    providerType: analysis.provider_type,
    likelyIssue: analysis.likely_issue,
    urgency: analysis.urgency,
    keywords: analysis.keywords ?? [],
    suggestedSolution: analysis.suggested_solution,
    quickTips: analysis.quick_tips ?? [],
  };
}

export function mapRecommendedProviderMatch(match: BackendRecommendedProviderMatch): RecommendedProviderMatch {
  return {
    id: String(match.id),
    name: match.name,
    rating: toNumber(match.rating),
    distance: toNumber(match.distance),
    priceRange: match.price_range || "",
    score: toNumber(match.score),
  };
}

export function mapRecommendationResult(recommendation: BackendRecommendationResult): RecommendationResult {
  return {
    analysis: mapRecommendationAnalysis(recommendation.analysis),
    topProviders: (recommendation.top_providers ?? []).map(mapRecommendedProviderMatch),
  };
}
