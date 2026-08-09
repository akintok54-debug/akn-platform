import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const SalesRepReport = () => {
  const navigate = useNavigate();
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  // Admin kontrolü
  if (currentUser?.role !== "admin") {
    return (
      <div className="report-container">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2>⛔ Yetkisiz Erişim</h2>
          <p>Bu raporu görüntülemek için admin yetkisi gereklidir.</p>
          <button onClick={() => navigate("/dashboard")} className="btn-primary">
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const reportsRes = await api.get(`/reports/sales-reps?${params.toString()}`);
      setReps(reportsRes.data.salesReps || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setReps([]);
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
    totalReps: reps.length,
    totalSalesAmount: reps.reduce((s, r) => s + (r.totalAmount || 0), 0),
    totalCollected: reps.reduce((s, r) => s + (r.totalCollected || 0), 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = reps.map((r) => ({
        "Temsilci Adı": r.name || "-",
        "Toplam Satış": r.totalSales || 0,
        "Satış Tutarı": r.totalAmount || 0,
        "Tahsil Tutar": r.totalCollected || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Temsilciler");
      XLSX.writeFile(wb, "temsilci-raporu.xlsx");
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
        <h1>👨‍💼 Satış Temsilcisi Performans Raporu</h1>
        <div className="action-buttons">
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
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Temsilci</div>
          <div className="summary-value">{summary.totalReps}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Satış Tutarı</div>
          <div className="summary-value">{summary.totalSalesAmount.toFixed(2)} ₺</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Tahsil</div>
          <div className="summary-value">{summary.totalCollected.toFixed(2)} ₺</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Temsilci Adı</th>
                <th>Toplam Satış</th>
                <th>Satış Tutarı</th>
                <th>Tahsil Tutar</th>
                <th>Bilinmeyen Tutar</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep._id}>
                  <td>{rep.name || "-"}</td>
                  <td>{rep.totalSales || 0}</td>
                  <td>{(rep.totalAmount || 0).toFixed(2)} ₺</td>
                  <td>{(rep.totalCollected || 0).toFixed(2)} ₺</td>
                  <td>{((rep.totalAmount || 0) - (rep.totalCollected || 0)).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesRepReport;
