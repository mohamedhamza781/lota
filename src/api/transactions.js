import { apiClient } from "./client";

export const transactionsApi = {
  list: (establishmentId, customerId) => apiClient.get("/transactions", { establishmentId, customerId }),
  recordPurchase: (payload, establishmentId) =>
    apiClient.post(`/transactions/purchase${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  redeemReward: (payload, establishmentId) =>
    apiClient.post(`/transactions/redeem${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  redeemForDiscount: (payload, establishmentId) =>
    apiClient.post(`/transactions/redeem-discount${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
};