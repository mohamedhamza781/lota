import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Stack, Typography, Paper, Button, Chip, Skeleton } from "@mui/material";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import { tokens } from "../theme/theme";
import { notificationsApi } from "../api/notifications";
import { getCached, setCached } from "../utils/dataCache";

const TYPE_LABELS = {
  new_customer: "عميل جديد",
  new_order: "طلب جديد",
  campaign_finished: "حملة انتهت",
  at_risk_alert: "تنبيه فقد",
  system: "النظام",
};

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function Notifications() {
  const { establishmentId } = useParams();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const cacheKey = `notifications:${establishmentId}:${unreadOnly}`;

  const [notifications, setNotifications] = useState(() => getCached(cacheKey)?.notifications ?? []);
  const [unreadCount, setUnreadCount] = useState(() => getCached(cacheKey)?.unreadCount ?? 0);
  const [loading, setLoading] = useState(() => getCached(cacheKey) === undefined);
  const [error, setError] = useState("");

  function load() {
    if (!establishmentId) return;
    notificationsApi
      .list(establishmentId, unreadOnly)
      .then((data) => {
        const list = data?.notifications ?? [];
        const count = data?.unreadCount ?? 0;
        setNotifications(list);
        setUnreadCount(count);
        setCached(`notifications:${establishmentId}:${unreadOnly}`, { notifications: list, unreadCount: count });
        setError("");
      })
      .catch((err) => setError(err.message || "تعذّر جلب الإشعارات"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, unreadOnly]);

  async function handleMarkRead(n) {
    if (n.isRead) return;
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(n._id, establishmentId);
    } catch {
      load();
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead(establishmentId);
    } catch {
      load();
    }
  }

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              الإشعارات
            </Typography>
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={unreadCount.toLocaleString("ar")}
                sx={{
                  height: 22,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  backgroundColor: tokens.ink,
                  color: tokens.paper,
                  borderRadius: "8px",
                  fontFamily: '"IBM Plex Sans Arabic"',
                }}
              />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            تنبيهات تلقائية عن عملاء مهدّدين بالفقد، عملاء جدد، وأحداث تانية بالمنشأة.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            size="small"
            label={unreadOnly ? "غير مقروء بس" : "الكل"}
            onClick={() => setUnreadOnly((v) => !v)}
            sx={{
              cursor: "pointer",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.78rem",
              px: 0.5,
              py: 0.5,
              borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
              backgroundColor: unreadOnly ? tokens.ink : tokens.surfaceAlt || "rgba(0,0,0,0.04)",
              color: unreadOnly ? tokens.paper : tokens.ink,
              transition: "all 0.2s ease",
              "&:hover": { backgroundColor: unreadOnly ? tokens.inkSoft || tokens.ink : "rgba(0,0,0,0.08)" },
            }}
          />
          <Button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            startIcon={<DoneAllRoundedIcon fontSize="small" />}
            sx={{
              color: tokens.ink,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "10px",
              px: 2,
              "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            }}
          >
            تعليم الكل كمقروء
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {loading && (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: "16px" }} />
          ))}
        </Stack>
      )}

      {!loading && notifications.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "20px",
            border: `2px dashed ${tokens.hairline || "rgba(0,0,0,0.1)"}`,
            backgroundColor: "transparent",
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <NotificationsActiveRoundedIcon sx={{ color: tokens.muted, fontSize: 36, opacity: 0.6 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 500 }}>
              {unreadOnly ? "ما في إشعارات غير مقروءة" : "ما في إشعارات بعد"}
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* قائمة الإشعارات بتصميم Glassmorphism */}
      <Stack spacing={1.5}>
        {notifications.map((n) => (
          <Paper
            key={n._id}
            elevation={0}
            onClick={() => handleMarkRead(n)}
            sx={{
              p: 2.5,
              cursor: n.isRead ? "default" : "pointer",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: n.isRead ? tokens.hairline || "rgba(0, 0, 0, 0.06)" : tokens.ink,
              background: (theme) =>
                n.isRead
                  ? theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)"
                  : theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.025)",
              backdropFilter: "blur(12px)",
              boxShadow: n.isRead ? "0 4px 16px -4px rgba(0,0,0,0.02)" : "0 8px 24px -6px rgba(0,0,0,0.06)",
              transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease",
              "&:hover": {
                transform: n.isRead ? "none" : "translateY(-2px)",
                boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)",
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: `1.5px solid ${tokens.ink}`,
                  backgroundColor: n.isRead ? "transparent" : tokens.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  mt: 0.2,
                  boxShadow: n.isRead ? "none" : "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                {n.type === "at_risk_alert" && (
                  <PriorityHighRoundedIcon sx={{ fontSize: 14, color: n.isRead ? tokens.ink : tokens.paper }} />
                )}
              </Box>
              <Stack spacing={0.6} sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: n.isRead ? 600 : 800, fontSize: "0.95rem" }}>
                    {n.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={TYPE_LABELS[n.type] || n.type}
                    variant="outlined"
                    sx={{
                      borderColor: tokens.hairline || "rgba(0,0,0,0.1)",
                      color: "text.secondary",
                      borderRadius: "8px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      height: 22,
                      flexShrink: 0,
                    }}
                  />
                </Stack>
                {n.body && (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {n.body}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: tokens.muted, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.75rem", pt: 0.3 }}>
                  {fmtDateTime(n.createdAt)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}