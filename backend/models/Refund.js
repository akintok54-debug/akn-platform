const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const refundSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: false, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false, index: true },
    quantity: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "APPROVED" },
    refundDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "refunds" }
);

refundSchema.plugin(softDeletePlugin);
refundSchema.index({ companyId: 1, customerId: 1, refundDate: -1 });

module.exports = mongoose.model("Refund", refundSchema);
