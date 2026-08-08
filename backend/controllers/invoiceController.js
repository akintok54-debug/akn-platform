const Invoice = require("../models/lnvoice");
const Sale = require("../models/Sale");
const Customer = require("../models/customer");

// 1. Satıştan veyaManuel Olarak E-Fatura / E-Arşiv Oluşturma
exports.createInvoice = async (req, res) => {
  try {
    const { saleId, customerId, items, invoiceType } = req.body;
    const companyId = req.user.companyId;

    // Müşteri bilgilerini kontrol et (Vergi No / TC Kimlik için)
    const customer = await Customer.findOne({ _id: customerId, companyId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Fatura kesilecek müşteri bulunamadı." });
    }

    let invoiceItems = [];
    let subTotal = 0;

    // Eğer doğrudan bir satış üzerinden kesiliyorsa kalemleri altyapıdan çekebiliriz
    if (saleId) {
      const sale = await Sale.findOne({ _id: saleId, companyId }).populate("items.productId");
      if (!sale) {
        return res.status(404).json({ success: false, message: "İlgili satış kaydı bulunamadı." });
      }

      sale.items.forEach((item) => {
        const itemTotal = item.totalPrice;
        subTotal += itemTotal;
        invoiceItems.push({
          productId: item.productId._id,
          name: item.productId.name || "Yedek Parça",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: 20,
          totalPrice: itemTotal,
        });
      });
    } else if (items && items.length > 0) {
      // Manuel kalemler girildiyse
      items.forEach((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        subTotal += itemTotal;
        invoiceItems.push({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 20,
          totalPrice: itemTotal,
        });
      });
    } else {
      return res.status(400).json({ success: false, message: "Fatura için ürün kalemi bulunamadı." });
    }

    // KDV ve Toplam Hesaplamaları (%20 KDV)
    const taxTotal = subTotal * 0.20;
    const grandTotal = subTotal + taxTotal;

    // Benzersiz Fatura Numarası ve UUID Simülasyonu (Entegratör entegrasyonu öncesi taslak)
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `GIB${datePrefix}${randomNum}`;

    const newInvoice = new Invoice({
      companyId,
      saleId: saleId || undefined,
      customerId,
      invoiceNumber,
      uuid: `uuid-${Date.now()}`,
      invoiceType: invoiceType || "E_ARSIV",
      items: invoiceItems,
      subTotal,
      taxTotal,
      grandTotal,
      status: "TASLAK",
      gibResponseMessage: "Fatura taslak olarak hazırlandı, GİB gönderimine uygun.",
    });

    await newInvoice.save();

    res.status(201).json({
      success: true,
      message: "E-Fatura / E-Arşiv taslağı başarıyla oluşturuldu.",
      invoice: newInvoice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Firmaya Ait Faturaları Listeleme
exports.getInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const invoices = await Invoice.find({ companyId })
      .populate("customerId", "name taxNumber phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Faturayı GİB Entegratörüne Gönderme (Simüle Edilmiş Servis Adımı)
exports.sendInvoiceToGIB = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const invoice = await Invoice.findOne({ _id: id, companyId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Fatura bulunamadı." });
    }

    // Burada normalde Uyumsoft, Logo, Digital Planet vb. API'lerine SOAP/REST istekleri atılır.
    // Başarılı dönüş senaryosu simüle ediliyor:
    invoice.status = "GONDERILDI";
    invoice.gibResponseCode = "1200";
    invoice.gibResponseMessage = "GİB tarafından başarıyla onaylandı ve mühürlendi.";

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Fatura GİB'e başarıyla iletildi.",
      invoice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};