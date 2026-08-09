const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const paymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    
    // REFERANS: Fatura veya CurrentAccount
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    currentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurrentAccount",
      index: true,
    },
    
    // ÖDEME BİLGİSİ
    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ["CASH", "BANK", "CARD", "CHECK", "TRANSFER", "OTHER"],
      default: "CASH",
    },
    paymentDate: { type: Date, default: Date.now, index: true },
    
    // DETAY
    referenceNo: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
    checkNumber: { type: String, default: "", trim: true },
    transactionId: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    
    // ONAY
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED"],
      default: "CONFIRMED",
      index: true,
    },
    
    // AUDIT
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "payments" }
);

paymentSchema.plugin(softDeletePlugin);
paymentSchema.index({ companyId: 1, paymentDate: -1 });
paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ currentAccountId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
