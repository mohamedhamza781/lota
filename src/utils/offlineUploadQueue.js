// طابور تخزين محلي (IndexedDB) لصور الوجبات يلي فشل رفعها بسبب انقطاع
// النت - منخزّنها هون بدل ما نخسرها، ومنسجّل "Background Sync" (شوف
// public/sw.js) عشان Service Worker يعيد المحاولة تلقائياً أول ما النت
// يرجع، حتى لو المستخدم سكّر التاب قبل ما يرجع النت.
//
// ⚠️ الرفعات العادية (chat عبر socket.io) ما بتستفيد من Background Sync -
// الـAPI هاد مصمم لطلبات HTTP عادية بس، والصور هي الحالة الوحيدة الحقيقية
// عنا يلي بتنرفع بـREST POST مباشر (uploadWebChatMealPhoto بـapi/webChat.js).

const DB_NAME = "lotality-offline-queue";
const STORE_NAME = "pending-photo-uploads";
const SYNC_TAG = "lotality-sync-photo-uploads";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// بيحوّل ملف الصورة لـArrayBuffer عشان نقدر نخزّنه بـIndexedDB (الـFile
// object نفسه بينفع يتخزن كمان تقنياً، بس هيك أضمن عبر متصفحات مختلفة)
async function fileToRecord(file) {
  const buffer = await file.arrayBuffer();
  return { buffer, type: file.type, name: file.name };
}

// بتضيف صورة فشل رفعها للطابور، وبتسجّل Background Sync عشان الـSW يحاول
// يرفعها تلقائياً أول ما النت يرجع (أو أول ما يقدر - المتصفح هو يلي بيقرر
// التوقيت بالضبط)
export async function queuePhotoForBackgroundSync({ endpoint, slug, chatId, tableNumber, file }) {
  const db = await openDb();
  const record = await fileToRecord(file);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ endpoint, slug, chatId, tableNumber, file: record, createdAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(SYNC_TAG);
      return true; // رح ينرفع بالخلفية تلقائياً
    } catch {
      // بعض المتصفحات (سفاري، فايرفوكس) ما بتدعم Background Sync إطلاقاً -
      // بنرجع false، والصفحة بتقدر تعرض رسالة "حاول يدوياً بعد رجوع النت"
    }
  }
  return false;
}

export const OFFLINE_SYNC_TAG = SYNC_TAG;