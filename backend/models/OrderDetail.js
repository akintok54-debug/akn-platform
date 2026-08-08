const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const orderDetailSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    selectedPriceType: { type: String, enum: ["BAYI", "PERAKENDE"], default: "PERAKENDE" },
  },
  { timestamps: true, collection: "orderDetails" }
);

orderDetailSchema.plugin(softDeletePlugin);
orderDetailSchema.index({ orderId: 1, productId: 1 });

module.exports = mongoose.model("OrderDetail", orderDetailSchema);
