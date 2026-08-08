import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { rtlCache } from "./theme/rtlCache";
import theme from "./theme/theme";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

// تسجيل الـService Worker بشكل عام - شرط أساسي عشان أي صفحة بالتطبيق
// (بما فيها لوحة التحكم /admin) تصير "قابلة للتثبيت" (PWA) عند المتصفح.
// كان قبل هيك مسجّل بس جوا WebChat.jsx (صفحة شات العميل)، فلوحة التحكم
// ما كانت مؤهلة للتثبيت إطلاقاً مهما كان الـmanifest مضبوط صح.
// register("/sw.js") آمن يتكرر (المتصفح بيتجاهل التسجيل لو نفسه مسجّل
// أصلاً)، فما في مشكلة إنه WebChat.jsx بينده هو كمان بشكل منفصل.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("فشل تسجيل Service Worker:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  </React.StrictMode>
);