import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ProductCenterStyles.css";

function ProductsCenter() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Filtreler
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    brand: "",
    active: "",
    minStock: "",
    maxStock: "",
    sortBy: "createdAt"
  });

  // Import öncesi analiz için state
  const [showImportAnalysis, setShowImportAnalysis] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState(null);

  // Sayfa yükleme
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Ürünleri getir (filtreleme ile)
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.category) params.append("category", filters.category);
      if (filters.brand) params.append("brand", filters.brand);
      if (filters.active) params.append("active", filters.active);
      if (filters.minStock) params.append("minStock", filters.minStock);
      if (filters.maxStock) params.append("maxStock", filters.maxStock);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);

      const [productsRes, categoriesRes, brandsRes, statsRes] = await Promise.all([
        api.get(`/products/center/filters?${params.toString()}`),
        api.get("/products/center/categories"),
        api.get("/products/center/brands"),
        api.get("/products/center/stats")
      ]);

      setProducts(productsRes.data?.data || []);
      setCategories(categoriesRes.data?.data || []);
      setBrands(brandsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  // İmport fonksiyonları
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Admin kontrolü
    if (currentUser?.role !== "admin") {
      alert("⛔ Sadece yöneticiler Excel import yapabilir.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) {
        alert("Dosya boş veya okunamadı.");
        return;
      }

      // Analiz et
      const analysis = await api.post("/imports/products/analyze", { rows: data.slice(0, 50) });
      setImportAnalysis(analysis.data);
      setShowImportAnalysis(true);
    } catch (error) {
      console.error("Import hatası:", error);
      alert("Dosya işlenirken hata oluştu.");
    }
  };

  // Toplu işlemler
  const handleBulkPriceUpdate = () => {
    if (selectedProducts.length === 0) {
      alert("Lütfen en az bir ürün seçin.");
      return;
    }
    navigate("/bulk-update/price", { state: { productIds: selectedProducts } });
  };

  const handleBulkStockUpdate = () => {
    if (selectedProducts.length === 0) {
      alert("Lütfen en az bir ürün seçin.");
      return;
    }
    navigate("/bulk-update/stock", { state: { productIds: selectedProducts } });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Kutu stilleri
  const headerBtnStyle = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
    marginRight: "8px"
  };

  const primaryBtn = { ...headerBtnStyle, background: "#10b981", color: "#fff" };
  const secondaryBtn = { ...headerBtnStyle, background: "#3b82f6", color: "#fff" };
  const dangerBtn = { ...headerBtnStyle, background: "#ef4444", color: "#fff" };
  const successBtn = { ...headerBtnStyle, background: "#059669", color: "#fff" };

  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit"
  };

  const cellStyle = {
    padding: "12px",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb"
  };

  return (
    <div className="products-center-container">
      {/* HEADER */}
      <div className="products-header">
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>Ürün Merkezi</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Tüm ürünlerinizi merkezi panelden yönetin
          </p>
        </div>
      </div>

      {/* İSTATİSTİKLER */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Toplam Ürün</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#10b981" }}>{stats.active || 0}</div>
          <div className="stat-label">Aktif</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#ef4444" }}>{stats.criticalStock || 0}</div>
          <div className="stat-label">Kritik Stok</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₺{(stats.totalStockValue || 0).toLocaleString("tr-TR")}</div>
          <div className="stat-label">Stok Değeri</div>
        </div>
      </div>

      {/* İŞLEM BUTONLARI - 1. SATIR */}
      <div className="action-buttons-grid">
        <button style={primaryBtn} onClick={() => navigate("/products/new")}>
          + Yeni Ürün
        </button>
        <button style={secondaryBtn} onClick={() => document.getElementById("import-file").click()}>
          📥 Excel'den Yükle
        </button>
        <input
          id="import-file"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
        <button style={successBtn} onClick={handleBulkPriceUpdate} disabled={selectedProducts.length === 0}>
          💰 Fiyat Güncelle
        </button>
        <button style={successBtn} onClick={handleBulkStockUpdate} disabled={selectedProducts.length === 0}>
          📦 Stok Güncelle
        </button>
        <button style={secondaryBtn} onClick={() => navigate("/bulk-export")}>
          📤 Dışa Aktar
        </button>
      </div>

      {/* İŞLEM BUTONLARI - 2. SATIR */}
      <div className="action-buttons-grid">
        <button style={secondaryBtn} onClick={() => navigate("/category-manager")}>
          🏷️ Kategori Yönetimi
        </button>
        <button style={secondaryBtn} onClick={() => navigate("/brand-manager")}>
          🎯 Marka Yönetimi
        </button>
        <button style={secondaryBtn} onClick={() => navigate("/reports/products")}>
          📊 Ürün Raporu
        </button>
        <button style={secondaryBtn} onClick={() => navigate("/reports/stock")}>
          📦 Stok Raporu
        </button>
        <button style={secondaryBtn} onClick={() => navigate("/import-history")}>
          📜 İmport Geçmişi
        </button>
        <button style={dangerBtn} onClick={() => navigate("/error-products")}>
          ⚠️ Hatalı Ürünler
        </button>
      </div>

      {/* FİLTRELER */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Ürün adı, kod, barkod..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Kategori</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={inputStyle}
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Marka</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              style={inputStyle}
            >
              <option value="">Tüm Markalar</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Durum</label>
            <select
              value={filters.active}
              onChange={(e) => setFilters({ ...filters, active: e.target.value })}
              style={inputStyle}
            >
              <option value="">Tümü</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Sıralama</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              style={inputStyle}
            >
              <option value="createdAt">En Yeni</option>
              <option value="name">Adı (A-Z)</option>
              <option value="price_asc">Fiyat (Düşük)</option>
              <option value="price_desc">Fiyat (Yüksek)</option>
              <option value="stock_asc">Stok (Az)</option>
              <option value="stock_desc">Stok (Çok)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ÜRÜN TABLOSU */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>⏳ Yükleniyor...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          📭 Ürün bulunamadı.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="products-table">
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={cellStyle}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={cellStyle}>Görsel</th>
                <th style={cellStyle}>Ürün Adı</th>
                <th style={cellStyle}>Kod / Barkod</th>
                <th style={cellStyle}>Kategori</th>
                <th style={cellStyle}>Marka</th>
                <th style={cellStyle}>Satış Fiyatı</th>
                <th style={cellStyle}>Stok</th>
                <th style={cellStyle}>Durum</th>
                <th style={cellStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id} style={{ background: selectedProducts.includes(product._id) ? "#f0fdf4" : "#fff" }}>
                  <td style={cellStyle}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => handleSelectProduct(product._id)}
                    />
                  </td>
                  <td style={cellStyle}>
                    {product.image ? (
                      <img src={product.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: "#e5e7eb", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#9ca3af" }}>-</div>
                    )}
                  </td>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{product.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{product.sku || "-"}</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ fontSize: "13px" }}>
                      SKU: {product.sku || "-"}<br />
                      Barkod: {product.barcode || "-"}
                    </div>
                  </td>
                  <td style={cellStyle}>{product.category || "-"}</td>
                  <td style={cellStyle}>{product.brand || "-"}</td>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: "600", color: "#10b981" }}>
                      ₺{product.salePrice?.toLocaleString("tr-TR") || "0"}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      fontWeight: "600",
                      color: product.stock <= product.minStock ? "#ef4444" : "#10b981"
                    }}>
                      {product.stock}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: product.active ? "#dcfce7" : "#fee2e2",
                      color: product.active ? "#166534" : "#991b1b"
                    }}>
                      {product.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <button
                      onClick={() => navigate(`/products/${product._id}`)}
                      style={{
                        ...headerBtnStyle,
                        background: "#3b82f6",
                        color: "#fff",
                        marginRight: "4px"
                      }}
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seçili Ürün Bilgisi */}
      {selectedProducts.length > 0 && (
        <div style={{
          marginTop: "20px",
          padding: "12px 16px",
          background: "#dbeafe",
          border: "1px solid #93c5fd",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#1e40af"
        }}>
          ✓ {selectedProducts.length} ürün seçildi.
        </div>
      )}
    </div>
  );
}

export default ProductsCenter;
