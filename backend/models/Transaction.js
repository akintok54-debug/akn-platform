const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"], // INCOME: Tahsilat, EXPENSE: Ödeme
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);