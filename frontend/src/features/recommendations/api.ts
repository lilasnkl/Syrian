import { API_BASE_URL } from "@/api/endpoints";
import { httpRequest } from "@/api/http-client";

import type { BackendRecommendationResult } from "./mapper";

function detectRecommendationLanguage(problemDescription: string): "en" | "ar" {
  return /[\u0600-\u06FF]/.test(problemDescription) ? "ar" : "en";
}

export async function recommendProviders(input: {
  problem_description: string;
  language?: "en" | "ar";
  user_lat?: number | null;
  user_lng?: number | null;
  budget?: number | null;
}) {
  const apiBaseUrl = new URL(
    API_BASE_URL,
    typeof window !== "undefined" ? window.location.origin : "http://localhost:8000"
  );
  const recommendationUrl = new URL("/recommend-providers/", apiBaseUrl).toString();

  return httpRequest<BackendRecommendationResult>(recommendationUrl, {
    method: "POST",
    body: {
      problem_description: input.problem_description,
      language: input.language ?? detectRecommendationLanguage(input.problem_description),
      user_lat: input.user_lat ?? null,
      user_lng: input.user_lng ?? null,
      budget: input.budget ?? null,
    },
    rawResponse: true,
  });
}
