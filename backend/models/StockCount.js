const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const stockCountSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    countedQuantity: { type: Number, required: true, min: 0 },
    systemQuantity: { type: Number, required: true, min: 0 },
    difference: { type: Number, required: true },
    countDate: { type: Date, default: Date.now, index: true },
    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "stockCounts" }
);

stockCountSchema.plugin(softDeletePlugin);
stockCountSchema.index({ companyId: 1, warehouseId: 1, countDate: -1 });

module.exports = mongoose.model("StockCount", stockCountSchema);
