import { useMemo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Typography,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ActivityBadge } from "../components/ActivityBadge";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { customersApi } from "../api/customers";
import { orderEntriesApi } from "../api/orderEntries";

const SEGMENT_FILTERS = [
  { value: "all", label: "كل الفئات" },
  { value: "new", label: "زائر جديد" },
  { value: "hesitant", label: "متردد" },
  { value: "active", label: "نشط" },
  { value: "loyal", label: "وفيّ" },
  { value: "ambassador", label: "سفير" },
  { value: "at_risk", label: "معرّض للفقد" },
  { value: "lost", label: "مفقود" },
];

const SOURCE_LABEL = {
  manual_form: "أُضيف يدويًا",
  menu_dialog: "سجّل عبر المنيو",
  whatsapp_bot: "بوت واتساب",
  web_chat: "شات ويب",
  celebrity_qr: "QR مشاهير",
  referral_link: "رابط إحالة",
};

function fmtFullDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const datePart = d.toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "long" });
    const timePart = d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} — ${timePart}`;
  } catch {
    return "—";
  }
}

function isDialablePhone(phone) {
  return Boolean(phone) && /^\d{8,15}$/.test(phone);
}

const EMPTY_FORM = { name: "", phone: "" };

export default function Customers() {
  const { establishmentId } = useParams();
  const navigate = useNavigate();
  const { establishments, ensureEstablishmentDetail, addCustomer, updateCustomer, deleteCustomer } = useAuth();

  const establishment = establishments.find((e) => e.id === establishmentId);
  const customers = establishment?.customers ?? [];

  // بدون هاد الاستدعاء، لو المستخدم عمل ريلود مباشرة على صفحة العملاء
  // (بدل ما يوصلها بالتنقّل من صفحة ثانية)، establishment.customers بتضل
  // فاضية لحد ما يفتح صفحة ثانية بتعمل نفس النداء (متل المنيو/الداشبورد)
  useEffect(() => {
    if (establishmentId) ensureEstablishmentDetail(establishmentId);
  }, [establishmentId, ensureEstablishmentDetail]);

  // تنبيه "زيارات متكررة مشبوهة" - مؤشر يستاهل مراجعة يدوية (احتمال تحايل
  // بمسح كود QR الثابت المطبوع من غير مكان الفرع - شوف الحماية
  // الأوتوماتيكية بـisValidQrVisit بالباك إند كطبقة أولى، وهاي كطبقة بشرية إضافية)
  const [frequentVisitAlerts, setFrequentVisitAlerts] = useState([]);
  const [showFraudAlert, setShowFraudAlert] = useState(true);
  useEffect(() => {
    if (!establishmentId) return;
    customersApi
      .frequentVisitAlerts(establishmentId)
      .then((data) => setFrequentVisitAlerts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [establishmentId]);

  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messageChannel, setMessageChannel] = useState("whatsapp"); // "whatsapp" | "webchat"
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const [orderTarget, setOrderTarget] = useState(null);
  const [orderAmount, setOrderAmount] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  const filtered = useMemo(() => {
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    return customers.filter((c) => {
      const matchesQuery =
        c.name.includes(query) || c.phone.includes(query) || c.id.includes(query);

      // فلترة "الفئة" هلق مبنية على التصنيف الحقيقي المحسوب تلقائياً
      // (activityTier + recencyStatus)، بنفس منطق الأولوية المستخدم بعرض
      // ActivityBadge بالضبط: recencyStatus بياخد الأولوية لو مش طبيعي،
      // وإلا منستخدم activityTier - مش حقل "segment" القديم المنفصل
      const recency = c.recencyStatus || "normal";
      const tier = c.activityTier || "new";
      const effectiveStatus = recency !== "normal" ? recency : tier;
      const matchesSegment = segment === "all" || effectiveStatus === segment;

      let matchesDate = true;
      if (fromTime || toTime) {
        const visitTime = c.lastVisitAt ? new Date(c.lastVisitAt).getTime() : null;
        if (!visitTime) matchesDate = false;
        else {
          if (fromTime && visitTime < fromTime) matchesDate = false;
          if (toTime && visitTime > toTime) matchesDate = false;
        }
      }

      return matchesQuery && matchesSegment && matchesDate;
    });
  }, [customers, query, segment, dateFrom, dateTo]);

  function applyQuickDateRange(preset) {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    if (preset === "today") {
      setDateFrom(toStr);
      setDateTo(toStr);
      return;
    }
    if (preset === "7d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(toStr);
      return;
    }
    if (preset === "30d") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(toStr);
      return;
    }
    if (preset === "year") {
      setDateFrom(`${today.getFullYear()}-01-01`);
      setDateTo(toStr);
    }
  }

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function segmentLabel(c) {
    const recency = c.recencyStatus || "normal";
    const tier = c.activityTier || "new";
    const effectiveStatus = recency !== "normal" ? recency : tier;
    return SEGMENT_FILTERS.find((s) => s.value === effectiveStatus)?.label || "—";
  }

  function handleExportExcel() {
    const rows = filtered.map((c) => ({
      "اسم العميل": c.name || "",
      "رقم الهاتف": c.phone || "",
      "البريد الإلكتروني": c.email || "",
      "رمز العضوية": c.membershipCode || "",
      "الفئة": segmentLabel(c),
      "النقاط الحالية": c.points ?? 0,
      "إجمالي النقاط المكتسبة": c.totalPointsEarned ?? 0,
      "عدد الزيارات": c.visits ?? 0,
      "المصدر": SOURCE_LABEL[c.source] ?? c.source ?? "",
      "آخر زيارة": fmtFullDateTime(c.lastVisitAt),
      "تاريخ الانضمام": fmtFullDateTime(c.createdAt),
      "معرّف العميل": c.id || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    // عرض أعمدة معقول بدل الافتراضي الضيق
    worksheet["!cols"] = [
      { wch: 22 }, // اسم العميل
      { wch: 14 }, // رقم الهاتف
      { wch: 22 }, // البريد الإلكتروني
      { wch: 14 }, // رمز العضوية
      { wch: 12 }, // الفئة
      { wch: 14 }, // النقاط الحالية
      { wch: 20 }, // إجمالي النقاط المكتسبة
      { wch: 12 }, // عدد الزيارات
      { wch: 16 }, // المصدر
      { wch: 26 }, // آخر زيارة
      { wch: 26 }, // تاريخ الانضمام
      { wch: 26 }, // معرّف العميل
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "العملاء");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `عملاء-${establishment?.name || establishmentId}-${todayStr}.xlsx`);
  }

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(c) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
    });
    setFormError("");
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError("اسم العميل إلزامي");
      return;
    }
    if (!form.phone.trim()) {
      setFormError("رقم الهاتف إلزامي");
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
    };
    if (editingId) {
      updateCustomer(establishmentId, editingId, payload);
    } else {
      addCustomer(establishmentId, payload, "dashboard");
    }
    setDialogOpen(false);
  }

  function openMessageDialog(c) {
    setMessageTarget(c);
    setMessageText("");
    setMessageChannel("whatsapp");
    setMessageError("");
    setMessageSent(false);
  }

  async function handleSendMessage() {
    if (!messageText.trim()) {
      setMessageError("اكتب نص الرسالة أول");
      return;
    }
    setMessageSending(true);
    setMessageError("");
    try {
      if (messageChannel === "webchat") {
        await customersApi.sendWebChatMessage(messageTarget.id, messageText.trim(), establishmentId);
      } else {
        await customersApi.sendMessage(messageTarget.id, messageText.trim(), establishmentId);
      }
      setMessageSent(true);
      setMessageText("");
    } catch (err) {
      setMessageError(err.message || "تعذّر إرسال الرسالة");
    } finally {
      setMessageSending(false);
    }
  }

  function openOrderDialog(c) {
    setOrderTarget(c);
    setOrderAmount("");
    setOrderError("");
    setOrderSaved(false);
  }

  async function handleSaveOrder() {
    const amount = Number(orderAmount);
    if (!amount || amount <= 0) {
      setOrderError("لازم تدخل مبلغ صحيح أكبر من صفر");
      return;
    }
    setOrderSaving(true);
    setOrderError("");
    try {
      await orderEntriesApi.create({ customerId: orderTarget.id, amount }, establishmentId);
      setOrderSaved(true);
      setOrderAmount("");
    } catch (err) {
      setOrderError(err.message || "تعذّر حفظ الطلبية");
    } finally {
      setOrderSaving(false);
    }
  }

  if (!establishment) return null;

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            العملاء
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            بتنضاف هون تلقائيًا كل الحسابات يلي بتسجّل من صفحة المنيو العامة، بالإضافة لأي عميل نضيفه يدويًا
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.25} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
          <Button
            onClick={handleExportExcel}
            variant="outlined"
            startIcon={<FileDownloadRoundedIcon />}
            disabled={filtered.length === 0}
            sx={{
              borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
              color: tokens.ink,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "12px",
              px: 2.5,
              "&:hover": { borderColor: tokens.ink, backgroundColor: "rgba(0,0,0,0.03)" },
            }}
          >
            تصدير إكسل
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
              transition: "all 0.2s ease",
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" },
            }}
          >
            عميل جديد
          </Button>
        </Stack>
      </Stack>

      {/* تنبيه زيارات متكررة مشبوهة - يستاهل مراجعة يدوية */}
      {showFraudAlert && frequentVisitAlerts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            border: "1px solid rgba(237,108,2,0.35)",
            backgroundColor: "rgba(237,108,2,0.06)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <WarningAmberRoundedIcon sx={{ color: "#ED6C02", mt: 0.3 }} />
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.9rem" }}>
                  {frequentVisitAlerts.length} عميل بزيارات متكررة غير طبيعية (آخر أسبوع)
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowFraudAlert(false)}
                  sx={{ color: "text.secondary", minWidth: 0, fontFamily: '"IBM Plex Sans Arabic"', textTransform: "none" }}
                >
                  إخفاء
                </Button>
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                ممكن يكون زبون دائم فعلاً، أو احتمال مسح كود QR الثابت من غير مكان الفرع (بالبيت مثلاً). راجعهم وقرر بنفسك.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {frequentVisitAlerts.map((a) => (
                  <Chip
                    key={a.customerId}
                    label={`${a.name || a.phone || "عميل"} — ${a.visitsInWindow} زيارة`}
                    size="small"
                    onClick={() => a.customerId && navigate(`/admin/${establishmentId}/customers/${a.customerId}`)}
                    sx={{
                      cursor: "pointer",
                      fontFamily: '"IBM Plex Sans Arabic"',
                      fontWeight: 600,
                      backgroundColor: "rgba(237,108,2,0.12)",
                      color: "#ED6C02",
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* شريط أدوات الفلترة والبحث */}
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم، الهاتف، أو رقم العميل"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1, maxWidth: 380, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: tokens.muted }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            size="small"
            select
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          >
            {SEGMENT_FILTERS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="آخر زيارة من"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
          <TextField
            size="small"
            type="date"
            label="لغاية"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
        </Stack>

        {/* اختصارات الفترات الزمنية */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {[
            { key: "all", label: "كل الفترات" },
            { key: "today", label: "اليوم" },
            { key: "7d", label: "آخر ٧ أيام" },
            { key: "30d", label: "آخر ٣٠ يوم" },
            { key: "year", label: "هالسنة" },
          ].map((p) => (
            <Chip
              key={p.key}
              size="small"
              label={p.label}
              onClick={() => {
                applyQuickDateRange(p.key);
                setPage(0);
              }}
              sx={{
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                color: tokens.ink,
                transition: "all 0.2s ease",
                "&:hover": { backgroundColor: tokens.ink, color: tokens.paper },
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* الجدول الرئيسي بتصميم Glassmorphism */}
      <Paper
        elevation={0}
        sx={{
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
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                <TableCell>العميل</TableCell>
                <TableCell>رمز العضوية</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell align="center">النقاط</TableCell>
                <TableCell align="center">الزيارات</TableCell>
                <TableCell>المصدر</TableCell>
                <TableCell>آخر زيارة</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((c) => (
                <TableRow
                  key={c.id}
                  sx={{
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                    "&:last-child td": { borderBottom: "none" },
                  }}
                >
                  <TableCell>
                    <Stack spacing={0.3}>
                      <Typography
                        variant="body2"
                        onClick={() => navigate(`/admin/${establishmentId}/customers/${c.id}`)}
                        sx={{
                          fontWeight: 700,
                          cursor: "pointer",
                          color: tokens.ink,
                          fontFamily: '"IBM Plex Sans Arabic"',
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {c.name}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.75rem" }}>
                          {isDialablePhone(c.phone) ? c.phone : "رقم غير مؤكد"} · {c.id}
                        </Typography>
                        {isDialablePhone(c.phone) && (
                          <Tooltip title="افتح محادثة واتساب مباشرة">
                            <IconButton
                              size="small"
                              component="a"
                              href={`https://wa.me/${c.phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ p: 0.25, color: "#25D366", "&:hover": { backgroundColor: "rgba(37, 211, 102, 0.1)" } }}
                            >
                              <WhatsAppIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {c.membershipCode ? (
                      <Chip
                        size="small"
                        label={c.membershipCode}
                        sx={{
                          borderRadius: "6px",
                          backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 700,
                          fontSize: "0.72rem",
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <ActivityBadge activityTier={c.activityTier} recencyStatus={c.recencyStatus} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.9rem" }}>
                      {Number(c.points ?? 0).toLocaleString("ar")}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{c.visits ?? 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={SOURCE_LABEL[c.source] ?? "—"}
                      variant="outlined"
                      sx={{
                        borderColor: tokens.hairline || "rgba(0,0,0,0.1)",
                        color: "text.secondary",
                        borderRadius: "8px",
                        fontSize: "0.73rem",
                        height: 24,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                      {fmtFullDateTime(c.lastVisitAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="السجل الكامل للعميل">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/${establishmentId}/customers/${c.id}`)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                        >
                          <InsightsRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تسجيل طلبية">
                        <IconButton
                          size="small"
                          onClick={() => openOrderDialog(c)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                        >
                          <ReceiptLongRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={c.waId ? "بعت رسالة عبر البوت" : "لسا ما تواصل عبر البوت"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => openMessageDialog(c)}
                            disabled={!c.waId}
                            sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                          >
                            <SendRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(c)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDeleteId(c.id)}
                          sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: "error.main", backgroundColor: "rgba(211,47,47,0.08)" } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary", fontSize: "0.85rem" }}>
                    لا يوجد عملاء مطابقون لبحثك
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component={Box}
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5]}
          labelRowsPerPage="صفوف بالصفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          sx={{ borderTop: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}` }}
        />
      </Paper>

      {/* حوار إضافة/تعديل عميل */}
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
          {editingId ? "تعديل عميل" : "عميل جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}
            <TextField
              label="اسم العميل"
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="رقم الهاتف"
              size="small"
              fullWidth
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            حفظ
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
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف العميل؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
            هذا الإجراء نهائي ومش رح يرجع.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              deleteCustomer(establishmentId, confirmDeleteId);
              setConfirmDeleteId(null);
            }}
            variant="contained"
            color="error"
            sx={{ borderRadius: "10px", px: 2.5, fontWeight: 600 }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* ديالوج إرسال رسالة واتساب مخصصة */}
      <Dialog
        open={Boolean(messageTarget)}
        onClose={() => setMessageTarget(null)}
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
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
          إرسال رسالة إلى {messageTarget?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={messageChannel}
              onChange={(_, v) => v && setMessageChannel(v)}
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
              <ToggleButton value="whatsapp">واتساب</ToggleButton>
              <ToggleButton value="webchat">شات الويب</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
              {messageChannel === "webchat"
                ? "بتوصل مباشرة لتبويب \"الرسائل\" بشات الويب تبع العميل — بتشتغل بس لو عنده حساب شات ويب أصلاً."
                : "بتترسل من رقم البوت مباشرة عبر واتساب — مثلاً تأكيد استبدال نقاط، إشعار بمكافأة، أو أي رسالة تحب."}
            </Typography>
            <TextField
              label="نص الرسالة"
              multiline
              minRows={3}
              fullWidth
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              error={Boolean(messageError)}
              helperText={messageError}
              autoFocus
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            {messageSent && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم الإرسال ✅
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMessageTarget(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إغلاق
          </Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            disabled={messageSending}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* ديالوج تسجيل طلبية يدوية */}
      <Dialog
        open={Boolean(orderTarget)}
        onClose={() => setOrderTarget(null)}
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
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
          تسجيل طلبية لـ {orderTarget?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
              سجل منفصل بس للتحليل (مش مرتبط بالنقاط) - يفيد بمعرفة أوقات وأيام البيع القوية.
            </Typography>
            <TextField
              label="مبلغ الطلبية"
              type="number"
              fullWidth
              value={orderAmount}
              onChange={(e) => setOrderAmount(e.target.value)}
              error={Boolean(orderError)}
              helperText={orderError}
              autoFocus
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            {orderSaved && (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                تم التسجيل ✅
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOrderTarget(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إغلاق
          </Button>
          <Button
            onClick={handleSaveOrder}
            variant="contained"
            disabled={orderSaving}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}