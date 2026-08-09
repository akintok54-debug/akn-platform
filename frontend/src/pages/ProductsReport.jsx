import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const ProductsReport = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    category: "",
    brand: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.brand) params.append("brand", filters.brand);

      const reportsRes = await api.get(`/reports/products?${params.toString()}`);
      setProducts(reportsRes.data.products || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const summary = {
    totalProducts: products.length,
    avgSalePrice: products.length > 0 ? (products.reduce((s, p) => s + (p.salePrice || 0), 0) / products.length).toFixed(2) : 0,
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = products.map((p) => ({
        "Ürün Adı": p.name || "-",
        "SKU": p.sku || "-",
        "Barkod": p.barcode || "-",
        "Kategori": p.category || "-",
        "Marka": p.brand || "-",
        "Satış Fiyatı": p.salePrice || 0,
        "Alış Fiyatı": p.purchasePrice || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
      XLSX.writeFile(wb, "ürün-raporu.xlsx");
    } catch (error) {
      console.error("Excel dışa aktarma başarısız:", error);
      alert("Excel dışa aktarma başarısız");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h1>📦 Ürün Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/products")} className="btn-primary">
            + Yeni Ürün
          </button>
          <button onClick={handleApplyFilters} className="btn-info">
            🔍 Filtrele
          </button>
          <button onClick={exportToExcel} disabled={exporting} className="btn-success">
            {exporting ? "Dışa Aktarılıyor..." : "📥 Excel"}
          </button>
          <button onClick={handlePrint} className="btn-secondary">
            🖨️ Yazdır
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Kategori:</label>
          <input
            type="text"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            placeholder="Kategori adı"
          />
        </div>
        <div className="filter-group">
          <label>Marka:</label>
          <input
            type="text"
            name="brand"
            value={filters.brand}
            onChange={handleFilterChange}
            placeholder="Marka adı"
          />
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Ürün</div>
          <div className="summary-value">{summary.totalProducts}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Ortalama Satış Fiyatı</div>
          <div className="summary-value">{summary.avgSalePrice} ₺</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Ürün Adı</th>
                <th>SKU</th>
                <th>Barkod</th>
                <th>Kategori</th>
                <th>Marka</th>
                <th>Satış Fiyatı</th>
                <th>Alış Fiyatı</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product.name || "-"}</td>
                  <td>{product.sku || "-"}</td>
                  <td>{product.barcode || "-"}</td>
                  <td>{product.category || "-"}</td>
                  <td>{product.brand || "-"}</td>
                  <td>{(product.salePrice || 0).toFixed(2)} ₺</td>
                  <td>{(product.purchasePrice || 0).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductsReport;
