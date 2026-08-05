import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { API_ORIGIN } from "../api/client";
import { resolveImageUrl } from "../api/uploads";
import { uploadWebChatMealPhoto, fetchWebChatAccount, fetchWebChatInfo, uploadWebChatAvatar, fetchVapidPublicKey, subscribeToPush } from "../api/webChat";
import { queuePhotoForBackgroundSync } from "../utils/offlineUploadQueue";
import PublicMenu from "./PublicMenu";

// لوحة الألوان الافتراضية - بتُستخدم بس لو المنشأة لسا ما حدّدت لون خاص
// فيها (menuPrimaryColor فاضي)، أو لحد ما يوصل لون المنشأة الفعلي من
// الباك إند. أي منشأة حدّدت لونها الخاص (من نفس منتقي اللون الموجود
// بصفحة "المنيو" بالداشبورد) بتاخذ هوية بصرية كاملة مبنية على هاد اللون
// تلقائياً - شوف buildTheme تحت.
//
// ⚠️ مهم: هاد اللون الافتراضي (قبل ما يوصل لون المنشأة الحقيقي) لازم
// يكون محايد (رمادي) لا أخضر ولا أي لون تاني مميّز - عشان لو صار "ومضة"
// بسيطة قبل ما تتحمّل بيانات المنشأة (طبيعي بأي تطبيق بيجيب بياناته من
// السيرفر)، تبين "شاشة تحميل عامة" مش "لون براند غلط" (كان قبل أخضر
// غامق، وكان بيبين واضح وغلط لأي منشأة بلونها الخاص، خصوصاً الأحمر).
const DEFAULT_THEME = {
  headerBg: "#64748B",
  headerBgGrad: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
  accent: "#64748B",
  accentHover: "#475569",
  bgChat: "#F0F2F5",
  bubbleIn: "#FFFFFF",
  bubbleOut: "#E7F8EE",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  danger: "#EF4444",
  border: "rgba(0,0,0,0.06)",
};

/* ------------ أدوات تلوين بسيطة (تفتيح/تغميق لون hex) ------------ */
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}
function mixColor(hex, target, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}
const darkenColor = (hex, amount = 0.3) => mixColor(hex, "#000000", amount);
const lightenColor = (hex, amount = 0.3) => mixColor(hex, "#ffffff", amount);

// بتبني هوية بصرية كاملة (هيدر، تدرّج، لون أزرار/تفاعل، خلفية فقاعة
// الرسائل الصادرة...) من لون واحد بس - نفس menuPrimaryColor يلي صاحب
// المنشأة بيختاره من صفحة "المنيو" بالداشبورد (مشترك بين صفحة المنيو
// العامة وشات الويب - نفس اللون بالمكانين تلقائياً)
function buildTheme(primaryColor) {
  const isValidHex = primaryColor && /^#([0-9a-fA-F]{3}){1,2}$/.test(primaryColor);
  const base = isValidHex ? primaryColor : DEFAULT_THEME.headerBg;

  return {
    ...DEFAULT_THEME,
    headerBg: base,
    headerBgGrad: `linear-gradient(135deg, ${base} 0%, ${darkenColor(base, 0.35)} 100%)`,
    accent: base,
    accentHover: darkenColor(base, 0.15),
    bubbleOut: lightenColor(base, 0.88),
  };
}

// بيان الهوية البصرية الحالية - متاح لكل الكومبوننتات الفرعية بدون تمرير
// props يدوياً بكل مستوى (شوف useContext(ThemeContext) بكل كومبوننت تحت)
const ThemeContext = createContext(DEFAULT_THEME);

const CHAT_ID_STORAGE_PREFIX = "lotality_webchat_id:";
// علامة دائمة (مش مرتبطة بمنشأة معيّنة) بتتخزن أول ما العميل يثبّت
// الاختصار مرة وحدة - عشان بزيارات لاحقة عبر المتصفح (مسح QR جديد) نعرف
// إنه أصلاً عنده اختصار مثبّت ونقترحله يرجعله (شوف InstalledAppHint)
const INSTALLED_FLAG_KEY = "lotality_pwa_installed";
// علامة بالـsessionStorage (خاصة بهاد التبويب بس) - بنتأكد منها قبل
// محاولة تسليم الرابط لنظام أندرويد (شوف intent:// تحت) عشان ما نعيد
// نفس المحاولة أكتر من مرة بنفس التبويب لو رجعت نفس الصفحة (fallback)
const PWA_HANDOFF_ATTEMPTED_KEY = "lotality_pwa_handoff_attempted";


// شعار المنشأة (وأي صورة تانية بتاخد وقت تتحمّل) - بيبين بتلاشي ناعم
// (fade) لما فعلياً يخلص تحميله، بدل ما "يظهر فجأة" فوق حركة الدائرة
// المحيطة فيه يلي بتخلص حركتها قبله بكتير (هيك كانت البادئة "بايخة" -
// حركتين مش متزامنتين، دائرة بتتحرك بس الصورة نفسها تطلع فجأة بعدها)
function FadeInImage({ src, alt, style, circular = true }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      loading="lazy"
      src={src}
      alt={alt || ""}
      onLoad={() => setLoaded(true)}
      style={{
        ...style,
        // clip-path مضاف كطبقة قص إضافية أقوى - مش بس معتمدين على
        // overflow:hidden للحاوية الأب (يلي طلع غير مضمون ١٠٠٪ ببعض
        // حالات Safari). هيك الصورة نفسها مفروضة تكون دائرية دايماً،
        // بغض النظر عن أي مشكلة بالحاوية المحيطة فيها.
        ...(circular ? { clipPath: "circle(50%)", WebkitClipPath: "circle(50%)", borderRadius: "50%" } : {}),
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    />
  );
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// رسائل البوت (نفس القوالب المستخدمة لواتساب الحقيقي) بتستخدم *نجمة* حوالين
// الكلمات عشان تبين Bold - واتساب بيفهمها لحاله تلقائياً، بس شات الويب
// (React عادي) لأ. هاي الدالة بتفكك النص على *...* وبترجع مصفوفة عناصر
// React، الأجزاء المحاطة بنجمتين بتصير <b> عشان يبين نفس شكل واتساب بالضبط
function renderWhatsAppText(text) {
  if (!text) return text;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.length > 1 && part.startsWith("*") && part.endsWith("*")) {
      return <b key={i}>{part.slice(1, -1)}</b>;
    }
    return part;
  });
}

