import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
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
  MenuItem,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { tokens } from "../theme/theme";
import { couponsApi } from "../api/coupons";
import { getCached, setCached } from "../utils/dataCache";
import { useAuth } from "../auth/AuthContext";

// صفحة "الهدايا" - إدارة كوبونات الخصم (Coupon model بالباك إند): كود،
// نوع/قيمة الخصم، حد أدنى للشراء، حد أقصى للاستخدام، تاريخ انتهاء، وممكن
// تكون عامة (لأي عميل) أو شخصية (مربوطة بعميل محدد من عملاء المنشأة) -
// منفصلة تماماً عن "الإعلانات والعروض" (بانرات ترويجية بصرية بالمنيو
// العام) وعن "النقاط" (تُستبدل برصيد نقاط لا بكود).

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minPurchase: "0",
  maxUses: "",
  expiresAt: "",
  isActive: true,
  customer: null, // null = كوبون عام لكل العملاء
  partnerName: "",
  partnerAddress: "",
};

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
}

function couponStatus(c) {
  if (!c.isActive) return { label: "موقوف", tone: "muted" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: "منتهي", tone: "muted" };
  if (c.maxUses != null && (c.usedCount || 0) >= c.maxUses) return { label: "استُنفد", tone: "muted" };
  return { label: "فعّال", tone: "ink" };
}

