import { Box, Avatar } from "@mui/material";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

// كرت خريطة زخرفي (مش خريطة حقيقية) — نفس فكرة الصورة المرفقة: خلفية غامقة،
// خطوط شبكة رفيعة بتشبه الشوارع، وخطين أعرض يتقاطعوا عند الدبوس بالنص.
// بيستخدم ألوان الثيم نفسها (secondary.main فاتح على primary.main غامق)
// عشان يندمج بصريًا مع خلفية الفوتر الغامقة.
export default function MapCard({ height = 220 }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "rgba(245,236,210,0.05)",
        border: "1px solid rgba(245,236,210,0.12)",
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 400 220"
        preserveAspectRatio="none"
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* شبكة رفيعة */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 40} y1="0" x2={(i + 1) * 40} y2="220" stroke="#f5ecd2" strokeOpacity="0.07" strokeWidth="1" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 36} x2="400" y2={(i + 1) * 36} stroke="#f5ecd2" strokeOpacity="0.07" strokeWidth="1" />
        ))}
        {/* "شوارع" أعرض تتقاطع عند الدبوس */}
        <line x1="140" y1="0" x2="140" y2="220" stroke="#f5ecd2" strokeOpacity="0.18" strokeWidth="2" />
        <line x1="255" y1="0" x2="255" y2="150" stroke="#f5ecd2" strokeOpacity="0.18" strokeWidth="2" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="#f5ecd2" strokeOpacity="0.18" strokeWidth="2" />
        <line x1="40" y1="70" x2="140" y2="70" stroke="#f5ecd2" strokeOpacity="0.18" strokeWidth="2" />
      </Box>

      <Avatar
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "#fff",
          width: 44,
          height: 44,
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        }}
      >
        <PlaceRoundedIcon sx={{ color: "#fff" }} />
      </Avatar>
    </Box>
  );
}