const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    dealerPrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    selectedPriceType: {
      type: String,
      enum: ["BAYI", "PERAKENDE"],
      default: "PERAKENDE",
    },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    customerName: { type: String, default: "Müşteri" },
    items: {
      type: [orderItemSchema],
      validate: [(value) => Array.isArray(value) && value.length > 0, "Sipariş kalemi gereklidir."],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["GELEN_SIPARISLER", "HAZIRLANIYOR", "KARGODA", "TESLIM_EDILDI"],
      default: "GELEN_SIPARISLER",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
