import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const SalesReport = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
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

  // Filtreler
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    customerId: "",
    paymentType: "",
    repId: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.customerId) params.append("customerId", filters.customerId);
      if (filters.paymentType) params.append("paymentType", filters.paymentType);
      if (filters.repId) params.append("repId", filters.repId);

      const [reportsRes, customersRes, usersRes] = await Promise.all([
        api.get(`/reports/sales?${params.toString()}`),
        api.get("/customers"),
        api.get("/users").catch(() => ({ data: { data: [] } })),
      ]);

      setSales(reportsRes.data.sales || []);
      setCustomers(customersRes.data.customers || customersRes.data || []);
      setUsers(usersRes.data.data || usersRes.data.users || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setSales([]);
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
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    totalDiscount: sales.reduce((sum, s) => sum + ((s.discount || 0) + (s.repDiscount || 0)), 0),
    netAmount: sales.reduce((sum, s) => sum + ((s.totalAmount || 0) - ((s.discount || 0) + (s.repDiscount || 0))), 0),
    totalVat: sales.reduce((sum, s) => sum + (s.vat || 0), 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = sales.map((s) => ({
        Tarih: new Date(s.createdAt).toLocaleDateString("tr-TR"),
        Müşteri: s.customerId?.companyName || "Bilinmiyor",
        Temsilci: s.userId?.name || "Bilinmiyor",
        Tutar: s.totalAmount || 0,
        İskonto: (s.discount || 0) + (s.repDiscount || 0),
        "Net Tutar": (s.totalAmount || 0) - ((s.discount || 0) + (s.repDiscount || 0)),
        KDV: s.vat || 0,
        "Ödeme Şekli": s.paymentType || "Bilinmiyor",
        "Ödeme Durumu": s.paymentStatus || "Bilinmiyor",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Satış");
      XLSX.writeFile(wb, "satış-raporu.xlsx");
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
        <h1>📊 Satış Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/sales")} className="btn-primary">
            + Yeni Satış
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
            <option value="CEKAN">Çek/Aval</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Temsilci:</label>
          <select name="repId" value={filters.repId} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            {users.filter((u) => u.role === "sales").map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Satış</div>
          <div className="summary-value">{summary.totalSales}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Tutar</div>
          <div className="summary-value">{summary.totalAmount.toFixed(2)} ₺</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam İskonto</div>
          <div className="summary-value">{summary.totalDiscount.toFixed(2)} ₺</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Net Tutar</div>
          <div className="summary-value">{summary.netAmount.toFixed(2)} ₺</div>
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
                <th>İskonto</th>
                <th>Net Tutar</th>
                <th>Ödeme Şekli</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td>{new Date(sale.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td>{sale.customerId?.companyName || "Bilinmiyor"}</td>
                  <td>{sale.userId?.name || "Bilinmiyor"}</td>
                  <td>{(sale.totalAmount || 0).toFixed(2)} ₺</td>
                  <td>{((sale.discount || 0) + (sale.repDiscount || 0)).toFixed(2)} ₺</td>
                  <td>
                    {(
                      (sale.totalAmount || 0) -
                      ((sale.discount || 0) + (sale.repDiscount || 0))
                    ).toFixed(2)}{" "}
                    ₺
                  </td>
                  <td>{sale.paymentType || "Bilinmiyor"}</td>
                  <td>
                    <span className={`status ${sale.paymentStatus?.toLowerCase()}`}>
                      {sale.paymentStatus}
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

export default SalesReport;
