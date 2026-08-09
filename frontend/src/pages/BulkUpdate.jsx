import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

function BulkUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const { productIds = [] } = state;

  const [updateType, setUpdateType] = useState("price"); // price, stock, field
  const [formData, setFormData] = useState({
    newPrice: "",
    priceType: "set", // set, add, subtract, percentage
    newStock: "",
    stockOperation: "set", // set, add, subtract
    fieldName: "category",
    fieldValue: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpdate = async () => {
    if (productIds.length === 0) {
      alert("Ürün seçimi bulunamadı.");
      return;
    }

    if (!formData.newPrice && !formData.newStock && !formData.fieldValue) {
      alert("Lütfen güncelleme değeri girin.");
      return;
    }

    try {
      setLoading(true);

      let response;
      if (updateType === "price") {
        response = await api.post("/products/center/bulk-price", {
          productIds,
          salePrice: parseFloat(formData.newPrice)
        });
      } else if (updateType === "stock") {
        response = await api.post("/products/center/bulk-stock", {
          productIds,
          stock: parseInt(formData.newStock),
          operation: formData.stockOperation
        });
      } else if (updateType === "field") {
        response = await api.post("/products/center/bulk-field", {
          productIds,
          field: formData.fieldName,
          value: formData.fieldValue
        });
      }

      setResult(response.data);
      setTimeout(() => navigate("/products"), 1500);
    } catch (error) {
      alert("Güncelleme sırasında hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "8px",
    transition: "all 0.2s"
  };

  const primaryBtn = { ...btnStyle, background: "#3b82f6", color: "#fff" };
  const successBtn = { ...btnStyle, background: "#10b981", color: "#fff" };
  const secondaryBtn = { ...btnStyle, background: "#6b7280", color: "#fff" };

  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    marginTop: "4px",
    width: "100%"
  };

  const labelStyle = {
    display: "block",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "8px",
    fontSize: "14px"
  };

  const tabStyle = (isActive) => ({
    padding: "10px 16px",
    border: "none",
    background: isActive ? "#3b82f6" : "#e5e7eb",
    color: isActive ? "#fff" : "#1f2937",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginRight: "8px"
  });

  if (result) {
    return (
      <div style={{ maxWidth: "600px", margin: "100px auto", textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ margin: "0 0 8px", color: "#10b981", fontSize: "20px" }}>Başarılı!</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b" }}>{result.message}</p>
        <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#999" }}>
          Ürün listesine yönlendiriliyorsunuz...
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: "700" }}>Toplu Güncelleme</h1>
        <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
          📦 {productIds.length} ürün seçildi
        </p>
      </div>

      {/* Tab'lar */}
      <div style={{
        background: "#fff",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <button style={tabStyle(updateType === "price")} onClick={() => setUpdateType("price")}>
          💰 Fiyat Güncelle
        </button>
        <button style={tabStyle(updateType === "stock")} onClick={() => setUpdateType("stock")}>
          📦 Stok Güncelle
        </button>
        <button style={tabStyle(updateType === "field")} onClick={() => setUpdateType("field")}>
          🏷️ Kategori/Marka
        </button>
      </div>

      {/* FİYAT GÜNCELLEME */}
      {updateType === "price" && (
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <label style={labelStyle}>Yeni Fiyat (₺)</label>
          <input
            type="number"
            placeholder="1250.50"
            value={formData.newPrice}
            onChange={(e) => setFormData({ ...formData, newPrice: e.target.value })}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: "16px" }}>İşlem Türü</label>
          <select
            value={formData.priceType}
            onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
            style={inputStyle}
          >
            <option value="set">Fiyatı Koy (Değiştir)</option>
            <option value="add">Fiyata Ekle</option>
            <option value="subtract">Fiyattan Çıkar</option>
            <option value="percentage">Yüzde Uygula (%)</option>
          </select>

          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#f0f9ff",
            border: "1px solid #93c5fd",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#0369a1"
          }}>
            ℹ️ Seçili {productIds.length} ürünün fiyatı güncellencektir.
          </div>
        </div>
      )}

      {/* STOK GÜNCELLEME */}
      {updateType === "stock" && (
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <label style={labelStyle}>Stok Miktarı</label>
          <input
            type="number"
            placeholder="100"
            value={formData.newStock}
            onChange={(e) => setFormData({ ...formData, newStock: e.target.value })}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: "16px" }}>İşlem Türü</label>
          <select
            value={formData.stockOperation}
            onChange={(e) => setFormData({ ...formData, stockOperation: e.target.value })}
            style={inputStyle}
          >
            <option value="set">Stok Miktarını Koy</option>
            <option value="add">Stok Ekle</option>
            <option value="subtract">Stok Çıkar</option>
          </select>

          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#166534"
          }}>
            ℹ️ Seçili {productIds.length} ürünün stok bilgisi güncellencektir.
          </div>
        </div>
      )}

      {/* ALAN GÜNCELLEME */}
      {updateType === "field" && (
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <label style={labelStyle}>Güncellenecek Alan</label>
          <select
            value={formData.fieldName}
            onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
            style={inputStyle}
          >
            <option value="category">Kategori</option>
            <option value="brand">Marka</option>
            <option value="active">Durum</option>
            <option value="minStock">Minimum Stok</option>
          </select>

          <label style={{ ...labelStyle, marginTop: "16px" }}>
            {formData.fieldName === "active" ? "Durum" : "Değer"}
          </label>

          {formData.fieldName === "active" ? (
            <select
              value={formData.fieldValue}
              onChange={(e) => setFormData({ ...formData, fieldValue: e.target.value })}
              style={inputStyle}
            >
              <option value="">Seçin...</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          ) : (
            <input
              type={formData.fieldName === "minStock" ? "number" : "text"}
              placeholder={`Yeni ${formData.fieldName} değeri...`}
              value={formData.fieldValue}
              onChange={(e) => setFormData({ ...formData, fieldValue: e.target.value })}
              style={inputStyle}
            />
          )}

          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#92400e"
          }}>
            ⚠️ Seçili {productIds.length} ürünün <strong>{formData.fieldName}</strong> alanı güncellenecektir.
          </div>
        </div>
      )}

      {/* Butonlar */}
      <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
        <button onClick={handleUpdate} disabled={loading} style={successBtn}>
          {loading ? "⏳ İşleniyor..." : "✓ Güncelle"}
        </button>
        <button onClick={() => navigate("/products")} style={secondaryBtn}>
          ✕ İptal
        </button>
      </div>
    </div>
  );
}

export default BulkUpdate;
