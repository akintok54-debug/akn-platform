import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Layout from "../components/Layout";
import api from "../services/api";

const CHUNK_SIZE = 1000;
const PREVIEW_PAGE_SIZE = 25;

const MODULES = [
  { value: "products", label: "Excel'den Ürün Aktarma" },
  { value: "customers", label: "Excel'den Müşteri Aktarma" },
  { value: "transactions", label: "Excel'den Cari Hareket Aktarma" },
  { value: "stock", label: "Excel'den Stok Aktarma" },
];

const FIELD_LABELS = {
  name: "Ürün Adı", sku: "Ürün Kodu (SKU)", barcode: "Barkod", brand: "Marka",
  category: "Kategori", purchasePrice: "Alış Fiyatı", salePrice: "Satış Fiyatı",
  vat: "KDV (%)", stock: "Stok", minStock: "Min. Stok", shelf: "Raf", description: "Açıklama", image: "Resim URL",
};

function ImportCenter() {
  const [moduleName, setModuleName] = useState("products");
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [analysis, setAnalysis] = useState(null); // kolon analiz sonucu
  const [jobs, setJobs] = useState([]); // import geçmişi
  const [showJobs, setShowJobs] = useState(false);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const previewTotalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / PREVIEW_PAGE_SIZE)), [rows.length]);

  const pagedRows = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    const end = start + PREVIEW_PAGE_SIZE;
    return rows.slice(start, end);
  }, [rows, previewPage]);

  const chunkRows = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  const mergeChunkResults = (items, mode) => {
    const merged = {
      success: true,
      module: moduleName,
      summary: {
        totalRows: 0,
        validRows: 0,
        failedRows: 0,
        inserted: 0,
        updated: 0,
      },
      errorRows: [],
      preview: [],
      message: mode === "commit" ? "Aktarım işlemi tamamlandı." : "Önizleme ve doğrulama tamamlandı.",
    };

    let rowOffset = 0;
    items.forEach((item) => {
      const payload = item.payload || {};
      const summary = payload.summary || {};
      merged.summary.totalRows += Number(summary.totalRows || 0);
      merged.summary.validRows += Number(summary.validRows || 0);
      merged.summary.failedRows += Number(summary.failedRows || 0);
      merged.summary.inserted += Number(summary.inserted || 0);
      merged.summary.updated += Number(summary.updated || 0);

      (payload.errorRows || []).forEach((errorRow) => {
        merged.errorRows.push({
          ...errorRow,
          rowNumber: Number(errorRow.rowNumber || 0) + rowOffset,
        });
      });

      if (mode === "validate") {
        (payload.preview || []).forEach((previewItem) => {
          merged.preview.push({
            ...previewItem,
            rowNumber: Number(previewItem.rowNumber || 0) + rowOffset,
          });
        });
      }

      rowOffset += Number(summary.totalRows || 0);
    });

    if (mode !== "commit") {
      delete merged.summary.inserted;
      delete merged.summary.updated;
    }

    return merged;
  };

  const runChunkedAction = async (mode) => {
    const chunks = chunkRows(rows, CHUNK_SIZE);
    const responses = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const endpoint = mode === "validate" ? "validate" : "commit";
      const response = await api.post(`/imports/${moduleName}/${endpoint}`, { rows: chunk });
      responses.push({ payload: response.data, chunkIndex: i });
      setMessage(`${i + 1}/${chunks.length} parçası tamamlandı...`);
    }

    return mergeChunkResults(responses, mode);
  };

  const parseFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setMessage("");
    setValidation(null);
    setCommitResult(null);
    setPreviewPage(1);
    setAnalysis(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setRows([]);
        setFileName(file.name);
        setMessage("Dosyada sayfa bulunamadı.");
        return;
      }
      const sheet = workbook.Sheets[firstSheetName];
      const parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setRows(parsedRows);
      setFileName(file.name);
      setMessage(`${parsedRows.length} satır yüklendi.`);

      // Ürün modülü için otomatik kolon analizi
      if (moduleName === "products" && parsedRows.length > 0) {
        try {
          const res = await api.post(`/imports/products/analyze`, { rows: parsedRows.slice(0, 50) });
          setAnalysis(res.data);
        } catch { /* analiz hatası sessiz geç */ }
      }
    } catch (error) {
      console.error(error);
      setRows([]);
      setMessage("Excel dosyası okunamadı.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get(`/imports/templates/${moduleName}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${moduleName}-import-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setMessage(error?.response?.data?.message || "Şablon indirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    if (!rows.length) {
      setMessage("Önce Excel dosyası yükleyin.");
      return;
    }
    setLoading(true);
    setMessage("");
    setCommitResult(null);
    try {
      const result = rows.length > CHUNK_SIZE
        ? await runChunkedAction("validate")
        : (await api.post(`/imports/${moduleName}/validate`, { rows })).data;
      setValidation(result);
      setMessage("Önizleme ve doğrulama tamamlandı.");
    } catch (error) {
      console.error(error);
      setValidation(null);
      setMessage(error?.response?.data?.message || "Doğrulama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const commitImport = async () => {
    if (!rows.length) {
      setMessage("❌ Önce Excel dosyası yükleyin.");
      return;
    }
    
    if (!validation) {
      setMessage("❌ Önce 'Önizleme ve Doğrulama' yapmalısın!");
      return;
    }

    if (validation.summary?.failedRows > 0) {
      setMessage("❌ Hatalı satırlar var. Lütfen hata raporunu kontrol et ve Excel'i düzelt.");
      return;
    }

    setLoading(true);
    setMessage("⏳ Kayıt işlemi başlıyor...");
    try {
      const result = rows.length > CHUNK_SIZE
        ? await runChunkedAction("commit")
        : (await api.post(`/imports/${moduleName}/commit`, { rows })).data;
      
      setCommitResult(result);
      setValidation(result);
      
      // Başarı mesajı
      const insertedMsg = result.summary?.inserted > 0 ? `✅ ${result.summary.inserted} ürün eklendi` : "";
      const updatedMsg = result.summary?.updated > 0 ? `🔄 ${result.summary.updated} güncellendi` : "";
      const messages = [insertedMsg, updatedMsg].filter(Boolean).join(", ");
      
      setMessage(`🎉 Başarılı! ${messages || result.message || "Aktarım tamamlandı."}`);
    } catch (error) {
      console.error("Commit hatası:", error);
      const payload = error?.response?.data;
      const errorMsg = payload?.message || error.message || "Aktarım başarısız.";
      
      if (payload?.summary) {
        setValidation(payload);
      }
      
      setMessage(`❌ Hata: ${errorMsg}`);
      
      // Detaylı error log
      if (payload?.details) {
        console.error("Backend Error:", payload.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await api.get("/imports/jobs");
      setJobs(res.data?.jobs || []);
      setShowJobs(true);
    } catch { setMessage("İş geçmişi yüklenemedi."); }
  };

  const downloadErrorReport = () => {    const errorRows = validation?.errorRows || [];
    if (!errorRows.length) {
      setMessage("Hatalı satır bulunmuyor.");
      return;
    }

    const csv = [
      ["satirNo", "hatalar", "hamVeri"],
      ...errorRows.map((item) => [
        item.rowNumber,
        (item.errors || []).join(" | "),
        JSON.stringify(item.raw || {}),
      ]),
    ]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${moduleName}-hata-raporu.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div style={{ padding: 24, maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 18, padding: 20, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Excel Aktarım Merkezi</h2>
          <p style={{ margin: "8px 0 0", opacity: 0.95 }}>Şablon indir, önizleme yap, hatalı satırları gör ve toplu kaydet.</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <select value={moduleName} onChange={(e) => { setModuleName(e.target.value); setAnalysis(null); }} style={inputStyle}>
              {MODULES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => parseFile(e.target.files?.[0])} style={inputStyle} />
            <button style={primaryBtn} onClick={downloadTemplate} disabled={loading}>📥 Şablonu İndir</button>
            <button style={secondaryBtn} onClick={runValidation} disabled={loading || !rows.length}>✅ Adım 1: Doğrula</button>
            <button style={successBtn} onClick={commitImport} disabled={loading || !rows.length || !validation}>💾 Adım 2: Kaydet</button>
            <button style={dangerBtn} onClick={downloadErrorReport} disabled={loading || !(validation?.errorRows || []).length}>📋 Hataları İndir</button>
            <button style={secondaryBtn} onClick={loadJobs} disabled={loading}>🕐 Geçmiş</button>
          </div>
          <div style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>
            📄 Dosya: {fileName || "-"} | 📊 Satır: {rows.length} | 📦 Parça: {CHUNK_SIZE}
          </div>
          {message && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              border: "2px solid",
              background: message.includes("❌") ? "#fee2e2" : message.includes("🎉") ? "#dcfce7" : message.includes("⏳") ? "#fef3c7" : "#e0f2fe",
              color: message.includes("❌") ? "#991b1b" : message.includes("🎉") ? "#166534" : message.includes("⏳") ? "#92400e" : "#0c4a6e",
              borderColor: message.includes("❌") ? "#fca5a5" : message.includes("🎉") ? "#86efac" : message.includes("⏳") ? "#fcd34d" : "#7dd3fc",
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Kolon Analiz Paneli */}
        {analysis && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, color: "#15803d" }}>🔍 Otomatik Kolon Analizi</h3>
              <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 8, padding: "4px 10px", fontWeight: 700, fontSize: 13 }}>
                Platform: {analysis.platform}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8, marginBottom: 10 }}>
              {Object.entries(analysis.mappings || {}).map(([field, excelCol]) => (
                <div key={field} style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>{excelCol}</span>
                  <span style={{ fontWeight: 700, color: "#166534" }}>→ {FIELD_LABELS[field] || field}</span>
                </div>
              ))}
            </div>
            {analysis.unmapped?.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 10, fontSize: 13 }}>
                <strong>⚠️ Eşleştirilemeyen kolonlar:</strong> {analysis.unmapped.join(", ")}
              </div>
            )}
            {analysis.imageColumns?.length > 0 && (
              <div style={{ marginTop: 8, color: "#2563eb", fontSize: 13 }}>
                🖼 Resim kolonları tespit edildi: <strong>{analysis.imageColumns.join(", ")}</strong>
              </div>
            )}
            {analysis.samplePrices?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                Örnek fiyat dönüşümleri: {analysis.samplePrices.map((p) => `"${p.raw}" → ${p.parsed}`).join(" | ")}
              </div>
            )}
          </div>
        )}

        {validation?.summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Stat title="Toplam Satır" value={validation.summary.totalRows} />
            <Stat title="Geçerli Satır" value={validation.summary.validRows} />
            <Stat title="Hatalı Satır" value={validation.summary.failedRows} color="#dc2626" />
            <Stat title="Eklendi" value={validation.summary.inserted ?? "-"} color="#16a34a" />
            <Stat title="Güncellendi" value={validation.summary.updated ?? "-"} color="#2563eb" />
            <Stat title="Resim Bulundu" value={validation.summary.imagesFound ?? "-"} color="#7c3aed" />
            {(validation.summary.imageErrors ?? 0) > 0 && (
              <Stat title="Resim Hatası" value={validation.summary.imageErrors} color="#dc2626" />
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Aktarma Önizleme</h3>
            <Table columns={columns} rows={pagedRows.map((row) => columns.map((c) => row[c]))} emptyLabel="Önizleme için dosya yükleyin." />
            {rows.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Sayfa {previewPage}/{previewTotalPages} ({PREVIEW_PAGE_SIZE} satır)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={secondaryBtn}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                  >
                    Geri
                  </button>
                  <button
                    style={secondaryBtn}
                    onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                    disabled={previewPage >= previewTotalPages}
                  >
                    İleri
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Hatalı Satırlar</h3>
            <Table
              columns={["Satır", "Hatalar", "Ham Veri"]}
              rows={(validation?.errorRows || []).slice(0, 200).map((item) => [item.rowNumber, (item.errors || []).join(" | "), JSON.stringify(item.raw || {})])}
              emptyLabel="Hatalı satır yok."
            />
          </section>

          {/* Resim hata logu */}
          {(commitResult?.imageLog || []).length > 0 && (
            <section style={{ ...cardStyle, borderColor: "#fca5a5" }}>
              <h3 style={{ marginTop: 0, color: "#dc2626" }}>🖼 İndirilemeyen Resimler</h3>
              <Table
                columns={["Satır", "Ürün", "Hata"]}
                rows={(commitResult.imageLog || []).map((item) => [item.rowNumber, item.name, (item.failedUrls || []).join(" | ")])}
                emptyLabel=""
              />
              <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                Not: Ürün verileri kaydedildi, yalnızca görseller eksik.
              </div>
            </section>
          )}

          {commitResult?.summary ? (
            <section style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>İşlem Sonu Raporu</h3>
              <div style={{ color: "#0f172a" }}>
                {commitResult.message || "Aktarım işlemi tamamlandı."}
              </div>
            </section>
          ) : null}

          {/* İş Geçmişi */}
          {showJobs && jobs.length > 0 && (
            <section style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>📋 Import İş Geçmişi (Son 50)</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Tarih", "Modül", "Platform", "Dosya", "Toplam", "Eklendi", "Güncellendi", "Hatalı", "Resim", "Durum"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={tdStyle}>{job.startedAt ? new Date(job.startedAt).toLocaleString("tr-TR") : "-"}</td>
                        <td style={tdStyle}>{job.module}</td>
                        <td style={tdStyle}>{job.platform || "-"}</td>
                        <td style={tdStyle}>{job.filename || "-"}</td>
                        <td style={tdStyle}>{job.totalRows}</td>
                        <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 700 }}>{job.inserted}</td>
                        <td style={{ ...tdStyle, color: "#2563eb", fontWeight: 700 }}>{job.updated}</td>
                        <td style={{ ...tdStyle, color: job.failed > 0 ? "#dc2626" : "#64748b", fontWeight: job.failed > 0 ? 700 : 400 }}>{job.failed}</td>
                        <td style={tdStyle}>{job.imagesFound || 0}</td>
                        <td style={{ ...tdStyle, color: job.status === "completed" ? "#16a34a" : job.status === "partial" ? "#d97706" : "#dc2626", fontWeight: 700 }}>
                          {job.status === "completed" ? "✅ Tamamlandı" : job.status === "partial" ? "⚠️ Kısmi" : "❌ Hatalı"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Stat({ title, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: color || "#0f172a" }}>{String(value ?? "-")}</div>
    </div>
  );
}

function Table({ columns, rows, emptyLabel }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={thStyle}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, i) => <td key={`${idx}-${i}`} style={tdStyle}>{String(cell ?? "")}</td>)}
            </tr>
          )) : (
            <tr>
              <td style={tdStyle} colSpan={Math.max(1, columns.length)}>{emptyLabel}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
};

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 14,
};

const thStyle = {
  borderBottom: "1px solid #e2e8f0",
  textAlign: "left",
  padding: 8,
  fontSize: 12,
  color: "#64748b",
};

const tdStyle = {
  borderBottom: "1px solid #f1f5f9",
  padding: 8,
  fontSize: 13,
  color: "#0f172a",
};

const primaryBtn = {
  border: "none",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const successBtn = {
  border: "none",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#059669",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerBtn = {
  border: "none",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export default ImportCenter;
