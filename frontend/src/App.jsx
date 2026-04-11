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
          <Route path="/quotations/new" element={<NewQuotation />} />
          <Route path="/quotations/edit/:id" element={<NewQuotation />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/invoices/view/:id" element={<NewInvoice />} />
          <Route path="/warranty" element={<WarrantyCertificate />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/print-settings" element={<PrintModelSettings />} />
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
