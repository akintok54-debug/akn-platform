const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const cashRegisterSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    currency: { type: String, default: "TRY", trim: true },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "cashRegisters" }
);

cashRegisterSchema.plugin(softDeletePlugin);
cashRegisterSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("CashRegister", cashRegisterSchema);