/* ------------ أيقونات SVG أنيقة وعصرية ------------ */
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckDoubleIcon({ color }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
      <path d="M1 5.5L4.5 9L11 1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 5.5L9 9L15.5 1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// أيقونة ساعة صغيرة - بتبين على فقاعة رسالة العميل لسا ما توصلت السيرفر
// فعلياً (بعتها بس النت مقطوع/عم يحاول)، بدل علامة الصح المزدوجة العادية
function PendingClockIcon({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WhatsAppInputIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.03-.19-.31a8.22 8.22 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.27 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.08s.89 2.42 1.02 2.58c.12.17 1.75 2.68 4.25 3.75.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v3a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" />
      <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="3 3" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function PlaceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="11" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

// تبويب "حسابي" - بيانات العميل، نقاطه، صور الوجبات يلي رفعها، وهداياه
function AccountView({ slug, chatId }) {
  const THEME = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const loadAccount = useCallback(() => {
    if (!chatId) return;
    setLoading(true);
    fetchWebChatAccount({ slug, chatId })
      .then((res) => setData(res))
      .catch((err) => setErrorMsg(err.message || "تعذّر تحميل بيانات الحساب"))
      .finally(() => setLoading(false));
  }, [slug, chatId]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handleAvatarSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !chatId) return;

    setUploadingAvatar(true);
    try {
      const res = await uploadWebChatAvatar({ slug, file, chatId });
      setData((prev) => (prev ? { ...prev, customer: { ...prev.customer, avatarUrl: res.avatarUrl } } : prev));
    } catch (err) {
      setErrorMsg(err.message || "تعذّر رفع الصورة");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.textSecondary, fontSize: 13.5 }}>
        جاري تحميل بياناتك...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: THEME.danger, fontSize: 13.5, textAlign: "center" }}>
        {errorMsg}
      </div>
    );
  }

  if (!data?.registered) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 10, color: THEME.textSecondary }}>
        <PersonIcon />
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>لسا ما سجّلنا بياناتك</div>
        <div style={{ fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>كمّل المحادثة بتبويب "الرسائل" وزوّدنا باسمك ورقمك عشان يظهر حسابك هون</div>
      </div>
    );
  }

  const { customer, profile, photos } = data;

  return (
    <div className="wc-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* بطاقة العميل */}
      <div style={{ background: "#fff", borderRadius: 18, padding: 18, border: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelected} style={{ display: "none" }} />
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          aria-label="غيّر صورة البروفايل"
          style={{
            position: "relative",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: THEME.headerBg,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 22,
            flexShrink: 0,
            border: "none",
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
            opacity: uploadingAvatar ? 0.6 : 1,
          }}
        >
          {customer?.avatarUrl ? (
            <img loading="lazy" src={resolveImageUrl(customer.avatarUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            (customer?.name || "؟").trim().charAt(0)
          )}
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              fontSize: 9,
              textAlign: "center",
              padding: "2px 0",
            }}
          >
            <CameraIcon />
          </span>
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: THEME.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {customer?.name || "عميل"}
          </div>
          <div style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 2, direction: "ltr", textAlign: "right" }}>{customer?.phone || "—"}</div>
          {(profile?.membershipCode || profile?.lastVisitAt) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {profile?.membershipCode && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: THEME.accent,
                    background: `${THEME.accent}14`,
                    borderRadius: 8,
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  رقم العضوية: {profile.membershipCode}
                </span>
              )}
              {profile?.lastVisitAt && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: THEME.textSecondary,
                    background: "#F1F5F9",
                    borderRadius: 8,
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  آخر زيارة: {formatDate(profile.lastVisitAt)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* بطاقة النقاط */}
      <div style={{ background: THEME.headerBg, borderRadius: 18, padding: 18, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 700 }}>{(profile?.pointsBalance ?? 0).toLocaleString("ar")}</span>
          <span style={{ fontSize: 13, opacity: 0.85 }}>نقطة</span>
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>رصيدك الحالي</div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{(profile?.totalPointsEarned ?? 0).toLocaleString("ar")}</div>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>مجموع النقاط المكتسبة</div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{(profile?.visitsCount ?? 0).toLocaleString("ar")}</div>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>عدد الزيارات</div>
          </div>
        </div>
      </div>

      {/* صور الوجبات */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: THEME.textPrimary, marginBottom: 10 }}>وجباتي المفضلة</div>
        {(!photos || photos.length === 0) && (
          <div style={{ fontSize: 13, color: THEME.textSecondary, background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${THEME.border}`, textAlign: "center" }}>
            لسا ما رفعت أي صورة
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(photos || []).map((p) => (
            <div key={p.id} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "1 / 1", position: "relative", border: `1px solid ${THEME.border}` }}>
              <img loading="lazy" src={resolveImageUrl(p.imageUrl)} alt={p.mealName || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.pointsAwarded > 0 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: 10.5,
                    fontWeight: 600,
                    borderRadius: 8,
                    padding: "2px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <StarIcon /> {p.pointsAwarded}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// تبويب "الهدايا" - صفحة مستقلة (جنب الشات وحسابي) بتعرض هدايا
// العميل (الشخصية يلي صرفها إله صاحب المنشأة تحديداً + العامة النشطة)
// كل وحدة ككارد لحالها. بتجيب نفس بيانات /account بس بتعرض قسم
// الهدايا بس، بشكل صفحة كاملة بدل ما تكون مدفونة جوا تبويب "حسابي"
function CouponsView({ slug, chatId }) {
  const THEME = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [coupons, setCoupons] = useState(null);
  const [registered, setRegistered] = useState(true);

  const loadCoupons = useCallback(() => {
    if (!chatId) return;
    setLoading(true);
    fetchWebChatAccount({ slug, chatId })
      .then((res) => {
        setRegistered(Boolean(res?.registered));
        setCoupons(res?.coupons || []);
      })
      .catch((err) => setErrorMsg(err.message || "تعذّر تحميل هداياك"))
      .finally(() => setLoading(false));
  }, [slug, chatId]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.textSecondary, fontSize: 13.5 }}>
        جاري تحميل هداياك...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: THEME.danger, fontSize: 13.5, textAlign: "center" }}>
        {errorMsg}
      </div>
    );
  }

  if (!registered) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 10, color: THEME.textSecondary }}>
        <TicketIcon />
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>لسا ما سجّلنا بياناتك</div>
        <div style={{ fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>كمّل المحادثة بتبويب "الرسائل" وزوّدنا باسمك ورقمك عشان تشوف هداياك هون</div>
      </div>
    );
  }

  return (
    <div className="wc-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: THEME.textPrimary, fontWeight: 700, fontSize: 16 }}>
        <TicketIcon />
        الهدايا
      </div>

      {(!coupons || coupons.length === 0) && (
        <div style={{ fontSize: 13, color: THEME.textSecondary, background: "#fff", borderRadius: 14, padding: 20, border: `1px solid ${THEME.border}`, textAlign: "center" }}>
          ما في هدايا متاحة حالياً
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(coupons || []).map((c) => (
          <div
            key={c.id}
            style={{
              position: "relative",
              borderRadius: 22,
              overflow: "hidden",
              opacity: c.isValidNow ? 1 : 0.55,
              boxShadow: c.isValidNow ? "0 10px 28px -8px rgba(0,0,0,0.22)" : "0 2px 8px rgba(0,0,0,0.06)",
              transition: "transform 0.15s ease",
            }}
          >
            {/* رأس البطاقة - لون هوية المنشأة (صلب، بدون تدرّج)، فيه قيمة الخصم بارزة */}
            <div style={{ background: THEME.headerBg, padding: "16px 18px 22px", color: "#fff", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <GiftIcon />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.9 }}>{c.isPersonal ? "هدية خاصة فيك" : "هدية عامة"}</span>
                </div>
                {!c.isValidNow && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.28)", padding: "3px 9px", borderRadius: 20 }}>
                    منتهي/غير فعّال
                  </span>
                )}
              </div>

              <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
                  {c.discountType === "percentage" ? `${c.discountValue}٪` : `${c.discountValue} ₪`}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.9 }}>خصم</span>
              </div>

              {c.description && <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 6, lineHeight: 1.6 }}>{c.description}</div>}

              {c.partnerName && (
                <div style={{ fontSize: 11.5, marginTop: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, opacity: 0.95 }}>
                  <PlaceIcon />
                  {c.partnerName}
                  {c.partnerAddress ? ` — ${c.partnerAddress}` : ""}
                </div>
              )}
            </div>

            {/* خط تقطيع "تذكرة" - فاصل متقطّع مع فتحتين دائريتين بالجانبين */}
            <div style={{ position: "relative", height: 0 }}>
              <div style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: THEME.bgChat }} />
              <div style={{ position: "absolute", top: -10, left: -10, width: 20, height: 20, borderRadius: "50%", background: THEME.bgChat }} />
            </div>

            {/* جسم البطاقة - كود الهدية وتفاصيلها */}
            <div style={{ background: "#fff", padding: "14px 18px 16px", borderTop: `2px dashed ${THEME.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10.5, color: THEME.textSecondary, fontWeight: 600 }}>كود الهدية</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: THEME.accent, direction: "ltr", letterSpacing: 1.5 }}>{c.code}</span>
              </div>
              <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 8, textAlign: "left" }}>
                {c.expiresAt ? `صالح لغاية ${formatDate(c.expiresAt)}` : "بدون تاريخ انتهاء"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// بانر تثبيت PWA - "ملازم" للمستخدم بكل الصفحات (شاشة الترحيب، الإنترو،
// وكل تبويبات الشات) لحد ما يثبّت فعلياً - وقتها بس بيختفي. مش بانر خاص
// بصفحة "الرئيسية" بس، هيك طلب صريح: يضل ظاهر لحد ما يستجيب.
// تذكير "ثبّت التطبيق" - بدل ما يكون شريط ثابت دايماً آخذ مساحة من
// الشاشة، صار إشعار عائم (toast) بيظهر بس كل فترة وفترة (مرة كل ٢٤
// ساعة كحد أقصى، محفوظ بالـlocalStorage)، وبيختفي لحاله بعد شوي أو
// بمجرد ما تسكّره يدوياً - ما بياخذ مساحة دايمة من الشاشة إطلاقاً.
const INSTALL_PROMPT_COOLDOWN_MS = 20 * 1000; // ⚠️ مؤقت للتجربة - كانت: 24 * 60 * 60 * 1000 (٢٤ ساعة)، رجّعها لما تخلص التجربة
const INSTALL_PROMPT_STORAGE_KEY = "lotality_install_prompt_last_shown";
const INSTALL_PROMPT_AUTO_HIDE_MS = 9000; // بيختفي لحاله بعد ٩ ثواني لو محدا سكّره يدوياً

function InstallBanner({ canInstall, isIOS, isAndroid, isAppInstalled, onInstallClick, establishmentName }) {
  const THEME = useContext(ThemeContext);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  // تعليمات يدوية لأندرويد - بتظهر بس لو حدث "beforeinstallprompt" ما
  // انطلق (متصفح غير كروم متل Samsung Internet/Firefox، أو متصفح داخلي
  // بتطبيق متل انستغرام/فيسبوك ما بيدعم الحدث إطلاقاً)، فبنعرض خطوات
  // يدوية بدل ما يضل الزر معطّل بلا أي بديل
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [visible, setVisible] = useState(false);
  const eligible = !isAppInstalled && (canInstall || isIOS || isAndroid);

  useEffect(() => {
    if (!eligible) return;
    let lastShown = 0;
    try {
      lastShown = Number(localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY)) || 0;
    } catch {
      // تجاهل - لو localStorage مش متاح، منعتبرها أول مرة ونعرضها عادي
    }
    if (Date.now() - lastShown < INSTALL_PROMPT_COOLDOWN_MS) return;

    // تأخير بسيط قبل ما تظهر - عشان ما تقاطع أول لحظة تحميل الصفحة
    const showTimer = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(showTimer);
  }, [eligible]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, String(Date.now()));
    } catch {
      // تجاهل
    }
  }

  // بيختفي لحاله بعد فترة لو محدا تفاعل معه (يدوس تثبيت أو يسكّره)،
  // إلا لو فاتح تعليمات آيفون (خليها مفتوحة لحد ما يسكّرها بنفسه)
  useEffect(() => {
    if (!visible || showIOSInstructions || showAndroidInstructions) return;
    const hideTimer = setTimeout(dismiss, INSTALL_PROMPT_AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, showIOSInstructions, showAndroidInstructions]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "max(12px, env(safe-area-inset-top, 12px))",
        left: 12,
        right: 12,
        zIndex: 50,
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        boxShadow: "0 10px 28px -6px rgba(0,0,0,0.18)",
        padding: "10px 12px",
        animation: "fadeScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: THEME.bubbleOut,
            color: THEME.headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HomeIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.textPrimary }}>
            ثبّت {establishmentName || "التطبيق"} على شاشتك الرئيسية
          </div>
        </div>
        <button
          onClick={() => {
            if (isIOS) return setShowIOSInstructions((v) => !v);
            if (canInstall) {
              onInstallClick();
              return dismiss();
            }
            // أندرويد بس بلا حدث beforeinstallprompt (متصفح ما بيدعمه) -
            // منعرضله تعليمات يدوية بدل ما الزر ما يعمل شي إطلاقاً
            if (isAndroid) return setShowAndroidInstructions((v) => !v);
            dismiss();
          }}
          style={{
            border: "none",
            borderRadius: 9,
            padding: "6px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#fff",
            background: THEME.accent,
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          ثبّت
        </button>
        <button
          onClick={dismiss}
          aria-label="إغلاق"
          style={{
            border: "none",
            background: "transparent",
            color: THEME.textSecondary,
            cursor: "pointer",
            padding: 4,
            flexShrink: 0,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {isIOS && showIOSInstructions && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: THEME.textSecondary, lineHeight: 1.8 }}>
          ١. دوس زر "المشاركة" ⬆️ تحت بمتصفح سفاري
          <br />
          ٢. مرّر واختار "إضافة إلى الشاشة الرئيسية"
          <br />
          ٣. دوس "إضافة" فوق يمين
        </div>
      )}
      {isAndroid && !canInstall && showAndroidInstructions && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: THEME.textSecondary, lineHeight: 1.8 }}>
          ١. دوس زر القائمة ⋮ فوق يمين المتصفح
          <br />
          ٢. اختار "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق"
          <br />
          ٣. أكّد الإضافة
        </div>
      )}
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// تبويب "الرئيسية" - الصفحة الرئيسية الجديدة، شعار المنشأة كبير فوق،
// وتحته نص العروض/الإعلانات يلي صاحب المنشأة بده يعلن عنه (منفصل عن
// "نبذة عنا")
function HomeView({ logoUrl, establishmentName, promoText, promotions = [] }) {
  const THEME = useContext(ThemeContext);
  return (
    <div className="wc-scroll" style={{ flex: 1, overflowY: "auto", padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: "50%",
          background: THEME.headerBg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 36,
          overflow: "hidden",
          // boxShadow: "0 10px 28px rgba(15,92,71,0.22)",
          flexShrink: 0,
        }}
      >
        {logoUrl ? (
          <FadeInImage src={resolveImageUrl(logoUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          (establishmentName || "؟").trim().charAt(0)
        )}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: THEME.textPrimary, textAlign: "center" }}>{establishmentName || ""}</div>

      {promotions.length > 0 && (
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
          {promotions.map((promo) => (
            <PromoCard key={promo.id} promo={promo} THEME={THEME} />
          ))}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, padding: 20, border: `1px solid ${THEME.border}` }}>
        {promoText ? (
          <p style={{ fontSize: 14, lineHeight: 1.9, color: THEME.textPrimary, whiteSpace: "pre-wrap", margin: 0, textAlign: "center" }}>{promoText}</p>
        ) : (
          <p style={{ fontSize: 13.5, color: THEME.textSecondary, margin: 0, textAlign: "center" }}>ترقّب عروضنا وإعلاناتنا قريباً هون </p>
        )}
      </div>
    </div>
  );
}

// بطاقة إعلان/عرض واحدة (بانر مصوّر) - نفس الإعلانات يلي صاحب المنشأة
// برفعها من صفحة "الإعلانات والعروض" بالداشبورد وبتظهر بالمنيو العام،
// هون بس بتصميم مطابق لتبويب "الرئيسية" بشات الويب (بطاقات فوق بعض بدل
// تمرير أفقي، لأنه المساحة أصلاً ضيّقة بشكل تطبيق موبايل)
function PromoCard({ promo, THEME }) {
  const image = resolveImageUrl(promo.imageUrl);
  const Wrapper = promo.linkUrl ? "a" : "div";
  const linkProps = promo.linkUrl ? { href: promo.linkUrl, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Wrapper
      {...linkProps}
      style={{
        display: "flex",
        alignItems: "stretch",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 18,
        overflow: "hidden",
        background: "#fff",
        border: `1px solid ${THEME.border}`,
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
      }}
    >
      {/* الصورة على اليمين (أول عنصر بترتيب DOM ضمن حاوية RTL) */}
      {image && (
        <div style={{ position: "relative", width: 112, minHeight: 112, flexShrink: 0, background: "rgba(0,0,0,0.05)" }}>
          <img loading="lazy" src={image} alt={promo.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {promo.badgeText && (
            <span
              style={{
                position: "absolute",
                top: 6,
                insetInlineStart: 6,
                background: THEME.accent,
                color: "#fff",
                fontSize: 9.5,
                fontWeight: 700,
                padding: "3px 7px",
                borderRadius: 20,
                whiteSpace: "nowrap",
              }}
            >
              {promo.badgeText}
            </span>
          )}
        </div>
      )}

      {/* التفاصيل على اليسار */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: THEME.textPrimary }}>{promo.title}</div>
        {promo.description && (
          <div style={{ fontSize: 12.5, color: THEME.textSecondary, marginTop: 4, lineHeight: 1.6 }}>{promo.description}</div>
        )}
      </div>
    </Wrapper>
  );
}

// حركة "فتح الستارة" لما العميل يدوس على تبويب "المنيو" - عشان لحظة
// الانتظار (لحد ما بيانات المنيو توصل من السيرفر) تحس إنها لحظة "افتتاح
// المنيو" مقصودة بدل انتظار فاضي/قفزة مفاجئة للمحتوى. لوحين بلون هوية
// المنشأة بيتفرّقوا لليمين واليسار (زي ستارة مسرح) وبيوريوا المنيو تحتهم،
// مع أيقونة منيو بتتلاشى بالنص لحظة قبل ما يبلشوا يتفرّقوا.
function MenuCurtainReveal({ trigger, THEME, logoUrl, establishmentName, children }) {
  const [revealing, setRevealing] = useState(true);

  useEffect(() => {
    setRevealing(true);
    const timer = setTimeout(() => setRevealing(false), 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {children}
      {revealing && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "50%",
              background: THEME.headerBg,
              zIndex: 5,
              animation: "curtainOpenRight 1.8s cubic-bezier(0.65,0,0.35,1) forwards",
              animationDelay: "0.4s",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "50%",
              background: THEME.headerBg,
              zIndex: 5,
              animation: "curtainOpenLeft 1.8s cubic-bezier(0.65,0,0.35,1) forwards",
              animationDelay: "0.4s",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              opacity: 0.95,
              animation: "curtainIconFade 0.7s ease forwards",
              animationDelay: "1.5s",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 148,
                height: 148,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {logoUrl ? (
                <FadeInImage
                  src={resolveImageUrl(logoUrl)}
                  alt={establishmentName || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ transform: "scale(3)" }}>
                  <MenuIcon />
                </div>
              )}
            </div>
          </div>
          <style>{`
            @keyframes curtainOpenRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
            @keyframes curtainOpenLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
            @keyframes curtainIconFade { from { opacity: 0.95; } to { opacity: 0; } }
          `}</style>
        </>
      )}
    </div>
  );
}

// أيقونة دراجة/سكوتر توصيل - بدل شاحنة التوصيل القديمة
function DeliveryIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M5 18h5.5l1.5-4h4" />
      <path d="M12 14l-1-3h-3" />
      <path d="M15.5 14V9.5a1 1 0 0 1 1-1H18" />
      <path d="M18 8.5V14" />
      <rect x="15" y="5.3" width="4" height="3" rx="0.6" />
    </svg>
  );
}

function WhatsAppButtonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 6.32A7.85 7.85 0 0 0 12.01 4C7.58 4 4 7.58 4 12c0 1.4.37 2.75 1.06 3.94L4 20l4.16-1.03A7.94 7.94 0 0 0 12 20c4.42 0 8-3.58 8-8 0-2.13-.83-4.13-2.4-5.68zM12 18.5c-1.24 0-2.45-.33-3.5-.96l-.25-.15-2.47.61.63-2.41-.16-.25A6.47 6.47 0 0 1 5.5 12c0-3.58 2.92-6.5 6.5-6.5 1.74 0 3.37.68 4.6 1.9a6.45 6.45 0 0 1 1.9 4.6c0 3.58-2.92 6.5-6.5 6.5zm3.55-4.86c-.2-.1-1.16-.57-1.34-.64-.18-.07-.31-.1-.44.1-.13.2-.5.63-.62.77-.11.13-.23.15-.42.05-.2-.1-.83-.31-1.58-.99-.58-.52-.98-1.16-1.09-1.36-.11-.2-.01-.3.09-.4.09-.09.2-.24.3-.36.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.36-.05-.1-.44-1.07-.6-1.46-.16-.38-.32-.33-.44-.34-.11 0-.24-.01-.37-.01-.13 0-.34.05-.52.25-.18.2-.68.66-.68 1.62s.7 1.88.8 2.01c.1.13 1.37 2.1 3.33 2.94.47.2.83.32 1.11.42.47.15.89.13 1.23.08.37-.06 1.16-.47 1.32-.93.16-.46.16-.85.11-.93-.05-.08-.18-.13-.38-.23z" />
    </svg>
  );
}

