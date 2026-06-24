import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Login from "@/pages/Login";
import AppShell from "@/pages/AppShell";

/**
 * Route guard. Renders children (or Outlet) when the user is authenticated;
 * otherwise redirects to /login. The `replace` prop avoids stacking the
 * protected URL in history when the user gets bounced back.
 */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Root-aware index route. If the user is already logged in, send them
 * straight into the app; otherwise kick them to the login screen.
 */
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/app" : "/login"} replace />;
}

/**
 * Top-level router. Lives inside the <BrowserRouter> provided by App.tsx,
 * so it uses the v6 <Routes>/<Route> API (not the data-router variants).
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
