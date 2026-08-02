import { apiClient } from "./client";

export const mealPhotosApi = {
  list: (establishmentId) => apiClient.get("/meal-photos", { establishmentId }),
};