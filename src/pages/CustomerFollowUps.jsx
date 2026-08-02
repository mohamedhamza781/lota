import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  TextField,
  Button,
  Grid,
} from "@mui/material";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { mealPhotosApi } from "../api/mealPhotos";
import { getCached, setCached } from "../utils/dataCache";
import { feedbackApi } from "../api/feedback";
import { establishmentsApi } from "../api/establishments";
import { API_ORIGIN } from "../api/client";

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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

export default function CustomerFollowUps() {
  const { establishmentId } = useParams();
  const [tab, setTab] = useState("photos");

  const [photos, setPhotos] = useState(() => getCached(`mealPhotos:${establishmentId}`) ?? []);
  const [feedbackList, setFeedbackList] = useState(() => getCached(`followUpFeedback:${establishmentId}`) ?? []);
  const [loading, setLoading] = useState(() => getCached(`mealPhotos:${establishmentId}`) === undefined);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState("");

  const [points, setPoints] = useState(
    () => getCached(`engagementPoints:${establishmentId}`) ?? { signup: 50, visit: 20, mealPhoto: 10, rating: 5, complaint: 5 }
  );
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsSaved, setPointsSaved] = useState(false);

  const load = useCallback(() => {
    if (!establishmentId) return;
    setError("");
    Promise.all([
      mealPhotosApi.list(establishmentId).catch(() => []),
      feedbackApi.list(establishmentId).catch(() => []),
      establishmentsApi.get(establishmentId).catch(() => null),
    ])
      .then(([mp, fb, est]) => {
        setPhotos(mp || []);
        setFeedbackList(fb || []);
        setCached(`mealPhotos:${establishmentId}`, mp || []);
        setCached(`followUpFeedback:${establishmentId}`, fb || []);
        if (est?.engagementPoints) {
          const pts = {
            signup: est.engagementPoints.signup ?? 50,
            visit: est.engagementPoints.visit ?? 20,
            mealPhoto: est.engagementPoints.mealPhoto ?? 10,
            rating: est.engagementPoints.rating ?? 5,
            complaint: est.engagementPoints.complaint ?? 5,
          };
          setPoints(pts);
          setCached(`engagementPoints:${establishmentId}`, pts);
        }
      })
      .catch((err) => setError(err.message || "تعذّر جلب البيانات"))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePoints() {
    setPointsSaving(true);
    setPointsSaved(false);
    try {
      await establishmentsApi.update(establishmentId, {
        engagementPoints: {
          signup: Number(points.signup) || 0,
          visit: Number(points.visit) || 0,
          mealPhoto: Number(points.mealPhoto) || 0,
          rating: Number(points.rating) || 0,
          complaint: Number(points.complaint) || 0,
        },
      });
      setPointsSaved(true);
      setTimeout(() => setPointsSaved(false), 2500);
    } catch (err) {
      setError(err.message || "تعذّر حفظ إعدادات النقاط");
    } finally {
      setPointsSaving(false);
    }
  }

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          متابعة تفاعلات العملاء
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          سجل الصور، التقييمات، وإعدادات مكافآت النقاط التلقائية عبر الواتساب.
        </Typography>
      </Stack>

      {/* إعدادات نقاط التفاعل عبر البوت */}
      <Paper elevation={0} sx={cardStyle}>
        <SectionHeader title="إعدادات مكافآت النقاط التلقائية" />
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.5, mb: 2, display: "block" }}>
          تحديد عدد النقاط التي يكتسبها العميل عند القيام بكل إجراء عبر بوت الواتساب.
        </Typography>

        <Box sx={{ overflow: "hidden" }}>
          <Grid container spacing={2}>
            {/* نقاط إنشاء حساب */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Stack spacing={0.8}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                  نقاط التسجيل
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={points.signup}
                  onChange={(e) => setPoints((p) => ({ ...p, signup: e.target.value }))}
                  helperText="عند التسجيل لأول مرة"
                  FormHelperTextProps={{ sx: { textAlign: "right", mx: 0 } }}
                  inputProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
            </Grid>

            {/* نقاط تسجيل الزيارة */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Stack spacing={0.8}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                  نقاط الزيارة
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={points.visit}
                  onChange={(e) => setPoints((p) => ({ ...p, visit: e.target.value }))}
                  helperText="عند كل زيارة جديدة"
                  FormHelperTextProps={{ sx: { textAlign: "right", mx: 0 } }}
                  inputProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
            </Grid>

            {/* نقاط مشاركة صورة */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Stack spacing={0.8}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                  نقاط صورة الوجبة
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={points.mealPhoto}
                  onChange={(e) => setPoints((p) => ({ ...p, mealPhoto: e.target.value }))}
                  helperText="عند إرسال صورة الوجبة"
                  FormHelperTextProps={{ sx: { textAlign: "right", mx: 0 } }}
                  inputProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
            </Grid>

            {/* نقاط التقييم الإيجابي */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Stack spacing={0.8}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                  نقاط التقييم
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={points.rating}
                  onChange={(e) => setPoints((p) => ({ ...p, rating: e.target.value }))}
                  helperText="عند التقييم العالي (3-5)"
                  FormHelperTextProps={{ sx: { textAlign: "right", mx: 0 } }}
                  inputProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
            </Grid>

            {/* نقاط إرسال ملاحظة/شكوى */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Stack spacing={0.8}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }}>
                  نقاط الشكوى
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={points.complaint}
                  onChange={(e) => setPoints((p) => ({ ...p, complaint: e.target.value }))}
                  helperText="عند التقييم المنخفض (1-2)"
                  FormHelperTextProps={{ sx: { textAlign: "right", mx: 0 } }}
                  inputProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon fontSize="small" />}
            disabled={pointsSaving}
            onClick={savePoints}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "10px",
              px: 2.5,
              py: 0.8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease",
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            {pointsSaving ? "جاري الحفظ..." : "حفظ إعدادات النقاط"}
          </Button>
          {pointsSaved && (
            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
              تم حفظ التعديلات بنجاح ✅
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* التبويبات */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          minHeight: 0,
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          p: "4px",
          borderRadius: "14px",
          width: "fit-content",
          "& .MuiTabs-indicator": { display: "none" },
          "& .MuiTab-root": {
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            fontSize: "0.85rem",
            minHeight: 0,
            py: 0.8,
            px: 2.5,
            borderRadius: "10px",
            color: tokens.muted,
            transition: "all 0.25s ease",
            "&.Mui-selected": {
              backgroundColor: tokens.ink,
              color: tokens.paper,
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            },
          },
        }}
      >
        <Tab value="photos" label="صور الوجبات المرسلة" />
        <Tab value="feedback" label="آراء وتقييمات العملاء" />
      </Tabs>

      {error && (
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {/* جدول صور الوجبات */}
      {tab === "photos" && (
        <Paper elevation={0} sx={cardStyle}>
          <SectionHeader title="سجل صور الوجبات" />
          <Box sx={{ overflowX: "auto", mt: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                  <TableCell>اسم العميل</TableCell>
                  <TableCell>رقم الواتساب</TableCell>
                  <TableCell>الصورة</TableCell>
                  <TableCell>رقم الطاولة</TableCell>
                  <TableCell align="center">النقاط المكتسبة</TableCell>
                  <TableCell>تاريخ الإرسال</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3, fontFamily: '"IBM Plex Sans Arabic"' }}>
                        جاري تحميل الصور…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : photos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                        لا توجد صور وجبات مشاركة حتى الآن
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  photos.map((p) => (
                    <TableRow
                      key={p._id}
                      sx={{
                        transition: "background-color 0.15s ease",
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                        "&:last-child td": { borderBottom: "none" },
                      }}
                    >
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                        {p.customerId?.name || "عميل غير مسجل"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} />
                          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                            {p.customerId?.phone || "—"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="معاينة صورة الوجبة">
                          <IconButton
                            size="small"
                            onClick={() => setPreviewImage(`${API_ORIGIN}${p.imageUrl}`)}
                            sx={{ color: tokens.ink, transition: "all 0.2s ease", "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" } }}
                          >
                            <ImageRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>
                          {p.tableNumber ? `طاولة #${p.tableNumber}` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`+${p.pointsAwarded ?? 0} نقطة`}
                          sx={{
                            borderRadius: "8px",
                            backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                            fontFamily: '"IBM Plex Sans Arabic"',
                            fontWeight: 700,
                            fontSize: "0.78rem",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                          {fmtDateTime(p.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* جدول التقييمات */}
      {tab === "feedback" && (
        <Paper elevation={0} sx={cardStyle}>
          <SectionHeader title="سجل تقييمات وآراء العملاء" />
          <Box sx={{ overflowX: "auto", mt: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                  <TableCell>اسم العميل</TableCell>
                  <TableCell>رقم الواتساب</TableCell>
                  <TableCell align="center">درجة التقييم</TableCell>
                  <TableCell>الملاحظات / الرأي</TableCell>
                  <TableCell>تاريخ التقييم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3, fontFamily: '"IBM Plex Sans Arabic"' }}>
                        جاري تحميل التقييمات…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : feedbackList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                        لا توجد تقييمات مسجلة حتى الآن
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  feedbackList.map((f) => (
                    <TableRow
                      key={f._id}
                      sx={{
                        transition: "background-color 0.15s ease",
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                        "&:last-child td": { borderBottom: "none" },
                      }}
                    >
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                        {f.customerId?.name || "عميل غير مسجل"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} />
                          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                            {f.customerId?.phone || "—"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        {f.ratingValue ? (
                          <Chip
                            size="small"
                            label={`${f.ratingValue} / 5`}
                            sx={{
                              borderRadius: "8px",
                              backgroundColor: f.ratingValue >= 3 ? "rgba(46, 125, 50, 0.08)" : "rgba(211, 47, 47, 0.08)",
                              color: f.ratingValue >= 3 ? "success.main" : "error.main",
                              fontWeight: 700,
                              fontFamily: '"IBM Plex Sans Arabic"',
                              fontSize: "0.78rem",
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem" }}>
                          {f.message ? `«${f.message}»` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                          {fmtDateTime(f.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* نافذة معاينة الصورة */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1.5,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          },
        }}
      >
        <DialogContent sx={{ p: 0.5 }}>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="معاينة صورة الوجبة"
              sx={{ width: "100%", borderRadius: "14px", display: "block", maxHeight: "75vh", objectFit: "contain" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}