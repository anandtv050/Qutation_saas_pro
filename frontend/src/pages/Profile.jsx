import { useState, useEffect } from "react";
import { User, Mail, Building2, Phone, MapPin, Lock, LogOut, Loader2, Pencil, Check, X } from "lucide-react";
import authService from "@/services/authServices";
import userService from "@/services/userService";

export default function Profile() {
  const userInfo = authService.getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    strUsername: "",
    strBusinessName: "",
    strPhone: "",
    strAddress: "",
  });

  const [passwordData, setPasswordData] = useState({
    strPassword: "",
    strConfirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await userService.getMyProfile();
      if (res.data) {
        setProfile(res.data);
        setFormData({
          strUsername: res.data.strUsername || "",
          strBusinessName: res.data.strBusinessName || "",
          strPhone: res.data.strPhone || "",
          strAddress: res.data.strAddress || "",
        });
      }
    } catch (err) {
      // fallback to localStorage
      setProfile({
        strUsername: userInfo?.strUserName || "",
        strEmail: userInfo?.strEmail || "",
        strBusinessName: userInfo?.strBusinessName || "",
      });
      setFormData({
        strUsername: userInfo?.strUserName || "",
        strBusinessName: userInfo?.strBusinessName || "",
        strPhone: "",
        strAddress: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setMessage({ type: "", text: "" });
    setIsSaving(true);

    try {
      const res = await userService.updateProfile({
        intUserId: userInfo?.intUserId,
        ...formData,
      });

      if (res.data) {
        setProfile(res.data);
        // Update localStorage
        const updated = { ...userInfo, strUserName: formData.strUsername, strBusinessName: formData.strBusinessName };
        localStorage.setItem("userInfo", JSON.stringify(updated));
      }
      setMessage({ type: "success", text: "Profile updated" });
      setIsEditing(false);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setMessage({ type: "", text: "" });

    if (!passwordData.strPassword || passwordData.strPassword.length < 8) {
      return setMessage({ type: "error", text: "Password must be at least 8 characters" });
    }
    if (passwordData.strPassword !== passwordData.strConfirmPassword) {
      return setMessage({ type: "error", text: "Passwords do not match" });
    }

    setIsSaving(true);
    try {
      await userService.updateProfile({
        intUserId: userInfo?.intUserId,
        strPassword: passwordData.strPassword,
      });
      setMessage({ type: "success", text: "Password updated" });
      setPasswordData({ strPassword: "", strConfirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update password" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      strUsername: profile?.strUsername || "",
      strBusinessName: profile?.strBusinessName || "",
      strPhone: profile?.strPhone || "",
      strAddress: profile?.strAddress || "",
    });
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Profile</h1>
          <p className="text-sm text-neutral-500">Manage your account details</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Full Name</label>
              <input
                type="text"
                value={formData.strUsername}
                onChange={(e) => setFormData({ ...formData, strUsername: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-neutral-300 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Email</label>
              <input
                type="email"
                value={profile?.strEmail || userInfo?.strEmail || ""}
                disabled
                className="w-full h-10 px-3 text-sm bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Business Name</label>
              <input
                type="text"
                value={formData.strBusinessName}
                onChange={(e) => setFormData({ ...formData, strBusinessName: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-neutral-300 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Phone</label>
              <input
                type="tel"
                value={formData.strPhone}
                onChange={(e) => setFormData({ ...formData, strPhone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Address</label>
              <textarea
                value={formData.strAddress}
                onChange={(e) => setFormData({ ...formData, strAddress: e.target.value })}
                placeholder="Enter business address"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all resize-none"
              />
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-10 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 h-10 text-sm font-medium bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Name</p>
                <p className="text-sm font-medium text-neutral-900">{profile?.strUsername || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Email</p>
                <p className="text-sm font-medium text-neutral-900">{profile?.strEmail || userInfo?.strEmail || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Business Name</p>
                <p className="text-sm font-medium text-neutral-900">{profile?.strBusinessName || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Phone</p>
                <p className="text-sm font-medium text-neutral-900">{profile?.strPhone || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Address</p>
                <p className="text-sm font-medium text-neutral-900">{profile?.strAddress || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="flex items-center gap-3 w-full text-left"
        >
          <Lock className="w-5 h-5 text-neutral-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900">Change Password</p>
            <p className="text-xs text-neutral-500">Update your account password</p>
          </div>
        </button>

        {showPasswordForm && (
          <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={passwordData.strPassword}
              onChange={(e) => setPasswordData({ ...passwordData, strPassword: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordData.strConfirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, strConfirmPassword: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
            />
            <button
              onClick={handlePasswordChange}
              disabled={isSaving}
              className="w-full h-10 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 h-11 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
