import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Chip,
  IconButton,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import WebAssetRoundedIcon from "@mui/icons-material/WebAssetRounded";
import WavingHandRoundedIcon from "@mui/icons-material/WavingHandRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import { tokens } from "../theme/theme";
import { branchesApi } from "../api/branches";
import { establishmentsApi } from "../api/establishments";
import { uploadImage, resolveImageUrl } from "../api/uploads";
import { getCached, setCached } from "../utils/dataCache";
import { useAuth } from "../auth/AuthContext";

const EMPTY_FORM = { name: "", city: "", address: "", whatsappNumber: "", latitude: "", longitude: "" };

const cardStyle = {
  p: 3,
  borderRadius: "20px",
  border: "1px solid",
  borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
  background: (theme) =>
    theme.palette.mode === "dark"
      ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  overflow: "hidden",
  "&:hover": {
    boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
  },
};

export default function Branches() {
  const { establishmentId } = useParams();
  const { establishments } = useAuth();
  const currentEstablishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];
  const allCustomers = currentEstablishment?.customers ?? [];

  const [branches, setBranches] = useState(() => getCached(`branches:${establishmentId}`) ?? []);
  const [loading, setLoading] = useState(() => getCached(`branches:${establishmentId}`) === undefined);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // === شعار المنشأة ===
  const [logoUrl, setLogoUrl] = useState(() => getCached(`establishmentDetail:${establishmentId}`)?.logoUrl || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef(null);

  async function handleLogoFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // يسمح برفع نفس الملف مرة تانية لو احتاج
    if (!file) return;

    setLogoUploading(true);
    setLogoError("");
    try {
      const { url } = await uploadImage(file);
      await establishmentsApi.update(establishmentId, { logoUrl: url });
      setLogoUrl(url);
    } catch (err) {
      setLogoError(err.message || "تعذّر رفع الشعار");
    } finally {
      setLogoUploading(false);
    }
  }

  // === مساحة إعلانية (بانر "اطلب أونلاين" بصفحة المنيو العامة) ===
  const [adBannerUrl, setAdBannerUrl] = useState(() => getCached(`establishmentDetail:${establishmentId}`)?.adBannerUrl || null);
  const [adBannerUploading, setAdBannerUploading] = useState(false);
  const [adBannerError, setAdBannerError] = useState("");

  async function handleAdBannerFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAdBannerUploading(true);
    setAdBannerError("");
    try {
      const { url } = await uploadImage(file);
      await establishmentsApi.update(establishmentId, { adBannerUrl: url });
      setAdBannerUrl(url);
    } catch (err) {
      setAdBannerError(err.message || "تعذّر رفع الصورة");
    } finally {
      setAdBannerUploading(false);
    }
  }

  async function handleRemoveAdBanner() {
    setAdBannerUploading(true);
    setAdBannerError("");
    try {
      await establishmentsApi.update(establishmentId, { adBannerUrl: null });
      setAdBannerUrl(null);
    } catch (err) {
      setAdBannerError(err.message || "تعذّر حذف الصورة");
    } finally {
      setAdBannerUploading(false);
    }
  }

  // === إعدادات الفوتر بصفحة المنيو العامة ===
  const EMPTY_FOOTER = { phone: "", email: "", hours: "", instagram: "", facebook: "", twitter: "" };
  const [footerForm, setFooterForm] = useState(() => {
    const fc = getCached(`establishmentDetail:${establishmentId}`)?.footerConfig || {};
    return {
      phone: fc.phone || "",
      email: fc.email || "",
      hours: fc.hours || "",
      instagram: fc.socialLinks?.instagram || "",
      facebook: fc.socialLinks?.facebook || "",
      twitter: fc.socialLinks?.twitter || "",
    };
  });
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSaved, setFooterSaved] = useState(false);
  const [footerError, setFooterError] = useState("");

  async function handleSaveFooter() {
    setFooterSaving(true);
    setFooterSaved(false);
    setFooterError("");
    try {
      await establishmentsApi.update(establishmentId, {
        footerConfig: {
          phone: footerForm.phone || null,
          email: footerForm.email || null,
          hours: footerForm.hours || null,
          socialLinks: {
            instagram: footerForm.instagram || null,
            facebook: footerForm.facebook || null,
            twitter: footerForm.twitter || null,
          },
        },
      });
      setFooterSaved(true);
      setTimeout(() => setFooterSaved(false), 2500);
    } catch (err) {
      setFooterError(err.message || "تعذّر حفظ إعدادات الفوتر");
    } finally {
      setFooterSaving(false);
    }
  }

  // === نافذة الترحيب (menuDialogConfig) - أول شي يشوفه الزبون قبل المنيو ===
  const EMPTY_WELCOME = { enabled: true, title: "", description: "", giftName: "" };
  const [welcomeForm, setWelcomeForm] = useState(() => {
    const mc = getCached(`establishmentDetail:${establishmentId}`)?.menuDialogConfig || {};
    return {
      enabled: mc.enabled !== false,
      title: mc.title || "",
      description: mc.description || "",
      giftName: mc.giftName || "",
    };
  });
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeSaved, setWelcomeSaved] = useState(false);
  const [welcomeError, setWelcomeError] = useState("");

  // === تبويب "الرئيسية" عند العميل (نص العروض/الإعلانات + استهداف) ===
  const [promoText, setPromoText] = useState(() => getCached(`establishmentDetail:${establishmentId}`)?.promoText || "");
  const [promoAudience, setPromoAudience] = useState(
    () => getCached(`establishmentDetail:${establishmentId}`)?.promoTextAudience || "all"
  );
  const [promoCustomerIds, setPromoCustomerIds] = useState(
    () => getCached(`establishmentDetail:${establishmentId}`)?.promoTextCustomerIds || []
  );
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoSaved, setPromoSaved] = useState(false);
  const [promoError, setPromoError] = useState("");

  // الأوتوكومبليت بده كائنات كاملة (id/name/phone) عشان يعرضها، بينما
  // المخزّن بموديل المنشأة مجرد مصفوفة IDs - هون منحول من id لكائن العميل
  // الكامل (لو موجود ضمن allCustomers)
  const promoCustomersValue = promoCustomerIds
    .map((id) => allCustomers.find((c) => c.id === id))
    .filter(Boolean);

  // === تبويب "نبذة عنا" عند العميل بشات الويب ===
  const [aboutText, setAboutText] = useState(() => getCached(`establishmentDetail:${establishmentId}`)?.aboutText || "");
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutSaved, setAboutSaved] = useState(false);
  const [aboutError, setAboutError] = useState("");

  async function handleSaveAbout() {
    setAboutSaving(true);
    setAboutSaved(false);
    setAboutError("");
    try {
      await establishmentsApi.update(establishmentId, { aboutText });
      setAboutSaved(true);
      setTimeout(() => setAboutSaved(false), 2500);
    } catch (err) {
      setAboutError(err.message || "تعذّر حفظ نبذة عنّا");
    } finally {
      setAboutSaving(false);
    }
  }

  // بدل ٤ طلبات GET منفصلة لنفس المنشأة (شعار + بانر + فوتر + نافذة
  // ترحيب)، طلب واحد بس بيجيب كل شي، ومخزّن بالكاش عشان أي رجوع للصفحة
  // يعرض القيم فوراً بدون انتظار
  useEffect(() => {
    if (!establishmentId) return;
    establishmentsApi
      .get(establishmentId)
      .then((est) => {
        if (!est) return;
        setCached(`establishmentDetail:${establishmentId}`, est);
        setLogoUrl(est.logoUrl || null);
        setAdBannerUrl(est.adBannerUrl || null);
        const fc = est.footerConfig || {};
        setFooterForm({
          phone: fc.phone || "",
          email: fc.email || "",
          hours: fc.hours || "",
          instagram: fc.socialLinks?.instagram || "",
          facebook: fc.socialLinks?.facebook || "",
          twitter: fc.socialLinks?.twitter || "",
        });
        const mc = est.menuDialogConfig || {};
        setWelcomeForm({
          enabled: mc.enabled !== false,
          title: mc.title || "",
          description: mc.description || "",
          giftName: mc.giftName || "",
        });
        setPromoText(est.promoText || "");
        setPromoAudience(est.promoTextAudience || "all");
        setPromoCustomerIds((est.promoTextCustomerIds || []).map((id) => (typeof id === "string" ? id : id._id || id)));
        setAboutText(est.aboutText || "");
      })
      .catch(() => {});
  }, [establishmentId]);

  async function handleSavePromo() {
    setPromoSaving(true);
    setPromoSaved(false);
    setPromoError("");
    try {
      await establishmentsApi.update(establishmentId, {
        promoText,
        promoTextAudience: promoAudience,
        promoTextCustomerIds: promoAudience === "selected" ? promoCustomerIds : [],
      });
      setPromoSaved(true);
      setTimeout(() => setPromoSaved(false), 2500);
    } catch (err) {
      setPromoError(err.message || "تعذّر حفظ إعدادات العروض والإعلانات");
    } finally {
      setPromoSaving(false);
    }
  }

  async function handleSaveWelcome() {
    setWelcomeSaving(true);
    setWelcomeSaved(false);
    setWelcomeError("");
    try {
      await establishmentsApi.update(establishmentId, {
        menuDialogConfig: {
          enabled: welcomeForm.enabled,
          title: welcomeForm.title || "",
          description: welcomeForm.description || "",
          giftName: welcomeForm.giftName || "",
        },
      });
      setWelcomeSaved(true);
      setTimeout(() => setWelcomeSaved(false), 2500);
    } catch (err) {
      setWelcomeError(err.message || "تعذّر حفظ نافذة الترحيب");
    } finally {
      setWelcomeSaving(false);
    }
  }


  function load() {
    if (!establishmentId) return;
    branchesApi
      .list(establishmentId)
      .then((data) => {
        setBranches(data || []);
        setCached(`branches:${establishmentId}`, data || []);
        setError("");
      })
      .catch((err) => setError(err.message || "تعذّر جلب الفروع"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [establishmentId]);

  const [locatingBranch, setLocatingBranch] = useState(false);
  const [locationError, setLocationError] = useState("");

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("متصفحك ما بيدعم تحديد الموقع");
      return;
    }
    setLocatingBranch(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
        setLocatingBranch(false);
      },
      (err) => {
        setLocationError(err?.message || "تعذّر تحديد موقعك - تأكد من السماح بصلاحية الموقع");
        setLocatingBranch(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }
  function openEditDialog(branch) {
    setEditingId(branch._id);
    setForm({
      name: branch.name || "",
      city: branch.city || "",
      address: branch.address || "",
      whatsappNumber: branch.whatsappNumber || "",
      latitude: branch.latitude ?? "",
      longitude: branch.longitude ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("اسم الفرع إلزامي");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        whatsappNumber: form.whatsappNumber.trim() || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };
      if (editingId) {
        await branchesApi.update(editingId, payload, establishmentId);
      } else {
        await branchesApi.create(payload, establishmentId);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || "تعذّر حفظ الفرع");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(branch) {
    try {
      await branchesApi.update(branch._id, { isActive: !branch.isActive }, establishmentId);
      load();
    } catch {
      // فشل التبديل بيضل الوضع الحالي
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await branchesApi.remove(confirmDeleteId, establishmentId);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError(err.message || "تعذّر حذف الفرع");
      setConfirmDeleteId(null);
    }
  }

  return (
    <Stack spacing={3.5}>
      {/* شعار المنشأة */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
          <Avatar
            src={resolveImageUrl(logoUrl)}
            variant="rounded"
            sx={{
              width: 72,
              height: 72,
              borderRadius: "16px",
              backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
              border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
            }}
          >
            <StorefrontRoundedIcon sx={{ color: tokens.muted }} />
          </Avatar>
          <Stack spacing={0.8} sx={{ flex: 1 }}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
              شعار المنشأة
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              بيظهر جنب اسم منشأتك بأعلى لوحة التحكم، وبصفحة المنيو العامة للعميل. الأفضل صورة مربّعة (PNG بخلفية شفافة).
            </Typography>
            {logoError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {logoError}
              </Typography>
            )}
          </Stack>
          <Button
            variant="outlined"
            component="label"
            disabled={logoUploading}
            startIcon={<UploadRoundedIcon fontSize="small" />}
            sx={{
              borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
              color: tokens.ink,
              borderRadius: "10px",
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              px: 2,
              alignSelf: { xs: "flex-start", sm: "center" },
              flexShrink: 0,
            }}
          >
            {logoUploading ? "جاري الرفع…" : logoUrl ? "تغيير الشعار" : "رفع شعار"}
            <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoFileChange} />
          </Button>
        </Stack>
      </Paper>

      {/* مساحة إعلانية - بانر "اطلب أونلاين" بصفحة المنيو العامة */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CampaignRoundedIcon sx={{ color: tokens.muted }} />
            <Stack spacing={0.3}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
                مساحة إعلانية
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                صورة بتحطها إنت — بتظهر مكان قسم "اطلب أونلاين" الافتراضي بصفحة المنيو العامة للزبون. الأفضل صورة عريضة (بانر).
              </Typography>
            </Stack>
          </Stack>

          {adBannerUrl && (
            <Box
              component="img"
              src={resolveImageUrl(adBannerUrl)}
              alt="مساحة إعلانية"
              sx={{
                width: "100%",
                maxHeight: 180,
                objectFit: "cover",
                borderRadius: "14px",
                border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
              }}
            />
          )}

          {adBannerError && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              {adBannerError}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              component="label"
              disabled={adBannerUploading}
              startIcon={<UploadRoundedIcon fontSize="small" />}
              sx={{
                borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
                color: tokens.ink,
                borderRadius: "10px",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                px: 2,
              }}
            >
              {adBannerUploading ? "جاري الرفع…" : adBannerUrl ? "تغيير الصورة" : "رفع صورة"}
              <input type="file" accept="image/*" hidden onChange={handleAdBannerFileChange} />
            </Button>
            {adBannerUrl && (
              <Button
                variant="text"
                disabled={adBannerUploading}
                onClick={handleRemoveAdBanner}
                startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                sx={{ color: tokens.muted, fontWeight: 600, borderRadius: "10px" }}
              >
                رجوع للوضع الافتراضي
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* إعدادات الفوتر بصفحة المنيو العامة */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <WebAssetRoundedIcon sx={{ color: tokens.muted }} />
            <Stack spacing={0.3}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
                إعدادات الفوتر
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                الأرقام والروابط يلي بتظهر بأسفل صفحة المنيو العامة للزبون (بدل القيم الافتراضية الجاهزة).
              </Typography>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="رقم الهاتف"
              size="small"
              fullWidth
              value={footerForm.phone}
              onChange={(e) => setFooterForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+970 59 000 0000"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="البريد الإلكتروني"
              size="small"
              fullWidth
              value={footerForm.email}
              onChange={(e) => setFooterForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="hello@example.com"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Stack>

          <TextField
            label="أوقات الدوام"
            size="small"
            fullWidth
            value={footerForm.hours}
            onChange={(e) => setFooterForm((f) => ({ ...f, hours: e.target.value }))}
            placeholder="يوميًا، من ٩:٠٠ صباحًا حتى ١١:٠٠ مساءً"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <Typography variant="caption" sx={{ color: tokens.muted, fontWeight: 700 }}>
            روابط التواصل الاجتماعي (اختياري - اتركها فاضية لو ما بدك الأيقونة تشتغل)
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="إنستغرام"
              size="small"
              fullWidth
              value={footerForm.instagram}
              onChange={(e) => setFooterForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="https://instagram.com/..."
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="فيسبوك"
              size="small"
              fullWidth
              value={footerForm.facebook}
              onChange={(e) => setFooterForm((f) => ({ ...f, facebook: e.target.value }))}
              placeholder="https://facebook.com/..."
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="X (تويتر)"
              size="small"
              fullWidth
              value={footerForm.twitter}
              onChange={(e) => setFooterForm((f) => ({ ...f, twitter: e.target.value }))}
              placeholder="https://x.com/..."
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Stack>

          {footerError && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              {footerError}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              disabled={footerSaving}
              onClick={handleSaveFooter}
              sx={{
                backgroundColor: tokens.ink,
                color: tokens.paper,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              {footerSaving ? "جاري الحفظ…" : "حفظ إعدادات الفوتر"}
            </Button>
            {footerSaved && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم الحفظ ✅
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* نافذة الترحيب - أول شي يشوفه الزبون قبل ما يتصفح المنيو */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.2} alignItems="center">
              <WavingHandRoundedIcon sx={{ color: tokens.muted }} />
              <Stack spacing={0.3}>
                <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
                  نافذة الترحيب
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  أول نافذة بتفتح للزبون قبل ما يشوف المنيو (تطلب اسمه ورقم واتسابه).
                </Typography>
              </Stack>
            </Stack>
            <FormControlLabel
              labelPlacement="start"
              control={
                <Switch
                  checked={welcomeForm.enabled}
                  onChange={(e) => setWelcomeForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {welcomeForm.enabled ? "مفعّلة" : "معطّلة"}
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Stack>

          <TextField
            label="العنوان"
            size="small"
            fullWidth
            value={welcomeForm.title}
            onChange={(e) => setWelcomeForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="أهلاً فيك بـ اسم منشأتك"
            disabled={!welcomeForm.enabled}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
          <TextField
            label="الوصف"
            size="small"
            fullWidth
            value={welcomeForm.description}
            onChange={(e) => setWelcomeForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="عرّفنا على حالك قبل ما تتصفح المنيو."
            disabled={!welcomeForm.enabled}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
          <TextField
            label="اسم الهدية / السحب (اختياري)"
            size="small"
            fullWidth
            value={welcomeForm.giftName}
            onChange={(e) => setWelcomeForm((f) => ({ ...f, giftName: e.target.value }))}
            placeholder="مثال: سحب على قهوة مجانية هالأسبوع"
            disabled={!welcomeForm.enabled}
            helperText="لو عبّيته، بيظهر كسطر إضافي بنافذة الترحيب لتشجيع الزبون يسجّل بياناته"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          {welcomeError && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              {welcomeError}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              disabled={welcomeSaving}
              onClick={handleSaveWelcome}
              sx={{
                backgroundColor: tokens.ink,
                color: tokens.paper,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              {welcomeSaving ? "جاري الحفظ…" : "حفظ نافذة الترحيب"}
            </Button>
            {welcomeSaved && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم الحفظ ✅
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* تبويب "الرئيسية" عند العميل - نص العروض/الإعلانات + استهداف */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <NotificationsActiveRoundedIcon sx={{ color: tokens.muted }} />
            <Stack spacing={0.3}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
                عروض وإعلانات (الصفحة الرئيسية عند العميل)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                النص يلي بيظهر لتبويب "الرئيسية" بشات الويب تحت شعار منشأتك مباشرة - قرارك تعرضه لكل العملاء أو لعملاء محددين بس.
              </Typography>
            </Stack>
          </Stack>

          <TextField
            label="نص العروض/الإعلانات"
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={promoText}
            onChange={(e) => setPromoText(e.target.value)}
            placeholder="ترقّب عروضنا وإعلاناتنا قريباً هون"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              يظهر لـ
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={promoAudience}
              onChange={(_, v) => v && setPromoAudience(v)}
              sx={{
                alignSelf: "flex-start",
                "& .MuiToggleButton-root": {
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "10px !important",
                  px: 2,
                },
              }}
            >
              <ToggleButton value="all">كل العملاء</ToggleButton>
              <ToggleButton value="selected">عملاء محددين</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {promoAudience === "selected" && (
            <Autocomplete
              multiple
              options={allCustomers}
              value={promoCustomersValue}
              onChange={(_, v) => setPromoCustomerIds(v.map((c) => c.id))}
              getOptionLabel={(c) => `${c.name || "بدون اسم"} — ${c.phone || ""}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="العملاء المستهدفين"
                  placeholder="ابحث بالاسم أو الرقم..."
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              )}
            />
          )}

          {promoError && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              {promoError}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              disabled={promoSaving}
              onClick={handleSavePromo}
              sx={{
                backgroundColor: tokens.ink,
                color: tokens.paper,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              {promoSaving ? "جاري الحفظ…" : "حفظ العروض والإعلانات"}
            </Button>
            {promoSaved && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم الحفظ ✅
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* تبويب "نبذة عنا" عند العميل بشات الويب */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <InfoRoundedIcon sx={{ color: tokens.muted }} />
            <Stack spacing={0.3}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
                نبذة عنا
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                النص يلي بيظهر لتبويب "نبذة عنا" بشات الويب - عرّف الزبون بمنشأتك، قصتها، أو أي شي بتحب تشاركه معه.
              </Typography>
            </Stack>
          </Stack>

          <TextField
            label="نبذة عنا"
            size="small"
            fullWidth
            multiline
            minRows={4}
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            placeholder="عرّفنا بمنشأتك..."
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          {aboutError && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              {aboutError}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              disabled={aboutSaving}
              onClick={handleSaveAbout}
              sx={{
                backgroundColor: tokens.ink,
                color: tokens.paper,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              {aboutSaving ? "جاري الحفظ…" : "حفظ نبذة عنا"}
            </Button>
            {aboutSaved && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم الحفظ ✅
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            الفروع
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            لو المنشأة إلها أكتر من فرع، كل فرع ممكن يكون إله رقم واتساب مستقل.
          </Typography>
        </Stack>
        <Button
          onClick={openAddDialog}
          variant="contained"
          startIcon={<AddRoundedIcon />}
          sx={{
            backgroundColor: tokens.ink,
            color: tokens.paper,
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 600,
            borderRadius: "12px",
            px: 2.5,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            transition: "all 0.2s ease",
            "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" },
            alignSelf: { xs: "flex-start", sm: "center" },
          }}
        >
          فرع جديد
        </Button>
      </Stack>

      {error && (
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {/* جدول الفروع بتصميم Glassmorphism */}
      <Paper elevation={0} sx={cardStyle}>
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                <TableCell>الفرع</TableCell>
                <TableCell>المدينة</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>رقم الواتساب</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
                    جاري التحميل…
                  </TableCell>
                </TableRow>
              )}
              {!loading && branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
                    ما في فروع مسجّلة بعد — انقر "فرع جديد" لإضافة أول فرع
                  </TableCell>
                </TableRow>
              )}
              {branches.map((b) => (
                <TableRow
                  key={b._id}
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                    "&:last-child td": { borderBottom: "none" },
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <StorefrontRoundedIcon fontSize="small" sx={{ color: tokens.muted }} />
                      <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.92rem" }}>
                        {b.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem" }}>
                    {b.city || "—"}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem", fontFamily: '"IBM Plex Sans Arabic"' }}>
                    {b.address || "—"}
                  </TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.85rem" }}>
                    {b.whatsappNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={b.isActive ? "فعّال" : "موقوف"}
                      onClick={() => handleToggleActive(b)}
                      sx={{
                        cursor: "pointer",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        backgroundColor: b.isActive ? tokens.ink : "transparent",
                        color: b.isActive ? tokens.paper : tokens.muted,
                        border: `1px solid ${b.isActive ? tokens.ink : tokens.hairline || "rgba(0,0,0,0.1)"}`,
                      }}
                    />
                  </TableCell>
                  <TableCell align="left">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(b)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDeleteId(b._id)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: "error.main", backgroundColor: "rgba(211,47,47,0.08)" } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* حوار إضافة/تعديل فرع */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, pb: 1 }}>
          {editingId ? "تعديل فرع" : "فرع جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}
            <TextField
              label="اسم الفرع"
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="المدينة"
              size="small"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="العنوان"
              size="small"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="رقم واتساب مخصص (اختياري)"
              size="small"
              value={form.whatsappNumber}
              onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              placeholder="لو تركته فاضي، بيستخدم رقم المنشأة العام"
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />

            <Stack spacing={1}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                موقع الفرع (اختياري) - لمنع مسح كود الـQR من غير مكان الفرع
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="خط العرض (Latitude)"
                  size="small"
                  fullWidth
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
                <TextField
                  label="خط الطول (Longitude)"
                  size="small"
                  fullWidth
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
              <Button
                size="small"
                startIcon={<MyLocationRoundedIcon fontSize="small" />}
                onClick={handleUseCurrentLocation}
                disabled={locatingBranch}
                sx={{
                  alignSelf: "flex-start",
                  color: tokens.ink,
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                {locatingBranch ? "جاري تحديد موقعك…" : "استخدم موقعي الحالي (وأنت واقف بالفرع)"}
              </Button>
              {locationError && (
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                  {locationError}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                لو حددت الموقع، أي عميل يمسح كود الـQR بعيد كتير عن هاد الموقع (أكتر من ٣٠٠ متر تقريباً) ما رح تنحسب له زيارة/نقاط.
                اتركه فاضي لو مش بدك هاي الميزة.
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            {saving ? "جاري الحفظ…" : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف الفرع؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
            هذا الإجراء نهائي ومش قابل للتراجع.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius: "10px", px: 2.5, fontWeight: 600 }}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}