import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

const STATUS_OPTIONS = [
  { value: "GELEN_SIPARISLER", label: "Gelen siparişler" },
  { value: "HAZIRLANIYOR", label: "Hazırlanıyor" },
  { value: "KARGODA", label: "Kargoda" },
  { value: "TESLIM_EDILDI", label: "Teslim edildi" },
];

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

function Orders() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = ADMIN_ROLES.has(user?.role);

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeStatus, setActiveStatus] = useState("GELEN_SIPARISLER");

  const [customerName, setCustomerName] = useState(user?.name || "");

  const fetchProducts = async (term = "") => {
    setLoadingProducts(true);
    try {
      const response = await api.get("/orders/products", { params: { search: term } });
      const list = response?.data?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
      alert("Ürün listesi alınamadı.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async (status = activeStatus) => {
    setLoadingOrders(true);
    try {
      const response = await api.get("/orders", { params: { status } });
      const list = response?.data?.orders || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
      alert("Siparişler alınamadı.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchProducts("");
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders(activeStatus);
    }
  }, [isAdmin, activeStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(searchTerm.trim());
  };

  const addToCart = (product, selectedPriceType) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product._id && item.selectedPriceType === selectedPriceType
      );
      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + 1, Number(product.stock || 0)) }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          quantity: Number(product.stock || 0) > 0 ? 1 : 0,
          stock: Number(product.stock || 0),
          selectedPriceType,
          dealerPrice: Number(product.dealerPrice || 0),
          retailPrice: Number(product.retailPrice || 0),
        },
      ].filter((item) => item.quantity > 0);
    });
  };

  const updateCartItem = (productId, selectedPriceType, nextQuantity) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.selectedPriceType !== selectedPriceType) {
            return item;
          }
          const quantity = Math.max(0, Math.min(Number(nextQuantity || 0), item.stock));
          return { ...item, quantity };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (productId, selectedPriceType) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.selectedPriceType === selectedPriceType)));
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.selectedPriceType === "BAYI" ? item.dealerPrice : item.retailPrice) * item.quantity, 0),
    [cart]
  );

  const completeOrder = async () => {
    if (cart.length === 0) {
      alert("Sepet boş.");
      return;
    }

    setPlacingOrder(true);
    try {
      await api.post("/orders", {
        customerName: customerName || user?.name || "Müşteri",
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPriceType: item.selectedPriceType,
        })),
      });

      alert("Sipariş tamamlandı.");
      setCart([]);
      await fetchProducts(searchTerm.trim());
      if (isAdmin) {
        await fetchOrders(activeStatus);
      }
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Sipariş oluşturulamadı.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const changeOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      await fetchOrders(activeStatus);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Durum güncellenemedi.");
    }
  };

  const statusLabel = (status) => STATUS_OPTIONS.find((item) => item.value === status)?.label || "Gelen siparişler";

  return (
    <Layout>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg, #0b1b31 0%, #134e4a 100%)", color: "#fff", borderRadius: 20, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.8 }}>Sipariş Modülü</div>
            <h2 style={{ margin: "6px 0 0" }}>Ürün ara, sepete ekle, siparişi tamamla</h2>
          </div>
          <button onClick={() => navigate('/reports/orders')} style={{ padding: "10px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            📊 Sipariş Raporu
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <section style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 8px 28px rgba(15,23,42,0.06)" }}>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün adı, sku veya barkod ile ara"
                style={{ flex: 1, minWidth: 260, padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
              />
              <button type="submit" style={primaryButtonStyle}>Ara</button>
            </form>

            {loadingProducts ? (
              <div>Ürünler yükleniyor...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                      <th style={thStyle}>Ürün</th>
                      <th style={thStyle}>Stok</th>
                      <th style={thStyle}>Bayi Fiyatı</th>
                      <th style={thStyle}>Perakende Fiyat</th>
                      <th style={thStyle}>Sepete Ekle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700 }}>{product.name}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{product.sku || product.barcode || "-"}</div>
                        </td>
                        <td style={tdStyle}>{Number(product.stock || 0)}</td>
                        <td style={tdStyle}>{Number(product.dealerPrice || 0).toLocaleString("tr-TR")} TL</td>
                        <td style={tdStyle}>{Number(product.retailPrice || 0).toLocaleString("tr-TR")} TL</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => addToCart(product, "BAYI")}
                              disabled={Number(product.stock || 0) <= 0}
                              style={smallButtonStyle}
                            >
                              Bayi
                            </button>
                            <button
                              type="button"
                              onClick={() => addToCart(product, "PERAKENDE")}
                              disabled={Number(product.stock || 0) <= 0}
                              style={{ ...smallButtonStyle, background: "#0f766e" }}
                            >
                              Perakende
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: 18, textAlign: "center", color: "#64748b" }}>
                          Ürün bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 8px 28px rgba(15,23,42,0.06)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Sepet</h3>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Müşteri adı"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", marginBottom: 12 }}
            />

            <div style={{ display: "grid", gap: 10, maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
              {cart.map((item) => {
                const unitPrice = item.selectedPriceType === "BAYI" ? item.dealerPrice : item.retailPrice;
                return (
                  <div key={`${item.productId}_${item.selectedPriceType}`} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>{item.productName}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{item.selectedPriceType === "BAYI" ? "Bayi" : "Perakende"} fiyatı</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => updateCartItem(item.productId, item.selectedPriceType, e.target.value)}
                        style={{ width: 72, padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                      />
                      <div style={{ marginLeft: "auto", fontWeight: 700 }}>
                        {(unitPrice * item.quantity).toLocaleString("tr-TR")} TL
                      </div>
                      <button type="button" onClick={() => removeCartItem(item.productId, item.selectedPriceType)} style={removeButtonStyle}>Sil</button>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && <div style={{ color: "#64748b" }}>Sepet boş.</div>}
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <strong>Toplam</strong>
                <strong>{cartTotal.toLocaleString("tr-TR")} TL</strong>
              </div>
              <button onClick={completeOrder} disabled={placingOrder || cart.length === 0} style={{ ...primaryButtonStyle, width: "100%" }}>
                {placingOrder ? "Kaydediliyor..." : "Siparişi Tamamla"}
              </button>
            </div>
          </section>
        </div>

        {isAdmin && (
          <section style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 8px 28px rgba(15,23,42,0.06)" }}>
            <h3 style={{ marginTop: 0 }}>Yönetici Sipariş Takibi</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setActiveStatus(status.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    background: activeStatus === status.value ? "#0f172a" : "#fff",
                    color: activeStatus === status.value ? "#fff" : "#0f172a",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {status.label}
                </button>
              ))}
            </div>

            {loadingOrders ? (
              <div>Siparişler yükleniyor...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
                      <th style={thStyle}>Sipariş No</th>
                      <th style={thStyle}>Müşteri</th>
                      <th style={thStyle}>Toplam</th>
                      <th style={thStyle}>Durum</th>
                      <th style={thStyle}>Tarih</th>
                      <th style={thStyle}>Durum Güncelle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>#{String(order._id).slice(-6).toUpperCase()}</td>
                        <td style={tdStyle}>{order.customerName || "Müşteri"}</td>
                        <td style={tdStyle}>{Number(order.totalAmount || 0).toLocaleString("tr-TR")} TL</td>
                        <td style={tdStyle}>{statusLabel(order.status)}</td>
                        <td style={tdStyle}>{new Date(order.createdAt).toLocaleString("tr-TR")}</td>
                        <td style={tdStyle}>
                          <select
                            value={order.status}
                            onChange={(e) => changeOrderStatus(order._id, e.target.value)}
                            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: 18, textAlign: "center", color: "#64748b" }}>
                          Bu durumda sipariş bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}

const thStyle = {
  padding: "10px 12px",
  fontSize: 13,
};

const tdStyle = {
  padding: "12px",
  fontSize: 14,
};

const primaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButtonStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  cursor: "pointer",
};

const removeButtonStyle = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
};

export default Orders;