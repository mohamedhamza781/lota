import { Navigate, useLocation, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthContext";
import { tokens } from "../theme/theme";

/**
 * role: "super_admin"            -> بس سوبر أدمن يفوت
 * role: "establishment_admin"    -> سوبر أدمن أو أدمن نفس المنشأة (establishmentId من الـ URL)
 * بدون role                       -> أي حساب مسجّل دخوله
 */
export function ProtectedRoute({ children, role }) {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();
  const { establishmentId } = useParams();

  if (authLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: tokens.paper }}>
        <CircularProgress sx={{ color: tokens.ink }} size={28} />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role === "super_admin" && currentUser.role !== "super_admin") {
    return <Navigate to="/403" replace />;
  }

  if (role === "establishment_admin") {
    const allowed =
      currentUser.role === "super_admin" ||
      (currentUser.role === "establishment_admin" && currentUser.establishmentId === establishmentId);
    if (!allowed) return <Navigate to="/403" replace />;
  }

  return children;
}