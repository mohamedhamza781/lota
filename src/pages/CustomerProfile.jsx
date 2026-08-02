import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { ActivityBadge } from "../components/ActivityBadge";
import { tokens } from "../theme/theme";
import { customersApi } from "../api/customers";
import { analyticsApi } from "../api/analytics";
import { getCached, setCached } from "../utils/dataCache";
import { orderEntriesApi } from "../api/orderEntries";
import { couponsApi } from "../api/coupons";
import { normalizeCustomerProfile } from "../api/adapters";

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

function fmtDateOnly(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function isDialablePhone(phone) {
  return Boolean(phone) && /^\d{8,15}$/.test(phone);
}

function couponDiscountLabel(c) {
  return c.discountType === "percentage" ? `${c.discountValue}٪` : `${c.discountValue} ₪`;
}

function couponStatus(c) {
  if (!c.isActive) return { label: "موقوف", tone: "muted" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: "منتهي", tone: "muted" };
  if (c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses) return { label: "استنفد الحد", tone: "muted" };
  return { label: "فعّال", tone: "ink" };
}

const MONTH_NAMES_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
function fmtMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  return `${MONTH_NAMES_AR[Number(m) - 1]} ${y}`;
}

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
  "&:hover": {
    boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
  },
};

export default function CustomerProfile() {
  const { establishmentId, customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(() => getCached(`customerProfile:${customerId}`) ?? null);
  const [behavior, setBehavior] = useState(() => getCached(`customerBehavior:${customerId}`) ?? null);
  const [loading, setLoading] = useState(() => getCached(`customerProfile:${customerId}`) === undefined);
  const [error, setError] = useState("");

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageChannel, setMessageChannel] = useState("whatsapp"); // "whatsapp" | "webchat"
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderAmount, setOrderAmount] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  // كوبونات هاد العميل تحديداً (اللي صاحب المطعم صرفها إله شخصياً من صفحة
  // "الكوبونات") - منجيبها لحالها (مش مرتبطة بـbehavior) عشان تظهر فوراً
  const [coupons, setCoupons] = useState(() => getCached(`customerCoupons:${customerId}`) ?? []);
  const [couponsLoading, setCouponsLoading] = useState(() => getCached(`customerCoupons:${customerId}`) === undefined);

  function load() {
    if (!customerId || !establishmentId) return;
    setError("");
    Promise.all([
      customersApi.get(customerId, establishmentId).then(normalizeCustomerProfile),
      analyticsApi.customerBehavior(customerId, establishmentId),
    ])
      .then(([c, b]) => {
        setCustomer(c);
        setBehavior(b);
        setCached(`customerProfile:${customerId}`, c);
        setCached(`customerBehavior:${customerId}`, b);
      })
      .catch((err) => setError(err.message || "تعذّر جلب بيانات العميل"))
      .finally(() => setLoading(false));
  }

  function loadCoupons() {
    if (!customerId || !establishmentId) return;
    couponsApi
      .list(establishmentId, customerId)
      .then((data) => {
        setCoupons(data || []);
        setCached(`customerCoupons:${customerId}`, data || []);
      })
      .catch(() => setCoupons([]))
      .finally(() => setCouponsLoading(false));
  }

  useEffect(() => {
    load();
    loadCoupons();
  }, [customerId, establishmentId]);

  async function handleSendMessage() {
    if (!messageText.trim()) {
      setMessageError("اكتب نص الرسالة أول");
      return;
    }
    setMessageSending(true);
    setMessageError("");
    try {
      if (messageChannel === "webchat") {
        await customersApi.sendWebChatMessage(customerId, messageText.trim(), establishmentId);
      } else {
        await customersApi.sendMessage(customerId, messageText.trim(), establishmentId);
      }
      setMessageSent(true);
      setMessageText("");
    } catch (err) {
      setMessageError(err.message || "تعذّر إرسال الرسالة");
    } finally {
      setMessageSending(false);
    }
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
      await orderEntriesApi.create({ customerId, amount }, establishmentId);
      setOrderSaved(true);
      setOrderAmount("");
      load();
    } catch (err) {
      setOrderError(err.message || "تعذّر حفظ الطلبية");
    } finally {
      setOrderSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={40} width={200} sx={{ borderRadius: "12px" }} />
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: "20px" }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={90} sx={{ borderRadius: "16px" }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (error || !customer) {
    return (
      <Paper elevation={0} sx={{ ...cardStyle, p: 5, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error || "العميل غير موجود"}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3.5}>
      {/* هيدر العودة والعنوان */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <IconButton
          size="small"
          onClick={() => navigate(`/admin/${establishmentId}/customers`)}
          sx={{
            backgroundColor: "rgba(0,0,0,0.03)",
            borderRadius: "10px",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.06)" },
          }}
        >
          <ArrowForwardRoundedIcon />
        </IconButton>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem" }}>
          {customer.name}
        </Typography>
        <ActivityBadge activityTier={customer.activityTier} recencyStatus={customer.recencyStatus} />
      </Stack>

      {/* كارت بيانات التواصل والإجراءات بتصميم Glassmorphism */}
      <Paper elevation={0} sx={cardStyle}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', color: "text.secondary", fontWeight: 600 }}>
              {isDialablePhone(customer.phone) ? customer.phone : "رقم غير مؤكد"} · {customer.id}
            </Typography>
            {isDialablePhone(customer.phone) && (
              <Tooltip title="افتح محادثة واتساب مباشرة">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://wa.me/${customer.phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "#25D366", p: 0.5, "&:hover": { backgroundColor: "rgba(37, 211, 102, 0.1)" } }}
                >
                  <WhatsAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Chip
              size="small"
              label={SOURCE_LABEL[customer.source] ?? "—"}
              variant="outlined"
              sx={{ borderColor: tokens.hairline || "rgba(0,0,0,0.1)", color: "text.secondary", borderRadius: "8px", fontWeight: 600 }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SendRoundedIcon fontSize="small" />}
              disabled={!customer.waId}
              onClick={() => {
                setMessageOpen(true);
                setMessageText("");
                setMessageChannel("whatsapp");
                setMessageError("");
                setMessageSent(false);
              }}
              sx={{
                borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
                color: tokens.ink,
                borderRadius: "10px",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                px: 2,
              }}
            >
              إرسال رسالة
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<ReceiptLongRoundedIcon fontSize="small" />}
              onClick={() => {
                setOrderOpen(true);
                setOrderAmount("");
                setOrderError("");
                setOrderSaved(false);
              }}
              sx={{
                backgroundColor: tokens.ink,
                color: tokens.paper,
                borderRadius: "10px",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                px: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              تسجيل طلبية
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* أرقام سريعة */}
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="رصيد النقاط" value={Number(customer.points ?? 0).toLocaleString("ar")} unit="نقطة" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="إجمالي الزيارات" value={behavior?.visitStats.totalVisits ?? customer.visits ?? 0} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="معدل الزيارة الأسبوعي" value={behavior?.visitStats.weeklyVisitRate ?? 0} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="إجمالي الإنفاق" value={(behavior?.orderStats.totalSpent ?? 0).toLocaleString("ar")} unit="₪" />
          </Grid>
        </Grid>
      </Box>

      {/* الكوبونات المُصدرة لهاد العميل تحديداً */}
      <Paper elevation={0} sx={cardStyle}>
        <SectionHeader
          title="الكوبونات"
          action={
            <Button
              size="small"
              startIcon={<LocalOfferRoundedIcon fontSize="small" />}
              onClick={() => navigate(`/admin/${establishmentId}/coupons`, { state: { presetCustomerId: customerId } })}
              sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, color: tokens.ink, borderRadius: "8px" }}
            >
              كوبون جديد
            </Button>
          }
        />
        <Box sx={{ mt: 2 }}>
          {couponsLoading ? (
            <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
              جاري التحميل…
            </Typography>
          ) : coupons.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
              ما في كوبونات مصروفة لهاد العميل بعد
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
              {coupons.map((c) => {
                const status = couponStatus(c);
                return (
                  <Grid item xs={12} sm={6} md={4} key={c._id}>
                    <Box
                      sx={{
                        p: 1.75,
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: tokens.hairline || "rgba(0,0,0,0.08)",
                        backgroundColor: "rgba(0,0,0,0.01)",
                        height: "100%",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocalOfferRoundedIcon fontSize="small" sx={{ color: tokens.muted }} />
                          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "0.92rem" }}>
                            {c.code}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={status.label}
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            backgroundColor: status.tone === "ink" ? tokens.ink : "transparent",
                            color: status.tone === "ink" ? tokens.paper : tokens.muted,
                            border: `1px solid ${status.tone === "ink" ? tokens.ink : tokens.hairline || "rgba(0,0,0,0.1)"}`,
                          }}
                        />
                      </Stack>
                      {c.description && (
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, fontSize: "0.78rem" }}>
                          {c.description}
                        </Typography>
                      )}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25 }}>
                        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          خصم {couponDiscountLabel(c)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.mutedLight, fontSize: "0.72rem" }}>
                          {c.expiresAt ? `ينتهي ${fmtDateOnly(c.expiresAt)}` : "بلا تاريخ انتهاء"}
                        </Typography>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>

      {behavior && (
        <>
          {/* أنماط الزيارة */}
          <Paper elevation={0} sx={cardStyle}>
            <SectionHeader title="أنماط الزيارة" />
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1, mb: 2.5 }}>
                {behavior.visitStats.firstVisitAt && (
                  <Chip
                    label={`أول زيارة: ${fmtFullDateTime(behavior.visitStats.firstVisitAt)}`}
                    sx={{ borderRadius: "8px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 600, fontSize: "0.8rem" }}
                  />
                )}
                {behavior.visitStats.lastVisitAt && (
                  <Chip
                    label={`آخر زيارة: ${fmtFullDateTime(behavior.visitStats.lastVisitAt)}`}
                    sx={{ borderRadius: "8px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 600, fontSize: "0.8rem" }}
                  />
                )}
                {behavior.visitStats.favoriteDay && (
                  <Chip
                    label={`أكثر يوم حضور: ${behavior.visitStats.favoriteDay}`}
                    sx={{ borderRadius: "8px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 600, fontSize: "0.8rem" }}
                  />
                )}
                {behavior.visitStats.favoriteHour !== null && behavior.visitStats.favoriteHour !== undefined && (
                  <Chip
                    label={`أكثر ساعة حضور: ${behavior.visitStats.favoriteHour}:00`}
                    sx={{ borderRadius: "8px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 600, fontSize: "0.8rem" }}
                  />
                )}
              </Stack>

              {/* اتجاه الزيارات الشهري */}
              {behavior.visitStats.visitTrend && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    border: "1px solid",
                    borderColor: tokens.hairline || "rgba(0,0,0,0.08)",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                    mb: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      backgroundColor: "rgba(0,0,0,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {behavior.visitStats.visitTrend.direction === "up" && <TrendingUpRoundedIcon sx={{ color: tokens.ink }} />}
                    {behavior.visitStats.visitTrend.direction === "down" && <TrendingDownRoundedIcon sx={{ color: tokens.ink }} />}
                    {behavior.visitStats.visitTrend.direction === "flat" && <TrendingFlatRoundedIcon sx={{ color: tokens.ink }} />}
                  </Box>
                  <Stack spacing={0.3}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                      {behavior.visitStats.visitTrend.direction === "up" && "زياراته الشهرية ارتفعت"}
                      {behavior.visitStats.visitTrend.direction === "down" && "زياراته الشهرية انخفضت"}
                      {behavior.visitStats.visitTrend.direction === "flat" && "زياراته الشهرية مستقرة"}
                      {behavior.visitStats.visitTrend.changePercent !== null && (
                        <Typography component="span" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, mr: 0.5 }}>
                          {" "}
                          ({behavior.visitStats.visitTrend.changePercent > 0 ? "+" : ""}
                          {behavior.visitStats.visitTrend.changePercent}٪)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                      {fmtMonthLabel(behavior.visitStats.visitTrend.currentMonth)}: {behavior.visitStats.visitTrend.currentCount} زيارة
                      {behavior.visitStats.visitTrend.previousMonth &&
                        ` — ${fmtMonthLabel(behavior.visitStats.visitTrend.previousMonth)}: ${behavior.visitStats.visitTrend.previousCount} زيارة`}
                    </Typography>
                  </Stack>
                </Stack>
              )}

              {/* الزيارات شهرياً */}
              {behavior.visitStats.monthlyVisits?.length > 0 && (
                <Stack spacing={1} sx={{ mb: 2.5 }}>
                  <Typography variant="caption" sx={{ color: tokens.muted, fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                    الزيارات شهرياً
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      border: "1px solid",
                      borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                      backgroundColor: "rgba(0,0,0,0.01)",
                    }}
                  >
                    {[...behavior.visitStats.monthlyVisits].reverse().map((m) => (
                      <Stack
                        key={m.month}
                        direction="row"
                        justifyContent="space-between"
                        sx={{ py: 0.8, px: 1, borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.06)"}`, "&:last-child": { borderBottom: "none" } }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>
                          {fmtMonthLabel(m.month)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {m.count} زيارة
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                </Stack>
              )}

              {/* سجل الزيارات كامل */}
              {behavior.visitStats.allVisits?.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ color: tokens.muted, fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                    سجل الزيارات كامل ({behavior.visitStats.allVisits.length} زيارة)
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 220,
                      overflowY: "auto",
                      p: 1.5,
                      borderRadius: "14px",
                      border: "1px solid",
                      borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                      backgroundColor: "rgba(0,0,0,0.01)",
                    }}
                  >
                    {behavior.visitStats.allVisits.map((v, i) => (
                      <Typography
                        key={i}
                        variant="body2"
                        sx={{
                          py: 0.6,
                          px: 1,
                          borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.06)"}`,
                          "&:last-child": { borderBottom: "none" },
                          fontSize: "0.82rem",
                        }}
                      >
                        {fmtFullDateTime(v)}
                      </Typography>
                    ))}
                  </Box>
                </Stack>
              )}
            </Box>
          </Paper>

          {/* تفاعله مع النظام */}
          {behavior.engagementSummary && (
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="تفاعله مع النظام" />
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2} sx={{ mb: behavior.engagementSummary.lastInteractionAt ? 2 : 0 }}>
                  <Grid item xs={6} sm={3}>
                    <StatCard label="الزيارات" value={behavior.engagementSummary.totalVisits} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard label="صور الوجبات المرسلة" value={behavior.engagementSummary.mealPhotosSent} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard label="الآراء/التقييمات" value={behavior.engagementSummary.feedbackGiven} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard label="رسائله عبر واتساب" value={behavior.engagementSummary.inboundMessages} />
                  </Grid>
                </Grid>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1}
                  sx={{
                    p: 1.5,
                    borderRadius: "12px",
                    border: "1px solid",
                    borderColor: tokens.hairline || "rgba(0,0,0,0.08)",
                    backgroundColor: "rgba(0,0,0,0.015)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                    مجموع التفاعلات الكلي: {behavior.engagementSummary.totalInteractions.toLocaleString("ar")}
                  </Typography>
                  {behavior.engagementSummary.lastInteractionAt && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      آخر تفاعل: {fmtFullDateTime(behavior.engagementSummary.lastInteractionAt)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Paper>
          )}

          {/* تفضيلات الأكل */}
          {(behavior.mealPreferences.favoriteCategory || behavior.mealPreferences.topMeals.length > 0) && (
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="تفضيلات الأكل" />
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1, mt: 2 }}>
                {behavior.mealPreferences.favoriteCategory && (
                  <Chip
                    label={`يفضّل: ${behavior.mealPreferences.favoriteCategory}`}
                    sx={{ borderRadius: "8px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 700 }}
                  />
                )}
                {behavior.mealPreferences.topMeals.map((m) => (
                  <Chip
                    key={m.mealName}
                    size="small"
                    label={`${m.mealName} (${m.count})`}
                    sx={{ borderRadius: "8px", fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Paper>
          )}

          {/* الطلبات الكاملة */}
          <Paper elevation={0} sx={cardStyle}>
            <SectionHeader title="سجل الطلبات" />
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                <Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    إجمالي الطلبات
                  </Typography>
                  <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.1rem" }}>
                    {behavior.orderStats.totalOrders}
                  </Typography>
                </Stack>
                <Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    متوسط الطلبية
                  </Typography>
                  <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.1rem" }}>
                    {behavior.orderStats.avgOrderValue.toLocaleString("ar")} ₪
                  </Typography>
                </Stack>
              </Stack>

              {behavior.orderStats.recentOrders?.length > 0 ? (
                <Box
                  sx={{
                    maxHeight: 220,
                    overflowY: "auto",
                    p: 1.5,
                    borderRadius: "14px",
                    border: "1px solid",
                    borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                    backgroundColor: "rgba(0,0,0,0.01)",
                  }}
                >
                  {behavior.orderStats.recentOrders.map((o, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      justifyContent="space-between"
                      sx={{ py: 0.8, px: 1, borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.06)"}`, "&:last-child": { borderBottom: "none" } }}
                    >
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.83rem" }}>
                        {fmtDateOnly(o.orderedAt)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                        {Number(o.amount).toLocaleString("ar")} ₪
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                  ما في طلبات مسجّلة بعد
                </Typography>
              )}
            </Box>
          </Paper>

          {/* الآراء والتقييمات */}
          <Paper elevation={0} sx={cardStyle}>
            <SectionHeader title="الآراء والتقييمات عبر البوت (شهرياً)" />
            <Box sx={{ mt: 2 }}>
              {behavior.feedbackByMonth?.length > 0 ? (
                <Stack spacing={2}>
                  {behavior.feedbackByMonth.map((m) => (
                    <Stack key={m.month} spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                          {fmtMonthLabel(m.month)}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {m.count.toLocaleString("ar")} رأي
                          </Typography>
                          {m.avgRating !== null && (
                            <Chip
                              size="small"
                              label={`متوسط ${m.avgRating} / ٥`}
                              sx={{ borderRadius: "6px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontWeight: 700, fontSize: "0.72rem" }}
                            />
                          )}
                        </Stack>
                      </Stack>
                      <Stack spacing={0.8} sx={{ pr: 1 }}>
                        {m.entries.map((f, i) => (
                          <Box
                            key={i}
                            sx={{
                              p: 1.5,
                              borderRadius: "10px",
                              border: "1px solid",
                              borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                              backgroundColor: "rgba(0,0,0,0.01)",
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: tokens.muted }}>
                                {fmtDateOnly(f.createdAt)}
                              </Typography>
                              {f.ratingValue && (
                                <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                                  {f.ratingValue} / ٥
                                </Typography>
                              )}
                            </Stack>
                            <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem" }}>
                              «{f.message}»
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                  ما في آراء مسجّلة بعد
                </Typography>
              )}
            </Box>
          </Paper>
        </>
      )}

      {/* ديالوج إرسال رسالة واتساب */}
      <Dialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
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
          إرسال رسالة إلى {customer.name}
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
                : "بتترسل من رقم البوت مباشرة عبر واتساب."}
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
          <Button onClick={() => setMessageOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
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

      {/* ديالوج تسجيل طلبية */}
      <Dialog
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
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
          تسجيل طلبية لـ {customer.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
          <Button onClick={() => setOrderOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
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