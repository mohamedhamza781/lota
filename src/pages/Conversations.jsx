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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { conversationsApi } from "../api/conversations";
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
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
};

// بتبني صفحة HTML بسيطة (بنفس خط الموقع عشان العربي يترسم صح) وتفتحها بتاب
// جديد وتستدعي طباعة المتصفح - أبسط وأوثق طريقة لتصدير PDF بالعربي (المتصفح
// نفسه بيرسم الخط، بدل ما نضطر نضمّن خط عربي داخل مكتبة PDF يدوياً)
function exportConversationPdf(conversation) {
  const title = conversation.customer?.name || conversation.waId;
  const rowsHtml = conversation.messages
    .map((m) => {
      const align = m.from === "me" ? "right" : "left";
      const bg = m.from === "me" ? "#F0EFEB" : "#FFFFFF";
      const label = m.from === "me" ? title : "البوت";
      const body = m.imageUrl ? `[صورة] ${m.imageUrl}` : (m.text || "").replace(/</g, "&lt;");
      return `<div style="display:flex; justify-content:${align === "right" ? "flex-end" : "flex-start"}; margin:8px 0;">
        <div style="max-width:70%; background:${bg}; border:1px solid #E2E0DA; border-radius:12px; padding:10px 14px;">
          <div style="font-size:11px; color:#79766E; margin-bottom:4px; font-weight:700;">${label} — ${fmtDateTime(m.at)}</div>
          <div style="font-size:14px; color:#0A0A09; white-space:pre-wrap;">${body}</div>
        </div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8" />
    <title>محادثة - ${title}</title>
    <style>
      body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; padding: 24px; color: #0A0A09; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .meta { color: #79766E; font-size: 12px; margin-bottom: 24px; }
    </style>
  </head>
  <body>
    <h1>محادثة مع ${title}</h1>
    <div class="meta">${conversation.customer?.phone || conversation.waId} — ${conversation.messages.length} رسالة — ${conversation.ended ? "منتهية" : "مستمرة"}</div>
    ${rowsHtml}
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
  </body>
  </html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export default function Conversations() {
  const { establishmentId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [openConv, setOpenConv] = useState(null);
  const [openLoading, setOpenLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState(null); // File
  const [replyImagePreview, setReplyImagePreview] = useState(null); // blob url
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const load = useCallback(() => {
    if (!establishmentId) return;
    setLoading(true);
    setError("");
    conversationsApi
      .list(establishmentId)
      .then((data) => setRows(data || []))
      .catch((err) => setError(err.message || "تعذّر جلب المحادثات"))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.customer?.name || "").toLowerCase().includes(q) ||
        (r.customer?.phone || "").toLowerCase().includes(q) ||
        (r.waId || "").toLowerCase().includes(q) ||
        (r.lastMessagePreview || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function handleOpen(waId) {
    setOpenLoading(true);
    setReplyText("");
    clearReplyImage();
    setSendError("");
    try {
      const data = await conversationsApi.get(waId, establishmentId);
      setOpenConv(data);
    } catch (err) {
      setError(err.message || "تعذّر فتح المحادثة");
    } finally {
      setOpenLoading(false);
    }
  }

  function handleCloseConv() {
    setOpenConv(null);
    setReplyText("");
    clearReplyImage();
    setSendError("");
  }

  function clearReplyImage() {
    setReplyImage(null);
    setReplyImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // بيسمح تختار نفس الملف مرتين متتاليتين
    if (!file) return;
    clearReplyImage();
    setReplyImage(file);
    setReplyImagePreview(URL.createObjectURL(file));
  }

  async function handleSendReply() {
    if (!openConv?.waId) return;
    const text = replyText.trim();
    if (!text && !replyImage) return;

    setSending(true);
    setSendError("");
    try {
      const result = await conversationsApi.sendMessage(openConv.waId, {
        text,
        image: replyImage,
        establishmentId,
      });

      const newMsg = {
        id: `local-${Date.now()}`,
        from: "bot",
        text,
        imageUrl: result?.imageUrl || null,
        at: new Date().toISOString(),
      };
      setOpenConv((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev));
      setRows((prev) =>
        prev.map((r) =>
          r.waId === openConv.waId
            ? {
                ...r,
                lastMessagePreview: text || (newMsg.imageUrl ? "📷 صورة" : r.lastMessagePreview),
                lastMessageAt: newMsg.at,
                lastMessageFrom: "bot",
                messageCount: (r.messageCount || 0) + 1,
              }
            : r
        )
      );

      setReplyText("");
      clearReplyImage();
    } catch (err) {
      setSendError(err.message || "تعذّر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await conversationsApi.remove(deleteTarget.waId, establishmentId);
      setRows((prev) => prev.filter((r) => r.waId !== deleteTarget.waId));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "تعذّر حذف المحادثة");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportExcelAll() {
    const exportRows = filtered.map((r) => ({
      "اسم العميل": r.customer?.name || "عميل غير مسجل",
      "رقم الهاتف": r.customer?.phone || "",
      "معرّف المحادثة": r.waId,
      "عدد الرسائل": r.messageCount ?? 0,
      "آخر رسالة": r.lastMessagePreview || "",
      "وقت آخر رسالة": fmtDateTime(r.lastMessageAt),
      "الحالة": r.ended ? "منتهية" : "مستمرة",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المحادثات");
    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `محادثات-${todayStr}.xlsx`);
  }

  function handleExportConversationExcel(conv) {
    const exportRows = conv.messages.map((m) => ({
      المرسل: m.from === "me" ? conv.customer?.name || "العميل" : "البوت",
      النص: m.imageUrl ? "[صورة]" : m.text || "",
      الوقت: fmtDateTime(m.at),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 50 }, { wch: 22 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المحادثة");
    XLSX.writeFile(workbook, `محادثة-${conv.customer?.name || conv.waId}.xlsx`);
  }

  return (
    <Stack spacing={3.5}>
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          إدارة المحادثات
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          كل محادثات شات الويب مع العملاء — ابحث، افتح، صدّر، أو احذف أي محادثة.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={cardStyle}>
        <SectionHeader
          title="جميع المحادثات"
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={handleExportExcelAll}
              disabled={filtered.length === 0}
              sx={{ borderRadius: "10px", textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}
            >
              تصدير Excel
            </Button>
          }
        />

        <TextField
          size="small"
          placeholder="ابحث بالاسم، رقم الهاتف، أو نص الرسالة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: tokens.muted }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2.5, minWidth: 320, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />

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
                <TableCell>آخر رسالة</TableCell>
                <TableCell>وقت آخر رسالة</TableCell>
                <TableCell align="center">عدد الرسائل</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                      جاري تحميل المحادثات…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
                      لا توجد محادثات مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.waId}
                    sx={{
                      transition: "background-color 0.15s ease",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                      "&:last-child td": { borderBottom: "none" },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 30, height: 30, bgcolor: tokens.surfaceAlt, color: tokens.ink }}>
                          <PersonRoundedIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                            {r.customer?.name || "عميل غير مسجل"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {r.customer?.phone || r.waId}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {r.lastMessagePreview || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                        {fmtDateTime(r.lastMessageAt)}
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
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.ended ? "منتهية" : "مستمرة"}
                        sx={{
                          borderRadius: "8px",
                          backgroundColor: r.ended ? "rgba(0,0,0,0.06)" : "rgba(46, 125, 50, 0.1)",
                          color: r.ended ? tokens.muted : "#2e7d32",
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.3} justifyContent="center">
                        <Tooltip title="فتح المحادثة">
                          <IconButton size="small" onClick={() => handleOpen(r.waId)} sx={{ color: tokens.ink }}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف المحادثة">
                          <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: "error.main" }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* نافذة فتح المحادثة */}
      <Dialog
        open={Boolean(openConv) || openLoading}
        onClose={handleCloseConv}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px" } }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800 }}>
          {openConv?.customer?.name || openConv?.waId || "محادثة"}
          {openConv && (
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 400, mt: 0.3 }}>
              {openConv.customer?.phone || openConv.waId} — {openConv.ended ? "منتهية" : "مستمرة"}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "60vh" }}>
          {openLoading ? (
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
              جاري التحميل…
            </Typography>
          ) : (
            <Stack spacing={1.2}>
              {(openConv?.messages || []).map((m) => (
                <Box key={m.id} sx={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
                  <Box
                    sx={{
                      maxWidth: "75%",
                      backgroundColor: m.from === "me" ? tokens.surfaceAlt : "transparent",
                      border: `1px solid ${tokens.hairline}`,
                      borderRadius: "14px",
                      p: 1.4,
                    }}
                  >
                    {m.imageUrl ? (
                      <Box component="img" src={`${API_ORIGIN}${m.imageUrl}`} alt="صورة" sx={{ maxWidth: "100%", borderRadius: "10px" }} />
                    ) : (
                      <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"', whiteSpace: "pre-wrap" }}>
                        {m.text}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, fontSize: "0.7rem" }}>
                      {fmtDateTime(m.at)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>

        {/* صندوق الرد اليدوي - إرسال نص و/أو صورة مباشرة لعميل شات الويب */}
        {openConv && (
          <Box sx={{ px: 2, pt: 1.5, borderTop: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}` }}>
            {sendError && (
              <Typography variant="caption" sx={{ color: "error.main", display: "block", mb: 0.8, fontFamily: '"IBM Plex Sans Arabic"' }}>
                {sendError}
              </Typography>
            )}
            {replyImagePreview && (
              <Box sx={{ position: "relative", display: "inline-block", mb: 1 }}>
                <Box
                  component="img"
                  src={replyImagePreview}
                  alt="معاينة الصورة"
                  sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: "10px", border: `1px solid ${tokens.hairline}` }}
                />
                <IconButton
                  size="small"
                  onClick={clearReplyImage}
                  sx={{
                    position: "absolute",
                    top: -8,
                    left: -8,
                    width: 20,
                    height: 20,
                    backgroundColor: "background.paper",
                    border: `1px solid ${tokens.hairline}`,
                    "&:hover": { backgroundColor: "background.paper" },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <input id="reply-image-input" type="file" accept="image/*" hidden onChange={handlePickImage} />
              <Tooltip title="إرفاق صورة">
                <span>
                  <IconButton
                    component="label"
                    htmlFor="reply-image-input"
                    size="small"
                    disabled={sending}
                    sx={{ color: tokens.ink }}
                  >
                    <ImageRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <TextField
                size="small"
                fullWidth
                placeholder="اكتب رسالة للعميل…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                disabled={sending}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", fontFamily: '"IBM Plex Sans Arabic"' } }}
              />
              <Tooltip title="إرسال">
                <span>
                  <IconButton
                    onClick={handleSendReply}
                    disabled={sending || (!replyText.trim() && !replyImage)}
                    sx={{ color: "#fff", backgroundColor: tokens.ink, "&:hover": { backgroundColor: tokens.ink }, "&.Mui-disabled": { backgroundColor: tokens.surfaceAlt, color: tokens.muted } }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        )}

        <DialogActions sx={{ p: 2 }}>
          <Button
            size="small"
            startIcon={<PictureAsPdfRoundedIcon />}
            onClick={() => openConv && exportConversationPdf(openConv)}
            disabled={!openConv}
            sx={{ textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}
          >
            تصدير PDF
          </Button>
          <Button
            size="small"
            startIcon={<FileDownloadRoundedIcon />}
            onClick={() => openConv && handleExportConversationExcel(openConv)}
            disabled={!openConv}
            sx={{ textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}
          >
            تصدير Excel
          </Button>
          <Button size="small" onClick={handleCloseConv} sx={{ textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"' }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "20px" } }}>
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800 }}>حذف المحادثة</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>
            رح يتم حذف كل رسائل هاي المحادثة نهائيًا. هاد الإجراء ما بيأثر على حساب العميل أو نقاطه. متأكد إنك بدك تكمل؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"' }}>
            تراجع
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
            sx={{ textTransform: "none", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, borderRadius: "10px" }}
          >
            {deleting ? "جاري الحذف…" : "حذف نهائيًا"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}