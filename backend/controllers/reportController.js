const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Customer = require("../models/customer");
const Product = require("../models/Product");
const User = require("../models/User");
const AccountTransaction = require("../models/AccountTransaction");
const StockMovement = require("../models/StockMovement");
const { isSuperAdmin } = require("../utils/tenantScope");

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

// Tarih filtresi yardımcısı
const getDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return Object.keys(filter).length > 0 ? { createdAt: filter } : {};
};

// Satış Raporu
exports.getSalesReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    
    const { startDate, endDate, customerId, paymentType, repId } = req.query;
    
    let filter = { companyId };
    
    // Satış temsilcisi yalnızca kendi satışlarını görebilir
    if (userRole === "sales") {
      filter.userId = userId;
    } else if (repId) {
      filter.userId = new mongoose.Types.ObjectId(repId);
    }
    
    if (startDate || endDate) {
      filter = { ...filter, ...getDateFilter(startDate, endDate) };
    }
    
    if (customerId) filter.customerId = new mongoose.Types.ObjectId(customerId);
    if (paymentType) filter.paymentType = paymentType;
    
    const sales = await Sale.find(filter)
      .populate("customerId", "companyName phone")
      .populate("userId", "name")
      .lean();
    
    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      totalDiscount: sales.reduce((sum, s) => sum + (s.discount || 0), 0),
      netAmount: sales.reduce((sum, s) => sum + ((s.totalAmount || 0) - (s.discount || 0)), 0),
      byPaymentType: {},
      byStatus: {},
    };
    
    sales.forEach((s) => {
      const type = s.paymentType || "unknown";
      const status = s.paymentStatus || "unknown";
      if (!summary.byPaymentType[type]) summary.byPaymentType[type] = 0;
      if (!summary.byStatus[status]) summary.byStatus[status] = 0;
      summary.byPaymentType[type] += s.totalAmount || 0;
      summary.byStatus[status] += s.totalAmount || 0;
    });
    
    res.json({ success: true, sales, summary, filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Siparişler Raporu
exports.getOrdersReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    
    const { startDate, endDate, customerId, status, repId } = req.query;
    
    let filter = { companyId };
    
    if (userRole === "sales") {
      filter.userId = userId;
    } else if (repId) {
      filter.userId = new mongoose.Types.ObjectId(repId);
    }
    
    if (startDate || endDate) {
      filter = { ...filter, ...getDateFilter(startDate, endDate) };
    }
    
    if (customerId) filter.customerId = new mongoose.Types.ObjectId(customerId);
    if (status) filter.status = status;
    
    const orders = await Order.find(filter)
      .populate("customerId", "companyName")
      .populate("userId", "name")
      .lean();
    
    const summary = {
      totalOrders: orders.length,
      byStatus: {},
    };
    
    orders.forEach((o) => {
      const st = o.status || "unknown";
      if (!summary.byStatus[st]) summary.byStatus[st] = 0;
      summary.byStatus[st]++;
    });
    
    res.json({ success: true, orders, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cari Raporu (müşteri hesap özeti)
exports.getCustomersReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { startDate, endDate, type, customerId } = req.query;
    
    let filter = { company: companyId };
    if (type) filter.type = type;
    if (customerId) filter._id = new mongoose.Types.ObjectId(customerId);
    
    const customers = await Customer.find(filter).lean();
    
    // Her müşteri için hareket ve bakiye
    const detailedCustomers = await Promise.all(
      customers.map(async (c) => {
        const txFilter = { customerId: c._id, companyId };
        if (startDate || endDate) {
          txFilter.createdAt = getDateFilter(startDate, endDate).createdAt;
        }
        
        const transactions = await AccountTransaction.find(txFilter).lean();
        return {
          ...c,
          balance: c.balance || 0,
          transactions: transactions.length,
          totalDebt: transactions.filter((t) => t.type === "BORC").reduce((s, t) => s + (t.amount || 0), 0),
          totalCredit: transactions.filter((t) => t.type === "ALACAK").reduce((s, t) => s + (t.amount || 0), 0),
        };
      })
    );
    
    const summary = {
      totalCustomers: detailedCustomers.length,
      totalBalance: detailedCustomers.reduce((s, c) => s + (c.balance || 0), 0),
      totalDebt: detailedCustomers.reduce((s, c) => s + c.totalDebt, 0),
      totalCredit: detailedCustomers.reduce((s, c) => s + c.totalCredit, 0),
    };
    
    res.json({ success: true, customers: detailedCustomers, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// İadeler Raporu
exports.getReturnsReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    
    const { startDate, endDate, customerId } = req.query;
    
    let filter = { companyId, paymentStatus: "IPTAL" };
    
    if (userRole === "sales") {
      filter.userId = userId;
    }
    
    if (startDate || endDate) {
      filter = { ...filter, ...getDateFilter(startDate, endDate) };
    }
    
    if (customerId) filter.customerId = new mongoose.Types.ObjectId(customerId);
    
    const returns = await Sale.find(filter)
      .populate("customerId", "companyName")
      .populate("userId", "name")
      .lean();
    
    const summary = {
      totalReturns: returns.length,
      totalAmount: returns.reduce((s, r) => s + (r.totalAmount || 0), 0),
    };
    
    res.json({ success: true, returns, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tahsilat Raporu
exports.getCollectionsReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    
    const { startDate, endDate, customerId, paymentType, repId } = req.query;
    
    let filter = { companyId, paymentStatus: "ODENDI" };
    
    if (userRole === "sales") {
      filter.userId = userId;
    } else if (repId) {
      filter.userId = new mongoose.Types.ObjectId(repId);
    }
    
    if (startDate || endDate) {
      filter = { ...filter, ...getDateFilter(startDate, endDate) };
    }
    
    if (customerId) filter.customerId = new mongoose.Types.ObjectId(customerId);
    if (paymentType) filter.paymentType = paymentType;
    
    const collections = await Sale.find(filter)
      .populate("customerId", "companyName")
      .populate("userId", "name")
      .lean();
    
    const summary = {
      totalCollections: collections.length,
      totalAmount: collections.reduce((s, c) => s + (c.paidAmount || 0), 0),
    };
    
    res.json({ success: true, collections, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stok Raporu
exports.getStockReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { category, critical } = req.query;
    
    let filter = { company: companyId };
    if (category) filter.category = category;
    
    const products = await Product.find(filter).lean();
    
    let report = products.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      stock: p.stock || 0,
      minStock: p.minStock || 0,
      status: (p.stock || 0) <= (p.minStock || 0) ? "KRİTİK" : "OK",
      salePrice: p.salePrice || 0,
      purchasePrice: p.purchasePrice || 0,
      totalValue: ((p.stock || 0) * (p.salePrice || 0)).toFixed(2),
    }));
    
    if (critical === "true") {
      report = report.filter((p) => p.status === "KRİTİK");
    }
    
    const summary = {
      totalProducts: report.length,
      criticalProducts: report.filter((p) => p.status === "KRİTİK").length,
      totalValue: report.reduce((s, p) => s + parseFloat(p.totalValue), 0),
    };
    
    res.json({ success: true, products: report, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ürün Raporu
exports.getProductReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { category, brand } = req.query;
    
    let filter = { company: companyId };
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    
    const products = await Product.find(filter).lean();
    
    const summary = {
      totalProducts: products.length,
      byCategory: {},
      byBrand: {},
      avgSalePrice: products.length > 0 ? (products.reduce((s, p) => s + (p.salePrice || 0), 0) / products.length).toFixed(2) : 0,
    };
    
    products.forEach((p) => {
      const cat = p.category || "Kategorisiz";
      const br = p.brand || "Markasız";
      if (!summary.byCategory[cat]) summary.byCategory[cat] = 0;
      if (!summary.byBrand[br]) summary.byBrand[br] = 0;
      summary.byCategory[cat]++;
      summary.byBrand[br]++;
    });
    
    res.json({ success: true, products, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Satış Temsilcisi Raporu (admin-only)
exports.getSalesRepReport = async (req, res) => {
  try {
    if (!["admin", "SUPER_ADMIN"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Yetkiniz yok." });
    }
    
    const companyId = getCompanyId(req);
    const { startDate, endDate, repId, companyId: companyFilter } = req.query;
    const scopeCompanyId = isSuperAdmin(req) ? (companyFilter || null) : companyId;
    
    let reps = [];
    if (repId) {
      const repQuery = { _id: repId, role: "sales" };
      if (scopeCompanyId) repQuery.company = scopeCompanyId;
      const rep = await User.findOne(repQuery).lean();
      if (rep) reps = [rep];
    } else {
      const repQuery = { role: "sales" };
      if (scopeCompanyId) repQuery.company = scopeCompanyId;
      reps = await User.find(repQuery).lean();
    }
    
    const salesReps = await Promise.all(
      reps.map(async (rep) => {
        let filter = { userId: rep._id };
        if (scopeCompanyId) {
          filter.companyId = scopeCompanyId;
        }
        if (startDate || endDate) {
          filter = { ...filter, ...getDateFilter(startDate, endDate) };
        }
        
        const sales = await Sale.find(filter).lean();
        return {
          ...rep,
          totalSales: sales.length,
          totalAmount: sales.reduce((s, sa) => s + (sa.totalAmount || 0), 0),
          totalCollected: sales.reduce((s, sa) => s + (sa.paidAmount || 0), 0),
        };
      })
    );
    
    res.json({ success: true, salesReps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// İşlem Geçmişi (admin-only)
exports.getAuditReport = async (req, res) => {
  try {
    if (!["admin", "SUPER_ADMIN"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Yetkiniz yok." });
    }
    
    const companyId = getCompanyId(req);
    const { startDate, endDate, userId, module, action } = req.query;
    
    const ActivityLog = require("../models/ActivityLog");
    let filter = {};
    if (!isSuperAdmin(req)) {
      filter.companyId = companyId;
    } else if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }
    
    if (startDate || endDate) {
      filter = { ...filter, ...getDateFilter(startDate, endDate) };
    }
    if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
    if (module) filter.module = module;
    if (action) filter.action = action;
    
    const logs = await ActivityLog.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
