const mongoose = require('mongoose');

const permissionProfileSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: { type: String, required: true },
  role: { type: String, default: 'sales' },
  permissions: {
    customers: { type: Boolean, default: true },
    products: { type: Boolean, default: true },
    sales: { type: Boolean, default: true },
    invoices: { type: Boolean, default: true },
    accounting: { type: Boolean, default: false },
    reports: { type: Boolean, default: true },
    settings: { type: Boolean, default: false },
    cash: { type: Boolean, default: false },
    bank: { type: Boolean, default: false },
    inventory: { type: Boolean, default: true },
    approvePayments: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model('PermissionProfile', permissionProfileSchema);
