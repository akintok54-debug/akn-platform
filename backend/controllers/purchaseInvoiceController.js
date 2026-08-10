const mongoose = require("mongoose");
const PurchaseInvoice = require("../models/PurchaseInvoice");
const SupplierTransaction = require("../models/SupplierTransaction");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const Warehouse = require("../models/Warehouse");

const getCompanyId = (req) =>
  req.user?.companyId || req.user?.company || null;

const PAYMENT_METHODS = [
  "OPEN_ACCOUNT",
  "CASH",
  "BANK",
  "POS",
  "PROMISSORY_NOTE",
  "CHECK",
  "CREDIT_CARD",
];

const isDebtPaymentMethod = (method) =>
  ["OPEN_ACCOUNT", "PROMISSORY_NOTE", "CHECK"].includes(method);

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// ======================================================
// ALIŞ FATURASI OLUŞTUR
// Fatura + stok + tedarikçi cari işlemi TEK TRANSACTION
// ======================================================
const createPurchaseInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const companyId = getCompanyId(req);

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error("Şirket bilgisi bulunamadı.");
    }

    const {
      supplierId,
      invoiceNo,
      invoiceDate,
      dueDate,
      items,
      paymentMethod = "OPEN_ACCOUNT",
      note = "",
      warehouseId = null,
    } = req.body;

    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new Error("Geçerli bir tedarikçi seçilmelidir.");
    }

    if (!invoiceNo || !String(invoiceNo).trim()) {
      throw new Error("Fatura numarası zorunludur.");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Faturada en az bir ürün bulunmalıdır.");
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error("Geçersiz ödeme yöntemi.");
    }

    // --------------------------------------------------
    // Tedarikçi kontrolü
    // --------------------------------------------------
    const supplier = await Supplier.findOne({
      _id: supplierId,
      companyId,
    }).session(session);

    if (!supplier) {
      throw new Error("Tedarikçi bulunamadı.");
    }

    // --------------------------------------------------
    // Aynı fatura numarası daha önce kullanılmış mı?
    // --------------------------------------------------
    const existingInvoice = await PurchaseInvoice.findOne({
      companyId,
      invoiceNo: String(invoiceNo).trim(),
    }).session(session);

    if (existingInvoice) {
      throw new Error("Bu fatura numarası daha önce kaydedilmiş.");
    }

    // --------------------------------------------------
    // Depo kontrolü
    // --------------------------------------------------
    let validWarehouseId = null;

    if (warehouseId) {
      if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
        throw new Error("Geçersiz depo.");
      }

      const warehouse = await Warehouse.findOne({
        _id: warehouseId,
        companyId,
      }).session(session);

      if (!warehouse) {
        throw new Error("Depo bulunamadı.");
      }

      validWarehouseId = warehouse._id;
    }

    // --------------------------------------------------
    // Ürünleri doğrula ve fatura satırlarını oluştur
    // --------------------------------------------------
    const invoiceItems = [];

    let subtotal = 0;
    let vatTotal = 0;
    let grandTotal = 0;

    for (const item of items) {
      if (!item.productId) {
        throw new Error("Fatura satırında ürün bulunamadı.");
      }

      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        throw new Error("Geçersiz ürün ID.");
      }

      const quantity = toNumber(item.quantity);

      if (quantity <= 0) {
        throw new Error("Ürün miktarı sıfırdan büyük olmalıdır.");
      }

      const unitPrice = toNumber(item.unitPrice);

      if (unitPrice < 0) {
        throw new Error("Alış fiyatı negatif olamaz.");
      }

      const product = await Product.findOne({
        _id: item.productId,
        company: companyId,
      }).session(session);

      if (!product) {
        throw new Error(`Ürün bulunamadı: ${item.productId}`);
      }

      const vatRate = Math.max(0, toNumber(item.vatRate, product.vat || 20));
      const discountRate = Math.max(0, toNumber(item.discountRate, 0));

      const gross = quantity * unitPrice;
      const discountAmount = gross * (discountRate / 100);
      const lineNet = gross - discountAmount;
      const lineVat = lineNet * (vatRate / 100);
      const lineTotal = lineNet + lineVat;

      subtotal += lineNet;
      vatTotal += lineVat;
      grandTotal += lineTotal;

      invoiceItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        quantity,
        unitPrice,
        vatRate,
        discountRate,
        lineNet,
        lineVat,
        lineTotal,
      });

      // ----------------------------------------------
      // STOK GİRİŞİ
      // ----------------------------------------------
      const previousStock = toNumber(product.stock);
      const newStock = previousStock + quantity;

      product.stock = newStock;

      // Alış fiyatını da güncelle
      product.purchasePrice = unitPrice;

      await product.save({ session });

      await StockMovement.create(
        [
          {
            companyId,
            productId: product._id,
            warehouseId: validWarehouseId,
            movementType: "STOK_GIRIS",
            quantity,
            previousStock,
            newStock,
            description: `Alış faturası: ${String(invoiceNo).trim()}`,
            createdBy: req.user?.id,
            movementDate: invoiceDate
              ? new Date(invoiceDate)
              : new Date(),
          },
        ],
        { session }
      );
    }

    subtotal = Number(subtotal.toFixed(2));
    vatTotal = Number(vatTotal.toFixed(2));
    grandTotal = Number(grandTotal.toFixed(2));

    // --------------------------------------------------
    // ÖDEME DURUMU
    // --------------------------------------------------
    const isDebt = isDebtPaymentMethod(paymentMethod);

    const paymentStatus = isDebt ? "UNPAID" : "PAID";

    // --------------------------------------------------
    // FATURAYI OLUŞTUR
    // --------------------------------------------------
    const createdInvoices = await PurchaseInvoice.create(
      [
        {
          companyId,
          supplierId: supplier._id,
          invoiceNo: String(invoiceNo).trim(),
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          items: invoiceItems,
          subtotal,
          vatTotal,
          grandTotal,
          paymentMethod,
          paymentStatus,
          note: String(note || "").trim(),
          warehouseId: validWarehouseId,
          createdBy: req.user?.id || null,
        },
      ],
      { session }
    );

    const invoice = createdInvoices[0];

    // --------------------------------------------------
    // TEDARİKÇİ CARİSİ
    // Sadece borç doğuran yöntemlerde cari bakiye artar.
    // --------------------------------------------------
    if (isDebt) {
      const currentBalance = toNumber(supplier.currentBalance);

      supplier.currentBalance = Number(
        (currentBalance + grandTotal).toFixed(2)
      );

      supplier.lastTransactionDate = new Date();

      await supplier.save({ session });

      await SupplierTransaction.create(
        [
          {
            companyId,
            supplierId: supplier._id,
            purchaseInvoiceId: invoice._id,
            type: "PURCHASE",
            amount: grandTotal,
            paymentMethod,
            documentNo: String(invoiceNo).trim(),
            description: `Alış faturası - ${String(invoiceNo).trim()}`,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: "OPEN",
            createdBy: req.user?.id || null,
            transactionDate: invoiceDate
              ? new Date(invoiceDate)
              : new Date(),
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Alış faturası başarıyla oluşturuldu.",
      invoice,
      supplier: {
        _id: supplier._id,
        name: supplier.name,
        currentBalance: supplier.currentBalance,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(400).json({
      success: false,
      message: error.message || "Alış faturası oluşturulamadı.",
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createPurchaseInvoice,
};