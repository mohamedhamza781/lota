import { apiClient } from "./client";

// establishmentId هون بيتبعت كـ query param بس لما يكون المستخدم super_admin
// (establishment_admin أصلاً محدّد بمنشأته من التوكن نفسه - شوف tenant.middleware).
export const customersApi = {
  list: (establishmentId) => apiClient.get("/customers", { establishmentId }),
  get: (id, establishmentId) => apiClient.get(`/customers/${id}`, { establishmentId }),
  // قائمة العملاء المعرّضين للفقد/المفقودين مع السبب المحتمل من آخر رأي عبر البوت
  atRisk: (establishmentId) => apiClient.get("/customers/at-risk", { establishmentId }),
  // عملاء بزيارات متكررة بشكل غير طبيعي بآخر أسبوع - مؤشر يستاهل مراجعة
  // يدوية (احتمال تحايل بمسح كود QR الثابت من غير مكان الفرع)
  frequentVisitAlerts: (establishmentId) => apiClient.get("/customers/frequent-visit-alerts", { establishmentId }),
  create: (payload, establishmentId) =>
    apiClient.post(`/customers${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, payload),
  update: (id, patch, establishmentId) =>
    apiClient.patch(`/customers/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, patch),
  remove: (id, establishmentId) =>
    apiClient.delete(`/customers/${id}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
  sendMessage: (id, message, establishmentId) =>
    apiClient.post(`/customers/${id}/message${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, {
      message,
    }),
  // نفس الفكرة بس بتوصل لتبويب "الرسائل" بشات الويب مباشرة (مش واتساب حقيقي) -
  // بتشتغل بس للعملاء يلي عندهم حساب شات ويب أصلاً
  sendWebChatMessage: (id, message, establishmentId) =>
    apiClient.post(`/customers/${id}/webchat-message${establishmentId ? `?establishmentId=${establishmentId}` : ""}`, {
      message,
    }),
};