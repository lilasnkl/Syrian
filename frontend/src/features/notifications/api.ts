import { httpRequest } from "@/api/http-client";

import type { BackendNotification } from "./mapper";

export async function listNotifications() {
  return httpRequest<{ notifications: BackendNotification[] }>("/notifications/", {
    method: "GET",
  });
}

export async function markNotificationRead(notificationId: string | number) {
  return httpRequest<{ notification: BackendNotification }>(`/notifications/${notificationId}/read/`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead() {
  return httpRequest<null>("/notifications/read-all/", {
    method: "POST",
  });
}
