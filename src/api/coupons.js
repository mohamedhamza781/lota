import { apiClient } from "./client";

export const couponsApi = {
  list: (establishmentId, customerId) => apiClient.get("/coupons", { establishmentId, customerId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/coupons${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/coupons/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/coupons/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
  // لمحة كل العملاء: نقاطهم + كوبوناتهم الشخصية الحالية
  customersOverview: (establishmentId) => apiClient.get("/coupons/customers-overview", { establishmentId }),
};