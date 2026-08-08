const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const crypto = require("crypto");
const User = require("../models/User");
const Customer = require("../models/customer");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Company = require("../models/company");
const Refund = require("../models/Refund");
const Notification = require("../models/Notification");
const StatementHistory = require("../models/StatementHistory");
const NotificationHistory = require("../models/NotificationHistory");
const PdfArchive = require("../models/PdfArchive");
const WhatsAppHistory = require("../models/WhatsAppHistory");
const MailHistory = require("../models/MailHistory");
const { sendWhatsAppMessage } = require("../services/whatsappService");

const DEBIT_TYPES = new Set(["ORDER", "INVOICE", "BORC"]);
const CREDIT_TYPES = new Set(["RETURN", "COLLECTION", "PAYMENT", "ALACAK", "TAHSILAT", "ODEME"]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizePhone = (value) => String(value || "").replace(/[^\d]/g, "");
const getPortalBaseUrl = () =>
  String(process.env.DEALER_PORTAL_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const getApiBaseUrl = () => String(process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const buildPortalLink = (token) => `${getPortalBaseUrl()}/bayi/${token}`;

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

const generateSecureToken = () => crypto.randomBytes(24).toString("hex");

const ensureCustomerPortalToken = async (customerDoc) => {
  if (customerDoc.dealerPortalToken) return customerDoc.dealerPortalToken;

  let token = generateSecureToken();
  let exists = await Customer.exists({ dealerPortalToken: token });
  while (exists) {
    token = generateSecureToken();
    exists = await Customer.exists({ dealerPortalToken: token });
  }

  customerDoc.dealerPortalToken = token;
  customerDoc.dealerPortalEnabled = true;
  customerDoc.dealerPortalTokenUpdatedAt = new Date();
  await customerDoc.save();
  return token;
};

const buildPeriodFilter = (query = {}) => {
  const period = String(query.period || "custom").trim().toLowerCase();
  const now = new Date();
  let startDate = query.startDate ? new Date(query.startDate) : null;
  let endDate = query.endDate ? new Date(query.endDate) : null;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date();
  } else if (period === "lastmonth") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return {
    ...query,
    startDate,
    endDate,
  };
};

const getDealerContext = async (req) => {
  const secureToken = String(req.params?.secureToken || "").trim();
  if (secureToken) {
    const customer = await Customer.findOne({
      dealerPortalToken: secureToken,
      dealerPortalEnabled: true,
      active: true,
    });

    if (!customer) {
      throw new Error("Bayi portali baglantisi gecersiz veya pasif.");
    }

    customer.dealerPortalLastAccessAt = new Date();
    await customer.save();

    return {
      user: {
        _id: null,
        id: null,
        company: customer.company,
        role: "dealer_public",
        name: customer.companyName || customer.name || "Bayi",
      },
      customer,
      isPublicTokenAccess: true,
    };
  }

  const dealerToken = req.dealer || req.user;
  if (!dealerToken?.id || dealerToken.role !== "dealer") {
    throw new Error("Bayi yetkisi gereklidir.");
  }

  const user = await User.findById(dealerToken.id).select(
    "name email userName role company customerId isActive password"
  );
  if (!user || !user.isActive || user.role !== "dealer") {
    throw new Error("Bayi kullanicisi bulunamadi veya pasif.");
  }

  if (!user.customerId) {
    throw new Error("Bayi hesabina musteri baglantisi yapilmamis.");
  }

  const customer = await Customer.findOne({ _id: user.customerId, company: user.company });
  if (!customer) {
    throw new Error("Bayi musteri kaydi bulunamadi.");
  }

  return { user, customer, isPublicTokenAccess: false };
};

const getStatementRows = (customer, filters = {}) => {
  const transactions = Array.isArray(customer.transactions) ? [...customer.transactions] : [];
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  const endDate = filters.endDate ? new Date(filters.endDate) : null;
  const docType = filters.docType ? String(filters.docType).trim().toUpperCase() : "";
  const minDebit = filters.minDebit ? toNumber(filters.minDebit, 0) : null;
  const minCredit = filters.minCredit ? toNumber(filters.minCredit, 0) : null;

  let runningBalance = 0;
  const rows = [];

  transactions.forEach((item, idx) => {
    const normalizedType = String(item.type || "").toUpperCase();
    const amount = toNumber(item.amount, 0);

    const debit = DEBIT_TYPES.has(normalizedType) ? amount : 0;
    const credit = CREDIT_TYPES.has(normalizedType) ? amount : 0;

    runningBalance = Number((runningBalance + debit - credit).toFixed(2));

    const rowDate = item.date ? new Date(item.date) : new Date();
    const evrakNo = `EVR-${String(idx + 1).padStart(4, "0")}`;
    const description = String(item.description || "").trim();

    if (startDate && rowDate < startDate) return;
    if (endDate) {
      const safeEnd = new Date(endDate);
      safeEnd.setHours(23, 59, 59, 999);
      if (rowDate > safeEnd) return;
    }
    if (docType && normalizedType !== docType) return;
    if (minDebit !== null && debit < minDebit) return;
    if (minCredit !== null && credit < minCredit) return;

    rows.push({
      date: rowDate,
      evrakNo,
      transactionType: normalizedType,
      description,
      debit,
      credit,
      balance: runningBalance,
    });
  });

  return rows;
};

exports.dealerLogin = async (req, res) => {
  try {
    const userName = String(req.body.userName || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!userName || !password) {
      return res.status(400).json({ success: false, message: "Kullanici adi ve sifre zorunludur." });
    }

    const user = await User.findOne({
      role: "dealer",
      isActive: true,
      $or: [{ userName }, { email: userName }],
    }).select("name email userName role company customerId password isActive");

    if (!user) {
      return res.status(401).json({ success: false, message: "Kullanici adi veya sifre hatali." });
    }

    const customer = await Customer.findOne({ _id: user.customerId, company: user.company });
    if (!customer) {
      return res.status(403).json({ success: false, message: "Bayi kaydi bulunamadi." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Kullanici adi veya sifre hatali." });
    }

    const token = jwt.sign(
      {
        id: user._id,
        company: user.company,
        customerId: user.customerId,
        role: "dealer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userName: user.userName || user.email,
        company: user.company,
        customerId: user.customerId,
      },
      companyName: customer.companyName || customer.name || "Bayi",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);

    const pendingOrders = await Order.countDocuments({
      companyId: user.company,
      status: { $in: ["GELEN_SIPARISLER", "HAZIRLANIYOR"] },
      customerName: { $in: [customer.companyName, customer.name].filter(Boolean) },
    });

    const inTransitOrders = await Order.countDocuments({
      companyId: user.company,
      status: "KARGODA",
      customerName: { $in: [customer.companyName, customer.name].filter(Boolean) },
    });

    const statementRows = getStatementRows(customer, {});
    const totalDebt = statementRows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = statementRows.reduce((sum, row) => sum + row.credit, 0);
    const lastPayment = statementRows
      .filter((row) => row.credit > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const [lastInvoice, lastReturn] = await Promise.all([
      Invoice.findOne({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).lean(),
      Refund.findOne({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const riskLimit = toNumber(customer.riskLimit, 0);
    const currentBalance = toNumber(customer.balance, 0);

    res.status(200).json({
      success: true,
      dashboard: {
        currentBalance,
        availableRiskLimit: Number((riskLimit - Math.max(currentBalance, 0)).toFixed(2)),
        pendingOrders,
        inTransitOrders,
        lastPaymentDate: lastPayment ? lastPayment.date : null,
        lastPaymentAmount: lastPayment ? toNumber(lastPayment.credit, 0) : 0,
        lastInvoiceDate: lastInvoice?.createdAt || null,
        lastInvoiceAmount: toNumber(lastInvoice?.grandTotal, 0),
        lastReturnDate: lastReturn?.createdAt || null,
        lastReturnAmount: toNumber(lastReturn?.amount, 0),
        totalDebt: Number(totalDebt.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
      },
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getStatement = async (req, res) => {
  try {
    const { customer } = await getDealerContext(req);
    const periodQuery = buildPeriodFilter(req.query);
    const rows = getStatementRows(customer, periodQuery);

    const summary = {
      totalDebt: Number(rows.reduce((sum, row) => sum + toNumber(row.debit, 0), 0).toFixed(2)),
      totalCredit: Number(rows.reduce((sum, row) => sum + toNumber(row.credit, 0), 0).toFixed(2)),
      currentBalance: Number((rows[rows.length - 1]?.balance || customer.balance || 0).toFixed(2)),
    };

    await StatementHistory.create({
      companyId: customer.company,
      customerId: customer._id,
      requestedBy: req.dealer?.id || req.user?.id,
      source: "DEALER",
      startDate: periodQuery.startDate || null,
      endDate: periodQuery.endDate || null,
      docType: String(periodQuery.docType || "").trim(),
      minDebit: toNumber(periodQuery.minDebit, 0),
      minCredit: toNumber(periodQuery.minCredit, 0),
      rowCount: rows.length,
    });

    res.status(200).json({
      success: true,
      statement: rows,
      summary,
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getPurchasedProducts = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);

    const sales = await Sale.find({ companyId: user.company, customerId: customer._id })
      .populate("items.productId", "name sku image")
      .sort({ saleDate: -1, createdAt: -1 });

    const rows = [];
    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        rows.push({
          saleId: sale._id,
          productImage: item.productId?.image || "",
          productCode: item.productId?.sku || "",
          productName: item.productId?.name || "Urun",
          quantity: toNumber(item.quantity, 0),
          unitPrice: toNumber(item.unitPrice, 0),
          totalAmount: toNumber(item.totalPrice, 0),
          purchaseDate: sale.saleDate || sale.createdAt,
        });
      });
    });

    res.status(200).json({ success: true, products: rows });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { customer } = await getDealerContext(req);
    const rows = (customer.transactions || [])
      .filter((item) => CREDIT_TYPES.has(String(item.type || "").toUpperCase()))
      .map((item) => ({
        paymentDate: item.date,
        paymentMethod: String(item.type || "").toUpperCase(),
        amount: toNumber(item.amount, 0),
        description: String(item.description || ""),
      }))
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.status(200).json({ success: true, payments: rows });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const dbRefunds = await Refund.find({ companyId: user.company, customerId: customer._id }).sort({ refundDate: -1 });

    const fallbackReturns = (customer.transactions || [])
      .filter((item) => String(item.type || "").toUpperCase() === "RETURN")
      .map((item, index) => ({
        id: item._id || `return-${index}`,
        returnDate: item.date,
        product: (item.items || []).map((x) => x.name).filter(Boolean).join(", ") || "Iade Urunu",
        quantity: (item.items || []).reduce((sum, x) => sum + toNumber(x.quantity, 0), 0),
        amount: toNumber(item.amount, 0),
        status: "ONAYLANDI",
      }));

    const normalizedDb = dbRefunds.map((item) => ({
      id: item._id,
      returnDate: item.refundDate,
      product: item.reason || "Iade",
      quantity: item.quantity || 0,
      amount: toNumber(item.amount, 0),
      status: item.status,
    }));

    const returns = [...normalizedDb, ...fallbackReturns].sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));

    res.status(200).json({ success: true, returns });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);

    const orders = await Order.find({
      companyId: user.company,
      customerName: { $in: [customer.companyName, customer.name].filter(Boolean) },
      status: { $in: ["HAZIRLANIYOR", "KARGODA", "TESLIM_EDILDI", "GELEN_SIPARISLER"] },
    }).sort({ createdAt: -1 });

    const rows = orders.map((order) => ({
      id: order._id,
      orderDate: order.createdAt,
      totalAmount: toNumber(order.totalAmount, 0),
      status: order.status === "GELEN_SIPARISLER" ? "HAZIRLANIYOR" : order.status,
      itemCount: (order.items || []).length,
      notes: order.notes || "",
    }));

    res.status(200).json({ success: true, orders: rows });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const invoices = await Invoice.find({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      invoices: invoices.map((invoice) => ({
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber || "",
        invoiceType: invoice.invoiceType,
        status: invoice.status,
        total: toNumber(invoice.grandTotal, 0),
        createdAt: invoice.createdAt,
      })),
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: user.company, customerId: customer._id });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Fatura bulunamadi." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=fatura-${invoice.invoiceNumber || invoice._id}.pdf`);

    const pdf = new PDFDocument({ size: "A4", margin: 40 });
    pdf.pipe(res);

    pdf.fontSize(20).text("AKN Cloud ERP - Bayi Faturasi");
    pdf.moveDown();
    pdf.fontSize(12).text(`Fatura No: ${invoice.invoiceNumber || "-"}`);
    pdf.text(`Fatura Tipi: ${invoice.invoiceType}`);
    pdf.text(`Durum: ${invoice.status}`);
    pdf.text(`Tarih: ${new Date(invoice.createdAt).toLocaleDateString("tr-TR")}`);
    pdf.moveDown();

    pdf.text(`Ara Toplam: ${toNumber(invoice.subTotal, 0).toFixed(2)} TL`);
    pdf.text(`Vergi Toplami: ${toNumber(invoice.taxTotal, 0).toFixed(2)} TL`);
    pdf.text(`Genel Toplam: ${toNumber(invoice.grandTotal, 0).toFixed(2)} TL`);
    pdf.moveDown();

    pdf.text("Kalemler:");
    (invoice.items || []).forEach((item, idx) => {
      pdf.text(
        `${idx + 1}. ${item.name} - ${item.quantity} x ${toNumber(item.unitPrice, 0).toFixed(2)} = ${toNumber(item.totalPrice, 0).toFixed(2)} TL`
      );
    });

    pdf.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadStatementPdf = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const company = await Company.findById(user.company).lean();
    const periodQuery = buildPeriodFilter(req.query);
    const rows = getStatementRows(customer, periodQuery);
    const summary = {
      totalDebt: Number(rows.reduce((sum, row) => sum + toNumber(row.debit, 0), 0).toFixed(2)),
      totalCredit: Number(rows.reduce((sum, row) => sum + toNumber(row.credit, 0), 0).toFixed(2)),
      currentBalance: Number((rows[rows.length - 1]?.balance || customer.balance || 0).toFixed(2)),
    };

    const fileName = `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`;

    await PdfArchive.create({
      companyId: user.company,
      customerId: customer._id,
      createdBy: user._id,
      source: "DEALER",
      pdfType: "STATEMENT",
      fileName,
      meta: {
        startDate: periodQuery.startDate || null,
        endDate: periodQuery.endDate || null,
        rowCount: rows.length,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const pdf = new PDFDocument({ size: "A4", margin: 40 });
    pdf.pipe(res);

    pdf.fontSize(20).fillColor("#0f172a").text("AKN Cloud ERP - Cari Hesap Ekstresi");
    pdf.moveDown(0.4);

    pdf.fontSize(11).fillColor("#334155");
    pdf.text(`Firma: ${company?.companyName || "-"}`);
    pdf.text(`Vergi No: ${company?.taxNumber || "-"}`);
    pdf.text(`Musteri: ${customer.companyName || customer.name || "-"}`);
    pdf.text(`Musteri Kodu: ${customer.customerCode || "-"}`);
    pdf.text(`Ekstre Tarihi: ${new Date().toLocaleDateString("tr-TR")}`);
    pdf.moveDown(0.8);

    if (company?.logo) {
      try {
        pdf.image(company.logo, 460, 40, { width: 90 });
      } catch {
        // Remote logo URL may fail in some environments; continue without interrupting PDF generation.
      }
    }

    const startY = pdf.y;
    const columns = [40, 96, 162, 250, 360, 430, 500];
    const drawTableHeader = (headerY) => {
      pdf.fontSize(10).fillColor("#0f172a");
      ["Tarih", "Belge No", "Islem", "Aciklama", "Borc", "Alacak", "Bakiye"].forEach((title, idx) => pdf.text(title, columns[idx], headerY));
    };

    drawTableHeader(startY);
    let y = startY + 18;

    rows.forEach((row) => {
      if (y > pdf.page.height - 70) {
        pdf.addPage();
        drawTableHeader(50);
        y = 68;
      }
      pdf.fontSize(9).fillColor("#1f2937");
      pdf.text(new Date(row.date).toLocaleDateString("tr-TR"), columns[0], y);
      pdf.text(row.evrakNo, columns[1], y);
      pdf.text(row.transactionType, columns[2], y);
      pdf.text(row.description || "-", columns[3], y, { width: 105 });
      pdf.text(toNumber(row.debit, 0).toFixed(2), columns[4], y, { width: 62, align: "right" });
      pdf.text(toNumber(row.credit, 0).toFixed(2), columns[5], y, { width: 62, align: "right" });
      pdf.text(toNumber(row.balance, 0).toFixed(2), columns[6], y, { width: 62, align: "right" });
      y += 16;
    });

    y += 10;
    pdf.fontSize(11).fillColor("#0f172a");
    pdf.text(`Toplam Borc: ${summary.totalDebt.toFixed(2)} TL`, 40, y);
    pdf.text(`Toplam Alacak: ${summary.totalCredit.toFixed(2)} TL`, 220, y);
    pdf.text(`Guncel Bakiye: ${summary.currentBalance.toFixed(2)} TL`, 410, y);
    pdf.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStatementWhatsAppShare = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const company = await Company.findById(user.company).lean();
    const companyName = customer.companyName || customer.name || "Firma";
    const phone = sanitizePhone(customer.mobilePhone || customer.phone || "");
    const secureToken = await ensureCustomerPortalToken(customer);
    const portalLink = buildPortalLink(secureToken);
    const publicPdfUrl = `${getApiBaseUrl()}/api/dealer/public/${secureToken}/statement/pdf`;
    const messagePlain = buildDealerPortalMessage({ companyName, portalLink });
    const sendResult = await sendWhatsAppMessage({ phone, message: messagePlain, mediaUrl: publicPdfUrl });
    const normalizedPhone = sendResult.normalizedPhone || phone;
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messagePlain)}`;

    const archive = await PdfArchive.create({
      companyId: user.company,
      customerId: customer._id,
      createdBy: user._id,
      source: "DEALER",
      pdfType: "STATEMENT",
      fileName: `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`,
      meta: { channel: "WHATSAPP", portalLink },
    });

    await Promise.all([
      WhatsAppHistory.create({
        companyId: user.company,
        customerId: customer._id,
        sentBy: user._id,
        phone: normalizedPhone,
        message: messagePlain,
        status: sendResult.sent ? "SENT" : "FAILED",
        relatedPdfName: archive.fileName,
      }),
      NotificationHistory.create({
        companyId: user.company,
        customerId: customer._id,
        userId: user._id,
        channel: "WHATSAPP",
        title: "Cari Ekstre WhatsApp Paylasimi",
        message: messagePlain,
        status: "CREATED",
      }),
      Notification.create({
        companyId: user.company,
        userId: user._id,
        type: "DUYURU",
        title: "Cari Ekstre Hazir",
        message: `${company?.companyName || "AKN Cloud"} cari ekstreniz WhatsApp paylasimina hazir.`,
        sourceModule: "dealer-portal",
      }),
    ]);

    res.status(200).json({
      success: true,
      phone: normalizedPhone,
      message: messagePlain,
      portalLink,
      pdfDownloadPath: `/api/dealer/${req.params?.secureToken ? `public/${req.params.secureToken}/` : ""}statement/pdf`,
      publicPdfUrl,
      sendResult,
      url,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStatementMailShare = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);
    const toEmail = String(customer.email || "").trim().toLowerCase();
    const subject = "Cari Hesap Ekstresi ve Bayi Portali";
    const secureToken = await ensureCustomerPortalToken(customer);
    const portalLink = buildPortalLink(secureToken);
    const bodyPlain = buildDealerPortalMessage({
      companyName: customer.companyName || customer.name || "Firma",
      portalLink,
    });
    const body = encodeURIComponent(bodyPlain);

    const archive = await PdfArchive.create({
      companyId: user.company,
      customerId: customer._id,
      createdBy: user._id,
      source: "DEALER",
      pdfType: "STATEMENT",
      fileName: `ekstre-${customer.customerCode || customer._id}-${Date.now()}.pdf`,
      meta: { channel: "MAIL", portalLink },
    });

    await Promise.all([
      MailHistory.create({
        companyId: user.company,
        customerId: customer._id,
        sentBy: user._id,
        toEmail,
        subject,
        message: bodyPlain,
        status: "CREATED",
        relatedPdfName: archive.fileName,
      }),
      NotificationHistory.create({
        companyId: user.company,
        customerId: customer._id,
        userId: user._id,
        channel: "MAIL",
        title: subject,
        message: bodyPlain,
        status: "CREATED",
      }),
    ]);

    res.status(200).json({
      success: true,
      toEmail,
      subject,
      body: bodyPlain,
      portalLink,
      pdfDownloadPath: `/api/dealer/${req.params?.secureToken ? `public/${req.params.secureToken}/` : ""}statement/pdf`,
      url: `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${body}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { user } = await getDealerContext(req);
    const notifications = await Notification.find({
      companyId: user.company,
      $or: [{ userId: user._id }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPortalHistory = async (req, res) => {
  try {
    const { user, customer } = await getDealerContext(req);
    const [pdfArchive, whatsappHistory, mailHistory, notificationHistory] = await Promise.all([
      PdfArchive.find({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
      WhatsAppHistory.find({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
      MailHistory.find({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
      NotificationHistory.find({ companyId: user.company, customerId: customer._id }).sort({ createdAt: -1 }).limit(100),
    ]);

    res.status(200).json({ success: true, pdfArchive, whatsappHistory, mailHistory, notificationHistory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { customer, user } = await getDealerContext(req);

    res.status(200).json({
      success: true,
      profile: {
        companyName: customer.companyName || customer.name || "",
        authorizedName: user.name || "",
        phone: customer.phone || customer.mobilePhone || "",
        email: user.email || customer.email || "",
        userName: user.userName || user.email,
        customerCode: customer.customerCode || "",
        taxNumber: customer.taxNumber || "",
        taxOffice: customer.taxOffice || "",
        address: customer.address || "",
      },
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { user } = await getDealerContext(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Mevcut ve yeni sifre zorunludur." });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Yeni sifre en az 6 karakter olmalidir." });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, message: "Mevcut sifre hatali." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Sifre guncellendi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicDashboard = (req, res) => exports.getDashboard(req, res);
exports.getPublicStatement = (req, res) => exports.getStatement(req, res);
exports.getPublicPurchasedProducts = (req, res) => exports.getPurchasedProducts(req, res);
exports.getPublicPayments = (req, res) => exports.getPayments(req, res);
exports.getPublicReturns = (req, res) => exports.getReturns(req, res);
exports.getPublicOrders = (req, res) => exports.getOrders(req, res);
exports.getPublicInvoices = (req, res) => exports.getInvoices(req, res);
exports.downloadPublicInvoicePdf = (req, res) => exports.downloadInvoicePdf(req, res);
exports.downloadPublicStatementPdf = (req, res) => exports.downloadStatementPdf(req, res);
exports.createPublicStatementWhatsAppShare = (req, res) => exports.createStatementWhatsAppShare(req, res);
exports.createPublicStatementMailShare = (req, res) => exports.createStatementMailShare(req, res);
exports.getPublicNotifications = (req, res) => exports.getNotifications(req, res);
exports.getPublicPortalHistory = (req, res) => exports.getPortalHistory(req, res);
exports.getPublicProfile = (req, res) => exports.getProfile(req, res);
