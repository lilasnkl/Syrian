import { httpRequest } from "@/api/http-client";

export interface BackendAssistantCitation {
  id: number;
  source_id: number;
  source_title: string;
  chunk_id: number;
  quote: string;
  relevance_score: number;
  rank: number;
  page_number: number | null;
  row_number: number | null;
}

export interface BackendAssistantTurn {
  id: number;
  session_id: number;
  question: string;
  answer: string;
  answer_status: "answered" | "insufficient_evidence" | "blocked_by_policy" | "error";
  customer_next_step: string;
  model: string;
  embedding_model: string;
  prompt_version: string;
  citations: BackendAssistantCitation[];
  created_at: string;
}

export async function askProviderQuestion(input: {
  provider_id: number;
  service_id?: number | null;
  order_id?: number | null;
  session_id?: number | null;
  question: string;
}) {
  return httpRequest<{ turn: BackendAssistantTurn }>("/customer-assistant/questions/", {
    method: "POST",
    body: input,
  });
}

export async function listAssistantSessionTurns(sessionId: string | number) {
  return httpRequest<{ turns: BackendAssistantTurn[] }>(`/customer-assistant/sessions/${sessionId}/turns/`, {
    method: "GET",
  });
}
