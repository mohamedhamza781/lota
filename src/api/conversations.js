import { apiClient } from "./client";

// establishmentId بينبعت كـ query param بس لما يكون المستخدم super_admin
export const conversationsApi = {
  list: (establishmentId, search) => apiClient.get("/conversations", { establishmentId, search }),
  get: (waId, establishmentId) => apiClient.get(`/conversations/${encodeURIComponent(waId)}`, { establishmentId }),
  remove: (waId, establishmentId) =>
    apiClient.delete(`/conversations/${encodeURIComponent(waId)}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};