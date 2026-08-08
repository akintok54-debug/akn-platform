const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const currentTransactionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    currentAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "CurrentAccount", required: true, index: true },
    transactionType: { type: String, enum: ["BORC", "ALACAK"], required: true },
    sourceType: { type: String, enum: ["SALE", "PURCHASE", "PAYMENT", "COLLECTION", "MANUAL"], default: "MANUAL" },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, default: "", trim: true },
    transactionDate: { type: Date, default: Date.now, index: true },
    balanceAfter: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "currentTransactions" }
);

currentTransactionSchema.plugin(softDeletePlugin);
currentTransactionSchema.index({ companyId: 1, currentAccountId: 1, transactionDate: -1 });

module.exports = mongoose.model("CurrentTransaction", currentTransactionSchema);
