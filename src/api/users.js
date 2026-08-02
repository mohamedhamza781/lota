import { apiClient } from "./client";

export const usersApi = {
  list: () => apiClient.get("/users"),
  create: (payload) => apiClient.post("/users", payload),
  update: (id, patch) => apiClient.patch(`/users/${id}`, patch),
  remove: (id) => apiClient.delete(`/users/${id}`),
  toggleStatus: (id) => apiClient.patch(`/users/${id}/toggle-status`),
};
