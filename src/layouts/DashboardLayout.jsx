import { NavLink, Outlet, useLocation, useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Avatar,
  Stack,
  Chip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon as MenuItemIcon,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import LocalActivityRoundedIcon from "@mui/icons-material/LocalActivityRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../theme/theme";
import { resolveImageUrl } from "../api/uploads";
import { EntityMark } from "../components/EntityMark";
import { KajoMark } from "../components/KajoMark";
import { useAuth } from "../auth/AuthContext";

const DRAWER_WIDTH = 256;

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { establishmentId } = useParams();
  const { establishments, currentUser, logout } = useAuth();
  const establishment = establishments.find((e) => e.id === establishmentId) ?? establishments[0];
  const base = `/admin/${establishmentId}`;
  const [anchorEl, setAnchorEl] = useState(null);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const avatarInitials = (currentUser?.name || "").trim().split(" ").map((p) => p[0]).slice(0, 2).join("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🩹 باگ معروف بمكتبة MUI: درج القائمة الجانبية بالجوال (Drawer تحت)
  // مضبوط ModalProps={{ keepMounted: true }}، وعناصره بتسكر الدرج
  // (setMobileOpen(false)) وبتنقل لصفحة جديدة (NavLink) بنفس الضغطة.
  // لما الاثنين (تسكير الدرج + تغيير الراوت) بيصيروا سوا، أحياناً
  // ModalManager تبع MUI ما بينظّف قفل السكرول (overflow:hidden +
  // padding-right) يلي بيحطه على body لما يفتح أي Dialog/Drawer -
  // فبتضل الصفحة الجديدة "مقفولة" (ما بتقبل ضغط ولا سكرول) لحد ما
  // تعمل رفرش يدوي. هاد إصلاح دفاعي: كل ما يتغير الراوت (يعني كل
  // تنقل ناجح)، منتأكد إنه body مو عالق بقفل قديم ومنحرره بالقوة.
  useEffect(() => {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
    document.body.style.removeProperty("pointer-events");
  }, [location.pathname]);

  const ALL_NAV_ITEMS = [
    { to: base, label: "نظرة عامة", icon: SpaceDashboardRoundedIcon, end: true },
    { to: `${base}/menu`, label: "المنيو", icon: RestaurantMenuRoundedIcon },
    { to: `${base}/customers`, label: "العملاء", icon: PeopleAltRoundedIcon, superAdminOnly: true },
    { to: `${base}/whatsapp`, label: "بوت واتساب", icon: WhatsAppIcon, superAdminOnly: true },
    { to: `${base}/followups`, label: "متابعة العملاء", icon: ReceiptLongRoundedIcon, superAdminOnly: true },
    { to: `${base}/analytics`, label: "تحليلات", icon: InsightsRoundedIcon, superAdminOnly: true },
    { to: `${base}/rfm`, label: "تحليل RFM", icon: DonutLargeRoundedIcon, superAdminOnly: true },
    { to: `${base}/points`, label: "النقاط", icon: LocalActivityRoundedIcon },
    { to: `${base}/coupons`, label: "الهدايا", icon: RedeemRoundedIcon },
    { to: `${base}/promotions`, label: "الإعلانات والعروض", icon: CampaignRoundedIcon },
    { to: `${base}/referrals`, label: "الإحالة", icon: ShareRoundedIcon, superAdminOnly: true },
    { to: `${base}/notifications`, label: "الإشعارات", icon: NotificationsActiveRoundedIcon },
    { to: `${base}/branches`, label: "الفروع", icon: StorefrontRoundedIcon },
    { to: `${base}/manual-whatsapp`, label: "رقم التواصل اليدوي", icon: WhatsAppIcon },
  ];

  // أدمن المنشأة (establishment_admin) بيشوف بس ٦ صفحات تشغيلية أساسية:
  // نظرة عامة + المنيو + النقاط + الكوبونات + الإشعارات + الفروع.
  // باقي الصفحات (العملاء/بوت واتساب/متابعة العملاء/تحليلات/RFM/الإحالة)
  // محصورة بسوبر أدمن بس - نفس القيد مطبّق كمان على مستوى الراوتينج
  // بـ App.jsx (ProtectedRoute) عشان ما ينفتح حتى لو دخل بالرابط مباشرة.
  const NAV_ITEMS = isSuperAdmin ? ALL_NAV_ITEMS : ALL_NAV_ITEMS.filter((item) => !item.superAdminOnly);

  const activeItem = NAV_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar علوي بتصميم Glassmorphism */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(18, 18, 18, 0.75)"
              : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: tokens.ink,
          borderBottom: "1px solid",
          borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.03)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3.5 }, gap: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} sx={{ color: tokens.ink, flexShrink: 0 }} aria-label="فتح القائمة">
                <MenuRoundedIcon />
              </IconButton>
            )}
            <EntityMark size={14} />
            <Typography
              noWrap
              sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.1rem" }, letterSpacing: "-0.01em" }}
            >
              {activeItem?.label ?? ""}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" sx={{ flexShrink: 0 }}>
            <Chip
              size="small"
              avatar={
                establishment?.logoUrl ? (
                  <Avatar src={resolveImageUrl(establishment.logoUrl)} alt={establishment?.name} />
                ) : undefined
              }
              label={establishment?.name ?? "..."}
              variant="outlined"
              sx={{
                display: { xs: "none", sm: "flex" },
                borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
                color: "text.secondary",
                borderRadius: "10px",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 0.5,
              }}
            />
            <Avatar
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                width: 36,
                height: 36,
                bgcolor: tokens.ink,
                color: tokens.paper,
                fontSize: "0.82rem",
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 700,
                border: `2px solid ${tokens.hairline || "rgba(0,0,0,0.1)"}`,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.25s ease",
                "&:hover": {
                  transform: "scale(1.06)",
                  boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.12)",
                },
              }}
            >
              {avatarInitials || "أد"}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  borderRadius: "16px",
                  p: 0.5,
                  mt: 1,
                  backdropFilter: "blur(16px)",
                  background: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                  border: "1px solid",
                  borderColor: tokens.hairline || "rgba(0,0,0,0.06)",
                },
              }}
            >
              <MenuItem disabled sx={{ opacity: "1 !important", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.88rem" }}>
                {currentUser?.name}
              </MenuItem>
              <Divider sx={{ my: 0.5, borderColor: tokens.hairline || "rgba(0,0,0,0.06)" }} />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  logout();
                  navigate("/login");
                }}
                sx={{ borderRadius: "10px", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.85rem" }}
              >
                <MenuItemIcon>
                  <LogoutRoundedIcon fontSize="small" sx={{ color: "error.main" }} />
                </MenuItemIcon>
                تسجيل خروج
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* شريط القائمة الجانبية (Drawer) بتصميم Glassmorphism */}
      {(() => {
        const drawerContent = (
          <>
            <Toolbar sx={{ px: 3 }}>
              <Stack
                component={isSuperAdmin ? RouterLink : "div"}
                to={isSuperAdmin ? "/" : undefined}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ textDecoration: "none", color: "inherit" }}
              >
                <KajoMark height={30} inverted />
              </Stack>
            </Toolbar>

            {isSuperAdmin && (
              <Stack
                component={RouterLink}
                to="/"
                direction="row"
                spacing={0.75}
                alignItems="center"
                onClick={() => setMobileOpen(false)}
                sx={{
                  mx: 3,
                  mb: 1.5,
                  textDecoration: "none",
                  color: "rgba(250,250,247,0.5)",
                  fontSize: "0.75rem",
                  fontFamily: '"IBM Plex Sans Arabic"',
                  transition: "color 0.2s ease",
                  "&:hover": { color: tokens.paper },
                }}
              >
                ← كل المنشآت
              </Stack>
            )}

            <Divider sx={{ borderColor: "rgba(250,250,247,0.08)" }} />

            <List sx={{ px: 2, py: 2.5 }}>
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <ListItemButton
                  key={to}
                  component={NavLink}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    borderRadius: "14px",
                    mb: 0.8,
                    px: 2,
                    py: 1,
                    color: "rgba(250,250,247,0.68)",
                    transition: "all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    "& .MuiListItemIcon-root": {
                      color: "rgba(250,250,247,0.45)",
                      minWidth: 36,
                      transition: "all 0.25s ease",
                    },
                    "&:hover": {
                      backgroundColor: "rgba(250,250,247,0.06)",
                      color: tokens.paper,
                      transform: "translateX(4px)",
                      "& .MuiListItemIcon-root": {
                        color: tokens.paper,
                        transform: "scale(1.1)",
                      },
                    },
                    "&.active": {
                      backgroundColor: tokens.paper,
                      color: tokens.ink,
                      fontWeight: 800,
                      boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)",
                      "& .MuiListItemIcon-root": {
                        color: tokens.ink,
                      },
                      "&:hover": {
                        transform: "none",
                        backgroundColor: tokens.paper,
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      fontFamily: '"IBM Plex Sans Arabic"',
                    }}
                  >
                    {label}
                  </ListItemText>
                </ListItemButton>
              ))}
            </List>
          </>
        );

        const paperSx = {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          backgroundColor: tokens.ink,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, #121212 0%, #0a0a0a 100%)"
              : `linear-gradient(180deg, ${tokens.ink} 0%, #171717 100%)`,
          backdropFilter: "blur(20px)",
          color: tokens.paper,
          border: "none",
          borderRadius: 0,
          boxShadow: "-4px 0px 24px rgba(0, 0, 0, 0.12)",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(250,250,247,0.12)",
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(250,250,247,0.25)",
          },
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(250,250,247,0.12) transparent",
        };

        return (
          <>
            {/* درج مؤقت بالجوال */}
            <Drawer
              variant="temporary"
              anchor="left"
              open={isMobile && mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: "block", md: "none" },
                "& .MuiDrawer-paper": paperSx,
              }}
            >
              {drawerContent}
            </Drawer>

            {/* درج دائم باللابتوب/الشاشات الكبيرة */}
            <Drawer
              variant="permanent"
              anchor="left"
              sx={{
                display: { xs: "none", md: "block" },
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": paperSx,
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        );
      })()}

      {/* منطقة المحتوى الرئيسية */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, sm: 3, md: 4.5 },
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "#121212" : "#FAFAF9",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
      >
        <Toolbar />
        <Box sx={{ animation: "fadeIn 0.35s ease-out" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}