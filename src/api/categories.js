import { apiClient } from "./client";

export const categoriesApi = {
  list: (establishmentId) => apiClient.get("/categories", { establishmentId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/categories${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/categories/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/categories/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};
