const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    operation: {
      type: String,
      enum: ["KASA_GIRIS", "KASA_CIKIS", "KASA_TRANSFERI"],
      required: true,
    },
    transactionType: {
      type: String,
      enum: [
        "TAHSILAT",
        "PESIN_SATIS",
        "PERSONEL_AVANSI",
        "KARGO",
        "ELEKTRIK",
        "KIRA",
        "YEMEK",
        "BANKAYA_PARA_AKTAR",
        "BANKADAN_PARA_AL",
        "DIGER",
      ],
      required: true,
    },
    transferDirection: {
      type: String,
      enum: ["BANKAYA", "BANKADAN", "YOK"],
      default: "YOK",
    },
    date: { type: Date, required: true },
    documentNo: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0.01 },
    cashIn: { type: Number, default: 0 },
    cashOut: { type: Number, default: 0 },
    balanceAfter: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },
    cashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);
