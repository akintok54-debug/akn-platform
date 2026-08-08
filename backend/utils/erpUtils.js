const buildErpOverview = ({ products = [], customers = [], sales = [], accounts = [], transactions = [] }) => {
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((customer) => customer.active !== false).length;
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const monthlyRevenue = sales.reduce((sum, sale) => {
    const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
    const now = new Date();
    const isCurrentMonth = saleDate && saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    return isCurrentMonth ? sum + Number(sale.totalAmount || 0) : sum;
  }, 0);
  const pendingOrders = sales.filter((sale) => sale.deliveryStatus === 'BEKLEMEDE').length;
  const openReceivables = customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance || 0)), 0);
  const openPayables = customers.reduce((sum, customer) => sum + Math.max(0, -Number(customer.balance || 0)), 0);
  const cashBalance = accounts.filter((account) => account.type === 'KASA').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const bankBalance = accounts.filter((account) => account.type === 'BANKA').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const criticalStock = products.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0)).length;

  const monthlySales = sales.reduce((acc, sale) => {
    const month = sale.createdAt ? new Date(sale.createdAt).toLocaleString('tr-TR', { month: 'short' }) : '-';
    acc[month] = (acc[month] || 0) + Number(sale.totalAmount || 0);
    return acc;
  }, {});

  const productSales = sales.reduce((acc, sale) => {
    (sale.items || []).forEach((item) => {
      const name = item.productId?.name || item.productName || 'Bilinmeyen Ürün';
      acc[name] = (acc[name] || 0) + Number(item.quantity || 0);
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const distribution = sales.reduce((acc, sale) => {
    const paymentType = sale.paymentType || 'BİLİNMİYOR';
    acc[paymentType] = (acc[paymentType] || 0) + 1;
    return acc;
  }, {});

  const recentSales = [...sales].slice(0, 6);
  const recentOrders = [...sales].filter((sale) => sale.deliveryStatus === 'BEKLEMEDE').slice(0, 6);
  const recentCollections = [...transactions].filter((transaction) => transaction.type === 'ALACAK').slice(0, 6);
  const recentPayments = [...transactions].filter((transaction) => transaction.type === 'BORC').slice(0, 6);
  const latestActivity = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 8);

  return {
    totalProducts,
    totalCustomers,
    activeCustomers,
    totalSales,
    totalRevenue,
    monthlyRevenue,
    pendingOrders,
    openReceivables,
    openPayables,
    cashBalance,
    bankBalance,
    criticalStock,
    monthlySales,
    topProducts,
    distribution,
    recentSales,
    recentOrders,
    recentCollections,
    recentPayments,
    latestActivity,
  };
};

module.exports = {
  buildErpOverview,
};
