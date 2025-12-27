import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FilePlus, Package, BarChart3, Users, User, LogOut, X } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/quotations/new", label: "Quote", icon: FilePlus },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function MobileNav() {
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Check if current user is admin (pk=1)
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.intUserId === 1;

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/inventory") return location.pathname === "/inventory";
    if (path === "/reports") return location.pathname === "/reports";
    return location.pathname.startsWith(path.replace("/new", ""));
  };

  const isProfileActive = location.pathname === "/profile";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      {/* Profile Menu Overlay */}
      {showProfileMenu && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProfileMenu(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div>
                <p className="font-medium text-neutral-900">{userInfo.strUserName || "User"}</p>
                <p className="text-xs text-neutral-500">{userInfo.strEmail || ""}</p>
              </div>
              <button
                onClick={() => setShowProfileMenu(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {/* Admin Users Link */}
              {isAdmin && (
                <Link
                  to="/users"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">User Management</span>
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <User className="w-5 h-5 text-neutral-500" />
                <span className="font-medium">Profile Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
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
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
                  active
                    ? "text-neutral-900"
                    : "text-neutral-400 active:bg-neutral-100"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Profile Button */}
          <button
            onClick={() => setShowProfileMenu(true)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
              isProfileActive || showProfileMenu
                ? "text-neutral-900"
                : "text-neutral-400 active:bg-neutral-100"
            }`}
          >
            <User className={`w-5 h-5 ${isProfileActive || showProfileMenu ? "stroke-[2.5px]" : ""}`} />
            <span className={`text-[10px] ${isProfileActive || showProfileMenu ? "font-semibold" : "font-medium"}`}>
              Profile
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
