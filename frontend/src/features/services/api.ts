import { httpRequest } from "@/api/http-client";

import type { BackendServiceListing } from "./mapper";

interface ServiceWriteInput {
  title: string;
  description: string;
  category: string;
  price: number;
  price_type: "fixed" | "hourly" | "starting_at";
  duration?: string;
  is_active?: boolean;
}

export async function listServices(params?: {
  category?: string;
  provider_id?: string | number;
}) {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set("category", params.category);
  }
  if (params?.provider_id) {
    query.set("provider_id", String(params.provider_id));
  }

  const suffix = query.toString();
  return httpRequest<{ services: BackendServiceListing[] }>(`/services/${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
}

export async function getService(serviceId: string | number) {
  return httpRequest<{ service: BackendServiceListing }>(`/services/${serviceId}/`, {
    method: "GET",
  });
}

export async function listMyServices() {
  return httpRequest<{ services: BackendServiceListing[] }>("/services/me/", {
    method: "GET",
  });
}

export async function createService(input: ServiceWriteInput) {
  return httpRequest<{ service: BackendServiceListing }>("/services/me/", {
    method: "POST",
    body: input,
  });
}

export async function updateService(serviceId: string | number, input: Partial<ServiceWriteInput>) {
  return httpRequest<{ service: BackendServiceListing }>(`/services/${serviceId}/`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteService(serviceId: string | number) {
  return httpRequest<null>(`/services/${serviceId}/`, {
    method: "DELETE",
  });
}