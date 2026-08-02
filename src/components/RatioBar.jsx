import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "../theme/theme";

/**
 * A distribution row rendered as text + a solid ink bar. No chart library,
 * no color legend — the bar length is the only visual variable, same as
 * everything else in this system telling state apart by "how much ink."
 */
export function RatioBar({ label, count, total, emphasis = false }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Stack spacing={0.6}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="body2" sx={{ fontWeight: emphasis ? 700 : 500 }}>
          {label}
        </Typography>
        <Typography
          sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.8rem", color: tokens.muted }}
        >
          {count.toLocaleString("ar")} · {pct}٪
        </Typography>
      </Stack>
      <Box sx={{ height: 7, borderRadius: 4, backgroundColor: tokens.surfaceAlt, overflow: "hidden" }}>
        <Box
          sx={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: tokens.ink,
            borderRadius: 4,
            opacity: emphasis ? 1 : 0.55,
            transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </Box>
    </Stack>
  );
}