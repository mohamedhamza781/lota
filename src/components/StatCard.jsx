import { Box, Typography, Stack, useTheme } from "@mui/material";

export function StatCard({ label, value, delta, urgent = false, unit, icon, accentColor, delay = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = accentColor || theme.palette.primary.main;

  return (
    <Box
      sx={{
        borderRadius: "24px",
        p: 3,
        background: isDark
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 2px 16px rgba(0,0,0,0.3)"
          : "0 2px 16px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        willChange: "transform, box-shadow",
        
        // إصلاح الأنيماشن حتى لا يتعارض مع الـ Hover
        opacity: 0,
        animation: "fadeUp 0.4s ease forwards",
        animationDelay: `${delay * 0.07}s`,
        
        "@keyframes fadeUp": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },

        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: isDark
            ? "0 8px 28px rgba(0,0,0,0.4)"
            : "0 8px 28px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* icon + label */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "14px",
              background: `${accent}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accent,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          sx={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
      </Stack>

      {/* value */}
      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography
          sx={{
            fontFamily: "'Cairo', sans-serif",
            fontSize: "2rem",
            fontWeight: 800,
            lineHeight: 1,
            color: "text.primary",
          }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", fontFamily: "'Cairo', sans-serif" }}>
            {unit}
          </Typography>
        )}
      </Stack>

      {/* delta */}
      {delta && (
        <Typography
          sx={{
            mt: 1,
            fontFamily: "'Cairo', sans-serif",
            fontSize: "0.75rem",
            color: urgent ? "#EF4444" : "text.secondary",
            fontWeight: urgent ? 700 : 400,
          }}
        >
          {delta}
        </Typography>
      )}
    </Box>
  );
}