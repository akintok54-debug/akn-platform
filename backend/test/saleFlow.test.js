const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateSaleTotals, shouldApplyStockMovement } = require("../utils/saleFlow");

test("calculateSaleTotals computes VAT, discount and due amount correctly", () => {
  const result = calculateSaleTotals({ subtotal: 100, vatRate: 20, discount: 10, paidAmount: 60 });
  assert.equal(result.vatTotal, 20);
  assert.equal(result.totalAmount, 110);
  assert.equal(result.dueAmount, 50);
});

test("stock movement is skipped for draft and cancelled sales", () => {
  assert.equal(shouldApplyStockMovement({ status: "TASLAK" }), false);
  assert.equal(shouldApplyStockMovement({ paymentStatus: "IPTAL" }), false);
  assert.equal(shouldApplyStockMovement({ status: "ONAYLANDI" }), true);
});
