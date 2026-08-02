import { apiClient } from "./client";

export const productsApi = {
  list: (establishmentId, categoryId) => apiClient.get("/products", { establishmentId, categoryId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/products${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/products/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/products/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};
