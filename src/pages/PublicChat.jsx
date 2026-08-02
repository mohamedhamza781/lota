import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  InputBase,
  Paper,
  CircularProgress,
  Stack,
} from "@mui/material";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { rtlCache } from "../theme/rtlCache";
import { publicMenuApi } from "../api/publicMenu";
import { resolveImageUrl } from "../api/uploads";

// =====================================================================
// PublicChat — واجهة شات شبيهة بالواتساب، بتفتح عبر QR خاص فيها كل منشأة
// (/c/:slug). نفس رحلة العميل ونفس نصوص الرسائل المستخدمة سابقاً ببوت
// الواتساب الحقيقي (شوف whatsapp.service.js و followUp.service.js
// بالباك إند) — بس هون الرحلة شغالة بالكامل على المتصفح (frontend-only
// simulation) كخطوة أولى لبناء الواجهة. الخطوة الجاية: ربطها بـ API
// حقيقي بالباك إند بدل المحاكاة، ثم تحويلها PWA + Push Notifications.
// =====================================================================

// نقاط تفاعل افتراضية للعرض/الديمو - بالنسخة الحقيقية لازم تجي من إعدادات
// كل منشأة (establishment.engagementPoints) عبر endpoint جديد بالباك إند
const DEMO_POINTS = { signup: 10, visit: 5, mealPhoto: 15, rating: 10, complaint: 20 };

const WHATSAPP_GREEN = "#00a884";
const WHATSAPP_HEADER = "#075e54";
const WHATSAPP_BG = "#efeae2";
const BUBBLE_IN = "#ffffff";
const BUBBLE_OUT = "#d9fdd3";