// تبويب "الديلفري" (كان اسمه "نبذة عنا") - رقم واتساب توصيل بيحدده صاحب
// المنشأة من الداشبورد، والعميل بيدوس عليه ويفتح محادثة واتساب مباشرة
// معه لطلب توصيل
function DeliveryView({ deliveryWhatsAppNumber, establishmentName, logoUrl }) {
  const THEME = useContext(ThemeContext);
  const cleanNumber = (deliveryWhatsAppNumber || "").replace(/[^\d]/g, "");

  return (
    <div className="wc-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 18px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* رأس ملوّن - شعار المنشأة + العنوان (لون صلب بدون تدرّج) */}
      <div
        style={{
          background: THEME.headerBg,
          borderRadius: 20,
          padding: "24px 20px",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {logoUrl ? (
            <FadeInImage src={resolveImageUrl(logoUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <DeliveryIcon />
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 17 }}>ديلفري {establishmentName || "المنشأة"}</div>
      </div>

      {/* المحتوى */}
      {cleanNumber ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "26px 22px",
            border: `1px solid ${THEME.border}`,
            boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <DeliveryIcon />
          <p style={{ fontSize: 14, lineHeight: 1.9, color: THEME.textPrimary, margin: 0 }}>
            بدك توصيل؟ تواصل معنا مباشرة عالواتساب وخلّينا نجهّزلك طلبك.
          </p>
          <a
            href={`https://wa.me/${cleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              background: "#25D366",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 12,
              padding: "12px 24px",
            }}
          >
            <WhatsAppButtonIcon />
            تواصل عبر واتساب
          </a>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "44px 20px",
            color: THEME.textSecondary,
          }}
        >
          <DeliveryIcon />
          <div style={{ fontSize: 13.5, textAlign: "center" }}>خدمة الديلفري مش متاحة حالياً</div>
        </div>
      )}
    </div>
  );
}

// تبويب "المنيو" - بيستخدم نفس بيانات صفحة المنيو العامة (/m/:slug)، بس
// بدون نافذة "ادخل السحب واربح" إطلاقاً - العميل هون أصلاً عنده حساب
const CURRENT_YEAR = new Date().getFullYear();

// CSS مشترك لإخفاء شكل سكرول بار المتصفح الافتراضي (بيضل السكرول شغال
// طبيعي، بس بدون الخط الرمادي السميك يلي كان بيبين جانب المحتوى) - نفس
// القاعدة مستخدمة بكل الشاشات (شات، منيو، حسابي، نبذة عنا، ترحيب، إنترو)
const SCROLLBAR_HIDE_CSS = `
  .wc-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  .wc-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

// Web Push API بتحتاج المفتاح العام بصيغة Uint8Array، مش نص - هاي تحويل
// قياسي لصيغة base64url (يلي بيرجعها VAPID) لمصفوفة بايتات
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


// شاشة الترحيب - بتظهر مرة وحدة بس (أول ما العميل يفوت على الرابط، قبل ما
// تفتح المحادثة). بتاخذ الاسم ورقم الجوال بمقدمة دولية (زي بوت الواتساب
// الأصلي بالضبط) وبتمررهم لأعلى (onSubmit) عشان يصير التسجيل تلقائياً
// بمجرد ما نفتح اتصال الشات - بدون ما العميل يحتاج يكتبهم يدوياً بالمحادثة
/* ------------ أيقونة QR بسيطة (مربعات متقطعة) لشاشة "لازم تمسح QR") ------------ */
function QrIcon({ color = "currentColor" }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <line x1="14" y1="14" x2="14" y2="14.01" />
      <line x1="17.5" y1="14" x2="17.5" y2="17.5" />
      <line x1="21" y1="14" x2="21" y2="14.01" />
      <line x1="14" y1="17.5" x2="17.5" y2="17.5" />
      <line x1="14" y1="21" x2="14" y2="21.01" />
      <line x1="17.5" y1="21" x2="21" y2="21" />
      <line x1="21" y1="17.5" x2="21" y2="21.01" />
    </svg>
  );
}

// شاشة "لازم تمسح QR" - بتظهر بس لما ما في chatId محفوظ محلياً (يعني ما
// عندوش حساب أصلاً بهاد الجهاز/المتصفح) وبنفس الوقت الرابط الحالي ما جاي
// من مسح QR فعلي (بدون ?src=qr - شوف viaQr بـWebChat الرئيسي). هاي أول
// حماية (على مستوى الواجهة، قبل ما نتعب العميل بتعبئة فورم اسمه ورقمه)
// من فتح رابط الشات من مكان تاني (مشاركة، فحص فضولي...) بدون ما يكون
// فعلياً واقف بالمطعم قدام الـQR المطبوع.
function NeedQrScreen({ slug }) {
  const THEME = useContext(ThemeContext);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWebChatInfo(slug)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const darkGreen = THEME.headerBg || "#64748B";

  return (
    <div
      dir="rtl"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(120% 80% at 50% 0%, ${THEME.accent ? THEME.accent + "0D" : "#64748B0D"} 0%, ${THEME.bgChat || "#F1F5F9"} 100%)`,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 28,
          padding: "36px 28px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
          border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: THEME.headerBgGrad || `linear-gradient(135deg, ${darkGreen} 0%, #064E3B 100%)`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            boxShadow: `0 12px 28px ${darkGreen}40`,
          }}
        >
          <QrIcon color="#fff" />
        </div>

        {info?.logoUrl && (
          <img loading="lazy"
            src={resolveImageUrl(info.logoUrl)}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", marginBottom: 10 }}
          />
        )}

        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.textPrimary || "#0F172A" }}>
          امسح رمز QR أول شي 📲
        </div>
        <div style={{ fontSize: 13, color: THEME.textSecondary || "#64748B", marginTop: 10, lineHeight: 1.7 }}>
          {info?.name
            ? `للانضمام لبرنامج ولاء ${info.name} أو تسجيل زيارتك، لازم تمسح رمز QR الموجود داخل المطعم مباشرة.`
            : "للانضمام أو تسجيل زيارتك، لازم تمسح رمز QR الموجود داخل المطعم مباشرة."}
        </div>
        <div style={{ fontSize: 12, color: THEME.textSecondary || "#94A3B8", marginTop: 14, background: THEME.bgChat, borderRadius: 12, padding: "10px 14px" }}>
          فتح هاد الرابط من غير مسح الـQR (زي مشاركة الرابط أو فتح التطبيق من بعيد) ما بيسجّل زيارة أو نقاط جديدة.
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ slug, onSubmit, installBannerProps, logoUrl: earlyLogoUrl, establishmentName: earlyEstablishmentName, externalError }) {
  const THEME = useContext(ThemeContext);
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState(externalError || "");

  useEffect(() => {
    if (externalError) setFormError(externalError);
  }, [externalError]);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWebChatInfo(slug)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({ name: "", logoUrl: null, aboutText: "" });
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const nameParts = trimmedName.split(/\s+/).filter(Boolean);
    const digits = phone.replace(/[^\d]/g, "");

    if (!trimmedName) {
      setFormError("الرجاء إدخال الاسم");
      return;
    }
    if (nameParts.length < 3) {
      setFormError("يرجى كتابة الاسم ثلاثياً (مثال: أحمد محمد الأحمد)");
      return;
    }
    if (digits.length !== 12) {
      setFormError("رقم الواتساب يجب أن يتكون من 12 رقمًا بالمجموع مع رمز الدولة (مثال: 970599123456)");
      return;
    }
    if (digits.startsWith("0")) {
      setFormError("ادخل الرقم بمقدمة الدولة بدون الصفر في البداية (مثال: 970599123456)");
      return;
    }
    setFormError("");
    onSubmit({ name: trimmedName, phone: digits });
  }

  // الأخضر الغامق (نفس لون الهيدر) - مستخدم هلق للأيقونات بدل الأخضر
  // الفاتح (accent) عشان يطابق طلب "خضرا غامقة"
  const darkGreen = THEME.headerBg || "#64748B";

  // بيانات الشعار/الاسم - نفضّل يلي وصل مسبقاً من الأب (earlyInfo، وصل
  // أسرع لأنه بيتجاب من لحظة فتح الصفحة) وإلا يلي جبناه هون محلياً
  // (info) لو لسا الأب ما وصلّه. هيك الشعار بيبين حتى بأول لحظة تحميل
  // (شاشة "جاري تجهيز التجربة...") بدل ما يضل غايب لحد ما info يوصل.
  const resolvedLogoUrl = earlyLogoUrl || info?.logoUrl;
  const resolvedName = earlyEstablishmentName || info?.name;

  const inputStyle = (fieldName) => ({
    width: "100%",
    border: `1.5px solid ${focusedInput === fieldName ? darkGreen : "rgba(226, 232, 240, 0.9)"}`,
    borderRadius: 16,
    padding: "13.5px 44px 13.5px 16px",
    fontSize: 14.5,
    outline: "none",
    fontFamily: "inherit",
    background: focusedInput === fieldName ? "#FFFFFF" : "#F8FAFC",
    color: THEME.textPrimary || "#0F172A",
    boxSizing: "border-box",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
  });

  const inputIconWrapStyle = {
    position: "absolute",
    top: "50%",
    right: 14,
    transform: "translateY(-50%)",
    color: darkGreen,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  };

  return (
    <div
      dir="rtl"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: loadingInfo
          ? THEME.headerBgGrad || `linear-gradient(135deg, ${darkGreen} 0%, ${darkGreen} 100%)`
          : `radial-gradient(120% 80% at 50% 0%, ${THEME.accent ? THEME.accent + "0D" : "#64748B0D"} 0%, ${THEME.bgChat || "#F1F5F9"} 100%)`,
        transition: "background 0.4s ease",
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "12px 18px 16px",
      }}
    >
      <InstallBanner {...installBannerProps} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          maxWidth: 410,
          margin: "0 auto",
        }}
      >
        {loadingInfo ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
              animation: "fadeScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* الشعار - بارز بالنص، بدون أي شعاع/توهج حوله. ما منعرضه إلا
            لما بيانات المنشأة (الاسم/الشعار) توصل فعلياً - عشان ما تبين
            دائرة "؟" فاضية لحظة قبل ما الشعار الحقيقي يوصل */}
            {(resolvedLogoUrl || resolvedName) && (
              <div style={{ animation: "fadeScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {resolvedLogoUrl ? (
                    <FadeInImage
                      src={resolveImageUrl(resolvedLogoUrl)}
                      alt={resolvedName || "Logo"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 42, fontWeight: 800, color: "#fff" }}>{resolvedName.trim().charAt(0)}</span>
                  )}
                </div>
              </div>
            )}

            {/* علامة التحميل تحت الشعار */}
            <div
              style={{
                width: 42,
                height: 42,
                border: "3px solid rgba(255,255,255,0.28)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.8s cubic-bezier(0.68, -0.3, 0.32, 1.3) infinite",
              }}
            />

            <span style={{ color: "#fff", fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", textAlign: "center", opacity: 0.95 }}>
              جاري تجهيز التجربة...
            </span>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* البطاقة الزجاجية الفخمة الرئيسية */}
            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: 28,
                padding: "22px 22px 20px",
                boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
                border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              {/* لمسة شريط سحب ناعم في أعلى البطاقة */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 10,
                  background: "rgba(0, 0, 0, 0.08)",
                  marginBottom: 14,
                }}
              />

              {/* بادج "تطوير Kajo" - رفعناها لفوق البطاقة (نفس تعديل شاشة
                  "أهلاً بكم" الأخرى) عشان تكون واضحة وظاهرة بدل ما تضيع
                  بسطر باهت آخر الشاشة */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: `${THEME.headerBg || "#64748B"}12`,
                  border: `1px solid ${THEME.headerBg || "#64748B"}30`,
                  color: THEME.headerBg || "#64748B",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                تطوير Kajo © {CURRENT_YEAR}
              </div>

              {/* الشعار */}
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  background: THEME.headerBgGrad || `linear-gradient(135deg, ${THEME.accent || "#64748B"} 0%, #064E3B 100%)`,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 32,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {info?.logoUrl ? (
                  <FadeInImage
                    src={resolveImageUrl(info.logoUrl)}
                    alt={info?.name || "Logo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  (info?.name || "؟").trim().charAt(0)
                )}
              </div>

              {/* العناوين والتفاصيل */}
              <h1
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: THEME.textPrimary || "#0F172A",
                  textAlign: "center",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                أهلاً وسهلاً بك في مجتمع {info?.name || ""}
              </h1>

              <p
                style={{
                  fontSize: 13,
                  color: THEME.textSecondary || "#64748B",
                  marginTop: 6,
                  marginBottom: 18,
                  textAlign: "center",
                  lineHeight: 1.5,
                  maxWidth: 300,
                }}
              >
خطوة واحدة تفصلك عن أول مكافأة سجل بياناتك لتنطلق معنا
في رحلتك الأولى في المجتمع              </p>

              {/* النموذج */}
              <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ position: "relative" }}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="الاسم الثلاثي الكريم (مثال: أحمد محمد الأحمد)"
                    style={inputStyle("name")}
                  />
                  <span style={inputIconWrapStyle}>
                    <PersonIcon />
                  </span>
                </div>

                <div>
                  <div style={{ position: "relative" }}>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setFocusedInput("phone")}
                      onBlur={() => setFocusedInput(null)}
                      placeholder="رقم الواتساب (مثال: 970599123456)"
                      dir="ltr"
                      style={{
                        ...inputStyle("phone"),
                        textAlign: "right",
                      }}
                    />
                    <span style={inputIconWrapStyle}>
                      <WhatsAppInputIcon />
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: THEME.textSecondary || "#94A3B8",
                      marginTop: 4,
                      paddingInlineStart: 4,
                      fontWeight: 500,
                    }}
                  >
                    12 رقم مع المفتاح الدولي بدون 0 بالبداية
                  </div>
                </div>

                {formError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: THEME.danger || "#EF4444",
                      backgroundColor: `${THEME.danger || "#EF4444"}12`,
                      border: `1px solid ${THEME.danger || "#EF4444"}25`,
                      padding: "9px 12px",
                      borderRadius: 12,
                      textAlign: "center",
                      fontWeight: 600,
                      animation: "shake 0.3s ease-in-out",
                    }}
                  >
                    {formError}
                  </div>
                )}

               <button
  type="submit"
  style={{
    width: "100%",
    border: `2px solid ${THEME.headerBg || "#64748B"}`,
    borderRadius: 16,
    padding: "14.5px 0",
    fontSize: 15,
    fontWeight: 700,
    color: "#ffffff",
    background: THEME.headerBg || "#64748B",
    cursor: "pointer",
    marginTop: 4,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    letterSpacing: "-0.01em",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "#ffffff";
    e.currentTarget.style.color = THEME.headerBg || "#64748B";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = THEME.headerBg || "#64748B";
    e.currentTarget.style.color = "#ffffff";
  }}
  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
