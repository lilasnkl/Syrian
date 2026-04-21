import type { RequestStatus, ServiceCategory, ServiceRequest } from "@/types";

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

const ALLOWED_REQUEST_STATUS: RequestStatus[] = [
  "open",
  "awarded",
  "in_progress",
  "completed",
  "cancelled",
];

function normalizeCategory(category: string): ServiceCategory {
  if (ALLOWED_CATEGORIES.includes(category as ServiceCategory)) {
    return category as ServiceCategory;
  }
  return "cleaning";
}

function normalizeStatus(status: string): RequestStatus {
  if (ALLOWED_REQUEST_STATUS.includes(status as RequestStatus)) {
    return status as RequestStatus;
  }
  return "open";
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface BackendOrder {
  id: number;
  customer_id: number;
  customer_name: string;
  service: number | null;
  title: string;
  description: string;
  category: string;
  budget: string | number;
  location: string;
  urgency: "low" | "medium" | "high";
  preferred_time: string;
  status: string;
  awarded_provider_id: number | null;
  bids_count: number;
  created_at: string;
  updated_at: string;
}

export function mapOrderToRequest(order: BackendOrder): ServiceRequest {
  return {
    id: String(order.id),
    clientId: String(order.customer_id),
    clientName: order.customer_name || `Customer #${order.customer_id}`,
    title: order.title,
    description: order.description,
    category: normalizeCategory(order.category),
    budget: toNumber(order.budget),
    location: order.location,
    status: normalizeStatus(order.status),
    urgency: order.urgency,
    createdAt: order.created_at.split("T")[0] ?? order.created_at,
    bidsCount: order.bids_count ?? 0,
    serviceId: order.service ? String(order.service) : undefined,
    preferredTime: order.preferred_time || undefined,
  };
}