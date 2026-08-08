const mongoose = require("mongoose");
const Account = require("../models/Account");
const BankTransaction = require("../models/BankTransaction");

const OPERATIONS = new Set(["PARA_GIRIS", "PARA_CIKIS", "EFT", "HAVALE", "BANKALAR_ARASI_TRANSFER"]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCompanyIdFromReq = (req) => req.user?.companyId || req.user?.company || null;

const bankFilter = (companyId) => {
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    return { companyId, type: "BANKA" };
  }
  return { type: "BANKA" };
};

exports.createBankAccount = async (req, res) => {
  try {
    const companyId = getCompanyIdFromReq(req);
    const { name, currency } = req.body;

    const accountName = String(name || "").trim();
    if (!accountName) {
      return res.status(400).json({ success: false, message: "Banka hesap adı zorunludur." });
    }

    const existing = await Account.findOne({
      ...bankFilter(companyId),
      name: accountName,
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Bu isimde banka hesabı zaten var." });
    }

    const payload = {
      ...(companyId && mongoose.Types.ObjectId.isValid(companyId) ? { companyId } : {}),
      name: accountName,
      type: "BANKA",
      currency: String(currency || "TRY").trim() || "TRY",
      balance: 0,
    };

    const created = await Account.create(payload);
    res.status(201).json({ success: true, account: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBankAccounts = async (req, res) => {
  try {
    const companyId = getCompanyIdFromReq(req);
    const accounts = await Account.find(bankFilter(companyId)).sort({ createdAt: -1 });
    res.status(200).json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBankTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const companyId = getCompanyIdFromReq(req);
    const { operation, amount, date, documentNo, description, fromAccountId, toAccountId } = req.body;

    const normalizedOperation = String(operation || "").trim();
    const normalizedAmount = toNumber(amount, 0);

    if (!OPERATIONS.has(normalizedOperation)) {
      throw new Error("Geçersiz banka işlem tipi.");
    }

    if (normalizedAmount <= 0) {
      throw new Error("Tutar sıfırdan büyük olmalıdır.");
    }

    const filter = bankFilter(companyId);
    let fromAccount = null;
    let toAccount = null;

    if (["PARA_CIKIS", "EFT", "HAVALE", "BANKALAR_ARASI_TRANSFER"].includes(normalizedOperation)) {
      if (!fromAccountId) {
        throw new Error("Kaynak banka hesabı seçiniz.");
      }
      fromAccount = await Account.findOne({ ...filter, _id: fromAccountId }).session(session);
      if (!fromAccount) {
        throw new Error("Kaynak banka hesabı bulunamadı.");
      }
    }

    if (["PARA_GIRIS", "BANKALAR_ARASI_TRANSFER"].includes(normalizedOperation)) {
      if (!toAccountId) {
        throw new Error("Hedef banka hesabı seçiniz.");
      }
      toAccount = await Account.findOne({ ...filter, _id: toAccountId }).session(session);
      if (!toAccount) {
        throw new Error("Hedef banka hesabı bulunamadı.");
      }
    }

    if (normalizedOperation === "BANKALAR_ARASI_TRANSFER") {
      if (String(fromAccountId) === String(toAccountId)) {
        throw new Error("Aynı hesaplar arasında transfer yapılamaz.");
      }
    }

    if (fromAccount) {
      if (toNumber(fromAccount.balance, 0) < normalizedAmount) {
        throw new Error("Kaynak banka hesabında bakiye yetersiz.");
      }
      fromAccount.balance = toNumber(fromAccount.balance, 0) - normalizedAmount;
      await fromAccount.save({ session });
    }

    if (toAccount) {
      toAccount.balance = toNumber(toAccount.balance, 0) + normalizedAmount;
      await toAccount.save({ session });
    }

    if (normalizedOperation === "PARA_GIRIS") {
      const account = await Account.findOne({ ...filter, _id: toAccountId }).session(session);
      if (!account) throw new Error("Banka hesabı bulunamadı.");
      account.balance = toNumber(account.balance, 0);
      await account.save({ session });
    }

    const targetBalance = toAccount
      ? toNumber(toAccount.balance, 0)
      : fromAccount
      ? toNumber(fromAccount.balance, 0)
      : 0;

    const payload = {
      ...(companyId && mongoose.Types.ObjectId.isValid(companyId) ? { companyId } : {}),
      operation: normalizedOperation,
      date: date ? new Date(date) : new Date(),
      documentNo: String(documentNo || "").trim(),
      description: String(description || "").trim(),
      amount: normalizedAmount,
      fromAccountId: fromAccount ? fromAccount._id : undefined,
      toAccountId: toAccount ? toAccount._id : undefined,
      balanceAfter: targetBalance,
      createdBy: req.user?.id,
    };

    const created = await BankTransaction.create([payload], { session });

    await session.commitTransaction();
    res.status(201).json({ success: true, transaction: created[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message || "Banka hareketi kaydedilemedi." });
  } finally {
    session.endSession();
  }
};

exports.getBankTransactions = async (req, res) => {
  try {
    const companyId = getCompanyIdFromReq(req);
    const { startDate, endDate } = req.query;

    const filter = {};
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const transactions = await BankTransaction.find(filter)
      .populate("fromAccountId", "name")
      .populate("toAccountId", "name")
      .sort({ date: -1, createdAt: -1 });

    const accounts = await Account.find(bankFilter(companyId)).sort({ createdAt: -1 });
    const totalBalance = accounts.reduce((sum, item) => sum + toNumber(item.balance, 0), 0);

    res.status(200).json({
      success: true,
      transactions,
      accounts,
      totalBalance: Number(totalBalance.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
