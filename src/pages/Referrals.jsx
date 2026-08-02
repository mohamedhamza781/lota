import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  Autocomplete,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { referralsApi } from "../api/referrals";
import { getCached, setCached } from "../utils/dataCache";

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
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
  height: "100%",
  "&:hover": {
    boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
  },
};

function ReferralCodeCard({ title, subtitle, code, webChatLink, qrDataUrl, signupCount, isActive, onToggle }) {
  const [copied, setCopied] = useState(false);

  return (
    <Paper elevation={0} sx={cardStyle}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack spacing={0.25}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1rem" }}>{title}</Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                {subtitle}
              </Typography>
            )}
          </Stack>
          {onToggle && (
            <Tooltip title={isActive ? "تعطيل الكود" : "تفعيل الكود"}>
              <Switch size="small" checked={isActive} onChange={onToggle} color="default" />
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          {qrDataUrl ? (
            <Box
              component="img"
              src={qrDataUrl}
              alt={`QR ${code}`}
              sx={{
                width: 96,
                height: 96,
                borderRadius: "14px",
                border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                backgroundColor: "#ffffff",
                p: 0.5,
              }}
            />
          ) : (
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: "14px",
                border: `1px dashed ${tokens.hairline || "rgba(0,0,0,0.15)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
                backgroundColor: "rgba(0,0,0,0.01)",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.mutedLight, textAlign: "center", fontSize: "0.72rem" }}>
                تعذّر توليد رمز QR
              </Typography>
            </Box>
          )}

          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.05rem", color: tokens.ink }}>
              {code}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
              {signupCount.toLocaleString("ar")} انضموا عن طريق هاد الكود
            </Typography>
            {webChatLink && (
              <Stack direction="row" spacing={0.8} sx={{ pt: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                  href={webChatLink}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    fontFamily: '"IBM Plex Sans Arabic"',
                    fontWeight: 600,
                    textTransform: "none",
                    borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
                    color: tokens.ink,
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    py: 0.4,
                  }}
                >
                  فتح شات الويب
                </Button>
                <Tooltip title={copied ? "انتسخ! ✓" : "انسخ الرابط"}>
                  <IconButton
                    size="small"
                    onClick={async () => {
                      const ok = await copyToClipboard(webChatLink);
                      if (ok) {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }
                    }}
                    sx={{ color: tokens.muted, borderRadius: "8px", "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" } }}
                  >
                    <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function Referrals() {
  const { establishmentId } = useParams();
  const { establishments } = useAuth();
  const establishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];
  const customers = useMemo(() => establishment?.customers ?? [], [establishment]);

  const [celebrityCodes, setCelebrityCodes] = useState(() => getCached(`celebrityCodes:${establishment?.id}`) ?? null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerCode, setCustomerCode] = useState(null);
  const [loadingCustomerCode, setLoadingCustomerCode] = useState(false);

  const loadCelebrityCodes = () => {
    if (!establishment?.id) return;
    referralsApi
      .listCelebrity(establishment.id)
      .then((data) => {
        setCelebrityCodes(data || []);
        setCached(`celebrityCodes:${establishment.id}`, data || []);
      })
      .catch(() => setCelebrityCodes([]));
  };

  useEffect(() => {
    loadCelebrityCodes();
  }, [establishment?.id]);

  useEffect(() => {
    if (!selectedCustomer || !establishment?.id) {
      setCustomerCode(null);
      return;
    }
    setLoadingCustomerCode(true);
    referralsApi
      .customerCode(selectedCustomer.id, establishment.id)
      .then((data) => setCustomerCode(data))
      .catch(() => setCustomerCode(null))
      .finally(() => setLoadingCustomerCode(false));
  }, [selectedCustomer, establishment?.id]);

  const handleCreate = async () => {
    if (!newLabel.trim() || !establishment?.id) return;
    setCreating(true);
    try {
      await referralsApi.createCelebrity(newLabel.trim(), establishment.id);
      setNewLabel("");
      loadCelebrityCodes();
    } catch {
      // فشل بسيط
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    if (!establishment?.id) return;
    await referralsApi.toggleCelebrity(id, establishment.id).catch(() => {});
    loadCelebrityCodes();
  };

  if (!establishment) return null;

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack spacing={0.5}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
          الإحالة — روابط وأكواد QR
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          تتبع حملات المشاهير وروابط دعوة الأصدقاء الخاصة بكل عميل
        </Typography>
      </Stack>

      {/* روابط QR للمشاهير */}
      <Box>
        <SectionHeader title="QR المشاهير والحملات" />
        <Paper elevation={0} sx={{ ...cardStyle, p: 2.5, height: "auto", mb: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              placeholder="اسم المشهور أو الحملة (مثلاً: أحمد الفنان)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" }, "& .MuiInputBase-input": { fontFamily: '"IBM Plex Sans Arabic"' } }}
            />
            <Button
              variant="contained"
              disabled={!newLabel.trim() || creating}
              onClick={handleCreate}
              sx={{
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                backgroundColor: tokens.ink,
                color: tokens.paper,
                borderRadius: "12px",
                px: 3,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              إنشاء كود جديد
            </Button>
          </Stack>
        </Paper>

        {celebrityCodes === null ? (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
            جاري التحميل…
          </Typography>
        ) : celebrityCodes.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, fontFamily: '"IBM Plex Sans Arabic"' }}>
            ما في أكواد مشاهير لسا — أنشئ أول واحد من فوق
          </Typography>
        ) : (
          <Grid container spacing={2.5}>
            {celebrityCodes.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c._id}>
                <ReferralCodeCard
                  title={c.label}
                  subtitle={c.isActive ? "فعّال" : "معطّل"}
                  code={c.code}
                  webChatLink={c.webChatLink}
                  qrDataUrl={c.qrDataUrl}
                  signupCount={c.signupCount}
                  isActive={c.isActive}
                  onToggle={() => handleToggle(c._id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* رابط دعوة الأصدقاء الخاص بعميل معيّن */}
      <Box>
        <SectionHeader title="رابط دعوة الأصدقاء (لعميل معيّن)" />
        <Paper elevation={0} sx={{ ...cardStyle, height: "auto", mt: 1.5 }}>
          <Stack spacing={2.5}>
            <Autocomplete
              options={customers}
              value={selectedCustomer}
              onChange={(_, v) => setSelectedCustomer(v)}
              getOptionLabel={(c) => `${c.name || "بدون اسم"} — ${c.phone || ""}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="ابحث عن عميل بالاسم أو الرقم"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" }, "& .MuiInputBase-input": { fontFamily: '"IBM Plex Sans Arabic"' } }}
                />
              )}
            />

            {!selectedCustomer && (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3, fontFamily: '"IBM Plex Sans Arabic"' }}>
                اختر عميل من فوق لعرض رابط الإحالة الخاص فيه
              </Typography>
            )}
            {selectedCustomer && loadingCustomerCode && (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3, fontFamily: '"IBM Plex Sans Arabic"' }}>
                جاري التحميل…
              </Typography>
            )}
            {selectedCustomer && !loadingCustomerCode && customerCode && (
              <Grid container>
                <Grid item xs={12} sm={8} md={6}>
                  <ReferralCodeCard
                    title={selectedCustomer.name || selectedCustomer.phone}
                    subtitle="رابط دعوة الأصدقاء الخاص فيه"
                    code={customerCode.code}
                    webChatLink={customerCode.webChatLink}
                    qrDataUrl={customerCode.qrDataUrl}
                    signupCount={customerCode.signupCount}
                  />
                </Grid>
              </Grid>
            )}
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}