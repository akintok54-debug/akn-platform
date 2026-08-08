import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const OPERATION_OPTIONS = [
  { value: "KASA_GIRIS", label: "Kasa Giriş" },
  { value: "KASA_CIKIS", label: "Kasa Çıkış" },
  { value: "KASA_TRANSFERI", label: "Kasa Transferi" },
];

const TRANSACTION_TYPES = [
  { value: "TAHSILAT", label: "Tahsilat" },
  { value: "PESIN_SATIS", label: "Peşin Satış" },
  { value: "PERSONEL_AVANSI", label: "Personel Avansı" },
  { value: "KARGO", label: "Kargo" },
  { value: "ELEKTRIK", label: "Elektrik" },
  { value: "KIRA", label: "Kira" },
  { value: "YEMEK", label: "Yemek" },
  { value: "BANKAYA_PARA_AKTAR", label: "Bankaya Para Aktar" },
  { value: "BANKADAN_PARA_AL", label: "Bankadan Para Al" },
  { value: "DIGER", label: "Diğer" },
];

function Cash() {
  const [transactions, setTransactions] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    operation: "KASA_GIRIS",
    transactionType: "TAHSILAT",
    transferDirection: "YOK",
    date: new Date().toISOString().slice(0, 10),
    documentNo: "",
    description: "",
    amount: "",
  });

  const fetchTransactions = async (dateFilters = { startDate, endDate }) => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilters.startDate) params.startDate = dateFilters.startDate;
      if (dateFilters.endDate) params.endDate = dateFilters.endDate;

      const response = await api.get("/cash/transactions", { params });
      const list = response?.data?.transactions || [];
      setTransactions(Array.isArray(list) ? list : []);
      setCashBalance(Number(response?.data?.cashBalance || 0));
      setBankBalance(Number(response?.data?.bankBalance || 0));
    } catch (error) {
      console.error(error);
      alert("Kasa hareketleri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions({ startDate: "", endDate: "" });
  }, []);

  const handleOperationChange = (nextOperation) => {
    const next = { ...form, operation: nextOperation };
    if (nextOperation === "KASA_TRANSFERI") {
      next.transferDirection = "BANKAYA";
      next.transactionType = "BANKAYA_PARA_AKTAR";
    } else {
      next.transferDirection = "YOK";
      next.transactionType = nextOperation === "KASA_GIRIS" ? "TAHSILAT" : "DIGER";
    }
    setForm(next);
  };

  const handleTransferDirectionChange = (direction) => {
    setForm((prev) => ({
      ...prev,
      transferDirection: direction,
      transactionType: direction === "BANKAYA" ? "BANKAYA_PARA_AKTAR" : "BANKADAN_PARA_AL",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/cash/transactions", {
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
      await fetchTransactions({ startDate, endDate });
      alert("Kasa hareketi kaydedildi.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Kasa hareketi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchTransactions({ startDate, endDate });
  };

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        acc.in += Number(item.cashIn || 0);
        acc.out += Number(item.cashOut || 0);
        return acc;
      },
      { in: 0, out: 0 }
    );
  }, [transactions]);

  const downloadExcel = () => {
    const header = ["Tarih", "Belge No", "Açıklama", "Giriş", "Çıkış", "Bakiye"];
    const rows = transactions.map((item) => [
      formatDate(item.date),
      item.documentNo || "",
      `${formatOperation(item.operation)} - ${formatType(item.transactionType)}${item.description ? ` (${item.description})` : ""}`,
      Number(item.cashIn || 0).toFixed(2),
      Number(item.cashOut || 0).toFixed(2),
      Number(item.balance || 0).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kasa-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <td>${formatDate(item.date)}</td>
            <td>${item.documentNo || ""}</td>
            <td>${formatOperation(item.operation)} - ${formatType(item.transactionType)}${item.description ? ` (${item.description})` : ""}</td>
            <td style="text-align:right;">${Number(item.cashIn || 0).toLocaleString("tr-TR")} TL</td>
            <td style="text-align:right;">${Number(item.cashOut || 0).toLocaleString("tr-TR")} TL</td>
            <td style="text-align:right;">${Number(item.balance || 0).toLocaleString("tr-TR")} TL</td>
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
          <title>Kasa Raporu</title>
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
          <h1>Kasa Raporu</h1>
          <div class="meta">Nakit Bakiye: ${cashBalance.toLocaleString("tr-TR")} TL | Banka Bakiye: ${bankBalance.toLocaleString("tr-TR")} TL</div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Belge No</th>
                <th>Açıklama</th>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th>Bakiye</th>
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

  const typeOptions = useMemo(() => {
    if (form.operation === "KASA_TRANSFERI") {
      return form.transferDirection === "BANKAYA"
        ? TRANSACTION_TYPES.filter((item) => item.value === "BANKAYA_PARA_AKTAR")
        : TRANSACTION_TYPES.filter((item) => item.value === "BANKADAN_PARA_AL");
    }
    if (form.operation === "KASA_GIRIS") {
      return TRANSACTION_TYPES.filter((item) => ["TAHSILAT", "PESIN_SATIS", "DIGER"].includes(item.value));
    }
    return TRANSACTION_TYPES.filter((item) => ["PERSONEL_AVANSI", "KARGO", "ELEKTRIK", "KIRA", "YEMEK", "DIGER"].includes(item.value));
  }, [form.operation, form.transferDirection]);

  return (
    <Layout>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg, #102a43 0%, #1f6f8b 100%)", color: "#fff", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.85 }}>Kasa Modülü</div>
          <h2 style={{ margin: "6px 0 8px" }}>Kasa Giriş, Çıkış ve Transfer Yönetimi</h2>
          <p style={{ margin: 0, opacity: 0.95 }}>Tahsilat ve gider hareketlerini kaydedin, banka-kasa transferlerini takip edin, raporları PDF/Excel olarak alın.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Card title="Kasa Bakiye" value={`${cashBalance.toLocaleString("tr-TR")} TL`} accent="#0f172a" />
          <Card title="Banka Bakiye" value={`${bankBalance.toLocaleString("tr-TR")} TL`} accent="#0f766e" />
          <Card title="Toplam Giriş" value={`${totals.in.toLocaleString("tr-TR")} TL`} accent="#166534" />
          <Card title="Toplam Çıkış" value={`${totals.out.toLocaleString("tr-TR")} TL`} accent="#b91c1c" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 16 }}>
          <section style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>İşlem Ekle</h3>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
              <label style={labelStyle}>
                İşlem
                <select value={form.operation} onChange={(e) => handleOperationChange(e.target.value)} style={inputStyle}>
                  {OPERATION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.operation === "KASA_TRANSFERI" && (
                <label style={labelStyle}>
                  Transfer Yönü
                  <select value={form.transferDirection} onChange={(e) => handleTransferDirectionChange(e.target.value)} style={inputStyle}>
                    <option value="BANKAYA">Bankaya Para Aktar</option>
                    <option value="BANKADAN">Bankadan Para Al</option>
                  </select>
                </label>
              )}

              <label style={labelStyle}>
                İşlem Türü
                <select
                  value={form.transactionType}
                  onChange={(e) => setForm((prev) => ({ ...prev, transactionType: e.target.value }))}
                  style={inputStyle}
                >
                  {typeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Tarih
                <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Belge No
                <input value={form.documentNo} onChange={(e) => setForm((prev) => ({ ...prev, documentNo: e.target.value }))} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Açıklama
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>

              <label style={labelStyle}>
                Tutar
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <button type="submit" disabled={saving} style={primaryButtonStyle}>
                {saving ? "Kaydediliyor..." : "Hareketi Kaydet"}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Kasa Hareket Listesi</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={downloadPdf} style={secondaryButtonStyle}>PDF</button>
                <button onClick={downloadExcel} style={secondaryButtonStyle}>Excel</button>
              </div>
            </div>

            <form onSubmit={handleFilter} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              <button type="submit" style={secondaryButtonStyle}>Filtrele</button>
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  fetchTransactions({ startDate: "", endDate: "" });
                }}
                style={secondaryButtonStyle}
              >
                Temizle
              </button>
            </form>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                    <th style={thStyle}>Tarih</th>
                    <th style={thStyle}>Belge No</th>
                    <th style={thStyle}>Açıklama</th>
                    <th style={thStyle}>Giriş</th>
                    <th style={thStyle}>Çıkış</th>
                    <th style={thStyle}>Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: 16 }}>Yükleniyor...</td>
                    </tr>
                  ) : transactions.length > 0 ? (
                    transactions.map((item) => (
                      <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>{formatDate(item.date)}</td>
                        <td style={tdStyle}>{item.documentNo || "-"}</td>
                        <td style={tdStyle}>
                          <div>{formatOperation(item.operation)} - {formatType(item.transactionType)}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{item.description || "-"}</div>
                        </td>
                        <td style={{ ...tdStyle, color: "#166534", fontWeight: 700 }}>
                          {Number(item.cashIn || 0) > 0 ? `${Number(item.cashIn || 0).toLocaleString("tr-TR")} TL` : "-"}
                        </td>
                        <td style={{ ...tdStyle, color: "#b91c1c", fontWeight: 700 }}>
                          {Number(item.cashOut || 0) > 0 ? `${Number(item.cashOut || 0).toLocaleString("tr-TR")} TL` : "-"}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(item.balance || 0).toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: 16, color: "#64748b" }}>Kayıt bulunamadı.</td>
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
    <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
      <div style={{ marginTop: 4, fontWeight: 800, fontSize: 24, color: accent }}>{value}</div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 28px rgba(15,23,42,0.06)",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "#475569",
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 13,
};

const tdStyle = {
  padding: "10px 12px",
  fontSize: 14,
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

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function formatType(value) {
  const found = TRANSACTION_TYPES.find((item) => item.value === value);
  return found?.label || "Diğer";
}

function formatOperation(value) {
  const found = OPERATION_OPTIONS.find((item) => item.value === value);
  return found?.label || "İşlem";
}

export default Cash;
