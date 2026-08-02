import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { tokens } from "../theme/theme";
import { promotionsApi } from "../api/promotions";
import { uploadImage, resolveImageUrl } from "../api/uploads";
import { getCached, setCached } from "../utils/dataCache";
import { useAuth } from "../auth/AuthContext";
import { SectionHeader } from "../components/SectionHeader";

// إعلانات/عروض/خصومات بتظهر بالصفحة الرئيسية للمنيو العام (اللي بيوصلها
// الزبون عبر بوت الواتساب / رابط QR) — منفصلة تماماً عن الكوبونات (كود
// خصم يدوي) وعن الجوائز (تُستبدل بنقاط). هاي بس بانرات ترويجية بصرية.

const EMPTY_FORM = {
  title: "",
  description: "",
  badgeText: "",
  imageUrl: null,
  linkUrl: "",
  order: "0",
  startDate: "",
  endDate: "",
  isActive: true,
};

const cardStyle = {
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

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
}

function promotionStatus(p) {
  if (!p.isActive) return { label: "موقوف", tone: "muted" };
  const now = Date.now();
  if (p.startDate && new Date(p.startDate).getTime() > now) return { label: "مجدوَل لاحقاً", tone: "muted" };
  if (p.endDate && new Date(p.endDate).getTime() < now) return { label: "منتهي", tone: "muted" };
  return { label: "ظاهر للزبائن", tone: "ink" };
}

