import { apiClient } from "./client";

export const feedbackApi = {
  list: (establishmentId) => apiClient.get("/feedback", { establishmentId }),
};
