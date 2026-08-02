import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { RatioBar } from "../components/RatioBar";
import { TierTrendChart } from "../components/TierTrendChart";
import { useAuth } from "../auth/AuthContext";
import { tokens } from "../theme/theme";
import { analyticsApi } from "../api/analytics";
import { notificationsApi } from "../api/notifications";
import { customersApi } from "../api/customers";
import { getCached, setCached } from "../utils/dataCache";

const LEDGER = ["٠١", "٠٢", "٠٣", "٠٤", "٠٥", "٠٦", "٠٧"];

const ACTIVITY_TIER_LABELS = { new: "زائر جديد", hesitant: "متردد", active: "نشط", loyal: "وفيّ", ambassador: "سفير" };
const RECENCY_LABELS = { at_risk: "معرّض للفقد", lost: "مفقود" };
const GRANULARITY_LABELS = { day: "يومي", week: "أسبوعي", month: "شهري" };

const SOURCE_LABELS = [
  { key: "whatsapp_bot",  label: "بوت الواتساب" },
  { key: "web_chat",      label: "شات الويب" },
  { key: "menu_dialog",   label: "مسح QR المنيو" },
  { key: "celebrity_qr",  label: "QR مشاهير" },
  { key: "referral_link", label: "روابط إحالة" },
  { key: "manual_form",   label: "إضافة يدوية (لوحة التحكم)" },
];

function effectiveStatusKey(c) {
  if (c.recencyStatus && c.recencyStatus !== "normal") return c.recencyStatus;
  return c.activityTier || "new";
}