export default function Promotions() {
  const { establishmentId } = useParams();
  const { establishments } = useAuth();
  const establishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];

  const [promotions, setPromotions] = useState(() => getCached(`promotions:${establishmentId}`) ?? []);
  const [loading, setLoading] = useState(() => getCached(`promotions:${establishmentId}`) === undefined);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function load() {
    if (!establishmentId) return;
    promotionsApi
      .list(establishmentId)
      .then((data) => {
        setPromotions(data || []);
        setCached(`promotions:${establishmentId}`, data || []);
        setError("");
      })
      .catch((err) => setError(err.message || "تعذّر جلب الإعلانات"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(p) {
    setEditingId(p._id);
    setForm({
      title: p.title || "",
      description: p.description || "",
      badgeText: p.badgeText || "",
      imageUrl: p.imageUrl ?? null,
      linkUrl: p.linkUrl || "",
      order: String(p.order ?? 0),
      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "",
      endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : "",
      isActive: p.isActive !== false,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError("");
    setUploadingImage(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setFormError(err.message || "تعذّر رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setFormError("عنوان الإعلان إلزامي");
      return;
    }
    const order = Number(form.order);
    if (Number.isNaN(order)) {
      setFormError("الترتيب لازم يكون رقم");
      return;
    }
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      setFormError("تاريخ البداية لازم يكون قبل تاريخ النهاية");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        badgeText: form.badgeText.trim(),
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl.trim() || null,
        order,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
      };
      if (editingId) {
        await promotionsApi.update(editingId, payload, establishmentId);
      } else {
        await promotionsApi.create(payload, establishmentId);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || "تعذّر حفظ الإعلان");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p) {
    try {
      await promotionsApi.update(p._id, { isActive: !p.isActive }, establishmentId);
      load();
    } catch {
      // فشل التبديل - بنسيبه بحالته الحالية
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await promotionsApi.remove(confirmDeleteId, establishmentId);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError(err.message || "تعذّر حذف الإعلان");
      setConfirmDeleteId(null);
    }
  }

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            الإعلانات والعروض
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            بانرات وعروض/خصومات بتظهر بالصفحة الرئيسية لمنيوك العام يلي بيوصلها الزبون عبر بوت الواتساب أو رابط الـQR.
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
          إعلان جديد
        </Button>
      </Stack>

      {error && (
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      <Box>
        <SectionHeader title="كل الإعلانات" />
        {loading ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>
            جاري التحميل…
          </Typography>
        ) : promotions.length === 0 ? (
          <Paper elevation={0} sx={{ ...cardStyle, p: 5, textAlign: "center" }}>
            <CampaignRoundedIcon sx={{ fontSize: 40, color: tokens.mutedLight, mb: 1 }} />
            <Typography sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
              ما في إعلانات مضافة بعد — انقر "إعلان جديد" لإضافة أول عرض/خصم
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {promotions.map((p) => {
              const status = promotionStatus(p);
              return (
                <Grid item xs={12} sm={6} md={4} key={p._id}>
                  <Paper elevation={0} sx={{ ...cardStyle, height: "100%", display: "flex", flexDirection: "column" }}>
                    <Box
                      sx={{
                        height: 140,
                        bgcolor: "rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {p.imageUrl ? (
                        <Box
                          component="img"
                          src={resolveImageUrl(p.imageUrl)}
                          alt={p.title}
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <ImageOutlinedIcon sx={{ fontSize: 36, color: tokens.mutedLight }} />
                      )}
                      {p.badgeText && (
                        <Chip
                          label={p.badgeText}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 10,
                            insetInlineStart: 10,
                            bgcolor: tokens.ink,
                            color: tokens.paper,
                            fontWeight: 700,
                            fontFamily: '"IBM Plex Sans Arabic"',
                          }}
                        />
                      )}
                    </Box>
                    <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
                      <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>{p.title}</Typography>
                      {p.description && (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
                          {p.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
                        <Chip
                          size="small"
                          label={status.label}
                          onClick={() => handleToggleActive(p)}
                          sx={{
                            cursor: "pointer",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            backgroundColor: status.tone === "ink" ? tokens.ink : "transparent",
                            color: status.tone === "ink" ? tokens.paper : tokens.muted,
                            border: `1px solid ${status.tone === "ink" ? tokens.ink : tokens.hairline || "rgba(0,0,0,0.1)"}`,
                          }}
                        />
                        {(p.startDate || p.endDate) && (
                          <Typography variant="caption" sx={{ color: tokens.mutedLight, fontSize: "0.72rem" }}>
                            {fmtDate(p.startDate) || "بلا بداية"} — {fmtDate(p.endDate) || "بلا نهاية"}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ px: 1.5, pb: 1.5 }}>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(p)}
                          sx={{ color: tokens.muted, "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDeleteId(p._id)}
                          sx={{ color: tokens.muted, "&:hover": { color: "error.main", backgroundColor: "rgba(211,47,47,0.08)" } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* حوار إضافة/تعديل إعلان */}
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
            background: (theme) => (theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)"),
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, pb: 1 }}>
          {editingId ? "تعديل إعلان" : "إعلان جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}

            {/* رفع الصورة */}
            <Stack alignItems="center" spacing={1}>
              {form.imageUrl ? (
                <Box
                  component="img"
                  src={resolveImageUrl(form.imageUrl)}
                  alt="معاينة"
                  sx={{ width: "100%", height: 140, objectFit: "cover", borderRadius: "12px" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: 140,
                    borderRadius: "12px",
                    bgcolor: "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageOutlinedIcon sx={{ fontSize: 32, color: tokens.mutedLight }} />
                </Box>
              )}
              <Stack direction="row" spacing={1}>
                <Button
                  component="label"
                  size="small"
                  startIcon={<CloudUploadRoundedIcon fontSize="small" />}
                  disabled={uploadingImage}
                  sx={{ color: tokens.ink, fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}
                >
                  {uploadingImage ? "جاري الرفع..." : form.imageUrl ? "تغيير الصورة" : "رفع صورة"}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </Button>
                {form.imageUrl && !uploadingImage && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                    sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}
                  >
                    إزالة
                  </Button>
                )}
              </Stack>
            </Stack>

            <TextField
              label="عنوان الإعلان"
              size="small"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثلاً: عرض نهاية الأسبوع"
              fullWidth
              autoFocus
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="وصف مختصر (اختياري)"
              size="small"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="نص الشارة (اختياري)"
              size="small"
              value={form.badgeText}
              onChange={(e) => setForm((f) => ({ ...f, badgeText: e.target.value }))}
              placeholder="مثلاً: خصم 20%"
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="رابط عند الضغط (اختياري)"
              size="small"
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="https://..."
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="تاريخ البداية (اختياري)"
                size="small"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <TextField
                label="تاريخ النهاية (اختياري)"
                size="small"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
              <TextField
                label="الترتيب"
                size="small"
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                helperText="الأصغر بيظهر أولاً"
                sx={{ width: 140, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                }
                label="مفعّل"
                sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}
              />
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
            disabled={saving || uploadingImage}
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
            background: (theme) => (theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)"),
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف الإعلان؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
            هذا الإجراء نهائي ومش قابل للتراجع، وبيختفي الإعلان فوراً من الصفحة العامة.
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