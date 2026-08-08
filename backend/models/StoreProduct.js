const mongoose = require("mongoose");

const storeProductSchema = new mongoose.Schema(
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
    }, // Hangi tamircinin/dükkanın dükkanı
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    }, // Ana katalogdaki parça (Örn: Honda PCX Silindir)
    salePrice: { type: Number, required: true }, // Tamircinin belirlediği perakende satış fiyatı
    stock: { type: Number, required: true, default: 0 }, // Dükkandaki anlık adet
    barcode: { type: String }, // Hızlı barkod okutarak bulabilmesi için
    shelfLocation: { type: String }, // Raf numarası (Örn: Raf A-3)
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreProduct", storeProductSchema);