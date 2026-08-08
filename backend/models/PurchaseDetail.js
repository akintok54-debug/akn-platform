const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const purchaseDetailSchema = new mongoose.Schema(
  {
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unitPrice: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 20, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "purchaseDetails" }
);

purchaseDetailSchema.plugin(softDeletePlugin);
purchaseDetailSchema.index({ purchaseId: 1, productId: 1 });

module.exports = mongoose.model("PurchaseDetail", purchaseDetailSchema);
