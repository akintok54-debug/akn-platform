import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import PurchaseInvoiceModal from "../components/PurchaseInvoiceModal";
const initialForm = {
  code: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  taxOffice: "",
  category: "",
  notes: "",
  status: "active",
  bankInfo: {
    bankName: "",
    accountHolder: "",
    iban: "",
    accountNumber: "",
    branchCode: "",
  },
};

function Suppliers() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState(initialForm);
const [showPurchaseInvoice, setShowPurchaseInvoice] = useState(false);
const [selectedSupplier, setSelectedSupplier] = useState(null);
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/suppliers", { params: { limit: 200 } });
      setSuppliers(response?.data?.suppliers || []);
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Tedarikci listesi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const categories = useMemo(() => {
    const all = suppliers.map((item) => String(item.category || "").trim()).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b, "tr"));
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const term = String(searchTerm || "").trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.code,
        supplier.name,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.taxNumber,
        supplier.category,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus = statusFilter === "all" ? true : supplier.status === statusFilter;
      const matchesCategory = categoryFilter === "all" ? true : String(supplier.category || "") === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [suppliers, searchTerm, statusFilter, categoryFilter]);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingSupplier(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code || "",
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      taxNumber: supplier.taxNumber || "",
      taxOffice: supplier.taxOffice || "",
      category: supplier.category || "",
      notes: supplier.notes || "",
      status: supplier.status || (supplier.isActive === false ? "inactive" : "active"),
      bankInfo: {
        bankName: supplier.bankInfo?.bankName || "",
        accountHolder: supplier.bankInfo?.accountHolder || "",
        iban: supplier.bankInfo?.iban || "",
        accountNumber: supplier.bankInfo?.accountNumber || "",
        branchCode: supplier.bankInfo?.branchCode || "",
      },
    });
    setShowForm(true);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      bankInfo: {
        ...prev.bankInfo,
        [name]: value,
      },
    }));
  };

  const validateForm = () => {
    if (!String(formData.name || "").trim()) {
      return "Firma adi zorunludur.";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Gecerli bir e-posta giriniz.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const payload = {
      ...formData,
      code: String(formData.code || "").trim(),
      name: String(formData.name || "").trim(),
      contactPerson: String(formData.contactPerson || "").trim(),
      phone: String(formData.phone || "").trim(),
      email: String(formData.email || "").trim(),
      address: String(formData.address || "").trim(),
      taxNumber: String(formData.taxNumber || "").trim(),
      taxOffice: String(formData.taxOffice || "").trim(),
      category: String(formData.category || "").trim(),
      notes: String(formData.notes || "").trim(),
      status: formData.status === "inactive" ? "inactive" : "active",
      bankInfo: {
        bankName: String(formData.bankInfo.bankName || "").trim(),
        accountHolder: String(formData.bankInfo.accountHolder || "").trim(),
        iban: String(formData.bankInfo.iban || "").trim(),
        accountNumber: String(formData.bankInfo.accountNumber || "").trim(),
        branchCode: String(formData.bankInfo.branchCode || "").trim(),
      },
    };

    try {
      if (editingSupplier?._id) {
        await api.put(`/suppliers/${editingSupplier._id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }
      await fetchSuppliers();
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMessage(error?.response?.data?.message || "Kayit islemi basarisiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplierId) => {
    if (!supplierId) return;
    if (!window.confirm("Bu tedarikciyi silmek istediginize emin misiniz?")) return;

    try {
      await api.delete(`/suppliers/${supplierId}`);
      await fetchSuppliers();
    } catch (error) {
      console.error(error);
      setErrorMessage(error?.response?.data?.message || "Tedarikci silinemedi.");
    }
  };

  return (
    <Layout>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "linear-gradient(135deg, #1b1f3a 0%, #0f766e 100%)", color: "#fff", borderRadius: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.85 }}>Tedarikciler Modulu</div>
              <h2 style={{ margin: "8px 0" }}>Tedarikci Yonetimi</h2>
              <p style={{ margin: 0, opacity: 0.95 }}>Listeleme, filtreleme, detay, duzenleme ve silme islemlerini tek ekrandan yonetin.</p>
            </div>
            <button onClick={openCreate} style={primaryButtonStyle}>+ Yeni Tedarikci</button>
          </div>
        </div>

        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        {showForm ? (
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{editingSupplier ? "Tedarikci Duzenle" : "Yeni Tedarikci"}</h3>
              <button type="button" onClick={resetForm} style={closeButtonStyle}>Kapat</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
              <div style={grid2Style}>
                <input name="code" value={formData.code} onChange={handleFieldChange} placeholder="Tedarikci kodu" style={inputStyle} />
                <input name="name" value={formData.name} onChange={handleFieldChange} placeholder="Firma adi *" style={inputStyle} required />
              </div>

              <div style={grid2Style}>
                <input name="contactPerson" value={formData.contactPerson} onChange={handleFieldChange} placeholder="Yetkili kisi" style={inputStyle} />
                <input name="phone" value={formData.phone} onChange={handleFieldChange} placeholder="Telefon" style={inputStyle} />
              </div>

              <div style={grid2Style}>
                <input name="email" value={formData.email} onChange={handleFieldChange} placeholder="E-posta" style={inputStyle} />
                <input name="taxNumber" value={formData.taxNumber} onChange={handleFieldChange} placeholder="Vergi numarasi" style={inputStyle} />
              </div>

              <div style={grid2Style}>
                <input name="taxOffice" value={formData.taxOffice} onChange={handleFieldChange} placeholder="Vergi dairesi" style={inputStyle} />
                <input name="category" value={formData.category} onChange={handleFieldChange} placeholder="Urun/hizmet kategorisi" style={inputStyle} />
              </div>

              <textarea name="address" value={formData.address} onChange={handleFieldChange} rows={3} placeholder="Adres" style={inputStyle} />
              <textarea name="notes" value={formData.notes} onChange={handleFieldChange} rows={3} placeholder="Notlar" style={inputStyle} />

              <div style={grid2Style}>
                <select name="status" value={formData.status} onChange={handleFieldChange} style={inputStyle}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

              <div style={{ border: "1px solid #dbe3ef", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Banka Bilgileri (Guvenli Alan)</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <input name="bankName" value={formData.bankInfo.bankName} onChange={handleBankFieldChange} placeholder="Banka adi" style={inputStyle} />
                  <input name="accountHolder" value={formData.bankInfo.accountHolder} onChange={handleBankFieldChange} placeholder="Hesap sahibi" style={inputStyle} />
                  <input name="iban" value={formData.bankInfo.iban} onChange={handleBankFieldChange} placeholder="IBAN" style={inputStyle} />
                  <div style={grid2Style}>
                    <input name="accountNumber" value={formData.bankInfo.accountNumber} onChange={handleBankFieldChange} placeholder="Hesap numarasi" style={inputStyle} />
                    <input name="branchCode" value={formData.bankInfo.branchCode} onChange={handleBankFieldChange} placeholder="Sube kodu" style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Iptal</button>
                <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Kaydediliyor..." : editingSupplier ? "Guncelle" : "Kaydet"}</button>
              </div>
            </form>
          </div>
        ) : null}

        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Tedarikci Listesi</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Ara: kod, firma, telefon, kategori" style={filterInputStyle} />
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={filterInputStyle}>
                <option value="all">Tum Kategoriler</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={filterInputStyle}>
                <option value="all">Tum Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 12 }}>Yukleniyor...</div>
          ) : isMobile ? (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredSuppliers.length === 0 ? <div style={{ color: "#64748b" }}>Kayit bulunamadi.</div> : null}
              {filteredSuppliers.map((supplier) => (
                <article key={supplier._id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{supplier.name || "-"}</strong>
                    <span style={{ ...statusBadgeStyle, background: supplier.status === "inactive" ? "#fee2e2" : "#dcfce7", color: supplier.status === "inactive" ? "#b91c1c" : "#166534" }}>
                      {supplier.status === "inactive" ? "Pasif" : "Aktif"}
                    </span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{supplier.code || "-"}</div>
                  <div style={{ display: "grid", gap: 4, marginTop: 8, fontSize: 14 }}>
                    <div><strong>Yetkili:</strong> {supplier.contactPerson || "-"}</div>
                    <div><strong>Telefon:</strong> {supplier.phone || "-"}</div>
                    <div><strong>E-posta:</strong> {supplier.email || "-"}</div>
                    <div><strong>Vergi No:</strong> {supplier.taxNumber || "-"}</div>
                    <div><strong>Kategori:</strong> {supplier.category || "-"}</div>
                    <div><strong>Son Islem:</strong> {supplier.lastTransactionDate ? new Date(supplier.lastTransactionDate).toLocaleDateString("tr-TR") : "-"}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    <button onClick={() => navigate(`/suppliers/${supplier._id}`)} style={tableActionButton}>Detay</button>
                    <button onClick={() => openEdit(supplier)} style={tableActionButton}>Duzenle</button>
                    <button onClick={() => handleDelete(supplier._id)} style={{ ...tableActionButton, color: "#b91c1c" }}>Sil</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={thStyle}>Tedarikci Kodu</th>
                    <th style={thStyle}>Firma Adi</th>
                    <th style={thStyle}>Yetkili Kisi</th>
                    <th style={thStyle}>Telefon</th>
                    <th style={thStyle}>E-posta</th>
                    <th style={thStyle}>Adres</th>
                    <th style={thStyle}>Vergi Numarasi</th>
                    <th style={thStyle}>Kategori</th>
                    <th style={thStyle}>Durum</th>
                    <th style={thStyle}>Son Islem Tarihi</th>
                    <th style={thStyle}>Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={11}>Kayit bulunamadi.</td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier._id}>
                        <td style={tdStyle}>{supplier.code || "-"}</td>
                        <td style={tdStyle}>{supplier.name || "-"}</td>
                        <td style={tdStyle}>{supplier.contactPerson || "-"}</td>
                        <td style={tdStyle}>{supplier.phone || "-"}</td>
                        <td style={tdStyle}>{supplier.email || "-"}</td>
                        <td style={tdStyle}>{supplier.address || "-"}</td>
                        <td style={tdStyle}>{supplier.taxNumber || "-"}</td>
                        <td style={tdStyle}>{supplier.category || "-"}</td>
                        <td style={tdStyle}>
                          <span style={{ ...statusBadgeStyle, background: supplier.status === "inactive" ? "#fee2e2" : "#dcfce7", color: supplier.status === "inactive" ? "#b91c1c" : "#166534" }}>
                            {supplier.status === "inactive" ? "Pasif" : "Aktif"}
                          </span>
                        </td>
                        <td style={tdStyle}>{supplier.lastTransactionDate ? new Date(supplier.lastTransactionDate).toLocaleDateString("tr-TR") : "-"}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => navigate(`/suppliers/${supplier._id}`)} style={tableActionButton}>Detay</button>
                            <button onClick={() => openEdit(supplier)} style={tableActionButton}>Duzenle</button>
                            <button onClick={() => handleDelete(supplier._id)} style={{ ...tableActionButton, color: "#b91c1c" }}>Sil</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  width: "100%",
};

const grid2Style = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
  background: "#fff",
  color: "#0f172a",
};

const secondaryButtonStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  background: "#fff",
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
};

const errorBoxStyle = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};

const filterInputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  minWidth: 140,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontSize: 14,
  verticalAlign: "top",
};

const tableActionButton = {
  border: "1px solid #dbe3ef",
  borderRadius: 8,
  background: "#fff",
  color: "#0f172a",
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 600,
};

const statusBadgeStyle = {
  display: "inline-block",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
};

export default Suppliers;
