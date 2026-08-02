import { Box, Typography } from "@mui/material";
import { tokens } from "../theme/theme";
import { TIER_COLORS, TIER_LABELS_AR } from "./TierTrendChart";

// ألوان حالة الـ recency (مرحلة ٢) - نفس منطق getEffectiveStatusLabel
// بالباك إند: لو recencyStatus مش "طبيعي"، هاي الحالة الفعلية المعروضة،
// بغض النظر عن activityTier (شوف مثال "السفير المفقود" بـ classification.service.js)
const RECENCY_COLORS = { at_risk: "#EF4444", lost: "#334155" };
const RECENCY_LABELS_AR = { at_risk: "معرّض للفقد", lost: "مفقود" };

/**
 * شارة تصنيف العميل - المرحلة ١ (activityTier: سفير/وفيّ/نشط/متردد/زائر
 * جديد) والمرحلة ٢ (recencyStatus) سوا. recencyStatus له الأولوية بالعرض
 * لو مش "طبيعي" - نفس منطق الداشبورد وصفحة RFM.
 */
export function ActivityBadge({ activityTier = "new", recencyStatus = "normal" }) {
  const useRecency = recencyStatus && recencyStatus !== "normal";
  const color = useRecency ? RECENCY_COLORS[recencyStatus] : TIER_COLORS[activityTier];
  const label = useRecency ? RECENCY_LABELS_AR[recencyStatus] : TIER_LABELS_AR[activityTier];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.1,
        py: 0.4,
        borderRadius: 1.5,
        border: `1px solid ${color}55`,
        backgroundColor: `${color}14`,
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.ink }}>
        {label || "—"}
      </Typography>
    </Box>
  );
}