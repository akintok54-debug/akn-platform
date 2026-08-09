import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ReportStyles.css";

const CustomersReport = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.type) params.append("type", filters.type);

      const reportsRes = await api.get(`/reports/customers?${params.toString()}`);
      setCustomers(reportsRes.data.customers || []);
    } catch (error) {
      console.error("Rapor yüklenemedi:", error);
      setCustomers([]);
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
    totalCustomers: customers.length,
    totalBalance: customers.reduce((s, c) => s + (c.balance || 0), 0),
    totalDebt: customers.reduce((s, c) => s + c.totalDebt, 0),
    totalCredit: customers.reduce((s, c) => s + c.totalCredit, 0),
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const XLSX = window.XLSX || (await import("xlsx")).default;
      
      const data = customers.map((c) => ({
        "Müşteri Adı": c.companyName || c.name,
        "Müşteri Kodu": c.customerCode || c.code,
        "Telefon": c.phone || "-",
        "Şehir": c.city || "-",
        "Bakiye": c.balance || 0,
        "Toplam Borç": c.totalDebt || 0,
        "Toplam Alacak": c.totalCredit || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
      XLSX.writeFile(wb, "müşteri-raporu.xlsx");
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
        <h1>📋 Müşteri / Cari Raporu</h1>
        <div className="action-buttons">
          <button onClick={() => navigate("/customers")} className="btn-primary">
            + Yeni Müşteri
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
          <label>Müşteri Türü:</label>
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">Tümü</option>
            <option value="BIREYSEL">Bireysel</option>
            <option value="KURUMSAL">Kurumsal</option>
          </select>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Toplam Müşteri</div>
          <div className="summary-value">{summary.totalCustomers}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Borç</div>
          <div className="summary-value">{summary.totalDebt.toFixed(2)} ₺</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Toplam Alacak</div>
          <div className="summary-value">{summary.totalCredit.toFixed(2)} ₺</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Genel Bakiye</div>
          <div className="summary-value">{summary.totalBalance.toFixed(2)} ₺</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Müşteri Adı</th>
                <th>Kodu</th>
                <th>Telefon</th>
                <th>Şehir</th>
                <th>Bakiye</th>
                <th>Borç</th>
                <th>Alacak</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td>{customer.companyName || customer.name}</td>
                  <td>{customer.customerCode || customer.code}</td>
                  <td>{customer.phone || "-"}</td>
                  <td>{customer.city || "-"}</td>
                  <td>{(customer.balance || 0).toFixed(2)} ₺</td>
                  <td>{(customer.totalDebt || 0).toFixed(2)} ₺</td>
                  <td>{(customer.totalCredit || 0).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomersReport;
