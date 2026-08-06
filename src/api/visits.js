import { apiClient } from "./client";

// establishmentId بينبعت كـ query param بس لما يكون المستخدم super_admin
export const visitsApi = {
  list: (establishmentId, filters = {}) =>
    apiClient.get("/visits", { establishmentId, ...filters }),
};