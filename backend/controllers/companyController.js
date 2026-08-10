const Company = require("../models/company");
const User = require("../models/User");
const Product = require("../models/Product");
const Customer = require("../models/customer");
const Sale = require("../models/Sale");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const Order = require("../models/Order");
const CashTransaction = require("../models/CashTransaction");
const BankTransaction = require("../models/BankTransaction");
const StockMovement = require("../models/StockMovement");
const Warehouse = require("../models/Warehouse");
const { buildTrialSubscription } = require("../services/subscriptionService");

const createCompany = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.subscriptionStatus) {
      Object.assign(payload, buildTrialSubscription());
    }

    const company = await Company.create(payload);

    res.status(201).json({
      success: true,
      message: "Firma oluşturuldu.",
      company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();

    res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyCompany = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Şirket bilgisi bulunamadı." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Firma bulunamadı." });
    }

    res.status(200).json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMyCompany = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Şirket bilgisi bulunamadı." });
    }

    const company = await Company.findByIdAndUpdate(companyId, req.body, { new: true });
    if (!company) {
      return res.status(404).json({ success: false, message: "Firma bulunamadı." });
    }

    res.status(200).json({ success: true, company, message: "Firma ayarları güncellendi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBackup = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const [company, users, products, customers, sales, accounts, transactions, orders, cashTransactions, bankTransactions, stockMovements, warehouses] = await Promise.all([
      Company.findById(companyId).lean(),
      User.find({ company: companyId }).select("name email role isActive permissionProfileId createdAt").lean(),
      Product.find({ company: companyId }).lean(),
      Customer.find({ company: companyId }).lean(),
      Sale.find({ companyId }).lean(),
      Account.find({ companyId }).lean(),
      AccountTransaction.find({ companyId }).lean(),
      Order.find({ companyId }).lean(),
      CashTransaction.find({ companyId }).lean(),
      BankTransaction.find({ companyId }).lean(),
      StockMovement.find({ companyId }).lean(),
      Warehouse.find({ companyId }).lean(),
    ]);

    res.status(200).json({
      success: true,
      backupDate: new Date().toISOString(),
      company,
      users,
      products,
      customers,
      sales,
      accounts,
      transactions,
      orders,
      cashTransactions,
      bankTransactions,
      stockMovements,
      warehouses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getMyCompany,
  updateMyCompany,
  getBackup,
};