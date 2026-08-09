import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

const MOVEMENT_TYPES = [
  { value: "STOK_GIRIS", label: "Stok Giriş" },
  { value: "STOK_CIKIS", label: "Stok Çıkış" },
  { value: "SAYIM", label: "Sayım" },
];

function Stock() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({ totalProduct: 0, totalStock: 0, criticalStockCount: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [warehouseForm, setWarehouseForm] = useState({ name: "", isDefault: false });
  const [movementForm, setMovementForm] = useState({
    productId: "",
    warehouseId: "",
    movementType: "STOK_GIRIS",
    quantity: "",
    countStock: "",
    description: "",
    movementDate: new Date().toISOString().slice(0, 10),
  });

  const fetchOverview = async () => {
    try {
      const response = await api.get("/stock/overview");
      setProducts(response?.data?.products || []);
      setWarehouses(response?.data?.warehouses || []);
      setSummary(response?.data?.summary || { totalProduct: 0, totalStock: 0, criticalStockCount: 0 });
    } catch (error) {
      console.error(error);
      alert("Stok özeti alınamadı.");
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const response = await api.get("/stock/movements");
      setMovements(response?.data?.movements || []);
    } catch (error) {
      console.error(error);
      alert("Stok hareket geçmişi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchOverview(), fetchMovements()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await api.post("/stock/warehouses", {
        name: warehouseForm.name,
        isDefault: warehouseForm.isDefault,
      });
      setWarehouseForm({ name: "", isDefault: false });
      await fetchOverview();
      alert("Depo eklendi.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Depo eklenemedi.");
    }
  };

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/stock/movements", {
        ...movementForm,
        quantity: Number(movementForm.quantity || 0),
        countStock: Number(movementForm.countStock || 0),
      });
      setMovementForm((prev) => ({
        ...prev,
        quantity: "",
        countStock: "",
        description: "",
        movementDate: new Date().toISOString().slice(0, 10),
      }));
      await refreshAll();
      alert("Stok hareketi kaydedildi.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Stok hareketi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const sku = String(item.sku || "").toLowerCase();
      const barcode = String(item.barcode || "").toLowerCase();
      return name.includes(term) || sku.includes(term) || barcode.includes(term);
    });
  }, [products, searchTerm]);

  const criticalProducts = useMemo(() => products.filter((item) => item.critical), [products]);

  const exportCriticalStockExcel = () => {
    const rows = filteredProducts.filter((item) => item.critical);
    const header = ["Urun", "SKU/Barkod", "Stok", "Min Stok", "Durum"];
    const data = rows.map((item) => [
      item.name || "",
      item.sku || item.barcode || "",
      Number(item.stock || 0).toString(),
      Number(item.minStock || 0).toString(),
      "Kritik",
    ]);

    const csv = [header, ...data]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kritik-stok-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCriticalStockPdf = () => {
    const rows = filteredProducts.filter((item) => item.critical);
    const htmlRows = rows
      .map(
        (item) => `
          <tr>
            <td>${item.name || ""}</td>
            <td>${item.sku || item.barcode || ""}</td>
            <td style="text-align:right;">${Number(item.stock || 0).toLocaleString("tr-TR")}</td>
            <td style="text-align:right;">${Number(item.minStock || 0).toLocaleString("tr-TR")}</td>
            <td>Kritik</td>
          </tr>
        `
      )
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      alert("PDF ciktisi icin acilir pencere izni veriniz.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Kritik Stok Raporu</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Kritik Stok Raporu</h1>
          <table>
            <thead>
              <tr>
                <th>Urun</th>
                <th>SKU/Barkod</th>
                <th>Stok</th>
                <th>Min Stok</th>
                <th>Durum</th>
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

  const exportMovementExcel = () => {
    const header = ["Tarih", "Hareket", "Urun", "Depo", "Miktar", "Onceki", "Yeni", "Aciklama"];
    const data = movements.map((item) => [
      new Date(item.movementDate || item.createdAt).toLocaleString("tr-TR"),
      formatMovementType(item.movementType),
      item.productId?.name || "",
      item.warehouseId?.name || "",
      Number(item.quantity || 0).toString(),
      Number(item.previousStock || 0).toString(),
      Number(item.newStock || 0).toString(),
      item.description || "",
    ]);

    const csv = [header, ...data]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stok-hareket-gecmisi-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportMovementPdf = () => {
    const htmlRows = movements
      .map(
        (item) => `
          <tr>
            <td>${new Date(item.movementDate || item.createdAt).toLocaleString("tr-TR")}</td>
            <td>${formatMovementType(item.movementType)}</td>
            <td>${item.productId?.name || ""}</td>
            <td>${item.warehouseId?.name || ""}</td>
            <td style="text-align:right;">${Number(item.quantity || 0).toLocaleString("tr-TR")}</td>
            <td style="text-align:right;">${Number(item.previousStock || 0).toLocaleString("tr-TR")}</td>
            <td style="text-align:right;">${Number(item.newStock || 0).toLocaleString("tr-TR")}</td>
            <td>${item.description || ""}</td>
          </tr>
        `
      )
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      alert("PDF ciktisi icin acilir pencere izni veriniz.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Stok Hareket Gecmisi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Stok Hareket Gecmisi</h1>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hareket</th>
                <th>Urun</th>
                <th>Depo</th>
                <th>Miktar</th>
                <th>Onceki</th>
                <th>Yeni</th>
                <th>Aciklama</th>
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
        <div style={{ background: "linear-gradient(135deg, #0b132b 0%, #1c4e80 100%)", color: "#fff", borderRadius: 20, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.85 }}>Stok Modülü</div>
            <h2 style={{ margin: "8px 0" }}>Stok Giriş, Çıkış, Sayım ve Depo Yönetimi</h2>
            <p style={{ margin: 0, opacity: 0.95 }}>Kritik stokları takip edin, hareket geçmişini izleyin ve depo bazlı operasyonları yönetin.</p>
          </div>
          <button onClick={() => navigate('/reports/stock')} style={{ padding: "10px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
            📊 Stok Raporu
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Card title="Toplam Ürün" value={`${summary.totalProduct || 0}`} color="#1d4ed8" />
          <Card title="Toplam Stok" value={`${Number(summary.totalStock || 0).toLocaleString("tr-TR")}`} color="#0f766e" />
          <Card title="Kritik Stok" value={`${summary.criticalStockCount || 0}`} color="#dc2626" />
          <Card title="Depo" value={`${warehouses.length}`} color="#7c3aed" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
          <section style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Depolar</h3>
            <form onSubmit={handleCreateWarehouse} style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Depo adı"
                style={inputStyle}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "#334155" }}>
                <input
                  type="checkbox"
                  checked={warehouseForm.isDefault}
                  onChange={(e) => setWarehouseForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                />
                Varsayılan depo
              </label>
              <button type="submit" style={primaryButtonStyle}>Depo Ekle</button>
            </form>

            <div style={{ display: "grid", gap: 8 }}>
              {warehouses.map((warehouse) => (
                <div key={warehouse._id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{warehouse.name}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{warehouse.isDefault ? "Varsayılan" : "Standart"}</div>
                </div>
              ))}
              {warehouses.length === 0 && <div style={{ color: "#64748b" }}>Henüz depo yok.</div>}
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Stok İşlemleri</h3>
            <form onSubmit={handleCreateMovement} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <select value={movementForm.productId} onChange={(e) => setMovementForm((prev) => ({ ...prev, productId: e.target.value }))} style={inputStyle}>
                <option value="">Ürün seçiniz</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name} ({product.stock})</option>
                ))}
              </select>

              <select value={movementForm.warehouseId} onChange={(e) => setMovementForm((prev) => ({ ...prev, warehouseId: e.target.value }))} style={inputStyle}>
                <option value="">Depo seçiniz</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>
                ))}
              </select>

              <select value={movementForm.movementType} onChange={(e) => setMovementForm((prev) => ({ ...prev, movementType: e.target.value }))} style={inputStyle}>
                {MOVEMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              {movementForm.movementType === "SAYIM" ? (
                <input
                  type="number"
                  min="0"
                  placeholder="Sayım sonucu stok"
                  value={movementForm.countStock}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, countStock: e.target.value }))}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  placeholder="Miktar"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  style={inputStyle}
                />
              )}

              <input type="date" value={movementForm.movementDate} onChange={(e) => setMovementForm((prev) => ({ ...prev, movementDate: e.target.value }))} style={inputStyle} />

              <input
                placeholder="Açıklama"
                value={movementForm.description}
                onChange={(e) => setMovementForm((prev) => ({ ...prev, description: e.target.value }))}
                style={inputStyle}
              />

              <button type="submit" style={primaryButtonStyle} disabled={saving}>
                {saving ? "Kaydediliyor..." : "İşlemi Kaydet"}
              </button>
            </form>
          </section>
        </div>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Kritik Stok</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün, SKU, barkod ara"
                style={{ ...inputStyle, width: 300 }}
              />
              <button type="button" onClick={exportCriticalStockPdf} style={secondaryButtonStyle}>PDF</button>
              <button type="button" onClick={exportCriticalStockExcel} style={secondaryButtonStyle}>Excel</button>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#64748b" }}>
                  <th style={thStyle}>Ürün</th>
                  <th style={thStyle}>SKU / Barkod</th>
                  <th style={thStyle}>Stok</th>
                  <th style={thStyle}>Min Stok</th>
                  <th style={thStyle}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item) => (
                  <tr key={item._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.sku || item.barcode || "-"}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{item.stock}</td>
                    <td style={tdStyle}>{item.minStock}</td>
                    <td style={tdStyle}>
                      {item.critical ? (
                        <span style={criticalBadgeStyle}>Kritik</span>
                      ) : (
                        <span style={okBadgeStyle}>Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: 12, color: "#64748b" }}>Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Hareket Geçmişi</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={exportMovementPdf} style={secondaryButtonStyle}>PDF</button>
              <button type="button" onClick={exportMovementExcel} style={secondaryButtonStyle}>Excel</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#64748b" }}>
                  <th style={thStyle}>Tarih</th>
                  <th style={thStyle}>Hareket</th>
                  <th style={thStyle}>Ürün</th>
                  <th style={thStyle}>Depo</th>
                  <th style={thStyle}>Miktar</th>
                  <th style={thStyle}>Önceki</th>
                  <th style={thStyle}>Yeni</th>
                  <th style={thStyle}>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ padding: 12 }}>Yükleniyor...</td>
                  </tr>
                ) : movements.length > 0 ? (
                  movements.map((item) => (
                    <tr key={item._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{new Date(item.movementDate || item.createdAt).toLocaleString("tr-TR")}</td>
                      <td style={tdStyle}>{formatMovementType(item.movementType)}</td>
                      <td style={tdStyle}>{item.productId?.name || "-"}</td>
                      <td style={tdStyle}>{item.warehouseId?.name || "-"}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(item.quantity || 0)}</td>
                      <td style={tdStyle}>{Number(item.previousStock || 0)}</td>
                      <td style={tdStyle}>{Number(item.newStock || 0)}</td>
                      <td style={tdStyle}>{item.description || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ padding: 12, color: "#64748b" }}>Henüz stok hareketi yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {criticalProducts.length > 0 && (
          <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: 12, color: "#9a3412" }}>
            Kritik stok uyarısı: {criticalProducts.length} ürün min stok seviyesinde veya altında.
          </div>
        )}
      </div>
    </Layout>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 6, fontWeight: 800, fontSize: 24, color }}>{value}</div>
    </div>
  );
}

function formatMovementType(value) {
  const found = MOVEMENT_TYPES.find((item) => item.value === value);
  return found?.label || value;
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

const criticalBadgeStyle = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const okBadgeStyle = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

export default Stock;