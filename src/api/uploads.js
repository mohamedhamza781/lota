import { getToken, API_ORIGIN } from "./client";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// بيرفع صورة صنف للباك إند وبيرجع { url } (مسار نسبي). بنستخدم fetch مباشرة
// هون (مش apiClient) لأنه لازم نبعت FormData مش JSON.
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const token = getToken();
  const res = await fetch(`${BASE_URL}/uploads/image`, {
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
    throw new Error(payload?.message || "تعذّر رفع الصورة");
  }

  return payload.data; // { url }
}

// بيحوّل مسار نسبي زي "/uploads/products/xxx.jpg" لرابط كامل يقدر المتصفح
// يحمّله. إذا الرابط أصلاً كامل (http/https) بيرجعه زي ما هو.
export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}
