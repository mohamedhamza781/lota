import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Dialog, DialogTitle, DialogContent, TextField, Button, Typography, Stack, Avatar } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { rtlCache } from "../theme/rtlCache";
import { buildPublicMenuTheme } from "../publicMenu/theme";
import MenuHero from "../publicMenu/components/MenuHero";
import Marquee from "../publicMenu/components/Marquee";
import MenuSection from "../publicMenu/components/MenuSection";
import Footer from "../publicMenu/components/Footer";
import { publicMenuApi } from "../api/publicMenu";
import { resolveImageUrl } from "../api/uploads";

import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

// هاي الصفحة العامة (بدون شريط جانبي أو مصادقة) اللي بيوصلها الزبون عبر
// /m/:slug. التصميم البصري (Brewhaus) ثابت ومشترك — هو "القالب" — لكن
// المحتوى (اسم المنشأة، الأقسام، الأصناف، الأسعار) بيتجاب لايف من الباك
// إند الحقيقي عبر /api/public/menu/:slug (بدون تسجيل دخول، لأنها راوتات
// عامة). ما بنعتمد على AuthContext هون خالص، لأنه زائر المنيو العام مش
// مسجّل دخوله أصلاً.
//
// slugProp/hideDialog: اختياريين - بيسمحوا نستخدم نفس الصفحة هاي (بالحرف،
// بدون ما نكرر أي كود) جوا تبويب "المنيو" بشات الويب. لما تكون الصفحة
// مضمّنة هيك، العميل أصلاً عنده حساب وبياناته موجودة، فمنتخطى نافذة "ادخل
// السحب واربح" تماماً (hideDialog=true) ومنستخدم slug مرّر كـprop بدل ما
// نعتمد على useParams (يلي بيشتغل بس بالمسار المستقل /m/:slug).
export default function PublicMenu({ slugProp, hideDialog = false } = {}) {
  const { slug: slugFromParams } = useParams();
  const slug = slugProp || slugFromParams;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [establishment, setEstablishment] = useState(null);
  const [menu, setMenu] = useState(null);
  const [promotions, setPromotions] = useState([]);
  // true لما نكون عم نعرض نسخة منيو محفوظة محلياً (فشل جلب نسخة طازة،
  // غالباً بسبب انقطاع نت) بدل ما تظهر "المنيو غير موجود" وهو موجود
  // فعلياً بس مش قادرين نجيبه هلق
  const [isStale, setIsStale] = useState(false);

  // ثيم المنيو - بلون هاي المنشأة تحديداً (menuPrimaryColor)، أو الأخضر
  // الافتراضي لو ما حدد صاحب المنشأة لون بعد
  const menuTheme = useMemo(() => buildPublicMenuTheme(establishment?.menuPrimaryColor), [establishment?.menuPrimaryColor]);

  const [unlocked, setUnlocked] = useState(hideDialog);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // مدة "قفل" نافذة التسجيل بعد أول مرة يعبّي فيها بياناته - ١٢ ساعة، عشان
  // نمنع التحايل (يرفرش الصفحة ويسجّل من جديد كل شوي لتكرار نقاط التسجيل)
  const REGISTRATION_LOCK_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    // لو نفس المتصفح سجّل قبل أقل من ١٢ ساعة لهاي المنشأة تحديداً، منفتح
    // المنيو مباشرة بدون ما نرجع نطلب اسمه ورقمه من جديد
    if (!hideDialog) {
      try {
        const lastUnlockedAt = Number(localStorage.getItem(`menuUnlocked:${slug}`) || 0);
        if (lastUnlockedAt && Date.now() - lastUnlockedAt < REGISTRATION_LOCK_MS) {
          setUnlocked(true);
        }
      } catch {
        // localStorage ممكن يكون معطّل (وضع خصوصية متشدد بالمتصفح مثلاً) -
        // مش مشكلة كبيرة، بس بيرجع يسأله كل مرة بهاي الحالة
      }
    }

    publicMenuApi
      .getMenu(slug)
      .then((data) => {
        if (cancelled) return;
        setEstablishment(data.establishment);
        setMenu(data.menu);
        setPromotions(data.promotions || []);
        setIsStale(false);
        try {
          localStorage.setItem(`webchat_menu_cache:${slug}`, JSON.stringify(data));
        } catch {
          // تجاهل - الكاش تحسين إضافي بس
        }
      })
      .catch(() => {
        if (cancelled) return;
        // فشل الطلب (غالباً انقطاع نت) - منرجع لآخر نسخة منيو محفوظة
        // محلياً بدل ما نعرض "المنيو غير موجود" وهو موجود فعلياً
        try {
          const cached = localStorage.getItem(`webchat_menu_cache:${slug}`);
          if (cached) {
            const data = JSON.parse(cached);
            setEstablishment(data.establishment);
            setMenu(data.menu);
            setPromotions(data.promotions || []);
            setIsStale(true);
            return;
          }
        } catch {
          // تجاهل
        }
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (!hideDialog) {
      publicMenuApi
        .getDialogConfig(slug)
        .then((config) => {
          if (cancelled) return;
          setDialogConfig(config);
          // لو صاحب المطعم عطّل نافذة الترحيب بالكامل، منفتح المنيو مباشرة
          // بدون ما نطلب اسم/رقم واتساب أصلاً
          if (config?.enabled === false) setUnlocked(true);
        })
        .catch(() => {
          // فشل جلب الإعدادات مش لازم يمنع عرض المنيو - منستخدم القيم
          // الافتراضية بالنافذة وخلاص
        });
    }
    return () => {
      cancelled = true;
    };
  }, [slug, hideDialog]);

  // رقم الواتساب لازم يكون بصيغة دولية كاملة (مقدمة الدولة + الرقم) وبمجموع
  // ١٢ رقم بالظبط (مثلاً 970599123456: كود الدولة 970 + رقم محلي 9 أرقام)
  function validatePhone(value) {
    const digits = (value || "").replace(/[^\d]/g, "");
    if (digits.length !== 12) {
      return "لازم يكون الرقم بمقدمة دولية (كود الدولة) بمجموع ١٢ رقم، مثال: 970599123456";
    }
    if (value.trim().startsWith("0")) {
      return "لا تبدأ الرقم بصفر - اكتب كود الدولة بدل الصفر (مثال: 970 بدل 0)";
    }
    return "";
  }

  const canSubmit = form.name.trim().length > 0 && form.whatsapp.trim().length > 0 && !phoneError;

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validatePhone(form.whatsapp);
    setPhoneError(err);
    if (err || !canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    // بيتسجّل كعميل حقيقي بدفتر المنشأة (source: menu_dialog)، ويظهر فورًا
    // بصفحة "العملاء" بلوحة المنشأة وبأرقام لوحة سوبر أدمن.
    publicMenuApi
      .submitLead(slug, { name: form.name.trim(), phone: form.whatsapp.trim().replace(/[^\d]/g, "") })
      .then(() => {
        setUnlocked(true);
        try {
          localStorage.setItem(`menuUnlocked:${slug}`, String(Date.now()));
        } catch {
          // مش مشكلة كبيرة لو ما قدرنا نخزّن - بس رح يرجع يسأله المرة الجاية
        }
      })
      .catch((err2) => setSubmitError(err2.message || "صار في خطأ، حاول مرة تانية"))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={menuTheme}>
          <Box
            dir="rtl"
            sx={{
              bgcolor: "#ffffff",
              minHeight: "100vh",
            }}
          />
        </ThemeProvider>
      </CacheProvider>
    );
  }

  if (notFound || !establishment || !menu) {
    return (
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={menuTheme}>
          <Box
            dir="rtl"
            sx={{
              bgcolor: "background.default",
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1.5,
              px: 3,
              textAlign: "center",
            }}
          >
            <SearchOffRoundedIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            <Typography variant="h5" sx={{ fontFamily: '"IBM Plex Sans Arabic"', color: "primary.main" }}>
              هاد المنيو مش موجود
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تأكد من الرابط — الصفحة يلي بتدوّر عليها مش متوفرة.
            </Typography>
          </Box>
        </ThemeProvider>
      </CacheProvider>
    );
  }

  const categories = menu.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: cat.items.map((it) => ({
      name: it.name,
      price: it.price,
      isNew: it.isNew,
      description: it.description,
    })),
  }));

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={menuTheme}>
        <Box dir="rtl" sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
          {!hideDialog && (
          <Dialog
            open={!unlocked}
            disableEscapeKeyDown
            onClose={() => {}}
            PaperProps={{ sx: { borderRadius: 4, maxWidth: 380, width: "100%" } }}
          >
            <DialogTitle sx={{ textAlign: "center", pt: 4, px: 4 }}>
              {establishment.logoUrl ? (
                <Avatar
                  src={resolveImageUrl(establishment.logoUrl)}
                  alt="Logo"
                  sx={{ mx: "auto", mb: 1.5, width: 48, height: 48 }}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  sx={{ bgcolor: "primary.main", color: "secondary.main", mx: "auto", mb: 1.5, width: 48, height: 48, fontSize: 11, fontWeight: 700 }}
                >
                  شعار
                </Avatar>
              )}
              <Typography variant="h5" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: "primary.main" }}>
                {dialogConfig?.title || `أهلاً فيك بـ ${establishment.name}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400, fontFamily: "IBM Plex Sans Arabic" }}>
                {dialogConfig?.description || "عرّفنا على حالك قبل ما تتصفح المنيو."}
              </Typography>
              {dialogConfig?.giftName && (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "primary.main", fontFamily: "IBM Plex Sans Arabic" }}>
                  <CardGiftcardIcon sx={{ fontSize: 16 }} /> {dialogConfig.giftName}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent sx={{ px: 4, pb: 4 }}>
              <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 1 }}>
                {submitError && (
                  <Typography variant="caption" sx={{ color: "error.main" }}>
                    {submitError}
                  </Typography>
                )}
                <TextField
                  autoFocus
                  label="الاسم الكامل"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="رقم الواتساب"
                  value={form.whatsapp}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, whatsapp: value }));
                    setPhoneError(value.trim() ? validatePhone(value) : "");
                  }}
                  error={Boolean(phoneError)}
                  helperText={phoneError || "بمقدمة دولية، مثال: 970599123456 (١٢ رقم بالمجموع)"}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit || submitting}
                  sx={{
                    bgcolor: "primary.main",
                    color: "secondary.main",
                    borderRadius: 999,
                    py: 1.2,
                    fontFamily: "IBM Plex Sans Arabic",
                    "&:hover": { bgcolor: "#163a20" },
                    "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
                  }}
                >
                  {submitting ? "جاري التحميل..." : "شوف المنيو"}
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
          )}

          <MenuHero />
          <Marquee items={categories.map((c) => c.name)} />
          <Box id="menu" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 6 }, py: 8 }}>
            {categories.map((cat) => (
              <MenuSection key={cat.id} id={cat.id} title={cat.name} items={cat.items} count={cat.items.length} />
            ))}
          </Box>
          <Marquee items={categories.map((c) => c.name)} />
          <Footer
            brandName={establishment.name}
            categories={categories.map((c) => ({ id: c.id, label: c.name }))}
            city={establishment.city}
            address={establishment.address}
            hours={establishment.footerConfig?.hours}
            phone={establishment.footerConfig?.phone}
            email={establishment.footerConfig?.email}
            socialLinks={establishment.footerConfig?.socialLinks}
          />
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}