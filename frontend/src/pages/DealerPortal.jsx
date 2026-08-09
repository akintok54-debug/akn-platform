import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dealerApi from "../services/dealerApi";

const TABS = [
  { key: "home", label: "Ana Sayfa" },
  { key: "statement", label: "Hesap Ekstresi" },
  { key: "purchases", label: "Satin Aldigi Urunler" },
  { key: "payments", label: "Odeme Gecmisi" },
  { key: "returns", label: "Iadeler" },
  { key: "orders", label: "Siparisler" },
  { key: "invoices", label: "Faturalar" },
  { key: "notifications", label: "Bildirimler" },
  { key: "history", label: "Gonderim Gecmisi" },
  { key: "profile", label: "Profil" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`;

function DealerPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [statement, setStatement] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState({ pdfArchive: [], whatsappHistory: [], mailHistory: [], notificationHistory: [] });
  const [profile, setProfile] = useState(null);
  const [filters, setFilters] = useState({ period: "month", startDate: "", endDate: "", docType: "", minDebit: "", minCredit: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  const companyName = localStorage.getItem("dealerCompanyName") || "Bayi";
  const dealerUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("dealerUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dashRes, statementRes, purchasesRes, paymentsRes, returnsRes, ordersRes, invoicesRes, profileRes] = await Promise.all([
        dealerApi.get("/dashboard"),
        dealerApi.get("/statement", { params: filters }),
        dealerApi.get("/purchases"),
        dealerApi.get("/payments"),
        dealerApi.get("/returns"),
        dealerApi.get("/orders"),
        dealerApi.get("/invoices"),
        dealerApi.get("/profile"),
      ]);

      const [notificationsRes, historyRes] = await Promise.all([
        dealerApi.get("/notifications"),
        dealerApi.get("/history"),
      ]);

      setDashboard(dashRes.data.dashboard || null);
      setStatement(statementRes.data.statement || []);
      setPurchases(purchasesRes.data.products || []);
      setPayments(paymentsRes.data.payments || []);
      setReturnsData(returnsRes.data.returns || []);
      setOrders(ordersRes.data.orders || []);
      setInvoices(invoicesRes.data.invoices || []);
      setProfile(profileRes.data.profile || null);
      setNotifications(notificationsRes.data.notifications || []);
      setHistory(historyRes.data || { pdfArchive: [], whatsappHistory: [], mailHistory: [], notificationHistory: [] });
    } catch (error) {
      alert(error?.response?.data?.message || "Bayi portali verileri alinamadi.");
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem("dealerToken");
        sessionStorage.removeItem("dealerToken");
        navigate("/dealer/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("dealerToken") || sessionStorage.getItem("dealerToken");
    if (!token) {
      navigate("/dealer/login");
      return;
    }
    fetchAll();
  }, []);

  const refreshStatement = async () => {
    setLoading(true);
    try {
      const res = await dealerApi.get("/statement", { params: filters });
      setStatement(res.data.statement || []);
    } catch (error) {
      alert(error?.response?.data?.message || "Ekstre getirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const downloadStatementPdf = async () => {
    try {
      const response = await dealerApi.get("/statement/pdf", { params: filters, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cari-ekstre.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error?.response?.data?.message || "PDF olusturulamadi.");
    }
  };

  const shareWhatsApp = async () => {
    try {
      const response = await dealerApi.post("/statement/whatsapp");
      window.open(response.data.url, "_blank");
    } catch (error) {
      alert(error?.response?.data?.message || "WhatsApp paylasimi baslatilamadi.");
    }
  };

  const shareMail = async () => {
    try {
      const response = await dealerApi.post("/statement/mail");
      window.location.href = response.data.url;
    } catch (error) {
      alert(error?.response?.data?.message || "Mail paylasimi baslatilamadi.");
    }
  };

  const exportCSV = (rows, headers, fileName) => {
    const csv = [headers.map((h) => h.label).join(";"), ...rows.map((row) => headers.map((h) => `"${String(row[h.key] ?? "").replaceAll('"', '""')}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportStatementPdf = () => {
    const tableRows = statement
      .map(
        (row) => `
          <tr>
            <td>${formatDate(row.date)}</td>
            <td>${row.evrakNo}</td>
            <td>${row.transactionType}</td>
            <td>${row.description || ""}</td>
            <td style="text-align:right">${formatCurrency(row.debit)}</td>
            <td style="text-align:right">${formatCurrency(row.credit)}</td>
            <td style="text-align:right">${formatCurrency(row.balance)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head><title>Hesap Ekstresi</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px">
          <h2>Bayi Hesap Ekstresi</h2>
          <table border="1" cellspacing="0" cellpadding="8" width="100%">
            <thead>
              <tr>
                <th>Tarih</th><th>Evrak No</th><th>Islem Turu</th><th>Aciklama</th><th>Borc</th><th>Alacak</th><th>Bakiye</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadInvoicePdf = async (id) => {
    try {
      const response = await dealerApi.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fatura-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error?.response?.data?.message || "Fatura indirilemedi.");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await dealerApi.put("/profile/password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      alert("Sifre guncellendi.");
    } catch (error) {
      alert(error?.response?.data?.message || "Sifre guncellenemedi.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dealerToken");
    sessionStorage.removeItem("dealerToken");
    localStorage.removeItem("dealerUser");
    localStorage.removeItem("dealerCompanyName");
    navigate("/dealer/login");
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: "8px 0 4px" }}>Bayi Portali</h2>
          <div style={{ color: "#64748b", fontSize: 14 }}>{companyName} • {dealerUser?.name || "Bayi"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={secondaryBtn} onClick={fetchAll}>Yenile</button>
          <button style={dangerBtn} onClick={handleLogout}>Cikis</button>
        </div>
      </div>

      <div style={tabsWrapStyle}>
        {TABS.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ ...tabStyle, ...(tab === item.key ? tabActiveStyle : {}) }}>
            {item.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "#0369a1", fontWeight: 700 }}>Yukleniyor...</div>}

      {tab === "home" && dashboard && (
        <div style={cardsGrid}>
          <Kpi title="Guncel Cari Bakiye" value={formatCurrency(dashboard.currentBalance)} />
          <Kpi title="Toplam Borc" value={formatCurrency(dashboard.totalDebt)} />
          <Kpi title="Toplam Alacak" value={formatCurrency(dashboard.totalCredit)} />
          <Kpi title="Son Odeme" value={dashboard.lastPaymentDate ? `${formatDate(dashboard.lastPaymentDate)} • ${formatCurrency(dashboard.lastPaymentAmount)}` : "-"} />
          <Kpi title="Bekleyen Siparis" value={String(dashboard.pendingOrders)} />
          <Kpi title="Kargodaki Siparis" value={String(dashboard.inTransitOrders || 0)} />
          <Kpi title="Son Fatura" value={dashboard.lastInvoiceDate ? `${formatDate(dashboard.lastInvoiceDate)} • ${formatCurrency(dashboard.lastInvoiceAmount)}` : "-"} />
          <Kpi title="Son Iade" value={dashboard.lastReturnDate ? `${formatDate(dashboard.lastReturnDate)} • ${formatCurrency(dashboard.lastReturnAmount)}` : "-"} />
        </div>
      )}

      {tab === "statement" && (
        <div style={cardStyle}>
          <h3>Hesap Ekstresi</h3>
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
            <input type="number" placeholder="Min Borc" value={filters.minDebit} onChange={(e) => setFilters((p) => ({ ...p, minDebit: e.target.value }))} />
            <input type="number" placeholder="Min Alacak" value={filters.minCredit} onChange={(e) => setFilters((p) => ({ ...p, minCredit: e.target.value }))} />
            <button style={primaryBtn} onClick={refreshStatement}>Filtrele</button>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <button style={secondaryBtn} onClick={downloadStatementPdf}>📄 PDF Indir</button>
            <button
              style={secondaryBtn}
              onClick={() =>
                exportCSV(
                  statement.map((x) => ({
                    tarih: formatDate(x.date),
                    evrakNo: x.evrakNo,
                    islemTuru: x.transactionType,
                    aciklama: x.description || "",
                    borc: x.debit,
                    alacak: x.credit,
                    bakiye: x.balance,
                  })),
                  [
                    { key: "tarih", label: "Tarih" },
                    { key: "evrakNo", label: "Evrak No" },
                    { key: "islemTuru", label: "Islem Turu" },
                    { key: "aciklama", label: "Aciklama" },
                    { key: "borc", label: "Borc" },
                    { key: "alacak", label: "Alacak" },
                    { key: "bakiye", label: "Bakiye" },
                  ],
                  "hesap-ekstresi.csv"
                )
              }
            >
              📥 Excel Indir
            </button>
            <button style={secondaryBtn} onClick={exportStatementPdf}>🖨 Yazdir</button>
            <button style={secondaryBtn} onClick={shareWhatsApp}>📱 WhatsApp Gonder</button>
            <button style={secondaryBtn} onClick={shareMail}>📧 Mail Gonder</button>
          </div>
          <Table
            columns={["Tarih", "Evrak No", "Islem Turu", "Aciklama", "Borc", "Alacak", "Bakiye"]}
            rows={statement.map((x) => [formatDate(x.date), x.evrakNo, x.transactionType, x.description || "", formatCurrency(x.debit), formatCurrency(x.credit), formatCurrency(x.balance)])}
          />
        </div>
      )}

      {tab === "notifications" && (
        <div style={cardStyle}>
          <h3>Bildirimler</h3>
          <Table
            columns={["Tarih", "Tip", "Baslik", "Mesaj"]}
            rows={notifications.map((x) => [formatDate(x.createdAt), x.type, x.title, x.message])}
          />
        </div>
      )}

      {tab === "history" && (
        <div style={cardStyle}>
          <h3>Gonderim Gecmisi</h3>
          <h4>PDF Arsivi</h4>
          <Table columns={["Tarih", "Tip", "Dosya"]} rows={(history.pdfArchive || []).map((x) => [formatDate(x.createdAt), x.pdfType, x.fileName])} />
          <h4 style={{ marginTop: 16 }}>WhatsApp Gecmisi</h4>
          <Table columns={["Tarih", "Telefon", "Durum", "Mesaj"]} rows={(history.whatsappHistory || []).map((x) => [formatDate(x.createdAt), x.phone, x.status, x.message])} />
          <h4 style={{ marginTop: 16 }}>Mail Gecmisi</h4>
          <Table columns={["Tarih", "E-posta", "Konu", "Durum"]} rows={(history.mailHistory || []).map((x) => [formatDate(x.createdAt), x.toEmail, x.subject, x.status])} />
        </div>
      )}

      {tab === "purchases" && (
        <div style={cardStyle}>
          <h3>Satin Aldigi Urunler</h3>
          <Table
            columns={["Resim", "Urun Kodu", "Urun Adi", "Adet", "Birim Fiyat", "Toplam", "Tarih"]}
            rows={purchases.map((x) => [x.productImage ? "Var" : "-", x.productCode || "-", x.productName, x.quantity, formatCurrency(x.unitPrice), formatCurrency(x.totalAmount), formatDate(x.purchaseDate)])}
          />
        </div>
      )}

      {tab === "payments" && (
        <div style={cardStyle}>
          <h3>Odeme Gecmisi</h3>
          <Table
            columns={["Odeme Tarihi", "Odeme Sekli", "Tutar", "Aciklama"]}
            rows={payments.map((x) => [formatDate(x.paymentDate), x.paymentMethod, formatCurrency(x.amount), x.description || "-"])}
          />
        </div>
      )}

      {tab === "returns" && (
        <div style={cardStyle}>
          <h3>Iadeler</h3>
          <Table
            columns={["Iade Tarihi", "Urun", "Adet", "Tutar", "Durum"]}
            rows={returnsData.map((x) => [formatDate(x.returnDate), x.product, x.quantity, formatCurrency(x.amount), x.status])}
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

      {tab === "profile" && profile && (
        <div style={cardStyle}>
          <h3>Profil</h3>
          <div style={profileGrid}>
            <Info label="Firma" value={profile.companyName} />
            <Info label="Yetkili" value={profile.authorizedName} />
            <Info label="Telefon" value={profile.phone} />
            <Info label="E-posta" value={profile.email} />
            <Info label="Kullanici Adi" value={profile.userName} />
            <Info label="Vergi No" value={profile.taxNumber} />
          </div>
          <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 10, marginTop: 14, maxWidth: 380 }}>
            <input type="password" placeholder="Mevcut sifre" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
            <input type="password" placeholder="Yeni sifre" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} required />
            <button style={primaryBtn} type="submit">Sifreyi Degistir</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#f8fafc" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{value || "-"}</div>
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const profileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
};

const tableStyle = {
  width: "100%",
  minWidth: 740,
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

const dangerBtn = {
  border: "1px solid #ef4444",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#fff1f2",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 700,
};

export default DealerPortal;
