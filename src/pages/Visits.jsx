import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
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
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { visitsApi } from "../api/visits";

const STATUS_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "active", label: "نشطة" },
  { value: "pending", label: "معلّقة" },
  { value: "completed", label: "منتهية" },
];

const STATUS_LABEL = { active: "نشطة", pending: "معلّقة", completed: "منتهية" };
const STATUS_COLOR = {
  active: { bg: "rgba(46, 125, 50, 0.1)", color: "#2e7d32" },
  pending: { bg: "rgba(237, 108, 2, 0.1)", color: "#ed6c02" },
  completed: { bg: "rgba(0,0,0,0.06)", color: tokens.muted },
};

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

function fmtDuration(sec) {
  if (sec === null || sec === undefined) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m <= 0) return `${s} ثانية`;
  if (m < 60) return `${m} دقيقة${s ? ` و${s} ثانية` : ""}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h} ساعة${rem ? ` و${rem} دقيقة` : ""}`;
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
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
};

export default function Visits() {
  const { establishmentId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!establishmentId) return;
    setLoading(true);
    setError("");
    visitsApi
      .list(establishmentId)
      .then((data) => setRows(data || []))
      .catch((err) => setError(err.message || "تعذّر جلب الزيارات"))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (status !== "all") list = list.filter((r) => r.status === status);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.customer?.name || "").toLowerCase().includes(q) ||
          (r.customer?.phone || "").toLowerCase().includes(q) ||
          (r.waId || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, status, search]);

  const counts = useMemo(() => {
    const c = { all: rows.length, active: 0, pending: 0, completed: 0 };
    rows.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [rows]);

  function handleExportExcel() {
    const exportRows = filtered.map((r) => ({
      "اسم العميل": r.customer?.name || "عميل غير مسجل",
      "رقم الهاتف": r.customer?.phone || "",
      "القناة": r.channel === "webchat" ? "شات ويب" : "واتساب",
      "الحالة": STATUS_LABEL[r.status] || r.status,
      "وقت البداية": fmtDateTime(r.startedAt),
      "وقت النهاية": fmtDateTime(r.endedAt),
      "المدة": fmtDuration(r.durationSec),
      "عدد الرسائل": r.messageCount ?? 0,
      "النقاط المكتسبة": r.pointsEarned ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الزيارات");
    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `زيارات-${todayStr}.xlsx`);
  }

  return (
    <Stack spacing={3.5}>
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          إدارة الزيارات
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          كل زيارات العملاء عبر بوت الواتساب أو شات الويب، وحالتها ومدتها وعدد رسائلها.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={cardStyle}>
        <SectionHeader
          title="جميع الزيارات"
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              sx={{ borderRadius: "10px", textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}
            >
              تصدير Excel
            </Button>
          }
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2.5 }} alignItems={{ sm: "center" }} justifyContent="space-between">
          <ToggleButtonGroup
            exclusive
            value={status}
            onChange={(_, v) => v && setStatus(v)}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                borderRadius: "10px !important",
                textTransform: "none",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 1.6,
                border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.1)"} !important`,
                mx: 0.3,
              },
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label} {f.value !== "all" ? `(${counts[f.value] || 0})` : `(${counts.all})`}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="ابحث بالاسم أو رقم الهاتف"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: tokens.muted }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
        </Stack>

        {error && (
          <Typography variant="body2" sx={{ color: "error.main", mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
                    color: tokens.muted,
                    fontWeight: 600,
                    fontSize: "0.8rem",
                  },
                }}
              >
                <TableCell>العميل</TableCell>
                <TableCell>القناة</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell>وقت البداية</TableCell>
                <TableCell>وقت النهاية</TableCell>
                <TableCell>المدة</TableCell>
                <TableCell align="center">عدد الرسائل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                      جاري تحميل الزيارات…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                      لا توجد زيارات مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                      "&:last-child td": { borderBottom: "none" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                        {r.customer?.name || "عميل غير مسجل"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {r.customer?.phone || r.waId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        {r.channel === "webchat" ? (
                          <LanguageRoundedIcon fontSize="small" sx={{ color: tokens.ink }} />
                        ) : (
                          <WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} />
                        )}
                        <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.82rem" }}>
                          {r.channel === "webchat" ? "شات ويب" : "واتساب"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={STATUS_LABEL[r.status] || r.status}
                        sx={{
                          borderRadius: "8px",
                          backgroundColor: STATUS_COLOR[r.status]?.bg,
                          color: STATUS_COLOR[r.status]?.color,
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                        {fmtDateTime(r.startedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                        {fmtDateTime(r.endedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.82rem" }}>
                        {fmtDuration(r.durationSec)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.messageCount ?? 0}
                        sx={{
                          borderRadius: "8px",
                          backgroundColor: tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 700,
                          fontSize: "0.78rem",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Stack>
  );
}