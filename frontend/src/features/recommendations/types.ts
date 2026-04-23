export interface RecommendationAnalysis {
  serviceCategory: string;
  providerType: string;
  likelyIssue: string;
  urgency: string;
  keywords: string[];
  suggestedSolution: string;
  quickTips: string[];
}

export interface RecommendedProviderMatch {
  id: string;
  name: string;
  rating: number;
  distance: number;
  priceRange: string;
  score: number;
}

export interface RecommendationResult {
  analysis: RecommendationAnalysis;
  topProviders: RecommendedProviderMatch[];
}
