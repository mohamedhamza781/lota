import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Paper, Stack, Typography, Button, CircularProgress, Chip } from "@mui/material";
import { manualWhatsappApi } from "../api/manualWhatsapp";
import { tokens } from "../theme/theme";

const STATUS_LABEL = {
  connected: { label: "متصل ✅", color: "success" },
  qr: { label: "بانتظار مسح QR", color: "warning" },
  disconnected: { label: "غير متصل", color: "default" },
};

// صفحة إدارة "رقم التواصل اليدوي" - منفصل تماماً عن رقم بوت الولاء. هاد
// الرقم بيتستخدم بس لما صاحب المطعم يبعت رسالة يدوية مخصّصة لعميل من
// صفحة العملاء (تأكيد استبدال نقاط، رسالة شكر...) - ما في أي بوت أوتوماتيكي
// شغال عليه، وأي رد من العميل بيوصل كإشعار بالداشبورد بس.
export default function ManualWhatsAppConnection() {
  const { establishmentId } = useParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

  async function fetchStatus() {
    try {
      const data = await manualWhatsappApi.status(establishmentId);
      setStatus(data);
    } catch {
      // تجاهل - رح نعيد المحاولة بالبولينج التالي
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      await manualWhatsappApi.connect(establishmentId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    setActionLoading(true);
    try {
      await manualWhatsappApi.disconnect(establishmentId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress sx={{ color: tokens.ink }} />
      </Box>
    );
  }

  const statusInfo = STATUS_LABEL[status?.status] || STATUS_LABEL.disconnected;

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        رقم التواصل اليدوي
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        رقم واتساب منفصل تماماً عن رقم البوت - يُستخدم بس لما تبعت رسالة يدوية لعميل من صفحة العملاء. ما في أي بوت أوتوماتيكي شغال عليه، وأي رد من العميل عليه بيوصلك كإشعار بالداشبورد بس.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>الحالة</Typography>
          <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
        </Stack>

        {status?.status === "qr" && status?.qr && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <img src={status.qr} alt="QR" style={{ width: 220, height: 220, borderRadius: 12 }} />
          </Box>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          {status?.status === "connected" ? (
            <Button variant="outlined" color="error" onClick={handleDisconnect} disabled={actionLoading}>
              فصل الرقم
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={actionLoading}
              sx={{ backgroundColor: tokens.ink, "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink } }}
            >
              {status?.status === "qr" ? "إعادة توليد QR" : "ابدأ الاتصال"}
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}