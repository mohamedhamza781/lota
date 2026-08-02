import { useEffect, useState } from "react";
import { superAdminApi } from "../api/superAdmin";
import { getCached, setCached } from "../utils/dataCache";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { StatCard } from "../components/StatCard";
import { SuperAdminHeader } from "../components/SuperAdminHeader";
import { TrendChart } from "../components/TrendChart";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { uploadImage, resolveImageUrl } from "../api/uploads";

const CITIES = ["نابلس", "رام الله", "الخليل", "بيت لحم", "غزة", "القدس", "جنين", "طولكرم"];
const PLANS = ["تجريبي", "أساسي", "احترافي"];

const PLAN_STYLES = {
  "تجريبي": { fill: false, dashed: true },
  "أساسي": { fill: false, dashed: false },
  "احترافي": { fill: true, dashed: false },
};

const glassCardStyle = {
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

function EstablishmentMark({ initial, plan }) {
  const s = PLAN_STYLES[plan] ?? PLAN_STYLES["أساسي"];
  return (
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        border: `2px solid ${tokens.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        backgroundColor: s.fill ? tokens.ink : "transparent",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        "&::before": s.dashed
          ? {
              content: '""',
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              border: `1px dashed ${tokens.ink}`,
            }
          : undefined,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"IBM Plex Sans Arabic"',
          fontWeight: 700,
          fontSize: "1rem",
          color: s.fill ? tokens.paper : tokens.ink,
        }}
      >
        {initial}
      </Typography>
    </Box>
  );
}

const EMPTY_EST_FORM = { name: "", city: CITIES[0], plan: "تجريبي", logoUrl: null };

export default function SuperAdmin() {
  const { establishments, addEstablishment, deleteEstablishment, updateEstablishment } = useAuth();

  const totals = establishments.reduce(
    (acc, e) => ({
      totalEstablishments: acc.totalEstablishments + 1,
      totalCustomers: acc.totalCustomers + e.kpis.totalCustomers,
      pointsIssued: acc.pointsIssued + e.kpis.pointsIssued,
      atRiskCount: acc.atRiskCount + e.kpis.atRiskCount,
    }),
    { totalEstablishments: 0, totalCustomers: 0, pointsIssued: 0, atRiskCount: 0 }
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_EST_FORM);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const [platform, setPlatform] = useState(() => getCached("platformAnalytics") ?? null);
  useEffect(() => {
    superAdminApi
      .platformAnalytics()
      .then((data) => {
        setPlatform(data);
        setCached("platformAnalytics", data);
      })
      .catch(() => setPlatform(null));
  }, []);

  const [platformTrend, setPlatformTrend] = useState(() => getCached("platformTrend") ?? null);
  useEffect(() => {
    superAdminApi
      .platformTrend(14)
      .then((data) => {
        const trend = data?.trend ?? null;
        setPlatformTrend(trend);
        setCached("platformTrend", trend);
      })
      .catch(() => setPlatformTrend(null));
  }, []);

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_EST_FORM);
    setFormError("");
    setLogoError("");
    setDialogOpen(true);
  }

  function openEditDialog(e) {
    setEditingId(e.id);
    setForm({ name: e.name || "", city: e.city || CITIES[0], plan: e.plan || "تجريبي", logoUrl: e.logoUrl || null });
    setFormError("");
    setLogoError("");
    setDialogOpen(true);
  }

  async function handleLogoFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoUploading(true);
    setLogoError("");
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      setLogoError(err.message || "تعذّر رفع الشعار");
    } finally {
      setLogoUploading(false);
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError("اسم المنشأة إلزامي");
      return;
    }
    if (editingId) {
      updateEstablishment(editingId, { name: form.name.trim(), city: form.city, plan: form.plan, logoUrl: form.logoUrl });
    } else {
      addEstablishment({ name: form.name.trim(), city: form.city, plan: form.plan, logoUrl: form.logoUrl });
    }
    setDialogOpen(false);
  }

  return (
    <Box sx={{ backgroundColor: tokens.paper, minHeight: "100vh" }}>
      <SuperAdminHeader />

      <Box sx={{ px: { xs: 3, md: 6 }, py: 4 }}>
        <Stack spacing={3.5}>
          {/* Chart تحليلات أول شي بالصفحة */}
          <Paper elevation={0} sx={glassCardStyle}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1.1rem", mb: 2 }}>
              الزيارات والعملاء الجدد (كل المنشآت) — آخر ١٤ يوم
            </Typography>
            <TrendChart
              data={(platformTrend || []).map((t) => ({ date: t.date, primary: t.visits, secondary: t.newCustomers }))}
              primaryLabel="زيارات"
              secondaryLabel="عملاء جدد"
            />
          </Paper>

          {/* الكروت الإحصائية الرئيسية */}
          <Box sx={{ overflow: "hidden" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard index="٠١" label="عدد المنشآت" value={totals.totalEstablishments.toLocaleString("ar")} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  index="٠٢"
                  label="إجمالي العملاء (كل المنشآت)"
                  value={totals.totalCustomers.toLocaleString("ar")}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  index="٠٣"
                  label="نقاط صادرة إجمالية"
                  value={totals.pointsIssued.toLocaleString("ar")}
                  unit="نقطة"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  index="٠٤"
                  label="معرّضون للفقد (الكل)"
                  value={totals.atRiskCount.toLocaleString("ar")}
                  delta="بحاجة لمتابعة"
                  urgent
                />
              </Grid>
            </Grid>
          </Box>

          {/* تحليلات سلوكية */}
          {platform && (
            <Box sx={{ overflow: "hidden" }}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.15rem", mb: 2 }}>
                تحليلات سلوكية (كل المنشآت)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="عملاء (أول دخول عبر QR)"
                    value={platform.totalCustomers.toLocaleString("ar")}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="زيارات هذا الشهر"
                    value={platform.visitsThisMonth.total.toLocaleString("ar")}
                    delta={`${platform.visitsThisMonth.first.toLocaleString("ar")} أولى / ${platform.visitsThisMonth.repeat.toLocaleString("ar")} مكررة`}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="معدل النمو"
                    value={platform.growthRate.toLocaleString("ar")}
                    unit="٪"
                    delta="مقارنة بالشهر الماضي"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="معدل التفاعل"
                    value={platform.engagementRate.toLocaleString("ar")}
                    unit="نقطة/زيارة"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                {(platform.bestVisitTime || platform.worstVisitTime) && (
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ ...glassCardStyle, height: "100%" }}>
                      <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, mb: 1.5 }}>
                        أوقات الزيارة
                      </Typography>
                      <Stack spacing={1}>
                        {platform.bestVisitTime && (
                          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                            أفضل وقت: الساعة {platform.bestVisitTime.hour}:00 ({platform.bestVisitTime.count.toLocaleString("ar")} زيارة)
                          </Typography>
                        )}
                        {platform.worstVisitTime && (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
                            أضعف وقت: الساعة {platform.worstVisitTime.hour}:00 ({platform.worstVisitTime.count.toLocaleString("ar")} زيارة)
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                )}

                {platform.mostActiveCustomers?.length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ ...glassCardStyle, height: "100%" }}>
                      <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, mb: 1.5 }}>
                        أكثر العملاء نشاطاً
                      </Typography>
                      <Stack spacing={1}>
                        {platform.mostActiveCustomers.slice(0, 5).map((c) => (
                          <Stack key={c.customerId} direction="row" justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name || c.phone}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
                              {c.visitsCount.toLocaleString("ar")} — {c.establishment}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}

                {platform.atRiskCustomers?.length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ ...glassCardStyle, height: "100%" }}>
                      <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, mb: 1.5 }}>
                        عملاء مهددون بالفقد
                      </Typography>
                      <Stack spacing={1}>
                        {platform.atRiskCustomers.slice(0, 5).map((c) => (
                          <Stack key={c.customerId} direction="row" justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name || c.phone}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
                              {c.daysSinceLastVisit != null ? `${c.daysSinceLastVisit.toLocaleString("ar")} يوم` : "—"} — {c.establishment}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* قائمة المنشآت */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.15rem" }}>
                المنشآت
              </Typography>
              <Button
                onClick={openAddDialog}
                variant="outlined"
                size="small"
                startIcon={<AddRoundedIcon fontSize="small" />}
                sx={{
                  borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
                  color: tokens.ink,
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 600,
                  borderRadius: "10px",
                  px: 2,
                  "&:hover": { borderColor: tokens.ink, backgroundColor: "rgba(0,0,0,0.03)" },
                }}
              >
                منشأة جديدة
              </Button>
            </Stack>

            <Box sx={{ overflow: "hidden" }}>
              <Grid container spacing={2.5}>
                {establishments.map((e) => (
                  <Grid item xs={12} sm={6} md={4} key={e.id}>
                    <Paper elevation={0} sx={glassCardStyle}>
                      <Stack spacing={2} sx={{ height: "100%" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <EstablishmentMark initial={e.initial} plan={e.plan} />
                            <Stack>
                              <Typography sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "1rem" }}>
                                {e.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                                {e.city}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              size="small"
                              label={e.plan}
                              variant="outlined"
                              sx={{
                                borderColor: tokens.hairline || "rgba(0,0,0,0.1)",
                                color: "text.secondary",
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "0.72rem",
                              }}
                            />
                            <Tooltip title="تعديل بيانات المنشأة">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(e)}
                                sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                              >
                                <EditRoundedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={e.status === "suspended" ? "تفعيل المنشأة" : "إيقاف المنشأة"}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  updateEstablishment(e.id, {
                                    status: e.status === "suspended" ? "active" : "suspended",
                                  })
                                }
                                sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                              >
                                {e.status === "suspended" ? (
                                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                ) : (
                                  <BlockRoundedIcon sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف المنشأة">
                              <IconButton
                                size="small"
                                onClick={() => setConfirmDeleteId(e.id)}
                                sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: "error.main", backgroundColor: "rgba(211,47,47,0.08)" } }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        {e.status === "suspended" && (
                          <Chip
                            size="small"
                            label="موقوفة"
                            sx={{
                              alignSelf: "flex-start",
                              backgroundColor: tokens.ink,
                              color: tokens.paper,
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              height: 22,
                            }}
                          />
                        )}

                        <Stack direction="row" spacing={3} sx={{ py: 1 }}>
                          <Stack>
                            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.1rem" }}>
                              {e.kpis.totalCustomers.toLocaleString("ar")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                              عميل
                            </Typography>
                          </Stack>
                          <Stack>
                            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.1rem" }}>
                              {e.kpis.atRiskCount.toLocaleString("ar")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                              معرّض للفقد
                            </Typography>
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={2.5} sx={{ mt: "auto" }} alignItems="center">
                          <Button
                            component={RouterLink}
                            to={`/admin/${e.id}`}
                            endIcon={<ArrowBackRoundedIcon sx={{ fontSize: 16 }} />}
                            sx={{
                              alignSelf: "flex-start",
                              color: tokens.ink,
                              fontWeight: 700,
                              fontFamily: '"IBM Plex Sans Arabic"',
                              px: 0,
                              "&:hover": { backgroundColor: "transparent", color: tokens.muted },
                            }}
                          >
                            فتح اللوحة
                          </Button>
                          <Button
                            component="a"
                            href={`/m/${e.id}`}
                            target="_blank"
                            rel="noopener"
                            sx={{
                              alignSelf: "flex-start",
                              color: tokens.muted,
                              fontWeight: 600,
                              fontSize: "0.82rem",
                              fontFamily: '"IBM Plex Sans Arabic"',
                              px: 0,
                              "&:hover": { backgroundColor: "transparent", color: tokens.ink },
                            }}
                          >
                            المنيو
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* حوار إضافة منشأة جديدة */}
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
          {editingId ? "تعديل بيانات المنشأة" : "منشأة جديدة"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}

            {/* شعار المنشأة (اختياري) */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={resolveImageUrl(form.logoUrl)}
                variant="rounded"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                  border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
                }}
              >
                <StorefrontRoundedIcon sx={{ color: tokens.muted, fontSize: "1.3rem" }} />
              </Avatar>
              <Button
                size="small"
                variant="outlined"
                component="label"
                disabled={logoUploading}
                startIcon={<UploadRoundedIcon fontSize="small" />}
                sx={{ borderColor: tokens.hairline || "rgba(0,0,0,0.15)", color: tokens.ink, borderRadius: "10px", fontWeight: 600 }}
              >
                {logoUploading ? "جاري الرفع…" : "شعار المنشأة"}
                <input type="file" accept="image/*" hidden onChange={handleLogoFileChange} />
              </Button>
            </Stack>
            {logoError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {logoError}
              </Typography>
            )}
            <TextField
              label="اسم المنشأة"
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              select
              label="المدينة"
              size="small"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            >
              {CITIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="الباقة"
              size="small"
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            >
              {PLANS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
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
            {editingId ? "حفظ التعديلات" : "إنشاء"}
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
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف المنشأة؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
            رح ينحذف معها كل حسابات الأدمن المرتبطة فيها. هذا الإجراء نهائي.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              deleteEstablishment(confirmDeleteId);
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
    </Box>
  );
}