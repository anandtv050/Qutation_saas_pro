import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Subscribe from "./pages/Subscribe";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NewQuotation from "./pages/NewQuotation";
import NewInvoice from "./pages/NewInvoice";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import AdminDashboard from "./pages/AdminDashboard";
import WarrantyCertificate from "./pages/WarrantyCertificate";
import PrintModelSettings from "./pages/PrintModelSettings";
import PlanManagement from "./pages/PlanManagement";
import ServiceManagement from "./pages/ServiceManagement";
import ModuleManagement from "./pages/ModuleManagement";
import MainLayout from "./components/layout/MainLayout";
import NoPermission from "./components/NoPermission";
import { usePermissions } from "./contexts/PermissionsContext";

function App() {
  // Check if user is logged in
  const isAuthenticated = () => {
    return localStorage.getItem("access_token") !== null;
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // Admin Route wrapper
  const AdminRoute = ({ children }) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userInfo.intUserId !== 1) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  // Module Route wrapper — blocks access if user's plan/override doesn't allow the module.
  // Admin (user_id=1) bypasses. Unauthorized users see the NoPermission page (not a silent redirect).
  const ModuleRoute = ({ moduleKey, children }) => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    if (userInfo.intUserId === 1) return children; // admin bypass
    const { permissions, isLoading } = usePermissions();
    if (isLoading) return null; // wait for permissions to load
    if (!permissions?.lstModules?.includes(moduleKey)) {
      return <NoPermission moduleKey={moduleKey} />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quotations/new" element={<ModuleRoute moduleKey="quotation"><NewQuotation /></ModuleRoute>} />
          <Route path="/quotations/edit/:id" element={<ModuleRoute moduleKey="quotation"><NewQuotation /></ModuleRoute>} />
          <Route path="/invoices/new" element={<ModuleRoute moduleKey="invoice"><NewInvoice /></ModuleRoute>} />
          <Route path="/invoices/view/:id" element={<ModuleRoute moduleKey="invoice"><NewInvoice /></ModuleRoute>} />
          <Route path="/warranty" element={<ModuleRoute moduleKey="warranty"><WarrantyCertificate /></ModuleRoute>} />
          <Route path="/inventory" element={<ModuleRoute moduleKey="inventory"><Inventory /></ModuleRoute>} />
          <Route path="/reports" element={<ModuleRoute moduleKey="reports"><Reports /></ModuleRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/print-settings" element={<ModuleRoute moduleKey="print_settings"><PrintModelSettings /></ModuleRoute>} />
          <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/plans" element={<AdminRoute><PlanManagement /></AdminRoute>} />
          <Route path="/services" element={<AdminRoute><ServiceManagement /></AdminRoute>} />
          <Route path="/modules" element={<AdminRoute><ModuleManagement /></AdminRoute>} />
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
