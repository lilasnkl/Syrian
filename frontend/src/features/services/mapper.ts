import type { Service, ServiceCategory } from "@/types";

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

type PriceType = Service["priceType"];

function normalizeCategory(category: string): ServiceCategory {
  if (ALLOWED_CATEGORIES.includes(category as ServiceCategory)) {
    return category as ServiceCategory;
  }
  return "cleaning";
}

function normalizePriceType(priceType: string): PriceType {
  if (priceType === "fixed" || priceType === "hourly" || priceType === "starting_at") {
    return priceType;
  }
  return "fixed";
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface BackendServiceListing {
  id: number;
  provider_id: number;
  provider_name: string;
  title: string;
  description: string;
  category: string;
  price: string | number;
  price_type: string;
  duration: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function mapServiceListing(service: BackendServiceListing): Service {
  return {
    id: String(service.id),
    providerId: String(service.provider_id),
    title: service.title,
    description: service.description,
    price: toNumber(service.price),
    priceType: normalizePriceType(service.price_type),
    category: normalizeCategory(service.category),
    backendCategory: service.category,
    duration: service.duration || undefined,
  };
}
