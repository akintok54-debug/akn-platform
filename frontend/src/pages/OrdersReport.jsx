import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const OrdersReport = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    customerId: "",
    status: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customerId) params.append("customerId", filters.customerId);
      if (filters.status) params.append("status", filters.status);

      const [reportsRes, customersRes] = await Promise.all([
        api.get(`/reports/orders?${params.toString()}`),
        api.get("/customers"),
      ]);

      setOrders(reportsRes.data.orders || []);
      setCustomers(customersRes.data.customers || customersRes.data || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setOrders([]);
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
    totalOrders: orders.length,
    byStatus: orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = orders.map((o) => ({
        Tarih: new Date(o.createdAt).toLocaleDateString("tr-TR"),
        Müşteri: o.customerId?.companyName || "Bilinmiyor",
        "Sipariş No": o.orderNumber || "-",
        "Durum": o.status || "Bilinmiyor",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
      XLSX.writeFile(wb, "sipariş-raporu.xlsx");
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
        <h1>📦 Sipariş Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/orders")} className="btn-primary">
            + Yeni Sipariş
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
          <label>Durum:</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            <option value="PENDING">Beklemede</option>
            <option value="CONFIRMED">Onaylandı</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Sipariş</div>
          <div className="summary-value">{summary.totalOrders}</div>
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
                <th>Sipariş No</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{new Date(order.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td>{order.customerId?.companyName || "Bilinmiyor"}</td>
                  <td>{order.orderNumber || "-"}</td>
                  <td>
                    <span className={`status ${order.status?.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersReport;
