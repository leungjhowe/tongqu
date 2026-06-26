import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Login from "@/pages/Login";
import AppShell from "@/pages/AppShell";
import { DashboardHome, WorkspacePage, ComingSoon } from "@/components/shell";

/** 路由守卫：未登录跳 /login */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** 根路径重定向：已登录进 /app/home，未登录进 /login */
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/app/home" : "/login"} replace />;
}

function PlaceholderPage({ title }: { title: string }) {
  return <ComingSoon title={title} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DashboardHome />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="workspace/:id" element={<PlaceholderPage title="项目" />} />
          <Route path="assets" element={<PlaceholderPage title="资产" />} />
          <Route path="templates" element={<PlaceholderPage title="模板" />} />
        </Route>
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}