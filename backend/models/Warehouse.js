const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true }, // Örn: Merkez Depo, Araç Deposu (Gezici)
    isDefault: { type: Boolean, default: false }, // Varsayılan depo mu?
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warehouse", warehouseSchema);