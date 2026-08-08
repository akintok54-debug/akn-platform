const mongoose = require("mongoose");

const cashMovementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    }, // Hangi dükkanın kasası
    type: {
      type: String,
      enum: ["GIRIS", "CIKIS"], // Kasa Girişi (Tahsilat/Satış), Kasa Çıkışı (Ödeme/Gider)
      required: true,
    },
    category: {
      type: String,
      enum: ["SATIS", "TAHSILAT", "TEDARIKCI_ODEMESI", "GIDER", "DIGER"],
      required: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["NAKIT", "KREDI_KARTI", "HAVALE"],
      required: true,
    },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashMovement", cashMovementSchema);