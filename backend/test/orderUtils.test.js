const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOrderStatus, getOrderStatusLabel } = require('../utils/orderUtils');

test('normalizeOrderStatus maps management statuses to canonical values', () => {
  assert.equal(normalizeOrderStatus('Hazırlanıyor'), 'HAZIRLANDI');
  assert.equal(normalizeOrderStatus('Kargoda'), 'KARGODA');
  assert.equal(normalizeOrderStatus('Teslim edildi'), 'TESLIM_EDILDI');
});

test('getOrderStatusLabel returns user-friendly labels', () => {
  assert.equal(getOrderStatusLabel('BEKLEMEDE'), 'Gelen Sipariş');
  assert.equal(getOrderStatusLabel('KARGODA'), 'Kargoda');
});
