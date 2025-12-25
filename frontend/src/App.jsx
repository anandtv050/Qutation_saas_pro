import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewQuotation from "./pages/NewQuotation";
import NewInvoice from "./pages/NewInvoice";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import MainLayout from "./components/layout/MainLayout";

function App() {
  // Check if user is logged in
  const isAuthenticated = () => {
    return localStorage.getItem("access_token") !== null;
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/" replace />;
    }
    return children;
  };
  //  when broser path change , then corresponding move to each page dynamically here
  //  the path => taken from browser 
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

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
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
