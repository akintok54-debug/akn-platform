import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function BrandManager() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get("/products/center/brands");
      setBrands(res.data?.data || []);
    } catch (error) {
      console.error("Markalar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const addBrand = async () => {
    if (!newBrand.trim()) {
      alert("Marka adı boş olamaz.");
      return;
    }

    try {
      await api.post("/products/center/bulk-field", {
        productIds: [],
        field: "brand",
        value: newBrand
      });
      alert("✓ Marka eklendi.");
      setNewBrand("");
      fetchBrands();
    } catch (error) {
      console.error("Marka eklenemedi:", error);
    }
  };

  const btnStyle = {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "4px"
  };

  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    width: "100%",
    marginBottom: "12px"
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: "700" }}>🎯 Marka Yönetimi</h1>
        <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>Mevcut markaları yönetin</p>
      </div>

      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: "700" }}>Yeni Marka Ekle</h3>
        <input
          type="text"
          placeholder="Marka adı..."
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addBrand} style={{...btnStyle, background: "#10b981", color: "#fff"}}>
          + Ekle
        </button>
      </div>

      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: "700" }}>Mevcut Markalar ({brands.length})</h3>
        {loading ? (
          <div style={{ color: "#64748b" }}>⏳ Yükleniyor...</div>
        ) : brands.length === 0 ? (
          <div style={{ color: "#64748b" }}>Marka bulunamadı.</div>
        ) : (
          <ul style={{ margin: "0", padding: "0", listStyle: "none" }}>
            {brands.map((brand, idx) => (
              <li key={idx} style={{
                padding: "8px 12px",
                background: "#f9f9f9",
                borderRadius: "4px",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                {brand}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button onClick={() => navigate("/products")} style={{...btnStyle, background: "#6b7280", color: "#fff"}}>
          ← Geri Dön
        </button>
      </div>
    </div>
  );
}

export default BrandManager;
