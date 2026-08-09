import { Link, useLocation } from "react-router-dom";
import { canAccessModule } from "../services/permissions";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  const items = [
    { to: "/dashboard", label: "📊 Ana Sayfa", key: "reports" },
    { to: "/products", label: "📦 Ürünler", key: "products" },
    { to: "/customers", label: "👥 Müşteriler", key: "customers" },
    { to: "/orders", label: "🛒 Siparişler", key: "sales" },
    { to: "/current-accounts", label: "📒 Cari Hesaplar", key: "accounting" },
    { to: "/cash", label: "💵 Kasa", key: "accounting" },
    { to: "/bank", label: "🏦 Banka", key: "accounting" },
    { to: "/sales", label: "💰 Satışlar", key: "sales" },
    { to: "/accounting", label: "🧾 Ön Muhasebe", key: "accounting" },
    { to: "/invoices/create", label: "🧾 Fatura Oluştur", key: "invoices" },
    { to: "/stock", label: "📋 Stok", key: "inventory" },
    { to: "/reports", label: "📈 Raporlar", key: "reports" },
    { to: "/imports", label: "📥 Excel Aktarım", key: "reports" },
    { to: "/settings", label: "⚙️ Ayarlar", key: "settings" },
  ];

  if (!isOpen) return null;

  return (
    <aside
      style={{
        width: "280px",
        background: "var(--sidebar-bg)",
        color: "var(--sidebar-title)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        boxShadow: "8px 0 24px rgba(7, 17, 31, 0.16)",
        zIndex: 20,
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "1px" }}>BAHADIR AKIN</div>
        <div style={{ fontSize: 11, color: "var(--sidebar-meta)", marginTop: 4 }}>Enterprise Management</div>
      </div>

      <nav style={{ display: "grid", gap: 8 }}>
        {items.map((item) => {
          const allowed = canAccessModule(item.key);
          if (!allowed) return null;
          const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={{
                padding: "12px 14px",
                color: active ? "var(--sidebar-title)" : "var(--sidebar-text)",
                textDecoration: "none",
                borderRadius: 12,
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                border: active ? "1px solid var(--sidebar-active-border)" : "1px solid transparent",
                fontWeight: 600,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: "14px", borderRadius: 14, background: "var(--sidebar-box-bg)", color: "var(--sidebar-text)", fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: "var(--sidebar-title)" }}>İş Akışı</div>
        <div style={{ marginTop: 4 }}>Satış, stok, cari ve raporlar tek veri akışında.</div>
      </div>
    </aside>
  );
}

export default Sidebar;