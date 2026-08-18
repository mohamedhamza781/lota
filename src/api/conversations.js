import { apiClient, getToken } from "./client";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// بترسل رسالة يدوية (نص و/أو صورة) لعميل شات ويب من صفحة "المحادثات" -
// بنستخدم fetch مباشرة (مش apiClient) لأنه لازم نبعت FormData مش JSON
// لما في صورة مرفقة (نفس فكرة uploads.js)
async function sendMessage(waId, { text, image, establishmentId } = {}) {
  const formData = new FormData();
  if (text && text.trim()) formData.append("text", text.trim());
  if (image) formData.append("image", image);

  const qs = establishmentId ? `?establishmentId=${encodeURIComponent(establishmentId)}` : "";
  const token = getToken();
  const res = await fetch(`${BASE_URL}/conversations/${encodeURIComponent(waId)}/message${qs}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    throw new Error(payload?.message || "تعذّر إرسال الرسالة");
  }

  return payload?.data;
}

// بتفتح/تسكر صندوق الكتابة عند العميل يدوياً حتى لو محادثته أصلاً منتهية
// (زيارته خلصت) - عشان صاحب المنشأة يقدر يبعتله سؤال يدوي والعميل يقدر يرد عليه
function toggleChatOverride(waId, open, establishmentId) {
  const qs = establishmentId ? `?establishmentId=${encodeURIComponent(establishmentId)}` : "";
  return apiClient.post(`/conversations/${encodeURIComponent(waId)}/chat-override${qs}`, { open });
}

// 🆕 [مسح QR يدوي] بترجّع "زر امسح QR الآن" فوراً عند عميل معيّن (بدون ما
// تحسبله زيارة أو نقاط فوراً) - النقاط بتنحسب طبيعي بس لما هو فعلياً
// يمسح QR من جوا الشات بعدها. مفيدة لعميل ما قدر يمسح بنفسه (مثلاً فقد
// chatId المحلي بعد تغيير دومين/جهاز).
function manualVisit(waId, establishmentId) {
  const qs = establishmentId ? `?establishmentId=${encodeURIComponent(establishmentId)}` : "";
  return apiClient.post(`/conversations/${encodeURIComponent(waId)}/manual-visit${qs}`, {});
}

// establishmentId بينبعت كـ query param بس لما يكون المستخدم super_admin
export const conversationsApi = {
  list: (establishmentId, search) => apiClient.get("/conversations", { establishmentId, search }),
  get: (waId, establishmentId) => apiClient.get(`/conversations/${encodeURIComponent(waId)}`, { establishmentId }),
  sendMessage,
  toggleChatOverride,
  manualVisit,
  remove: (waId, establishmentId) =>
    apiClient.delete(`/conversations/${encodeURIComponent(waId)}${establishmentId ? `?establishmentId=${establishmentId}` : ""}`),
};