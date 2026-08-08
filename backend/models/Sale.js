const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [saleItemSchema],
    totalAmount: { type: Number, required: true },
    vatTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentType: {
      type: String,
      enum: ["NAKIT", "KREDI_KARTI", "ACIK_HESAP", "HAVALE"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["ODENDI", "KISMEN_ODENDI", "VERESIYE", "IPTAL"],
      default: "ODENDI",
    },
    deliveryStatus: {
      type: String,
      enum: ["BEKLEMEDE", "HAZIRLANDI", "TESLIM_EDILDI"],
      default: "BEKLEMEDE",
    },
    orderNumber: { type: String, default: "" },
    referenceNo: { type: String, default: "" },
    saleDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);