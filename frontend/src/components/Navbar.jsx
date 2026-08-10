import { Link, useNavigate } from "react-router-dom";
import { clearStoredAuth, getStoredUser, isAuthenticated } from "../services/permissions";
import api from "../services/api";

function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const user = getStoredUser() || {};
  const companyName = user.companyName || user.company?.companyName || user.company?.name || "Firma";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(error);
    } finally {
      clearStoredAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <header
      style={{
        height: "72px",
        background: "var(--navbar-bg)",
        backdropFilter: "blur(12px)",
        color: "var(--text-strong)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid var(--navbar-border)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
        <div className="navbar-brand" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuClick}
          aria-label="Menü"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#0f172a",
            color: "#fff",
            fontSize: 18,
          }}
        >☰</button>
        <div className="navbar-brand-text">
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "1px" }}>AKN</div>
          <div style={{ fontSize: 10, color: "var(--navbar-muted)", marginTop: 2 }}>İş Yönetimi</div>
        </div>
      </div>

      <div className="navbar-user" style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 12 }}>
        {authenticated ? (
          <>
            <div>
              <div style={{ fontWeight: 700 }}>{user.name || "Kullanıcı"}</div>
              <div style={{ fontSize: 13, color: "var(--navbar-muted)" }}>{companyName}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "#0f172a",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Çıkış Yap
            </button>
          </>
        ) : (
          <Link
            to="/login"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;