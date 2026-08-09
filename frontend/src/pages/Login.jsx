import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { setStoredPermissions } from "../services/permissions";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const profile = res.data?.user?.permissionProfileId;
      if (profile) {
        try {
          const profileRes = await api.get(`/permissions`);
          const selected = (profileRes?.data?.profiles || []).find((item) => item._id === profile);
          if (selected) {
            setStoredPermissions(selected.permissions || {});
          }
        } catch (error) {
          console.error(error);
        }
      }

      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "E-posta veya şifre hatalı.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #07111f 0%, #17324e 100%)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "rgba(255,255,255,0.96)", borderRadius: 24, padding: 28, boxShadow: "0 24px 60px rgba(7, 17, 31, 0.22)" }}>

        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Bahadır Akın Enterprise</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>Muhasebe ve operasyon yönetimi platformuna giriş yapın.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input type="email" name="email" placeholder="E-posta" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Şifre" value={form.password} onChange={handleChange} required />
          <button type="submit" style={{ padding: "12px 14px", background: "linear-gradient(90deg, #2563eb 0%, #0f172a 100%)", color: "#fff", borderRadius: 12, fontWeight: 700 }}>
            Giriş Yap
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link to="/register" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 700 }}>
            Firma Oluştur
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;