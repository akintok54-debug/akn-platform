import { Link, useLocation, useNavigate } from "react-router-dom";
import { canAccessModule, clearStoredAuth, getStoredUser, isAuthenticated } from "../services/permissions";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const user = getStoredUser() || {};
  const companyName = user.companyName || user.company?.companyName || user.company?.name || "Firma";
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const items = [
    { to: "/dashboard", label: "📊 Ana Sayfa", key: "reports" },
    { to: "/products", label: "📦 Ürünler", key: "products" },
    { to: "/customers", label: "👥 Müşteriler", key: "customers" },
    { to: "/suppliers", label: "🏭 Tedarikçiler", key: "suppliers" },
    { to: "/orders", label: "🛒 Siparişler", key: "sales" },
    { to: "/sales", label: "💰 Satışlar", key: "sales" },
    { to: "/invoices", label: "🧾 Faturalar", key: "invoices" },
    { to: "/current-accounts", label: "📒 Cari Hesaplar", key: "accounting" },
    { to: "/cash", label: "💵 Kasa", key: "accounting" },
    { to: "/bank", label: "🏦 Banka", key: "accounting" },
    { to: "/accounting", label: "🧾 Ön Muhasebe", key: "accounting" },
    { to: "/stock", label: "📋 Stok", key: "inventory" },
    { to: "/reports", label: "📈 Raporlar", key: "reports" },
    { to: "/imports", label: "📥 Excel Aktarım", key: "reports" },
    { to: "/super-admin", label: "🛡️ Super Admin", key: "settings", onlySuperAdmin: true },
    { to: "/settings", label: "👤 Kullanıcı / Yetki", key: "settings" },
    { to: "/settings", label: "⚙️ Ayarlar", key: "settings" },
  ];

  const handleLogout = () => {
    clearStoredAuth();
    onClose?.();
    navigate("/login", { replace: true });
  };

  if (!isOpen) return null;

  return (
    <aside
      className="app-sidebar"
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
      <div className="sidebar-top" style={{ marginBottom: 20 }}>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Kapat">×</button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "1px" }}>AKN</div>
        <div style={{ fontSize: 11, color: "var(--sidebar-meta)", marginTop: 4 }}>İş Yönetimi</div>
      </div>

      <nav style={{ display: "grid", gap: 8 }}>
        {!authenticated ? (
          <Link
            to="/login"
            onClick={onClose}
            style={{
              padding: "12px 14px",
              color: "var(--sidebar-title)",
              textDecoration: "none",
              borderRadius: 12,
              background: "var(--sidebar-active-bg)",
              border: "1px solid var(--sidebar-active-border)",
              fontWeight: 700,
            }}
          >
            🔐 Giriş Yap
          </Link>
        ) : null}
        {items.map((item) => {
          if (item.onlySuperAdmin && !isSuperAdmin) return null;
          const allowed = canAccessModule(item.key);
          if (!allowed) return null;
          const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={`${item.to}-${item.label}`}
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

      {authenticated ? (
        <div className="sidebar-auth-panel" style={{ marginTop: 16, padding: "14px", borderRadius: 14, background: "var(--sidebar-box-bg)", color: "var(--sidebar-text)" }}>
          <div style={{ fontWeight: 700, color: "var(--sidebar-title)" }}>{user.name || "Kullanıcı"}</div>
          <div style={{ marginTop: 4, fontSize: 13 }}>{companyName}</div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Çıkış Yap
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: "auto", padding: "14px", borderRadius: 14, background: "var(--sidebar-box-bg)", color: "var(--sidebar-text)", fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: "var(--sidebar-title)" }}>İş Akışı</div>
        <div style={{ marginTop: 4 }}>Satış, stok, cari ve raporlar tek veri akışında.</div>
      </div>
    </aside>
  );
}

export default Sidebar;