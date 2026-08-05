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

// بتحدّث عدد محاولات الرفع الفاشلة لعنصر معيّن (شوف MAX_UPLOAD_ATTEMPTS
// تحت) - بدل ما نحاول للأبد بصمت لو فيه مشكلة دائمة (مش مجرد انقطاع نت
// مؤقت)
async function updatePendingUploadAttempts(db, id, attempts) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result;
      if (record) {
        record.attempts = attempts;
        store.put(record);
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// بعد كم محاولة فاشلة (شبكة/سيرفر) نستسلم ونعتبرها فشلت نهائياً - بدل ما
// نضل نحاول للأبد بصمت لو المشكلة مش مجرد انقطاع نت مؤقت (مثلاً مساحة
// السيرفر ممتلئة، أو الصورة نفسها تالفة)
const MAX_UPLOAD_ATTEMPTS = 5;

async function flushPendingUploads() {
  const db = await openOfflineDb();
  const pending = await getAllPendingUploads(db);

  let recoveredCount = 0; // كم عنصر كان أصلاً محفوظ (فشل قبل هيك) ونجح هلق - دليل "رجع النت"

  for (const item of pending) {
    try {
      const formData = new FormData();
      const blob = new Blob([item.file.buffer], { type: item.file.type });
      formData.append("image", blob, item.file.name);
      formData.append("chatId", item.chatId);
      if (item.tableNumber) formData.append("tableNumber", item.tableNumber);

      const res = await fetch(item.endpoint, { method: "POST", body: formData });

      if (res.ok) {
        await deletePendingUpload(db, item.id);
        recoveredCount += 1;
      } else if (res.status < 500) {
        // فشل دائم (٤xx - مثلاً chatId غير صالح) - إعادة المحاولة ما رح
        // تفيد أبداً، فمنشيلها ومنعلم العميل إنها ما وصلت بدل ما تختفي بصمت
        await deletePendingUpload(db, item.id);
        await self.registration.showNotification("تعذّر رفع صورة الوجبة", {
          body: "في مشكلة بالصورة يلي بعتها - جرب ترسلها مرة ثانية من المحادثة",
          icon: "/pwa-icon-192.png",
          badge: "/pwa-icon-192.png",
          dir: "rtl",
          lang: "ar",
          data: { url: "/" },
        });
      } else {
        // خطأ سيرفر مؤقت (5xx) - منعاملها متل فشل الشبكة تحت (إعادة محاولة)
        throw new Error("server_error");
      }
    } catch {
      // فشل شبكة (لسا أوفلاين فعلياً) أو خطأ سيرفر مؤقت - منزوّد عداد
      // المحاولات؛ لو تخطى الحد الأقصى، منستسلم ومنعلم العميل بدل ما
      // نضل نحاول بصمت للأبد وهو مش عارف إنه في صورة عالقة
      const attempts = (item.attempts || 0) + 1;
      if (attempts >= MAX_UPLOAD_ATTEMPTS) {
        await deletePendingUpload(db, item.id);
        await self.registration.showNotification("تعذّر رفع صورة الوجبة", {
          body: "حاولنا نرسلها كذا مرة بعد رجوع النت بدون نجاح - جرب ترسلها مرة ثانية من المحادثة",
          icon: "/pwa-icon-192.png",
          badge: "/pwa-icon-192.png",
          dir: "rtl",
          lang: "ar",
          data: { url: "/" },
        });
      } else {
        await updatePendingUploadAttempts(db, item.id, attempts);
      }
    }
  }
  db.close();

  // لو نجح إرسال شي كان عالق بالطابور، هاد دليل فعلي إنه النت رجع (مش
  // مجرد محاولة sync عادية على نت شغال أصلاً) - منعلم العميل حتى لو
  // التاب مسكّرة، عشان يرتاح إنه الصورة/الرسائل يلي كانت عالقة انبعتت
  if (recoveredCount > 0) {
    await self.registration.showNotification("عاد الاتصال بالإنترنت ✅", {
      body: recoveredCount === 1 ? "تم إرسال الصورة يلي كانت محفوظة تلقائياً" : `تم إرسال ${recoveredCount} صور كانت محفوظة تلقائياً`,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      dir: "rtl",
      lang: "ar",
      data: { url: "/" },
    });
  }
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