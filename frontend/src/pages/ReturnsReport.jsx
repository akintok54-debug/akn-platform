import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const ReturnsReport = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
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
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customerId) params.append("customerId", filters.customerId);

      const [reportsRes, customersRes] = await Promise.all([
        api.get(`/reports/returns?${params.toString()}`),
        api.get("/customers"),
      ]);

      setReturns(reportsRes.data.returns || []);
      setCustomers(customersRes.data.customers || customersRes.data || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setReturns([]);
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
    totalReturns: returns.length,
    totalAmount: returns.reduce((s, r) => s + (r.totalAmount || 0), 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = returns.map((r) => ({
        Tarih: new Date(r.createdAt).toLocaleDateString("tr-TR"),
        Müşteri: r.customerId?.companyName || "Bilinmiyor",
        "Temsilci": r.userId?.name || "Bilinmiyor",
        "Tutar": r.totalAmount || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "İadeler");
      XLSX.writeFile(wb, "iade-raporu.xlsx");
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
        <h1>🔄 İade Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/sales")} className="btn-primary">
            + Yeni İade
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
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam İade</div>
          <div className="summary-value">{summary.totalReturns}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">İade Tutarı</div>
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
                <th>Temsilci</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret._id}>
                  <td>{new Date(ret.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td>{ret.customerId?.companyName || "Bilinmiyor"}</td>
                  <td>{ret.userId?.name || "Bilinmiyor"}</td>
                  <td>{(ret.totalAmount || 0).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReturnsReport;
