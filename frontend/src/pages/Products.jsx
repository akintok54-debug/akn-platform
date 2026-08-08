import React, { useState, useEffect } from "react";
import api from "../services/api";

function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    vatRate: "20",
    priceType: "exclusive",
    category: "Motor Aksamı"
  });
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      const data = response.data;
      
      console.log("Sunucudan gelen ürün verisi:", data);

      if (data && Array.isArray(data.data)) {
        setProducts(data.data);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Ürünler yüklenemedi:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/products", form);
      
      if (response?.status === 201) {
        alert("Ürün başarıyla eklendi!");
        setForm({ 
          name: "", 
          barcode: "", 
          purchasePrice: "", 
          salePrice: "", 
          stock: "", 
          vatRate: "20",
          priceType: "exclusive",
          category: "Motor Aksamı" 
        });
        fetchProducts();
      } else {
        alert("Ürün eklenirken hata oluştu.");
      }
    } catch (error) {
      console.error("Ürün ekleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // KDV ve Fiyat Hesaplama Mantığı
  const calculatePrices = (p) => {
    const rawBuy = p.purchasePrice ?? p.buyPrice ?? p.buyingPrice ?? 0;
    const rawSell = p.salePrice ?? p.sellPrice ?? p.price ?? 0;
    
    const buy = parseFloat(rawBuy) || 0;
    const sell = parseFloat(rawSell) || 0;
    const vat = parseFloat(p.vatRate) || 20;

    let buyEx = buy;
    let buyInc = buy * (1 + vat / 100);
    let sellEx = sell;
    let sellInc = sell * (1 + vat / 100);

    if (p.priceType === "inclusive") {
      buyEx = buy / (1 + vat / 100);
      buyInc = buy;
      sellEx = sell / (1 + vat / 100);
      sellInc = sell;
    }

    return {
      buyEx: buyEx.toFixed(2),
      buyInc: buyInc.toFixed(2),
      sellEx: sellEx.toFixed(2),
      sellInc: sellInc.toFixed(2)
    };
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827" }}>📦 Ürün ve Stok Yönetimi</h2>

      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
        <h3 style={{ marginBottom: "15px", color: "#374151" }}>Yeni Yedek Parça / Ürün Ekle</h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
          <input
            type="text"
            placeholder="Ürün Adı (Örn: Honda PCX Silindir)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          />
          <input
            type="text"
            placeholder="Barkod / Stok Kodu"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          />
          <input
            type="number"
            placeholder="Alış Fiyatı (TL)"
            value={form.purchasePrice}
            onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            required
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          />
          <input
            type="number"
            placeholder="Satış Fiyatı (TL)"
            value={form.salePrice}
            onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            required
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          />
          <input
            type="number"
            placeholder="Stok Miktarı"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          />
          
          <select
            value={form.vatRate}
            onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff" }}
          >
            <option value="20">%20 KDV</option>
            <option value="10">%10 KDV</option>
            <option value="1">%1 KDV</option>
            <option value="0">%0 KDV</option>
          </select>

          <select
            value={form.priceType}
            onChange={(e) => setForm({ ...form, priceType: e.target.value })}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff" }}
          >
            <option value="exclusive">Girdiğim Fiyat KDV HARİÇ</option>
            <option value="inclusive">Girdiğim Fiyat KDV DAHİL</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              gridColumn: "1 / -1"
            }}
          >
            {loading ? "Kaydediliyor..." : "Ürünü Kaydet"}
          </button>
        </form>
      </div>

      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginBottom: "15px", color: "#374151" }}>Kayıtlı Ürünler Listesi</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280" }}>
                <th style={{ padding: "12px" }}>Ürün Adı</th>
                <th style={{ padding: "12px" }}>Barkod</th>
                <th style={{ padding: "12px" }}>Alış (Hariç / Dahil)</th>
                <th style={{ padding: "12px" }}>Satış (Hariç / Dahil)</th>
                <th style={{ padding: "12px" }}>Stok</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((p, index) => {
                  const prices = calculatePrices(p);
                  return (
                    <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>{p.name}</td>
                      <td style={{ padding: "12px", color: "#6b7280" }}>{p.barcode || "-"}</td>
                      <td style={{ padding: "12px" }}>
                        {prices.buyEx} TL <span style={{ fontSize: "11px", color: "#9ca3af" }}>(+%20 KDV: {prices.buyInc} TL)</span>
                      </td>
                      <td style={{ padding: "12px", color: "#059669", fontWeight: "bold" }}>
                        {prices.sellEx} TL <span style={{ fontSize: "11px", color: "#6b7280" }}>(+%20 KDV: {prices.sellInc} TL)</span>
                      </td>
                      <td style={{ padding: "12px" }}>{p.stock} Adet</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                    Henüz kayıtlı ürün bulunmuyor. Yukarıdan ilk ürününüzü ekleyin!
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

export default Products;