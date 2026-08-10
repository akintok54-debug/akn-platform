const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const Customer = require("../models/customer");
const Invoice = require("../models/lnvoice");
const { getCompanyId } = require("../utils/tenantScope");

exports.createAccount = async (req, res) => {
  try {
    const { name, type, currency, balance } = req.body;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const accountData = {
      name,
      type,
      currency,
      balance: balance || 0,
    };

    if (companyId) accountData.companyId = companyId;

    const account = new Account(accountData);
    await account.save();
    res.status(201).json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAccounts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const filter = { companyId };
    const accounts = await Account.find(filter);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, customerId, type, amount, description } = req.body;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const account = await Account.findOne({ _id: accountId, companyId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Hesap bulunamadi." });
    }

    const transaction = new AccountTransaction({
      companyId,
      customerId,
      type,
      amount: Number(amount || 0),
      description,
    });
    await transaction.save();

    if (type === 'ALACAK') {
      account.balance += Number(amount || 0);
    } else if (type === 'BORC') {
      account.balance -= Number(amount || 0);
    }
    await account.save();

    if (customerId) {
      const customer = await Customer.findOne({ _id: customerId, company: companyId });
      if (customer) {
        if (type === 'ALACAK') {
          customer.balance = (customer.balance || 0) - Number(amount || 0);
        } else if (type === 'BORC') {
          customer.balance = (customer.balance || 0) + Number(amount || 0);
        }
        await customer.save();
      }
    }

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const filter = { _id: id, companyId };

    const account = await Account.findOne(filter);
    if (!account) {
      return res.status(404).json({ success: false, message: "Hesap bulunamadı." });
    }

    if (account.balance !== 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Bakiyesi olan hesaplar silinemez!" 
      });
    }

    const transactionCount = await AccountTransaction.countDocuments({ companyId });
    if (transactionCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "İşlem görmüş hesaplar silinemez!" 
      });
    }

    await Account.deleteOne({ _id: id, companyId });
    res.status(200).json({ success: true, message: "Hesap silindi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAccountTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const filter = { _id: id, companyId };

    const account = await Account.findOne(filter);
    if (!account) {
      return res.status(404).json({ success: false, message: "Hesap bulunamadı." });
    }

    const transactions = await AccountTransaction.find({ companyId })
      .populate("customerId", "companyName name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, account, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCashReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const accounts = await Account.find({ companyId });
    const balance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    res.status(200).json({ success: true, balance, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentTransactions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const filter = { companyId };
    const transactions = await AccountTransaction.find(filter)
      .populate("customerId", "companyName name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerStatement = async (req, res) => {
  try {
    const { customerId } = req.params;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const transactions = await AccountTransaction.find({ customerId, companyId })
      .sort({ createdAt: -1 });
    const customer = await Customer.findOne({ _id: customerId, company: companyId });
    const invoices = await Invoice.find({ customerId, companyId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, customer, transactions, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};