import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function ImportHistory() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/imports/jobs");
      setJobs(res.data?.data || []);
    } catch (error) {
      console.error("İmport geçmişi yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "4px"
  };

  const cellStyle = { padding: "12px", borderBottom: "1px solid #e5e7eb" };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: "700" }}>📜 İçe Aktarma Geçmişi</h1>
        <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>Ürün Excel import işlemlerinin geçmişi</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>⏳ Yükleniyor...</div>
      ) : jobs.length === 0 ? (
        <div style={{
          background: "#fff",
          padding: "40px",
          textAlign: "center",
          borderRadius: "8px",
          color: "#64748b"
        }}>
          📭 İçe aktarma geçmişi bulunamadı.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={cellStyle}>Tarih</th>
                <th style={cellStyle}>Dosya Adı</th>
                <th style={cellStyle}>Ürünler</th>
                <th style={cellStyle}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td style={cellStyle}>{new Date(job.createdAt).toLocaleString("tr-TR")}</td>
                  <td style={cellStyle}>{job.fileName || "Bilinmiyor"}</td>
                  <td style={cellStyle}>
                    {job.successCount || 0} başarılı, {job.errorCount || 0} hata
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: job.status === "completed" ? "#dcfce7" : "#fee2e2",
                      color: job.status === "completed" ? "#166534" : "#991b1b"
                    }}>
                      {job.status || "Tamamlandı"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => navigate("/products")} style={{...btnStyle, background: "#6b7280", color: "#fff"}}>
          ← Geri Dön
        </button>
      </div>
    </div>
  );
}

export default ImportHistory;
