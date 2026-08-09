import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./ReportStyles.css";

const ReportsHub = () => {
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isSalesRep = currentUser?.role === "sales";

  const reports = [
    {
      id: "sales",
      title: "📊 Satış Raporu",
      description: "Tarih aralığı, müşteri, ödeme şekli ve temsilci filtreleriyle satış detayları",
      path: "/reports/sales",
      visible: true,
    },
    {
      id: "customers",
      title: "📋 Müşteri / Cari Raporu",
      description: "Müşteri listeleri, borç/alacak bakiye ve cari ekstre",
      path: "/reports/customers",
      visible: true,
    },
    {
      id: "orders",
      title: "📦 Sipariş Raporu",
      description: "Siparişler, durumları ve müşteri bazlı detaylar",
      path: "/reports/orders",
      visible: true,
    },
    {
      id: "collections",
      title: "💰 Tahsilat Raporu",
      description: "Tahsil edilen tutarlar, ödeme şekilleri ve müşteri bazlı takip",
      path: "/reports/collections",
      visible: true,
    },
    {
      id: "returns",
      title: "🔄 İade Raporu",
      description: "İade edilen ürünler, müşteriler ve tutarlar",
      path: "/reports/returns",
      visible: true,
    },
    {
      id: "stock",
      title: "📦 Stok Raporu",
      description: "Stok seviyeleri, kritik stok uyarıları ve depo bazlı detaylar",
      path: "/reports/stock",
      visible: true,
    },
    {
      id: "products",
      title: "🏷️ Ürün Raporu",
      description: "Ürün listesi, kategorileri, fiyatları ve özelikleri",
      path: "/reports/products",
      visible: true,
    },
    {
      id: "sales-reps",
      title: "👨‍💼 Satış Temsilcisi Performans",
      description: "Temsilci başına satış, tahsil ve performans metrikleri",
      path: "/reports/sales-reps",
      visible: isAdmin,
    },
    {
      id: "audit",
      title: "🔐 İşlem Geçmişi / Audit",
      description: "Tüm kullanıcı işlemleri, modüller ve sistem aktiviteleri",
      path: "/reports/audit",
      visible: isAdmin,
    },
  ];

  const visibleReports = reports.filter((r) => r.visible && !isSalesRep);

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
          color: "#fff",
          padding: "30px",
          borderRadius: "20px",
          marginBottom: "40px",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0", fontSize: "32px" }}>📊 Raporlar Merkezi</h1>
        <p style={{ margin: 0, opacity: 0.95 }}>
          Tüm işletme raporlarına merkezi bir yerden erişin
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {visibleReports.map((report) => (
          <div
            key={report.id}
            onClick={() => navigate(report.path)}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "24px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              ":hover": {
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                transform: "translateY(-4px)",
              },
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#111827", fontSize: "18px" }}>
              {report.title}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: "14px", lineHeight: "1.5" }}>
              {report.description}
            </p>
            <button
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#1d4ed8";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#2563eb";
              }}
            >
              Görüntüle →
            </button>
          </div>
        ))}
      </div>

      {isSalesRep && (
        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "12px",
            color: "#92400e",
          }}
        >
          <p style={{ margin: 0 }}>
            ℹ️ Satış temsilcileri sadece kendi verileriyle ilgili raporları görebilirler.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsHub;
