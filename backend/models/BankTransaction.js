const mongoose = require("mongoose");

const bankTransactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    operation: {
      type: String,
      enum: ["PARA_GIRIS", "PARA_CIKIS", "EFT", "HAVALE", "BANKALAR_ARASI_TRANSFER"],
      required: true,
    },
    date: { type: Date, required: true },
    documentNo: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0.01 },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },
    balanceAfter: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankTransaction", bankTransactionSchema);
