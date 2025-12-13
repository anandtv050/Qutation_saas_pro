import { User, Mail, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import authService from "@/services/authServices";

export default function Profile() {
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/";
  };

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Profile</h1>
        <p className="text-sm text-neutral-500">Your account details</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Name</p>
              <p className="text-sm font-medium text-neutral-900">{user?.strUserName || "-"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Email</p>
              <p className="text-sm font-medium text-neutral-900">{user?.strEmail || "-"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Business Name</p>
              <p className="text-sm font-medium text-neutral-900">{user?.strBusinessName || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <Button
        variant="destructive"
        className="w-full justify-center gap-2"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </Button>
    </div>
  );
}
