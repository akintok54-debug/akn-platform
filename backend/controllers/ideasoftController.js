const mongoose = require("mongoose");
const Setting = require("../models/Setting");
const Product = require("../models/Product");
const Customer = require("../models/customer");
const Supplier = require("../models/Supplier");
const ImportJob = require("../models/ImportJob");
const { normalizeCustomerPayload } = require("../utils/customerUtils");
const { writeActivityLog } = require("../services/activityLogService");
const {
  IDEASOFT_GROUP,
  IDEASOFT_SETTING_KEY,
  getIdeaSoftConfig,
  sanitizeConfigForClient,
  createIdeaSoftStateToken,
  verifyIdeaSoftStateToken,
  buildIdeaSoftAuthUrl,
  exchangeIdeaSoftCode,
  refreshIdeaSoftAccessToken,
  fetchIdeaSoftResource,
  getResourceDefinition,
  listIdeaSoftResources,
} = require("../services/ideasoftService");

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;
const hasDatabaseConnection = () => mongoose.connection.readyState === 1;

const getStoredIdeaSoftConnection = async (companyId) => {
  if (!hasDatabaseConnection()) return null;
  return Setting.findOne({ companyId, key: IDEASOFT_SETTING_KEY });
};

const saveIdeaSoftConnection = async ({ companyId, userId, value }) =>
  hasDatabaseConnection()
    ?
  Setting.findOneAndUpdate(
    { companyId, key: IDEASOFT_SETTING_KEY },
    { $set: { value, group: IDEASOFT_GROUP, updatedBy: userId || null } },
    { new: true, upsert: true, runValidators: true }
  )
    : Promise.reject(Object.assign(new Error("IdeaSoft bağlantısını kaydetmek için MongoDB bağlantısı gerekli."), { statusCode: 503 }));

const ensureIdeaSoftAccessToken = async ({ companyId, settingDoc }) => {
  const connection = settingDoc || (await getStoredIdeaSoftConnection(companyId));
  if (!connection?.value?.accessToken) {
    const error = new Error("IdeaSoft bağlantısı kurulmamış.");
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = connection.value?.expiresAt ? new Date(connection.value.expiresAt) : null;
  if (!expiresAt || expiresAt > new Date(Date.now() + 60 * 1000)) {
    return { accessToken: connection.value.accessToken, settingDoc: connection };
  }

  if (!connection.value.refreshToken) {
    const error = new Error("IdeaSoft refresh token bulunamadı.");
    error.statusCode = 400;
    throw error;
  }

  const refreshed = await refreshIdeaSoftAccessToken({ refreshToken: connection.value.refreshToken, config: getIdeaSoftConfig() });
  const nextValue = {
    ...connection.value,
    accessToken: refreshed.access_token || refreshed.accessToken || connection.value.accessToken,
    refreshToken: refreshed.refresh_token || refreshed.refreshToken || connection.value.refreshToken,
    tokenType: refreshed.token_type || refreshed.tokenType || connection.value.tokenType || "Bearer",
    scope: refreshed.scope || connection.value.scope || "",
    expiresAt: refreshed.expires_in || refreshed.expiresIn
      ? new Date(Date.now() + Number(refreshed.expires_in || refreshed.expiresIn) * 1000).toISOString()
      : connection.value.expiresAt,
  };

  const saved = await saveIdeaSoftConnection({ companyId, userId: connection.updatedBy, value: nextValue });
  return { accessToken: nextValue.accessToken, settingDoc: saved };
};

const resolveProductFilter = (companyId, item) => {
  const filter = { company: companyId };
  if (item.sku) return { ...filter, sku: item.sku };
  if (item.barcode) return { ...filter, barcode: item.barcode };
  if (item.name) return { ...filter, name: item.name };
  return null;
};

const commitProducts = async ({ companyId, items }) => {
  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const filter = resolveProductFilter(companyId, item);
    if (!filter || !item.name) continue;
    const existing = await Product.findOne(filter);
    const payload = {
      company: companyId,
      name: item.name,
      sku: item.sku || "",
      barcode: item.barcode || "",
      brand: item.brand || "",
      category: item.category || "",
      purchasePrice: item.purchasePrice || 0,
      salePrice: item.salePrice || 0,
      vat: item.vat || 20,
      stock: item.stock || 0,
      minStock: item.minStock || 0,
      image: item.image || "",
      images: item.images || [],
      active: item.active !== false,
    };

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      updated += 1;
    } else {
      await Product.create(payload);
      inserted += 1;
    }
  }

  return { inserted, updated, failed: 0, skipped: Math.max(0, items.length - inserted - updated) };
};

