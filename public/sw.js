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

// --- Background Sync: إعادة محاولة رفع صور الوجبات يلي فشلت أوفلاين ---
// (شوف src/utils/offlineUploadQueue.js بالفرونت إند - هوّ يلي بيخزّن
// الصور هون بـIndexedDB وبيسجّل هاد الـtag). لازم نستخدم نفس اسم/بنية
// القاعدة بالضبط هون عشان نقدر نقرأها من جوا الـService Worker.
const OFFLINE_DB_NAME = "lotality-offline-queue";
const OFFLINE_STORE_NAME = "pending-photo-uploads";
const OFFLINE_SYNC_TAG = "lotality-sync-photo-uploads";

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllPendingUploads(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readonly");
    const req = tx.objectStore(OFFLINE_STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePendingUpload(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    tx.objectStore(OFFLINE_STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function flushPendingUploads() {
  const db = await openOfflineDb();
  const pending = await getAllPendingUploads(db);

  for (const item of pending) {
    try {
      const formData = new FormData();
      const blob = new Blob([item.file.buffer], { type: item.file.type });
      formData.append("image", blob, item.file.name);
      formData.append("chatId", item.chatId);
      if (item.tableNumber) formData.append("tableNumber", item.tableNumber);

      const res = await fetch(item.endpoint, { method: "POST", body: formData });
      // منمسحها من الطابور سواء نجحت (200) أو فشلت لسبب دائم (٤xx - مثلاً
      // chatId غير صالح)، بس منتركها بالطابور لو فشل شبكة مؤقت (رح تتحاول
      // تاني بمحاولة sync لاحقة تلقائياً من المتصفح)
      if (res.ok || res.status < 500) {
        await deletePendingUpload(db, item.id);
      }
    } catch {
      // فشل شبكة (لسا أوفلاين فعلياً) - نسيبها بالطابور، المتصفح رح يعيد
      // محاولة الـsync event تلقائياً بنفسه لاحقاً
    }
  }
  db.close();
}

self.addEventListener("sync", (event) => {
  if (event.tag === OFFLINE_SYNC_TAG) {
    event.waitUntil(flushPendingUploads());
  }
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