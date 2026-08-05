// Service Worker لشات الويب - مسؤول عن ٣ أشياء:
// ١) استقبال إشعارات Push وعرضها (حتى لو التاب مسكّر تماماً)
// ٢) تخزين (cache) ملفات التطبيق الثابتة (JS/CSS/خطوط/صور/الصفحة نفسها)
//    عن طريق Workbox، عشان الموقع يفتح بسرعة ويشتغل (أو الأقل يفتح) حتى
//    لو النت انقطع لحظياً - شرط أساسي لتصنيف PWA "قابل للتثبيت"
// ٣) طلبات الـAPI (بيانات حية: نقاط، رسائل، معلومات العميل...) ما إلها
//    أي route مسجّل هون قصداً - فبتفوت عادي عالشبكة مباشرة بدون ما
//    الـService Worker يتدخل فيها إطلاقاً (زي ما كانت "الشبكة أولاً" –
//    بس هلق حتى أبسط: ولا كاش لها نهائياً، ما بدنا نعرض بيانات قديمة)

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");

const CACHE_NAME = "lotality-webchat-v2";
const APP_SHELL = ["/"];

// نسخة الكاش تتغيّر (v1 -> v2) هون بس Workbox عنده تسمية أسماء كاش خاصة
// فيه (workbox-precache-*, workbox-runtime-*)، فمنمسح الكاش اليدوي القديم
// تبعنا فقط بالاسم القديم لو موجود، ومنسيب كاشات Workbox تدير حالها
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("lotality-webchat-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

if (workbox) {
  workbox.setConfig({ debug: false });

  const { registerRoute, NavigationRoute } = workbox.routing;
  const { StaleWhileRevalidate, NetworkFirst } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;

  // ملفات التطبيق الثابتة (JS/CSS/Web Workers الناتجة من بناء Vite) -
  // Stale While Revalidate: بترجّع النسخة المخزّنة فوراً (سريع)، وبنفس
  // الوقت بتطلب نسخة جديدة بالخلفية وتحدّث الكاش لآخر مرة تجي فيها -
  // مناسبة هون لأنها ملفات ثابتة أصلاً (اسمها فيه hash من Vite)، فمافي
  // خطر "بيانات قديمة" زي ما فيه بطلبات الـAPI
  registerRoute(
    ({ request }) => ["script", "style", "worker"].includes(request.destination),
    new StaleWhileRevalidate({
      cacheName: "lotality-static-resources",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      ],
    })
  );

  // صور وخطوط - نفس منطق Stale While Revalidate
  registerRoute(
    ({ request }) => ["image", "font"].includes(request.destination),
    new StaleWhileRevalidate({
      cacheName: "lotality-static-media",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      ],
    })
  );

  // تنقّل بين الصفحات (فتح/تحديث الصفحة الرئيسية) - الشبكة أولاً دايماً
  // (نفس فلسفة "ما نعرض نسخة قديمة إلا لو النت مقطوع فعلاً")، مع مهلة ٣
  // ثواني بعدها منرجع للكاش مباشرة بدل ما نعلّق العميل بالانتظار
  registerRoute(
    new NavigationRoute(
      new NetworkFirst({
        cacheName: "lotality-pages",
        networkTimeoutSeconds: 3,
        plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
      })
    )
  );

  // ⚠️ قصداً ما في أي route لطلبات الـAPI (fetch اللي بيرسلها كود الفرونت
  // إند نفسه لـ API_ORIGIN بـsrc/api/*.js) ولا لـsocket.io - هاي بتفوت
  // عالشبكة مباشرة بدون تدخل من الـService Worker إطلاقاً، فتضل البيانات
  // الحية (نقاط، رسائل، معلومات العميل) طازة دايماً
} else {
  // fallback نادر (لو CDN تبع Workbox ما وصل لأي سبب) - نرجع لنفس سلوك
  // "الشبكة أولاً، الكاش كبديل" القديم عشان الموقع يضل شغال بأي حال
  self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  });
}

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