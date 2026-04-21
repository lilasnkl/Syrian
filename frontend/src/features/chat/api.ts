import { httpRequest } from "@/api/http-client";

import type { BackendConversation, BackendMessage } from "./mapper";

export async function listConversations() {
  return httpRequest<{ conversations: BackendConversation[] }>("/chat/conversations/", {
    method: "GET",
  });
}

export async function createConversation(input: { participant_ids: number[]; order_id?: number }) {
  return httpRequest<{ conversation: BackendConversation }>("/chat/conversations/", {
    method: "POST",
    body: input,
  });
}

export async function listConversationMessages(conversationId: string | number) {
  return httpRequest<{ messages: BackendMessage[] }>(`/chat/conversations/${conversationId}/messages/`, {
    method: "GET",
  });
}

export async function sendConversationMessage(conversationId: string | number, input: { text: string }) {
  return httpRequest<{ message: BackendMessage }>(`/chat/conversations/${conversationId}/messages/`, {
    method: "POST",
    body: input,
  });
}
