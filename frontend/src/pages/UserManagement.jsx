import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Users, Trash2, X, Loader2, AlertCircle, CheckCircle, Shield, Mail, Phone, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import userService from "@/services/userService";

export default function UserManagement() {
  const navigate = useNavigate();

  // Check if user is admin (pk=1)
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isAdmin = userInfo.intUserId === 1;

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // State
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  // Show toast notification
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: "", message: "" }), 4000);
  };

  // Form state
  const [formData, setFormData] = useState({
    strEmail: "",
    strPassword: "",
    strUsername: "",
    strBusinessName: "",
    strPhone: "",
    strAddress: ""
  });

  // Fetch users on mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await userService.getList();

      if (response.intStatus === 1) {
        setUsers(response.lstUsers || []);
      } else if (response.intStatus === -1) {
        setUsers([]);
      } else {
        setError(response.strMessage || "Failed to fetch users");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.strEmail.toLowerCase().includes(query) ||
      user.strUsername.toLowerCase().includes(query) ||
      (user.strBusinessName && user.strBusinessName.toLowerCase().includes(query))
    );
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      strEmail: "",
      strPassword: "",
      strUsername: "",
      strBusinessName: "",
      strPhone: "",
      strAddress: ""
    });
    setModalError("");
  };

  // Handle Add
  const handleAdd = async () => {
    if (!formData.strEmail || !formData.strPassword || !formData.strUsername) {
      setModalError("Email, Password, and Username are required");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.strEmail)) {
      setModalError("Please enter a valid email address");
      return;
    }

    // Password length validation
    if (formData.strPassword.length < 6) {
      setModalError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      const response = await userService.add(formData);

      if (response.intStatus === 1) {
        await fetchUsers();
        setShowAddModal(false);
        resetForm();
        showToast("success", "User created successfully!");
      } else {
        setModalError(response.strMessage || "Failed to create user");
        showToast("error", response.strMessage || "Failed to create user");
      }
    } catch (err) {
      setModalError(err.message);
      showToast("error", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Click
  const handleDeleteClick = (user) => {
    // Prevent deleting admin
    if (user.intPkUserId === 1) {
      showToast("error", "Cannot delete admin user");
      return;
    }
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    try {
      setIsSaving(true);
      setModalError("");
      const response = await userService.delete(selectedUser.intPkUserId);

      if (response.intStatus === 1) {
        await fetchUsers();
        setShowDeleteModal(false);
        setSelectedUser(null);
        showToast("success", "User deleted successfully!");
      } else {
        setModalError(response.strMessage || "Failed to delete user");
        showToast("error", response.strMessage || "Failed to delete user");
      }
    } catch (err) {
      setModalError(err.message);
      showToast("error", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // If not admin, show nothing (will redirect)
  if (!isAdmin) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Loading users...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchUsers} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">User Management</h1>
            <p className="text-sm text-neutral-500">{users.length} users</p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by email, name, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-neutral-200"
          />
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="font-medium text-neutral-900 mb-1">No users found</h3>
          <p className="text-sm text-neutral-500">
            {searchQuery ? "Try a different search" : "Add your first user"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500 uppercase">
            <div className="col-span-1">ID</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Username</div>
            <div className="col-span-3">Business Name</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Users */}
          {filteredUsers.map((user, index) => {
            const isAdminUser = user.intPkUserId === 1;
            return (
              <div
                key={user.intPkUserId}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-neutral-50 ${
                  index !== filteredUsers.length - 1 ? "border-b border-neutral-100" : ""
                } ${isAdminUser ? "bg-purple-50/50" : ""}`}
              >
                {/* Mobile View */}
                <div className="col-span-12 lg:hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {isAdminUser && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          Admin
                        </span>
                      )}
                      <p className="font-medium text-neutral-900">{user.strUsername}</p>
                    </div>
                    {!isAdminUser && (
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-neutral-500">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.strEmail}</span>
                    </div>
                    {user.strBusinessName && (
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5" />
                        <span>{user.strBusinessName}</span>
                      </div>
                    )}
                    {user.strPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{user.strPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden lg:flex col-span-1 items-center gap-2">
                  <span className="text-sm text-neutral-500">#{user.intPkUserId}</span>
                  {isAdminUser && (
                    <Shield className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <div className="hidden lg:block col-span-3 text-sm text-neutral-900">
                  {user.strEmail}
                </div>
                <div className="hidden lg:block col-span-2 font-medium text-neutral-900">
                  {user.strUsername}
                </div>
                <div className="hidden lg:block col-span-3 text-sm text-neutral-600">
                  {user.strBusinessName || "-"}
                </div>
                <div className="hidden lg:block col-span-2 text-sm text-neutral-600">
                  {user.strPhone || "-"}
                </div>
                <div className="hidden lg:flex col-span-1 justify-end gap-1">
                  {!isAdminUser ? (
                    <button
                      onClick={() => handleDeleteClick(user)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {searchQuery && filteredUsers.length > 0 && (
        <p className="text-sm text-neutral-500 mt-3">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-neutral-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {modalError}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Email *</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  className="h-10"
                  value={formData.strEmail}
                  onChange={(e) => setFormData({...formData, strEmail: e.target.value})}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Password *</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="h-10"
                  value={formData.strPassword}
                  onChange={(e) => setFormData({...formData, strPassword: e.target.value})}
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Username *</label>
                <Input
                  placeholder="Full name"
                  className="h-10"
                  value={formData.strUsername}
                  onChange={(e) => setFormData({...formData, strUsername: e.target.value})}
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Business Name <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <Input
                  placeholder="Company or business name"
                  className="h-10"
                  value={formData.strBusinessName}
                  onChange={(e) => setFormData({...formData, strBusinessName: e.target.value})}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Phone <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  className="h-10"
                  value={formData.strPhone}
                  onChange={(e) => setFormData({...formData, strPhone: e.target.value})}
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Address <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Business address"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={2}
                  value={formData.strAddress}
                  onChange={(e) => setFormData({...formData, strAddress: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t bg-neutral-50 sticky bottom-0">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                onClick={handleAdd}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Delete User?</h3>
              <p className="text-sm text-neutral-500 mb-1">
                Are you sure you want to delete
              </p>
              <p className="font-medium text-neutral-900 mb-1">
                {selectedUser?.strUsername}
              </p>
              <p className="text-sm text-neutral-500 mb-4">
                ({selectedUser?.strEmail})
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                This will delete all their data including quotations and invoices
              </p>
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mt-4">
                  {modalError}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t bg-neutral-50">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); setModalError(""); }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirm}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, type: "", message: "" })}
            className="ml-2 p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