const commitStocks = async ({ companyId, items }) => {
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const filter = resolveProductFilter(companyId, item);
    if (!filter) {
      skipped += 1;
      continue;
    }
    const product = await Product.findOne(filter);
    if (!product) {
      skipped += 1;
      continue;
    }
    product.stock = item.stock || 0;
    product.minStock = item.minStock || product.minStock || 0;
    product.shelf = item.shelf || product.shelf || "";
    await product.save();
    updated += 1;
  }

  return { inserted: 0, updated, failed: 0, skipped };
};

const commitPrices = async ({ companyId, items }) => {
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const filter = resolveProductFilter(companyId, item);
    if (!filter) {
      skipped += 1;
      continue;
    }
    const product = await Product.findOne(filter);
    if (!product) {
      skipped += 1;
      continue;
    }
    product.salePrice = item.salePrice || product.salePrice || 0;
    product.purchasePrice = item.purchasePrice || product.purchasePrice || 0;
    product.vat = item.vat || product.vat || 20;
    await product.save();
    updated += 1;
  }

  return { inserted: 0, updated, failed: 0, skipped };
};

const commitCustomers = async ({ companyId, items }) => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const filter = item.email
      ? { company: companyId, email: item.email }
      : item.companyName
      ? { company: companyId, companyName: item.companyName }
      : null;

    if (!filter) {
      skipped += 1;
      continue;
    }

    const payload = normalizeCustomerPayload({ ...item, company: companyId });
    const existing = await Customer.findOne(filter);
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      updated += 1;
    } else {
      await Customer.create({
        ...payload,
        company: companyId,
        customerCode: payload.customerCode || payload.code || `IDC${Date.now()}`,
      });
      inserted += 1;
    }
  }

  return { inserted, updated, failed: 0, skipped };
};

const commitSuppliers = async ({ companyId, items }) => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const filter = item.code
      ? { companyId, code: item.code }
      : item.email
      ? { companyId, email: item.email }
      : item.name
      ? { companyId, name: item.name }
      : null;

    if (!filter || !item.name) {
      skipped += 1;
      continue;
    }

    const payload = {
      companyId,
      code: item.code || `IDS${Date.now()}`,
      name: item.name,
      contactPerson: item.contactPerson || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      taxNumber: item.taxNumber || "",
      taxOffice: item.taxOffice || "",
      category: item.category || "",
      notes: item.notes || "",
      status: item.status || "active",
      isActive: item.status !== "inactive",
    };

    const existing = await Supplier.findOne(filter);
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      updated += 1;
    } else {
      await Supplier.create(payload);
      inserted += 1;
    }
  }

  return { inserted, updated, failed: 0, skipped };
};

const COMMITTERS = {
  products: commitProducts,
  stock: commitStocks,
  prices: commitPrices,
  customers: commitCustomers,
  suppliers: commitSuppliers,
};

