const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const saleDetailSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    vatRate: { type: Number, default: 20, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "saleDetails" }
);

saleDetailSchema.plugin(softDeletePlugin);
saleDetailSchema.index({ saleId: 1, productId: 1 });

module.exports = mongoose.model("SaleDetail", saleDetailSchema);
