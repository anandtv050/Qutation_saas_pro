import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, FilePlus, Package, BarChart3, User, LogOut, Users,
  Printer, CreditCard, Wrench, Shield, Receipt, Brain, Loader2,
} from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";

// Icon registry — maps DB icon name to actual component
const ICON_MAP = {
  Home, FilePlus, Package, BarChart3, User, Users,
  Printer, CreditCard, Wrench, Shield, Receipt, Brain,
};

// Admin-only pages (not in tbl_module, always shown for admin)
const ADMIN_PAGES = [
  { path: "/users", label: "Users", icon: Users },
  { path: "/plans", label: "Plans", icon: CreditCard },
  { path: "/services", label: "Services", icon: Wrench },
  { path: "/modules", label: "Modules", icon: Shield },
];

export default function Sidebar() {
  const location = useLocation();
  const { permissions, isLoading } = usePermissions();
  const isLoaded = !isLoading;

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.intUserId === 1;

  const navItems = useMemo(() => {
    if (!permissions?.lstNav) return [];
    return permissions.lstNav
      .filter((m) => m.blnShowInSidebar && m.strPath)
      .map((m) => ({
        path: m.strPath,
        label: m.strLabel,
        icon: ICON_MAP[m.strIcon] || Package,
        moduleKey: m.strKey,
        adminOnly: m.blnAdminOnly,
      }));
  }, [permissions]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path.split("?")[0].replace("/new", ""));
  };

  return (
    <aside className="hidden md:flex flex-col w-[220px] bg-white border-r border-neutral-100 min-h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-neutral-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">Q</span>
          </div>
          <span className="font-semibold text-lg text-neutral-900">Quotely</span>
        </Link>
      </div>

      {/* Navigation — from DB */}
      <nav className="flex-1 px-3 pt-2">
        {!isLoaded ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {navItems.filter(item => !item.adminOnly).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${active ? "text-white" : "text-neutral-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-neutral-100">
        {/* Admin module pages from DB */}
        {isAdmin && navItems.filter(item => item.adminOnly).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive(item.path)
                  ? "bg-purple-600 text-white"
                  : "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive(item.path) ? "text-white" : "text-purple-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Admin-only static pages */}
        {isAdmin && ADMIN_PAGES.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                location.pathname === item.path
                  ? "bg-purple-600 text-white"
                  : "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${location.pathname === item.path ? "text-white" : "text-purple-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Profile */}
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            location.pathname === "/profile"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <User className={`w-[18px] h-[18px] ${location.pathname === "/profile" ? "text-white" : "text-neutral-400"}`} />
          <span>Profile</span>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-600 transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px] text-neutral-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
