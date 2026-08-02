import { apiClient } from "./client";

// رقم التواصل اليدوي - منفصل تماماً عن بوت الولاء (whatsappBot.js). كل
// منشأة برقمها الخاص، ومتاح لصاحب المنشأة نفسه (مش سوبر أدمن بس).
// establishmentId بيتبعت كـquery param عشان resolveTenant يعرف يحدد
// المنشأة الصحيحة لما سوبر أدمن يكون هو يلي فاتح الصفحة (establishment_admin
// أصلاً establishmentId تبعه محفوظ بالتوكن، ما بيحتاجه، بس ما بيضر نبعته دايماً)
export const manualWhatsappApi = {
  status: (establishmentId) => apiClient.get(`/manual-whatsapp/status?establishmentId=${establishmentId}`),
  connect: (establishmentId) => apiClient.post("/manual-whatsapp/connect", { establishmentId }),
  disconnect: (establishmentId) => apiClient.post("/manual-whatsapp/disconnect", { establishmentId }),
};