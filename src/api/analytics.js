import { apiClient } from "./client";

export const analyticsApi = {
  overview: (establishmentId) => apiClient.get("/analytics/overview", { establishmentId }),
  customerBehavior: (customerId, establishmentId) =>
    apiClient.get(`/analytics/customers/${customerId}`, { establishmentId }),
  dashboardKpis: (establishmentId) => apiClient.get("/analytics/dashboard-kpis", { establishmentId }),
  trend: (establishmentId, granularity = "day", periods) =>
    apiClient.get("/analytics/trend", { establishmentId, granularity, periods }),
  botEngagement: (establishmentId, days = 30) => apiClient.get("/analytics/bot-engagement", { establishmentId, days }),
  restaurantRating: (establishmentId) => apiClient.get("/analytics/restaurant-rating", { establishmentId }),
  rfmAnalysis: (establishmentId) => apiClient.get("/analytics/rfm", { establishmentId }),
  visitQuality: (establishmentId, days = 30) => apiClient.get("/analytics/visit-quality", { establishmentId, days }),
  pointsBreakdown: (establishmentId) => apiClient.get("/analytics/points-breakdown", { establishmentId }),
};