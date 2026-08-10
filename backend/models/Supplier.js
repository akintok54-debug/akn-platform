const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const supplierSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    taxNumber: { type: String, default: "", trim: true },
    taxOffice: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastTransactionDate: { type: Date, default: null },
    bankInfo: {
      bankName: { type: String, default: "", trim: true },
      accountHolder: { type: String, default: "", trim: true },
      iban: { type: String, default: "", trim: true },
      accountNumber: { type: String, default: "", trim: true },
      branchCode: { type: String, default: "", trim: true },
    },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "suppliers" }
);

supplierSchema.plugin(softDeletePlugin);
supplierSchema.index({ companyId: 1, code: 1 }, { unique: true });
supplierSchema.index({ companyId: 1, name: 1 });
supplierSchema.index({ companyId: 1, category: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
