import { apiClient } from "./client";

export const establishmentsApi = {
  list: () => apiClient.get("/establishments"),
  get: (id) => apiClient.get(`/establishments/${id}`),
  create: (payload) => apiClient.post("/establishments", payload),
  update: (id, patch) => apiClient.patch(`/establishments/${id}`, patch),
};
