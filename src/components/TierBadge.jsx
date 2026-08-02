import { Box, Typography } from "@mui/material";
import { tokens } from "../theme/theme";
import { InkDot } from "./InkDot";

/**
 * Monochrome tier system — no hue to lean on, so each tier is told apart by
 * "how much ink" the stamp uses: bronze is a thin hollow ring, silver adds
 * a dashed inner ring, gold is fully inked (the most "stamped" mark on the card).
 */
const TIER_STYLES = {
  bronze: { fill: false, dashed: false, doubleRing: false, label: "برونزي" },
  silver: { fill: false, dashed: true, doubleRing: false, label: "فضي" },
  gold: { fill: true, dashed: false, doubleRing: false, label: "ذهبي" },
};

export function TierBadge({ tier = "bronze", size = 34 }) {
  const s = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${tokens.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        backgroundColor: s.fill ? tokens.ink : "transparent",
        ...(s.doubleRing && {
          boxShadow: `0 0 0 3px ${tokens.surface}, 0 0 0 4px ${tokens.ink}`,
        }),
        "&::before": s.dashed
          ? {
              content: '""',
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              border: `1px dashed ${tokens.ink}`,
            }
          : undefined,
      }}
      title={s.label}
    >
      <Typography
        sx={{
          fontFamily: '"IBM Plex Sans Arabic"',
          fontSize: size * 0.32,
          fontWeight: 700,
          color: s.fill ? tokens.paper : tokens.ink,
        }}
      >
        {s.label.slice(0, 1)}
      </Typography>
    </Box>
  );
}

/**
 * Segment state told apart by mark shape, not color: a hollow dot (new),
 * a solid dot (active), and a solid dot inside a ring — like a target —
 * for at-risk, since that's the state that needs attention.
 */
const SEGMENT_STYLES = {
  new: { shape: "hollow", label: "جديد" },
  active: { shape: "solid", label: "نشط" },
  at_risk: { shape: "target", label: "معرّض للفقد" },
};

export function SegmentChip({ segment = "new" }) {
  const s = SEGMENT_STYLES[segment] ?? SEGMENT_STYLES.new;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.9,
        fontSize: "0.78rem",
        color: tokens.ink,
        fontWeight: s.shape === "target" ? 700 : 500,
      }}
    >
      <InkDot shape={s.shape} />
      {s.label}
    </Box>
  );
}