function fmtBucketLabel(bucket, granularity) {
  if (!bucket) return "—";
  if (granularity === "month") {
    const [y, m] = bucket.split("-");
    return `${m}/${y}`;
  }
  const d = new Date(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  if (granularity === "week") return `أسبوع ${d.getDate()}/${d.getMonth() + 1}`;
  return d.toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildAlerts(customers, kpis) {
  const list = [];
  if (kpis.atRiskCount > 0) {
    list.push({
      id: "at-risk",
      urgent: true,
      message: `${kpis.atRiskCount.toLocaleString("ar")} عميل معرّض للفقد بحاجة لمتابعة`,
    });
  }
  if (kpis.newThisMonth > 0) {
    list.push({
      id: "new-this-month",
      urgent: false,
      message: `${kpis.newThisMonth.toLocaleString("ar")} عميل جديد انضم هذا الشهر`,
    });
  }
  return list;
}

export default function Dashboard() {
  const { establishmentId } = useParams();
  const { establishments, ensureEstablishmentDetail } = useAuth();

  useEffect(() => {
    if (establishmentId) ensureEstablishmentDetail(establishmentId);
  }, [establishmentId, ensureEstablishmentDetail]);

  const establishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];
  const customers = useMemo(() => establishment?.customers ?? [], [establishment]);

  const [visitKpis, setVisitKpis] = useState(() => getCached(`dashboardKpis:${establishment?.id}`) ?? null);
  const [ownerNotifications, setOwnerNotifications] = useState(() => getCached(`ownerNotifications:${establishment?.id}`) ?? []);
  const [granularity, setGranularity] = useState("day");
  const [trendData, setTrendData] = useState(null);
  const [restaurantRating, setRestaurantRating] = useState(() => getCached(`restaurantRating:${establishment?.id}`) ?? null);
  const [visitQuality, setVisitQuality] = useState(() => getCached(`visitQuality:${establishment?.id}`) ?? null);
  const [pointsBreakdown, setPointsBreakdown] = useState(() => getCached(`pointsBreakdown:${establishment?.id}`) ?? null);

  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [allRatingsDialogOpen, setAllRatingsDialogOpen] = useState(false);
  const [visitsDialogOpen, setVisitsDialogOpen] = useState(false);
  const [visitsDialogGranularity, setVisitsDialogGranularity] = useState("day");
  const [visitsDialogData, setVisitsDialogData] = useState({});
  const [atRiskDialogOpen, setAtRiskDialogOpen] = useState(false);
  const [atRiskCustomers, setAtRiskCustomers] = useState(null);
  const [atRiskLoading, setAtRiskLoading] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [newCustomersDialogOpen, setNewCustomersDialogOpen] = useState(false);
  const [newCustomersPeriod, setNewCustomersPeriod] = useState("month");
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [bestTimeDialogOpen, setBestTimeDialogOpen] = useState(false);
  const [worstTimeDialogOpen, setWorstTimeDialogOpen] = useState(false);
  const [timeDialogGranularity, setTimeDialogGranularity] = useState("day");

  useEffect(() => {
    if (!establishment?.id) return;
    const id = establishment.id;
    let cancelled = false;
    analyticsApi
      .dashboardKpis(id)
      .then((data) => {
        if (cancelled) return;
        setVisitKpis(data);
        setCached(`dashboardKpis:${id}`, data);
      })
      .catch(() => { if (!cancelled) setVisitKpis(null); });
    notificationsApi
      .list(id, true)
      .then((data) => {
        if (cancelled) return;
        const list = data?.notifications ?? [];
        setOwnerNotifications(list);
        setCached(`ownerNotifications:${id}`, list);
      })
      .catch(() => { if (!cancelled) setOwnerNotifications([]); });
    analyticsApi
      .restaurantRating(id)
      .then((data) => {
        if (cancelled) return;
        setRestaurantRating(data);
        setCached(`restaurantRating:${id}`, data);
      })
      .catch(() => { if (!cancelled) setRestaurantRating(null); });
    analyticsApi
      .visitQuality(id, 30)
      .then((data) => {
        if (cancelled) return;
        setVisitQuality(data);
        setCached(`visitQuality:${id}`, data);
      })
      .catch(() => { if (!cancelled) setVisitQuality(null); });
    analyticsApi
      .pointsBreakdown(id)
      .then((data) => {
        if (cancelled) return;
        setPointsBreakdown(data);
        setCached(`pointsBreakdown:${id}`, data);
      })
      .catch(() => { if (!cancelled) setPointsBreakdown(null); });
    return () => { cancelled = true; };
  }, [establishment?.id]);

  useEffect(() => {
    if (!establishment?.id) return;
    const cacheKey = `trend:${establishment.id}:${granularity}`;
    const cachedTrend = getCached(cacheKey);
    if (cachedTrend !== undefined) setTrendData(cachedTrend);

    let cancelled = false;
    analyticsApi
      .trend(establishment.id, granularity)
      .then((data) => {
        if (cancelled) return;
        setTrendData(data);
        setCached(cacheKey, data);
      })
      .catch(() => { if (!cancelled) setTrendData(null); });
    return () => { cancelled = true; };
  }, [establishment?.id, granularity]);

  useEffect(() => {
    if (!visitsDialogOpen || !establishment?.id) return;
    if (visitsDialogData[visitsDialogGranularity]) return;
    analyticsApi
      .trend(establishment.id, visitsDialogGranularity)
      .then((data) => {
        setVisitsDialogData((prev) => ({ ...prev, [visitsDialogGranularity]: data }));
      })
      .catch(() => {});
  }, [visitsDialogOpen, visitsDialogGranularity, establishment?.id, visitsDialogData]);

  useEffect(() => {
    if ((!atRiskDialogOpen && !lostDialogOpen) || !establishment?.id || atRiskCustomers !== null) return;
    setAtRiskLoading(true);
    customersApi
      .atRisk(establishment.id)
      .then((data) => setAtRiskCustomers(data || []))
      .catch(() => setAtRiskCustomers([]))
      .finally(() => setAtRiskLoading(false));
  }, [atRiskDialogOpen, lostDialogOpen, establishment?.id, atRiskCustomers]);

  const alerts = useMemo(() => {
    const base = establishment ? buildAlerts(customers, establishment.kpis) : [];
    const fromServer = ownerNotifications.map((n) => ({ id: n._id, urgent: true, message: n.body }));
    return [...fromServer, ...base];
  }, [establishment, customers, ownerNotifications]);

  const rfmDistribution = useMemo(() => {
    const order = ["new", "hesitant", "active", "loyal", "ambassador", "at_risk", "lost"];
    const buckets = Object.fromEntries(order.map((k) => [k, 0]));
    customers.forEach((c) => {
      const key = effectiveStatusKey(c);
      if (buckets[key] !== undefined) buckets[key] += 1;
    });
    return order.map((key) => ({
      key,
      label: ACTIVITY_TIER_LABELS[key] || RECENCY_LABELS[key],
      count: buckets[key],
      emphasis: key === "at_risk" || key === "lost",
    }));
  }, [customers]);
  const rfmTotal = customers.length;

  const atRiskOnly = useMemo(
    () => (atRiskCustomers || []).filter((c) => c.recencyStatus === "at_risk"),
    [atRiskCustomers]
  );
  const lostOnly = useMemo(
    () => (atRiskCustomers || []).filter((c) => c.recencyStatus === "lost"),
    [atRiskCustomers]
  );

  const newCustomersList = useMemo(() => {
    const now = new Date();
    let start;
    if (newCustomersPeriod === "day") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (newCustomersPeriod === "week") {
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return customers
      .filter((c) => c.createdAt && new Date(c.createdAt) >= start)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [customers, newCustomersPeriod]);

  const sourceBreakdown = useMemo(() => {
    const counts = { whatsapp_bot: 0, web_chat: 0, menu_dialog: 0, manual_form: 0, celebrity_qr: 0, referral_link: 0 };
    customers.forEach((c) => {
      const key = counts[c.source] !== undefined ? c.source : "manual_form";
      counts[key] += 1;
    });
    return SOURCE_LABELS.map(({ key, label }) => ({ key, label, count: counts[key] || 0 }));
  }, [customers]);

  const visitsDialogSummary = useMemo(() => {
    const data = visitsDialogData[visitsDialogGranularity];
    if (!data?.trend) return null;
    return data.trend.reduce(
      (acc, t) => ({
        newVisits:       acc.newVisits       + (t.newVisits       || 0),
        returningVisits: acc.returningVisits + (t.returningVisits || 0),
        total:           acc.total           + (t.totalVisits     || 0),
      }),
      { newVisits: 0, returningVisits: 0, total: 0 }
    );
  }, [visitsDialogData, visitsDialogGranularity]);

  if (!establishment) return null;
  const kpis    = establishment.kpis;
  const extremes = trendData?.extremes;
  // مصدر "نقاط مستبدلة" الحقيقي هو /analytics/dashboard-kpis (محسوب من
  // سجل Transaction فعلياً لكل منشأة) - kpis.pointsRedeemed القادم من
  // kpisFromCustomers بيضل صفر دايماً لأدمن المنشأة (مش عنده وصول لـ
  // summary تبع super_admin)، فمنفضّل قيمة visitKpis لما توصل.
  const pointsRedeemed = visitKpis?.pointsRedeemed ?? kpis.pointsRedeemed;

  return (
    <Stack spacing={3.5}>
      {/* سطر افتتاحي */}
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1.15rem" }}>
          {kpis.totalCustomers.toLocaleString("ar")} كيانًا مسجّلاً بدفتر {establishment.name}
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
          — {kpis.atRiskCount.toLocaleString("ar")} منهم بحاجة لمتابعة الآن
        </Typography>
      </Stack>

      {/* Chart تصنيف العملاء */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
          backdropFilter: "blur(12px)",
          border: "1px solid",
          borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
          transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
          },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <SectionHeader title="تصنيف العملاء حسب عدد مرات الزيارة" />

          <ToggleButtonGroup
            size="small"
            exclusive
            value={granularity}
            onChange={(_, v) => v && setGranularity(v)}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              p: "4px",
              borderRadius: "12px",
              border: "none",
              "& .MuiToggleButtonGroup-grouped": {
                border: "none",
                mx: "2px",
                borderRadius: "8px !important",
              },
              "& .MuiToggleButton-root": {
                fontFamily: '"IBM Plex Sans Arabic"',
                fontSize: "0.78rem",
                fontWeight: 600,
                px: 2,
                py: 0.6,
                color: tokens.muted,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.04)",
                  color: tokens.ink,
                },
                "&.Mui-selected": {
                  backgroundColor: tokens.ink,
                  color: tokens.paper,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  "&:hover": {
                    backgroundColor: tokens.inkSoft || tokens.ink,
                  },
                },
              },
            }}
          >
            <ToggleButton value="day">يومي</ToggleButton>
            <ToggleButton value="week">أسبوعي</ToggleButton>
            <ToggleButton value="month">شهري</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <TierTrendChart trend={trendData?.trend} granularity={granularity} />
      </Paper>

      {/* ── معدل جودة الزيارات ── */}
      <VisitQualityCard
        score={visitQuality?.overallScore ?? null}
        breakdown={visitQuality?.breakdown}
      />

      {/* نمو العملاء */}
      <Box>
        <SectionHeader title="نمو العملاء" />
        <Box sx={{ overflow: "hidden" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Box
                onClick={() => setNewCustomersDialogOpen(true)}
                sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
              >
                <StatCard
                  index={LEDGER[0]}
                  delay={0}
                  label="عملاء جدد (هذا الشهر)"
                  value={kpis.newThisMonth.toLocaleString("ar")}
                  delta="أول تسجيل لهم — انقر لعرض الأسماء"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box
                onClick={() => setAtRiskDialogOpen(true)}
                sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
              >
                <StatCard
                  index={LEDGER[1]}
                  delay={1}
                  label="عملاء معرّضون للفقد"
                  value={kpis.atRiskCount.toLocaleString("ar")}
                  delta="غيابهم عن البوت/QR وصل لحد يقلق — انقر لعرض القائمة والسبب"
                  urgent
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box
                onClick={() => setLostDialogOpen(true)}
                sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
              >
                <StatCard
                  label="عملاء مفقودون"
                  value={kpis.lostCount.toLocaleString("ar")}
                  delta="غياب طويل عن البوت وQR — انقر لعرض القائمة"
                  urgent
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box
                onClick={() => setSegmentDialogOpen(true)}
                sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
              >
                <StatCard
                  index={LEDGER[2]}
                  delay={2}
                  label="إجمالي العملاء"
                  value={kpis.totalCustomers.toLocaleString("ar")}
                  delta={`+${kpis.newThisMonth.toLocaleString("ar")} هذا الشهر — انقر لعرض تصنيف العملاء`}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box
                onClick={() => setSourceDialogOpen(true)}
                sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
              >
                <StatCard
                  label="مصدر الوصول"
                  value="التوزيع الكامل"
                  delta="انقر لعرض التفصيل حسب القناة"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* الزيارات والنشاط */}
      {visitKpis && (
        <Box>
          <SectionHeader title="الزيارات والنشاط" />
          <Box sx={{ overflow: "hidden" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="متوسط الزيارات/عميل"
                  value={visitKpis.avgVisitsPerCustomer.value.toLocaleString("ar")}
                  delta="لعملاء عمرهم ٨ أسابيع+"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  onClick={() => setVisitsDialogOpen(true)}
                  sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
                >
                  <StatCard
                    index={LEDGER[3]}
                    delay={3}
                    label="إجمالي عدد الزيارات"
                    value={(visitKpis?.totalVisits?.thisMonth ?? 0).toLocaleString("ar")}
                    delta="هذا الشهر — انقر للتفصيل"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label={`أكبر عدد زيارات (${GRANULARITY_LABELS[granularity]})`}
                  value={extremes?.best ? extremes.best.count.toLocaleString("ar") : "—"}
                  delta={extremes?.best ? fmtBucketLabel(extremes.best.bucket, granularity) : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label={`أقل عدد زيارات (${GRANULARITY_LABELS[granularity]})`}
                  value={extremes?.worst ? extremes.worst.count.toLocaleString("ar") : "—"}
                  delta={extremes?.worst ? fmtBucketLabel(extremes.worst.bucket, granularity) : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  onClick={() => { setTimeDialogGranularity(granularity); setBestTimeDialogOpen(true); }}
                  sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
                >
                  <StatCard
                    label={`أفضل وقت للزيارة (${GRANULARITY_LABELS[granularity]})`}
                    value={visitKpis?.visitTimes?.[granularity]?.best?.label ?? "—"}
                    delta={
                      visitKpis?.visitTimes?.[granularity]?.best
                        ? `${visitKpis.visitTimes[granularity].best.count.toLocaleString("ar")} زيارة — انقر للتفصيل`
                        : "لسا ما في بيانات كفاية"
                    }
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  onClick={() => { setTimeDialogGranularity(granularity); setWorstTimeDialogOpen(true); }}
                  sx={{ cursor: "pointer", "&:hover": { opacity: 0.92 }, transition: "opacity 0.2s ease" }}
                >
                  <StatCard
                    label={`أسوأ وقت للزيارة (${GRANULARITY_LABELS[granularity]})`}
                    value={visitKpis?.visitTimes?.[granularity]?.worst?.label ?? "—"}
                    delta={
                      visitKpis?.visitTimes?.[granularity]?.worst
                        ? `${visitKpis.visitTimes[granularity].worst.count.toLocaleString("ar")} زيارة — انقر للتفصيل`
                        : "لسا ما في بيانات كفاية"
                    }
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      {/* النقاط والاسترداد */}
      <Box>
        <SectionHeader title="النقاط والاسترداد" />
        <Box sx={{ overflow: "hidden" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard index={LEDGER[4]} delay={4} label="نقاط صادرة"   value={kpis.pointsIssued.toLocaleString("ar")}   unit="نقطة" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard index={LEDGER[5]} delay={5} label="نقاط مستبدلة" value={pointsRedeemed.toLocaleString("ar")} unit="نقطة" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                index={LEDGER[6]}
                delay={6}
                label="نسبة الاستبدال"
                value={kpis.pointsIssued ? ((pointsRedeemed / kpis.pointsIssued) * 100).toFixed(1) : "0.0"}
                unit="٪"
              />
            </Grid>
            {pointsBreakdown && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="نقاط الزيارات" value={pointsBreakdown.visitPoints.toLocaleString("ar")}      unit="نقطة" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="نقاط الفاتورة" value={pointsBreakdown.invoicePoints.toLocaleString("ar")}    unit="نقطة" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="نقاط الصور"    value={pointsBreakdown.photoPoints.toLocaleString("ar")}      unit="نقطة" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="نقاط الإحالة"  value={pointsBreakdown.referralPoints.toLocaleString("ar")}   unit="نقطة" delta="من روابط الدعوة وQR المشاهير" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="نقاط التفاعل"  value={pointsBreakdown.engagementPoints.toLocaleString("ar")} unit="نقطة" delta="من تقييم/شكوى عبر البوت" />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Box>

      {/* ── تنبيهات + تقييم المطعم بالديزاين الجديد ── */}
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2.5}>
          {/* كارت التنبيهات الاستباقية */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: "100%",
                borderRadius: 3,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
                backdropFilter: "blur(12px)",
                border: "1px solid",
                borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
                },
              }}
            >
              <SectionHeader title="تنبيهات استباقية" />
              <Box sx={{ mt: 2 }}>
                {alerts.length === 0 ? (
                  <Stack alignItems="center" spacing={1.5} sx={{ py: 5, color: "text.secondary" }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        backgroundColor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                        border: `1.5px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckRoundedIcon sx={{ fontSize: 22, color: tokens.muted }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 500 }}>
                      لا توجد تنبيهات حالياً
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    {alerts.map((a, i) => (
                      <Stack
                        key={a.id}
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          p: 2,
                          borderRadius: "14px",
                          border: "1px solid",
                          borderColor: a.urgent
                            ? "rgba(211, 47, 47, 0.15)"
                            : tokens.hairline || "rgba(0,0,0,0.08)",
                          backgroundColor: a.urgent
                            ? (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(211, 47, 47, 0.12)"
                                  : "rgba(211, 47, 47, 0.04)"
                            : (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.02)"
                                  : "rgba(0,0,0,0.015)",
                          animation: "fadeInUp 0.4s ease backwards",
                          animationDelay: `${i * 0.06}s`,
                          transition: "all 0.25s ease-in-out",
                          "&:hover": {
                            transform: "translateX(-3px)",
                            borderColor: a.urgent ? "rgba(211, 47, 47, 0.3)" : tokens.ink,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: a.urgent ? "error.main" : "rgba(0,0,0,0.06)",
                            color: a.urgent ? tokens.paper : tokens.ink,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: a.urgent ? "0 2px 8px rgba(211, 47, 47, 0.3)" : "none",
                          }}
                        >
                          {a.urgent ? (
                            <PriorityHighRoundedIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <CheckRoundedIcon sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"IBM Plex Sans Arabic"',
                            fontWeight: 600,
                            color: a.urgent ? "error.main" : "text.primary",
                            fontSize: "0.88rem",
                          }}
                        >
                          {a.message}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* كارت لمحة عن تقييم المطعم */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: "100%",
                borderRadius: 3,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
                backdropFilter: "blur(12px)",
                border: "1px solid",
                borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
                },
              }}
            >
              <SectionHeader
                title="لمحة عن تقييم المطعم"
                action={
                  restaurantRating?.recentRatings?.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setAllRatingsDialogOpen(true)}
                      sx={{ color: tokens.ink, fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.78rem" }}
                    >
                      شوف كل الآراء
                    </Button>
                  )
                }
              />
              <Box sx={{ mt: 2 }}>
                {restaurantRating && restaurantRating.ratersCount > 0 ? (
                  <Stack spacing={2.5}>
                    <Stack spacing={1}>
                      {restaurantRating.recentRatings.slice(0, 3).map((r, i) => (
                        <Box
                          key={i}
                          onClick={() => setAllRatingsDialogOpen(true)}
                          sx={{
                            p: 1.5,
                            borderRadius: "12px",
                            border: "1px solid",
                            borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                            backgroundColor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.015)"
                                : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              backgroundColor: "rgba(0,0,0,0.015)",
                            },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem" }}>
                              {r.customerName || "عميل"}
                            </Typography>
                            {r.rating !== null && r.rating !== undefined && (
                              <Stack direction="row" alignItems="center" spacing={0.3}>
                                <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.85rem" }}>
                                  {r.rating}
                                </Typography>
                                <StarRoundedIcon sx={{ color: "#ffc107", fontSize: 16 }} />
                              </Stack>
                            )}
                          </Stack>
                          {r.message && (
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.78rem" }}>
                              «{r.message}»
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary", py: 5, textAlign: "center", fontFamily: '"IBM Plex Sans Arabic"' }}>
                    ما في تقييمات كافية من عملائك بعد
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ── الديالوجات ── */}
      <Dialog open={allRatingsDialogOpen} onClose={() => setAllRatingsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>كل آراء وتقييمات عملائك</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ py: 1 }}>
            {(restaurantRating?.recentRatings || []).map((r, i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                  backgroundColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.015)" : "#fafafa"),
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem" }}>
                    {r.customerName || "عميل"}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {r.rating !== null && r.rating !== undefined && (
                      <Stack direction="row" alignItems="center" spacing={0.3}>
                        <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.85rem" }}>
                          {r.rating}
                        </Typography>
                        <StarRoundedIcon sx={{ color: "#ffc107", fontSize: 16 }} />
                      </Stack>
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("ar", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : ""}
                    </Typography>
                  </Stack>
                </Stack>
                {r.message ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
                    «{r.message}»
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                    بدون تعليق نصي
                  </Typography>
                )}
              </Box>
            ))}
            {(!restaurantRating?.recentRatings || restaurantRating.recentRatings.length === 0) && (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
                ما في آراء مسجّلة بعد
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={segmentDialogOpen} onClose={() => setSegmentDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>لمحة عن الشرائح</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            {rfmDistribution.map((s) => (
              <RatioBar key={s.key} label={s.label} count={s.count} total={rfmTotal} emphasis={s.emphasis} />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={visitsDialogOpen} onClose={() => setVisitsDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>إجمالي عدد الزيارات</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            <ToggleButtonGroup
              size="small" exclusive fullWidth
              value={visitsDialogGranularity}
              onChange={(_, v) => v && setVisitsDialogGranularity(v)}
              sx={{
                "& .MuiToggleButton-root": {
                  fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.78rem",
                  "&.Mui-selected": { backgroundColor: tokens.ink, color: tokens.paper, "&:hover": { backgroundColor: tokens.inkSoft } },
                },
              }}
            >
              <ToggleButton value="day">يومي</ToggleButton>
              <ToggleButton value="week">أسبوعي</ToggleButton>
              <ToggleButton value="month">شهري</ToggleButton>
            </ToggleButtonGroup>
            {visitsDialogSummary ? (
              <Stack spacing={1.5}>
                <RatioBar label="زيارات جديدة (أول زيارة للعميل)" count={visitsDialogSummary.newVisits}        total={visitsDialogSummary.total || 1} />
                <RatioBar label="زيارات متكررة"                    count={visitsDialogSummary.returningVisits} total={visitsDialogSummary.total || 1} emphasis />
                <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
                  الإجمالي: {visitsDialogSummary.total.toLocaleString("ar")} زيارة
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>جاري التحميل…</Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={atRiskDialogOpen} onClose={() => setAtRiskDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>عملاء معرّضون للفقد</DialogTitle>
        <DialogContent>
          <AtRiskListBody loading={atRiskLoading} list={atRiskOnly} emptyMessage="ما في عملاء معرّضون للفقد حالياً 🎉" />
        </DialogContent>
      </Dialog>

      <Dialog open={lostDialogOpen} onClose={() => setLostDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>عملاء مفقودون</DialogTitle>
        <DialogContent>
          <AtRiskListBody loading={atRiskLoading} list={lostOnly} emptyMessage="ما في عملاء مفقودون حالياً 🎉" />
        </DialogContent>
      </Dialog>

      <Dialog open={newCustomersDialogOpen} onClose={() => setNewCustomersDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>عملاء جدد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            <ToggleButtonGroup
              size="small" exclusive fullWidth
              value={newCustomersPeriod}
              onChange={(_, v) => v && setNewCustomersPeriod(v)}
              sx={{
                "& .MuiToggleButton-root": {
                  fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.78rem",
                  "&.Mui-selected": { backgroundColor: tokens.ink, color: tokens.paper, "&:hover": { backgroundColor: tokens.inkSoft } },
                },
              }}
            >
              <ToggleButton value="day">اليوم</ToggleButton>
              <ToggleButton value="week">هذا الأسبوع</ToggleButton>
              <ToggleButton value="month">هذا الشهر</ToggleButton>
            </ToggleButtonGroup>
            {newCustomersList.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
                ما في عملاء جدد بهاي الفترة
              </Typography>
            ) : (
              <Stack spacing={1}>
                {newCustomersList.map((c) => (
                  <Stack
                    key={c.profileId || c.id}
                    direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ py: 0.75, borderBottom: `1px solid ${tokens.hairline}` }}
                  >
                    <Typography variant="body2">{c.name || c.phone}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {SOURCE_LABELS.find((s) => s.key === c.source)?.label || c.source} — {fmtBucketLabel(c.createdAt, "day")}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              الإجمالي: {newCustomersList.length.toLocaleString("ar")} عميل
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={sourceDialogOpen} onClose={() => setSourceDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>مصدر الوصول</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            {sourceBreakdown.map((s) => (
              <RatioBar key={s.key} label={s.label} count={s.count} total={rfmTotal || 1} />
            ))}
            <Typography variant="caption" sx={{ color: tokens.mutedLight, fontStyle: "italic", textAlign: "center" }}>
              QR المشاهير وروابط الإحالة لسا صفر لحد ما ينبنى نظام الإحالة
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={bestTimeDialogOpen} onClose={() => setBestTimeDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>أفضل وقت للزيارة</DialogTitle>
        <DialogContent>
          <VisitTimeDialogBody
            data={visitKpis?.visitTimes}
            granularity={timeDialogGranularity}
            onGranularityChange={setTimeDialogGranularity}
            highlight="best"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={worstTimeDialogOpen} onClose={() => setWorstTimeDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>أسوأ وقت للزيارة</DialogTitle>
        <DialogContent>
          <VisitTimeDialogBody
            data={visitKpis?.visitTimes}
            granularity={timeDialogGranularity}
            onGranularityChange={setTimeDialogGranularity}
            highlight="worst"
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

// ── AtRiskListBody ──────────────────────────────────────────────────────────
function AtRiskListBody({ loading, list, emptyMessage }) {
  if (loading) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
        جاري التحميل…
      </Typography>
    );
  }
  if (!list || list.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
        {emptyMessage}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ py: 1 }}>
      {list.map((c) => (
        <Stack key={c.customerId} spacing={0.5} sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${tokens.hairline}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
              {c.name || c.phone || "عميل"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1, py: 0.25, borderRadius: 1.5, fontWeight: 600,
                backgroundColor: c.recencyStatus === "lost" ? tokens.ink : tokens.surfaceAlt,
                color:           c.recencyStatus === "lost" ? tokens.paper : tokens.muted,
              }}
            >
              {c.recencyStatus === "lost" ? "مفقود" : "معرّض للفقد"}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {c.phone} — تصنيف نشاطه: {ACTIVITY_TIER_LABELS[c.activityTier] || c.activityTier} — آخر زيارة منذ{" "}
            {c.daysSinceLastVisit ?? "؟"} يوم
          </Typography>
          {c.reason ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              السبب المحتمل (من رأيه عبر البوت{c.reason.ratingValue ? ` — تقييم ${c.reason.ratingValue}/٥` : ""}): «
              {c.reason.message}»
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: tokens.mutedLight, fontStyle: "italic" }}>
              ما في رأي أو شكوى مسجّلة من هاد العميل عبر البوت
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

// ── VisitQualityCard — الديزاين الجديد (glassmorphism) ────────────────────
function VisitQualityCard({ score, breakdown }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        borderRadius: "24px",
        p: 3,
        background: isDark
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 2px 16px rgba(0,0,0,0.3)"
          : "0 2px 16px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? "0 8px 28px rgba(0,0,0,0.4)"
            : "0 8px 28px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 4 }}
          alignItems={{ sm: "center" }}
        >
          {/* الرقم */}
          <Stack spacing={0.5} sx={{ minWidth: { sm: 180 } }}>
            <Typography
              sx={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              معدل جودة الزيارات
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography
                sx={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: "2rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "text.primary",
                }}
              >
                {score !== null && score !== undefined ? score.toLocaleString("ar") : "—"}
              </Typography>
              {score !== null && score !== undefined && (
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: "text.secondary",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  ٪
                </Typography>
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: "0.75rem",
                color: "text.secondary",
              }}
            >
              تكرار + تقييم + تفاعل
            </Typography>
          </Stack>

          {/* الأشرطة */}
          <Stack spacing={1.5} sx={{ flex: 1, width: "100%" }}>
            <ScoreBar label="تكرار الزيارة"    value={breakdown?.recurrence?.score ?? null} />
            <ScoreBar label="التقييم"           value={breakdown?.rating?.score    ?? null} />
            <ScoreBar label="التفاعل مع البوت" value={breakdown?.engagement?.score ?? null} />
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── ScoreBar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pct = value !== null && value !== undefined ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="caption"
          sx={{ fontFamily: "'Cairo', sans-serif", color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Cairo', sans-serif",
            fontWeight: 700,
            color: "text.primary",
          }}
        >
          {value !== null && value !== undefined ? `${value}٪` : "—"}
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 6,
          borderRadius: "99px",
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "99px",
            background: isDark
              ? "rgba(255,255,255,0.5)"
              : "rgba(0,0,0,0.35)",
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </Box>
    </Stack>
  );
}

// ── VisitTimeDialogBody ─────────────────────────────────────────────────────
function VisitTimeDialogBody({ data, granularity, onGranularityChange, highlight }) {
  if (!data) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
        لسا ما في بيانات زيارات كافية
      </Typography>
    );
  }

  const slots    = data[granularity]?.slots || [];
  const bestKey  = data[granularity]?.best?.label;
  const worstKey = data[granularity]?.worst?.label;

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <ToggleButtonGroup
        size="small" exclusive fullWidth
        value={granularity}
        onChange={(_, v) => v && onGranularityChange(v)}
        sx={{
          "& .MuiToggleButton-root": {
            fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.78rem",
            "&.Mui-selected": {
              backgroundColor: tokens.ink,
              color: tokens.paper,
              "&:hover": { backgroundColor: tokens.inkSoft },
            },
          },
        }}
      >
        <ToggleButton value="day">يومي</ToggleButton>
        <ToggleButton value="week">أسبوعي</ToggleButton>
        <ToggleButton value="month">شهري</ToggleButton>
      </ToggleButtonGroup>

      {slots.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
          لسا ما في بيانات بهاي الفترة
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {slots.map((s, i) => {
            const isHighlighted =
              (highlight === "best"  && s.label === bestKey) ||
              (highlight === "worst" && s.label === worstKey);
            return (
              <Stack
                key={i}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  py: 0.75,
                  px: 1,
                  borderRadius: 2,
                  backgroundColor: isHighlighted ? tokens.surfaceAlt : "transparent",
                  border: `1px solid ${isHighlighted ? tokens.hairline : "transparent"}`,
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: "'Cairo', sans-serif" }}>
                  {s.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: isHighlighted ? 700 : 400,
                  }}
                >
                  {s.count.toLocaleString("ar")} زيارة
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}