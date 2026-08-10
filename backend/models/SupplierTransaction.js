const mongoose = require("mongoose");

const supplierTransactionSchema = new mongoose.Schema(
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

    purchaseInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseInvoice",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "PURCHASE",
        "PAYMENT",
        "RETURN",
        "ADJUSTMENT",
      ],
      required: true,
    },

    amount: {
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
        null,
      ],
      default: null,
    },

    documentNo: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["OPEN", "PAID", "PARTIAL", "CANCELLED"],
      default: "OPEN",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

supplierTransactionSchema.index({
  companyId: 1,
  supplierId: 1,
  transactionDate: -1,
});

supplierTransactionSchema.index({
  companyId: 1,
  paymentMethod: 1,
  status: 1,
});

module.exports =
  mongoose.models.SupplierTransaction ||
  mongoose.model("SupplierTransaction", supplierTransactionSchema);