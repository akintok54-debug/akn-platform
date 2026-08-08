const Customer = require("../models/customer");
const mongoose = require("mongoose");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const Company = require("../models/company");
const PdfArchive = require("../models/PdfArchive");
const WhatsAppHistory = require("../models/WhatsAppHistory");
const MailHistory = require("../models/MailHistory");
const NotificationHistory = require("../models/NotificationHistory");
const { normalizeCustomerPayload } = require("../utils/customerUtils");
const { runInTransaction } = require("../utils/dbTransaction");
const { parseListQuery } = require("../utils/queryFeatures");
const { writeActivityLog } = require("../services/activityLogService");
const { sendWhatsAppMessage } = require("../services/whatsappService");

const INCREASE_BALANCE_TYPES = new Set(["ORDER", "INVOICE", "BORC"]);
const DECREASE_BALANCE_TYPES = new Set(["RETURN", "COLLECTION", "PAYMENT", "ALACAK", "TAHSILAT", "ODEME"]);

const getTransactionEffect = (type, amount) => {
  if (INCREASE_BALANCE_TYPES.has(type)) return Number(amount || 0);
  if (DECREASE_BALANCE_TYPES.has(type)) return -Number(amount || 0);
  return 0;
};

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

const sanitizePhone = (value) => String(value || "").replace(/[^\d]/g, "");
const getPortalBaseUrl = () => String(process.env.DEALER_PORTAL_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const getApiBaseUrl = () => String(process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const buildPortalLink = (token) => `${getPortalBaseUrl()}/bayi/${token}`;
const createSecureToken = () => crypto.randomBytes(24).toString("hex");

const generateUniquePortalToken = async () => {
  let token = createSecureToken();
  let exists = await Customer.exists({ dealerPortalToken: token });
  while (exists) {
    token = createSecureToken();
    exists = await Customer.exists({ dealerPortalToken: token });
  }
  return token;
};

const ensurePortalToken = async (customerDoc) => {
  if (customerDoc.dealerPortalToken) return customerDoc.dealerPortalToken;
  const token = await generateUniquePortalToken();
  customerDoc.dealerPortalToken = token;
  customerDoc.dealerPortalEnabled = true;
  customerDoc.dealerPortalTokenUpdatedAt = new Date();
  await customerDoc.save();
  return token;
};

const buildDealerPortalMessage = ({ companyName, portalLink }) =>
  [
    `Merhaba Sayin ${companyName}`,
    "",
    "Guncel cari hesap ekstreniz ektedir.",
    "",
    "Bundan sonra asagidaki baglantidan;",
    "",
    "• Guncel Cari Bakiyenizi",
    "• Hesap Ekstrenizi",
    "• Son Siparislerinizi",
    "• Siparis Durumlarinizi",
    "• Son Odemelerinizi",
    "• Iadelerinizi",
    "• Satin Aldiginiz Urunleri",
    "• Faturalarinizi",
    "",
    "istediginiz zaman goruntuleyebilirsiniz.",
    "",
    portalLink,
    "",
    "Iyi calismalar.",
    "",
    "AKN Motosiklet",
  ].join("\n");

const buildLedgerRows = (customer, filters = {}) => {
  const transactions = [...(customer.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;

  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  const endDate = filters.endDate ? new Date(filters.endDate) : null;
  const docType = filters.docType ? String(filters.docType).toUpperCase() : "";

  const rows = [];
  transactions.forEach((item, index) => {
    const normalizedType = String(item.type || "").toUpperCase();
    const amount = Number(item.amount || 0);
    const effect = getTransactionEffect(normalizedType, amount);
    runningBalance = Number((runningBalance + effect).toFixed(2));

    const rowDate = item.date ? new Date(item.date) : new Date();
    if (startDate && rowDate < startDate) return;
    if (endDate) {
      const safeEnd = new Date(endDate);
      safeEnd.setHours(23, 59, 59, 999);
      if (rowDate > safeEnd) return;
    }
    if (docType && normalizedType !== docType) return;

    rows.push({
      date: rowDate,
      documentNo: `EVR-${String(index + 1).padStart(4, "0")}`,
      transactionType: normalizedType,
      description: item.description || "",
      debit: effect > 0 ? amount : 0,
      credit: effect < 0 ? amount : 0,
      balance: runningBalance,
    });
  });

  return rows;
};

// ==========================
// Yeni Cari Kart Oluştur
// ==========================
const createCustomer = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const portalToken = await generateUniquePortalToken();

    const customer = await runInTransaction(async (session) => {
      const normalizedPayload = normalizeCustomerPayload(req.body);
      const created = await Customer.create(
        [
          {
            company: normalizedPayload.company || companyId,
            customerCode: normalizedPayload.customerCode || normalizedPayload.code || `CR${Date.now()}`,
            companyName: normalizedPayload.companyName,
            name: normalizedPayload.name,
            phone: normalizedPayload.phone || "",
            email: normalizedPayload.email || "",
            taxOffice: normalizedPayload.taxOffice || "",
            taxNumber: normalizedPayload.taxNumber || "",
            address: normalizedPayload.address || "",
            city: normalizedPayload.city || "",
            district: normalizedPayload.district || "",
            contactPerson: normalizedPayload.contactPerson || "",
            type: normalizedPayload.type,
            balance: normalizedPayload.balance || 0,
            riskLimit: normalizedPayload.riskLimit || 0,
            discountRate: normalizedPayload.discountRate || 0,
            customerCategory: normalizedPayload.customerCategory || "retail",
            mobilePhone: normalizedPayload.mobilePhone || "",
            active: normalizedPayload.active !== false,
            note: normalizedPayload.note || "",
            paymentSchedule: normalizedPayload.paymentSchedule || [],
            dealerPortalToken: portalToken,
            dealerPortalEnabled: true,
            dealerPortalTokenUpdatedAt: new Date(),
          },
        ],
        { session }
      );

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: "customers",
        action: "CREATE",
        entityType: "Customer",
        entityId: created[0]._id,
        after: created[0].toObject(),
        ipAddress: req.ip,
        session,
      });

      return created[0];
    });

    res.status(201).json({
      success: true,
      message: "Cari kart başarıyla oluşturuldu.",
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Tüm Cari Kartları Listele
// ==========================
const getCustomers = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { q, type, active } = req.query;
    const list = parseListQuery(req.query);

    const filter = {};
    if (companyId) {
      filter.company = companyId;
    }
    if (type) {
      filter.type = String(type).trim();
    }
    if (typeof active !== "undefined") {
      filter.active = String(active) === "true";
    }
    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [
        { companyName: regex },
        { name: regex },
        { customerCode: regex },
        { phone: regex },
        { email: regex },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort(list.sort).skip(list.skip).limit(list.limit),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: list.page,
        limit: list.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / list.limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Tek Cari Kart
// ==========================
const getCustomer = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Cari kart bulunamadı.",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Cari Güncelle
// ==========================
const updateCustomer = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const customer = await runInTransaction(async (session) => {
      const normalizedPayload = normalizeCustomerPayload(req.body);
      const current = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) }).session(session);

      if (!current) {
        throw new Error("Cari kart bulunamadi.");
      }

      const before = current.toObject();

      Object.assign(current, {
        ...normalizedPayload,
        name: normalizedPayload.companyName || normalizedPayload.name,
        companyName: normalizedPayload.companyName || normalizedPayload.name,
        balance: normalizedPayload.balance || 0,
        riskLimit: normalizedPayload.riskLimit || 0,
        discountRate: normalizedPayload.discountRate || 0,
        customerCategory: normalizedPayload.customerCategory || "retail",
        mobilePhone: normalizedPayload.mobilePhone || "",
        active: normalizedPayload.active !== false,
        note: normalizedPayload.note || "",
        paymentSchedule: normalizedPayload.paymentSchedule || [],
      });

      await current.save({ session });

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: "customers",
        action: "UPDATE",
        entityType: "Customer",
        entityId: current._id,
        before,
        after: current.toObject(),
        ipAddress: req.ip,
        session,
      });

      return current;
    });

    res.json({
      success: true,
      message: "Cari kart güncellendi.",
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Cari Sil
// ==========================
const deleteCustomer = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await runInTransaction(async (session) => {
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) }).session(session);

      if (!customer) {
        throw new Error("Cari kart bulunamadi.");
      }

      const before = customer.toObject();
      await customer.softDelete(req.user?.id, session);

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: "customers",
        action: "SOFT_DELETE",
        entityType: "Customer",
        entityId: customer._id,
        before,
        after: customer.toObject(),
        ipAddress: req.ip,
        session,
      });
    });

    res.json({
      success: true,
      message: "Cari kart pasife alindi.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// İşlem Ekle (Fatura, Sipariş, İade, Tahsilat)
// ==========================
const addTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, items, description } = req.body;
    const companyId = getCompanyId(req);

    const amountValue = Number(amount || 0);
    const normalizedType = String(type || '').toUpperCase();

    if (amountValue <= 0) {
      return res.status(400).json({ success: false, message: "Tutar sıfırdan büyük olmalıdır." });
    }

    const customer = await runInTransaction(async (session) => {
      const current = await Customer.findOne({ _id: id, ...(companyId ? { company: companyId } : {}) }).session(session);
      if (!current) {
        throw new Error("Musteri bulunamadi");
      }

      const before = current.toObject();

      if (!current.transactions) {
        current.transactions = [];
      }

      current.balance = Number(current.balance || 0) + getTransactionEffect(normalizedType, amountValue);

      current.transactions.push({
        type: normalizedType,
        amount: amountValue,
        items: items || [],
        description,
        date: new Date(),
      });

      await current.save({ session });

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: "customers",
        action: "ADD_TRANSACTION",
        entityType: "Customer",
        entityId: current._id,
        before,
        after: current.toObject(),
        ipAddress: req.ip,
        session,
      });

      return current;
    });

    res.status(200).json({
      success: true,
      message: "İşlem başarıyla kaydedildi.",
      customer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    const customer = await Customer.findOne({ _id: id, ...(companyId ? { company: companyId } : {}) });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Müşteri bulunamadı" });
    }

    const transactions = [...(customer.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const netEffect = transactions.reduce((sum, item) => sum + getTransactionEffect(String(item.type || '').toUpperCase(), Number(item.amount || 0)), 0);
    const openingBalance = Number((Number(customer.balance || 0) - netEffect).toFixed(2));

    let runningBalance = openingBalance;
    const ledger = transactions.map((item, index) => {
      const normalizedType = String(item.type || '').toUpperCase();
      const amount = Number(item.amount || 0);
      const effect = getTransactionEffect(normalizedType, amount);
      runningBalance = Number((runningBalance + effect).toFixed(2));

      return {
        id: item._id || `${normalizedType}-${index}`,
        type: normalizedType,
        description: item.description || "",
        date: item.date || customer.updatedAt || customer.createdAt,
        borc: effect > 0 ? amount : 0,
        alacak: effect < 0 ? amount : 0,
        balance: runningBalance,
      };
    });

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        customerCode: customer.customerCode || customer.code || "",
        companyName: customer.companyName || customer.name || "",
        phone: customer.phone || "",
        taxNumber: customer.taxNumber || "",
      },
      openingBalance,
      currentBalance: Number(customer.balance || 0),
      ledger,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addTransaction, // <-- Dışa aktarıldı
  getCustomerLedger,
  getCustomerPortalLink: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const token = await ensurePortalToken(customer);
      const portalLink = buildPortalLink(token);

      res.status(200).json({
        success: true,
        portalLink,
        secureToken: token,
        isEnabled: customer.dealerPortalEnabled !== false,
        tokenUpdatedAt: customer.dealerPortalTokenUpdatedAt,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  refreshCustomerPortalLink: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const token = await generateUniquePortalToken();
      customer.dealerPortalToken = token;
      customer.dealerPortalEnabled = true;
      customer.dealerPortalTokenUpdatedAt = new Date();
      await customer.save();

      res.status(200).json({
        success: true,
        message: "Bayi portali linki yenilendi.",
        portalLink: buildPortalLink(token),
        secureToken: token,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  deactivateCustomerPortalLink: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      customer.dealerPortalEnabled = false;
      await customer.save();

      res.status(200).json({ success: true, message: "Bayi portali linki pasif yapildi." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  bulkUpdateCustomerPortalLinks: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customerIds = Array.isArray(req.body?.customerIds) ? req.body.customerIds : [];
      const action = String(req.body?.action || "").toLowerCase();

      if (!companyId) {
        return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
      }

      if (!customerIds.length) {
        return res.status(400).json({ success: false, message: "En az bir musteri seciniz." });
      }

      if (!["generate", "refresh", "deactivate"].includes(action)) {
        return res.status(400).json({ success: false, message: "Gecersiz islem tipi." });
      }

      const customers = await Customer.find({
        _id: { $in: customerIds },
        company: companyId,
      });

      if (!customers.length) {
        return res.status(404).json({ success: false, message: "Musteri bulunamadi." });
      }

      const result = [];

      for (const customer of customers) {
        if (action === "generate") {
          const token = await ensurePortalToken(customer);
          result.push({
            customerId: customer._id,
            companyName: customer.companyName || customer.name || "",
            portalLink: buildPortalLink(token),
            enabled: customer.dealerPortalEnabled !== false,
          });
          continue;
        }

        if (action === "refresh") {
          const token = await generateUniquePortalToken();
          customer.dealerPortalToken = token;
          customer.dealerPortalEnabled = true;
          customer.dealerPortalTokenUpdatedAt = new Date();
          await customer.save();
          result.push({
            customerId: customer._id,
            companyName: customer.companyName || customer.name || "",
            portalLink: buildPortalLink(token),
            enabled: true,
          });
          continue;
        }

        customer.dealerPortalEnabled = false;
        await customer.save();
        result.push({
          customerId: customer._id,
          companyName: customer.companyName || customer.name || "",
          portalLink: customer.dealerPortalToken ? buildPortalLink(customer.dealerPortalToken) : "",
          enabled: false,
        });
      }

      res.status(200).json({
        success: true,
        action,
        updatedCount: result.length,
        customers: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  getCustomerStatementPdf: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const company = await Company.findById(companyId).lean();
      const rows = buildLedgerRows(customer, req.query);
      const totalDebt = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
      const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
      const currentBalance = Number(rows[rows.length - 1]?.balance || customer.balance || 0);
      const fileName = `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`;

      await PdfArchive.create({
        companyId,
        customerId: customer._id,
        createdBy: req.user?.id,
        source: "ADMIN",
        pdfType: "STATEMENT",
        fileName,
        meta: { rowCount: rows.length },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      const pdf = new PDFDocument({ size: "A4", margin: 40 });
      pdf.pipe(res);

      pdf.fontSize(20).text("AKN Cloud ERP - Cari Hesap Ekstresi");
      pdf.moveDown();
      pdf.fontSize(11).text(`Firma: ${company?.companyName || "-"}`);
      pdf.text(`Musteri: ${customer.companyName || customer.name || "-"}`);
      pdf.text(`Ekstre Tarihi: ${new Date().toLocaleDateString("tr-TR")}`);
      pdf.moveDown();

      let y = pdf.y;
      rows.forEach((row) => {
        if (y > 760) {
          pdf.addPage();
          y = 60;
        }
        pdf.fontSize(9).text(new Date(row.date).toLocaleDateString("tr-TR"), 40, y);
        pdf.text(row.documentNo, 100, y);
        pdf.text(row.transactionType, 165, y);
        pdf.text(row.description || "-", 240, y, { width: 120 });
        pdf.text(Number(row.debit || 0).toFixed(2), 370, y, { width: 55, align: "right" });
        pdf.text(Number(row.credit || 0).toFixed(2), 430, y, { width: 55, align: "right" });
        pdf.text(Number(row.balance || 0).toFixed(2), 495, y, { width: 60, align: "right" });
        y += 15;
      });

      y += 14;
      pdf.fontSize(11).text(`Toplam Borc: ${totalDebt.toFixed(2)} TL`, 40, y);
      pdf.text(`Toplam Alacak: ${totalCredit.toFixed(2)} TL`, 220, y);
      pdf.text(`Guncel Bakiye: ${currentBalance.toFixed(2)} TL`, 410, y);
      pdf.end();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  createCustomerWhatsAppShare: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const companyName = customer.companyName || customer.name || "Firma";
      const secureToken = await ensurePortalToken(customer);
      const portalLink = buildPortalLink(secureToken);
      const publicPdfUrl = `${getApiBaseUrl()}/api/dealer/public/${secureToken}/statement/pdf`;
      const messagePlain = buildDealerPortalMessage({ companyName, portalLink });
      const phone = sanitizePhone(customer.mobilePhone || customer.phone || "");
      const sendResult = await sendWhatsAppMessage({ phone, message: messagePlain, mediaUrl: publicPdfUrl });
      const normalizedPhone = sendResult.normalizedPhone || phone;
      const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messagePlain)}`;

      const archive = await PdfArchive.create({
        companyId,
        customerId: customer._id,
        createdBy: req.user?.id,
        source: "ADMIN",
        pdfType: "STATEMENT",
        fileName: `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`,
        meta: { channel: "WHATSAPP", portalLink },
      });

      await Promise.all([
        WhatsAppHistory.create({
          companyId,
          customerId: customer._id,
          sentBy: req.user?.id,
          phone: normalizedPhone,
          message: messagePlain,
          status: sendResult.sent ? "SENT" : "FAILED",
          relatedPdfName: archive.fileName,
        }),
        NotificationHistory.create({
          companyId,
          customerId: customer._id,
          userId: req.user?.id,
          channel: "WHATSAPP",
          title: "Cari Ekstre WhatsApp",
          message: messagePlain,
          status: "CREATED",
        }),
      ]);

      res.status(200).json({
        success: true,
        url,
        phone,
        message: messagePlain,
        portalLink,
        pdfFileName: archive.fileName,
        pdfDownloadPath: `/api/customers/${customer._id}/statement/pdf`,
        publicPdfUrl,
        sendResult,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  createCustomerMailShare: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const toEmail = String(customer.email || "").trim().toLowerCase();
      const subject = "Cari Hesap Ekstresi ve Bayi Portali";
      const secureToken = await ensurePortalToken(customer);
      const portalLink = buildPortalLink(secureToken);
      const bodyPlain = buildDealerPortalMessage({
        companyName: customer.companyName || customer.name || "Firma",
        portalLink,
      });
      const body = encodeURIComponent(bodyPlain);
      const url = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;

      const archive = await PdfArchive.create({
        companyId,
        customerId: customer._id,
        createdBy: req.user?.id,
        source: "ADMIN",
        pdfType: "STATEMENT",
        fileName: `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`,
        meta: { channel: "MAIL", portalLink },
      });

      await Promise.all([
        MailHistory.create({
          companyId,
          customerId: customer._id,
          sentBy: req.user?.id,
          toEmail,
          subject,
          message: bodyPlain,
          status: "CREATED",
          relatedPdfName: archive.fileName,
        }),
        NotificationHistory.create({
          companyId,
          customerId: customer._id,
          userId: req.user?.id,
          channel: "MAIL",
          title: subject,
          message: bodyPlain,
          status: "CREATED",
        }),
      ]);

      res.status(200).json({
        success: true,
        url,
        toEmail,
        subject,
        body: bodyPlain,
        portalLink,
        pdfFileName: archive.fileName,
        pdfDownloadPath: `/api/customers/${customer._id}/statement/pdf`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  sendDebtReminder: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const companyName = customer.companyName || customer.name || "Firma";
      const message = `Merhaba Sayin ${companyName}\n\nGuncel cari hesap bakiyeniz bulunmaktadir.\nDetayli hesap ekstreniz ektedir.\nBilgi almak isterseniz bizimle iletisime gecebilirsiniz.\n\nIyi calismalar.\n\nAKN Cloud ERP`;

      await NotificationHistory.create({
        companyId,
        customerId: customer._id,
        userId: req.user?.id,
        channel: "REMINDER",
        title: "Borc Hatirlatma",
        message,
        status: "CREATED",
      });

      res.status(200).json({ success: true, message });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  getCustomerShareHistory: async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const customer = await Customer.findOne({ _id: req.params.id, ...(companyId ? { company: companyId } : {}) });
      if (!customer) return res.status(404).json({ success: false, message: "Musteri bulunamadi." });

      const [pdfArchive, whatsappHistory, mailHistory, notificationHistory] = await Promise.all([
        PdfArchive.find({ companyId, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
        WhatsAppHistory.find({ companyId, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
        MailHistory.find({ companyId, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
        NotificationHistory.find({ companyId, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
      ]);

      res.status(200).json({ success: true, pdfArchive, whatsappHistory, mailHistory, notificationHistory });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};