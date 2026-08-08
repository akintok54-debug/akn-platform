const mongoose = require("mongoose");
const Account = require("../models/Account");
const CashTransaction = require("../models/CashTransaction");

const OPERATIONS = new Set(["KASA_GIRIS", "KASA_CIKIS", "KASA_TRANSFERI"]);
const TRANSACTION_TYPES = new Set([
  "TAHSILAT",
  "PESIN_SATIS",
  "PERSONEL_AVANSI",
  "KARGO",
  "ELEKTRIK",
  "KIRA",
  "YEMEK",
  "BANKAYA_PARA_AKTAR",
  "BANKADAN_PARA_AL",
  "DIGER",
]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCompanyIdFromReq = (req) => req.user?.companyId || req.user?.company || null;

const buildAccountFilter = (companyId, type) => {
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    return { companyId, type };
  }
  return { type };
};

const ensureAccount = async (companyId, type, defaultName, session) => {
  const filter = buildAccountFilter(companyId, type);
  let accountQuery = Account.findOne(filter);
  if (session) {
    accountQuery = accountQuery.session(session);
  }
  let account = await accountQuery;

  if (!account) {
    const payload = [
      {
        ...(companyId && mongoose.Types.ObjectId.isValid(companyId) ? { companyId } : {}),
        name: defaultName,
        type,
        currency: "TRY",
        balance: 0,
      },
    ];
    account = session ? await Account.create(payload, { session }) : await Account.create(payload);
    return account[0];
  }

  return account;
};

exports.createCashTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const companyId = getCompanyIdFromReq(req);
    const {
      operation,
      transactionType,
      transferDirection,
      date,
      documentNo,
      description,
      amount,
    } = req.body;

    const normalizedOperation = String(operation || "").trim();
    const normalizedType = String(transactionType || "").trim();
    const normalizedDirection = String(transferDirection || "YOK").trim();
    const normalizedAmount = toNumber(amount, 0);

    if (!OPERATIONS.has(normalizedOperation)) {
      throw new Error("Geçersiz işlem tipi. Kasa giriş, çıkış veya transfer seçiniz.");
    }

    if (!TRANSACTION_TYPES.has(normalizedType)) {
      throw new Error("Geçersiz işlem türü.");
    }

    if (normalizedAmount <= 0) {
      throw new Error("Tutar sıfırdan büyük olmalıdır.");
    }

    if (normalizedOperation === "KASA_TRANSFERI") {
      if (!["BANKAYA", "BANKADAN"].includes(normalizedDirection)) {
        throw new Error("Kasa transferinde yön zorunludur.");
      }
      if (normalizedDirection === "BANKAYA" && normalizedType !== "BANKAYA_PARA_AKTAR") {
        throw new Error("Bankaya transfer için işlem türü Bankaya Para Aktar olmalıdır.");
      }
      if (normalizedDirection === "BANKADAN" && normalizedType !== "BANKADAN_PARA_AL") {
        throw new Error("Bankadan transfer için işlem türü Bankadan Para Al olmalıdır.");
      }
    }

    const cashAccount = await ensureAccount(companyId, "KASA", "Merkez Kasa", session);
    const bankAccount = await ensureAccount(companyId, "BANKA", "Merkez Banka", session);

    let cashIn = 0;
    let cashOut = 0;

    if (normalizedOperation === "KASA_GIRIS") {
      cashIn = normalizedAmount;
      cashAccount.balance = toNumber(cashAccount.balance, 0) + normalizedAmount;
    }

    if (normalizedOperation === "KASA_CIKIS") {
      cashOut = normalizedAmount;
      if (toNumber(cashAccount.balance, 0) < normalizedAmount) {
        throw new Error("Kasa bakiyesi yetersiz.");
      }
      cashAccount.balance = toNumber(cashAccount.balance, 0) - normalizedAmount;
    }

    if (normalizedOperation === "KASA_TRANSFERI") {
      if (normalizedDirection === "BANKAYA") {
        cashOut = normalizedAmount;
        if (toNumber(cashAccount.balance, 0) < normalizedAmount) {
          throw new Error("Kasa bakiyesi yetersiz.");
        }
        cashAccount.balance = toNumber(cashAccount.balance, 0) - normalizedAmount;
        bankAccount.balance = toNumber(bankAccount.balance, 0) + normalizedAmount;
      } else {
        cashIn = normalizedAmount;
        if (toNumber(bankAccount.balance, 0) < normalizedAmount) {
          throw new Error("Banka bakiyesi yetersiz.");
        }
        bankAccount.balance = toNumber(bankAccount.balance, 0) - normalizedAmount;
        cashAccount.balance = toNumber(cashAccount.balance, 0) + normalizedAmount;
      }
    }

    await cashAccount.save({ session });
    await bankAccount.save({ session });

    const payload = {
      ...(companyId && mongoose.Types.ObjectId.isValid(companyId) ? { companyId } : {}),
      operation: normalizedOperation,
      transactionType: normalizedType,
      transferDirection: normalizedOperation === "KASA_TRANSFERI" ? normalizedDirection : "YOK",
      date: date ? new Date(date) : new Date(),
      documentNo: String(documentNo || "").trim(),
      description: String(description || "").trim(),
      amount: normalizedAmount,
      cashIn,
      cashOut,
      balanceAfter: toNumber(cashAccount.balance, 0),
      createdBy: req.user?.id,
      bankAccountId: bankAccount._id,
      cashAccountId: cashAccount._id,
    };

    const created = await CashTransaction.create([payload], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Kasa hareketi kaydedildi.",
      transaction: created[0],
      cashBalance: toNumber(cashAccount.balance, 0),
      bankBalance: toNumber(bankAccount.balance, 0),
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message || "Kasa hareketi oluşturulamadı." });
  } finally {
    session.endSession();
  }
};

exports.getCashTransactions = async (req, res) => {
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

    const transactions = await CashTransaction.find(filter).sort({ date: 1, createdAt: 1 });

    const list = [];
    let runningBalance = 0;
    for (const transaction of transactions) {
      runningBalance += toNumber(transaction.cashIn, 0);
      runningBalance -= toNumber(transaction.cashOut, 0);
      list.push({
        _id: transaction._id,
        date: transaction.date,
        documentNo: transaction.documentNo || "",
        description: transaction.description || "",
        operation: transaction.operation,
        transactionType: transaction.transactionType,
        transferDirection: transaction.transferDirection,
        cashIn: toNumber(transaction.cashIn, 0),
        cashOut: toNumber(transaction.cashOut, 0),
        balance: Number(runningBalance.toFixed(2)),
      });
    }

    const cashAccount = await ensureAccount(companyId, "KASA", "Merkez Kasa", null);
    const bankAccount = await ensureAccount(companyId, "BANKA", "Merkez Banka", null);

    res.status(200).json({
      success: true,
      transactions: list,
      cashBalance: toNumber(cashAccount.balance, 0),
      bankBalance: toNumber(bankAccount.balance, 0),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
