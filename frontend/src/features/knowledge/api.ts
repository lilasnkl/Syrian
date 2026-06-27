import { httpRequest } from "@/api/http-client";

export type KnowledgeVisibility =
  | "public_marketplace"
  | "customer_after_contact"
  | "customer_after_order"
  | "provider_private"
  | "admin_only";

export type KnowledgeSourceStatus = "draft" | "pending_processing" | "active" | "archived" | "failed" | "rejected";

export interface BackendKnowledgeSource {
  id: number;
  provider_id: number;
  provider_name: string;
  source_type: string;
  title: string;
  description: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  visibility: KnowledgeVisibility;
  status: KnowledgeSourceStatus;
  language: string;
  source_version: number;
  last_indexed_at: string | null;
  error_code: string;
  error_detail: string;
  latest_job_status: string;
  created_at: string;
  updated_at: string;
}

export interface BackendKnowledgeIngestionJob {
  id: number;
  source_id: number;
  job_type: string;
  status: string;
  attempt_count: number;
  started_at: string | null;
  finished_at: string | null;
  error_code: string;
  error_detail: string;
  created_at: string;
}

export async function listKnowledgeSources(params?: { status?: string }) {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set("status", params.status);
  }
  const suffix = query.toString();
  return httpRequest<{ sources: BackendKnowledgeSource[] }>(`/knowledge/sources/${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
}

export async function uploadKnowledgeSource(input: {
  title: string;
  description?: string;
  visibility: KnowledgeVisibility;
  file: File;
  processNow?: boolean;
}) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("visibility", input.visibility);
  formData.append("file", input.file);
  formData.append("process_now", String(input.processNow ?? false));
  if (input.description) {
    formData.append("description", input.description);
  }

  return httpRequest<{ source: BackendKnowledgeSource }>("/knowledge/sources/", {
    method: "POST",
    body: formData,
  });
}

export async function archiveKnowledgeSource(sourceId: string | number) {
  return httpRequest<{ source: BackendKnowledgeSource }>(`/knowledge/sources/${sourceId}/archive/`, {
    method: "POST",
  });
}

export async function reindexKnowledgeSource(sourceId: string | number) {
  return httpRequest<{ job: BackendKnowledgeIngestionJob }>(`/knowledge/sources/${sourceId}/reindex/`, {
    method: "POST",
  });
}

