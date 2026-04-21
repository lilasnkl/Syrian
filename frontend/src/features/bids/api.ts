import { httpRequest } from "@/api/http-client";

import type { BackendBid } from "./mapper";

interface BidWriteInput {
  amount: number;
  message?: string;
  estimated_duration: string;
}

export async function listBids() {
  return httpRequest<{ bids: BackendBid[] }>("/bids/", {
    method: "GET",
  });
}

export async function getBid(bidId: string | number) {
  return httpRequest<{ bid: BackendBid }>(`/bids/${bidId}/`, {
    method: "GET",
  });
}

export async function createBid(orderId: string | number, input: BidWriteInput) {
  return httpRequest<{ bid: BackendBid }>(`/orders/${orderId}/bids/`, {
    method: "POST",
    body: input,
  });
}

export async function updateBid(bidId: string | number, input: Partial<BidWriteInput>) {
  return httpRequest<{ bid: BackendBid }>(`/bids/${bidId}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function acceptBid(bidId: string | number) {
  return httpRequest<{ bid: BackendBid }>(`/bids/${bidId}/accept/`, {
    method: "POST",
  });
}

export async function rejectBid(bidId: string | number) {
  return httpRequest<{ bid: BackendBid }>(`/bids/${bidId}/reject/`, {
    method: "POST",
  });
}

export async function withdrawBid(bidId: string | number) {
  return httpRequest<{ bid: BackendBid }>(`/bids/${bidId}/withdraw/`, {
    method: "POST",
  });
}