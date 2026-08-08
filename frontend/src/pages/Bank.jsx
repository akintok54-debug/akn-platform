import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const OPERATION_OPTIONS = [
  { value: "PARA_GIRIS", label: "Para Giriş" },
  { value: "PARA_CIKIS", label: "Para Çıkış" },
  { value: "EFT", label: "EFT" },
  { value: "HAVALE", label: "Havale" },
  { value: "BANKALAR_ARASI_TRANSFER", label: "Bankalar Arası Transfer" },
];

function Bank() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("TRY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    operation: "PARA_GIRIS",
    date: new Date().toISOString().slice(0, 10),
    documentNo: "",
    description: "",
    amount: "",
    fromAccountId: "",
    toAccountId: "",
  });

  const fetchData = async (filters = { startDate, endDate }) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [accountsRes, txRes] = await Promise.all([
        api.get("/bank/accounts"),
        api.get("/bank/transactions", { params }),
      ]);
      setAccounts(accountsRes?.data?.accounts || []);
      setTransactions(txRes?.data?.transactions || []);
      setTotalBalance(Number(txRes?.data?.totalBalance || 0));
    } catch (error) {
      console.error(error);
      alert("Banka verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ startDate: "", endDate: "" });
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreatingAccount(true);
    try {
      await api.post("/bank/accounts", { name: newAccountName, currency: newAccountCurrency });
      setNewAccountName("");
      setNewAccountCurrency("TRY");
      await fetchData({ startDate, endDate });
      alert("Banka hesabı oluşturuldu.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Banka hesabı oluşturulamadı.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleOperationChange = (operation) => {
    setForm((prev) => {
      const next = { ...prev, operation, fromAccountId: "", toAccountId: "" };
      return next;
    });
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/bank/transactions", {
        ...form,
        amount: Number(form.amount || 0),
      });
      setForm((prev) => ({
        ...prev,
        date: new Date().toISOString().slice(0, 10),
        documentNo: "",
        description: "",
        amount: "",
      }));
      await fetchData({ startDate, endDate });
      alert("Banka hareketi kaydedildi.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Banka hareketi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const needsFrom = useMemo(() => ["PARA_CIKIS", "EFT", "HAVALE", "BANKALAR_ARASI_TRANSFER"].includes(form.operation), [form.operation]);
  const needsTo = useMemo(() => ["PARA_GIRIS", "BANKALAR_ARASI_TRANSFER"].includes(form.operation), [form.operation]);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchData({ startDate, endDate });
  };

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
    fetchData({ startDate: "", endDate: "" });
  };

  const downloadExcel = () => {
    const header = ["Tarih", "Belge No", "İşlem", "Kaynak Hesap", "Hedef Hesap", "Tutar"];
    const rows = transactions.map((item) => [
      new Date(item.date).toLocaleDateString("tr-TR"),
      item.documentNo || "",
      formatOperation(item.operation),
      item.fromAccountId?.name || "",
      item.toAccountId?.name || "",
      Number(item.amount || 0).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `banka-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const htmlRows = transactions
      .map(
        (item) => `
          <tr>
            <td>${new Date(item.date).toLocaleDateString("tr-TR")}</td>
            <td>${item.documentNo || ""}</td>
            <td>${formatOperation(item.operation)}</td>
            <td>${item.fromAccountId?.name || "-"}</td>
            <td>${item.toAccountId?.name || "-"}</td>
            <td style="text-align:right;">${Number(item.amount || 0).toLocaleString("tr-TR")} TL</td>
          </tr>
        `
      )
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      alert("PDF çıktısı için açılır pencere izni veriniz.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Banka Raporu</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 10px; }
            .meta { margin-bottom: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Banka Raporu</h1>
          <div class="meta">Toplam Bakiye: ${totalBalance.toLocaleString("tr-TR")} TL</div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Belge No</th>
                <th>İşlem</th>
                <th>Kaynak Hesap</th>
                <th>Hedef Hesap</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <Layout>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "linear-gradient(135deg, #1b1f3a 0%, #0f766e 100%)", color: "#fff", borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.85 }}>Banka Modülü</div>
          <h2 style={{ margin: "8px 0" }}>Banka Hesapları ve Para Akışı</h2>
          <p style={{ margin: 0, opacity: 0.95 }}>Para giriş/çıkış, EFT, havale ve bankalar arası transfer işlemlerini buradan yönetin.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Card title="Banka Hesabı" value={String(accounts.length)} accent="#0f172a" />
          <Card title="Toplam Bakiye" value={`${totalBalance.toLocaleString("tr-TR")} TL`} accent="#0f766e" />
          <Card title="Toplam İşlem" value={String(transactions.length)} accent="#1d4ed8" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
          <section style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Banka Hesabı Ekle</h3>
            <form onSubmit={handleCreateAccount} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <input
                placeholder="Hesap adı (ör. Ziraat TL)"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                style={inputStyle}
              />
              <select value={newAccountCurrency} onChange={(e) => setNewAccountCurrency(e.target.value)} style={inputStyle}>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <button type="submit" style={primaryButtonStyle} disabled={creatingAccount}>
                {creatingAccount ? "Kaydediliyor..." : "Hesabı Kaydet"}
              </button>
            </form>

            <h3 style={{ marginTop: 0 }}>Banka Hareketi</h3>
            <form onSubmit={handleCreateTransaction} style={{ display: "grid", gap: 10 }}>
              <select value={form.operation} onChange={(e) => handleOperationChange(e.target.value)} style={inputStyle}>
                {OPERATION_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              {needsFrom && (
                <select
                  value={form.fromAccountId}
                  onChange={(e) => setForm((prev) => ({ ...prev, fromAccountId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Kaynak hesap seçiniz</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({Number(account.balance || 0).toLocaleString("tr-TR")} TL)
                    </option>
                  ))}
                </select>
              )}

              {needsTo && (
                <select
                  value={form.toAccountId}
                  onChange={(e) => setForm((prev) => ({ ...prev, toAccountId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Hedef hesap seçiniz</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({Number(account.balance || 0).toLocaleString("tr-TR")} TL)
                    </option>
                  ))}
                </select>
              )}

              <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} />
              <input
                placeholder="Belge No"
                value={form.documentNo}
                onChange={(e) => setForm((prev) => ({ ...prev, documentNo: e.target.value }))}
                style={inputStyle}
              />
              <textarea
                rows={3}
                placeholder="Açıklama"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Tutar"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                style={inputStyle}
              />

              <button type="submit" style={primaryButtonStyle} disabled={saving}>
                {saving ? "Kaydediliyor..." : "İşlemi Kaydet"}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Banka Hesapları</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={downloadPdf} style={secondaryButtonStyle}>PDF</button>
                <button type="button" onClick={downloadExcel} style={secondaryButtonStyle}>Excel</button>
              </div>
            </div>

            <form onSubmit={handleFilter} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              <button type="submit" style={secondaryButtonStyle}>Filtrele</button>
              <button type="button" onClick={clearFilter} style={secondaryButtonStyle}>Temizle</button>
            </form>

            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {accounts.map((account) => (
                <div key={account._id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{account.name}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{account.currency} • {Number(account.balance || 0).toLocaleString("tr-TR")} TL</div>
                </div>
              ))}
              {accounts.length === 0 && <div style={{ color: "#64748b" }}>Henüz banka hesabı yok.</div>}
            </div>

            <h3 style={{ marginTop: 0 }}>Son Banka Hareketleri</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                    <th style={thStyle}>Tarih</th>
                    <th style={thStyle}>Belge No</th>
                    <th style={thStyle}>İşlem</th>
                    <th style={thStyle}>Kaynak</th>
                    <th style={thStyle}>Hedef</th>
                    <th style={thStyle}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: 12 }}>Yükleniyor...</td>
                    </tr>
                  ) : transactions.length > 0 ? (
                    transactions.map((item) => (
                      <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>{new Date(item.date).toLocaleDateString("tr-TR")}</td>
                        <td style={tdStyle}>{item.documentNo || "-"}</td>
                        <td style={tdStyle}>{formatOperation(item.operation)}</td>
                        <td style={tdStyle}>{item.fromAccountId?.name || "-"}</td>
                        <td style={tdStyle}>{item.toAccountId?.name || "-"}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(item.amount || 0).toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: 12, color: "#64748b" }}>Henüz banka hareketi yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function Card({ title, value, accent }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 14 }}>
      <div style={{ fontSize: 13, color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function formatOperation(value) {
  const found = OPERATION_OPTIONS.find((item) => item.value === value);
  return found?.label || "İşlem";
}

const panelStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 28px rgba(15,23,42,0.06)",
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 13,
};

const tdStyle = {
  padding: "10px 12px",
  fontSize: 14,
};

export default Bank;
