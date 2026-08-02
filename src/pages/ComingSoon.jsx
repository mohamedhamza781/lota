import { Paper, Stack, Typography } from "@mui/material";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import { tokens } from "../theme/theme";

export default function ComingSoon({ title }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: "center",
        border: `1px dashed ${tokens.hairline}`,
        backgroundColor: "transparent",
        borderRadius: 4,
        animation: "fadeInUp 0.4s ease backwards",
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <ConstructionRoundedIcon sx={{ color: tokens.muted, fontSize: 32 }} />
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          هذه الشاشة قيد الإنشاء — الخطوة التالية في التطوير.
        </Typography>
      </Stack>
    </Paper>
  );
}
