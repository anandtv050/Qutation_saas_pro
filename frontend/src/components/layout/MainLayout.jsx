import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { PermissionsProvider } from "@/contexts/PermissionsContext";

export default function MainLayout() {
  return (
    <PermissionsProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="md:ml-[220px] pb-20 md:pb-0 min-h-screen">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </PermissionsProvider>
  );
}
