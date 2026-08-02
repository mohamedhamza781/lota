import { apiClient } from "./client";

export const authApi = {
  login: (email, password) => apiClient.post("/auth/login", { email, password }),
  me: () => apiClient.get("/auth/me"),
};
