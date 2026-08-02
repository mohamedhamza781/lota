import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { KajoMark } from "../components/KajoMark";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (currentUser) {
    const dest =
      currentUser.role === "super_admin"
        ? "/"
        : `/admin/${currentUser.establishmentId}`;
    return <Navigate to={dest} replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    login(email, password).then((result) => {
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const from = location.state?.from;
      const dest =
        from ??
        (result.user.role === "super_admin"
          ? "/"
          : `/admin/${result.user.establishmentId}`);
      navigate(dest, { replace: true });
    });
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: (theme) =>
          theme.palette.mode === "dark" ? "#07080a" : "#f4f5f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2.5,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"IBM Plex Sans Arabic", sans-serif',
        // Keyframe Animations
        "@keyframes pulseGlow": {
          "0%, 100%": { transform: "scale(1) translate(0, 0)", opacity: 0.6 },
          "50%": { transform: "scale(1.15) translate(20px, -20px)", opacity: 0.9 },
        },
        "@keyframes cardFloat": {
          from: { opacity: 0, transform: "translateY(20px) scale(0.98)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
      }}
    >
      {/* شبكة التوهج الخلفي (Mesh Glow Effect) */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "15%",
          insetInlineStart: "20%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 65%)",
          filter: "blur(60px)",
          animation: "pulseGlow 12s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "10%",
          insetInlineEnd: "20%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
          filter: "blur(70px)",
          animation: "pulseGlow 16s ease-in-out infinite alternate-reverse",
          pointerEvents: "none",
        }}
      />

      {/* كرت تسجيل الدخول الجلاسفورم العصري */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 410,
          p: { xs: 3.5, sm: 4.5 },
          position: "relative",
          borderRadius: "28px",
          zIndex: 1,
          overflow: "hidden",
          backdropFilter: "blur(24px)",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)"
              : "linear-gradient(160deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(255, 255, 255, 0.8)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 30px 60px rgba(0,0,0,0.6)"
              : "0 20px 40px -15px rgba(0,0,0,0.05), 0 0 1px 1px rgba(0,0,0,0.02)",
          animation: "cardFloat 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* شريط الإضاءة المزين أعلى الكرت */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "2px",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)"
                : "linear-gradient(90deg, transparent, rgba(0,0,0,0.2), transparent)",
          }}
        />

        <Stack spacing={3.5}>
          {/* الهيدر: الشعار والعنوان */}
          <Stack spacing={2} alignItems="center" sx={{ textAlign: "center" }}>
            <Box
              sx={{
                p: 1.8,
                borderRadius: "20px",
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
                    : "linear-gradient(135deg, #ffffff, #f0f0f0)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "inset 0 1px 1px rgba(255,255,255,0.1)"
                    : "0 8px 20px -6px rgba(0,0,0,0.06)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KajoMark height={40} />
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontSize: "0.85rem",
                  mt: 0.5,
                  fontWeight: 500,
                }}
              >
                مرحباً بك، سجل دخولك للوحة التحكم
              </Typography>
            </Box>
          </Stack>

          {/* رسائل الخطأ */}
          {error && (
            <Alert
              severity="error"
              sx={{
                borderRadius: "14px",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontSize: "0.82rem",
                fontWeight: 600,
                backdropFilter: "blur(4px)",
              }}
            >
              {error}
            </Alert>
          )}

          {/* فورم تسجيل الدخول */}
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {/* البريد الإلكتروني */}
            <Stack spacing={0.8}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "text.primary",
                  px: 0.5,
                }}
              >
                البريد الإلكتروني
              </Typography>
              <TextField
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoFocus
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineRoundedIcon
                        sx={{ color: "text.secondary", fontSize: "1.15rem" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                    fontFamily: '"IBM Plex Sans Arabic"',
                    fontSize: "0.88rem",
                    transition: "all 0.25s ease",
                    "& fieldset": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)",
                    },
                    "&:hover fieldset": {
                      borderColor: tokens.ink,
                    },
                    "&.Mui-focused": {
                      backgroundColor: "transparent",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 0 0 3px rgba(255,255,255,0.08)"
                          : "0 0 0 3px rgba(0,0,0,0.05)",
                    },
                    // === تصحيح لون الـ Autofill تبع المتصفح ===
                    // Chrome/Edge بيحطوا خلفية زرقاء/بنفسجية فاتحة تلقائياً
                    // على أي input يعبيه الـ autofill (زي الإيميل)، بتطغى
                    // على تصميمنا. الحيلة: نخلي المتصفح "يفكر" إنه في
                    // box-shadow داخلي بلون خلفيتنا الأصلية (مش الأزرق
                    // تبعه)، وناخر أي transition عالخلفية بتأخير طويل جداً
                    // عشان المتصفح ما يقدر يطبّق لونه أصلاً
                    "& input:-webkit-autofill": {
                      WebkitBoxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 0 0 1000px rgba(255,255,255,0.03) inset"
                          : "0 0 0 1000px rgba(0,0,0,0.02) inset",
                      WebkitTextFillColor: "inherit",
                      caretColor: tokens.ink,
                      transition: "background-color 9999s ease-in-out 0s",
                    },
                  },
                }}
              />
            </Stack>

            {/* كلمة المرور */}
            <Stack spacing={0.8}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "text.primary",
                  px: 0.5,
                }}
              >
                كلمة المرور
              </Typography>
              <TextField
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon
                        sx={{ color: "text.secondary", fontSize: "1.15rem" }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOffRoundedIcon sx={{ fontSize: "1.1rem" }} />
                        ) : (
                          <VisibilityRoundedIcon sx={{ fontSize: "1.1rem" }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                    fontFamily: '"IBM Plex Sans Arabic"',
                    fontSize: "0.88rem",
                    transition: "all 0.25s ease",
                    "& fieldset": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)",
                    },
                    "&:hover fieldset": {
                      borderColor: tokens.ink,
                    },
                    "&.Mui-focused": {
                      backgroundColor: "transparent",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 0 0 3px rgba(255,255,255,0.08)"
                          : "0 0 0 3px rgba(0,0,0,0.05)",
                    },
                    // === تصحيح لون الـ Autofill تبع المتصفح ===
                    // Chrome/Edge بيحطوا خلفية زرقاء/بنفسجية فاتحة تلقائياً
                    // على أي input يعبيه الـ autofill (زي الإيميل)، بتطغى
                    // على تصميمنا. الحيلة: نخلي المتصفح "يفكر" إنه في
                    // box-shadow داخلي بلون خلفيتنا الأصلية (مش الأزرق
                    // تبعه)، وناخر أي transition عالخلفية بتأخير طويل جداً
                    // عشان المتصفح ما يقدر يطبّق لونه أصلاً
                    "& input:-webkit-autofill": {
                      WebkitBoxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 0 0 1000px rgba(255,255,255,0.03) inset"
                          : "0 0 0 1000px rgba(0,0,0,0.02) inset",
                      WebkitTextFillColor: "inherit",
                      caretColor: tokens.ink,
                      transition: "background-color 9999s ease-in-out 0s",
                    },
                  },
                }}
              />
            </Stack>

            {/* زر الدخول التفاعلي */}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              endIcon={
                !submitting && (
                  <ArrowBackRoundedIcon
                    sx={{
                      fontSize: "1.1rem !important",
                      transition: "transform 0.2s ease",
                    }}
                  />
                )
              }
              sx={{
                mt: 1,
                py: 1.3,
                backgroundColor: tokens.ink || "#000",
                color: tokens.paper || "#fff",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 700,
                fontSize: "0.92rem",
                borderRadius: "14px",
                textTransform: "none",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                "&:hover": {
                  backgroundColor: tokens.inkSoft || "#222",
                  transform: "translateY(-2px)",
                  boxShadow: "0 14px 30px -5px rgba(0,0,0,0.3)",
                  "& .MuiButton-endIcon": {
                    transform: "translateX(-4px)",
                  },
                },
                "&:active": {
                  transform: "translateY(0)",
                },
              }}
            >
              {submitting ? "جاري التحقق…" : "تسجيل الدخول"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}