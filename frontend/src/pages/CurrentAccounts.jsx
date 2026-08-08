import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const TRANSACTION_TYPES = [
  { value: "BORC", label: "Borç" },
  { value: "ALACAK", label: "Alacak" },
  { value: "TAHSILAT", label: "Tahsilat" },
  { value: "ODEME", label: "Ödeme" },
];

function CurrentAccounts() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [form, setForm] = useState({
    type: "BORC",
    amount: "",
    description: "",
  });

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers");
      const list = response?.data?.customers || response?.data?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      setCustomers(normalized);
      if (!selectedCustomerId && normalized.length > 0) {
        setSelectedCustomerId(normalized[0]._id || normalized[0].id);
      }
    } catch (error) {
      console.error(error);
      alert("Cari kartlar alınamadı.");
    }
  };

  const fetchLedger = async (customerId) => {
    if (!customerId) {
      setLedgerData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/customers/${customerId}/ledger`);
      setLedgerData(response?.data || null);
    } catch (error) {
      console.error(error);
      alert("Cari hareketleri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedger(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    setSaving(true);
    try {
      await api.post(`/customers/${selectedCustomerId}/transactions`, {
        type: form.type,
        amount: Number(form.amount || 0),
        description: form.description,
      });
      setForm({ type: "BORC", amount: "", description: "" });
      await fetchLedger(selectedCustomerId);
      await fetchCustomers();
      alert("Cari hareket kaydedildi.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Cari hareket kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const filteredLedger = useMemo(() => {
    const ledger = ledgerData?.ledger || [];
    return ledger.filter((row) => {
      const rowDate = row.date ? new Date(row.date) : null;
      const normalizedType = String(row.type || "").toUpperCase();

      const matchType = typeFilter === "ALL" ? true : normalizedType === typeFilter;
      const matchStart = startDate
        ? rowDate
          ? new Date(rowDate.toDateString()) >= new Date(new Date(startDate).toDateString())
          : false
        : true;
      const matchEnd = endDate
        ? rowDate
          ? new Date(rowDate.toDateString()) <= new Date(new Date(endDate).toDateString())
          : false
        : true;

      return matchType && matchStart && matchEnd;
    });
  }, [ledgerData, startDate, endDate, typeFilter]);

  const summary = useMemo(() => {
    const ledger = filteredLedger;
    return ledger.reduce(
      (acc, row) => {
        acc.borc += Number(row.borc || 0);
        acc.alacak += Number(row.alacak || 0);
        if (row.type === "TAHSILAT") acc.tahsilat += Number(row.alacak || 0);
        if (row.type === "ODEME") acc.odeme += Number(row.alacak || 0);
        return acc;
      },
      { borc: 0, alacak: 0, tahsilat: 0, odeme: 0 }
    );
  }, [filteredLedger]);

  const selectedCustomer = useMemo(
    () => customers.find((item) => (item._id || item.id) === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const exportExcel = () => {
    const rows = filteredLedger;
    const header = ["Tarih", "Belge", "Açıklama", "Borç", "Alacak", "Bakiye"];
    const dataRows = rows.map((item) => [
      formatDate(item.date),
      item.type,
      item.description || "",
      Number(item.borc || 0).toFixed(2),
      Number(item.alacak || 0).toFixed(2),
      Number(item.balance || 0).toFixed(2),
    ]);

    const csv = [header, ...dataRows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cari-ekstre-${(ledgerData?.customer?.companyName || "musteri").replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = filteredLedger;
    const htmlRows = rows
      .map(
        (item) => `
        <tr>
          <td>${formatDate(item.date)}</td>
          <td>${item.type}</td>
          <td>${item.description || ""}</td>
          <td style="text-align:right;">${Number(item.borc || 0).toLocaleString("tr-TR")} TL</td>
          <td style="text-align:right;">${Number(item.alacak || 0).toLocaleString("tr-TR")} TL</td>
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
          <title>Cari Hesap Ekstresi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 8px; }
            .meta { margin-bottom: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Cari Hesap Ekstresi</h1>
          <div class="meta">Cari Kart: ${ledgerData?.customer?.companyName || "-"}</div>
          <div class="meta">Güncel Bakiye: ${Number(ledgerData?.currentBalance || 0).toLocaleString("tr-TR")} TL</div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Açıklama</th>
                <th>Borç</th>
                <th>Alacak</th>
                <th>Bakiye</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
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
        <div style={{ background: "linear-gradient(135deg, #182848 0%, #4b6cb7 100%)", color: "#fff", borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.85 }}>Cari Hesap</div>
          <h2 style={{ margin: "8px 0" }}>Cari Kartı, Hareketleri ve Hesap Ekstresi</h2>
          <p style={{ margin: 0, opacity: 0.95 }}>Borç, alacak, tahsilat ve ödeme hareketlerini yönetin; PDF ve Excel çıktısı alın.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <Card title="Borç" value={`${summary.borc.toLocaleString("tr-TR")} TL`} color="#1d4ed8" />
          <Card title="Alacak" value={`${summary.alacak.toLocaleString("tr-TR")} TL`} color="#16a34a" />
          <Card title="Tahsilat" value={`${summary.tahsilat.toLocaleString("tr-TR")} TL`} color="#0f766e" />
          <Card title="Ödeme" value={`${summary.odeme.toLocaleString("tr-TR")} TL`} color="#b45309" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
          <section style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Cari Kartı ve Hareket</h3>
            <label style={labelStyle}>
              Cari Kart
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={inputStyle}>
                <option value="">Cari seçiniz</option>
                {customers.map((customer) => (
                  <option key={customer._id || customer.id} value={customer._id || customer.id}>
                    {(customer.companyName || customer.name || "-")} • {customer.customerCode || customer.code || "-"}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: 10, padding: 10, border: "1px solid #e5e7eb", borderRadius: 10, background: "#f8fafc" }}>
              <div style={{ fontWeight: 700 }}>{selectedCustomer?.companyName || selectedCustomer?.name || "-"}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Telefon: {selectedCustomer?.phone || "-"}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Vergi No: {selectedCustomer?.taxNumber || "-"}</div>
            </div>

            <form onSubmit={handleCreateTransaction} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <label style={labelStyle}>
                İşlem Türü
                <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} style={inputStyle}>
                  {TRANSACTION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
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

              <label style={labelStyle}>
                Açıklama
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>

              <button type="submit" disabled={saving || !selectedCustomerId} style={primaryButtonStyle}>
                {saving ? "Kaydediliyor..." : "Hareket Kaydet"}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Hesap Ekstresi</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={exportPdf} style={secondaryButtonStyle}>PDF</button>
                <button type="button" onClick={exportExcel} style={secondaryButtonStyle}>Excel</button>
              </div>
            </div>

            <div style={{ marginTop: 10, color: "#475569", fontSize: 14 }}>
              Açılış Bakiye: <strong>{Number(ledgerData?.openingBalance || 0).toLocaleString("tr-TR")} TL</strong> • Güncel Bakiye: <strong>{Number(ledgerData?.currentBalance || 0).toLocaleString("tr-TR")} TL</strong>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
                <option value="ALL">Tüm İşlem Türleri</option>
                <option value="BORC">Borç</option>
                <option value="ALACAK">Alacak</option>
                <option value="TAHSILAT">Tahsilat</option>
                <option value="ODEME">Ödeme</option>
                <option value="ORDER">Sipariş</option>
                <option value="INVOICE">Fatura</option>
              </select>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setTypeFilter("ALL");
                }}
              >
                Filtreyi Temizle
              </button>
            </div>

            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#64748b", textAlign: "left" }}>
                    <th style={thStyle}>Tarih</th>
                    <th style={thStyle}>Tür</th>
                    <th style={thStyle}>Açıklama</th>
                    <th style={thStyle}>Borç</th>
                    <th style={thStyle}>Alacak</th>
                    <th style={thStyle}>Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: 12 }}>Yükleniyor...</td>
                    </tr>
                  ) : filteredLedger.length > 0 ? (
                    filteredLedger.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={tdStyle}>{formatDate(row.date)}</td>
                        <td style={tdStyle}>{row.type}</td>
                        <td style={tdStyle}>{row.description || "-"}</td>
                        <td style={{ ...tdStyle, color: "#1d4ed8", fontWeight: 700 }}>
                          {Number(row.borc || 0) > 0 ? `${Number(row.borc || 0).toLocaleString("tr-TR")} TL` : "-"}
                        </td>
                        <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 700 }}>
                          {Number(row.alacak || 0) > 0 ? `${Number(row.alacak || 0).toLocaleString("tr-TR")} TL` : "-"}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(row.balance || 0).toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: 12, color: "#64748b" }}>Henüz cari hareket yok.</td>
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

function Card({ title, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
      <div style={{ fontSize: 13, color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
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

export default CurrentAccounts;
