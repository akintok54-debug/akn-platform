function Navbar({ onMenuClick }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuClick}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#0f172a",
            color: "#fff",
            fontSize: 18,
          }}
        >☰</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "1px" }}>BAHADIR AKIN</div>
          <div style={{ fontSize: 10, color: "var(--navbar-muted)", marginTop: 2 }}>Enterprise Management System</div>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700 }}>{user.name || "Kullanıcı"}</div>
        <div style={{ fontSize: 13, color: "var(--navbar-muted)" }}>{user.companyName || "Firma"}</div>
      </div>
    </header>
  );
}

export default Navbar;