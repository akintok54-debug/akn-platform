const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, default: "Adet" },
  unitPrice: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 20, enum: [0, 8, 18, 20] }, // KDV Oranları
  taxAmount: { type: Number, required: true },
  totalPrice: { type: Number, required: true }, // KDV hariç
  totalWithTax: { type: Number, required: true }, // KDV dahil
});

const invoiceSchema = new mongoose.Schema(
  {
    // TEMEL BİLGİLER
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true,
    },
    uuid: { type: String, unique: true, sparse: true },
    
    // MÜŞTERI BİLGİLERİ
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: { type: String, required: true },
    customerTaxNumber: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerEmail: { type: String, default: "" },

    // REFERANS
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

    // TARİH & TİP
    invoiceDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date },
    invoiceType: {
      type: String,
      enum: ["E_FATURA", "E_ARSIV", "NORMAL"],
      default: "E_ARSIV",
    },
    
    // KALEMLER & HESAPLAMALAR
    items: [invoiceItemSchema],
    notes: { type: String, default: "" },
    
    // TOPLAM HESAPLAMALAR
    subTotal: { type: Number, required: true, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxBreakdown: {
      tax0: { type: Number, default: 0 },
      tax8: { type: Number, default: 0 },
      tax18: { type: Number, default: 0 },
      tax20: { type: Number, default: 0 },
    },
    taxTotal: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    
    // ÖDEME BİLGİSİ
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "CARD", "CHECK", "OTHER"],
      default: "CASH",
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIAL", "UNPAID", "OVERDUE"],
      default: "UNPAID",
      index: true,
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0 },
    
    // STATU & GİB
    status: {
      type: String,
      enum: ["TASLAK", "GONDERILDI", "ONAYLANDI", "IPTAL", "IADE"],
      default: "TASLAK",
      index: true,
    },
    gibResponseCode: { type: String },
    gibResponseMessage: { type: String },
    gibResponseTime: { type: Date },
    
    // DEPO & KARGO
    warehouse: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    
    // AUDIT
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "invoices" }
);

invoiceSchema.plugin(softDeletePlugin);

// İndeksler
invoiceSchema.index({ companyId: 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, customerId: 1 });
invoiceSchema.index({ companyId: 1, paymentStatus: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

// Virtual: Ödenen tutar / Toplam
invoiceSchema.virtual("paymentPercentage").get(function () {
  return this.grandTotal > 0 ? (this.paidAmount / this.grandTotal) * 100 : 0;
});

module.exports = mongoose.model("Invoice", invoiceSchema);