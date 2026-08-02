import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TextField,
  MenuItem,
  Skeleton,
} from "@mui/material";
import { SectionHeader } from "../components/SectionHeader";
import { RatioBar } from "../components/RatioBar";
import { tokens } from "../theme/theme";
import { analyticsApi } from "../api/analytics";
import { getCached, setCached } from "../utils/dataCache";

// نقاط ١-٥ معروضة بشكل دوائر فاخرة ومصممة بدقة
function ScoreDots({ score }) {
  return (
    <Stack direction="row" spacing={0.6} justifyContent="center" alignItems="center">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= score;
        return (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: active ? tokens.ink : "transparent",
              border: "1.5px solid",
              borderColor: active ? tokens.ink : tokens.hairline || "rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              transform: active ? "scale(1.1)" : "scale(1)",
            }}
          />
        );
      })}
    </Stack>
  );
}

const SEGMENT_ORDER = [
  "champions",
  "loyal",
  "potential",
  "new",
  "need_attention",
  "at_risk",
  "cant_lose",
  "hibernating",
  "lost",
];
const URGENT_SEGMENTS = new Set(["at_risk", "cant_lose", "lost"]);

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

export default function RFM() {
  const { establishmentId } = useParams();

  const [data, setData] = useState(() => getCached(`rfmAnalysis:${establishmentId}`) ?? null);
  const [loading, setLoading] = useState(() => getCached(`rfmAnalysis:${establishmentId}`) === undefined);
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [page, setPage] = useState(0);
  const rowsPerPage = 8;

  useEffect(() => {
    if (!establishmentId) return;
    analyticsApi
      .rfmAnalysis(establishmentId)
      .then((result) => {
        setData(result);
        setCached(`rfmAnalysis:${establishmentId}`, result);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  const segmentSummaryOrdered = useMemo(() => {
    if (!data?.segmentSummary) return [];
    const map = new Map(data.segmentSummary.map((s) => [s.key, s]));
    return SEGMENT_ORDER.map((key) => map.get(key)).filter(Boolean);
  }, [data]);

  const total = data?.customers?.length || 0;

  const filtered = useMemo(() => {
    const all = data?.customers || [];
    return segmentFilter === "all" ? all : all.filter((c) => c.segment === segmentFilter);
  }, [data, segmentFilter]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          تحليل RFM
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          تسجيل كل عميل على ٣ محاور: Recency (من متى آخر زيارة)، Frequency (كم مرة زار)، Monetary (كم صرف) —
          كل محور من ١ (أضعف ٢٠٪) لـ ٥ (أفضل ٢٠٪). هاي طبقة تحليل كمّي منفصلة عن تصنيف "سفير/وفي/نشط".
        </Typography>
      </Stack>

      {/* شاشة التحميل */}
      {loading && (
        <Stack spacing={2.5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: "20px" }} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: "20px" }} />
            </Grid>
          </Grid>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: "20px" }} />
        </Stack>
      )}

      {/* شاشة عدم وجود عملاء */}
      {!loading && total === 0 && (
        <Paper elevation={0} sx={{ ...cardStyle, p: 6, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 500 }}>
            ما في عملاء مسجّلين بعد لهاي المنشأة.
          </Typography>
        </Paper>
      )}

      {/* المحتوى الرئيسي للتحليل */}
      {!loading && total > 0 && (
        <>
          <Box sx={{ overflow: "hidden" }}>
            <Grid container spacing={3}>
              {/* توزيع الشرائح */}
              <Grid item xs={12} md={5}>
                <Paper elevation={0} sx={{ ...cardStyle, height: "100%" }}>
                  <SectionHeader title="توزيع شرائح RFM" />
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {segmentSummaryOrdered.map((s) => (
                      <RatioBar
                        key={s.key}
                        label={s.label}
                        count={s.count}
                        total={total}
                        emphasis={URGENT_SEGMENTS.has(s.key)}
                      />
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              {/* أكثر ٥ شرائح تستحق انتباه */}
              <Grid item xs={12} md={7}>
                <Paper elevation={0} sx={{ ...cardStyle, height: "100%" }}>
                  <SectionHeader title="أكثر ٥ شرائح تستحق انتباه" />
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {segmentSummaryOrdered
                      .filter((s) => s.count > 0)
                      .slice(0, 5)
                      .map((s) => {
                        const isUrgent = URGENT_SEGMENTS.has(s.key);
                        return (
                          <Stack
                            key={s.key}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              py: 1.2,
                              px: 2,
                              borderRadius: "14px",
                              border: "1px solid",
                              borderColor: isUrgent ? "rgba(211,47,47,0.2)" : tokens.hairline || "rgba(0,0,0,0.06)",
                              backgroundColor: isUrgent
                                ? "rgba(211, 47, 47, 0.04)"
                                : "rgba(0,0,0,0.015)",
                              transition: "transform 0.15s ease",
                              "&:hover": { transform: "translateX(-3px)" },
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                              {s.label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', color: "text.secondary", fontWeight: 600 }}>
                              {s.count.toLocaleString("ar")} عميل ({((s.count / total) * 100).toFixed(0)}٪)
                            </Typography>
                          </Stack>
                        );
                      })}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* جدول تفاصيل العملاء */}
          <Paper elevation={0} sx={cardStyle}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <SectionHeader title="تفاصيل العملاء" />
              <TextField
                select
                size="small"
                value={segmentFilter}
                onChange={(e) => {
                  setSegmentFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 200, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              >
                <MenuItem value="all">كل الشرائح</MenuItem>
                {segmentSummaryOrdered.map((s) => (
                  <MenuItem key={s.key} value={s.key}>
                    {s.label} ({s.count})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                    <TableCell>العميل</TableCell>
                    <TableCell align="center">Recency</TableCell>
                    <TableCell align="center">Frequency</TableCell>
                    <TableCell align="center">Monetary</TableCell>
                    <TableCell>الشريحة</TableCell>
                    <TableCell align="center">آخر زيارة</TableCell>
                    <TableCell align="center">الزيارات</TableCell>
                    <TableCell align="center">الإنفاق</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((c) => {
                    const isUrgent = URGENT_SEGMENTS.has(c.segment);
                    return (
                      <TableRow
                        key={c.customerId}
                        sx={{
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                          "&:last-child td": { borderBottom: "none" },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, fontFamily: '"IBM Plex Sans Arabic"' }}>
                          {c.name || c.phone || "عميل"}
                        </TableCell>
                        <TableCell align="center">
                          <ScoreDots score={c.rScore} />
                        </TableCell>
                        <TableCell align="center">
                          <ScoreDots score={c.fScore} />
                        </TableCell>
                        <TableCell align="center">
                          <ScoreDots score={c.mScore} />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              px: 1.2,
                              py: 0.4,
                              borderRadius: "8px",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              backgroundColor: isUrgent ? tokens.ink : tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                              color: isUrgent ? tokens.paper : tokens.muted,
                            }}
                          >
                            {c.segmentLabel}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                          من {c.recencyDays.toLocaleString("ar")} يوم
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {c.frequency.toLocaleString("ar")}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                          {c.monetary.toLocaleString("ar")} ₪
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary", fontSize: "0.85rem" }}>
                        ما في عملاء بهاي الشريحة
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
              rowsPerPageOptions={[rowsPerPage]}
              labelRowsPerPage=""
              sx={{ borderTop: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, mt: 1 }}
            />
          </Paper>
        </>
      )}
    </Stack>
  );
}