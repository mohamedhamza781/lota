import { createTheme } from "@mui/material/styles";

const DEFAULT_PRIMARY = "#1f4d2b";

// بيبني ثيم المنيو العام - بيقبل لون أساسي مخصّص لكل منشأة (menuPrimaryColor
// من الباك إند). لو ما تحدد لون (null/فاضي)، بيرجع يستخدم الأخضر الافتراضي
// القديم زي ما كان دايماً.
export function buildPublicMenuTheme(primaryColor) {
  const primary = primaryColor && /^#([0-9a-fA-F]{3}){1,2}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  return createTheme({
    direction: "rtl",
    palette: {
      primary: { main: primary, contrastText: "#f5ecd2" },
      secondary: { main: "#f5ecd2" },
      background: { default: "#fff", paper: "#ffffff" },
      text: { primary: "#1f2a20", secondary: "#5b6b5c" },
    },
    typography: {
      fontFamily: `"IBM Plex Sans Arabic",Arial,sans-serif`,
      h1: { fontWeight: 700, letterSpacing: -1 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 600, fontFamily: `"IBM Plex Sans Arabic", sans-serif` },
      body1: { fontFamily: `"IBM Plex Sans Arabic", sans-serif` },
      body2: { fontFamily: `"IBM Plex Sans Arabic", sans-serif` },
    },
    shape: { borderRadius: 14 },
  });
}

// نسخة افتراضية جاهزة (بدون لون مخصّص) - لأي مكان لسا بيستوردها القديم
const theme = buildPublicMenuTheme(null);
export default theme;