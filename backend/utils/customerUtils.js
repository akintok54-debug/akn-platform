const normalizeCustomerPayload = (payload = {}) => {
  const typeMap = {
    CUSTOMER: 'customer',
    SUPPLIER: 'supplier',
    BOTH: 'both'
  };

  const normalized = {
    ...payload,
    name: payload.companyName || payload.name || '',
    companyName: payload.companyName || payload.name || '',
    type: typeMap[payload.type] || payload.type || 'customer',
    balance: Number(payload.balance ?? 0),
    riskLimit: Number(payload.riskLimit ?? 0),
    discountRate: Number(payload.discountRate ?? 0),
    customerCategory: payload.customerCategory || 'retail',
    mobilePhone: payload.mobilePhone || '',
    active: payload.active !== false,
    city: payload.city || '',
    district: payload.district || '',
    contactPerson: payload.contactPerson || '',
    note: payload.note || '',
    address: payload.address || '',
    taxOffice: payload.taxOffice || '',
    taxNumber: payload.taxNumber || '',
    phone: payload.phone || '',
    email: payload.email || ''
  };

  return normalized;
};

module.exports = {
  normalizeCustomerPayload
};
