import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const CollectionsReport = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    customerId: "",
    paymentType: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customerId) params.append("customerId", filters.customerId);
      if (filters.paymentType) params.append("paymentType", filters.paymentType);

      const [reportsRes, customersRes] = await Promise.all([
        api.get(`/reports/collections?${params.toString()}`),
        api.get("/customers"),
      ]);

      setCollections(reportsRes.data.collections || []);
      setCustomers(customersRes.data.customers || customersRes.data || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setCollections([]);
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
    totalCollections: collections.length,
    totalAmount: collections.reduce((s, c) => s + (c.paidAmount || 0), 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = collections.map((c) => ({
        Tarih: new Date(c.createdAt).toLocaleDateString("tr-TR"),
        Müşteri: c.customerId?.companyName || "Bilinmiyor",
        "Tutar": c.paidAmount || 0,
        "Ödeme Şekli": c.paymentType || "Bilinmiyor",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tahsilat");
      XLSX.writeFile(wb, "tahsilat-raporu.xlsx");
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
        <h1>💰 Tahsilat Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/sales")} className="btn-primary">
            + Yeni Tahsilat
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
          <label>Başlangıç Tarihi:</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <label>Bitiş Tarihi:</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <label>Müşteri:</label>
          <select name="customerId" value={filters.customerId} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Ödeme Şekli:</label>
          <select name="paymentType" value={filters.paymentType} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            <option value="NAKIT">Nakit</option>
            <option value="KREDI_KARTI">Kredi Kartı</option>
            <option value="CARI">Cari</option>
          </select>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Tahsilat</div>
          <div className="summary-value">{summary.totalCollections}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Tahsilat Tutarı</div>
          <div className="summary-value">{summary.totalAmount.toFixed(2)} ₺</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Tutar</th>
                <th>Ödeme Şekli</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection._id}>
                  <td>{new Date(collection.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td>{collection.customerId?.companyName || "Bilinmiyor"}</td>
                  <td>{(collection.paidAmount || 0).toFixed(2)} ₺</td>
                  <td>{collection.paymentType || "Bilinmiyor"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CollectionsReport;
