const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const WarehouseStock = require("../models/WarehouseStock");
const StoreProduct = require("../models/StoreProduct");
const Customer = require("../models/customer");
const AccountTransaction = require("../models/AccountTransaction");
const Account = require("../models/Account");
const Invoice = require("../models/lnvoice");
const Product = require("../models/Product");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { getCompanyId } = require("../utils/tenantScope");
const { calculateSaleTotals, shouldApplyStockMovement } = require("../utils/saleFlow");

const PLACEHOLDER_WAREHOUSE_ID = "000000000000000000000000";

const findOrCreateRetailCustomer = async ({ companyId }) => {
  let retailCustomer = await Customer.findOne({ company: companyId, customerCategory: "retail" });

  if (!retailCustomer) {
    retailCustomer = await Customer.create({
      company: companyId,
      customerCode: `RTL-${Date.now()}`,
      companyName: "Perakende Satış",
      name: "Perakende Satış",
      customerCategory: "retail",
      active: true,
      type: "customer",
      balance: 0,
    });
  }

  return retailCustomer;
};

// 1. Yeni Satış / Sepet Tamamlama İşlemi
exports.createSale = async (req, res) => {
  try {
    const {
      storeId,
      customerId,
      items,
      paymentType,
      warehouseId,
      orderNumber,
      referenceNo,
      saleDate,
      paymentStatus,
      deliveryStatus,
      discount,
      paidAmount,
      notes,
      vatRate,
      customerDiscountRate,
      repDiscountRate,
      retailSale,
    } = req.body;
    const companyId = getCompanyId(req);
    const userId = req.user?.id || req.user?._id;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    // İskonto yetki kontrolü (sales rolü için)
    const dbUser = userId ? await User.findById(userId).select('role maxDiscountRate discountAllowedPaymentTypes name').lean() : null;
    const userRole = dbUser?.role || req.user?.role;
    const normalizedRepRate = Number(repDiscountRate || 0);
    const normalizedCustRate = Number(customerDiscountRate || 0);
    const isRetailSale = Boolean(retailSale);

    if (userRole === 'sales' && normalizedRepRate > 0) {
      const maxRate = dbUser?.maxDiscountRate ?? 3;
      if (normalizedRepRate > maxRate) {
        return res.status(403).json({ success: false, message: `Bu kullanıcı maksimum %${maxRate} temsilci iskontosu uygulayabilir.` });
      }
      const allowedTypes = dbUser?.discountAllowedPaymentTypes?.length ? dbUser.discountAllowedPaymentTypes : ['NAKIT'];
      if (!allowedTypes.includes(paymentType)) {
        return res.status(403).json({ success: false, message: `Temsilci iskontosu yalnızca ${allowedTypes.join(', ')} ödemelerinde geçerlidir.` });
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Sepette ürün bulunmuyor." });
    }

    let subtotal = 0;
    const processedItems = [];
    const normalizedStoreId = storeId || new mongoose.Types.ObjectId();
    const normalizedWarehouseId = warehouseId || new mongoose.Types.ObjectId();
    let finalPaymentStatus = paymentStatus || "ODENDI";
    if (paymentType === "ACIK_HESAP" || finalPaymentStatus === "VERESIYE") {
      finalPaymentStatus = "VERESIYE";
    }

    let customer = null;
    let normalizedCustomerId = customerId || null;
    if (isRetailSale && !normalizedCustomerId) {
      customer = await findOrCreateRetailCustomer({ companyId });
      normalizedCustomerId = customer._id;
    }

    if (!normalizedCustomerId) {
      return res.status(400).json({ success: false, message: "Musteri secimi zorunludur." });
    }

    if (!customer) {
      customer = await Customer.findOne({ _id: normalizedCustomerId, company: companyId });
    }

    if (!customer) {
      return res.status(404).json({ success: false, message: "Musteri bulunamadi." });
    }

    let account = await Account.findOne({ companyId });
    if (!account) {
      account = await Account.create({
        companyId,
        name: 'Merkez Kasa',
        type: 'KASA',
        currency: 'TRY',
        balance: 0,
      });
    }
    const normalizedDiscount = Number(discount || 0);
    const normalizedPaidAmount = Number(paidAmount || 0);
    const normalizedVatRate = Number(vatRate || 20);
    const normalizedSaleDate = saleDate ? new Date(saleDate) : new Date();
    const shouldTrackStock = shouldApplyStockMovement({ status: paymentStatus, paymentStatus: finalPaymentStatus });
    const shouldTrackWarehouse = Boolean(normalizedWarehouseId && String(normalizedWarehouseId) !== PLACEHOLDER_WAREHOUSE_ID);

    for (let item of items) {
      const { productId, quantity, unitPrice } = item;
      const parsedQuantity = Number(quantity || 0);
      const parsedUnitPrice = Number(unitPrice || 0);

      const product = await Product.findOne({ _id: productId, company: companyId });
      if (!product) {
        return res.status(404).json({ success: false, message: `Urun bulunamadi: ${productId}` });
      }

      const itemTotal = parsedQuantity * parsedUnitPrice;
      subtotal += itemTotal;

      processedItems.push({
        productId,
        productName: product.name,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice,
        totalPrice: itemTotal,
      });

      if (shouldTrackStock && shouldTrackWarehouse) {
        let whStock = await WarehouseStock.findOne({ companyId, warehouseId: normalizedWarehouseId, productId: product._id });

        if (!whStock) {
          whStock = new WarehouseStock({ companyId, warehouseId: normalizedWarehouseId, productId: product._id, quantity: 0 });
        }

        if ((whStock.quantity || 0) < parsedQuantity) {
          return res.status(400).json({ success: false, message: `Stok yetersiz: ${product.name}` });
        }

        whStock.quantity -= parsedQuantity;
        await whStock.save();
      }

      if (shouldTrackStock && !shouldTrackWarehouse) {
        if (Number(product.stock || 0) < parsedQuantity) {
          return res.status(400).json({ success: false, message: `Stok yetersiz: ${product.name}` });
        }
        product.stock = Number(product.stock || 0) - parsedQuantity;
        await product.save();
      }
    }

    const { vatTotal, totalAmount, dueAmount } = calculateSaleTotals({
      subtotal,
      vatRate: normalizedVatRate,
      discount: normalizedDiscount,
      paidAmount: normalizedPaidAmount,
    });

    if (customer && !isRetailSale) {
      if (paymentType === "ACIK_HESAP" || finalPaymentStatus === "VERESIYE") {
        customer.balance = (customer.balance || 0) + dueAmount;
      } else if (normalizedPaidAmount > 0) {
        customer.balance = Math.max(0, (customer.balance || 0) - normalizedPaidAmount);
      }
      await customer.save();
    }

    const newSale = new Sale({
      companyId,
      storeId: normalizedStoreId,
      customerId: normalizedCustomerId,
      items: processedItems,
      totalAmount,
      vatTotal,
      discount: normalizedDiscount,
      paidAmount: normalizedPaidAmount,
      dueAmount,
      paymentType,
      paymentStatus: finalPaymentStatus,
      deliveryStatus: deliveryStatus || "BEKLEMEDE",
      orderNumber,
      referenceNo,
      saleDate: normalizedSaleDate,
      notes,
      warehouseId: normalizedWarehouseId,
    });

    await newSale.save();

    // İskonto audit logu
    if (normalizedCustRate > 0 || normalizedRepRate > 0) {
      await ActivityLog.create({
        companyId,
        userId,
        module: 'sale',
        action: 'DISCOUNT_APPLIED',
        entityType: 'Sale',
        entityId: newSale._id,
        meta: {
          saleId: newSale._id,
          customerId: normalizedCustomerId,
          customerName: customer?.companyName || customer?.name || '',
          userName: dbUser?.name || '',
          customerDiscountRate: normalizedCustRate,
          repDiscountRate: normalizedRepRate,
          discountAmount: normalizedDiscount,
          paymentType,
          totalAmount,
          date: new Date(),
        },
      });
    }

    if (customer && !isRetailSale) {
      await customer.save();
    }

    if (account) {
      const cashEntry = paymentType === 'NAKIT' ? totalAmount : normalizedPaidAmount;
      if (paymentType === 'NAKIT' || paymentType === 'KREDI_KARTI' || paymentType === 'HAVALE') {
        account.balance = Number(account.balance || 0) + cashEntry;
      }
      await account.save();
    }

    const paymentAccount = await Account.findOne({ companyId, type: paymentType === 'HAVALE' || paymentType === 'KREDI_KARTI' ? 'BANKA' : 'KASA' }) || account;
    if (paymentAccount) {
      const paymentEntry = paymentType === 'NAKIT' ? normalizedPaidAmount || totalAmount : paymentType === 'KREDI_KARTI' || paymentType === 'HAVALE' ? totalAmount : 0;
      if (paymentEntry > 0) {
        paymentAccount.balance = Number(paymentAccount.balance || 0) + paymentEntry;
        await paymentAccount.save();
      }
    }

    if (!isRetailSale && customer && normalizedCustomerId) {
      await AccountTransaction.create({
        companyId,
        customerId: normalizedCustomerId,
        type: finalPaymentStatus === 'VERESIYE' || paymentType === 'ACIK_HESAP' ? 'BORC' : 'ALACAK',
        amount: totalAmount,
        description: `Satış kaydı: ${orderNumber || referenceNo || newSale._id}`,
        saleId: newSale._id,
      });
    }

    await Invoice.create({
      companyId,
      customerId: normalizedCustomerId,
      customerName: customer.companyName || customer.name || "Perakende Satış",
      customerTaxNumber: customer.taxNumber || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      invoiceNumber: `INV-${Date.now()}`,
      invoiceType: 'E_ARSIV',
      items: processedItems.map((item) => ({
        productId: item.productId,
        name: item.productName || item.productId,
        quantity: item.quantity,
        unit: 'Adet',
        discountPercent: 0,
        discountAmount: 0,
        unitPrice: item.unitPrice,
        taxRate: normalizedVatRate,
        taxAmount: Number((item.totalPrice * (normalizedVatRate / 100)).toFixed(2)),
        totalPrice: item.totalPrice,
        totalWithTax: Number((item.totalPrice + (item.totalPrice * (normalizedVatRate / 100))).toFixed(2)),
      })),
      notes: notes || '',
      subTotal: subtotal,
      taxTotal: vatTotal,
      grandTotal: totalAmount,
      paymentMethod: paymentType === 'KREDI_KARTI' ? 'CARD' : paymentType === 'HAVALE' ? 'BANK' : 'CASH',
      paymentStatus: finalPaymentStatus === 'ODENDI' ? 'PAID' : finalPaymentStatus === 'KISMEN_ODENDI' ? 'PARTIAL' : 'UNPAID',
      paidAmount: normalizedPaidAmount,
      remainingAmount: Number(Math.max(0, totalAmount - normalizedPaidAmount).toFixed(2)),
      status: 'TASLAK',
      gibResponseMessage: 'Satıştan türetilen otomatik fatura taslağı.',
      createdBy: userId || undefined,
    });

    res.status(201).json({
      success: true,
      message: "Satış başarıyla tamamlandı, stoklar güncellendi.",
      sale: newSale,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Yapılan Satışları Listeleme
exports.getSales = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { storeId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    let filter = { companyId };
    if (storeId) filter.storeId = storeId;

    const sales = await Sale.find(filter)
      .populate("customerId", "companyName name phone")
      .populate("items.productId", "name brand")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};