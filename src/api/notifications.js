import { apiClient } from "./client";

// establishmentId بيتبعت query param بس لما يكون المستخدم super_admin
// (establishment_admin أصلاً محدّد بمنشأته من التوكن نفسه)
export const notificationsApi = {
  list: (establishmentId, unreadOnly = false) =>
    apiClient.get("/notifications", { establishmentId, unreadOnly: unreadOnly ? "true" : undefined }),
  markRead: (id, establishmentId) =>
    apiClient.patch(`/notifications/${id}/read${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, {}),
  markAllRead: (establishmentId) =>
    apiClient.patch(`/notifications/read-all${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, {}),
};