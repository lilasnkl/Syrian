import type { Conversation, Message } from "@/types";

export interface BackendConversationParticipant {
  id: number;
  role: string;
  name: string;
  avatar_url: string;
}

export interface BackendConversation {
  id: number;
  order: number | null;
  participant_ids: number[];
  participants: BackendConversationParticipant[];
  last_message: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface BackendMessage {
  id: number;
  conversation: number;
  sender_id: number;
  text: string;
  created_at: string;
}

function fallbackAvatar(participant: BackendConversationParticipant): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`chat-${participant.id}-${participant.name}`)}`;
}

export function mapConversation(conversation: BackendConversation): Conversation {
  return {
    id: String(conversation.id),
    participants: conversation.participants.map((participant) => ({
      id: String(participant.id),
      name: participant.name,
      avatar: participant.avatar_url || fallbackAvatar(participant),
    })),
    lastMessage: conversation.last_message || "",
    lastMessageAt: conversation.last_message_at || conversation.updated_at,
    unreadCount: conversation.unread_count ?? 0,
  };
}

export function mapMessage(message: BackendMessage): Message {
  return {
    id: String(message.id),
    conversationId: String(message.conversation),
    senderId: String(message.sender_id),
    text: message.text,
    createdAt: message.created_at,
  };
}
