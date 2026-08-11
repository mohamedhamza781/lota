import { apiClient } from "./client";

export const pointsRuleApi = {
  get: (establishmentId) => apiClient.get("/points-rule", { establishmentId }),
  update: (patch, establishmentId) =>
    apiClient.patch(`/points-rule${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  // كل عملاء المنشأة + رصيد نقاطهم + هل مؤهلين حالياً لهدية النسبة المئوية
  customers: (establishmentId) => apiClient.get("/points-rule/customers", { establishmentId }),
  // إرسال هدية النسبة المئوية يدوياً الآن - target: "eligible" | "selected"
  sendPercentageGift: (payload, establishmentId) =>
    apiClient.post(
      `/points-rule/send-percentage-gift${establishmentId ? `?establishmentId=${establishmentId}` : ""}`,
      payload
    ),
};