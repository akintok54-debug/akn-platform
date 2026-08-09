import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import StatCard from "../components/ui/StatCard";
import QuickActionCard from "../components/ui/QuickActionCard";
import api from "../services/api";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [data, setData] = useState({
    products: [],
    customers: [],
    sales: [],
    accounts: [],
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [overviewRes, productsRes, customersRes, salesRes, accountsRes, txRes] = await Promise.all([
          api.get("/erp/overview", config).catch(() => ({ data: { overview: {} } })),
          api.get("/products", config).catch(() => ({ data: { products: [] } })),
          api.get("/customers", config).catch(() => ({ data: { customers: [] } })),
          api.get("/sales", config).catch(() => ({ data: { sales: [] } })),
          api.get("/accounts", config).catch(() => ({ data: [] })),
          api.get("/accounts/transactions", config).catch(() => ({ data: { transactions: [] } })),
        ]);

        const overview = overviewRes?.data?.overview || {};
        const products = productsRes?.data?.products || productsRes?.data?.data || productsRes?.data || [];
        const customers = customersRes?.data?.customers || customersRes?.data?.data || customersRes?.data || [];
        const sales = salesRes?.data?.sales || salesRes?.data?.data || salesRes?.data || [];
        const accounts = Array.isArray(accountsRes?.data) ? accountsRes.data : accountsRes?.data?.accounts || [];
        const transactions = txRes?.data?.transactions || [];

        setData({ products, customers, sales, accounts, transactions, overview });
      } catch (error) {
        console.error("Dashboard verileri yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getFilteredSales = (salesList, selectedRange) => {
    if (!salesList) return [];
    if (selectedRange === "all") return salesList;

    const days = Number(selectedRange || 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return salesList.filter((sale) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      return saleDate && saleDate >= cutoff;
    });
  };

  const filteredSales = useMemo(() => getFilteredSales(data.sales || [], range), [data.sales, range]);

  const metrics = useMemo(() => {
    const products = data.products || [];
    const customers = data.customers || [];
    const sales = filteredSales;
    const accounts = data.accounts || [];
    const transactions = data.transactions || [];
    const overview = data.overview || {};

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const dailyRevenue = sales.reduce((sum, sale) => {
      const saleDate = new Date(sale.createdAt).toISOString().slice(0, 10);
      return saleDate === todayStr ? sum + Number(sale.totalAmount || 0) : sum;
    }, 0);

    const monthlyRevenue = overview.monthlyRevenue || sales.reduce((sum, sale) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      const isCurrentMonth = saleDate && saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
      return isCurrentMonth ? sum + Number(sale.totalAmount || 0) : sum;
    }, 0);

    const pendingOrders = overview.pendingOrders ?? sales.filter((sale) => sale.deliveryStatus === "BEKLEMEDE").length;
    const receivables = overview.openReceivables ?? customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance || 0)), 0);
    const payables = overview.openPayables ?? customers.reduce((sum, customer) => sum + Math.max(0, -Number(customer.balance || 0)), 0);
    const cashBalance = overview.cashBalance ?? accounts.filter((account) => account.type === "KASA").reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const bankBalance = overview.bankBalance ?? accounts.filter((account) => account.type === "BANKA").reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const criticalStock = products.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0));

    const monthlySales = overview.monthlySales || sales.reduce((acc, sale) => {
      const month = sale.createdAt ? new Date(sale.createdAt).toLocaleString("tr-TR", { month: "short" }) : "-";
      acc[month] = (acc[month] || 0) + Number(sale.totalAmount || 0);
      return acc;
    }, {});

    const topProducts = overview.topProducts || Object.entries(sales.reduce((acc, sale) => {
      (sale.items || []).forEach((item) => {
        const name = item.productId?.name || item.productName || "Bilinmeyen Ürün";
        acc[name] = (acc[name] || 0) + Number(item.quantity || 0);
      });
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const distribution = overview.distribution || sales.reduce((acc, sale) => {
      const paymentType = sale.paymentType || "BİLİNMİYOR";
      acc[paymentType] = (acc[paymentType] || 0) + 1;
      return acc;
    }, {});

    const recentSales = overview.recentSales || [...sales].slice(0, 6);
    const recentOrders = overview.recentOrders || [...sales].filter((sale) => sale.deliveryStatus === "BEKLEMEDE").slice(0, 6);
    const recentCollections = overview.recentCollections || transactions.filter((transaction) => transaction.type === "ALACAK").slice(0, 6);
    const recentPayments = overview.recentPayments || transactions.filter((transaction) => transaction.type === "BORC").slice(0, 6);

    return {
      productsCount: products.length,
      customersCount: customers.length,
      salesCount: sales.length,
      dailyRevenue,
      monthlyRevenue,
      pendingOrders,
      receivables,
      payables,
      cashBalance,
      bankBalance,
      criticalStockCount: criticalStock.length,
      monthlySales,
      topProducts,
      distribution,
      recentSales,
      recentOrders,
      recentCollections,
      recentPayments,
    };
  }, [data]);

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString("tr-TR")} TL`;

  return (
    <Layout>
      <div style={{ background: "linear-gradient(135deg, #07111f 0%, #17324e 100%)", color: "#fff", padding: 24, borderRadius: 24, marginBottom: 20, boxShadow: "0 18px 40px rgba(7, 17, 31, 0.16)" }}>
        <h1 style={{ margin: "8px 0 8px", fontSize: 30 }}>Hoş geldiniz, {user.name || "Kullanıcı"}</h1>
        <p style={{ margin: 0, opacity: 0.95, maxWidth: 700 }}>Satış, stok, cari hesap ve rapor akışlarını aynı anda takip ederek kurumsal operasyonları daha hızlı ve daha net yönetin.</p>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 14, color: "#e2e8f0" }}>Dönem:</label>
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: 180, background: "rgba(255,255,255,0.14)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>
            <option value="7" style={{ color: "#0f172a" }}>Son 7 gün</option>
            <option value="30" style={{ color: "#0f172a" }}>Son 30 gün</option>
            <option value="90" style={{ color: "#0f172a" }}>Son 90 gün</option>
            <option value="all" style={{ color: "#0f172a" }}>Tüm dönem</option>
          </select>
          <button onClick={() => setRange("30")} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.16)", color: "#fff" }}>Sıfırla</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard title="📈 Günlük Satış" value={loading ? "Yükleniyor..." : formatCurrency(metrics.dailyRevenue)} accent="#2563eb" />
        <StatCard title="📊 Aylık Satış" value={loading ? "Yükleniyor..." : formatCurrency(metrics.monthlyRevenue)} accent="#16a34a" />
        <StatCard title="🛒 Bekleyen Sipariş" value={loading ? "Yükleniyor..." : metrics.pendingOrders} accent="#7c3aed" />
        <StatCard title="💳 Cari Alacak" value={loading ? "Yükleniyor..." : formatCurrency(metrics.receivables)} accent="#0f766e" />
        <StatCard title="🏷️ Cari Borç" value={loading ? "Yükleniyor..." : formatCurrency(metrics.payables)} accent="#dc2626" />
        <StatCard title="💰 Kasa Bakiyesi" value={loading ? "Yükleniyor..." : formatCurrency(metrics.cashBalance)} accent="#d97706" />
        <StatCard title="🏦 Banka Bakiyesi" value={loading ? "Yükleniyor..." : formatCurrency(metrics.bankBalance)} accent="#2563eb" />
        <StatCard title="⚠️ Kritik Stok" value={loading ? "Yükleniyor..." : metrics.criticalStockCount} accent="#f59e0b" />
        <StatCard title="📦 Toplam Ürün" value={loading ? "Yükleniyor..." : metrics.productsCount} accent="#0ea5e9" />
        <StatCard title="👥 Toplam Müşteri" value={loading ? "Yükleniyor..." : metrics.customersCount} accent="#6366f1" />
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)" }}>
          <h3 style={{ marginBottom: 12 }}>🧭 Hızlı Erişim</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <QuickActionCard title="Müşteriler" description="Cari kayıtları yönet, iletişim ve bakiye takibini yap." href="/customers" accent="#2563eb" />
            <QuickActionCard title="Satış" description="Yeni satış oluştur, ödeme ve teslimat akışını yönetin." href="/sales" accent="#16a34a" />
            <QuickActionCard title="Fatura Oluştur" description="Müşteriye fatura gönder, muhasebe hareketini otomatik yaz." href="/invoices/create" accent="#7c3aed" />
            <QuickActionCard title="Raporlar" description="Satış, cari bakiye ve stok görünümünü izleyin." href="/reports" accent="#d97706" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <Panel title="📊 Aylık Satış" loading={loading}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
                {Object.entries(metrics.monthlySales).slice(-6).map(([month, value]) => (
                  <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: "100%", minHeight: 24, background: "#eff6ff", borderRadius: 10, position: "relative", overflow: "hidden" }}>
                      <div style={{ height: `${Math.max(10, (value / Math.max(...Object.values(metrics.monthlySales), 1)) * 100)}%`, background: "linear-gradient(180deg, #2563eb 0%, #0f172a 100%)", borderRadius: 10, width: "100%" }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{month}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="🏆 En Çok Satılan Ürünler" loading={loading}>
              <div style={{ display: "grid", gap: 10 }}>
                {metrics.topProducts.length === 0 ? (
                  <p style={{ color: "#64748b" }}>Henüz satış verisi yok.</p>
                ) : (
                  metrics.topProducts.map(([name, qty]) => (
                    <div key={name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span style={{ color: "#64748b" }}>{qty} adet</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0" }}>
                        <div style={{ width: `${Math.min(100, (qty / Math.max(...metrics.topProducts.map(([, value]) => value), 1)) * 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #2563eb 0%, #16a34a 100%)" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="📈 Satış Dağılımı" loading={loading}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <svg width="140" height="140" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                  {(() => {
                    const colors = ["#2563eb", "#16a34a", "#7c3aed", "#f59e0b", "#dc2626"];
                    let start = 0;
                    return Object.entries(metrics.distribution).map(([label, count], index) => {
                      const total = Object.values(metrics.distribution).reduce((s, value) => s + value, 0) || 1;
                      const percent = (count / total) * 100;
                      const length = (percent / 100) * 2 * Math.PI * 44;
                      const offset = start;
                      start += length;
                      return <circle key={label} cx="60" cy="60" r="44" fill="none" stroke={colors[index % colors.length]} strokeWidth="20" strokeDasharray={`${length} ${2 * Math.PI * 44 - length}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />;
                    });
                  })()}
                </svg>
                <div style={{ flex: 1, display: "grid", gap: 8 }}>
                  {Object.entries(metrics.distribution).length === 0 ? (
                    <p style={{ color: "#64748b" }}>Henüz dağılım yok.</p>
                  ) : (
                    Object.entries(metrics.distribution).map(([label, count], index) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: ["#2563eb", "#16a34a", "#7c3aed", "#f59e0b", "#dc2626"][index % 5] }} />
                          {label}
                        </span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <Panel title="🧾 Son Satışlar" loading={loading}>
              {metrics.recentSales.length === 0 ? <p style={{ color: "#64748b" }}>Henüz satış yok.</p> : metrics.recentSales.map((sale, index) => (
                <div key={sale._id || index} style={{ padding: "10px 0", borderBottom: index === metrics.recentSales.length - 1 ? "none" : "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700 }}>{sale.customerId?.companyName || sale.customerId?.name || "Müşteri"}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{formatCurrency(sale.totalAmount || 0)} • {sale.paymentType || "-"}</div>
                </div>
              ))}
            </Panel>

            <Panel title="📦 Son Siparişler" loading={loading}>
              {metrics.recentOrders.length === 0 ? <p style={{ color: "#64748b" }}>Bekleyen sipariş yok.</p> : metrics.recentOrders.map((sale, index) => (
                <div key={sale._id || index} style={{ padding: "10px 0", borderBottom: index === metrics.recentOrders.length - 1 ? "none" : "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700 }}>{sale.orderNumber || `Sipariş ${index + 1}`}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{sale.customerId?.companyName || sale.customerId?.name || "Müşteri"}</div>
                </div>
              ))}
            </Panel>

            <Panel title="💵 Son Tahsilatlar" loading={loading}>
              {metrics.recentCollections.length === 0 ? <p style={{ color: "#64748b" }}>Tahsilat yok.</p> : metrics.recentCollections.map((transaction, index) => (
                <div key={transaction._id || index} style={{ padding: "10px 0", borderBottom: index === metrics.recentCollections.length - 1 ? "none" : "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700 }}>{transaction.customerId?.companyName || transaction.customerId?.name || "Müşteri"}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{formatCurrency(transaction.amount || 0)} • {transaction.description || "Tahsilat"}</div>
                </div>
              ))}
            </Panel>

            <Panel title="💸 Son Ödemeler" loading={loading}>
              {metrics.recentPayments.length === 0 ? <p style={{ color: "#64748b" }}>Ödeme yok.</p> : metrics.recentPayments.map((transaction, index) => (
                <div key={transaction._id || index} style={{ padding: "10px 0", borderBottom: index === metrics.recentPayments.length - 1 ? "none" : "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700 }}>{transaction.customerId?.companyName || transaction.customerId?.name || "Müşteri"}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{formatCurrency(transaction.amount || 0)} • {transaction.description || "Ödeme"}</div>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Panel({ title, children, loading }) {
  return (
    <section style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)" }}>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      {loading ? <p style={{ color: "#64748b" }}>Yükleniyor...</p> : children}
    </section>
  );
}

export default Dashboard;
