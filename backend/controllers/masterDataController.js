const mongoose = require("mongoose");
const { parseListQuery } = require("../utils/queryFeatures");
const { runInTransaction } = require("../utils/dbTransaction");
const { writeActivityLog } = require("../services/activityLogService");

const MODEL_MAP = {
  roles: require("../models/Role"),
  permissions: require("../models/Permission"),
  customerGroups: require("../models/CustomerGroup"),
  suppliers: require("../models/Supplier"),
  productCategories: require("../models/ProductCategory"),
  brands: require("../models/Brand"),
  units: require("../models/Unit"),
  stockCounts: require("../models/StockCount"),
  saleDetails: require("../models/SaleDetail"),
  purchases: require("../models/Purchase"),
  purchaseDetails: require("../models/PurchaseDetail"),
  orderDetails: require("../models/OrderDetail"),
  cashRegisters: require("../models/CashRegister"),
  bankAccounts: require("../models/BankAccount"),
  currentAccounts: require("../models/CurrentAccount"),
  currentTransactions: require("../models/CurrentTransaction"),
  payments: require("../models/Payment"),
  collections: require("../models/Collection"),
  expenses: require("../models/Expense"),
  expenseCategories: require("../models/ExpenseCategory"),
  reports: require("../models/Report"),
  notifications: require("../models/Notification"),
  settings: require("../models/Setting"),
};

const SEARCH_FIELDS = {
  roles: ["name", "key", "description"],
  permissions: ["module"],
  customerGroups: ["name", "description"],
  suppliers: ["name", "code", "email", "phone"],
  productCategories: ["name", "description"],
  brands: ["name"],
  units: ["name", "symbol"],
  purchases: ["purchaseNo", "note"],
  cashRegisters: ["name", "code"],
  bankAccounts: ["name", "iban", "bankName"],
  currentAccounts: ["code", "name"],
  currentTransactions: ["description", "sourceType"],
  payments: ["referenceNo", "note"],
  collections: ["referenceNo", "note"],
  expenses: ["description"],
  expenseCategories: ["name", "code"],
  reports: ["name", "reportType"],
  notifications: ["title", "message", "type"],
  settings: ["key", "group"],
};

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

const getModel = (resource) => MODEL_MAP[resource];

const listItems = async (req, res) => {
  try {
    const { resource } = req.params;
    const Model = getModel(resource);
    if (!Model) {
      return res.status(404).json({ success: false, message: "Kaynak bulunamadi." });
    }

    const list = parseListQuery(req.query);
    const companyId = getCompanyId(req);
    const { q } = req.query;

    const filter = {};
    if (companyId && Model.schema.path("companyId")) {
      filter.companyId = companyId;
    }

    const searchFields = SEARCH_FIELDS[resource] || [];
    if (q && searchFields.length > 0) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = searchFields.map((field) => ({ [field]: regex }));
    }

    Object.keys(req.query).forEach((key) => {
      if (["q", "page", "limit", "sortBy", "sortDir"].includes(key)) return;
      if (!Model.schema.path(key)) return;
      const value = req.query[key];
      if (value === "true" || value === "false") {
        filter[key] = value === "true";
      } else {
        filter[key] = value;
      }
    });

    const [items, total] = await Promise.all([
      Model.find(filter).sort(list.sort).skip(list.skip).limit(list.limit),
      Model.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      items,
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

const getItem = async (req, res) => {
  try {
    const { resource, id } = req.params;
    const Model = getModel(resource);
    if (!Model) {
      return res.status(404).json({ success: false, message: "Kaynak bulunamadi." });
    }

    const companyId = getCompanyId(req);
    const query = { _id: id };
    if (companyId && Model.schema.path("companyId")) {
      query.companyId = companyId;
    }

    const item = await Model.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: "Kayit bulunamadi." });
    }

    res.status(200).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createItem = async (req, res) => {
  try {
    const { resource } = req.params;
    const Model = getModel(resource);
    if (!Model) {
      return res.status(404).json({ success: false, message: "Kaynak bulunamadi." });
    }

    const companyId = getCompanyId(req);

    const created = await runInTransaction(async (session) => {
      const payload = { ...req.body };
      if (companyId && Model.schema.path("companyId") && !payload.companyId) {
        payload.companyId = companyId;
      }

      const rows = await Model.create([payload], { session });

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: resource,
        action: "CREATE",
        entityType: Model.modelName,
        entityId: rows[0]._id,
        after: rows[0].toObject(),
        ipAddress: req.ip,
        session,
      });

      return rows[0];
    });

    res.status(201).json({ success: true, item: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { resource, id } = req.params;
    const Model = getModel(resource);
    if (!Model) {
      return res.status(404).json({ success: false, message: "Kaynak bulunamadi." });
    }

    const companyId = getCompanyId(req);
    const updated = await runInTransaction(async (session) => {
      const query = { _id: id };
      if (companyId && Model.schema.path("companyId")) {
        query.companyId = companyId;
      }

      const item = await Model.findOne(query).session(session);
      if (!item) {
        throw new Error("Kayit bulunamadi.");
      }

      const before = item.toObject();
      Object.keys(req.body || {}).forEach((key) => {
        if (!Model.schema.path(key)) return;
        item[key] = req.body[key];
      });

      await item.save({ session });

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: resource,
        action: "UPDATE",
        entityType: Model.modelName,
        entityId: item._id,
        before,
        after: item.toObject(),
        ipAddress: req.ip,
        session,
      });

      return item;
    });

    res.status(200).json({ success: true, item: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { resource, id } = req.params;
    const Model = getModel(resource);
    if (!Model) {
      return res.status(404).json({ success: false, message: "Kaynak bulunamadi." });
    }

    const companyId = getCompanyId(req);
    await runInTransaction(async (session) => {
      const query = { _id: id };
      if (companyId && Model.schema.path("companyId")) {
        query.companyId = companyId;
      }

      const item = await Model.findOne(query).session(session);
      if (!item) {
        throw new Error("Kayit bulunamadi.");
      }

      const before = item.toObject();
      if (typeof item.softDelete === "function") {
        await item.softDelete(req.user?.id, session);
      } else {
        await item.deleteOne({ session });
      }

      await writeActivityLog({
        companyId,
        userId: req.user?.id,
        module: resource,
        action: "SOFT_DELETE",
        entityType: Model.modelName,
        entityId: item._id,
        before,
        after: null,
        ipAddress: req.ip,
        session,
      });
    });

    res.status(200).json({ success: true, message: "Kayit silindi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
};
