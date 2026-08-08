import React, { useState, useEffect } from "react";

function DailySales() {
  const [dailyData, setDailyData] = useState({ totalRevenue: 0, salesCount: 0, items: [] });
  const [loading, setLoading] = useState(true);

  // Günlük Satış Raporunu Çekme
  const fetchDailySales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/reports/daily-sales", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data) {
        setDailyData(data);
      }
    } catch (error) {
      console.error("Günlük satışlar alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySales();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827" }}>📊 Günlük Satış ve Ciro Raporu</h2>

      {/* Özet Kartları */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>Bugünkü Toplam Ciro</h4>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#059669", margin: 0 }}>
            {loading ? "Yükleniyor..." : `${dailyData.totalRevenue || 0} ₺`}
          </p>
        </div>

        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>Bugünkü Satış Adedi</h4>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb", margin: 0 }}>
            {loading ? "Yükleniyor..." : `${dailyData.salesCount || 0} İşlem`}
          </p>
        </div>
      </div>

      {/* Bugün Yapılan Satışların Detay Listesi */}
      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginBottom: "15px", color: "#374151" }}>Bugünkü Satış Hareketleri</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontSize: "14px" }}>
                <th style={{ padding: "12px" }}>Saat</th>
                <th style={{ padding: "12px" }}>Müşteri</th>
                <th style={{ padding: "12px" }}>Satılan Parça / Ürün</th>
                <th style={{ padding: "12px" }}>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.items && dailyData.items.length > 0 ? (
                dailyData.items.map((sale, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "14px" }}>
                    <td style={{ padding: "12px", color: "#6b7280" }}>{sale.time || "10:30"}</td>
                    <td style={{ padding: "12px", fontWeight: "500" }}>{sale.customerName || "Perakende Müşteri"}</td>
                    <td style={{ padding: "12px" }}>{sale.productName || "Yedek Parça"}</td>
                    <td style={{ padding: "12px", fontWeight: "bold", color: "#059669" }}>{sale.amount || 0} ₺</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>
                    Bugün henüz bir satış kaydı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DailySales;