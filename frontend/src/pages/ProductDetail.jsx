import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isCreateMode = id === "new" || location.pathname === "/products/new";
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isCreateMode);
  const [formData, setFormData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isCreateMode) {
      setProduct({
        name: "",
        sku: "",
        barcode: "",
        brand: "",
        category: "",
        active: true,
        salePrice: 0,
        purchasePrice: 0,
        purchasePriceUnit: 0,
        purchasePriceBox: 0,
        purchasePriceMode: "adet",
        vat: 20,
        stock: 0,
        minStock: 0,
        shelf: "",
        description: "",
        image: "",
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setFormData({
        name: "",
        sku: "",
        barcode: "",
        brand: "",
        category: "",
        active: true,
        salePrice: 0,
        purchasePrice: 0,
        purchasePriceUnit: 0,
        purchasePriceBox: 0,
        purchasePriceMode: "adet",
        vat: 20,
        stock: 0,
        minStock: 0,
        shelf: "",
        description: "",
        image: "",
        images: [],
      });
      setLoading(false);
      return;
    }
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
    const normalizedPurchasePriceUnit = Number.isFinite(Number(formData.purchasePriceUnit)) ? Number(formData.purchasePriceUnit) : 0;
    const normalizedPurchasePriceBox = Number.isFinite(Number(formData.purchasePriceBox)) ? Number(formData.purchasePriceBox) : 0;
    const normalizedPurchasePriceMode = formData.purchasePriceMode === "koli" ? "koli" : "adet";

    const payload = {
      ...formData,
      name: String(formData.name || "").trim(),
      sku: String(formData.sku || "").trim(),
      barcode: String(formData.barcode || "").trim(),
      brand: String(formData.brand || "").trim(),
      category: String(formData.category || "").trim(),
      shelf: String(formData.shelf || "").trim(),
      description: String(formData.description || "").trim(),
      image: String(formData.image || "").trim(),
      salePrice: Number.isFinite(Number(formData.salePrice)) ? Number(formData.salePrice) : 0,
      purchasePriceUnit: normalizedPurchasePriceUnit,
      purchasePriceBox: normalizedPurchasePriceBox,
      purchasePriceMode: normalizedPurchasePriceMode,
      purchasePrice: normalizedPurchasePriceMode === "koli" ? normalizedPurchasePriceBox : normalizedPurchasePriceUnit,
      vat: Number.isFinite(Number(formData.vat)) ? Number(formData.vat) : 20,
      stock: Number.isFinite(Number(formData.stock)) ? Number(formData.stock) : 0,
      minStock: Number.isFinite(Number(formData.minStock)) ? Number(formData.minStock) : 0,
      active: Boolean(formData.active),
      images: Array.isArray(formData.images) ? formData.images : [],
    };

    if (!payload.name) {
      alert("Ürün adı zorunludur.");
      return;
    }

    try {
      if (isCreateMode) {
        const res = await api.post("/products", payload);
        const createdId = res?.data?.data?._id;
        alert("✓ Ürün oluşturuldu.");
        if (createdId) {
          navigate(`/products/${createdId}`);
        } else {
          navigate("/products");
        }
        return;
      }

      await api.put(`/products/${id}`, payload);
      setProduct(payload);
      setEditing(false);
      alert("✓ Ürün güncellenmiştir.");
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      alert(error?.response?.data?.message || "Kaydetme sırasında hata oluştu.");
    }
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });

  const uploadImageFile = async (file) => {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await api.post("/products/upload-image", { imageData: dataUrl, fileName: file.name });
    return response?.data?.url || "";
  };

  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const uploadedUrl = await uploadImageFile(file);
      if (!uploadedUrl) {
        alert("Resim yuklenemedi.");
        return;
      }
      setFormData((prev) => ({ ...prev, image: uploadedUrl }));
    } catch (error) {
      console.error(error);
      alert("Resim yukleme basarisiz.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleGalleryFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploadingImage(true);
      const uploadedUrls = [];
      for (const file of files) {
        const uploadedUrl = await uploadImageFile(file);
        if (uploadedUrl) uploadedUrls.push(uploadedUrl);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...new Set([...(Array.isArray(prev.images) ? prev.images : []), ...uploadedUrls])],
      }));
    } catch (error) {
      console.error(error);
      alert("Galeri resimleri yuklenemedi.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const removeGalleryImage = (urlToDelete) => {
    setFormData((prev) => ({
      ...prev,
      images: (Array.isArray(prev.images) ? prev.images : []).filter((item) => item !== urlToDelete),
    }));
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
            SKU: {product.sku || "-"} • Barkod: {product.barcode || "-"}
          </p>
        </div>
        <div>
          {!editing && !isCreateMode && (
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
          {(editing ? formData.image : product.image) ? (
            <img src={editing ? formData.image : product.image} alt="" style={{
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
          {((editing ? formData.images : product.images) || []).length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(editing ? formData.images : product.images).map((img, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <img src={img} alt="" style={{
                    width: "60px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }} />
                  {editing && (
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(img)}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "999px",
                        border: "none",
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editing && (
            <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Ana Resim Yukle</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Galeri Resimleri Yukle</label>
                <input type="file" accept="image/*" multiple onChange={handleGalleryFilesChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ana Resim URL</label>
                <input
                  type="text"
                  value={formData.image || ""}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={inputStyle}
                />
              </div>
              {uploadingImage && <div style={{ color: "#2563eb", fontSize: "13px", fontWeight: 600 }}>Resimler yukleniyor...</div>}
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
            <>
              <div style={fieldContainerStyle}>
                <label style={labelStyle}>Alis Fiyati Secimi</label>
                {editing ? (
                  <select
                    value={formData.purchasePriceMode || "adet"}
                    onChange={(e) => setFormData({ ...formData, purchasePriceMode: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="adet">Adet</option>
                    <option value="koli">Koli</option>
                  </select>
                ) : (
                  <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
                    {(product.purchasePriceMode || "adet").toUpperCase()}
                  </p>
                )}
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>Alis Fiyati - Adet (₺)</label>
                {editing ? (
                  <input
                    type="number"
                    value={formData.purchasePriceUnit ?? ""}
                    onChange={(e) => setFormData({ ...formData, purchasePriceUnit: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                ) : (
                  <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
                    ₺{Number(product.purchasePriceUnit || 0).toLocaleString("tr-TR")}
                  </p>
                )}
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>Alis Fiyati - Koli (₺)</label>
                {editing ? (
                  <input
                    type="number"
                    value={formData.purchasePriceBox ?? ""}
                    onChange={(e) => setFormData({ ...formData, purchasePriceBox: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                ) : (
                  <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
                    ₺{Number(product.purchasePriceBox || 0).toLocaleString("tr-TR")}
                  </p>
                )}
              </div>
            </>
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
