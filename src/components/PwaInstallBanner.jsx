import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Stack, Typography, Button, IconButton, Collapse } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import { tokens } from "../theme/theme";

// بانر "ثبّت التطبيق" الخاص بلوحة التحكم (admin). نفس فكرة InstallBanner
// الموجود بصفحة شات العميل (WebChat.jsx) بس مبني بـMUI عشان ينسجم مع
// ستايل الداشبورد، وبيعتمد بالدرجة الأولى على window.__deferredInstallPrompt
// يلي main.jsx بيخزّنه أول ما يلتقط حدث "beforeinstallprompt" (قبل حتى ما
// هاد المكوّن يترندر) - هيك ما منفوّت الفرصة لو الحدث انطلق بلحظة تحميل
// الصفحة قبل ما القائمة تفتح.
const STORAGE_KEY = "lotality_admin_install_prompt_last_shown";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // مرة كل ٢٤ ساعة كحد أقصى
const SHOW_DELAY_MS = 1500; // تأخير بسيط عشان ما يقاطع أول لحظة تحميل الصفحة

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__deferredInstallPrompt || null);
  const [isAppInstalled, setIsAppInstalled] = useState(
    () => window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true
  );
  const [visible, setVisible] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isIOS = useMemo(() => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    const isMacUA = /macintosh|mac os x/i.test(ua);
    const hasTouch = navigator.maxTouchPoints > 1;
    return isMacUA && hasTouch;
  }, []);
  const isAndroid = useMemo(() => /android/i.test(navigator.userAgent), []);
  const canInstall = Boolean(deferredPrompt);
  const eligible = !isAppInstalled && (canInstall || isIOS || isAndroid);

  // لو الحدث ما كان انطلق لحظة أول تحميل (نادراً، بس ممكن)، منستنى إله
  // كمان بعد ما المكوّن يترندر
  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferredPrompt(e);
    }
    function handleAppInstalled() {
      setIsAppInstalled(true);
      setVisible(false);
      window.__deferredInstallPrompt = null;
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!eligible) return;
    let lastShown = 0;
    try {
      lastShown = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      // تجاهل - لو localStorage مش متاح، منعتبرها أول مرة
    }
    if (Date.now() - lastShown < COOLDOWN_MS) return;

    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [eligible]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // تجاهل
    }
  }

  async function handleInstallClick() {
    if (isIOS) {
      setShowIOSInstructions((v) => !v);
      return;
    }
    if (canInstall) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        // تجاهل
      }
      window.__deferredInstallPrompt = null;
      setDeferredPrompt(null);
      dismiss();
      return;
    }
    if (isAndroid) {
      setShowAndroidInstructions((v) => !v);
      return;
    }
    dismiss();
  }

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: "max(12px, env(safe-area-inset-top, 12px))",
        left: 12,
        right: 12,
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: 440,
        mx: "auto",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid",
          borderColor: tokens.hairline || "rgba(0,0,0,0.1)",
          boxShadow: "0 12px 30px -8px rgba(0,0,0,0.18)",
          p: 1.5,
          backdropFilter: "blur(16px)",
          backgroundColor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.97)"),
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              backgroundColor: tokens.ink,
              color: tokens.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <HomeRoundedIcon fontSize="small" />
          </Box>
          <Typography sx={{ flex: 1, fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.82rem" }}>
            ثبّت لوحة التحكم على شاشتك الرئيسية
          </Typography>
          <Button
            onClick={handleInstallClick}
            variant="contained"
            size="small"
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "9px",
              boxShadow: "none",
              whiteSpace: "nowrap",
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink, boxShadow: "none" },
            }}
          >
            ثبّت
          </Button>
          <IconButton onClick={dismiss} size="small" aria-label="إغلاق" sx={{ color: "text.secondary" }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Collapse in={isIOS && showIOSInstructions}>
          <Typography
            sx={{ mt: 1, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.75rem", color: "text.secondary", lineHeight: 2 }}
          >
            ١. دوس زر "المشاركة" ⬆️ تحت بمتصفح سفاري
            <br />
            ٢. مرّر واختار "إضافة إلى الشاشة الرئيسية"
            <br />
            ٣. دوس "إضافة" فوق يمين
          </Typography>
        </Collapse>

        <Collapse in={isAndroid && !canInstall && showAndroidInstructions}>
          <Typography
            sx={{ mt: 1, fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.75rem", color: "text.secondary", lineHeight: 2 }}
          >
            ١. دوس زر القائمة ⋮ فوق يمين المتصفح
            <br />
            ٢. اختار "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق"
            <br />
            ٣. أكّد الإضافة
          </Typography>
        </Collapse>
      </Paper>
    </Box>
  );
}