import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dealerApi from "../services/dealerApi";

function DealerLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ userName: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const company = (() => {
    try {
      return JSON.parse(localStorage.getItem("company") || "{}");
    } catch {
      return {};
    }
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await dealerApi.post("/auth/login", form);
      const tokenStore = rememberMe ? localStorage : sessionStorage;
      tokenStore.setItem("dealerToken", response.data.token);
      localStorage.setItem("dealerUser", JSON.stringify(response.data.user));
      localStorage.setItem("dealerCompanyName", response.data.companyName || "Bayi");
      if (!rememberMe) {
        localStorage.removeItem("dealerToken");
      }
      navigate("/dealer");
    } catch (error) {
      alert(error?.response?.data?.message || "Giris yapilamadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background:
          "radial-gradient(circle at 10% 10%, rgba(14,165,233,0.12) 0%, rgba(248,250,252,1) 30%), linear-gradient(150deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #dbe3ef",
          boxShadow: "0 24px 48px rgba(15,23,42,0.08)",
          padding: 24,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          {company?.logo ? (
            <img src={company.logo} alt="Firma Logosu" style={{ width: 66, height: 66, objectFit: "contain", marginTop: 10 }} />
          ) : null}
          <h2 style={{ marginTop: 8, marginBottom: 6 }}>Bayi Portali Giris</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Kullanici adi ve sifreniz ile giris yapin.</p>
        </div>

        <input
          name="userName"
          value={form.userName}
          onChange={handleChange}
          placeholder="Kullanici adi"
          required
          style={inputStyle}
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Sifre"
          required
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#334155" }}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Beni Hatirla
          </label>
          <button
            type="button"
            onClick={() => alert("Sifre sifirlama icin sistem yoneticinizle iletisime gecin.")}
            style={{ border: "none", background: "transparent", color: "#0369a1", fontWeight: 700, cursor: "pointer" }}
          >
            Sifremi Unuttum
          </button>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Giris yapiliyor..." : "Giris Yap"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 15,
};

const buttonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontWeight: 700,
  background: "linear-gradient(135deg, #0369a1 0%, #0f172a 100%)",
  cursor: "pointer",
};

export default DealerLogin;
