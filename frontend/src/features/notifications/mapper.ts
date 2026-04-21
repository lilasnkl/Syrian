import type { Notification } from "@/types";

export interface BackendNotification {
  id: number;
  type: "bid" | "order" | "message" | "review" | "complaint" | "verification" | "system";
  title: string;
  description: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export function mapNotification(notification: BackendNotification, userId: string): Notification {
  return {
    id: String(notification.id),
    userId,
    type: notification.type,
    title: notification.title,
    description: notification.description || "",
    read: notification.is_read,
    createdAt: notification.created_at,
    link: notification.link || undefined,
  };
}
