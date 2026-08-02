import { apiClient } from "./client";

export const superAdminApi = {
  allCustomers: (params) => apiClient.get("/super-admin/customers", params),
  establishmentsSummary: () => apiClient.get("/super-admin/establishments/summary"),
  platformAnalytics: () => apiClient.get("/super-admin/platform-analytics"),
  platformTrend: (days = 14) => apiClient.get("/super-admin/platform-trend", { days }),
};