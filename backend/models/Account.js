const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Zorunluluğu kaldırdık
    },
    name: { type: String, required: true }, // Örn: Merkez Kasa, Garanti Bankası
    type: {
      type: String,
      enum: ["KASA", "BANKA", "POS"],
      default: "KASA",
    },
    currency: { type: String, default: "TRY" },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);