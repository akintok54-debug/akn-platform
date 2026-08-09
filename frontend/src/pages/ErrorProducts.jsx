import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ErrorProducts() {
  const navigate = useNavigate();
  const [errors] = useState([
    { id: 1, type: "Barkod Eksik", count: 3 },
    { id: 2, type: "Ürün Kodu Eksik", count: 1 },
    { id: 3, type: "Fiyat Hatalı", count: 2 },
    { id: 4, type: "Resim Erişilemiyor", count: 5 },
    { id: 5, type: "Kategori Bulunamadı", count: 1 },
  ]);

  const btnStyle = {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "4px"
  };

  const cellStyle = { padding: "12px", borderBottom: "1px solid #e5e7eb" };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: "700" }}>⚠️ Hatalı Ürünler</h1>
        <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>Son import işlemindeki hataları gözden geçirin</p>
      </div>

      <div style={{
        background: "#fff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              <th style={cellStyle}>Hata Türü</th>
              <th style={cellStyle}>Ürün Sayısı</th>
              <th style={cellStyle}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error) => (
              <tr key={error.id}>
                <td style={cellStyle}>{error.type}</td>
                <td style={cellStyle}>{error.count}</td>
                <td style={cellStyle}>
                  <button style={{...btnStyle, background: "#3b82f6", color: "#fff"}}>
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => navigate("/products")} style={{...btnStyle, background: "#6b7280", color: "#fff"}}>
          ← Geri Dön
        </button>
      </div>
    </div>
  );
}

export default ErrorProducts;
