import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "../theme/theme";

/**
 * Every status in the product — customer segment, coupon lifecycle,
 * notification delivery — is told apart by the same four ink states
 * instead of a color per meaning. Keeping the vocabulary identical
 * everywhere is what makes the monochrome system read as one language
 * rather than an arbitrary shape per screen.
 *
 *  hollow  → not yet begun / new           (سُلم، لم يبدأ بعد)
 *  solid   → active / delivered / redeemed (تم، مكتمل)
 *  dashed  → in progress / pending         (قيد الانتظار)
 *  target  → needs attention / failed      (يحتاج متابعة)
 */
export function InkDot({ shape = "hollow", size = 8 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        border: `1.5px solid ${tokens.ink}`,
        backgroundColor: shape === "hollow" || shape === "dashed" ? "transparent" : tokens.ink,
        position: "relative",
        ...(shape === "target" && {
          boxShadow: `0 0 0 2.5px ${tokens.surface}, 0 0 0 3.5px ${tokens.ink}`,
        }),
        "&::before": shape === "dashed"
          ? {
              content: '""',
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              border: `1px dashed ${tokens.mutedLight}`,
            }
          : undefined,
      }}
    />
  );
}

export function StatusLabel({ shape, label, size = 8 }) {
  return (
    <Stack direction="row" spacing={0.9} alignItems="center">
      <InkDot shape={shape} size={size} />
      <Typography variant="caption" sx={{ fontWeight: shape === "target" ? 700 : 500, color: tokens.ink }}>
        {label}
      </Typography>
    </Stack>
  );
}
