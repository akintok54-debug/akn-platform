import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const AuditReport = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
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
    userId: "",
    module: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.module) params.append("module", filters.module);

      const [logsRes, usersRes] = await Promise.all([
        api.get(`/reports/audit?${params.toString()}`),
        api.get("/users").catch(() => ({ data: { data: [] } })),
      ]);

      setLogs(logsRes.data.logs || []);
      setUsers(usersRes.data.data || usersRes.data.users || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setLogs([]);
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
    totalLogs: logs.length,
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = logs.map((log) => ({
        Tarih: new Date(log.createdAt).toLocaleDateString("tr-TR"),
        Saat: new Date(log.createdAt).toLocaleTimeString("tr-TR"),
        Kullanıcı: log.userId?.name || "Bilinmiyor",
        Modül: log.module || "-",
        İşlem: log.action || "-",
        Detay: log.details || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit");
      XLSX.writeFile(wb, "audit-raporu.xlsx");
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
        <h1>🔐 İşlem Geçmişi / Audit Raporu</h1>
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
        <div className="filter-group">
          <label>Kullanıcı:</label>
          <select name="userId" value={filters.userId} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Modül:</label>
          <input
            type="text"
            name="module"
            value={filters.module}
            onChange={handleFilterChange}
            placeholder="Modül adı"
          />
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam İşlem</div>
          <div className="summary-value">{summary.totalLogs}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Tarih / Saat</th>
                <th>Kullanıcı</th>
                <th>Modül</th>
                <th>İşlem</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleDateString("tr-TR")} {new Date(log.createdAt).toLocaleTimeString("tr-TR")}</td>
                  <td>{log.userId?.name || "Bilinmiyor"}</td>
                  <td>{log.module || "-"}</td>
                  <td>{log.action || "-"}</td>
                  <td>{log.details || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditReport;
