import { Box, Paper, Stack, Typography, Button } from "@mui/material";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { useNavigate } from "react-router-dom";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

export default function Forbidden() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const home = currentUser?.role === "super_admin" ? "/" : `/admin/${currentUser?.establishmentId ?? ""}`;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: tokens.paper, px: 3 }}>
      <Paper elevation={0} sx={{ p: 5, textAlign: "center", maxWidth: 380 }}>
        <Stack spacing={2} alignItems="center">
          <BlockRoundedIcon sx={{ color: tokens.muted, fontSize: 34 }} />
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
            ما عندك صلاحية توصل لهاي الصفحة
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            هاد القسم محصور بحسابات معيّنة فقط.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              onClick={() => navigate(home)}
              sx={{ backgroundColor: tokens.ink, fontFamily: '"IBM Plex Sans Arabic"', "&:hover": { backgroundColor: tokens.inkSoft } }}
            >
              رجوع للوحتي
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              sx={{ borderColor: tokens.hairline, color: tokens.ink, fontFamily: '"IBM Plex Sans Arabic"' }}
            >
              تسجيل خروج
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}