import { apiClient } from "./client";

export const orderEntriesApi = {
  list: (establishmentId, customerId) => apiClient.get("/order-entries", { establishmentId, customerId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/order-entries${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  remove: (id, establishmentId) =>
    apiClient.delete(`/order-entries/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};