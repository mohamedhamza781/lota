import { apiClient } from "./client";

export const branchesApi = {
  list: (establishmentId) => apiClient.get("/branches", { establishmentId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/branches${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/branches/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/branches/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};