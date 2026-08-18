import { API_ORIGIN } from "./client";

// بيانات خفيفة لصفحة الترحيب (قبل ما نفتح أي اتصال socket.io) - الاسم،
// الشعار، ونص "نبذة عنا". chatId اختياري - بيتبعت لو موجود عند العميل من
// زيارة سابقة (محفوظ محلياً)، عشان نص العروض (promoText) يظهر صح لو صاحب
// المنشأة حدده لعملاء معيّنين بس (شوف getInfo بالباك إند)
export async function fetchWebChatInfo(slug, chatId) {
  const url = chatId
    ? `${API_ORIGIN}/api/web-chat/${slug}/info?chatId=${encodeURIComponent(chatId)}`
    : `${API_ORIGIN}/api/web-chat/${slug}/info`;
  const res = await fetch(url);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    throw new Error(payload?.message || "تعذّر تحميل بيانات المنشأة");
  }

  return payload?.data;
}

// رفع صورة الوجبة من شات الويب - REST عادي (مش عبر socket.io) لأنه أبسط
// وأوثق لملفات ثنائية. بعد الرفع، الباك إند بيمرر الصورة لنفس منطق
// الرحلة (whatsapp.service.js) وبيرد عبر الـsocket نفسه.
export async function uploadWebChatMealPhoto({ slug, file, chatId, tableNumber }) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("chatId", chatId);
  if (tableNumber) formData.append("tableNumber", tableNumber);

  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/photo`, {
    method: "POST",
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

  return payload?.data;
}

// رفع صورة البروفايل من تبويب "حسابي"
export async function uploadWebChatAvatar({ slug, file, chatId }) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("chatId", chatId);

  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/avatar`, {
    method: "POST",
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

  return payload?.data;
}

// استرجاع حساب عميل موجود مسبقاً بالنظام اعتماداً على رقم هاتفه - بنستخدمها
// لما العميل يفتح شات الويب من دومين/جهاز/متصفح جديد (أو مسح بيانات
// المتصفح) وبالتالي ما عندنا chatId محفوظ محلياً، بس هو أصلاً مسجّل
// بالنظام من قبل (بنفس رقم الهاتف) - عشان نربطه برجعة بحسابه القديم
// (نقاطه، كوبوناته، وسجل محادثته) بدل ما ننشئله حساب جديد من الصفر
export async function recoverWebChatAccount({ slug, phone }) {
  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/recover?phone=${encodeURIComponent(phone)}`);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    throw new Error(payload?.message || "تعذّر التحقق من الحساب");
  }

  return payload?.data;
}

// إشعارات Push - المفتاح العام + الاشتراك
export async function fetchVapidPublicKey() {
  const res = await fetch(`${API_ORIGIN}/api/web-chat/push/vapid-public-key`);
  const payload = await res.json().catch(() => null);
  return payload?.data?.publicKey || null;
}

export async function subscribeToPush({ slug, chatId, subscription }) {
  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/push-subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, subscription }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.message || "تعذّر تفعيل الإشعارات");
  }
}

// بيانات تبويب "حسابي" - الاسم، الرقم، النقاط، صور الوجبات المرفوعة،
// والكوبونات (الشخصية + العامة النشطة)
export async function fetchWebChatAccount({ slug, chatId }) {
  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/account?chatId=${encodeURIComponent(chatId)}`);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    throw new Error(payload?.message || "تعذّر تحميل بيانات الحساب");
  }

  return payload?.data;
}

// رمز QR الخاص بشات الويب لهاي المنشأة - العميل لازم يمسحه فعلياً بالمطعم
// عشان أي زيارة (أولى أو متكررة) تنحسب بالنظام - شوف getQrCode
// بـwebChat.controller.js والتعليق فوق isValidQrVisit بـwhatsapp.service.js
export async function fetchWebChatQrCode(slug) {
  const res = await fetch(`${API_ORIGIN}/api/web-chat/${slug}/qr-code`);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    throw new Error(payload?.message || "تعذّر توليد رمز QR");
  }

  return payload?.data;
}