import { httpRequest } from "@/api/http-client";

import type { BackendOrder } from "./mapper";

export interface OrderWriteInput {
  service?: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  urgency: "low" | "medium" | "high";
  preferred_time?: string;
}

export async function listOrders() {
  return httpRequest<{ orders: BackendOrder[] }>("/orders/", {
    method: "GET",
  });
}

export async function listMyOrders() {
  return httpRequest<{ orders: BackendOrder[] }>("/orders/me/", {
    method: "GET",
  });
}

export async function getOrder(orderId: string | number) {
  return httpRequest<{ order: BackendOrder }>(`/orders/${orderId}/`, {
    method: "GET",
  });
}

export async function createOrder(input: OrderWriteInput) {
  return httpRequest<{ order: BackendOrder }>("/orders/", {
    method: "POST",
    body: input,
  });
}

export async function updateOrder(orderId: string | number, input: Partial<OrderWriteInput>) {
  return httpRequest<{ order: BackendOrder }>(`/orders/${orderId}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function transitionOrder(orderId: string | number, status: string, note?: string) {
  return httpRequest<{ order: BackendOrder }>(`/orders/${orderId}/transition/`, {
    method: "POST",
    body: { status, note },
  });
}

export async function cancelOrder(orderId: string | number, note?: string) {
  return httpRequest<{ order: BackendOrder }>(`/orders/${orderId}/cancel/`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function completeOrder(orderId: string | number, note?: string) {
  return httpRequest<{ order: BackendOrder }>(`/orders/${orderId}/complete/`, {
    method: "POST",
    body: note ? { note } : {},
  });
}