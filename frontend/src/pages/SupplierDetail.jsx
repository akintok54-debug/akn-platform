import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

function SupplierDetail() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showBankInfo, setShowBankInfo] = useState(false);

  useEffect(() => {
    const fetchSupplier = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/suppliers/${id}`);
        setSupplier(response?.data?.supplier || null);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        setErrorMessage(error?.response?.data?.message || "Tedarikci detayi yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id]);

  const maskedIban = useMemo(() => {
    const iban = String(supplier?.bankInfo?.iban || "").replace(/\s+/g, "");
    if (!iban) return "-";
    if (showBankInfo) return supplier.bankInfo.iban;
    if (iban.length <= 6) return `${"*".repeat(Math.max(0, iban.length - 2))}${iban.slice(-2)}`;
    return `${iban.slice(0, 2)}${"*".repeat(Math.max(0, iban.length - 6))}${iban.slice(-4)}`;
  }, [supplier, showBankInfo]);

  return (
    <Layout>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Tedarikci Detayi</h2>
          <Link to="/suppliers" style={backLinkStyle}>Listeye Don</Link>
        </div>

        {loading ? <div style={panelStyle}>Yukleniyor...</div> : null}
        {!loading && errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

        {!loading && !errorMessage && supplier ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>Firma Bilgileri</h3>
              <div style={grid2Style}>
                <DetailItem label="Tedarikci Kodu" value={supplier.code} />
                <DetailItem label="Firma Adi" value={supplier.name} />
                <DetailItem label="Yetkili Kisi" value={supplier.contactPerson} />
                <DetailItem label="Telefon" value={supplier.phone} />
                <DetailItem label="E-posta" value={supplier.email} />
                <DetailItem label="Adres" value={supplier.address} />
                <DetailItem label="Urun/Hizmet Kategorisi" value={supplier.category} />
                <DetailItem label="Durum" value={supplier.status === "inactive" ? "Pasif" : "Aktif"} />
              </div>
            </div>

            <div style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>Vergi Bilgileri</h3>
              <div style={grid2Style}>
                <DetailItem label="Vergi Numarasi" value={supplier.taxNumber} />
                <DetailItem label="Vergi Dairesi" value={supplier.taxOffice} />
              </div>
            </div>

            <div style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Banka Bilgileri (Guvenli Alan)</h3>
                <button onClick={() => setShowBankInfo((prev) => !prev)} style={toggleButtonStyle}>
                  {showBankInfo ? "Gizle" : "Goster"}
                </button>
              </div>
              <div style={{ ...grid2Style, marginTop: 10 }}>
                <DetailItem label="Banka Adi" value={supplier.bankInfo?.bankName} />
                <DetailItem label="Hesap Sahibi" value={supplier.bankInfo?.accountHolder} />
                <DetailItem label="IBAN" value={maskedIban} />
                <DetailItem label="Hesap Numarasi" value={showBankInfo ? supplier.bankInfo?.accountNumber : supplier.bankInfo?.accountNumber ? "****" : "-"} />
                <DetailItem label="Sube Kodu" value={showBankInfo ? supplier.bankInfo?.branchCode : supplier.bankInfo?.branchCode ? "***" : "-"} />
              </div>
            </div>

            <div style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>Notlar ve Sistem Bilgileri</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <DetailItem label="Notlar" value={supplier.notes} />
                <DetailItem label="Son Islem Tarihi" value={supplier.lastTransactionDate ? new Date(supplier.lastTransactionDate).toLocaleString("tr-TR") : "-"} />
                <DetailItem label="Olusturulma Tarihi" value={supplier.createdAt ? new Date(supplier.createdAt).toLocaleString("tr-TR") : "-"} />
                <DetailItem label="Guncellenme Tarihi" value={supplier.updatedAt ? new Date(supplier.updatedAt).toLocaleString("tr-TR") : "-"} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 600, marginTop: 4, wordBreak: "break-word" }}>{value || "-"}</div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const grid2Style = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
};

const errorBoxStyle = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};

const backLinkStyle = {
  textDecoration: "none",
  border: "1px solid #dbe3ef",
  padding: "8px 12px",
  borderRadius: 10,
  color: "#0f172a",
  fontWeight: 700,
  background: "#fff",
};

const toggleButtonStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
};

export default SupplierDetail;
