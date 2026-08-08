const test = require('node:test');
const assert = require('node:assert/strict');
const { buildErpOverview } = require('../utils/erpUtils');

test('buildErpOverview aggregates critical ERP metrics', () => {
  const overview = buildErpOverview({
    products: [{ stock: 2, minStock: 5 }, { stock: 10, minStock: 5 }],
    customers: [{ balance: 1500, active: true }, { balance: -400, active: false }],
    sales: [
      { totalAmount: 1000, deliveryStatus: 'BEKLEMEDE', items: [{ quantity: 2 }], paymentType: 'NAKIT', createdAt: '2026-08-01T00:00:00.000Z' },
      { totalAmount: 500, deliveryStatus: 'TESLIM_EDILDI', items: [{ quantity: 1 }], paymentType: 'HAVALE', createdAt: '2026-08-02T00:00:00.000Z' },
    ],
    accounts: [{ type: 'KASA', balance: 4000 }, { type: 'BANKA', balance: 8000 }],
    transactions: [{ type: 'ALACAK', amount: 100 }, { type: 'BORC', amount: 50 }],
  });

  assert.equal(overview.totalProducts, 2);
  assert.equal(overview.totalCustomers, 2);
  assert.equal(overview.activeCustomers, 1);
  assert.equal(overview.pendingOrders, 1);
  assert.equal(overview.openReceivables, 1500);
  assert.equal(overview.criticalStock, 1);
  assert.equal(overview.cashBalance, 4000);
  assert.equal(overview.bankBalance, 8000);
  assert.equal(overview.totalRevenue, 1500);
});
