import { AppBar, Toolbar, Box, Button, Avatar } from "@mui/material";
import { scrollToSection } from "../scrollTo";
import { resolveImageUrl } from "../../api/uploads";
const navBtn = { color: "secondary.main", fontSize: 14 };

function LogoPlaceholder() {
  return (
    <Avatar
      variant="rounded"
      sx={{
        bgcolor: "secondary.main",
        color: "primary.main",
        width: 44,
        height: 44,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      شعار
    </Avatar>
  );
}

export default function Navbar({ logoUrl }) {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: "primary.main" }}>
      {/* <Box sx={{ textAlign: "center", fontSize: 12, color: "secondary.main", py: 0.5 }}>
        اشتري قهوة وخذ الثانية مجانًا — هالأسبوع بس (١٨–٢٠ نيسان)
      </Box> */}
      <Toolbar sx={{ justifyContent: "center", gap: 4 }}>
        <Button sx={navBtn} onClick={() => scrollToSection("menu")}>المنيو</Button>
        {logoUrl ? (
          <Avatar variant="rounded" src={resolveImageUrl(logoUrl)} alt="Logo" sx={{ width: 44, height: 44 }} />
        ) : (
          <LogoPlaceholder />
        )}
        <Button sx={navBtn} onClick={() => scrollToSection("locations")}>الفروع</Button>
        
      </Toolbar>
    </AppBar>
  );
}