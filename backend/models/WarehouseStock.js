const mongoose = require("mongoose");

const warehouseStockSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, default: 0 }, // O depodaki miktar (Eksiye düşerse kontrol sağlayacağız)
  },
  { timestamps: true }
);

module.exports = mongoose.model("WarehouseStock", warehouseStockSchema);