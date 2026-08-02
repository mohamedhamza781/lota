import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import { SuperAdminHeader } from "../components/SuperAdminHeader";
import { tokens } from "../theme/theme";
import { whatsappBotApi } from "../api/whatsappBot";

const STATUS_LABEL = {
  connected: "متصل ✅",
  qr: "مستني مسح الكود",
  authenticated: "تم التحقق، عم يتصل…",
  disconnected: "غير متصل",
  not_connected: "غير مربوط",
};

export default function WhatsAppBotConnection() {
  const [mode, setModeState] = useState(null);
  const [switchingMode, setSwitchingMode] = useState(false);

  // وضع "مشترك"
  const [sharedData, setSharedData] = useState(null);
  const [sharedError, setSharedError] = useState("");

  // وضع "لكل منشأة رقمها"
  const [establishments, setEstablishments] = useState([]);
  const [estError, setEstError] = useState("");
  const [qrDialogTarget, setQrDialogTarget] = useState(null);

  const loadMode = useCallback(() => {
    whatsappBotApi.getMode().then((res) => setModeState(res.mode));
  }, []);

  const pollShared = useCallback(() => {
    whatsappBotApi
      .status()
      .then(setSharedData)
      .catch((err) => setSharedError(err.message || "تعذّر جلب حالة البوت"));
  }, []);

  const pollEstablishments = useCallback(() => {
    whatsappBotApi
      .listEstablishmentConnections()
      .then(setEstablishments)
      .catch((err) => setEstError(err.message || "تعذّر جلب حالة المنشآت"));
  }, []);

  useEffect(() => {
    loadMode();
  }, [loadMode]);

  useEffect(() => {
    if (mode === null) return;
    let cancelled = false;
    function poll() {
      if (cancelled) return;
      if (mode === "shared") pollShared();
      else pollEstablishments();
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mode, pollShared, pollEstablishments]);

  async function handleModeChange(_, newMode) {
    if (!newMode || newMode === mode || switchingMode) return;
    setSwitchingMode(true);
    try {
      const res = await whatsappBotApi.setMode(newMode);
      setModeState(res.mode);
    } catch (err) {
      setEstError(err.message || "تعذّر تغيير الوضع");
    } finally {
      setSwitchingMode(false);
    }
  }

  async function handleLogout() {
    await whatsappBotApi.logout();
    pollShared();
  }

  async function handleConnectEstablishment(id) {
    await whatsappBotApi.connectEstablishment(id);
    setTimeout(pollEstablishments, 1500);
  }

  async function handleDisconnectEstablishment(id) {
    await whatsappBotApi.disconnectEstablishment(id);
    pollEstablishments();
  }

  return (
    <Box sx={{ backgroundColor: tokens.paper, minHeight: "100vh" }}>
      <SuperAdminHeader />

      <Box sx={{ px: { xs: 3, md: 6 }, py: 4 }}>
        <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
          <Stack alignItems="center" spacing={0.5}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1.1rem" }}>
              بوت واتساب
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              اختار وضع أرقام البوت لكل المنصة — رقم واحد مشترك، أو رقم خاص بكل منشأة.
            </Typography>
          </Stack>

          {mode !== null && (
            <Stack alignItems="center">
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                disabled={switchingMode}
                sx={{
                  "& .MuiToggleButton-root": {
                    fontFamily: '"IBM Plex Sans Arabic"',
                    px: 3,
                    "&.Mui-selected": { backgroundColor: tokens.ink, color: tokens.paper },
                    "&.Mui-selected:hover": { backgroundColor: tokens.inkSoft },
                  },
                }}
              >
                <ToggleButton value="shared">رقم مشترك لكل المنصة</ToggleButton>
                <ToggleButton value="per_establishment">رقم خاص لكل منشأة</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}

          {/* ============ وضع مشترك ============ */}
          {mode === "shared" && (
            <Paper elevation={0} sx={{ p: 3 }}>
              {sharedError ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  {sharedError}
                </Typography>
              ) : !sharedData ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  جاري التحميل…
                </Typography>
              ) : !sharedData.enabled ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  بوت الواتساب مش مفعّل حالياً على السيرفر. فعّل WHATSAPP_BOT_ENABLED=true وحدد WHATSAPP_BOT_NUMBER
                  بملف الإعدادات (.env) وأعد تشغيل الباك إند.
                </Typography>
              ) : (
                <Stack spacing={2.5} alignItems="center">
                  <Chip
                    icon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                    label={STATUS_LABEL[sharedData.status] || sharedData.status}
                    sx={{
                      backgroundColor: sharedData.status === "connected" ? tokens.ink : tokens.surfaceAlt,
                      color: sharedData.status === "connected" ? tokens.paper : tokens.muted,
                    }}
                  />

                  {sharedData.status === "qr" && sharedData.qr && (
                    <Stack spacing={1} alignItems="center">
                      <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${tokens.hairline}`, backgroundColor: tokens.surface }}>
                        <Box component="img" src={sharedData.qr} alt="QR تسجيل دخول البوت" sx={{ width: 240, height: 240 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        افتح واتساب على موبايلك ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود
                      </Typography>
                    </Stack>
                  )}

                  {sharedData.status === "connected" && (
                    <Button variant="outlined" onClick={handleLogout} sx={{ borderColor: tokens.hairline, color: tokens.ink }}>
                      تسجيل خروج البوت
                    </Button>
                  )}

                  {sharedData.status === "disconnected" && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      عم ننتظر ما يجهز الاتصال… لو ضلت طويلة، تأكد من إعدادات السيرفر.
                    </Typography>
                  )}
                </Stack>
              )}
            </Paper>
          )}

          {/* ============ وضع لكل منشأة رقمها ============ */}
          {mode === "per_establishment" && (
            <Paper elevation={0} sx={{ overflow: "hidden" }}>
              {estError && (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 2 }}>
                  {estError}
                </Typography>
              )}
              <Box sx={{ overflowX: "auto" }}>
<Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المنشأة</TableCell>
                    <TableCell>الرقم</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="left">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {establishments.map((est) => (
                    <TableRow key={est.establishmentId} hover>
                      <TableCell>{est.name}</TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>{est.phoneNumber || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                          label={STATUS_LABEL[est.status] || est.status}
                          sx={{
                            backgroundColor: est.status === "connected" ? tokens.ink : tokens.surfaceAlt,
                            color: est.status === "connected" ? tokens.paper : tokens.muted,
                          }}
                        />
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {est.status === "qr" && est.qr && (
                            <Tooltip title="شوف QR">
                              <IconButton size="small" onClick={() => setQrDialogTarget(est)}>
                                <QrCode2RoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {est.status === "connected" ? (
                            <Tooltip title="فصل الرقم">
                              <IconButton size="small" onClick={() => handleDisconnectEstablishment(est.establishmentId)}>
                                <LinkOffRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="ربط رقم جديد">
                              <IconButton size="small" onClick={() => handleConnectEstablishment(est.establishmentId)}>
                                <LinkRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {establishments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: "text.secondary", py: 4 }}>
                        جاري التحميل…
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
</Box>
            </Paper>
          )}
        </Stack>
      </Box>

      {/* ديالوج QR اتصال منشأة معينة */}
      <Dialog open={Boolean(qrDialogTarget)} onClose={() => setQrDialogTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
          امسح QR لربط رقم {qrDialogTarget?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} alignItems="center" sx={{ pb: 2 }}>
            {qrDialogTarget?.qr && (
              <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${tokens.hairline}` }}>
                <Box component="img" src={qrDialogTarget.qr} alt="QR" sx={{ width: 240, height: 240 }} />
              </Box>
            )}
            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              افتح واتساب على جوال المنشأة ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}