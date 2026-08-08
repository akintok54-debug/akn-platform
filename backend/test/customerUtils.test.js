const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCustomerPayload } = require('../utils/customerUtils');

test('normalizeCustomerPayload maps UI fields and converts type', () => {
  const payload = {
    companyName: 'AKN A.Ş.',
    type: 'CUSTOMER',
    phone: '0555 123 45 67',
    email: 'info@akn.com',
    taxOffice: 'Merkez',
    taxNumber: '1234567890',
    address: 'İstanbul',
    riskLimit: '25000',
    balance: '1000'
  };

  const result = normalizeCustomerPayload(payload);

  assert.equal(result.companyName, 'AKN A.Ş.');
  assert.equal(result.name, 'AKN A.Ş.');
  assert.equal(result.type, 'customer');
  assert.equal(result.phone, '0555 123 45 67');
  assert.equal(result.riskLimit, 25000);
  assert.equal(result.balance, 1000);
});

test('normalizeCustomerPayload handles supplier and both values', () => {
  const result = normalizeCustomerPayload({ type: 'BOTH', companyName: 'Test' });
  assert.equal(result.type, 'both');
});

test('normalizeCustomerPayload preserves CRM fields for professional customer records', () => {
  const result = normalizeCustomerPayload({
    companyName: 'AKN A.Ş.',
    mobilePhone: '0555 111 22 33',
    discountRate: '10',
    customerCategory: 'dealer',
    customerCode: 'CR1001'
  });

  assert.equal(result.companyName, 'AKN A.Ş.');
  assert.equal(result.mobilePhone, '0555 111 22 33');
  assert.equal(result.discountRate, 10);
  assert.equal(result.customerCategory, 'dealer');
  assert.equal(result.customerCode, 'CR1001');
});
