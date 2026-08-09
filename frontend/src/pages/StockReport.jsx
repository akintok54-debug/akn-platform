import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const StockReport = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    category: "",
    critical: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.critical) params.append("critical", "true");

      const reportsRes = await api.get(`/reports/stock?${params.toString()}`);
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
    const { name, type, value, checked } = e.target;
    setFilters({ 
      ...filters, 
      [name]: type === "checkbox" ? checked : value 
    });
  };

  const handleApplyFilters = () => {
    fetchData();
  };

  const summary = {
    totalProducts: products.length,
    criticalProducts: products.filter((p) => p.status === "KRİTİK").length,
    totalValue: products.reduce((s, p) => s + parseFloat(p.totalValue || 0), 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = products.map((p) => ({
        "Ürün Adı": p.name || "-",
        "SKU": p.sku || "-",
        "Barkod": p.barcode || "-",
        "Stok Miktarı": p.stock || 0,
        "Minimum Stok": p.minStock || 0,
        "Durum": p.status || "-",
        "Satış Fiyatı": p.salePrice || 0,
        "Toplam Değer": p.totalValue || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stok");
      XLSX.writeFile(wb, "stok-raporu.xlsx");
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
        <h1>📦 Stok Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/stock")} className="btn-primary">
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
          <label>
            <input
              type="checkbox"
              name="critical"
              checked={filters.critical}
              onChange={handleFilterChange}
            />
            {" "}Sadece Kritik Stok
          </label>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Ürün</div>
          <div className="summary-value">{summary.totalProducts}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Kritik Stok Sayısı</div>
          <div className="summary-value">{summary.criticalProducts}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Stok Değeri</div>
          <div className="summary-value">{summary.totalValue.toFixed(2)} ₺</div>
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
                <th>Stok</th>
                <th>Minimum</th>
                <th>Durum</th>
                <th>Satış Fiyatı</th>
                <th>Toplam Değer</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product.name || "-"}</td>
                  <td>{product.sku || "-"}</td>
                  <td>{product.barcode || "-"}</td>
                  <td>{product.stock || 0}</td>
                  <td>{product.minStock || 0}</td>
                  <td>
                    <span className={`status ${product.status?.toLowerCase().replace("İ", "i").replace("Ş", "s").replace("Ç", "c").replace("Ğ", "g").replace("Ü", "u").replace("Ö", "o")}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>{(product.salePrice || 0).toFixed(2)} ₺</td>
                  <td>{(product.totalValue || 0).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockReport;
