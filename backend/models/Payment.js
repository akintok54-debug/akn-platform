const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const paymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    currentAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "CurrentAccount", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["CASH", "BANK", "CARD", "OTHER"], default: "CASH" },
    paymentDate: { type: Date, default: Date.now, index: true },
    referenceNo: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "payments" }
);

paymentSchema.plugin(softDeletePlugin);
paymentSchema.index({ companyId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
