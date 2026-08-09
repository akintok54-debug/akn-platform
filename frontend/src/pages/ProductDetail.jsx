import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.data);
      setFormData(res.data.data);
    } catch (error) {
      console.error("Ürün yüklenemedi:", error);
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/products/${id}`, formData);
      setProduct(formData);
      setEditing(false);
      alert("✓ Ürün güncellenmiştir.");
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      alert("Güncelleme sırasında hata oluştu.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    try {
      await api.delete(`/products/${id}`);
      alert("✓ Ürün silindi.");
      navigate("/products");
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Silme sırasında hata oluştu.");
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
  const dangerBtn = { ...btnStyle, background: "#ef4444", color: "#fff" };
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
    marginBottom: "4px",
    fontSize: "14px"
  };

  const fieldContainerStyle = {
    marginBottom: "16px"
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>⏳ Yükleniyor...</div>;
  }

  if (!product) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>⚠️ Ürün bulunamadı.</div>;
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: "700" }}>{product.name}</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            SKU: {product.sku} • Barkod: {product.barcode}
          </p>
        </div>
        <div>
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} style={primaryBtn}>✏️ Düzenle</button>
              <button onClick={handleDelete} style={dangerBtn}>🗑️ Sil</button>
            </>
          )}
        </div>
      </div>

      {/* Resim + Temel Bilgiler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Resim */}
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          {product.image ? (
            <img src={product.image} alt="" style={{
              width: "100%",
              height: "auto",
              maxHeight: "400px",
              objectFit: "contain",
              borderRadius: "6px"
            }} />
          ) : (
            <div style={{
              width: "100%",
              height: "300px",
              background: "#f0f0f0",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "14px"
            }}>
              Resim Yok
            </div>
          )}
          {product.images?.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {product.images.map((img, idx) => (
                <img key={idx} src={img} alt="" style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  cursor: "pointer"
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Temel Bilgiler */}
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}>Temel Bilgiler</h3>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Ürün Adı</label>
            {editing ? (
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.name}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Ürün Kodu (SKU)</label>
            {editing ? (
              <input
                type="text"
                value={formData.sku || ""}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.sku || "-"}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Barkod</label>
            {editing ? (
              <input
                type="text"
                value={formData.barcode || ""}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.barcode || "-"}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Marka</label>
            {editing ? (
              <input
                type="text"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.brand || "-"}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Kategori</label>
            {editing ? (
              <input
                type="text"
                value={formData.category || ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.category || "-"}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Durum</label>
            {editing ? (
              <select
                value={formData.active ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === "true" })}
                style={inputStyle}
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            ) : (
              <p style={{
                margin: "0",
                fontSize: "14px",
                color: product.active ? "#10b981" : "#ef4444",
                fontWeight: "600"
              }}>
                {product.active ? "✓ Aktif" : "✗ Pasif"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fiyat ve Stok */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}>Fiyatlandırma</h3>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Satış Fiyatı (₺)</label>
            {editing ? (
              <input
                type="number"
                value={formData.salePrice || ""}
                onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#10b981" }}>
                ₺{product.salePrice?.toLocaleString("tr-TR") || "0"}
              </p>
            )}
          </div>

          {currentUser?.role === "admin" && (
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>Alış Fiyatı (₺)</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.purchasePrice || ""}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
                  ₺{product.purchasePrice?.toLocaleString("tr-TR") || "0"}
                </p>
              )}
            </div>
          )}

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>KDV (%)</label>
            {editing ? (
              <input
                type="number"
                value={formData.vat || ""}
                onChange={(e) => setFormData({ ...formData, vat: parseFloat(e.target.value) })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.vat || "0"}%</p>
            )}
          </div>
        </div>

        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}>Stok Yönetimi</h3>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Mevcut Stok</label>
            {editing ? (
              <input
                type="number"
                value={formData.stock || ""}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                style={inputStyle}
              />
            ) : (
              <p style={{
                margin: "0",
                fontSize: "14px",
                fontWeight: "600",
                color: product.stock <= product.minStock ? "#ef4444" : "#10b981"
              }}>
                {product.stock} {product.stock <= product.minStock ? "⚠️ KRİTİK" : ""}
              </p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Minimum Stok Seviyesi</label>
            {editing ? (
              <input
                type="number"
                value={formData.minStock || ""}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.minStock || "0"}</p>
            )}
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Raf Konumu</label>
            {editing ? (
              <input
                type="text"
                value={formData.shelf || ""}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <p style={{ margin: "0", fontSize: "14px" }}>{product.shelf || "-"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Açıklama */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: "20px"
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700" }}>Açıklama</h3>
        {editing ? (
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
          />
        ) : (
          <p style={{ margin: "0", fontSize: "14px", whiteSpace: "pre-wrap", color: "#64748b" }}>
            {product.description || "Açıklama yok"}
          </p>
        )}
      </div>

      {/* Zaman Damgaları */}
      <div style={{
        background: "#f9f9f9",
        padding: "12px 16px",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#64748b"
      }}>
        Oluşturulma: {new Date(product.createdAt).toLocaleString("tr-TR")} • 
        Son Güncelleme: {new Date(product.updatedAt).toLocaleString("tr-TR")}
      </div>

      {/* Butonlar */}
      {editing && (
        <div style={{ marginTop: "20px", display: "flex", gap: "8px" }}>
          <button onClick={handleSave} style={successBtn}>✓ Kaydet</button>
          <button onClick={() => { setEditing(false); setFormData(product); }} style={secondaryBtn}>✕ İptal</button>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => navigate("/products")} style={secondaryBtn}>← Geri Dön</button>
      </div>
    </div>
  );
}

export default ProductDetail;
