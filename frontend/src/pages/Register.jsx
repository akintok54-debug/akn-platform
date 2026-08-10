import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    companyName: "",
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setInviteToken(params.get("invite") || "");
  }, [location.search]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = inviteToken
        ? {
            inviteToken,
            name: form.name,
            phone: form.phone,
            email: form.email,
            password: form.password,
          }
        : form;

      const endpoint = inviteToken ? "/auth/invite-register" : "/auth/register";
      const res = await api.post(endpoint, payload);
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

        <h2 style={{ fontSize: 28, marginBottom: 8 }}>{inviteToken ? "Davet ile Kayıt" : "Firma Kaydı"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          {inviteToken ? "Bir firmanın davetlisi olarak sisteme katılın." : "AKN platformunda işletmenizi yönetin."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {!inviteToken && (
            <input type="text" name="companyName" placeholder="Firma Adı" value={form.companyName} onChange={handleChange} required />
          )}
          <input type="text" name="name" placeholder="Yetkili Adı Soyadı" value={form.name} onChange={handleChange} required />
          <input type="text" name="phone" placeholder="Telefon" value={form.phone} onChange={handleChange} required />
          <input type="email" name="email" placeholder="E-posta" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Şifre" value={form.password} onChange={handleChange} required />
          <button type="submit" style={{ padding: "12px 14px", background: "linear-gradient(90deg, #2563eb 0%, #0f172a 100%)", color: "#fff", borderRadius: 12, fontWeight: 700 }}>
            {inviteToken ? "Kaydı Tamamla" : "Firmayı Oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;