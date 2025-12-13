import { Link, useLocation } from "react-router-dom";
import { Home, FilePlus, ReceiptText, BarChart3, User, LogOut } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/quotations/new", label: "New Quote", icon: FilePlus },
  { path: "/invoices/new", label: "New Bill", icon: ReceiptText },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path.replace("/new", ""));
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

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
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
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-neutral-100">
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
