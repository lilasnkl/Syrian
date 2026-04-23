import type {
  Provider,
  Service,
  ServiceCategory,
  VerificationRequest,
} from "@/types";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=400&fit=crop";

const ALLOWED_CATEGORIES: ServiceCategory[] = [
  "plumbing",
  "electrical",
  "cleaning",
  "painting",
  "landscaping",
  "moving",
  "carpentry",
  "hvac",
];

export interface BackendProviderProfile {
  id: number;
  user_id: number;
  display_name: string;
  bio: string;
  category: string;
  location: string;
  hourly_rate: string | number;
  years_experience: number;
  is_verified: boolean;
  skills: string[];
  availability: string;
  response_time: string;
  rating: string | number;
  review_count: number;
  completed_jobs: number;
  created_at: string;
  updated_at: string;
}

export interface BackendVerificationRequest {
  id: number;
  provider_id: number;
  provider_name: string;
  provider_category: string;
  documents: string[];
  files: Array<{ name: string; type: string; size: number; url?: string }>;
  description: string;
  years_experience?: number | null;
  service_areas?: string[];
  status: "pending" | "approved" | "rejected" | "revoked";
  rejection_reason: string;
  submitted_at: string;
  reviewed_at: string | null;
}

function normalizeCategory(category: string): ServiceCategory {
  if (ALLOWED_CATEGORIES.includes(category as ServiceCategory)) {
    return category as ServiceCategory;
  }
  return "cleaning";
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapProviderProfile(
  provider: BackendProviderProfile,
  services: Service[] = [],
  overrides?: Partial<Provider>
): Provider {
  const id = String(provider.id);

  return {
    id,
    userId: String(provider.user_id),
    name: provider.display_name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`provider-${id}`)}`,
    coverImage: DEFAULT_COVER_IMAGE,
    bio: provider.bio || "",
    category: normalizeCategory(provider.category),
    location: provider.location || "",
    rating: toNumber(provider.rating),
    reviewCount: provider.review_count,
    completedJobs: provider.completed_jobs,
    yearsExperience: provider.years_experience,
    hourlyRate: toNumber(provider.hourly_rate),
    verified: provider.is_verified,
    skills: provider.skills ?? [],
    portfolio: [],
    services,
    availability: provider.availability || "",
    responseTime: provider.response_time || "",
    ...overrides,
  };
}

export function mapVerificationRequest(request: BackendVerificationRequest, provider?: Provider): VerificationRequest {
  return {
    id: String(request.id),
    providerId: String(request.provider_id),
    providerName: request.provider_name,
    providerAvatar:
      provider?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`provider-${request.provider_id}`)}`,
    category: provider?.category || normalizeCategory(request.provider_category),
    documents: request.documents ?? [],
    files: (request.files ?? []).map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
    })),
    description: request.description || undefined,
    status: request.status,
    submittedAt: request.submitted_at.split("T")[0] ?? request.submitted_at,
    reviewedAt: request.reviewed_at ? request.reviewed_at.split("T")[0] : undefined,
    rejectionReason: request.rejection_reason || undefined,
    yearsExperience: request.years_experience ?? undefined,
    serviceAreas: request.service_areas ?? undefined,
  };
}
