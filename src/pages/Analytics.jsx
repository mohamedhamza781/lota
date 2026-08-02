import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Paper,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Chip,
  Grid,
  Box,
  Skeleton,
} from "@mui/material";
import { SectionHeader } from "../components/SectionHeader";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { TrendChart } from "../components/TrendChart";
import { tokens } from "../theme/theme";
import { analyticsApi } from "../api/analytics";
import { getCached, setCached } from "../utils/dataCache";

const DAY_ORDER = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "السبت"];

function fmtHour(h) {
  if (h === null || h === undefined) return "—";
  const period = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
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
  overflow: "hidden",
  "&:hover": {
    boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
  },
};

export default function Analytics() {
  const { establishmentId } = useParams();
  const [data, setData] = useState(() => getCached(`analyticsOverview:${establishmentId}`) ?? null);
  const [loading, setLoading] = useState(() => getCached(`analyticsOverview:${establishmentId}`) === undefined);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!establishmentId) return;
    setError("");
    analyticsApi
      .overview(establishmentId)
      .then((result) => {
        setData(result);
        setCached(`analyticsOverview:${establishmentId}`, result);
      })
      .catch((err) => setError(err.message || "تعذّر جلب التحليلات"))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="text" width={180} height={32} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={80} sx={{ borderRadius: "16px" }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: "20px" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: "20px" }} />
          </Grid>
        </Grid>
      </Stack>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ ...cardStyle, p: 5, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error}
        </Typography>
      </Paper>
    );
  }

  const visitsByDaySorted = [...(data?.visitsByDay || [])].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
  const busiestDay = (data?.visitsByDay || [])[0];
  const busiestHour = [...(data?.visitsByHour || [])].sort((a, b) => b.count - a.count)[0];
  const quietestHour = [...(data?.visitsByHour || [])].sort((a, b) => a.count - b.count)[0];

  const bestSalesDay = (data?.salesByDay || [])[0];

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          تحليلات المنشأة
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          مبنية على زيارات بوت الواتساب، صور الوجبات، وسجل الطلبات اليدوي.
        </Typography>
      </Stack>

      {/* ملخص سريع (KPI Cards) بتصميم Glassmorphism مصغّر */}
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2}>
          {[
            { label: "أكثر يوم زيارة", value: busiestDay?.day || "—" },
            { label: "أكثر ساعة ازدحاماً", value: busiestHour ? fmtHour(busiestHour.hour) : "—" },
            { label: "أقل ساعة ازدحاماً", value: quietestHour ? fmtHour(quietestHour.hour) : "—" },
            { label: "أقوى يوم مبيعات", value: bestSalesDay?.day || "—" },
          ].map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 20px -6px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 28px -6px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.78rem" }}>
                  {kpi.label}
                </Typography>
                <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.2rem", mt: 0.5, color: tokens.ink }}>
                  {kpi.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* الرسوم البيانية والجداول التفصيلية */}
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={3}>
          {/* الزيارات حسب أيام الأسبوع */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="الزيارات حسب أيام الأسبوع" />
              <Box sx={{ pt: 1 }}>
                <TrendChart
                  data={visitsByDaySorted.map((d) => ({ date: d.day, primary: d.count }))}
                  primaryLabel="زيارات"
                  primaryColor="#38BDF8"
                  height={160}
                />
              </Box>
              <Box sx={{ overflowX: "auto", mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                      <TableCell>اليوم</TableCell>
                      <TableCell align="left">الزيارات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visitsByDaySorted.map((row) => (
                      <TableRow key={row.day} sx={{ transition: "background-color 0.15s ease", "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" }, "&:last-child td": { borderBottom: "none" } }}>
                        <TableCell sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>{row.day}</TableCell>
                        <TableCell align="left" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))}
                    {visitsByDaySorted.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: "text.secondary", py: 3, fontSize: "0.85rem" }}>
                          ما في بيانات زيارات لسا
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>

          {/* الزيارات حسب ساعات اليوم */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="الزيارات حسب ساعات اليوم" />
              <Box sx={{ pt: 1 }}>
                <TrendChart
                  data={(data?.visitsByHour || []).map((h) => ({ date: fmtHour(h.hour), primary: h.count }))}
                  primaryLabel="زيارات"
                  primaryColor="#38BDF8"
                  height={220}
                />
              </Box>
            </Paper>
          </Grid>

          {/* توزيع تصنيف الوجبات */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="توزيع تصنيف الوجبات" />
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, my: (data?.categoryBreakdown || []).length ? 2 : 0 }}>
                {(data?.categoryBreakdown || []).map((c) => (
                  <Chip
                    key={c.category}
                    label={`${c.category}: ${c.count}`}
                    sx={{
                      borderRadius: "8px",
                      backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                      fontFamily: '"IBM Plex Sans Arabic"',
                      fontWeight: 600,
                      fontSize: "0.78rem",
                    }}
                  />
                ))}
                {(data?.categoryBreakdown || []).length === 0 && (
                  <Typography variant="body2" sx={{ color: "text.secondary", py: 2, fontSize: "0.85rem" }}>
                    ما في بيانات تصنيف وجبات لسا
                  </Typography>
                )}
              </Stack>
              {(data?.categoryBreakdown || []).length > 0 && (
                <SimpleBarChart
                  data={(data?.categoryBreakdown || []).map((c) => ({ label: c.category, value: c.count }))}
                  horizontal
                  color="#A855F7"
                  valueSuffix=" وجبة"
                />
              )}
            </Paper>
          </Grid>

          {/* أكثر الوجبات طلباً */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="أكثر الوجبات طلباً" />
              {(data?.mealPopularity || []).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <SimpleBarChart
                    data={(data.mealPopularity || []).slice(0, 5).map((m) => ({ label: m.mealName, value: m.timesOrdered }))}
                    horizontal
                    color="#F97316"
                    valueSuffix=" مرة"
                  />
                </Box>
              )}
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                      <TableCell>الوجبة</TableCell>
                      <TableCell>التصنيف</TableCell>
                      <TableCell align="center">عدد المرات</TableCell>
                      <TableCell align="center">عملاء مهتمين</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.mealPopularity || []).map((m) => (
                      <TableRow key={m.mealName} sx={{ transition: "background-color 0.15s ease", "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" }, "&:last-child td": { borderBottom: "none" } }}>
                        <TableCell sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>{m.mealName}</TableCell>
                        <TableCell>
                          {m.category ? (
                            <Chip size="small" label={m.category} sx={{ borderRadius: "6px", backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)", fontSize: "0.72rem" }} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {m.timesOrdered}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {m.interestedCustomers}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.mealPopularity || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: "text.secondary", py: 3, fontSize: "0.85rem" }}>
                          ما في بيانات وجبات لسا
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>

          {/* المبيعات حسب أيام الأسبوع */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="المبيعات حسب أيام الأسبوع" />
              <Box sx={{ pt: 1 }}>
                <SimpleBarChart
                  data={(data?.salesByDay || []).map((d) => ({ label: d.day, value: d.totalAmount }))}
                  color="#10B981"
                  height={160}
                />
              </Box>
              <Box sx={{ overflowX: "auto", mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                      <TableCell>اليوم</TableCell>
                      <TableCell align="center">عدد الطلبات</TableCell>
                      <TableCell align="center">الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.salesByDay || []).map((row) => (
                      <TableRow key={row.day} sx={{ transition: "background-color 0.15s ease", "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" }, "&:last-child td": { borderBottom: "none" } }}>
                        <TableCell sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>{row.day}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{row.count}</TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {row.totalAmount.toLocaleString("ar")} ₪
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.salesByDay || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: "text.secondary", py: 3, fontSize: "0.85rem" }}>
                          ما في طلبات مسجّلة لسا (سجّلها من صفحة العملاء)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>

          {/* المبيعات حسب ساعات اليوم */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={cardStyle}>
              <SectionHeader title="المبيعات حسب ساعات اليوم" />
              <Box sx={{ pt: 1 }}>
                <SimpleBarChart
                  data={(data?.salesByHour || []).map((h) => ({ label: fmtHour(h.hour), value: h.totalAmount }))}
                  color="#10B981"
                  height={180}
                />
              </Box>
              <Box sx={{ overflowX: "auto", mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                      <TableCell>الساعة</TableCell>
                      <TableCell align="center">عدد الطلبات</TableCell>
                      <TableCell align="center">الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.salesByHour || []).map((row) => (
                      <TableRow key={row.hour} sx={{ transition: "background-color 0.15s ease", "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" }, "&:last-child td": { borderBottom: "none" } }}>
                        <TableCell sx={{ fontWeight: 600, fontFamily: '"IBM Plex Sans Arabic"' }}>{fmtHour(row.hour)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{row.count}</TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {row.totalAmount.toLocaleString("ar")} ₪
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.salesByHour || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: "text.secondary", py: 3, fontSize: "0.85rem" }}>
                          ما في طلبات مسجّلة لسا
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
}