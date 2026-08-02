import { apiClient } from "./client";

export const referralsApi = {
  listCelebrity: (establishmentId) => apiClient.get("/referrals/celebrity", { establishmentId }),
  createCelebrity: (label, establishmentId) =>
    apiClient.post(`/referrals/celebrity${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, { label }),
  toggleCelebrity: (id, establishmentId) =>
    apiClient.patch(`/referrals/celebrity/${id}/toggle${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, {}),
  customerCode: (customerId, establishmentId) => apiClient.get(`/referrals/customer/${customerId}`, { establishmentId }),
};