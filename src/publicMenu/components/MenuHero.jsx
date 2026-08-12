import { Box, Typography, Stack, Button } from "@mui/material";
import { scrollToSection } from "../scrollTo";
const pillLight = { bgcolor: "#ffffff", color: "primary.main", borderRadius: 999, px: 3, "&:hover": { bgcolor: "#f2f2f2" } };
export default function MenuHero({ title = "المنيو", subtitle = "طعم يُحكى وتجربة تُروى" }) {
  return (
    <Box sx={{ bgcolor: "primary.main", color: "secondary.main", pt: 4, pb: 4, textAlign: "center" }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 56, md: 96 }, color: "#ffffff" }}>{title}</Typography>

      <Typography sx={{ mt: 1, opacity: 0.9, color: "#ffffff" }}>{subtitle}</Typography>
      
      <Stack direction="row" spacing={2} justifyContent="center" mt={3}>
        {/* <Button variant="contained" sx={pillLight} onClick={() => scrollToSection("locations")}>فروعنا</Button> */}
      </Stack>
    </Box>
  );
}