>
  ابدأ رحلتك في {info?.name || "المجتمع"}
</button>
              </form>
            </div>

            {/* شبكة المزايا */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                width: "100%",
              }}
            >
              {[
                { icon: <ChatIcon />, title: "تواصل مباشر", text: "تواصل أسرع" },
                { icon: <BoltIcon />, title: "تجربة مميزة", text: "مخصصة لك" },
                { icon: <TicketIcon />, title: "مكافآت حصرية", text: "نقاط ومزايا" },
              ].map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(12px)",
                    borderRadius: 18,
                    border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
                    padding: "11px 6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      background: `${darkGreen}14`,
                      color: darkGreen,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textPrimary || "#0F172A" }}>{f.title}</div>
                  <div style={{ fontSize: 9.5, color: THEME.textSecondary || "#64748B" }}>{f.text}</div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// شاشة تحميل بسيطة - بتظهر بينما التسجيل عم يصير فعلياً بالخلفية (الاسم
// والرقم عم يترسلوا تلقائياً عبر نفس منطق البوت المُختبر، بدون ما نوري
// المستخدم تفاصيل هاي الخطوة)
function RegisteringScreen({ name, logoUrl, establishmentName }) {
  const THEME = useContext(ThemeContext);
  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  const darkGreen = THEME.headerBg || "#64748B";

  // رسائل متغيّرة أثناء الانتظار - بتحسّن إحساس المستخدم بالتقدّم (مش نفس
  // النص الثابت طول الوقت)، وبتذكّره بفوائد المجتمع بنفس الوقت
  const steps = useMemo(
    () => [
      "جاري التحقق من بياناتك",
      "جاري تجهيز عضويتك  ",
      "بقيت ثوانٍ قليلة لتصبح عضواً في مجتمع إيوان وتبدأ رحلتك معنا",
    "يرجى عدم إغلاق الصفحة",
    ],
    []
  );
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1 < steps.length ? i + 1 : i));
    }, 1500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div
      dir="rtl"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(120% 80% at 50% 0%, ${THEME.accent ? THEME.accent + "0D" : "#64748B0D"} 0%, ${THEME.bgChat || "#F1F5F9"} 100%)`,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 28,
          padding: "36px 28px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
          border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          animation: "fadeScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ position: "relative", width: 84, height: 84, marginBottom: 22 }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: THEME.headerBgGrad || `linear-gradient(135deg, ${darkGreen} 0%, #064E3B 100%)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 32,
              overflow: "hidden",
              // border: "4px solid #FFFFFF",
              // boxShadow: `0 12px 28px ${darkGreen}40`,
            }}
          >
            {logoUrl ? (
              <FadeInImage src={resolveImageUrl(logoUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (establishmentName || "؟").trim().charAt(0)
            )}
          </div>
          <div
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: `3px solid ${THEME.border || "#E2E8F0"}`,
              borderTopColor: darkGreen,
              animation: "spin 0.9s cubic-bezier(0.68, -0.3, 0.32, 1.3) infinite",
            }}
          />
        </div>

        <div style={{ fontSize: 16.5, fontWeight: 800, color: THEME.textPrimary || "#0F172A", textAlign: "center", letterSpacing: "-0.01em" }}>
          {firstName ? `جاري إنشاء حسابك يا ${firstName}` : "جاري إنشاء حسابك"}
        </div>

        <div
          key={stepIndex}
          style={{
            fontSize: 12.5,
            color: darkGreen,
            marginTop: 10,
            fontWeight: 700,
            textAlign: "center",
            animation: "fadeIn 0.35s ease",
            minHeight: 18,
          }}
        >
          {steps[stepIndex]}
        </div>

        <div style={{ fontSize: 11, color: THEME.textSecondary || "#94A3B8", marginTop: 16, textAlign: "center" }}>
          لا تغلق هاي الصفحة، ثواني وبنخلص
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// شاشة ترحيبية بعد التسجيل مباشرة - بتعرّف العميل بفكرة المجتمع وفوائده
// بشكل عام (بدون أرقام/تفاصيل محدّدة)، وبعدين بتوديه للمحادثة الفعلية
// تلميح "ارجع لاختصارك المثبّت" - بيظهر بس لو (أ) العميل فاتح الموقع
// هلق من متصفح عادي (مش من داخل التطبيق المثبّت نفسه) و(ب) عنده علامة
// دائمة إنه سبق وثبّت الاختصار قبل هيك (مثلاً من زيارة سابقة). مفيد
// لأنه مسح QR أي مرة تانية بيفتح المتصفح إجبارياً (قيد نظام تشغيل، مش
// من طرفنا) - فبنذكّره إنه أسرع يرجع لاختصاره المثبّت لباقي حاجاته
// (نقاطه، الهدايا، المنيو...) بدل ما يضل شغال من المتصفح.
function InstalledAppHint({ isStandaloneNow }) {
  const THEME = useContext(ThemeContext);
  const [dismissed, setDismissed] = useState(false);

  const hasInstalledBefore = useMemo(() => {
    try {
      return localStorage.getItem(INSTALLED_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  if (isStandaloneNow || !hasInstalledBefore || dismissed) return null;

  return (
    <div
      style={{
        margin: "8px 12px 0",
        padding: "9px 12px",
        borderRadius: 12,
        background: `${THEME.accent}14`,
        border: `1px solid ${THEME.accent}30`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 12, color: THEME.textPrimary, flex: 1, lineHeight: 1.6 }}>
        خلصت هون؟ ارجع لاختصارك المثبّت بشاشتك الرئيسية لباقي حاجاتك (نقاطك، هداياك، المنيو...) 👍
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="إغلاق"
        style={{ border: "none", background: "transparent", color: THEME.textSecondary, cursor: "pointer", padding: 2, fontSize: 15, lineHeight: 1, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// شريط "لا يوجد اتصال بالإنترنت" - بيظهر لما فعلياً ينقطع النت، وبيختفي
// لحاله لما يرجع. ما بيمنع أي تنقّل بين التبويبات - البيانات يلي كانت
// محمّلة قبل انقطاع النت بتضل ظاهرة زي ما هي (React state محفوظة
// بالذاكرة)، بس أي طلب جديد (تحميل بيانات جديدة، إرسال رسالة...) رح
// يفشل لحد ما يرجع النت
//
// 🩹 قبل هيك كنا معتمدين بس على navigator.onLine/أحداث "online"/"offline" -
// وهاي بترصد بس إذا كارت الشبكة بالجهاز شغال أصلاً (متصل بشبكة wifi/بيانات
// أياً كانت)، مش إذا في إنترنت فعلي عالشبكة هاي. يعني بالضبط سيناريو
// "متصل بشبكة وايفاي بس بدون إنترنت فعلي" (راوتر عم يشتغل بس النت
// مقطوع عند مزود الخدمة، أو شبكة captive portal...) - navigator.onLine
// بيضل true وما بينطلق حدث "offline" إطلاقاً، فالشريط ما كان يظهر أبداً
// بالضبط بالحالة يلي وصفها المستخدم (بيفتح الاختصار ويشوف الواجهة القديمة
// المخزّنة عادي وكأنه في نت). هلق منضيف كمان حالة اتصال الـsocket
// الحقيقية (connectionState من نفس الصفحة) كإشارة إضافية وأدق - لو
// الـsocket نفسه فشل يتصل/انقطع (reconnecting/error) لمدة معقولة، هاد
// دليل فعلي إنه ما في نت شغال حتى لو navigator.onLine قال العكس.
const OFFLINE_SOCKET_GRACE_MS = 4000; // ما منستعجل نطلع الشريط لأول محاولة اتصال عادية أو انقطاع لحظي جداً

function OfflineBanner({ connectionState }) {
  const [networkOffline, setNetworkOffline] = useState(() => !navigator.onLine);
  const [socketOffline, setSocketOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setNetworkOffline(true);
    const goOnline = () => setNetworkOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (connectionState !== "reconnecting" && connectionState !== "error") {
      setSocketOffline(false);
      return;
    }
    // مهلة صغيرة قبل ما نعتبرها فعلياً "قطع نت" - عشان ما نفلش الشريط على
    // انقطاع لحظي عادي بيصلح لحاله بثانية أو اتنين
    const timer = setTimeout(() => setSocketOffline(true), OFFLINE_SOCKET_GRACE_MS);
    return () => clearTimeout(timer);
  }, [connectionState]);

  const isOffline = networkOffline || socketOffline;

  if (!isOffline) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
        left: 12,
        right: 12,
        zIndex: 60,
        background: "#1F2937",
        color: "#fff",
        borderRadius: 14,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 10px 24px -6px rgba(0,0,0,0.3)",
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
      لا يوجد اتصال بالإنترنت حالياً - بتقدر تتنقّل بين الشاشات، بس البيانات الجديدة ما رح تتحدّث لحد ما يرجع النت
    </div>
  );
}

// أيقونة بسيطة بالهيدر (مش بانر نص - النص كان اتشال قصداً بطلب سابق، شوف
// الكومنت جوا شاشة الشات) بتظهر بس لو عدّى ١٢ ساعة (نفس VISIT_WINDOW_HOURS
// المستخدمة بالباك إند) من آخر مسح QR فعلي، وبتفتح ماسح QR داخل نفس
// الصفحة (InChatQrScanner تحت) بدل ما يطلع العميل من التطبيق أصلاً
const QR_REMINDER_WINDOW_MS = 3 * 60 * 1000; // ⚠️ مؤقت للتجربة - رجّعها لـ 12 * 60 * 60 * 1000 بعد ما تخلص

function QrRescanIcon({ visible, onClick }) {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      aria-label="امسح QR لتسجيل زيارة جديدة"
      title="امسح QR لتسجيل زيارة جديدة"
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.16)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="2" />
        <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" fill="currentColor" />
      </svg>
    </button>
  );
}

// ماسح QR جوا نفس صفحة الشات (بدل ما نطلع عالكاميرا الافتراضية تبع
// الجوال، يلي كان بيرجع يفتح رابط جديد بريفرش كامل للصفحة - وهاد بالظبط
// كان مصدر مشاكل "رجعني عالتسجيل" يلي حكينا عنها). بيتحقق إنه الكود
// الممسوح هو فعلاً رابط شات الويب تبع نفس هاد المحل بعلامة ?src=qr (نفس
// الرابط يلي getQrCode بـwebChat.controller.js بيولّده) قبل ما يعتبره
// مسح صحيح - مش أي كود QR عشوائي حاطينه قدام الكاميرا. الاعتماد على
// html5-qrcode (مكتبة خفيفة شغالة بمتصفح، بدون أي حاجة لتطبيق كاميرا خارجي)
function InChatQrScanner({ slug, onSuccess, onClose }) {
  const THEME = useContext(ThemeContext);
  const [status, setStatus] = useState("starting"); // starting | scanning | error
  const [errorText, setErrorText] = useState("");
  const scannerRef = useRef(null);
  const containerId = "wc-inchat-qr-reader";

  useEffect(() => {
    let cancelled = false;
    let html5QrCode = null;

    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (cancelled) return undefined;
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        return html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;

            let isValid = false;
            try {
              const url = new URL(decodedText);
              isValid = url.pathname === `/chat/${slug}` && url.searchParams.get("src") === "qr";
            } catch {
              isValid = false;
            }

            if (!isValid) {
              setErrorText("هاد مش كود QR الخاص فينا - جرب تمسح الكود الموجود بالمحل مباشرة");
              return;
            }

            cancelled = true;
            html5QrCode
              .stop()
              .catch(() => {})
              .finally(() => onSuccess());
          },
          () => {
            // فريم ما لقى فيه كود - عادي جداً وبيصير كل فريم، مش خطأ
            // حقيقي نعرضه للعميل
          }
        );
      })
      .then(() => {
        if (!cancelled) setStatus("scanning");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setErrorText(
          err?.name === "NotAllowedError"
            ? "لازم تسمح بصلاحية الكاميرا من إعدادات المتصفح عشان تقدر تمسح الكود"
            : "تعذّر تشغيل الكاميرا - جرب تاني"
        );
      });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerRef.current?.clear?.();
            } catch {
              // تجاهل
            }
          });
      }
    };
  }, [slug, onSuccess]);

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 14, textAlign: "center" }}>
        وجّه الكاميرا على كود QR الموجود بالمحل
      </div>
      <div
        id={containerId}
        style={{
          width: "min(320px, 88vw)",
          aspectRatio: "1 / 1",
          borderRadius: 20,
          overflow: "hidden",
          border: `2px solid ${THEME.accent || "#25D366"}`,
        }}
      />
      {status === "starting" && (
        <div style={{ color: "#fff", opacity: 0.75, fontSize: 13, marginTop: 14 }}>جاري تشغيل الكاميرا...</div>
      )}
      {errorText && (
        <div style={{ color: "#FCA5A5", fontSize: 13, marginTop: 14, textAlign: "center", maxWidth: 320 }}>
          {errorText}
        </div>
      )}
      <button
        onClick={onClose}
        style={{
          marginTop: 22,
          border: "1.5px solid rgba(255,255,255,0.35)",
          background: "transparent",
          color: "#fff",
          borderRadius: 999,
          padding: "10px 26px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        إلغاء
      </button>
    </div>
  );
}

