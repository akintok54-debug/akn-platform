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
    } = req.body;
    const companyId = req.user?.companyId || req.user?.company || new mongoose.Types.ObjectId();
    const userId = req.user?.id || req.user?._id;

    // İskonto yetki kontrolü (sales rolü için)
    const dbUser = userId ? await User.findById(userId).select('role maxDiscountRate discountAllowedPaymentTypes name').lean() : null;
    const userRole = dbUser?.role || req.user?.role;
    const normalizedRepRate = Number(repDiscountRate || 0);
    const normalizedCustRate = Number(customerDiscountRate || 0);

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
    const normalizedCustomerId = customerId || new mongoose.Types.ObjectId();
    const customer = customerId ? await Customer.findById(normalizedCustomerId) : null;
    let account = await Account.findOne({ companyId }) || await Account.findOne({});
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

    for (let item of items) {
      const { productId, quantity, unitPrice } = item;
      const parsedQuantity = Number(quantity || 0);
      const parsedUnitPrice = Number(unitPrice || 0);
      const itemTotal = parsedQuantity * parsedUnitPrice;
      subtotal += itemTotal;

      processedItems.push({
        productId,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice,
        totalPrice: itemTotal,
      });

      if (normalizedWarehouseId) {
        let whStock = await WarehouseStock.findOne({ companyId, warehouseId: normalizedWarehouseId, productId });

        if (!whStock) {
          whStock = new WarehouseStock({ companyId, warehouseId: normalizedWarehouseId, productId, quantity: 0 });
        }

        if ((whStock.quantity || 0) < parsedQuantity) {
          return res.status(400).json({ success: false, message: `Stok yetersiz: ${productId}` });
        }

        whStock.quantity -= parsedQuantity;
        await whStock.save();
      }
    }

    const vatTotal = Number((subtotal * (normalizedVatRate / 100)).toFixed(2));
    const totalAmount = Number((subtotal + vatTotal - normalizedDiscount).toFixed(2));
    const dueAmount = Number(Math.max(0, totalAmount - normalizedPaidAmount).toFixed(2));

    let finalPaymentStatus = paymentStatus || "ODENDI";
    if (paymentType === "ACIK_HESAP" || finalPaymentStatus === "VERESIYE") {
      finalPaymentStatus = "VERESIYE";
    }

    if (customer) {
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

    if (customer) {
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

    await AccountTransaction.create({
      companyId,
      customerId: normalizedCustomerId,
      type: paymentType === 'ACIK_HESAP' ? 'BORC' : 'ALACAK',
      amount: totalAmount,
      description: `Satış kaydı: ${orderNumber || referenceNo || newSale._id}`,
      saleId: newSale._id,
    });

    await Invoice.create({
      companyId,
      customerId: normalizedCustomerId,
      invoiceNumber: `INV-${Date.now()}`,
      invoiceType: 'E_ARSIV',
      items: processedItems.map((item) => ({
        productId: item.productId,
        name: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 20,
        totalPrice: item.totalPrice,
      })),
      subTotal: subtotal,
      taxTotal: vatTotal,
      grandTotal: totalAmount,
      status: 'TASLAK',
      gibResponseMessage: 'Satıştan türetilen otomatik fatura taslağı.',
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
    const companyId = req.user?.companyId || req.user?.company;
    const { storeId } = req.query;

    let filter = {};
    if (companyId) filter.companyId = companyId;
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