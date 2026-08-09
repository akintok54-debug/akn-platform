import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { canAccessModule } from "./services/permissions";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Customers from "./pages/customers";
import CustomerDetail from "./pages/CustomerDetail"; // <-- Müşteri Detay sayfası eklendi
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Orders from "./pages/Orders";
import Cash from "./pages/Cash";
import Bank from "./pages/Bank";
import CurrentAccounts from "./pages/CurrentAccounts";
import Sales from "./pages/Sales";
import Accounting from "./pages/Accounting";
import InvoiceCreate from "./pages/InvoiceCreate";
import Reports from "./pages/Reports";
import DailySales from "./pages/DailySales";
import ImportCenter from "./pages/ImportCenter";
import SalesReport from "./pages/SalesReport";
import CustomersReport from "./pages/CustomersReport";
import OrdersReport from "./pages/OrdersReport";
import StockReport from "./pages/StockReport";
import CollectionsReport from "./pages/CollectionsReport";
import ReturnsReport from "./pages/ReturnsReport";
import ProductsReport from "./pages/ProductsReport";
import AuditReport from "./pages/AuditReport";
import DealerLogin from "./pages/DealerLogin";
import DealerPortal from "./pages/DealerPortal";
import DealerSelfServicePortal from "./pages/DealerSelfServicePortal";

const AVAILABLE_THEMES = ["light", "dark", "ocean", "corporate"];

const resolveTheme = (theme) => (AVAILABLE_THEMES.includes(theme) ? theme : "light");

const applyTheme = (theme) => {
  const nextTheme = resolveTheme(theme);
  document.body.setAttribute("data-theme", nextTheme);
  document.documentElement.setAttribute("data-theme", nextTheme);
};

function ProtectedRoute({ moduleName, element }) {
  if (!canAccessModule(moduleName)) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

function DealerProtectedRoute({ element }) {
  const token = localStorage.getItem("dealerToken") || sessionStorage.getItem("dealerToken");
  if (!token) {
    return <Navigate to="/dealer/login" replace />;
  }
  return element;
}

function App() {
  useEffect(() => {
    const syncThemeFromCompany = () => {
      try {
        const company = JSON.parse(localStorage.getItem("company") || "{}");
        applyTheme(company?.theme);
      } catch {
        applyTheme("light");
      }
    };

    syncThemeFromCompany();
    window.addEventListener("storage", syncThemeFromCompany);
    window.addEventListener("company-settings-updated", syncThemeFromCompany);

    return () => {
      window.removeEventListener("storage", syncThemeFromCompany);
      window.removeEventListener("company-settings-updated", syncThemeFromCompany);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Ana Sayfa - Direkt Login sayfasına yönlendir */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Kimlik */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dealer/login" element={<DealerLogin />} />
        <Route path="/dealer" element={<DealerProtectedRoute element={<DealerPortal />} />} />
        <Route path="/bayi/:secureToken" element={<DealerSelfServicePortal />} />

        {/* ERP / Yönetim Paneli */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />

        {/* Modüller */}
        <Route path="/customers" element={<ProtectedRoute moduleName="customers" element={<Customers />} />} />
        <Route path="/customers/:id" element={<ProtectedRoute moduleName="customers" element={<CustomerDetail />} />} />
        <Route path="/products" element={<ProtectedRoute moduleName="products" element={<Products />} />} />
        <Route path="/stock" element={<ProtectedRoute moduleName="inventory" element={<Stock />} />} />
        <Route path="/orders" element={<ProtectedRoute moduleName="sales" element={<Orders />} />} />
        <Route path="/cash" element={<ProtectedRoute moduleName="accounting" element={<Cash />} />} />
        <Route path="/bank" element={<ProtectedRoute moduleName="accounting" element={<Bank />} />} />
        <Route path="/current-accounts" element={<ProtectedRoute moduleName="accounting" element={<CurrentAccounts />} />} />
        <Route path="/sales" element={<ProtectedRoute moduleName="sales" element={<Sales />} />} />
        <Route path="/accounting" element={<ProtectedRoute moduleName="accounting" element={<Accounting />} />} />
        <Route path="/invoices/create" element={<ProtectedRoute moduleName="invoices" element={<InvoiceCreate />} />} />
        <Route path="/reports" element={<ProtectedRoute moduleName="reports" element={<Reports />} />} />
        <Route path="/reports/sales" element={<ProtectedRoute moduleName="reports" element={<SalesReport />} />} />
        <Route path="/reports/customers" element={<ProtectedRoute moduleName="reports" element={<CustomersReport />} />} />
        <Route path="/reports/orders" element={<ProtectedRoute moduleName="reports" element={<OrdersReport />} />} />
        <Route path="/reports/stock" element={<ProtectedRoute moduleName="reports" element={<StockReport />} />} />
        <Route path="/reports/collections" element={<ProtectedRoute moduleName="reports" element={<CollectionsReport />} />} />
        <Route path="/reports/returns" element={<ProtectedRoute moduleName="reports" element={<ReturnsReport />} />} />
        <Route path="/reports/products" element={<ProtectedRoute moduleName="reports" element={<ProductsReport />} />} />
        <Route path="/reports/audit" element={<ProtectedRoute moduleName="reports" element={<AuditReport />} />} />
        <Route path="/imports" element={<ProtectedRoute moduleName="reports" element={<ImportCenter />} />} />
        <Route path="/daily-sales" element={<ProtectedRoute moduleName="reports" element={<DailySales />} />} />

        {/* 404 */}
        <Route path="*" element={<h2>404 - Sayfa Bulunamadı</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;