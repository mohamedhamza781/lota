import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Grid, Paper, Stack, Typography, Button, Chip, Divider, Skeleton } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { whatsappBotApi } from "../api/whatsappBot";
import { getCached, setCached } from "../utils/dataCache";

const glassCardStyle = {
  p: 3,
  height: "100%",
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

export default function WhatsAppBot() {
  const { establishmentId } = useParams();
  const [info, setInfo] = useState(() => getCached(`whatsappJoinInfo:${establishmentId}`) ?? null);
  const [loading, setLoading] = useState(() => getCached(`whatsappJoinInfo:${establishmentId}`) === undefined);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!establishmentId) return;
    setError("");
    whatsappBotApi
      .joinInfo(establishmentId)
      .then((data) => {
        setInfo(data);
        setCached(`whatsappJoinInfo:${establishmentId}`, data);
      })
      .catch((err) => setError(err.message || "تعذّر جلب رابط بوت الواتساب"))
      .finally(() => setLoading(false));
  }, [establishmentId]);

  function copyLink() {
    if (!info?.waLink) return;
    navigator.clipboard.writeText(info.waLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Stack spacing={3.5}>
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={3}>
          {/* كارت كود الـ QR */}
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ ...glassCardStyle, display: "flex", flexDirection: "column" }}>
              <SectionHeader title="كود QR لبوت واتساب" />

              <Box sx={{ my: "auto", py: 2 }}>
                {loading ? (
                  <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                    <Skeleton variant="rounded" width={220} height={220} sx={{ borderRadius: "20px" }} />
                    <Skeleton variant="rounded" width={160} height={32} sx={{ borderRadius: "10px" }} />
                    <Stack direction="row" spacing={1.5} sx={{ width: "100%", pt: 1 }}>
                      <Skeleton variant="rounded" width="50%" height={42} sx={{ borderRadius: "10px" }} />
                      <Skeleton variant="rounded" width="50%" height={42} sx={{ borderRadius: "10px" }} />
                    </Stack>
                  </Stack>
                ) : error ? (
                  <Typography variant="body2" sx={{ color: "error.main", py: 4, textAlign: "center", fontWeight: 600 }}>
                    {error}
                  </Typography>
                ) : (
                  <Stack spacing={2.5} alignItems="center">
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "20px",
                        border: "1px solid",
                        borderColor: tokens.hairline || "rgba(0,0,0,0.08)",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                        transition: "transform 0.3s ease, box-shadow 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={info.qrDataUrl}
                        alt="QR بوت الواتساب"
                        sx={{ width: 210, height: 210, display: "block" }}
                      />
                    </Box>

                    <Chip
                      icon={<WhatsAppIcon sx={{ fontSize: "17px !important", color: info.botConnected ? "#25D366 !important" : "inherit" }} />}
                      size="small"
                      label={info.botConnected ? "بوت الواتساب متصل" : "بوت الواتساب غير متصل حالياً"}
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        fontFamily: '"IBM Plex Sans Arabic"',
                        backgroundColor: info.botConnected ? "rgba(37, 211, 102, 0.1)" : tokens.surfaceAlt || "rgba(0,0,0,0.04)",
                        color: info.botConnected ? "#1b8a43" : tokens.muted,
                        border: "1px solid",
                        borderColor: info.botConnected ? "rgba(37, 211, 102, 0.3)" : "transparent",
                      }}
                    />

                    <Stack direction="row" spacing={1.5} sx={{ width: "100%", pt: 1 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                        onClick={copyLink}
                        sx={{
                          borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
                          color: tokens.ink,
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 600,
                          borderRadius: "10px",
                          py: 1,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "rgba(0,0,0,0.03)",
                            borderColor: tokens.ink,
                          },
                        }}
                      >
                        {copied ? "تم النسخ ✓" : "نسخ الرابط"}
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        href={info.waLink}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          backgroundColor: tokens.ink,
                          color: tokens.paper,
                          fontFamily: '"IBM Plex Sans Arabic"',
                          fontWeight: 600,
                          borderRadius: "10px",
                          py: 1,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: tokens.inkSoft || tokens.ink,
                            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                          },
                        }}
                      >
                        جرّب الرابط
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* كارت كيفية العمل والتعليمات */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={glassCardStyle}>
              <SectionHeader title="كيف تشتغل الميزة" />
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <Step n="١" text="اطبع كود الـ QR وحطه على الطاولات أو بالفاتورة أو عند الكاشير." />
                <Step n="٢" text="الزبون بيمسح الكود، بينفتحله واتساب مع رسالة جاهزة فيها كود منشأتك." />
                <Step n="٣" text="بوت الواتساب بيرد عليه ويطلب اسمه (إذا أول مرة يسجل)، وبيسجله تلقائياً." />
                <Step n="٤" text="بتلاقي الزبون مباشرة بصفحة «العملاء» — اسمه ورقمه محفوظين، وممكن تتواصل معه من نفس الرقم لاحقاً." />

                <Divider sx={{ borderColor: tokens.hairline || "rgba(0,0,0,0.08)", my: 1 }} />

                <Box
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                    border: "1px solid",
                    borderColor: tokens.hairline || "rgba(0,0,0,0.05)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.6, display: "block", fontFamily: '"IBM Plex Sans Arabic"' }}>
                   <strong>ملاحظة مهمة:</strong> البوت بيشتغل برقم واتساب عادي (مش واتساب بزنس الرسمي)، فبيفضل ما تستخدموه لإرسال رسائل جماعية مزعجة حتى ما ينوقف الرقم من واتساب.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

        </Grid>
      </Box>
    </Stack>
  );
}

function Step({ n, text }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "10px",
          backgroundColor: tokens.ink,
          color: tokens.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '"IBM Plex Sans Arabic"',
          fontWeight: 700,
          fontSize: "0.82rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {n}
      </Box>
      <Typography variant="body2" sx={{ color: "text.primary", pt: 0.3, fontFamily: '"IBM Plex Sans Arabic"', lineHeight: 1.6, fontWeight: 500 }}>
        {text}
      </Typography>
    </Stack>
  );
}