function formatPoints(n) {
  return Number(n || 0).toLocaleString("ar");
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

function generateMembershipCode(establishmentName) {
  const prefix = (establishmentName || "").trim().replace(/\s+/g, "") || "MB";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

function isAffirmative(body) {
  const normalized = (body || "").trim().toLowerCase();
  return /^(نعم|ايوا|أيوا|ايوة|أيوة|اه|أه|yes|y|ok|تمام|خلص|خلصت)/.test(normalized);
}

function looksLikePhoneNumber(text) {
  const digits = (text || "").replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

// خلفية شبيهة بخلفية الواتساب (نقشة خفيفة متكررة) بدون أي صورة/ملف خارجي
const WHATSAPP_PATTERN = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="${WHATSAPP_BG}"/>
  <g fill="#e2dcd4" opacity="0.6">
    <circle cx="10" cy="10" r="1.4"/><circle cx="35" cy="22" r="1.1"/>
    <circle cx="60" cy="8" r="1.6"/><circle cx="85" cy="30" r="1.2"/>
    <circle cx="20" cy="55" r="1.3"/><circle cx="48" cy="70" r="1.1"/>
    <circle cx="75" cy="60" r="1.5"/><circle cx="92" cy="88" r="1.2"/>
    <circle cx="15" cy="90" r="1.1"/><circle cx="55" cy="40" r="1"/>
  </g>
</svg>`)}`;

export default function PublicChat() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [establishment, setEstablishment] = useState(null);

  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [flow, setFlow] = useState("boot"); // شوف حالات الآلة تحت
  const [customerName, setCustomerName] = useState("");
  const [pointsBalance, setPointsBalance] = useState(0);
  const [membershipCode, setMembershipCode] = useState("");
  const [visitTotals, setVisitTotals] = useState({ signup: 0, mealPhoto: 0, rating: 0 });

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const startedRef = useRef(false);

  const theme = useMemo(
    () =>
      createTheme({
        direction: "rtl",
        palette: { primary: { main: establishment?.menuPrimaryColor || WHATSAPP_HEADER } },
        typography: { fontFamily: `"Segoe UI","Cairo",Tahoma,Arial,sans-serif` },
      }),
    [establishment?.menuPrimaryColor]
  );

  // ---------- تحميل بيانات المنشأة (اسم/لوقو/لون) ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    publicMenuApi
      .getMenu(slug)
      .then((data) => {
        if (cancelled) return;
        setEstablishment(data?.establishment || null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // ---------- أدوات إرسال رسائل البوت مع مؤشر "يكتب الآن" ----------
  const pushMessage = useCallback((from, content) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, from, ...content, time: new Date() },
    ]);
  }, []);

  const botSay = useCallback(
    (text) =>
      new Promise((resolve) => {
        const typingMs = Math.min(1800, 300 + text.length * 12);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          pushMessage("bot", { type: "text", text });
          resolve();
        }, typingMs);
      }),
    [pushMessage]
  );

  const botSayMany = useCallback(
    async (texts) => {
      for (let i = 0; i < texts.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await botSay(texts[i]);
        if (i < texts.length - 1) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
        }
      }
    },
    [botSay]
  );

  // ---------- بداية المحادثة: رسالة الترحيب (نفس نص welcomeMessageText) ----------
  useEffect(() => {
    if (loading || notFound || !establishment || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      await botSay(
        `أهلاً بكــــــــ في مجتمع ${establishment.name} 🫶🏻 \n` +
          `يسعدنا انضمامك إلى المجتمع 🌿\n\n` +
          `كــــل زيارة للمطعم تعني نقاط أكثر \n\n` +
          `لتكون جزء من هذا المجتمع \n` +
          `يُرجى تزويدي بالإسم الكريم 〽️`
      );
      setFlow("awaiting_name");
    })();
  }, [loading, notFound, establishment, botSay]);

  // ---------- معالجة رسالة نصية أرسلها الزبون حسب حالة الرحلة ----------
  const handleUserText = useCallback(
    async (body) => {
      if (!establishment) return;

      if (flow === "awaiting_name") {
        if (body.trim().length < 2) {
          await botSay("ممكن تبعت اسمك كامل عشان نسجلك؟ 🙏");
          return;
        }
        const name = body.trim();
        setCustomerName(name);
        await botSay(
          `شكراً | ${name}\n` +
            `لإنضمامك لمجتمع ${establishment.name} تجربة ممتعة نتمناها لكــــــ داخل صالات المطعم 🌿\n\n\n` +
            `للحصول على نقاطـــ الــزيارة \n` +
            `الأولى تابع خطوات الإنضمام\n` +
            `لمجتمع ${establishment.name} ™️`
        );
        await botSay(
          `${name} | لضمان تحقيق\n` +
            `تواصل فاعل داخل مجتمع ${establishment.name}\n\n` +
            `يرجي تزويدي برقمــــــ الواتســـــ\n` +
            `الخاص فيكم مع المقدمـة الدولية\n\n` +
            `شكراً لكم 🌹🫡`
        );
        setFlow("awaiting_phone");
        return;
      }

      if (flow === "awaiting_phone") {
        const phone = looksLikePhoneNumber(body);
        if (!phone) {
          await botSay("ممكن تكتب رقم واتسابك بالأرقام بس (مثلاً 972521234567)؟ 🙏");
          return;
        }
        const code = generateMembershipCode(establishment.name);
        setMembershipCode(code);
        setPointsBalance(DEMO_POINTS.signup);
        setVisitTotals((v) => ({ ...v, signup: DEMO_POINTS.signup }));
        await botSay(
          `أهلاً بكم | ${customerName}  🫶🏻\n` +
            `تم إنشاء عضويتكـــ في مجتمع ${establishment.name}  بنجاح\n\n` +
            ` رمز العضوية الخاص بك : [${code}]\n\n` +
            `مباركـ لقد حصلت على :\n` +
            ` ${formatPoints(DEMO_POINTS.signup)} نقطة  تضاف إلى\n\n` +
            `رصيد نقاطكـ في \n` +
            `مجتمع ${establishment.name}™️\n\n` +
            `كل زيارة جديدة وتفاعل مع المجتمع تزيد من فرصـــــــة جمع نقاطــــ أعلى للحصول على مكافئات  أكثر\n \n` +
            `نتمنى لك تجربة ممتعة مع مجتمع ${establishment.name} ™️ ❤️`
        );
        await new Promise((r) => setTimeout(r, 900));
        await botSay(
          `${customerName} 🌿✨ \n` +
            `على الأكيد قمتم بـ اختيار الوجبة\n\n` +
            `لزيادة عدد نقاطكم في \n` +
            `المجتمع شاركنــــــا 👇🏻\n\n` +
            `* صورة الوجبة  🌮 \n\n` +
            `ملاحظة\n` +
            `كـل ما كانت الصورة احترافية أكثر وتبرز تفاصيــــل وجــمال الوجبــــة تزيد من فرصـــــــــة حصولكم على نقاط أعلى \n\n\n` +
            `في انتظار الصورة لا تنسى \n` +
            `صورة مميزة يعني نقاط أعلى وأكثر`
        );
        setFlow("awaiting_photo");
        return;
      }

      if (flow === "awaiting_photo") {
        // بالواتساب الحقيقي هون لازم صورة فعلية - بالواجهة منرجع نفس رسالة
        // الطلب الأصلية بالحرف (مطابق لمنطق handlePhotoResponse)
        await botSay(
          `${customerName} 🌿✨ \n` +
            `على الأكيد قمتم بـ اختيار الوجبة\n\n` +
            `لزيادة عدد نقاطكم في \n` +
            `المجتمع شاركنــــــا 👇🏻\n\n` +
            `* صورة الوجبة  🌮 \n\n` +
            `ملاحظة\n` +
            `كـل ما كانت الصورة احترافية أكثر وتبرز تفاصيــــل وجــمال الوجبــــة تزيد من فرصـــــــــة حصولكم على نقاط أعلى \n\n\n` +
            `في انتظار الصورة لا تنسى \n` +
            `صورة مميزة يعني نقاط أعلى وأكثر`
        );
        return;
      }

      if (flow === "awaiting_meal_name") {
        if (body.trim().length < 2) {
          await botSay("ممكن تكتبلنا اسم الأكلة؟ 🙏");
          return;
        }
        await botSay("يعطيك العافية 🌟");
        await new Promise((r) => setTimeout(r, 900));
        await botSay(
          `${customerName} 🌿🌹 \n` +
            `لضمان تجربة فاعلة وحقيقة \n` +
            `أخبرنا كيف كانت تجربتكــــ\n` +
            `اليوم ؟! \n\n\n` +
            `* هل هُناك أي ملاحظات \n` +
            `* هل هُناك أي شـــــكاوي\n` +
            `* هل هُناك أي مـقترحات \n\n\n` +
            `شاكرين لكم وقتكم الثمين لكن مشاركتكم مهمة لضمان جودة أعلى وخدمــة أفضل`
        );
        setFlow("awaiting_rating");
        return;
      }

      if (flow === "awaiting_rating") {
        const ratingMatch = body.match(/\b[1-5]\b/);
        const ratingValue = ratingMatch ? parseInt(ratingMatch[0], 10) : null;
        const isComplaint = ratingValue !== null && ratingValue <= 2;
        const ratingPoints = isComplaint ? DEMO_POINTS.complaint : DEMO_POINTS.rating;
        const newBalance = pointsBalance + ratingPoints;
        setPointsBalance(newBalance);
        setVisitTotals((v) => ({ ...v, rating: ratingPoints }));

        await botSay(
          isComplaint
            ? `يعطيك العافية على صراحتك 🙏 آسفين إنه تجربتك ما كانت بالمستوى المطلوب، ملاحظتك وصلتنا وراح نشتغل عليها.\n` +
                `تعويضاً عن هيك، مبارك حصلت على ${formatPoints(ratingPoints)} نقاط 🥳\n` +
                `رصيدك الحالي: ${formatPoints(newBalance)} نقطة`
            : `شكراً لكم على وقتكم 🕚 \n` +
                `وعلى تقيمكم لتجربة الزيارة\n` +
                `الأولى لـ مطعم ${establishment.name}\n\n` +
                `لقد حصلت على ${formatPoints(ratingPoints)} نقاطـــ \n` +
                `مقابل استمرار تفاعلك داخل \n` +
                `المجتمع\n\n` +
                `رصيد نقاطك الحالي: ${formatPoints(newBalance)} نقطة\n` +
                `مجتمع ${establishment.name} ™️`
        );
        await new Promise((r) => setTimeout(r, 900));
        await botSay(
          `${customerName} !،.\n` +
            `هل انتهت زيارتكـ لمطعم \n` +
            `${establishment.name} لهذا اليوم؟! \n\n` +
            `أخبرني فور إنتهاء الزيارة\n` +
            `بكلمة نعم 🌹🫡`
        );
        setFlow("awaiting_visit_end");
        return;
      }

      if (flow === "awaiting_visit_end") {
        if (!isAffirmative(body)) {
          await botSay(
            `نتمنى لكم في ${establishment.name}\n` +
              `مزيداً من الأوقات الجملية\n\n` +
              `لا تنسى كرماً فور انتهاء الزيارة\n` +
              `إبلاغنا حتى تعرف إجمالي عدد\n` +
              `النقاط لهذه الزيارة 🙂‍↔️\n\n` +
              `فقط أكتب نعم فور الإنتهاء من\n` +
              `الزيارة ✨\n` +
              `مجتمع ${establishment.name} ™️`
          );
          return;
        }
        const total = visitTotals.signup + visitTotals.mealPhoto + visitTotals.rating;
        const lines = [`${customerName} | 😉`, "", "انتهت زيارتك بنجاح", "ملخص زيارتك اليوم", ""];
        if (visitTotals.signup) lines.push(`⭐ نقاط التسجيل: ${formatPoints(visitTotals.signup)}`);
        if (visitTotals.mealPhoto) lines.push(`⭐ نقاط الصورة: ${formatPoints(visitTotals.mealPhoto)}`);
        if (visitTotals.rating) lines.push(`⭐ نقاط التقيم: ${formatPoints(visitTotals.rating)}`);
        lines.push("");
        lines.push(`🎯 إجمالي النقاط المكتسبة:`);
        lines.push(`لهذه الزيارة ${formatPoints(total)} نقطة`);
        lines.push("");
        lines.push(`💰 رصيدك الحالي:`);
        lines.push(`${formatPoints(pointsBalance)} نقطة`);
        lines.push("");
        lines.push(
          `نتطلع لرؤيتك قريباً في ${establishment.name} في الزيارة الثانية كل زيارة جديدة تقربكـــ من مزايا أكثر ومكافآت أكبر`
        );
        lines.push("");
        lines.push(`مجتمع ${establishment.name} ™️`);
        await botSay(lines.join("\n"));
        setFlow("idle");
        return;
      }

      // idle / أي شي تاني - رسالة عامة افتراضية
      await botSay(`أهلاً 👋 لتنضم لبرنامج ولاء ${establishment.name}، تابع الخطوات فوق 🙏`);
    },
    [flow, establishment, customerName, pointsBalance, visitTotals, botSay]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    pushMessage("user", { type: "text", text });
    setInput("");
    handleUserText(text);
  }, [input, pushMessage, handleUserText]);

  // ---------- إرفاق صورة الوجبة ----------
  const handlePhotoPick = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const url = URL.createObjectURL(file);
      pushMessage("user", { type: "image", imageUrl: url });

      if (flow !== "awaiting_photo") return;
      (async () => {
        const mealPhotoPoints = DEMO_POINTS.mealPhoto;
        const newBalance = pointsBalance + mealPhotoPoints;
        setPointsBalance(newBalance);
        setVisitTotals((v) => ({ ...v, mealPhoto: mealPhotoPoints }));
        await new Promise((r) => setTimeout(r, 700));
        await botSay(
          `الصورة فعلاً مميزة ســــعداء\n` +
            `جداً لمشاركتك تجربتك الفنية\n` +
            `مع ${establishment.name} 🥰\n\n` +
            `مبارك لقد حصلتم على ${formatPoints(mealPhotoPoints)} نقاط \n` +
            `رصيد نقاطكـــ الحالي: ${formatPoints(newBalance)} نقطة\n\n` +
            `مجتمع ${establishment.name} ™️`
        );
        await new Promise((r) => setTimeout(r, 800));
        await botSay("ممكن تكتبلنا اسم الأكلة؟ 🙏");
        setFlow("awaiting_meal_name");
      })();
    },
    [flow, establishment, pointsBalance, pushMessage, botSay]
  );

  if (loading) {
    return (
      <Box sx={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !establishment) {
    return (
      <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, p: 3, textAlign: "center" }}>
        <StorefrontRoundedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
        <Typography variant="h6">ما لقينا هاد المطعم/المحل</Typography>
        <Typography color="text.secondary">تأكد إنك ماسح كود QR الصحيح 🙏</Typography>
      </Box>
    );
  }

  const logo = resolveImageUrl(establishment.logoUrl);

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <Box
          dir="rtl"
          sx={{
            height: "100dvh",
            width: "100%",
            maxWidth: 560,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            bgcolor: WHATSAPP_BG,
            overflow: "hidden",
          }}
        >
          {/* ===== هيدر شبيه بهيدر الواتساب ===== */}
          <Box
            sx={{
              bgcolor: WHATSAPP_HEADER,
              color: "#fff",
              px: 1.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              boxShadow: 2,
              flexShrink: 0,
            }}
          >
            <IconButton size="small" sx={{ color: "#fff" }}>
              <ArrowForwardIosRoundedIcon fontSize="small" />
            </IconButton>
            <Avatar src={logo || undefined} sx={{ width: 38, height: 38, bgcolor: "#fff", color: WHATSAPP_HEADER }}>
              {!logo && <StorefrontRoundedIcon fontSize="small" />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
                {establishment.name}
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.85, lineHeight: 1.3 }}>
                {typing ? "يكتب الآن..." : "متصل الآن"}
              </Typography>
            </Box>
            <IconButton size="small" sx={{ color: "#fff" }}>
              <SearchRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: "#fff" }}>
              <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* ===== منطقة الرسائل ===== */}
          <Box
            ref={scrollRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 1.5,
              py: 1.5,
              backgroundImage: `url("${WHATSAPP_PATTERN}")`,
              backgroundRepeat: "repeat",
            }}
          >
            <Stack spacing={0.75}>
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}
              {typing && <TypingBubble />}
            </Stack>
          </Box>

          {/* ===== شريط الإدخال ===== */}
          <Box sx={{ px: 1, py: 1, display: "flex", alignItems: "center", gap: 0.75, bgcolor: "#f0f0f0", flexShrink: 0 }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                borderRadius: 5,
                px: 1,
                py: 0.25,
                bgcolor: "#fff",
              }}
            >
              <IconButton size="small">
                <SentimentSatisfiedAltRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </IconButton>
              <InputBase
                placeholder="اكتب رسالة"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                sx={{ flex: 1, fontSize: 14, mx: 0.5 }}
              />
              <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                <AttachFileRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoPick}
              />
            </Paper>
            <IconButton
              onClick={input.trim() ? handleSend : () => fileInputRef.current?.click()}
              sx={{ bgcolor: WHATSAPP_GREEN, color: "#fff", "&:hover": { bgcolor: WHATSAPP_GREEN } }}
            >
              {input.trim() ? <SendRoundedIcon fontSize="small" /> : <CameraAltRoundedIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

function ChatBubble({ message }) {
  const isUser = message.from === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end" }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: "78%",
          bgcolor: isUser ? BUBBLE_OUT : BUBBLE_IN,
          borderRadius: 2,
          borderTopLeftRadius: isUser ? 2 : 12,
          borderTopRightRadius: isUser ? 12 : 2,
          px: message.type === "image" ? 0.5 : 1.25,
          py: message.type === "image" ? 0.5 : 0.75,
          position: "relative",
        }}
      >
        {message.type === "image" ? (
          <Box
            component="img"
            src={message.imageUrl}
            alt="صورة الوجبة"
            sx={{ maxWidth: "100%", maxHeight: 260, borderRadius: 1.5, display: "block" }}
          />
        ) : (
          <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{message.text}</Typography>
        )}
        <Stack direction="row" spacing={0.4} justifyContent="flex-end" alignItems="center" sx={{ mt: 0.25 }}>
          <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{formatTime(message.time)}</Typography>
          {isUser && <DoneAllRoundedIcon sx={{ fontSize: 13, color: "#53bdeb" }} />}
        </Stack>
      </Paper>
    </Box>
  );
}

function TypingBubble() {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: BUBBLE_IN,
          borderRadius: 2,
          borderTopRightRadius: 2,
          px: 1.5,
          py: 1,
          display: "flex",
          gap: 0.5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "text.disabled",
              animation: "typingBounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
              "@keyframes typingBounce": {
                "0%, 60%, 100%": { transform: "translateY(0)", opacity: 0.4 },
                "30%": { transform: "translateY(-4px)", opacity: 1 },
              },
            }}
          />
        ))}
      </Paper>
    </Box>
  );
}