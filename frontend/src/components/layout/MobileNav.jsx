import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, FilePlus, Package, BarChart3, Users, User, LogOut, X,
  Printer, CreditCard, Wrench, Shield, Receipt, Brain,
} from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";

const ICON_MAP = {
  Home, FilePlus, Package, BarChart3, User, Users,
  Printer, CreditCard, Wrench, Shield, Receipt, Brain,
};

const ADMIN_PAGES = [
  { path: "/users", label: "Users", icon: Users },
  { path: "/plans", label: "Plans", icon: CreditCard },
  { path: "/services", label: "Services", icon: Wrench },
  { path: "/modules", label: "Modules", icon: Shield },
  { path: "/print-settings", label: "Print Settings", icon: Printer },
];

export default function MobileNav() {
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { permissions } = usePermissions();

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.intUserId === 1;

  const navItems = useMemo(() => {
    if (!permissions?.lstNav) return [];
    return permissions.lstNav
      .filter((m) => m.blnShowInSidebar && m.strPath && !m.blnAdminOnly)
      .map((m) => ({
        path: m.strPath,
        label: m.strLabel,
        icon: ICON_MAP[m.strIcon] || Package,
      }));
  }, [permissions]);

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path.split("?")[0].replace("/new", ""));
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <>
      {/* Profile Menu Overlay */}
      {showProfileMenu && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfileMenu(false)} />
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div>
                <p className="font-medium text-neutral-900">{userInfo.strUserName || "User"}</p>
                <p className="text-xs text-neutral-500">{userInfo.strEmail || ""}</p>
              </div>
              <button onClick={() => setShowProfileMenu(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="p-2">
              {isAdmin && ADMIN_PAGES.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <Link to="/profile" onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors">
                <User className="w-5 h-5 text-neutral-500" />
                <span className="font-medium">Profile Settings</span>
              </Link>

              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
                  active ? "text-neutral-900" : "text-neutral-400 active:bg-neutral-100"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowProfileMenu(true)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
              showProfileMenu ? "text-neutral-900" : "text-neutral-400 active:bg-neutral-100"
            }`}
          >
            <User className={`w-5 h-5 ${showProfileMenu ? "stroke-[2.5px]" : ""}`} />
            <span className={`text-[10px] ${showProfileMenu ? "font-semibold" : "font-medium"}`}>Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}
