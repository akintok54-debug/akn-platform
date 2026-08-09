import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const TABS = [
  { key: "home", label: "🏠 Ana Sayfa" },
  { key: "statement", label: "📑 Cari Hesap Ekstresi" },
  { key: "orders", label: "📦 Siparisler" },
  { key: "payments", label: "💳 Odemeler" },
  { key: "returns", label: "↩ Iadeler" },
  { key: "purchases", label: "🧾 Satin Alinanlar" },
  { key: "invoices", label: "🧾 Faturalar" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`;

function DealerSelfServicePortal() {
  const { secureToken } = useParams();
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [statement, setStatement] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [profile, setProfile] = useState(null);
  const [filters, setFilters] = useState({ period: "month", startDate: "", endDate: "", docType: "", minDebit: "", minCredit: "" });

  const basePath = useMemo(() => `/dealer/public/${secureToken}`, [secureToken]);

  const request = (path, options = {}) => api.get(`${basePath}${path}`, options);

  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [dashRes, statementRes, ordersRes, paymentsRes, returnsRes, purchasesRes, invoicesRes, profileRes] = await Promise.all([
        request("/dashboard"),
        request("/statement", { params: filters }),
        request("/orders"),
        request("/payments"),
        request("/returns"),
        request("/purchases"),
        request("/invoices"),
        request("/profile"),
      ]);

      setDashboard(dashRes.data.dashboard || null);
      setStatement(statementRes.data.statement || []);
      setOrders(ordersRes.data.orders || []);
      setPayments(paymentsRes.data.payments || []);
      setReturnsData(returnsRes.data.returns || []);
      setPurchases(purchasesRes.data.products || []);
      setInvoices(invoicesRes.data.invoices || []);
      setProfile(profileRes.data.profile || null);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Portal verileri alinamadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (secureToken) {
      fetchAll();
    }
  }, [secureToken]);

  const refreshStatement = async () => {
    setLoading(true);
    try {
      const response = await request("/statement", { params: filters });
      setStatement(response.data.statement || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Ekstre getirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const downloadStatementPdf = async () => {
    try {
      const response = await request("/statement/pdf", { params: filters, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cari-ekstre.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "PDF olusturulamadi.");
    }
  };

  const shareWhatsApp = async () => {
    try {
      const response = await api.post(`${basePath}/statement/whatsapp`);
      if (response?.data?.url) {
        window.open(response.data.url, "_blank");
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "WhatsApp paylasimi baslatilamadi.");
    }
  };

  const shareMail = async () => {
    try {
      const response = await api.post(`${basePath}/statement/mail`);
      if (response?.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Mail paylasimi baslatilamadi.");
    }
  };

  const exportStatementCsv = () => {
    const rows = statement.map((x) => [
      formatDate(x.date),
      x.evrakNo || "",
      x.transactionType || "",
      x.description || "",
      Number(x.debit || 0).toFixed(2),
      Number(x.credit || 0).toFixed(2),
      Number(x.balance || 0).toFixed(2),
    ]);

    const csv = [["Tarih", "Evrak No", "Islem Turu", "Aciklama", "Borc", "Alacak", "Bakiye"], ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cari-ekstre.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadInvoicePdf = async (invoiceId) => {
    try {
      const response = await request(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fatura-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Fatura indirilemedi.");
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>

          <h2 style={{ margin: "8px 0 4px" }}>Bayi Öz Servis Portalı</h2>
          <div style={{ color: "#64748b", fontSize: 14 }}>{profile?.companyName || "Bayi"}</div>
        </div>
        <button style={secondaryBtn} onClick={fetchAll}>Yenile</button>
      </div>

      <div style={tabsWrapStyle}>
        {TABS.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ ...tabStyle, ...(tab === item.key ? tabActiveStyle : {}) }}>
            {item.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "#0369a1", fontWeight: 700 }}>Yukleniyor...</div>}
      {errorMessage && <div style={{ color: "#b91c1c", fontWeight: 700 }}>{errorMessage}</div>}

      {tab === "home" && dashboard && (
        <div style={cardsGrid}>
          <Kpi title="Guncel Cari Bakiye" value={formatCurrency(dashboard.currentBalance)} />
          <Kpi title="Toplam Borc" value={formatCurrency(dashboard.totalDebt)} />
          <Kpi title="Toplam Alacak" value={formatCurrency(dashboard.totalCredit)} />
          <Kpi title="Son Odeme" value={dashboard.lastPaymentDate ? `${formatDate(dashboard.lastPaymentDate)} • ${formatCurrency(dashboard.lastPaymentAmount)}` : "-"} />
          <Kpi title="Bekleyen Siparis" value={String(dashboard.pendingOrders || 0)} />
          <Kpi title="Kargodaki Siparis" value={String(dashboard.inTransitOrders || 0)} />
          <Kpi title="Son Fatura" value={dashboard.lastInvoiceDate ? `${formatDate(dashboard.lastInvoiceDate)} • ${formatCurrency(dashboard.lastInvoiceAmount)}` : "-"} />
          <Kpi title="Son Iade" value={dashboard.lastReturnDate ? `${formatDate(dashboard.lastReturnDate)} • ${formatCurrency(dashboard.lastReturnAmount)}` : "-"} />
        </div>
      )}

      {tab === "statement" && (
        <div style={cardStyle}>
          <h3>Cari Hesap Ekstresi</h3>
          <div style={filterGrid}>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
            <select value={filters.period} onChange={(e) => setFilters((p) => ({ ...p, period: e.target.value }))}>
              <option value="today">Bugun</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
              <option value="lastmonth">Gecen Ay</option>
              <option value="custom">Ozel Tarih</option>
            </select>
            <input placeholder="Evrak Turu" value={filters.docType} onChange={(e) => setFilters((p) => ({ ...p, docType: e.target.value }))} />
            <button style={primaryBtn} onClick={refreshStatement}>Filtrele</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button style={secondaryBtn} onClick={downloadStatementPdf}>📄 PDF</button>
            <button style={secondaryBtn} onClick={exportStatementCsv}>📥 Excel</button>
            <button style={secondaryBtn} onClick={() => window.print()}>🖨 Yazdir</button>
            <button style={secondaryBtn} onClick={shareWhatsApp}>📱 WhatsApp</button>
            <button style={secondaryBtn} onClick={shareMail}>📧 Mail</button>
          </div>
          <Table
            columns={["Tarih", "Evrak No", "Islem", "Aciklama", "Borc", "Alacak", "Bakiye"]}
            rows={statement.map((x) => [formatDate(x.date), x.evrakNo, x.transactionType, x.description || "", formatCurrency(x.debit), formatCurrency(x.credit), formatCurrency(x.balance)])}
          />
        </div>
      )}

      {tab === "orders" && (
        <div style={cardStyle}>
          <h3>Siparisler</h3>
          <Table
            columns={["Tarih", "Durum", "Kalem", "Toplam", "Not"]}
            rows={orders.map((x) => [formatDate(x.orderDate), x.status, x.itemCount, formatCurrency(x.totalAmount), x.notes || "-"])}
          />
        </div>
      )}

      {tab === "payments" && (
        <div style={cardStyle}>
          <h3>Odemeler</h3>
          <Table
            columns={["Tarih", "Yontem", "Tutar", "Aciklama"]}
            rows={payments.map((x) => [formatDate(x.paymentDate), x.paymentMethod, formatCurrency(x.amount), x.description || "-"])}
          />
        </div>
      )}

      {tab === "returns" && (
        <div style={cardStyle}>
          <h3>Iadeler</h3>
          <Table
            columns={["Tarih", "Urun", "Adet", "Tutar", "Durum"]}
            rows={returnsData.map((x) => [formatDate(x.returnDate), x.product, x.quantity, formatCurrency(x.amount), x.status])}
          />
        </div>
      )}

      {tab === "purchases" && (
        <div style={cardStyle}>
          <h3>Satin Alinan Urunler</h3>
          <Table
            columns={["Kod", "Urun", "Adet", "Birim", "Toplam", "Tarih"]}
            rows={purchases.map((x) => [x.productCode || "-", x.productName, x.quantity, formatCurrency(x.unitPrice), formatCurrency(x.totalAmount), formatDate(x.purchaseDate)])}
          />
        </div>
      )}

      {tab === "invoices" && (
        <div style={cardStyle}>
          <h3>Faturalar</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Tip</th>
                  <th>Durum</th>
                  <th>Tutar</th>
                  <th>Tarih</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((x) => (
                  <tr key={x.id}>
                    <td>{x.invoiceNumber || "-"}</td>
                    <td>{x.invoiceType}</td>
                    <td>{x.status}</td>
                    <td>{formatCurrency(x.total)}</td>
                    <td>{formatDate(x.createdAt)}</td>
                    <td><button style={secondaryBtn} onClick={() => downloadInvoicePdf(x.id)}>Indir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>{value}</div>
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, i) => (
                <td key={`${idx}-${i}`}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 18 }}>
                Kayit bulunamadi.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  padding: 16,
};

const headerStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
};

const tabsWrapStyle = {
  marginTop: 14,
  marginBottom: 14,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const tabStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 999,
  padding: "8px 12px",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const tabActiveStyle = {
  background: "#0f172a",
  color: "#fff",
  borderColor: "#0f172a",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const kpiCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 8,
};

const tableStyle = {
  width: "100%",
  minWidth: 700,
  borderCollapse: "collapse",
  border: "1px solid #e2e8f0",
};

const primaryBtn = {
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  background: "linear-gradient(135deg, #0284c7 0%, #0f172a 100%)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryBtn = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

export default DealerSelfServicePortal;
