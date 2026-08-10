const Supplier = require("../models/Supplier");
const { parseListQuery } = require("../utils/queryFeatures");
const { writeActivityLog } = require("../services/activityLogService");

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

const safeString = (value) => String(value || "").trim();

const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const buildCode = () => `SUP${Date.now()}`;

const normalizeStatus = (status) => {
  const value = String(status || "active").trim().toLowerCase();
  return value === "inactive" ? "inactive" : "active";
};

const normalizePayload = (payload = {}) => {
  const status = normalizeStatus(payload.status);

  return {
    code: safeString(payload.code),
    name: safeString(payload.name),
    contactPerson: safeString(payload.contactPerson),
    phone: safeString(payload.phone),
    email: safeString(payload.email).toLowerCase(),
    address: safeString(payload.address),
    taxNumber: safeString(payload.taxNumber),
    taxOffice: safeString(payload.taxOffice),
    category: safeString(payload.category),
    notes: safeString(payload.notes),
    status,
    isActive: status === "active",
    lastTransactionDate: payload.lastTransactionDate ? new Date(payload.lastTransactionDate) : null,
    bankInfo: {
      bankName: safeString(payload.bankInfo?.bankName),
      accountHolder: safeString(payload.bankInfo?.accountHolder),
      iban: safeString(payload.bankInfo?.iban),
      accountNumber: safeString(payload.bankInfo?.accountNumber),
      branchCode: safeString(payload.bankInfo?.branchCode),
    },
  };
};

const getSuppliers = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const { q, status, category } = req.query;
    const list = parseListQuery(req.query);

    const filter = { companyId };

    if (status) {
      filter.status = normalizeStatus(status);
    }

    if (category) {
      filter.category = safeString(category);
    }

    if (q) {
      const regex = new RegExp(safeString(q), "i");
      filter.$or = [
        { code: regex },
        { name: regex },
        { contactPerson: regex },
        { phone: regex },
        { email: regex },
        { taxNumber: regex },
        { category: regex },
        { address: regex },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort(list.sort).skip(list.skip).limit(list.limit),
      Supplier.countDocuments(filter),
    ]);

    res.json({
      success: true,
      suppliers,
      pagination: {
        page: list.page,
        limit: list.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / list.limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSupplier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const supplier = await Supplier.findOne({ _id: req.params.id, companyId });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Tedarikci bulunamadi." });
    }

    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const payload = normalizePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Firma adi zorunludur." });
    }

    if (!isValidEmail(payload.email)) {
      return res.status(400).json({ success: false, message: "Gecerli bir e-posta giriniz." });
    }

    payload.code = payload.code || buildCode();

    const codeExists = await Supplier.exists({ companyId, code: payload.code });
    if (codeExists) {
      return res.status(400).json({ success: false, message: "Bu tedarikci kodu zaten kullaniliyor." });
    }

    const supplier = await Supplier.create({
      companyId,
      ...payload,
    });

    await writeActivityLog({
      companyId,
      userId: req.user?.id,
      module: "suppliers",
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier._id,
      after: supplier.toObject(),
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, supplier, message: "Tedarikci olusturuldu." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const supplier = await Supplier.findOne({ _id: req.params.id, companyId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Tedarikci bulunamadi." });
    }

    const payload = normalizePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Firma adi zorunludur." });
    }

    if (!isValidEmail(payload.email)) {
      return res.status(400).json({ success: false, message: "Gecerli bir e-posta giriniz." });
    }

    if (payload.code && payload.code !== supplier.code) {
      const codeExists = await Supplier.exists({ companyId, code: payload.code, _id: { $ne: supplier._id } });
      if (codeExists) {
        return res.status(400).json({ success: false, message: "Bu tedarikci kodu zaten kullaniliyor." });
      }
    }

    const before = supplier.toObject();

    Object.assign(supplier, {
      ...payload,
      code: payload.code || supplier.code,
    });

    await supplier.save();

    await writeActivityLog({
      companyId,
      userId: req.user?.id,
      module: "suppliers",
      action: "UPDATE",
      entityType: "Supplier",
      entityId: supplier._id,
      before,
      after: supplier.toObject(),
      ipAddress: req.ip,
    });

    res.json({ success: true, supplier, message: "Tedarikci guncellendi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const supplier = await Supplier.findOne({ _id: req.params.id, companyId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Tedarikci bulunamadi." });
    }

    const before = supplier.toObject();
    await supplier.softDelete(req.user?.id);

    await writeActivityLog({
      companyId,
      userId: req.user?.id,
      module: "suppliers",
      action: "SOFT_DELETE",
      entityType: "Supplier",
      entityId: supplier._id,
      before,
      after: supplier.toObject(),
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Tedarikci silindi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
