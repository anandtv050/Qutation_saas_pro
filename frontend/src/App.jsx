import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MARKETING_ROUTES, NOT_FOUND_ELEMENT } from "./marketing/publicRoutes";
import NoPermission from "./components/NoPermission";
import { usePermissions } from "./contexts/PermissionsContext";

// Marketing pages above are bundled eagerly so prerendered HTML hydrates without a
// Suspense mismatch. App pages load on demand; each gets its own Suspense boundary.
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
  </div>
);

const lazyPage = (importer) => {
  const Page = lazy(importer);
  return function LazyPage(props) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Page {...props} />
      </Suspense>
    );
  };
};

const Login = lazyPage(() => import("./pages/Login"));
const Signup = lazyPage(() => import("./pages/Signup"));
const Subscribe = lazyPage(() => import("./pages/Subscribe"));
const ForgotPassword = lazyPage(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const NewQuotation = lazyPage(() => import("./pages/NewQuotation"));
const NewInvoice = lazyPage(() => import("./pages/NewInvoice"));
const Inventory = lazyPage(() => import("./pages/Inventory"));
const Reports = lazyPage(() => import("./pages/Reports"));
const Profile = lazyPage(() => import("./pages/Profile"));
const UserManagement = lazyPage(() => import("./pages/UserManagement"));
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard"));
const WarrantyCertificate = lazyPage(() => import("./pages/WarrantyCertificate"));
const AdvanceReceipt = lazyPage(() => import("./pages/AdvanceReceipt"));
const PrintModelSettings = lazyPage(() => import("./pages/PrintModelSettings"));
const PlanManagement = lazyPage(() => import("./pages/PlanManagement"));
const ServiceManagement = lazyPage(() => import("./pages/ServiceManagement"));
const ModuleManagement = lazyPage(() => import("./pages/ModuleManagement"));
const MainLayout = lazyPage(() => import("./components/layout/MainLayout"));

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
      <Routes>
        {/* Public marketing routes (prerendered at build time) */}
        {MARKETING_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}

        {/* Public Routes */}
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
          <Route path="/advance-receipts" element={<ModuleRoute moduleKey="advance_receipt"><AdvanceReceipt /></ModuleRoute>} />
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

        {/* Unknown routes: real 404 page */}
        <Route path="*" element={NOT_FOUND_ELEMENT} />
      </Routes>
  );
}

export default App;
