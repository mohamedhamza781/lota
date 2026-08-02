import { Stack, Typography } from "@mui/material";
import { EntityMark } from "./EntityMark";

export function SectionHeader({ title, action }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <EntityMark size={16} />
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>{title}</Typography>
      </Stack>
      {action}
    </Stack>
  );
}
