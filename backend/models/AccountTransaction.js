const mongoose = require("mongoose");

const accountTransactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: ["BORC", "ALACAK"], // Borç: Müşterinin borçlanması (Satış), Alacak: Müşterinin ödeme yapması (Tahsilat)
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String }, // Örn: "Fatura No: 123 veya Nakit Tahsilat"
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    }, // İlgili satış (varsa)
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccountTransaction", accountTransactionSchema);