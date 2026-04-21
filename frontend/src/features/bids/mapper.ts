import type { Bid, BidStatus } from "@/types";

const ALLOWED_STATUS: BidStatus[] = [
  "pending",
  "accepted",
  "declined",
  "rejected",
  "withdrawn",
  "expired",
];

function normalizeStatus(status: string): BidStatus {
  if (ALLOWED_STATUS.includes(status as BidStatus)) {
    return status as BidStatus;
  }

  return "pending";
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface BackendBid {
  id: number;
  order_id: number;
  order_title: string;
  provider_id: number;
  provider_name: string;
  provider_rating: string | number;
  amount: string | number;
  message: string;
  estimated_duration: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function mapBidToFrontend(bid: BackendBid): Bid {
  return {
    id: String(bid.id),
    requestId: String(bid.order_id),
    requestTitle: bid.order_title,
    providerId: String(bid.provider_id),
    providerName: bid.provider_name,
    providerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`provider-${bid.provider_id}`)}`,
    providerRating: toNumber(bid.provider_rating),
    amount: toNumber(bid.amount),
    message: bid.message || "",
    estimatedDuration: bid.estimated_duration,
    status: normalizeStatus(bid.status),
    createdAt: bid.created_at.split("T")[0] ?? bid.created_at,
  };
}