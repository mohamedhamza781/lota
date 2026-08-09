import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";

// كل الصفحات كانت قبل هيك بـimport عادي (فوري) - يعني كل زيارة للموقع
// (حتى لصفحة تسجيل الدخول بس) كانت تحمّل كود كل صفحات الداشبورد كامل
// دفعة وحدة بأول تحميل (ملف JS واحد ضخم). هلق كل صفحة بملفها المنفصل
// وما بتنحمّل إلا لما المستخدم فعلياً يزورها (code splitting)، فأول تحميل
// للموقع صار أخف وأسرع بكثير - خصوصاً لصفحة المنيو العامة وشات الويب
// (يفتحهم زبون خارجي مباشرة، أهم حاجة يكونوا سريعين).
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Users = lazy(() => import("./pages/Users"));
const WhatsAppBotConnection = lazy(() => import("./pages/WhatsAppBotConnection"));
const ManualWhatsAppConnection = lazy(() => import("./pages/ManualWhatsAppConnection"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Menu = lazy(() => import("./pages/Menu"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const WhatsAppBot = lazy(() => import("./pages/WhatsAppBot"));
const RFM = lazy(() => import("./pages/RFM"));
const Points = lazy(() => import("./pages/Points"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CustomerFollowUps = lazy(() => import("./pages/CustomerFollowUps"));
const Visits = lazy(() => import("./pages/Visits"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Branches = lazy(() => import("./pages/Branches"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PublicMenu = lazy(() => import("./pages/PublicMenu"));
const WebChat = lazy(() => import("./pages/WebChat"));
const Login = lazy(() => import("./pages/Login"));
const Forbidden = lazy(() => import("./pages/Forbidden"));

// شاشة تحميل بسيطة بتظهر فقط لحظة انتقال لصفحة لسا ما اتحمّلت (عادةً
// أجزاء من الثانية على نت عادي، بعدها المتصفح بيخزّنها Cache ومانرجع
// نستناها تاني - شوف vite.config.js لإعدادات الـcaching)
function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        color: "#94A3B8",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #E2E8F0",
          borderTopColor: "#0F5C47",
          borderRadius: "50%",
          animation: "app-route-spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes app-route-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// 🩹 [فصل الـmanifest] الداشبورد له manifest.json ثابت (اسمه "كيان")،
// وكل منشأة إلها manifest.json ديناميكي خاص فيها (شوف WebChat.jsx). لازم
// نضيف/نحدّث وسم <link rel="manifest"> بالجافاسكربت هون بدل ما يكون
// موجود بشكل ثابت جوا index.html - وإلا أي صفحة /chat/:slug أو /m/:slug
// كانت رح تبلّش بمanifest الداشبورد الخاطئ لحد ما React يشتغل ويستبدله
// (سباق race condition كان بيسبب تثبيت اختصار خاطئ أحياناً). هون منتأكد
// إنه manifest الداشبورد بيتحط بس لما نكون فعلياً بصفحة داشبورد/تسجيل
// دخول، مش بصفحات المنشأة/المنيو العامة (هدول عندهم منطقهم الخاص).
function useDashboardManifest() {
  const location = useLocation();
  useEffect(() => {
    const isTenantScopedPage = location.pathname.startsWith("/chat/") || location.pathname.startsWith("/m/");
    if (isTenantScopedPage) return; // WebChat.jsx / PublicMenu.jsx (لو إلها منطق مشابه) بيتكفلوا فيها لحالهم

    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = "/manifest.json";
  }, [location.pathname]);
}

export default function App() {
  useDashboardManifest();
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* تسجيل الدخول */}
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      {/* لوحة Super Admin — قائمة كل المنشآت، بدون شريط جانبي (ما في منشأة محدّدة بعد) */}
      <Route
        path="/"
        element={
          <ProtectedRoute role="super_admin">
            <SuperAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute role="super_admin">
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp-bot"
        element={
          <ProtectedRoute role="super_admin">
            <WhatsAppBotConnection />
          </ProtectedRoute>
        }
      />

      {/* الصفحة العامة لكل منشأة — بدون شريط جانبي أو مصادقة */}
      <Route path="/m/:slug" element={<PublicMenu />} />

      {/* شات الويب - بديل واتساب الكامل، بدون تسجيل دخول، بنفس منطق البوت */}
      <Route path="/chat/:slug" element={<WebChat />} />

      {/* لوحة منشأة محدّدة — نفس شاشات كيان، بس مفلترة حسب :establishmentId */}
      <Route
        path="/admin/:establishmentId"
        element={
          <ProtectedRoute role="establishment_admin">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<Menu />} />
        <Route
          path="customers"
          element={
            <ProtectedRoute role="super_admin">
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers/:customerId"
          element={
            <ProtectedRoute role="super_admin">
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="whatsapp"
          element={
            <ProtectedRoute role="super_admin">
              <WhatsAppBot />
            </ProtectedRoute>
          }
        />
        <Route
          path="rfm"
          element={
            <ProtectedRoute role="super_admin">
              <RFM />
            </ProtectedRoute>
          }
        />
        <Route path="points" element={<Points />} />
        <Route
          path="analytics"
          element={
            <ProtectedRoute role="super_admin">
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="followups"
          element={
            <ProtectedRoute role="super_admin">
              <CustomerFollowUps />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits"
          element={
            <ProtectedRoute role="super_admin">
              <Visits />
            </ProtectedRoute>
          }
        />
        <Route
          path="conversations"
          element={
            <ProtectedRoute role="super_admin">
              <Conversations />
            </ProtectedRoute>
          }
        />
        <Route path="coupons" element={<Coupons />} />
        <Route path="promotions" element={<Promotions />} />
        <Route
          path="referrals"
          element={
            <ProtectedRoute role="super_admin">
              <Referrals />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<Notifications />} />
        <Route path="branches" element={<Branches />} />
        <Route path="manual-whatsapp" element={<ManualWhatsAppConnection />} />
      </Route>
    </Routes>
    </Suspense>
  );
}