exports.getIdeaSoftStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const connection = companyId ? await getStoredIdeaSoftConnection(companyId) : null;
    res.json({
      success: true,
      config: sanitizeConfigForClient(getIdeaSoftConfig()),
      resources: listIdeaSoftResources().map((item) => ({ key: item.key, label: item.label, commitSupported: item.commitSupported })),
      connected: Boolean(connection?.value?.accessToken),
      connection: connection?.value
        ? {
            scope: connection.value.scope || "",
            tokenType: connection.value.tokenType || "Bearer",
            expiresAt: connection.value.expiresAt || null,
            connectedAt: connection.updatedAt,
          }
        : null,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.getIdeaSoftAuthUrl = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const state = createIdeaSoftStateToken({ companyId, userId: req.user?.id });
    const authUrl = buildIdeaSoftAuthUrl({ state });
    res.json({ success: true, authUrl, callbackUrl: getIdeaSoftConfig().callbackUrl });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.handleIdeaSoftCallback = async (req, res) => {
  try {
    const { code, state, error: oauthError, error_description: errorDescription } = req.query;
    if (oauthError) {
      return res.status(400).json({ success: false, message: errorDescription || oauthError });
    }
    if (!code || !state) {
      return res.status(400).json({ success: false, message: "IdeaSoft callback parametreleri eksik." });
    }

    const decoded = verifyIdeaSoftStateToken(String(state));
    const tokenPayload = await exchangeIdeaSoftCode({ code: String(code), config: getIdeaSoftConfig() });
    const connectionValue = {
      accessToken: tokenPayload.access_token || tokenPayload.accessToken || "",
      refreshToken: tokenPayload.refresh_token || tokenPayload.refreshToken || "",
      tokenType: tokenPayload.token_type || tokenPayload.tokenType || "Bearer",
      scope: tokenPayload.scope || "",
      expiresAt: tokenPayload.expires_in || tokenPayload.expiresIn
        ? new Date(Date.now() + Number(tokenPayload.expires_in || tokenPayload.expiresIn) * 1000).toISOString()
        : null,
      connectedAt: new Date().toISOString(),
    };

    await saveIdeaSoftConnection({ companyId: decoded.companyId, userId: decoded.userId, value: connectionValue });
    res.json({ success: true, message: "IdeaSoft bağlantısı kuruldu.", connected: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.syncIdeaSoftResource = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const { resource } = req.params;
    const { preview = "true", page = "1", limit = "50" } = req.query;
    const definition = getResourceDefinition(resource);
    const { accessToken } = await ensureIdeaSoftAccessToken({ companyId });
    const { items, raw } = await fetchIdeaSoftResource({
      resource,
      accessToken,
      config: getIdeaSoftConfig(),
      query: { page, limit },
    });

    const previewMode = String(preview).toLowerCase() !== "false";
    if (previewMode || !definition.commitSupported) {
      return res.json({
        success: true,
        resource,
        preview: true,
        commitSupported: definition.commitSupported,
        total: items.length,
        items: items.slice(0, 50),
        rawMeta: raw?.meta || raw?.pagination || null,
      });
    }

    const committer = COMMITTERS[resource];
    if (!hasDatabaseConnection()) {
      return res.status(503).json({ success: false, message: "MongoDB bağlantısı olmadan kalıcı senkronizasyon yapılamaz." });
    }
    const summary = await committer({ companyId, items });
    await ImportJob.create({
      companyId,
      userId: req.user?.id || null,
      module: resource === "stock" ? "stock" : resource === "prices" ? "products" : resource,
      filename: `ideasoft:${resource}`,
      platform: "ideasoft",
      status: "completed",
      totalRows: items.length,
      inserted: summary.inserted,
      updated: summary.updated,
      failed: summary.failed,
      skipped: summary.skipped,
      columnMappings: { source: "ideasoft", resource },
      errorSummary: [],
      completedAt: new Date(),
    });

    await writeActivityLog({
      companyId,
      userId: req.user?.id,
      module: "erp",
      action: "IDEASOFT_SYNC",
      entityType: resource,
      meta: { resource, total: items.length, summary },
      ipAddress: req.ip,
    });

    res.json({ success: true, resource, preview: false, summary });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message, meta: error.meta || null });
  }
};