const Invoice = require("../models/lnvoice");
const Payment = require("../models/Payment");
const Sale = require("../models/Sale");
const Customer = require("../models/customer");
const Product = require("../models/Product");
const Company = require("../models/company");
const AccountingReport = require("../models/AccountingReport");

const getCompanyId = (req) => req.user?.companyId || req.user?.company || null;

// ✅ 1. FATURA OLUŞTUR
exports.createInvoice = async (req, res) => {
  try {
    const {
      saleId,
      customerId,
      items,
      invoiceType = "E_ARSIV",
      notes = "",
      dueDate = null,
      paymentMethod = "CASH",
    } = req.body;
    const companyId = getCompanyId(req);

    // Müşteri kontrolü
    const customer = await Customer.findOne({ _id: customerId, company: companyId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Müşteri bulunamadı." });
    }

    let invoiceItems = [];
    let subTotal = 0;
    const taxBreakdown = { tax0: 0, tax8: 0, tax18: 0, tax20: 0 };

    // Satıştan fatura oluştur
    if (saleId) {
      const sale = await Sale.findOne({ _id: saleId, companyId }).populate(
        "items.productId"
      );
      if (!sale) {
        return res
          .status(404)
          .json({ success: false, message: "Satış kaydı bulunamadı." });
      }

      sale.items.forEach((item) => {
        const itemSubTotal = item.quantity * item.unitPrice;
        const taxRate = item.productId?.vat || 20;
        const taxAmount = itemSubTotal * (taxRate / 100);
        const totalWithTax = itemSubTotal + taxAmount;

        subTotal += itemSubTotal;
        const taxKey = `tax${taxRate}`;
        if (taxBreakdown[taxKey] !== undefined) {
          taxBreakdown[taxKey] += taxAmount;
        }

        invoiceItems.push({
          productId: item.productId._id,
          name: item.productId.name || "Ürün",
          quantity: item.quantity,
          unit: item.productId.unit || "Adet",
          unitPrice: item.unitPrice,
          taxRate,
          taxAmount,
          totalPrice: itemSubTotal,
          totalWithTax,
        });
      });
    } else if (items && items.length > 0) {
      // Manuel kalemler
      items.forEach((item) => {
        const itemSubTotal = item.quantity * item.unitPrice;
        const taxRate = item.taxRate || 20;
        const discountAmount = item.discountAmount || 0;
        const discountedSubtotal = itemSubTotal - discountAmount;
        const taxAmount = discountedSubtotal * (taxRate / 100);
        const totalWithTax = discountedSubtotal + taxAmount;

        subTotal += discountedSubtotal;
        const taxKey = `tax${taxRate}`;
        if (taxBreakdown[taxKey] !== undefined) {
          taxBreakdown[taxKey] += taxAmount;
        }

        invoiceItems.push({
          productId: item.productId || null,
          name: item.name,
          description: item.description || "",
          quantity: item.quantity,
          unit: item.unit || "Adet",
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          discountAmount,
          taxRate,
          taxAmount,
          totalPrice: discountedSubtotal,
          totalWithTax,
        });
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "En az bir ürün gerekli." });
    }

    const taxTotal = Object.values(taxBreakdown).reduce((a, b) => a + b, 0);
    const grandTotal = subTotal + taxTotal;

    // Fatura numarası
    const company = await Company.findById(companyId);
    const invoiceSequence = (company?.invoiceSequence || 0) + 1;
    const invoiceNumber = `${company?.invoicePrefix || "FAT"}-${new Date()
      .getFullYear()
      .toString()
      .slice(-2)}${String(invoiceSequence).padStart(5, "0")}`;

    // Fatura oluştur
    const newInvoice = new Invoice({
      companyId,
      invoiceNumber,
      uuid: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      saleId: saleId || undefined,
      customerId,
      customerName: customer.companyName || customer.name,
      customerTaxNumber: customer.taxNumber || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      invoiceDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      invoiceType,
      items: invoiceItems,
      notes,
      subTotal,
      taxBreakdown,
      taxTotal,
      grandTotal,
      paymentMethod,
      paymentStatus: "UNPAID",
      remainingAmount: grandTotal,
      status: "TASLAK",
      createdBy: req.user._id,
    });

    await newInvoice.save();

    // Company invoice sequence güncelle
    await Company.findByIdAndUpdate(companyId, {
      invoiceSequence,
    });

    res.status(201).json({
      success: true,
      message: "✅ Fatura başarıyla oluşturuldu",
      invoice: newInvoice,
    });
  } catch (error) {
    console.error("❌ createInvoice HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 2. FATURALARI LİSTELE
exports.getInvoices = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      customerId,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = { companyId, deletedAt: null };

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customerId) filter.customerId = customerId;

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate)
        filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate("customerId", "companyName name phone")
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(filter);

    res.status(200).json({
      success: true,
      invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("❌ getInvoices HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 3. FATURA DETAY
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    const invoice = await Invoice.findOne({ _id: id, companyId }).populate([
      { path: "customerId", select: "companyName name email phone address" },
      { path: "saleId" },
      { path: "createdBy", select: "name email" },
    ]);

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Fatura bulunamadı." });
    }

    const payments = await Payment.find({
      invoiceId: id,
      status: "CONFIRMED",
    });

    res.status(200).json({
      success: true,
      invoice,
      payments,
    });
  } catch (error) {
    console.error("❌ getInvoiceById HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 4. ÖDEME KAYDET
exports.recordPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, method, referenceNo, note } = req.body;
    const companyId = getCompanyId(req);

    const invoice = await Invoice.findOne({ _id: invoiceId, companyId });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Fatura bulunamadı." });
    }

    if (amount > invoice.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Ödeme tutarı kalan tutardan fazla. Kalan: ${invoice.remainingAmount}`,
      });
    }

    // Ödeme kaydı
    const payment = new Payment({
      companyId,
      invoiceId,
      amount,
      method,
      referenceNo: referenceNo || "",
      note: note || "",
      status: "CONFIRMED",
      createdBy: req.user._id,
    });

    await payment.save();

    // Fatura durumu güncelle
    const newPaidAmount = invoice.paidAmount + amount;
    const newRemainingAmount = invoice.grandTotal - newPaidAmount;
    const newPaymentStatus =
      newRemainingAmount === 0
        ? "PAID"
        : newPaidAmount > 0
          ? "PARTIAL"
          : "UNPAID";

    invoice.paidAmount = newPaidAmount;
    invoice.remainingAmount = Math.max(0, newRemainingAmount);
    invoice.paymentStatus = newPaymentStatus;
    invoice.paymentMethod = method;

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "✅ Ödeme başarıyla kaydedildi",
      payment,
      invoice,
    });
  } catch (error) {
    console.error("❌ recordPayment HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 5. FATURA İPTAL ET
exports.cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const companyId = getCompanyId(req);

    const invoice = await Invoice.findOne({ _id: id, companyId });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Fatura bulunamadı." });
    }

    if (invoice.status === "ONAYLANDI") {
      return res.status(400).json({
        success: false,
        message: "GİB onaylı faturalar iptal edilemez.",
      });
    }

    invoice.status = "IPTAL";
    invoice.notes = `İptal Nedeni: ${reason || "Belirtilmedi"}`;
    invoice.paymentStatus = "UNPAID";

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "✅ Fatura iptal edildi",
      invoice,
    });
  } catch (error) {
    console.error("❌ cancelInvoice HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 6. GİB'E GÖNDER (SİMÜLASYON)
exports.sendInvoiceToGIB = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    const invoice = await Invoice.findOne({ _id: id, companyId });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Fatura bulunamadı." });
    }

    // Simüle: GİB'e gönder
    const isSuccess = Math.random() > 0.1; // %90 başarı şansı

    if (isSuccess) {
      invoice.status = "GONDERILDI";
      invoice.gibResponseCode = "1200";
      invoice.gibResponseMessage =
        "✅ GİB tarafından başarıyla onaylandı ve mühürlendi.";
      invoice.gibResponseTime = new Date();
    } else {
      invoice.gibResponseCode = "2000";
      invoice.gibResponseMessage = "⚠️ Fatura formatında hata. Lütfen kontrol edin.";
    }

    await invoice.save();

    res.status(200).json({
      success: isSuccess,
      message: isSuccess
        ? "✅ Fatura GİB'e gönderildi"
        : "❌ GİB göndermesi başarısız",
      invoice,
    });
  } catch (error) {
    console.error("❌ sendInvoiceToGIB HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 7. MUHASEBE RAPORLARI
exports.getAccountingReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { reportType, startDate, endDate } = req.query;

    const start = new Date(startDate || new Date().setDate(1));
    const end = new Date(endDate || new Date());

    // Faturaları getir
    const invoices = await Invoice.find({
      companyId,
      invoiceDate: { $gte: start, $lte: end },
      deletedAt: null,
    }).populate("customerId items.productId");

    // Metrikleri hesapla
    const metrics = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.paymentStatus === "PAID").length,
      unpaidInvoices: invoices.filter((i) => i.paymentStatus === "UNPAID").length,
      cancelledInvoices: invoices.filter((i) => i.status === "IPTAL").length,

      totalRevenue: invoices.reduce((sum, i) => sum + i.grandTotal, 0),
      paidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
      unpaidAmount: invoices.reduce((sum, i) => sum + i.remainingAmount, 0),

      totalTax: invoices.reduce((sum, i) => sum + i.taxTotal, 0),
      totalItems: invoices.reduce(
        (sum, i) => sum + i.items.reduce((s, it) => s + it.quantity, 0),
        0
      ),
    };

    metrics.averageOrderValue =
      metrics.totalInvoices > 0
        ? metrics.totalRevenue / metrics.totalInvoices
        : 0;

    // KDV dağılımı
    const taxBreakdown = {
      tax0Percent: 0,
      tax8Percent: 0,
      tax18Percent: 0,
      tax20Percent: 0,
    };

    invoices.forEach((invoice) => {
      taxBreakdown.tax0Percent += invoice.taxBreakdown?.tax0 || 0;
      taxBreakdown.tax8Percent += invoice.taxBreakdown?.tax8 || 0;
      taxBreakdown.tax18Percent += invoice.taxBreakdown?.tax18 || 0;
      taxBreakdown.tax20Percent += invoice.taxBreakdown?.tax20 || 0;
    });

    // Top ürünler
    const topProducts = {};
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const key = item.name;
        if (!topProducts[key]) {
          topProducts[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        topProducts[key].quantity += item.quantity;
        topProducts[key].revenue += item.totalWithTax;
      });
    });

    // Top müşteriler
    const topCustomers = {};
    invoices.forEach((invoice) => {
      const key = invoice.customerId._id;
      if (!topCustomers[key]) {
        topCustomers[key] = {
          name: invoice.customerName,
          invoiceCount: 0,
          totalRevenue: 0,
        };
      }
      topCustomers[key].invoiceCount += 1;
      topCustomers[key].totalRevenue += invoice.grandTotal;
    });

    res.status(200).json({
      success: true,
      report: {
        period: { startDate: start, endDate: end },
        metrics,
        taxBreakdown,
        topProducts: Object.values(topProducts)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        topCustomers: Object.values(topCustomers)
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 10),
      },
    });
  } catch (error) {
    console.error("❌ getAccountingReport HATA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};