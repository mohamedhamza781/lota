import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Box, Stack, Typography, Avatar, Menu, MenuItem, ListItemIcon, Divider } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useState } from "react";
import { KajoMark } from "./KajoMark";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

const TABS = [
  { to: "/", label: "المنشآت" },
  { to: "/users", label: "المستخدمون" },
  { to: "/whatsapp-bot", label: "بوت واتساب" },
];

export function SuperAdminHeader({ subtitle = "لوحة المنصة — Super Admin" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const initials = (currentUser?.name || "").trim().split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <Stack
      sx={{ px: { xs: 2, sm: 3, md: 6 }, py: { xs: 1.5, sm: 3 }, borderBottom: `1px solid ${tokens.hairline}` }}
      spacing={{ xs: 1.25, sm: 0 }}
    >
      {/* صف علوي: الشعار + بيانات الحساب. جوّا نفس الصف بكل الأحجام
          (ما عاد التابات معتمدين عليه) - بس بيتلخبط أقل بالجوال لأنه
          صار في صف تاني تحته مخصص للتابات بدل ما تتزنق كلها بصف واحد. */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <KajoMark height={26} />
          <Typography
            noWrap
            variant="caption"
            sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', display: { xs: "none", sm: "block" } }}
          >
            {subtitle}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.85rem" }}>
              {currentUser?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
              سوبر أدمن
            </Typography>
          </Box>
          <Avatar
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: 34,
              height: 34,
              bgcolor: tokens.ink,
              color: tokens.paper,
              fontSize: "0.8rem",
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {initials || "أد"}
          </Avatar>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
                navigate("/login");
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              تسجيل خروج
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* صف التابات - صار دايماً ظاهر (حتى بالجوال)، بس بيسمح بسحب أفقي
          خفيف لو المساحة ما كفت بدل ما يختفي بالكامل زي قبل */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => {
          const active = location.pathname === tab.to;
          return (
            <Box
              key={tab.to}
              component={RouterLink}
              to={tab.to}
              sx={{
                px: 2,
                py: 0.9,
                borderRadius: 1.5,
                textDecoration: "none",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
                flexShrink: 0,
                color: active ? tokens.paper : tokens.ink,
                backgroundColor: active ? tokens.ink : "transparent",
                transition: "all 0.2s ease",
                "&:hover": { backgroundColor: active ? tokens.ink : tokens.surfaceAlt },
              }}
            >
              {tab.label}
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}