function IntroScreen({ name, establishmentName, logoUrl, onContinue, installBannerProps }) {
  const THEME = useContext(ThemeContext);
  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  const darkGreen = THEME.headerBg || "#64748B";
  const benefits = [
    { icon: <StarIcon />, title: "اجمع نقاط مع كل زيارة", text: "كل ما تزورنا وتتفاعل معنا، بتزيد نقاطك تلقائياً" },
    { icon: <CameraIcon />, title: "شارك صور وجباتك", text: "صور وجبتك وشاركنا فيها - نقاط إضافية بكل صورة" },
    { icon: <TicketIcon />, title: "هدايا وخصومات حصرية", text: "مفاجآت وعروض خاصة بأعضاء المجتمع بس" },
  ];

  return (
    <div
      dir="rtl"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(120% 80% at 50% 0%, ${THEME.accent ? THEME.accent + "0D" : "#64748B0D"} 0%, ${THEME.bgChat || "#F1F5F9"} 100%)`,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
      }}
    >
      <InstallBanner {...installBannerProps} />
      <div
        className="wc-scroll"
        style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 18px 12px" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 28,
            padding: "28px 22px 24px",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
            border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxSizing: "border-box",
            animation: "fadeScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* بادج "تطوير Kajo" - رفعناها لفوق البطاقة (قبل كانت سطر صغير
              باهت بآخر الشاشة، ممكن يضيع تحت السكرول) عشان تكون واضحة
              وظاهرة أول ما تفتح شاشة "أهلاً بكم" */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              background: `${darkGreen}12`,
              border: `1px solid ${darkGreen}30`,
              color: darkGreen,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            تطوير Kajo © {CURRENT_YEAR}
          </div>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: THEME.headerBgGrad || `linear-gradient(135deg, ${darkGreen} 0%, #064E3B 100%)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 28,
              overflow: "hidden",
              marginBottom: 16,
              // border: "4px solid #FFFFFF",
              // boxShadow: `0 12px 28px ${darkGreen}40`,
            }}
          >
            {logoUrl ? (
              <FadeInImage src={resolveImageUrl(logoUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (establishmentName || "؟").trim().charAt(0)
            )}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: THEME.textPrimary || "#0F172A", textAlign: "center", letterSpacing: "-0.02em" }}>
           أهلاً بكم ي  {firstName || "صديقنا"}!
          </div>
          <div style={{ fontSize: 13, color: THEME.textSecondary || "#64748B", marginTop: 6, marginBottom: 22, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
           أنت الآن جزء أصيل من مجتمع {establishmentName || "المطعم"} يمكنك الإستفادة بــ
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            {benefits.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  background: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 16,
                  padding: "13px 14px",
                  border: `1px solid ${THEME.border || "rgba(226, 232, 240, 0.8)"}`,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `${darkGreen}14`,
                    color: darkGreen,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.textPrimary || "#0F172A" }}>{b.title}</div>
                  <div style={{ fontSize: 11.5, color: THEME.textSecondary || "#64748B", marginTop: 2, lineHeight: 1.5 }}>{b.text}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onContinue}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "14.5px 0",
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              background: THEME.headerBg || "#64748B",
              cursor: "pointer",
              marginTop: 20,
              // boxShadow: `0 8px 20px ${darkGreen}45`,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              letterSpacing: "-0.01em",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            يلا نبدأ
          </button>
        </div>
      </div>

      <style>{`
        ${SCROLLBAR_HIDE_CSS}
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function WebChat() {
  const { slug } = useParams();
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [establishment, setEstablishment] = useState(null);
  const [connectionState, setConnectionState] = useState("connecting"); // connecting | connected | error | reconnecting
  // هل زيارة العميل الحالية خلصت (وصل لملخص نهاية الزيارة)؟ لو true،
  // بنقفل صندوق كتابة الرسائل (بس نص توضيحي بدل الحقل) - العميل لسا
  // يقدر يتصفح كل التبويبات التانية عادي (منيو/حسابي/هدايا...)، وردود
  // صاحب المنشأة اليدوية (sendAdminMessage) لسا توصله عادي كمان. بيرجع
  // ينفتح تلقائياً أول ما يمسح QR من جديد ويبلّش زيارة جديدة.
  const [chatLocked, setChatLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [botTyping, setBotTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatIdRef = useRef(null);
  const [chatId, setChatId] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // "home" | "chat" | "menu" | "account" | "about"
  // بيزيد بكل مرة يدوس فيها المستخدم على تبويب "المنيو" تحديداً - نستخدمه
  // كـtrigger لإعادة تشغيل حركة "الستارة" (شوف MenuCurtainReveal) كل مرة
  // يفتح فيها المنيو من جديد، مش بس أول مرة
  const [menuOpenCount, setMenuOpenCount] = useState(0);

  const storageKey = `${CHAT_ID_STORAGE_PREFIX}${slug}`;

  // هل الرابط الحالي جاي فعلياً من مسح QR (?src=qr - شوف getQrCode
  // بـwebChat.controller.js)؟ منقرأها مرة وحدة بس (lazy init) من رابط
  // الصفحة الأول ما تفتح. هاي العلامة هي أساس التفريق بين "زيارة فعلية
  // بالمطعم" و"فتح التطبيق المثبّت / رابط قديم / رابط متشارك" - شوف
  // isValidQrVisit بـwhatsapp.service.js بالباك إند لتفاصيل أكتر.
  //
  // بنحفظها كمان بـsessionStorage (خاصة بهاد التاب بس): لأنه تحت فيه
  // useEffect بيمسح ?src=qr من شريط العنوان فوراً بعد أول قراءة (عشان
  // مشاركة/حفظ الرابط بالمفضلة ما يفضل يعتبر "زيارة QR" بالمرات الجاية).
  // لو اعتمدنا على الـquery string وبس، أي ريفرش قبل ما ينحفظ chatId
  // (يعني قبل ما العميل يخلّص شاشة welcome) كان رح يخسر إشارة viaQr
  // ويطلعله "لازم تمسح QR" بدل شاشة الشات الفعلية - رغم إنه نفس الجلسة
  // نفسها جاية أصلاً من مسح QR حقيقي. sessionStorage بتضل موجودة عبر
  // الريفرش بس بتنمسح لو سكّر التاب/فتح من جديد - فالحماية الأصلية (منع
  // رابط متشارك من احتساب زيارة) ضلّت شغالة زي ما هي.
  const viaQrSessionKey = `webchat_via_qr_${slug}`;
  // وقت آخر مسح QR فعلي (مش مسح وهمي/رابط قديم) - بنستخدمه لاحقاً لتحديد
  // إظهار أيقونة "امسح QR" بعد ١٢ ساعة (شوف QrRescanIcon/showQrRescanIcon تحت)
  const lastQrScanKey = `lotality_last_qr_scan:${slug}`;
  // نافذة زمنية معقولة (ساعة) نعتبر خلالها "آخر مسح QR" لسا حديث بما
  // فيه الكفاية - عشان لو مسح QR بالمتصفح، وقبل ما يخلّص التسجيل ثبّت
  // الاختصار وفتحه، الاختصار (سياق منفصل عن التاب الأصلي، بس بيتشارك
  // نفس localStorage تبع نفس الأصل) يقدر "يفهم" إنه أصلاً مسح QR قبل
  // شوي، ويوريه خطوات التسجيل بدل ما يطلب منه يمسح من جديد
  const QR_SCAN_RECENCY_MS = 60 * 60 * 1000; // ساعة وحدة
  const [viaQr] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("src") === "qr";
    if (fromUrl) {
      try {
        sessionStorage.setItem(viaQrSessionKey, "1");
        localStorage.setItem(lastQrScanKey, String(Date.now()));
      } catch {
        // تجاهل - لو sessionStorage مش متاح، بنكمل بس بدون استمرارية عبر الريفرش
      }
      return true;
    }
    try {
      if (sessionStorage.getItem(viaQrSessionKey) === "1") return true;
      const lastScan = Number(localStorage.getItem(lastQrScanKey)) || 0;
      return Date.now() - lastScan < QR_SCAN_RECENCY_MS;
    } catch {
      return false;
    }
  });

  // موقع جغرافي (اختياري) - منطلبه بأبكر وقت ممكن (فور ما نعرف إنه هاد
  // الاتصال جاي من مسح QR) عشان يكون جاهز لحظة ما نبعت "join"/رسائل
  // التسجيل. best-effort بحت: لو العميل رفض الصلاحية أو المتصفح ما بيدعمها
  // أو صار timeout، بنكمل عادي بدون موقع (شوف isValidQrVisit بالباك إند -
  // بيرجع للسلوك القديم لو ما فيه فروع محدّدة إحداثيات أصلاً، وإلا الزيارة
  // بس ما بتنحسب لحد ما يوصل موقع صحيح قريب من الفرع)
  const geoRef = useRef(null);
  useEffect(() => {
    if (!viaQr || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {
        // رفض الصلاحية / timeout / خطأ - بنكمل بدون موقع، مافي داعي نعطّل
        // المستخدم أو نظهرله أي خطأ لهيك
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [viaQr]);

  // كود إحالة اختياري (?ref=CODE بالرابط - شوف buildWebChatLink
  // بـreferral.controller.js بالباك إند، خاص بروابط/QR الإحالة زي "QR
  // مشاهير"). نفس منطق viaQr فوق بالضبط: منقرأها من الرابط أول مرة
  // ومنحفظها بـsessionStorage عشان تنجو من الريفرش بعد ما ينمسح ?ref من
  // شريط العنوان (شوف الـuseEffect تحت يلي بيمسح src/ref مع بعض).
  const referralSessionKey = `webchat_ref_${slug}`;
  const [referralCode] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) {
      try {
        sessionStorage.setItem(referralSessionKey, fromUrl);
      } catch {
        // تجاهل
      }
      return fromUrl;
    }
    try {
      return sessionStorage.getItem(referralSessionKey) || null;
    } catch {
      return null;
    }
  });

  // "welcome" = شاشة الترحيب (فورم الاسم/الرقم)، "registering" = شاشة تحميل
  // بسيطة أثناء ما التسجيل بيصير بالخلفية (بدون ما نوري المحادثة الفعلية)،
  // "intro" = شاشة ترحيبية بعد التسجيل (فكرة المجتمع وفوائده، بدون تفاصيل
  // أرقام)، "chat" = المحادثة الفعلية. لو عنده chatId محفوظ من قبل (زار
  // قبل هيك)، منتخطى كل هاي الشاشات ومنروح مباشرة للمحادثة.
  //
  // ⚠️ ملاحظة مهمة: قبل هيك كان في شاشة رابعة ("needQr") بتظهر لو ما
  // عنده chatId ولا وصل من رابط فيه علامة مسح QR فعلي - بس الاعتماد على
  // "تذكّر" إنه مسح QR (عبر sessionStorage/localStorage) طلع هش وغير
  // موثوق عبر سياقات مختلفة (متصفح عادي مقابل تطبيق مثبّت "مستقل" على
  // نفس الجهاز، خصوصاً على آيفون). فبسّطنا الموضوع: هلق دايماً منعرض
  // فورم التسجيل مباشرة (بدون ما نحاول نخمّن هل مسح QR فعلاً ولا لأ)،
  // والتحقق الحقيقي (هل مسح QR صحيح فعلاً + قريب من موقع الفرع لو
  // محدّد) صاير بالباك إند (isValidQrVisit بـwhatsapp.service.js) -
  // لو مش صحيح، البوت برد جوا نفس المحادثة "لازم تمسح QR..." بدل ما
  // نمنعه من الوصول لفورم التسجيل من الأساس.
  const [screen, setScreen] = useState(() => {
    if (localStorage.getItem(storageKey)) return "chat";
    return "welcome";
  });
  const [deliveryWhatsAppNumber, setDeliveryWhatsAppNumber] = useState("");
  const [promoText, setPromoText] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [welcomeName, setWelcomeName] = useState("");

  // بيانات الاسم/الرقم يلي جايين من شاشة الترحيب - بعد أول اتصال منبعتهم
  // تلقائياً كأنه العميل كتبهم بنفسه بالمحادثة (نفس منطق التسجيل الموجود
  // أصلاً - بدون ما يحتاج يكتب شي يدوي، وبدون ما نوريه شاشة المحادثة لحد
  // ما يخلص التسجيل فعلياً)
  const pendingRegistrationRef = useRef(null);
  // idle -> بعتنا الاسم ومستنيين رسالة طلب الرقم -> بعتنا الرقم -> done
  const registrationStepRef = useRef("idle");
  const [registrationError, setRegistrationError] = useState("");
  // هل بعتنا "رسالة تفعيل الزيارة" (زي مسح QR) لهاد الجلسة قبل هيك؟ -
  // بنستخدمها لعميل راجع (chatId موجود مسبقاً) عشان نحسب زيارة جديدة بس
  // مرة وحدة لكل اتصال، مش في كل مرة السوكيت يعيد الاتصال تلقائياً
  const visitTriggerSentRef = useRef(false);

  // ماسح QR داخل الشات (شوف QrRescanIcon/InChatQrScanner فوق) - showQrScanner
  // بيتحكم بظهور الكاميرا، وqrIconTick بس عداد بسيط بنزيده كل دقيقة (ومباشرة
  // بعد مسح ناجح) عشان useMemo تبع showQrRescanIcon تحته يعيد يتحقق من
  // الوقت المنقضي بدون ما نحتاج ريفرش كامل للصفحة
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrIconTick, setQrIconTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setQrIconTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // تثبيت PWA - installPromptEvent موجود بس على كروم/أندرويد (بعد ما
  // المتصفح يتأكد إنه الموقع مؤهّل: manifest + service worker + HTTPS).
  // isIOS لأنه آيفون سفاري ما بيدعم هاد الحدث إطلاقاً - بنعرضله تعليمات
  // يدوية بدل زر مباشر
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  // آيباد بـiPadOS 13+ بيبعت افتراضياً User-Agent متل ماك (Macintosh) مش
  // "iPad" صراحة - فالفحص العادي (iphone|ipad|ipod) لوحده كان رح يفوّته
  // ويعتبره جهاز مكتبي عادي، فما رح تبين إله تعليمات التثبيت إطلاقاً. هون
  // منضيف فحص إضافي: ماك + شاشة لمس (macOS الحقيقي ما عنده touch) = آيباد فعلياً
  const isIOS = useMemo(() => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    const isMacUA = /macintosh|mac os x/i.test(ua);
    const hasTouch = navigator.maxTouchPoints > 1;
    return isMacUA && hasTouch;
  }, []);
  // أندرويد - بنستخدمها كبديل احتياطي لما حدث "beforeinstallprompt" ما
  // ينطلق (متصفح غير كروم، أو متصفح داخلي بتطبيق) عشان لسا نقدر نعرض
  // تعليمات تثبيت يدوية بدل ما زر التثبيت يضل بلا أي فائدة على أندرويد
  const isAndroid = useMemo(() => /android/i.test(navigator.userAgent), []);
  const brandCacheKey = `webchat_brand:${slug}`;
  // أول مرة تفتح الصفحة (بعد أول تحميل ناجح)، منخزّن هوية المنشأة (شعار،
  // اسم، لون) محلياً - عشان لما العميل يرجع يفتح نفس الرابط مرة تانية
  // (نفس المتصفح)، أول فريم يبين بيكون فيه الشعار واللون الصحيحين مباشرة
  // بدل ما يبين اللون/الشكل الافتراضي العام لحد ما الطلب من السيرفر يوصل.
  // أول زيارة إطلاقاً لهاد المتصفح (ما في كاش بعد) هي الحالة الوحيدة يلي
  // لسا رح تشوف التحميل الافتراضي لحظة قبل ما البيانات الحقيقية توصل -
  // هاد أمر طبيعي (محتاجين نجيب البيانات من السيرفر أول مرة قبل ما نعرفها).
  const [earlyInfo, setEarlyInfo] = useState(() => {
    try {
      const cached = localStorage.getItem(brandCacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // الهوية البصرية الديناميكية - مبنية على menuPrimaryColor تبع هاي
  // المنشأة تحديداً (establishment من socket.io لو وصل، وإلا earlyInfo
  // من endpoint المعلومات الخفيف كبديل مؤقت لحد ما يوصل). كل مكوّن فرعي
  // بياخذها عن طريق useContext(ThemeContext) - مش import مباشر
  const THEME = useMemo(
    () => buildTheme(establishment?.menuPrimaryColor || earlyInfo?.menuPrimaryColor),
    [establishment?.menuPrimaryColor, earlyInfo?.menuPrimaryColor]
  );

  useEffect(() => {
    let savedChatId = null;
    try {
      savedChatId = localStorage.getItem(storageKey);
    } catch {
      // تجاهل - لو localStorage مش متاح، بنكمل بدون chatId (بيترتب عليه
      // إنه promoText المستهدف لعملاء معيّنين ما رح يظهر، بس ما بيوقف الصفحة)
    }
    fetchWebChatInfo(slug, savedChatId)
      .then((data) => {
        setDeliveryWhatsAppNumber(data?.deliveryWhatsAppNumber || "");
        setPromoText(data?.promoText || "");
        setPromotions(data?.promotions || []);
        setEarlyInfo(data);
        try {
          localStorage.setItem(
            brandCacheKey,
            JSON.stringify({ logoUrl: data?.logoUrl, name: data?.name, menuPrimaryColor: data?.menuPrimaryColor })
          );
        } catch {
          // تجاهل - الكاش تحسين إضافي بس، مش أساسي لعمل الصفحة
        }
      })
      .catch(() => {});
  }, [slug]);

  // منمسح ?src=qr من شريط العنوان فوراً بعد أول قراءة (مرة وحدة) - عشان
  // لو العميل ثبّت الصفحة بالمفضلة أو عمل مشاركة للرابط من هون، ما ينحفظش
  // فيها العلامة (فتبقى خاصة فعلياً بلحظة مسح الـQR الأصلية بس). قيمة
  // viaQr نفسها محفوظة بالـstate فوق، فهاد التنظيف ما بيأثر على قرارات
  // هاي الجلسة الحالية إطلاقاً.
  useEffect(() => {
    if (!viaQr && !referralCode) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("src");
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // تجاهل - ما بيأثر على شي جوهري
    }
  }, [viaQr, referralCode]);

  const pushMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...msg }]);
  }, []);

  // ============ Outbox محلي لرسائل النص ============
  // نفس فكرة offlineUploadQueue.js بس لرسائل النص بدل صور الوجبات: أي
  // رسالة عم نبعتها منخزّنها فوراً بـlocalStorage (مفتاح خاص بكل chatId)
  // *قبل* حتى ما نحاول نبعتها، ومنشيلها من هناك بس لما نتأكد فعلياً إنها
  // وصلت السيرفر وانحفظت (ack حقيقي من الباك إند، مش مجرد "استلمها
  // Socket.io"). هيك لو انقطع النت أو اتسكرت التاب قبل ما توصل، الرسالة
  // تضل محفوظة فعلياً وبتنبعت تلقائياً أول ما نرجع نتصل - بدل ما تعتمد
  // بس على تخزين Socket.io المؤقت بالذاكرة (RAM) اللي بيضيع لو سكّرت
  // التاب أو عملت ريفرش وانت أوفلاين.
  const OUTBOX_PREFIX = "webchat_outbox:";

  const loadOutbox = useCallback((chatId) => {
    if (!chatId) return [];
    try {
      const raw = localStorage.getItem(OUTBOX_PREFIX + chatId);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const saveOutboxList = useCallback((chatId, list) => {
    if (!chatId) return;
    try {
      if (list.length) localStorage.setItem(OUTBOX_PREFIX + chatId, JSON.stringify(list));
      else localStorage.removeItem(OUTBOX_PREFIX + chatId);
    } catch {
      // تجاهل - أسوأ حالة منفقد ضمان الإرسال التلقائي بس، الرسالة لسا
      // ظاهرة بالواجهة (بحالة pending) والعميل يقدر يعيد فتح الصفحة لاحقاً
    }
  }, []);

  // بتبعت رسالة وحدة من الـoutbox عبر الـsocket وبتستنى تأكيد (ack) حقيقي
  // من الباك إند إنه انحفظت (شوف client_message بـwebChat.service.js) -
  // بمهلة قصوى 6 ثواني، وإلا نعتبرها فشلت ونسيبها بالـoutbox لمحاولة
  // لاحقة بدل ما نعلّق بانتظارها للأبد
  const sendQueuedMessage = useCallback((entry) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        resolve(false);
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }, 6000);
      socket.emit("client_message", { text: entry.text, clientMsgId: entry.clientMsgId, geo: geoRef.current }, (ack) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(Boolean(ack && ack.ok));
      });
    });
  }, []);

  // بتحاول تفضّي كل الرسائل المتراكمة بالـoutbox بالترتيب (وحدة وحدة) -
  // بتتنادى أول ما نتصل/نرجع نتصل بنجاح (شوف "joined" تحت)، عشان أي
  // رسالة كانت عالقة وقت انقطاع النت تنبعت تلقائياً بدون ما العميل
  // يحتاج يعمل أي شي أو حتى ينتبه إنه صار انقطاع أصلاً
  const flushOutbox = useCallback(
    async (chatId) => {
      const id = chatId || chatIdRef.current;
      if (!id) return;
      const list = loadOutbox(id);
      for (const entry of list) {
        const ok = await sendQueuedMessage(entry);
        if (!ok) break; // منحافظ على الترتيب - منوقف هون ومنكمل بمحاولة الفلاش الجاية
        const remaining = loadOutbox(id).filter((e) => e.clientMsgId !== entry.clientMsgId);
        saveOutboxList(id, remaining);
        setMessages((prev) => prev.map((m) => (m.clientMsgId === entry.clientMsgId ? { ...m, pending: false } : m)));
      }
    },
    [loadOutbox, saveOutboxList, sendQueuedMessage]
  );

  useEffect(() => {
    if (screen !== "chat" && screen !== "registering") return; // لسا بشاشة الترحيب - ما في داعي نفتح اتصال

    const savedChatId = localStorage.getItem(storageKey);
    const socket = io(API_ORIGIN, { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { slug, chatId: savedChatId, viaQr, referralCode, geo: geoRef.current });
    });

    socket.on("joined", (data) => {
      // الباك إند بيتحقق إنه في حساب عميل فعلي وراء هاد الـchatId المحفوظ
      // (لو كان أصلاً محفوظ من قبل) - لو صاحب المنشأة حذف العميل من صفحة
      // "العملاء" بالداشبورد، هلق ما عاد في حساب حقيقي وراه، فبنصفّر كل
      // شي محلياً ونعامله كزائر جديد كلياً (لازم يمسح QR ويسجّل من الصفر)
      if (data.customerExists === false) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // تجاهل
        }
        chatIdRef.current = null;
        setChatId(null);
        setMessages([]);
        setEstablishment(null);
        socket.disconnect();
        setScreen("welcome");
        return;
      }

      chatIdRef.current = data.chatId;
      setChatId(data.chatId);
      localStorage.setItem(storageKey, data.chatId);
      setEstablishment(data);
      setConnectionState("connected");
      setChatLocked(Boolean(data.chatLocked));

      // بيرجع المحادثة السابقة كاملة من الباك إند (لو عميل راجع بنفس
      // الـchatId) - هيك المحادثة بتضل موجودة حتى لو عمل ريفرش للصفحة،
      // بدل ما تنمسح وتبلش فاضية من جديد كل مرة
      if (Array.isArray(data.history)) {
        const historyMessages = data.history.map((m) => ({ id: m.id, from: m.from, text: m.text, at: m.at }));
        // أي رسالة لسا بالـoutbox (اتبعتت بس ما توصل تأكيد إنها انحفظت -
        // مثلاً اتسكرت التاب والنت مقطوع) ما رح تكون جوا history (لأنها
        // أصلاً ما وصلت السيرفر بعد) - منضيفها يدوياً بحالة "pending" عشان
        // ما تختفي من قدام العميل، وبعدين منحاول نبعتها فوراً تحت
        const pendingOutbox = loadOutbox(data.chatId).map((e) => ({
          id: `pending-${e.clientMsgId}`,
          from: "me",
          text: e.text,
          at: e.at,
          clientMsgId: e.clientMsgId,
          pending: true,
        }));
        setMessages([...historyMessages, ...pendingOutbox]);
      }
      flushOutbox(data.chatId);

      // لو جاي من شاشة الترحيب (اسم/رقم جاهزين)، منبعت الاسم فوراً - هاي
      // أول رسالة "تواصل" بس (زي ما لو مسح QR لأول مرة)، والبوت هلق رح
      // يردّ برسالة ترحيب ويطلب الاسم رسمياً (مش هيك ماشي، شوف الشرح تحت).
      // ما منظهرها كفقاعة بالمحادثة (pushMessage) - هاي بس تريغر تقني
      // للبوت، مش رد حقيقي من العميل بعد؛ الفقاعة المرئية الوحيدة بتظهر
      // لما يُعاد إرسال الاسم فعلياً كجواب حقيقي (شوف "بوت_message" تحت)
      const pending = pendingRegistrationRef.current;
      if (pending) {
        registrationStepRef.current = "awaiting_welcome";
        socket.emit("client_message", { text: pending.name, silent: true, geo: geoRef.current });
      } else if (!visitTriggerSentRef.current) {
        // عميل راجع (chatId موجود مسبقاً) - يعني هاد مسح QR جديد على
        // طاولة، تماماً متل ما بوت الواتساب بيتعامل مع مسح QR متكرر: أي
        // "تواصل" جديد بيتفحص تلقائياً (نافذة الـ١٢ ساعة) ويُحسب زيارة
        // جديدة لو عدّت المدة، أو يتجاهل بصمت لو ضمن نفس الزيارة. هاي
        // الرسالة مش من كتابة العميل الفعلية، فما منظهرها بالمحادثة.
        visitTriggerSentRef.current = true;
        socket.emit("client_message", { text: "•" });
      }
    });

    socket.on("join_error", (err) => {
      setErrorMessage(err?.message || "تعذّر فتح المحادثة");
      setConnectionState("error");
    });

    socket.on("bot_message", (data) => {
      setBotTyping(false);
      pushMessage({ from: "bot", text: data.text, at: data.at });

      // كشف رسالة "ملخص نهاية الزيارة" (نص ثابت بالقالب، شوف
      // whatsapp.service.js) - لما توصل، معناها الزيارة خلصت فعلياً،
      // فمنقفل صندوق الإرسال فوراً (بدون ما ننتظر ريفرش/إعادة اتصال
      // جديدة عشان نعرف)
      if (typeof data.text === "string" && data.text.includes("انتهت زيارتك بنجاح")) {
        setChatLocked(true);
      }

      // لو كنا بمنتصف محاولة تسجيل (شاشة "جاري إنشاء حسابك...") ووصل رد
      // البوت "لازم تمسح رمز QR..." - معناها الباك إند رفض التسجيل لأنه
      // مش جاي فعلياً من مسح QR صحيح (isValidQrVisit بـwhatsapp.service.js).
      // بدون هالفحص، كنا رح نضل عالقين على شاشة التحميل للأبد بصمت.
      // فبنرجعه لشاشة الترحيب مع رسالة خطأ واضحة تفسّرله السبب.
      if (
        (registrationStepRef.current === "awaiting_welcome" || registrationStepRef.current === "awaiting_phone_request") &&
        typeof data.text === "string" &&
        data.text.includes("لازم تمسح رمز QR")
      ) {
        registrationStepRef.current = "idle";
        pendingRegistrationRef.current = null;
        setRegistrationError("لازم تمسح رمز QR الموجود بالمحل مباشرة عشان تقدر تسجّل - افتح كاميرا جوالك وامسحه من جديد.");
        setScreen("welcome");
        return;
      }

      // أول رد من البوت بيكون "أهلاً بكـ بمجتمع... يرجى تزويدي بالاسم" -
      // هاي أول "تواصل" بس، ما بتُعتبر الاسم بعد (نفس آلية بوت الواتساب
      // بالضبط: أول رسالة = زي مسح QR، والاسم الحقيقي لازم يجي كرسالة
      // تانية منفصلة). فمنبعت الاسم من جديد هلق، وهاد الرد هيك بيتم قبوله
      // فعلياً كاسم.
      if (registrationStepRef.current === "awaiting_welcome" && pendingRegistrationRef.current) {
        const name = pendingRegistrationRef.current.name;
        registrationStepRef.current = "awaiting_phone_request";
        // هاد التبادل كله صايرة وراء شاشة "جاري إنشاء حسابك..." (screen
        // === "registering")، يعني العميل مش شايف ولا رسالة منه أصلاً - فما
        // في داعي لأي تأخير اصطناعي (كان أصلاً بس عشان يحاكي إيقاع بشري
        // بمحادثة ظاهرة، وهاي مش ظاهرة إطلاقاً)
        pushMessage({ from: "me", text: name, at: new Date().toISOString() });
        socketRef.current?.emit("client_message", { text: name, silent: true, geo: geoRef.current });
        return;
      }

      // كشف رسالة "ابعتلنا رقم واتسابك" تلقائياً - لما تجي، منرد عليها
      // فوراً برقم الجوال يلي أخذناه بشاشة الترحيب، بدل ما ننتظر العميل
      // يكتبه يدوياً (هو أصلاً كتبه قبل شوي بالفورم)
      if (registrationStepRef.current === "awaiting_phone_request" && pendingRegistrationRef.current) {
        const looksLikePhoneRequest = data.text?.includes("رقمـ") || (data.text?.includes("رقم") && data.text?.includes("واتس"));
        if (looksLikePhoneRequest) {
          const phone = pendingRegistrationRef.current.phone;
          registrationStepRef.current = "awaiting_membership_confirmation";
          pushMessage({ from: "me", text: phone, at: new Date().toISOString() });
          socketRef.current?.emit("client_message", { text: phone, silent: true, geo: geoRef.current });
        }
      }

      // كشف رسالة "تم إنشاء عضويتك بنجاح" - هاي علامة إنه التسجيل خلص
      // فعلياً (الحساب اتعمل بقاعدة البيانات). وقتها بس منطلع من شاشة
      // "جاري إنشاء حسابك..." لشاشة الترحيب بفكرة المجتمع
      if (registrationStepRef.current === "awaiting_membership_confirmation" && data.text?.includes("إنشاء عضويت")) {
        registrationStepRef.current = "done";
        pendingRegistrationRef.current = null;
        setScreen("intro");
      }
    });

    socket.on("bot_typing", (data) => setBotTyping(Boolean(data?.typing)));

    socket.on("connect_error", () => {
      setConnectionState((prev) => (prev === "connected" ? "reconnecting" : "connecting"));
    });

    socket.on("disconnect", () => setConnectionState("reconnecting"));

    return () => {
      socket.disconnect();
    };
  }, [slug, storageKey, pushMessage, screen, viaQr, referralCode]);

  // نفس شرط "عدّت نافذة الزيارة" يلي الباك إند بيتحقق منه (VISIT_WINDOW_HOURS
  // بـwhatsapp.service.js، ١٢ ساعة افتراضياً) - بس هون بس عشان نقرر نوري
  // الأيقونة ولا لأ، مش قرار نهائي (القرار الحقيقي دايماً بالسيرفر)
  const showQrRescanIcon = useMemo(() => {
    if (screen !== "chat" || !chatId) return false;
    try {
      const lastScan = Number(localStorage.getItem(lastQrScanKey)) || 0;
      if (!lastScan) return false; // ما عنا مرجعية وقت حقيقية - ما منظهر الأيقونة
      return Date.now() - lastScan >= QR_REMINDER_WINDOW_MS;
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, chatId, lastQrScanKey, qrIconTick]);

  // بينفّذ لما مسح QR جوا الشات (InChatQrScanner) ينجح ويتحقق إنه فعلاً
  // كود هاد المحل - منبعت trigger زيارة جديدة عبر نفس الـsocket المفتوح
  // أصلاً (بدون أي reload)، بالظبط متل أول اتصال، بس هلق مع viaQr:true
  // طازة عشان isValidQrVisit بالباك إند يقبلها كزيارة حقيقية جديدة
  function handleQrRescanSuccess() {
    setShowQrScanner(false);
    try {
      localStorage.setItem(lastQrScanKey, String(Date.now()));
    } catch {
      // تجاهل
    }
    setQrIconTick((t) => t + 1); // يخفي الأيقونة فوراً لحد ما تعدي ١٢ ساعة تانية

    const emitVisitTrigger = (geo) => {
      socketRef.current?.emit("client_message", { text: "•", silent: true, geo, viaQr: true });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => emitVisitTrigger({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => emitVisitTrigger(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      emitVisitTrigger(null);
    }
  }

  function handleWelcomeSubmit({ name, phone }) {
    setRegistrationError("");
    pendingRegistrationRef.current = { name, phone };
    setWelcomeName(name);
    setScreen("registering");
  }

  // ربط manifest.json الخاص بهاي المنشأة تحديداً (اسمها/شعارها/لونها) -
  // لازم يكون ديناميكي لأنه المنصة multi-tenant، ما فيه ملف ثابت واحد
  // يصلح لكل المنشآت. منضيف/منحدّث وسم <link rel="manifest"> يدوياً.
  useEffect(() => {
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = `${API_ORIGIN}/api/web-chat/${slug}/manifest.json`;

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    // كان قبل مربوط بلون هوية المنشأة (THEME.headerBg) - بيلوّن شريط
    // الحالة (الوقت/البطارية/الشبكة) بالمتصفح ولون الخلفية خلف النوتش
    // بنفس لون المنشأة (أحمر، أخضر...)، وطلب إزالته - هلق ثابت أبيض
    // بغض النظر عن لون المنشأة
    themeMeta.content = "#ffffff";
  }, [slug]);

  // وسوم آيفون (Safari) الخاصة - manifest.json + display:"standalone" مش
  // كافيين لوحدهم على iOS؛ سفاري بتتجاهلهم تماماً ولازم وسوم apple-* يدوية
  // وإلا التطبيق بيفتح بشريط عنوان سفاري العادي حتى لو ضفته للشاشة الرئيسية
  // (بعكس أندرويد/كروم يلي بياخذ display من الـmanifest مباشرة)
  useEffect(() => {
    function setMeta(name, content) {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    }

    // yes = يفتح بدون أي شريط سفاري (شريط العنوان/الأدوات) لما يتفتح من
    // أيقونة الشاشة الرئيسية - هاد أساس المطلب "بدون شريط العنوان" لآيفون
    setMeta("apple-mobile-web-app-capable", "yes");
    // default = شريط الحالة (الوقت/البطارية) شفاف فوق محتوى الصفحة
    setMeta("apple-mobile-web-app-status-bar-style", "default");

    const displayName = establishment?.establishmentName || earlyInfo?.name;
    if (displayName) setMeta("apple-mobile-web-app-title", displayName);

    const logo = resolveImageUrl(establishment?.establishmentLogo || earlyInfo?.logoUrl);
    const iconHref = logo || `${API_ORIGIN}/api/web-chat/${slug}/fallback-icon.svg`;
    let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!touchIcon) {
      touchIcon = document.createElement("link");
      touchIcon.rel = "apple-touch-icon";
      document.head.appendChild(touchIcon);
    }
    touchIcon.href = iconHref;
  }, [slug, establishment?.establishmentName, establishment?.establishmentLogo, earlyInfo?.name, earlyInfo?.logoUrl]);

  // تسجيل الـService Worker مرة وحدة (شرط أساسي لـPWA + لازم له عشان
  // إشعارات Push تشتغل أصلاً)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.error("فشل تسجيل Service Worker:", err));
    }
  }, []);

  // التقاط حدث "قابل للتثبيت" (كروم/أندرويد بس - آيفون سفاري ما بيدعم
  // هاد الحدث إطلاقاً، لازم تثبيت يدوي من قائمة المشاركة) - بنمنع المتصفح
  // من عرض شريطه التلقائي الافتراضي، ومنحتفظ فيه لحد ما نستخدمه إحنا من
  // زر مخصّص بصفحة "الرئيسية"
  const isStandaloneNow = useMemo(
    () => Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone),
    []
  );

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPromptEvent(e);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
      // منحفظ "تم التثبيت" بشكل دائم بالـlocalStorage - عشان لو رجع فتح
      // رابط عادي بالمتصفح (مثلاً من مسح QR جديد) بزيارة لاحقة، نعرف إنه
      // أصلاً عنده اختصار مثبّت ونذكّره يرجعله (شوف InstalledAppHint تحت)
      try {
        localStorage.setItem(INSTALLED_FLAG_KEY, "1");
      } catch {
        // تجاهل
      }
    }
    window.addEventListener("appinstalled", handleAppInstalled);

    // لو أصلاً فاتح التطبيق المثبّت (مش المتصفح العادي)، ما في داعي نوريه
    // زر التثبيت إطلاقاً، وكمان نأكّد العلامة الدائمة لأنه أكيد مثبّت
    if (isStandaloneNow) {
      setIsAppInstalled(true);
      try {
        localStorage.setItem(INSTALLED_FLAG_KEY, "1");
      } catch {
        // تجاهل
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isStandaloneNow]);

  // أندرويد بس: العميل عنده اختصار مثبّت مسبقاً (زيارة سابقة) وهلق فاتح
  // الرابط من تبويب متصفح عادي (مش من جوا التطبيق المثبّت نفسه، مثلاً
  // بعد ما مسح QR من جديد) - منحاول نسلّم قرار "مين بيفتح هاد الرابط"
  // لنظام أندرويد نفسه عن طريق رابط intent:// بدل ما يضل الفتح محصور
  // جوا كروم؛ لو في WebAPK مسجّل لنفس النطاق (الحالة الطبيعية لو ثبّته
  // فعلياً من زر "ثبّت")، أندرويد بيعرضله يفتحه بالتطبيق مباشرة.
  // ⚠️ هاد اجتهاد بحدود الممكن تقنياً بس - آيفون (سفاري) ما عنده أي آلية
  // مكافئة إطلاقاً (قيد نظام أبل نفسه، مش إشي منقدر نتحايل عليه من
  // موقعنا)، وحتى بأندرويد النتيجة مش مضمونة ١٠٠٪ (بتعتمد على كروم فعلياً
  // سجّل WebAPK، وعلى تطبيق مسح الـQR نفسه إنه بيسلّم الرابط لنظام
  // التشغيل بدل ما يفتحه بمتصفح/WebView داخلي خاص فيه - أشياء برّا
  // سيطرتنا كموقع). منجرّبها مرة وحدة بس لكل تبويب (sessionStorage) عشان
  // نتجنب أي حلقة إعادة توجيه لو المحاولة رجّعت نفس الصفحة (fallback).
  useEffect(() => {
    if (isStandaloneNow || !isAndroid) return;
    let alreadyInstalled = false;
    try {
      alreadyInstalled = localStorage.getItem(INSTALLED_FLAG_KEY) === "1";
    } catch {
      return;
    }
    if (!alreadyInstalled) return;
    try {
      if (sessionStorage.getItem(PWA_HANDOFF_ATTEMPTED_KEY) === "1") return;
      sessionStorage.setItem(PWA_HANDOFF_ATTEMPTED_KEY, "1");
    } catch {
      return; // ما فينا نضمن عدم التكرار - أحسن ما نحاول أصلاً من حلقة محتملة
    }
    const current = window.location.href;
    const withoutScheme = current.replace(/^https?:\/\//, "");
    const intentUrl =
      `intent://${withoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;` +
      `category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(current)};end`;
    window.location.href = intentUrl;
  }, [isStandaloneNow, isAndroid]);

  async function handleInstallClick() {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === "accepted") setIsAppInstalled(true);
    setInstallPromptEvent(null);
  }

  // الاشتراك بإشعارات Push - بس لما نوصل فعلياً للمحادثة (مش بشاشة
  // الترحيب) وعندنا chatId، وبس مرة وحدة لكل chatId (ما منكرر الطلب كل
  // ما يفتح التاب لو أصلاً مشترك)
  useEffect(() => {
    if (screen !== "chat" || !chatId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    const alreadySubscribedKey = `lotality_push_subscribed:${chatId}`;
    if (localStorage.getItem(alreadySubscribedKey)) return;

    let cancelled = false;
    (async () => {
      try {
        const publicKey = await fetchVapidPublicKey();
        if (!publicKey || cancelled) return; // السيرفر ما فيه مفاتيح VAPID مضبوطة - نتجاهل بصمت

        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await subscribeToPush({ slug, chatId, subscription: subscription.toJSON() });
        localStorage.setItem(alreadySubscribedKey, "1");
      } catch (err) {
        console.error("تعذّر تفعيل إشعارات Push:", err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screen, chatId, slug]);

  // التمرير الذكي لأسفل القائمة
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBtn(isFarFromBottom);
  };

  function handleSend() {
    const text = draft.trim();
    if (!text || !chatIdRef.current) return;
    const clientMsgId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const at = new Date().toISOString();

    pushMessage({ from: "me", text, at, clientMsgId, pending: true });
    setDraft("");

    // منخزّن بالـoutbox *قبل* حتى ما نحاول نبعتها - لو النت مقطوع أو
    // اتسكرت التاب فوراً بعدها، الرسالة تضل محفوظة وبتنبعت تلقائياً أول
    // ما نرجع نتصل (شوف flushOutbox بحدث "joined")
    const list = loadOutbox(chatIdRef.current);
    list.push({ clientMsgId, text, at });
    saveOutboxList(chatIdRef.current, list);

    sendQueuedMessage({ clientMsgId, text }).then((ok) => {
      if (!ok) return; // بتضل بالـoutbox، رح تنبعت تلقائياً بمحاولة الفلاش الجاية
      const remaining = loadOutbox(chatIdRef.current).filter((e) => e.clientMsgId !== clientMsgId);
      saveOutboxList(chatIdRef.current, remaining);
      setMessages((prev) => prev.map((m) => (m.clientMsgId === clientMsgId ? { ...m, pending: false } : m)));
    });
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !chatIdRef.current) return;

    const previewUrl = URL.createObjectURL(file);
    pushMessage({ from: "me", text: "", imagePreview: previewUrl, at: new Date().toISOString() });

    setUploadingPhoto(true);
    try {
      await uploadWebChatMealPhoto({ slug, file, chatId: chatIdRef.current });
    } catch (err) {
      // "Failed to fetch" = فشل شبكة حقيقي (أوفلاين)، مش رفض من السيرفر
      // (اللي عنده رسالة عربية واضحة من err.message أصلاً) - بهاي الحالة
      // بس منستخدم Background Sync، لأنه ما في داعي نأجّل خطأ سيرفر حقيقي
      // (مثلاً صورة كبيرة/نوع غير مدعوم) لمحاولة لاحقة رح تفشل بنفس الشكل
      const isNetworkFailure = err instanceof TypeError;
      if (isNetworkFailure) {
        try {
          const queued = await queuePhotoForBackgroundSync({
            endpoint: `${API_ORIGIN}/api/web-chat/${slug}/photo`,
            slug,
            chatId: chatIdRef.current,
            file,
          });
          pushMessage({
            from: "system",
            text: queued
              ? "النت مقطوع مؤقتاً - رح تنرفع الصورة تلقائياً أول ما يرجع النت"
              : "النت مقطوع، وما قدرنا نحفظ الصورة للمحاولة لاحقاً على هاد المتصفح - جرب ترفعها يدوياً بعد رجوع النت",
            at: new Date().toISOString(),
          });
        } catch {
          pushMessage({ from: "system", text: "تعذّر رفع الصورة، جرب مرة أخرى", at: new Date().toISOString() });
        }
      } else {
        pushMessage({ from: "system", text: err.message || "تعذّر رفع الصورة، جرب مرة أخرى", at: new Date().toISOString() });
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  const headerInitial = useMemo(
    () => (establishment?.establishmentName || earlyInfo?.name || "؟").trim().charAt(0),
    [establishment, earlyInfo]
  );

  const installBannerProps = {
    canInstall: Boolean(installPromptEvent),
    isIOS,
    isAndroid,
    isAppInstalled,
    onInstallClick: handleInstallClick,
  };

  if (screen === "welcome") {
    return (
      <ThemeContext.Provider value={THEME}>
        <WelcomeScreen
          slug={slug}
          onSubmit={handleWelcomeSubmit}
          installBannerProps={installBannerProps}
          logoUrl={establishment?.establishmentLogo || earlyInfo?.logoUrl}
          establishmentName={establishment?.establishmentName || earlyInfo?.name}
          externalError={registrationError}
        />
      </ThemeContext.Provider>
    );
  }

  if (screen === "needQr") {
    return (
      <ThemeContext.Provider value={THEME}>
        <NeedQrScreen slug={slug} />
      </ThemeContext.Provider>
    );
  }

  if (screen === "registering") {
    return (
      <ThemeContext.Provider value={THEME}>
        <RegisteringScreen
          name={welcomeName}
          logoUrl={establishment?.establishmentLogo || earlyInfo?.logoUrl}
          establishmentName={establishment?.establishmentName || earlyInfo?.name}
        />
      </ThemeContext.Provider>
    );
  }

  if (screen === "intro") {
    return (
      <ThemeContext.Provider value={THEME}>
        <IntroScreen
          name={welcomeName}
          establishmentName={establishment?.establishmentName}
          logoUrl={establishment?.establishmentLogo || earlyInfo?.logoUrl}
          onContinue={() => {
            setActiveTab("chat");
            setScreen("chat");
          }}
          installBannerProps={{ ...installBannerProps, establishmentName: establishment?.establishmentName }}
        />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={THEME}>
    <div
      dir="rtl"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: THEME.bgChat,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'IBM Plex Sans Arabic', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <InstallBanner {...installBannerProps} establishmentName={establishment?.establishmentName} />
      <InstalledAppHint isStandaloneNow={isStandaloneNow} />
      <OfflineBanner connectionState={connectionState} />
      {/* تذكير مسح QR بعد ١٢ ساعة كان نص/بانر بالسابق واتشال بناءً على طلب
          صريح (كان مزعج). هلق بدله أيقونة صغيرة بالهيدر (QrRescanIcon) بس -
          بتفتح كاميرا داخل نفس الصفحة (InChatQrScanner) فيها العميل يمسح
          QR الحقيقي بالمحل ويسجّل زيارة جديدة بدون ما يطلع من التطبيق ولا
          يعمل reload كامل للصفحة. منطق قبول الزيارة نفسه (isValidQrVisit +
          VISIT_WINDOW_HOURS بالباك إند) ضل زي ما هو بدون أي تغيير */}

      {/* ----------------- الهيدر العلوي - بس بتبويب الشات ----------------- */}
      {activeTab === "chat" && (
      <header
        style={{
          background: "#075E54",
          color: "#fff",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 18,
            border: "1.5px solid rgba(255,255,255,0.2)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {(establishment?.establishmentLogo || earlyInfo?.logoUrl) ? (
            <FadeInImage
              src={resolveImageUrl(establishment?.establishmentLogo || earlyInfo?.logoUrl)}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            headerInitial
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {establishment?.establishmentName || earlyInfo?.name || "محادثة الدعم"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
            {connectionState === "connected" && !botTyping && "متصل الآن"}
            {connectionState === "connected" && botTyping && <span style={{ color: "#A7F3D0", fontWeight: 600 }}>يكتب الآن...</span>}
            {connectionState === "connecting" && "جاري الاتصال..."}
            {connectionState === "reconnecting" && "جاري إعادت الاتصال..."}
            {connectionState === "error" && <span style={{ color: "#FCA5A5" }}>عُطل في الاتصال</span>}
          </div>
        </div>

        <QrRescanIcon visible={showQrRescanIcon} onClick={() => setShowQrScanner(true)} />
      </header>
      )}

      {showQrScanner && (
        <InChatQrScanner slug={slug} onSuccess={handleQrRescanSuccess} onClose={() => setShowQrScanner(false)} />
      )}

      {activeTab === "home" ? (
        <HomeView
          logoUrl={establishment?.establishmentLogo}
          establishmentName={establishment?.establishmentName}
          promoText={promoText}
          promotions={promotions}
        />
      ) : activeTab === "account" ? (
        <AccountView slug={slug} chatId={chatId} />
      ) : activeTab === "coupons" ? (
        <CouponsView slug={slug} chatId={chatId} />
      ) : activeTab === "menu" ? (
        <MenuCurtainReveal
          trigger={menuOpenCount}
          THEME={THEME}
          logoUrl={establishment?.establishmentLogo || earlyInfo?.logoUrl}
          establishmentName={establishment?.establishmentName || earlyInfo?.name}
        >
          <div className="wc-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <PublicMenu slugProp={slug} hideDialog />
          </div>
        </MenuCurtainReveal>
      ) : activeTab === "about" ? (
        <DeliveryView
          deliveryWhatsAppNumber={deliveryWhatsAppNumber}
          establishmentName={establishment?.establishmentName || earlyInfo?.name}
          logoUrl={establishment?.establishmentLogo || earlyInfo?.logoUrl}
        />
      ) : (
      <>
      {/* غلاف position:relative محصور بحدود صندوق المحادثة بالضبط (مو
          الشاشة كلها) - عشان زر "النزول للأسفل" (تحت) ينحسب من جواه هو،
          مش من جوا حاوية الشاشة الكاملة زي ما كان قبل (كان بيطلع أحياناً
          خارج/فوق حدود صندوق المحادثة تبعاً لطول الفوتر/التبويبات) */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* ----------------- منطقة المحادثة ----------------- */}
      <main
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="wc-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          backgroundStyle: "flat",
          backgroundImage: `radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      >
        {connectionState === "error" && (
          <div
            style={{
              textAlign: "center",
              color: THEME.danger,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 14,
              padding: "12px 18px",
              margin: "auto",
              maxWidth: "85%",
              fontSize: 13.5,
              fontWeight: 500,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            {errorMessage || "تعذّر فتح المحادثة، يرجى التحديث."}
          </div>
        )}

        {messages.map((m) => {
          if (m.from === "system") {
            return (
              <div
                key={m.id}
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: THEME.textSecondary,
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 20,
                  padding: "5px 14px",
                  alignSelf: "center",
                  border: `1px solid ${THEME.border}`,
                  margin: "6px 0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {m.text}
              </div>
            );
          }

          const isMe = m.from === "me";

          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                maxWidth: "82%",
                marginInlineStart: isMe ? "auto" : 0,
                marginInlineEnd: isMe ? 0 : "auto",
                animation: "fadeIn 0.2s cubic-bezier(0, 0, 0.2, 1)",
              }}
            >
              <div
                style={{
                  background: isMe ? THEME.bubbleOut : THEME.bubbleIn,
                  borderRadius: 16,
                  borderTopRightRadius: isMe ? 4 : 16,
                  borderTopLeftRadius: isMe ? 16 : 4,
                  padding: "8px 12px 6px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                  border: `1px solid ${isMe ? "rgba(16, 185, 129, 0.15)" : THEME.border}`,
                  minWidth: 70,
                  position: "relative",
                }}
              >
                {m.imagePreview && (
                  <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: m.text ? 6 : 2 }}>
                    <img loading="lazy" src={m.imagePreview} alt="" style={{ width: "100%", maxWidth: 260, height: "auto", display: "block" }} />
                  </div>
                )}

                {m.text && (
                  <div style={{ fontSize: 14.5, color: THEME.textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.55, wordBreak: "break-word" }}>
                    {renderWhatsAppText(m.text)}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 3 }}>
                  <span style={{ fontSize: 10.5, color: THEME.textSecondary, opacity: 0.85 }}>{formatTime(m.at)}</span>
                  {isMe && (m.pending ? <PendingClockIcon color={THEME.textSecondary} /> : <CheckDoubleIcon color={THEME.headerBg} />)}
                </div>
              </div>
            </div>
          );
        })}

        {/* كبسولة يكتب الآن */}
        {botTyping && (
          <div style={{ display: "flex", maxWidth: "80%", marginInlineEnd: "auto" }}>
            <div
              style={{
                background: THEME.bubbleIn,
                borderRadius: 16,
                borderTopLeftRadius: 4,
                padding: "12px 16px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                border: `1px solid ${THEME.border}`,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: THEME.accent,
                    display: "inline-block",
                    animation: "typing-bounce 1.4s infinite ease-in-out",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* زر الانتقال السريع لأسفل - جوا نفس الغلاف يلي لفينا فيه main
          فوق، فـbottom/left هون محسوبين نسبةً لحدود صندوق المحادثة نفسه
          بالضبط، مش الشاشة كلها */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          aria-label="النزول للأسفل"
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff",
            border: `1px solid ${THEME.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: THEME.textSecondary,
            zIndex: 5,
            transition: "all 0.2s ease",
          }}
        >
          <ArrowDownIcon />
        </button>
      )}
      </div>

      {/* ----------------- شريط الإدخال السفلي ----------------- */}
      <footer
        style={{
          padding: "10px 14px 14px",
          background: "#FFFFFF",
          borderTop: `1px solid ${THEME.border}`,
          flexShrink: 0,
        }}
      >
        {chatLocked ? (
          // الزيارة الحالية خلصت (وصل لملخص نهاية الزيارة) - صندوق
          // الإرسال مقفول، بس العميل لسا يقدر يتصفح باقي التبويبات عادي
          // (منيو/حسابي/هدايا/ديلفري)، ولو صاحب المنشأة بعتله رسالة
          // يدوية لسا رح توصله عادي
          <div
            style={{
              maxWidth: 800,
              margin: "0 auto",
              textAlign: "center",
              fontSize: 12.5,
              color: THEME.textSecondary,
              background: THEME.bgChat,
              borderRadius: 14,
              padding: "12px 16px",
              lineHeight: 1.8,
            }}
          >
            خلصت زيارتك الحالية 🎉 امسح رمز QR بزيارتك الجاية عشان تكمّل حكيك من جديد مع البوت
          </div>
        ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: 800, margin: "0 auto" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            style={{ display: "none" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={connectionState !== "connected" || uploadingPhoto}
            aria-label="ارفع صورة"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "none",
              background: THEME.bgChat,
              color: THEME.headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: connectionState === "connected" && !uploadingPhoto ? "pointer" : "not-allowed",
              flexShrink: 0,
              opacity: uploadingPhoto ? 0.5 : 1,
              transition: "background 0.2s ease, transform 0.1s ease",
            }}
          >
            <CameraIcon />
          </button>

          <div
            style={{
              flex: 1,
              background: THEME.bgChat,
              borderRadius: 16,
              padding: "4px 14px",
              display: "flex",
              alignItems: "center",
              border: `1px solid ${THEME.border}`,
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={connectionState === "connected" ? "اكتب رسالتك..." : "بانتظار الاتصال..."}
              disabled={connectionState !== "connected"}
              rows={1}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14.5,
                fontFamily: "inherit",
                resize: "none",
                maxHeight: 100,
                padding: "8px 0",
                color: THEME.textPrimary,
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={connectionState !== "connected" || !draft.trim()}
            aria-label="إرسال"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "none",
              background: draft.trim() && connectionState === "connected" ? THEME.accent : "#E5E7EB",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: draft.trim() && connectionState === "connected" ? "pointer" : "default",
              flexShrink: 0,
              transition: "all 0.2s ease",
              transform: draft.trim() ? "scale(1)" : "scale(0.96)",
            }}
          >
            <SendIcon />
          </button>
        </div>
        )}
      </footer>
      </>
      )}

      {/* ----------------- شريط تبويبات سفلي (الشات / حسابي) ----------------- */}
      <nav
        style={{
          display: "flex",
          borderTop: `1px solid ${THEME.border}`,
          background: "#fff",
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { key: "home", label: "الرئيسية", icon: <HomeIcon /> },
          { key: "chat", label: "الرسائل", icon: <ChatIcon /> },
          { key: "menu", label: "المنيو", icon: <MenuIcon /> },
          { key: "coupons", label: "الهدايا", icon: <TicketIcon /> },
          { key: "account", label: "حسابي", icon: <PersonIcon /> },
          { key: "about", label: "ديلفري", icon: <DeliveryIcon /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "menu") setMenuOpenCount((n) => n + 1);
            }}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "9px 0 8px",
              cursor: "pointer",
              color: activeTab === tab.key ? THEME.accent : THEME.textSecondary,
              fontWeight: activeTab === tab.key ? 700 : 500,
              transition: "color 0.15s ease",
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 11.5 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ textAlign: "center", fontSize: 10, color: THEME.textSecondary, opacity: 0.6, padding: "4px 0 6px", paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))", background: "#fff" }}>
        تطوير Kajo — © {CURRENT_YEAR} جميع الحقوق محفوظة
      </div>

      {/* ----------------- Keyframes Styles ----------------- */}
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        textarea::placeholder {
          color: #9CA3AF;
        }
        ${SCROLLBAR_HIDE_CSS}
      `}</style>
    </div>
    </ThemeContext.Provider>
  );
}