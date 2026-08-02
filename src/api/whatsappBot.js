import { apiClient } from "./client";

export const whatsappBotApi = {
  // سوبر أدمن بس: حالة الاتصال المشترك (متصل / مستني مسح QR / غير مفعّل)
  status: () => apiClient.get("/whatsapp-bot/status"),
  logout: () => apiClient.post("/whatsapp-bot/logout"),
  // رابط + QR الانضمام الخاص بمنشأة معينة
  joinInfo: (establishmentId) => apiClient.get(`/whatsapp-bot/join/${establishmentId}`),

  // وضع المنصة (مشترك ↔ لكل منشأة رقمها) - سوبر أدمن بس
  getMode: () => apiClient.get("/whatsapp-bot/mode"),
  setMode: (mode) => apiClient.post("/whatsapp-bot/mode", { mode }),

  // إدارة اتصال كل منشأة على حدا - سوبر أدمن بس
  listEstablishmentConnections: () => apiClient.get("/whatsapp-bot/establishments"),
  connectEstablishment: (id) => apiClient.post(`/whatsapp-bot/establishments/${id}/connect`),
  disconnectEstablishment: (id) => apiClient.post(`/whatsapp-bot/establishments/${id}/disconnect`),
};