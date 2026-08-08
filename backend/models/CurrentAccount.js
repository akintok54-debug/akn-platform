const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const currentAccountSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: false, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: false, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    accountType: { type: String, enum: ["CUSTOMER", "SUPPLIER", "MIXED"], default: "CUSTOMER" },
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "currentAccounts" }
);

currentAccountSchema.plugin(softDeletePlugin);
currentAccountSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("CurrentAccount", currentAccountSchema);
