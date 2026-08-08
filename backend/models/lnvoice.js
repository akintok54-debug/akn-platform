const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 20 }, // KDV Oranı (%20)
  totalPrice: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    }, // Hangi satışa ait olduğu (varsa)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    }, // Faturanın kesildiği müşteri / alıcı
    invoiceNumber: { type: String, unique: true, sparse: true }, // GİB Fatura Numarası (Örn: GIB2026000000001)
    uuid: { type: String }, // GİB E-Fatura / E-Arşiv Benzersiz ID'si
    invoiceType: {
      type: String,
      enum: ["E_FATURA", "E_ARSIV"],
      required: true,
    },
    items: [invoiceItemSchema],
    subTotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ["TASLAK", "GONDERILDI", "ONAYLANDI", "IPTAL"],
      default: "TASLAK",
    },
    gibResponseCode: { type: String }, // GİB'den dönen durum kodu
    gibResponseMessage: { type: String }, // GİB hata veya başarı mesajı
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);