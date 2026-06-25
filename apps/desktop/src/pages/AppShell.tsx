import { Outlet } from "react-router-dom";
import { Backdrop, Header } from "@/components/shell";

export default function AppShell() {
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Backdrop />
      <Header />
      <Outlet />
    </div>
  );
}
