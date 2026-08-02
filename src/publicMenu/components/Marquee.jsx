import { Box, Stack, Typography } from "@mui/material";
import { marquee as defaultMarquee } from "../data";

// لون نص الشريط المتحرك - ثابت لكل المنشآت (درجة بين الرملي/البيج وخلفية
// المنيو والأسود)، وما بيتغيّر حسب menuPrimaryColor تبع كل منشأة زي باقي
// عناصر المنيو (على عكس primary.main يلي بيتغيّر لون حسب اختيار كل منشأة)
const MARQUEE_TEXT_COLOR = "#4A3B28";

export default function Marquee({ items: customItems }) {
  const base = customItems && customItems.length > 0 ? customItems : defaultMarquee;
  const items = [...base, ...base, ...base];
  return (
    <Box sx={{ overflow: "hidden", bgcolor: "background.default", borderTop: "1px solid #e6d9b0", borderBottom: "1px solid #e6d9b0", py: 1.5 }}>
      <Stack direction="row" spacing={4} sx={{
        whiteSpace: "nowrap",
        animation: "scroll 30s linear infinite",
        "@keyframes scroll": { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      }}>
        {items.map((t, i) => (
          <Typography key={i} sx={{ color: MARQUEE_TEXT_COLOR, fontWeight: 600, fontFamily: "IBM Plex Sans Arabic" }}>{t} ✦</Typography>
        ))}
      </Stack>
    </Box>
  );
}