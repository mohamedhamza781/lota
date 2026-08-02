import { apiClient } from "./client";

export const pointsRuleApi = {
  get: (establishmentId) => apiClient.get("/points-rule", { establishmentId }),
  update: (patch, establishmentId) =>
    apiClient.patch(`/points-rule${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
};