function discountLabel(c) {
  return c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue} ₪`;
}

export default function Coupons() {
  const { establishmentId } = useParams();
  const { establishments, ensureEstablishmentDetail } = useAuth();
  const establishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];
  const customers = establishment?.customers ?? [];

  useEffect(() => {
    if (establishmentId) ensureEstablishmentDetail(establishmentId);
  }, [establishmentId, ensureEstablishmentDetail]);

  const [coupons, setCoupons] = useState(() => getCached(`coupons:${establishmentId}`) ?? []);
  const [loading, setLoading] = useState(() => getCached(`coupons:${establishmentId}`) === undefined);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function load() {
    if (!establishmentId) return;
    couponsApi
      .list(establishmentId)
      .then((data) => {
        setCoupons(data || []);
        setCached(`coupons:${establishmentId}`, data || []);
        setError("");
      })
      .catch((err) => setError(err.message || "تعذّر جلب الهدايا"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((c) => {
      const customerName = c.customerId?.name || "";
      return (
        c.code?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q)
      );
    });
  }, [coupons, query]);

  function handleExportExcel() {
    const rows = filtered.map((c) => {
      const status = couponStatus(c);
      return {
        "اسم العميل": c.customerId?.name || "عام (كل العملاء)",
        "رقم الهاتف": c.customerId?.phone || "",
        "كود الكوبون": c.code || "",
        "نوع الخصم": c.discountType === "percentage" ? "نسبة مئوية" : "مبلغ ثابت",
        "نسبة الخصم / الهدية": discountLabel(c),
        "الوصف": c.description || "",
        "من تاريخ": fmtDate(c.createdAt) || "",
        "إلى تاريخ": c.expiresAt ? fmtDate(c.expiresAt) : "بلا تاريخ انتهاء",
        "الحالة": status.label,
        "عدد مرات الاستخدام": c.usedCount ?? 0,
        "الحد الأقصى للاستخدام": c.maxUses != null ? c.maxUses : "بلا حد",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 22 }, // اسم العميل
      { wch: 14 }, // رقم الهاتف
      { wch: 16 }, // كود الكوبون
      { wch: 14 }, // نوع الخصم
      { wch: 18 }, // نسبة الخصم / الهدية
      { wch: 26 }, // الوصف
      { wch: 14 }, // من تاريخ
      { wch: 18 }, // إلى تاريخ
      { wch: 10 }, // الحالة
      { wch: 16 }, // عدد مرات الاستخدام
      { wch: 18 }, // الحد الأقصى للاستخدام
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الهدايا والكوبونات");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `كوبونات-${establishment?.name || establishmentId}-${todayStr}.xlsx`);
  }

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(c) {
    setEditingId(c._id);
    setForm({
      code: c.code || "",
      description: c.description || "",
      discountType: c.discountType || "percentage",
      discountValue: String(c.discountValue ?? ""),
      minPurchase: String(c.minPurchase ?? 0),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
      isActive: c.isActive !== false,
      customer: c.customerId ? { id: c.customerId._id, name: c.customerId.name, phone: c.customerId.phone } : null,
      partnerName: c.partnerName || "",
      partnerAddress: c.partnerAddress || "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim()) {
      setFormError("كود الكوبون إلزامي");
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || Number.isNaN(discountValue) || discountValue < 0) {
      setFormError("قيمة الخصم لازم تكون رقم موجب");
      return;
    }
    if (form.discountType === "percentage" && discountValue > 100) {
      setFormError("نسبة الخصم ما ينفعش تتجاوز ١٠٠٪");
      return;
    }
    const minPurchase = Number(form.minPurchase || 0);
    if (Number.isNaN(minPurchase) || minPurchase < 0) {
      setFormError("الحد الأدنى للشراء لازم يكون رقم موجب");
      return;
    }
    let maxUses = null;
    if (form.maxUses.trim()) {
      maxUses = Number(form.maxUses);
      if (Number.isNaN(maxUses) || maxUses < 1) {
        setFormError("الحد الأقصى للاستخدام لازم يكون رقم أكبر من صفر (أو اتركه فاضي = بلا حد)");
        return;
      }
    }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue,
        minPurchase,
        maxUses,
        expiresAt: form.expiresAt || null,
        isActive: form.isActive,
        customerId: form.customer?.id || null,
        partnerName: form.partnerName.trim(),
        partnerAddress: form.partnerAddress.trim(),
      };
      if (editingId) {
        await couponsApi.update(editingId, payload, establishmentId);
      } else {
        await couponsApi.create(payload, establishmentId);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || "تعذّر حفظ الكوبون");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(c) {
    try {
      await couponsApi.update(c._id, { isActive: !c.isActive }, establishmentId);
      load();
    } catch {
      // فشل التبديل - بنسيبه بحالته الحالية
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await couponsApi.remove(confirmDeleteId, establishmentId);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setError(err.message || "تعذّر حذف الكوبون");
      setConfirmDeleteId(null);
    }
  }

  if (!establishment) return null;

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            الهدايا
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            أنشئ كوبونات خصم عامة لكل العملاء أو كوبونات شخصية لعميل محدد
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
          <Button
            onClick={handleExportExcel}
            variant="outlined"
            startIcon={<FileDownloadRoundedIcon />}
            disabled={filtered.length === 0}
            sx={{
              borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
              color: tokens.ink,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "12px",
              px: 2.5,
              "&:hover": { borderColor: tokens.ink, backgroundColor: "rgba(0,0,0,0.03)" },
            }}
          >
            تصدير إكسل للكاشير
          </Button>
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
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" },
            }}
          >
            كوبون جديد
          </Button>
        </Stack>
      </Stack>

      {/* البحث */}
      <TextField
        size="small"
        placeholder="بحث بالكود، الوصف، أو اسم العميل"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 380, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        InputProps={{
          startAdornment: <SearchRoundedIcon fontSize="small" sx={{ color: tokens.muted, mr: 1 }} />,
        }}
      />

      {error && (
        <Typography variant="body2" sx={{ color: "error.main", fontFamily: '"IBM Plex Sans Arabic"' }}>
          {error}
        </Typography>
      )}

      {/* الجدول */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid",
          borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              جاري التحميل...
            </Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ p: 5 }}>
            <RedeemRoundedIcon sx={{ fontSize: 34, color: tokens.mutedLight }} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
              {coupons.length === 0 ? "ما في هدايا لسا - أضف أول كوبون" : "ما في نتائج مطابقة"}
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>الكود</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>الخصم</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>العميل</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>الاستخدام</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>الانتهاء</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell align="left" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                    إجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c) => {
                  const status = couponStatus(c);
                  return (
                    <TableRow key={c._id} hover>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.85rem" }}>
                            {c.code}
                          </Typography>
                          {c.description && (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {c.description}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                        {discountLabel(c)}
                        {c.minPurchase > 0 && (
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                            بحد أدنى {c.minPurchase} ₪
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>
                        {c.customerId?.name || (
                          <Chip size="small" label="عام - لكل العملاء" sx={{ fontSize: "0.7rem" }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>
                        {c.usedCount || 0}
                        {c.maxUses != null ? ` / ${c.maxUses}` : " / ∞"}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>{fmtDate(c.expiresAt) || "بلا انتهاء"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={status.label}
                          onClick={() => handleToggleActive(c)}
                          sx={{
                            fontFamily: '"IBM Plex Sans Arabic"',
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            backgroundColor: status.tone === "ink" ? tokens.ink : "rgba(0,0,0,0.06)",
                            color: status.tone === "ink" ? tokens.paper : "text.secondary",
                          }}
                        />
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => openEditDialog(c)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(c._id)}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* حوار إضافة/تعديل كوبون */}
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
          {editingId ? "تعديل كوبون" : "كوبون جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}

            <TextField
              label="كود الكوبون"
              size="small"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="مثلاً: WELCOME10"
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

            <Stack direction="row" spacing={1.5}>
              <TextField
                select
                label="نوع الخصم"
                size="small"
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              >
                <MenuItem value="percentage">نسبة مئوية %</MenuItem>
                <MenuItem value="fixed">مبلغ ثابت ₪</MenuItem>
              </TextField>
              <TextField
                label="قيمة الخصم"
                size="small"
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="حد أدنى للشراء (اختياري)"
                size="small"
                type="number"
                value={form.minPurchase}
                onChange={(e) => setForm((f) => ({ ...f, minPurchase: e.target.value }))}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <TextField
                label="حد أقصى للاستخدام (اختياري)"
                size="small"
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                helperText="اتركه فاضي = بلا حد"
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Stack>

            <TextField
              label="تاريخ الانتهاء (اختياري)"
              size="small"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />

            <Autocomplete
              options={customers}
              getOptionLabel={(c) => `${c.name} — ${c.phone}`}
              value={form.customer}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(e, value) => setForm((f) => ({ ...f, customer: value }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="عميل مستهدف (اختياري)"
                  size="small"
                  helperText="اتركه فاضي = كوبون عام يقدر يستخدمه أي عميل"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              )}
            />

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="اسم الشريك الخارجي (اختياري)"
                size="small"
                value={form.partnerName}
                onChange={(e) => setForm((f) => ({ ...f, partnerName: e.target.value }))}
                helperText="اتركه فاضي لو الكوبون للاستخدام عندك بس"
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <TextField
                label="عنوان الشريك (اختياري)"
                size="small"
                value={form.partnerAddress}
                onChange={(e) => setForm((f) => ({ ...f, partnerAddress: e.target.value }))}
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Stack>

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
            background: (theme) => (theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)"),
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف الكوبون؟</DialogTitle>
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