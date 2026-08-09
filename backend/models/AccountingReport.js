const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const accountingReportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // RAPOR TİPİ
    reportType: {
      type: String,
      enum: [
        "SALES_SUMMARY", // Satış özeti
        "VAT_REPORT", // KDV raporu
        "CUSTOMER_REVENUE", // Müşteri ciro raporu
        "PAYMENT_STATUS", // Ödeme durumu raporu
        "INVENTORY_VALUE", // Stok değeri raporu
        "PROFIT_LOSS", // Kar/Zarar raporu
      ],
      required: true,
      index: true,
    },

    // TARİH ARALĞI
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // TEMEL METRİKLER
    metrics: {
      totalInvoices: { type: Number, default: 0 },
      paidInvoices: { type: Number, default: 0 },
      unpaidInvoices: { type: Number, default: 0 },
      cancelledInvoices: { type: Number, default: 0 },

      totalRevenue: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      totalProfit: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },

      paidAmount: { type: Number, default: 0 },
      unpaidAmount: { type: Number, default: 0 },
      overduAmount: { type: Number, default: 0 },

      totalItems: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
    },

    // KDV DETAYLI
    taxBreakdown: {
      tax0Percent: { type: Number, default: 0 },
      tax8Percent: { type: Number, default: 0 },
      tax18Percent: { type: Number, default: 0 },
      tax20Percent: { type: Number, default: 0 },
    },

    // ÜRÜN BAZLI TOP 10
    topProducts: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        productName: String,
        quantity: Number,
        revenue: Number,
      },
    ],

    // MÜŞTERİ BAZLI TOP 10
    topCustomers: [
      {
        customerId: mongoose.Schema.Types.ObjectId,
        customerName: String,
        invoiceCount: Number,
        totalRevenue: Number,
      },
    ],

    // ÖDEME YÖNTEMI DAGILIŞ
    paymentMethodBreakdown: {
      cash: { type: Number, default: 0 },
      bank: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      check: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },

    // DURUM DAGILIŞ
    statusBreakdown: {
      paid: { type: Number, default: 0 },
      partial: { type: Number, default: 0 },
      unpaid: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
    },

    // RAW DATA (İsteğe bağlı)
    rawData: mongoose.Schema.Types.Mixed,

    // AUDIT
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "accounting_reports" }
);

accountingReportSchema.plugin(softDeletePlugin);
accountingReportSchema.index({ companyId: 1, reportType: 1, startDate: -1 });
accountingReportSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("AccountingReport", accountingReportSchema);
