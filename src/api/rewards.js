import { apiClient } from "./client";

export const rewardsApi = {
  list: (establishmentId) => apiClient.get("/rewards", { establishmentId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/rewards${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/rewards/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/rewards/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};
