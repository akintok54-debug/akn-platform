const mongoose = require("mongoose");

const purchaseInvoiceItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    barcode: {
      type: String,
      default: "",
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    vatRate: {
      type: Number,
      default: 20,
      min: 0,
    },

    discountRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    lineNet: {
      type: Number,
      required: true,
      min: 0,
    },

    lineVat: {
      type: Number,
      required: true,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    invoiceNo: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    items: {
      type: [purchaseInvoiceItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    vatTotal: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "OPEN_ACCOUNT",
        "CASH",
        "BANK",
        "POS",
        "PROMISSORY_NOTE",
        "CHECK",
        "CREDIT_CARD",
      ],
      default: "OPEN_ACCOUNT",
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

purchaseInvoiceSchema.index(
  { companyId: 1, invoiceNo: 1 },
  { unique: true }
);

purchaseInvoiceSchema.index({ companyId: 1, supplierId: 1, invoiceDate: -1 });

module.exports =
  mongoose.models.PurchaseInvoice ||
  mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);