// طبقة الاتصال الأساسية بالباك إند الحقيقي (Express + MongoDB).
// كل نداءات الـ API بالتطبيق بتمر من هون: بتضيف رابط الباك إند، وتوكن
// الـ JWT (إذا موجود بالـ localStorage)، وبتفكّ شكل الرد الموحّد
// { success, message, data } يلي بيرجعه الباك إند (شوف utils/ApiResponse.js).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
// أصل الباك إند بدون بادئة /api — الصور المرفوعة (uploads) بتنقرأ من هون مباشرة
export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");
const TOKEN_KEY = "lotality_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// بيتنادى لما نستقبل 401 من الباك إند (توكن منتهي/غير صالح)، عشان نرجّع
// المستخدم لصفحة تسجيل الدخول من غير ما كل صفحة تتعامل معها لحالها.
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

class ApiClientError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, params, signal } = {}) {
  let url = `${BASE_URL}${path}`;

  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    throw new ApiClientError(
      "تعذّر الوصول للسيرفر — تأكد إنه الباك إند شغال وإنه رابط VITE_API_URL صحيح",
      0,
      err
    );
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // رد بدون body (نادراً)
  }

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiClientError(payload?.message || `فشل الطلب (${res.status})`, res.status, payload?.data);
  }

  return payload?.data;
}

export const apiClient = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export { ApiClientError };
