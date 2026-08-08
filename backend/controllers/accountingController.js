const AccountTransaction = require("../models/AccountTransaction");
const CashMovement = require("../models/CashMovement");
const Customer = require("../models/customer");

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

// 1. Müşteriden Tahsilat Alma (Borç Kapatma / Ödeme Alınması)
exports.receivePayment = async (req, res) => {
  try {
    const { customerId, storeId, amount, paymentMethod, description } = req.body;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Geçerli bir tutar girmelisiniz." });
    }

    // Müşteriyi bul ve cari bakiyesini düş (Alacak kaydı)
    const customer = await Customer.findOne({ _id: customerId, company: companyId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Müşteri bulunamadı." });
    }

    // Müşterinin borcundan düşüyoruz (Örn: Borç 1000 TL, 400 TL ödedi -> bakiye 600 TL kalır)
    customer.balance = (customer.balance || 0) - amount;
    await customer.save();

    // Cari hareket oluştur (ALACAK -> Müşteri ödeme yaptı, borcu azaldı)
    const accountTx = new AccountTransaction({
      companyId,
      customerId,
      type: "ALACAK",
      amount,
      description: description || "Nakit/Kart Tahsilat",
    });
    await accountTx.save();

    // Kasa hareketine işle (Kasa Girişi)
    const cashTx = new CashMovement({
      companyId,
      storeId,
      type: "GIRIS",
      category: "TAHSILAT",
      amount,
      paymentMethod,
      description: `Müşteri Tahsilatı: ${customer.name}`,
    });
    await cashTx.save();

    res.status(200).json({
      success: true,
      message: "Tahsilat başarıyla alındı, kasa ve cari güncellendi.",
      remainingBalance: customer.balance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Müşteri Cari Ekstresini Listeleme (Borç/Alacak Hareketleri)
exports.getCustomerStatement = async (req, res) => {
  try {
    const { customerId } = req.params;
    const companyId = getCompanyId(req);

    const transactions = await AccountTransaction.find({ customerId, companyId })
      .sort({ createdAt: -1 })
      .lean();

    const customer = await Customer.findOne({ _id: customerId, company: companyId }).lean();

    res.status(200).json({
      success: true,
      customerName: customer ? customer.name : "",
      currentBalance: customer ? customer.balance : 0,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Kasa Durumunu ve Hareketlerini Listeleme
exports.getCashReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { storeId } = req.query;

    let filter = { companyId };
    if (storeId) filter.storeId = storeId;

    const cashMovements = await CashMovement.find(filter).sort({ createdAt: -1 }).lean();

    // Toplam Kasa Hesabı (Girişler - Çıkışlar)
    let totalCash = 0;
    cashMovements.forEach((tx) => {
      if (tx.type === "GIRIS") totalCash += tx.amount;
      else if (tx.type === "CIKIS") totalCash -= tx.amount;
    });

    res.status(200).json({
      success: true,
      totalCash,
      movements: cashMovements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};