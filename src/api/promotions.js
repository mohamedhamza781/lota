import { apiClient } from "./client";

export const promotionsApi = {
  list: (establishmentId) => apiClient.get("/promotions", { establishmentId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/promotions${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/promotions/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/promotions/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};