const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const purchaseSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: false, index: true },
    purchaseNo: { type: String, required: true, trim: true },
    purchaseDate: { type: Date, default: Date.now, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    vatTotal: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["PAID", "PARTIAL", "UNPAID"], default: "UNPAID" },
    note: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "purchases" }
);

purchaseSchema.plugin(softDeletePlugin);
purchaseSchema.index({ companyId: 1, purchaseNo: 1 }, { unique: true });

module.exports = mongoose.model("Purchase", purchaseSchema);
