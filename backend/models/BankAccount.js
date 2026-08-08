const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const bankAccountSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    iban: { type: String, required: true, trim: true },
    bankName: { type: String, default: "", trim: true },
    branchName: { type: String, default: "", trim: true },
    accountNo: { type: String, default: "", trim: true },
    currency: { type: String, default: "TRY", trim: true },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "bankAccounts" }
);

bankAccountSchema.plugin(softDeletePlugin);
bankAccountSchema.index({ companyId: 1, iban: 1 }, { unique: true });

module.exports = mongoose.model("BankAccount", bankAccountSchema);
