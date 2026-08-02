// Service Worker لشات الويب - مسؤول عن شيئين بس:
// ١) استقبال إشعارات Push وعرضها (حتى لو التاب مسكّر تماماً)
// ٢) تخزين بسيط (cache) لملفات التطبيق الأساسية عشان الموقع يشتغل (أو
//    الأقل يفتح) حتى لو النت انقطع لحظياً - شرط أساسي لتصنيف PWA "قابل
//    للتثبيت"

const CACHE_NAME = "lotality-webchat-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// استراتيجية "الشبكة أولاً، الكاش كبديل" - مهم جداً لتطبيق زي هاد بيعتمد
// على بيانات حية (نقاط، رسائل...)، ما بدنا نعرض نسخة قديمة مخزّنة أبداً
// إلا لو فعلاً النت مقطوع بالكامل
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// إشعار Push وصل - البايلود عبارة عن JSON بسيط { title, body }
self.addEventListener("push", (event) => {
  let payload = { title: "رسالة جديدة", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // تجاهل - نستخدم القيم الافتراضية فوق
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "رسالة جديدة", {
      body: payload.body || "",
      icon: payload.icon || "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      dir: "rtl",
      lang: "ar",
      data: { url: payload.url || "/" },
    })
  );
});

// ضغط على الإشعار - بيفتح/يركّز نافذة الشات الموجودة، أو يفتح وحدة جديدة
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});