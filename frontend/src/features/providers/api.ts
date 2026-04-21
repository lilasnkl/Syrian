import { API_BASE_URL } from "@/api/endpoints";
import { httpRequest } from "@/api/http-client";

import type {
  BackendProviderProfile,
  BackendProviderRecommendationResult,
  BackendVerificationRequest,
} from "./mapper";

function detectRecommendationLanguage(problemDescription: string): "en" | "ar" {
  return /[\u0600-\u06FF]/.test(problemDescription) ? "ar" : "en";
}

export async function listProviders(params?: {
  category?: string;
  minRating?: number;
  verified?: boolean;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set("category", params.category);
  }
  if (typeof params?.minRating === "number") {
    query.set("min_rating", String(params.minRating));
  }
  if (params?.search) {
    query.set("search", params.search);
  }
  if (typeof params?.verified === "boolean") {
    query.set("verified", String(params.verified));
  }

  const suffix = query.toString();
  return httpRequest<{ providers: BackendProviderProfile[] }>(`/providers/${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
}

export async function getProvider(providerId: string | number) {
  return httpRequest<{ provider: BackendProviderProfile }>(`/providers/${providerId}/`, {
    method: "GET",
  });
}

export async function getMyProvider() {
  return httpRequest<{ provider: BackendProviderProfile }>("/providers/me/", {
    method: "GET",
  });
}

export async function getMyProviderEarnings() {
  return httpRequest<{
    earnings: {
      stats: {
        total_earnings: number;
        this_month: number;
        avg_per_job: number;
      };
      monthly_earnings: Array<{
        month: string;
        earnings: number;
      }>;
      transactions: Array<{
        id: number;
        job: string;
        amount: number;
        date: string;
        status: string;
      }>;
    };
  }>("/providers/me/earnings/", {
    method: "GET",
  });
}

export async function updateMyProvider(input: {
  display_name?: string;
  bio?: string;
  category?: string;
  location?: string;
  hourly_rate?: number;
  years_experience?: number;
  skills?: string[];
  availability?: string;
  response_time?: string;
}) {
  return httpRequest<{ provider: BackendProviderProfile }>("/providers/me/", {
    method: "PATCH",
    body: input,
  });
}

export async function submitVerification(input: {
  documents: string[];
  description?: string;
  files?: File[];
  years_experience?: number;
  service_areas?: string[];
}) {
  const formData = new FormData();
  input.documents.forEach((document) => formData.append("documents", document));
  input.files?.forEach((file) => formData.append("files", file));
  input.service_areas?.forEach((area) => formData.append("service_areas", area));
  if (input.description) {
    formData.append("description", input.description);
  }
  if (typeof input.years_experience === "number") {
    formData.append("years_experience", String(input.years_experience));
  }

  return httpRequest<{ verification: BackendVerificationRequest }>("/providers/me/verification/", {
    method: "POST",
    body: formData,
  });
}

export async function listVerificationRequests() {
  return httpRequest<{ verifications: BackendVerificationRequest[] }>("/providers/verification/", {
    method: "GET",
  });
}

export async function reviewVerification(verificationId: string | number, input: { approve: boolean; rejection_reason?: string }) {
  return httpRequest<{ verification: BackendVerificationRequest }>(`/providers/verification/${verificationId}/review/`, {
    method: "POST",
    body: input,
  });
}

export async function revokeVerification(verificationId: string | number) {
  return httpRequest<{ verification: BackendVerificationRequest }>(`/providers/verification/${verificationId}/revoke/`, {
    method: "POST",
  });
}

export async function revokeProviderVerification(providerId: string | number) {
  return httpRequest<{ verification: BackendVerificationRequest }>(`/providers/${providerId}/verification/revoke/`, {
    method: "POST",
  });
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

  return httpRequest<BackendProviderRecommendationResult>(recommendationUrl, {
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
