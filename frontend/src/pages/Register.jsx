import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    name: "",
    phone: "",
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
      const res = await api.post("/auth/register", form);
      alert(res.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || "Bir hata oluştu");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #07111f 0%, #17324e 100%)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.96)", borderRadius: 24, padding: 28, boxShadow: "0 24px 60px rgba(7, 17, 31, 0.22)" }}>

        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Firma Kaydı</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>Kurumsal ERP'nizi bugün kurmaya başlayın.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input type="text" name="companyName" placeholder="Firma Adı" value={form.companyName} onChange={handleChange} required />
          <input type="text" name="name" placeholder="Yetkili Adı Soyadı" value={form.name} onChange={handleChange} required />
          <input type="text" name="phone" placeholder="Telefon" value={form.phone} onChange={handleChange} required />
          <input type="email" name="email" placeholder="E-posta" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Şifre" value={form.password} onChange={handleChange} required />
          <button type="submit" style={{ padding: "12px 14px", background: "linear-gradient(90deg, #2563eb 0%, #0f172a 100%)", color: "#fff", borderRadius: 12, fontWeight: 700 }}>
            Firmayı Oluştur
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;