const jwt = require("jsonwebtoken");

const IDEASOFT_SETTING_KEY = "integration.ideasoft.oauth";
const IDEASOFT_GROUP = "integrations";
const DEFAULT_BASE_URL = "https://api.ideasoft.com";
const DEFAULT_AUTHORIZE_PATH = "/oauth/authorize";
const DEFAULT_TOKEN_PATH = "/oauth/token";

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");
const ensureLeadingSlash = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const toBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const normalizeList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

const getIdeaSoftConfig = (env = process.env) => {
  const baseUrl = trimSlash(env.IDEASOFT_BASE_URL || DEFAULT_BASE_URL);
  const authorizeUrl = trimSlash(env.IDEASOFT_AUTHORIZE_URL || `${baseUrl}${DEFAULT_AUTHORIZE_PATH}`);
  const tokenUrl = trimSlash(env.IDEASOFT_TOKEN_URL || `${baseUrl}${DEFAULT_TOKEN_PATH}`);

  return {
    clientId: String(env.IDEASOFT_CLIENT_ID || "").trim(),
    clientSecret: String(env.IDEASOFT_CLIENT_SECRET || "").trim(),
    callbackUrl: String(env.IDEASOFT_CALLBACK_URL || "").trim(),
    baseUrl,
    authorizeUrl,
    tokenUrl,
    scopes: normalizeList(env.IDEASOFT_SCOPES || "products customers orders invoices suppliers stock prices"),
    resourcePaths: {
      products: ensureLeadingSlash(env.IDEASOFT_PRODUCTS_PATH || "/products"),
      stock: ensureLeadingSlash(env.IDEASOFT_STOCKS_PATH || "/products/stocks"),
      prices: ensureLeadingSlash(env.IDEASOFT_PRICES_PATH || "/products/prices"),
      customers: ensureLeadingSlash(env.IDEASOFT_CUSTOMERS_PATH || "/customers"),
      orders: ensureLeadingSlash(env.IDEASOFT_ORDERS_PATH || "/orders"),
      invoices: ensureLeadingSlash(env.IDEASOFT_INVOICES_PATH || "/invoices"),
      suppliers: ensureLeadingSlash(env.IDEASOFT_SUPPLIERS_PATH || "/suppliers"),
    },
  };
};

const validateIdeaSoftConfig = (config = getIdeaSoftConfig()) => {
  const missing = [];
  if (!config.clientId) missing.push("IDEASOFT_CLIENT_ID");
  if (!config.clientSecret) missing.push("IDEASOFT_CLIENT_SECRET");
  if (!config.callbackUrl) missing.push("IDEASOFT_CALLBACK_URL");

  return {
    valid: missing.length === 0,
    missing,
  };
};

const sanitizeConfigForClient = (config = getIdeaSoftConfig()) => {
  const validation = validateIdeaSoftConfig(config);
  return {
    configured: validation.valid,
    missing: validation.missing,
    callbackUrl: config.callbackUrl,
    baseUrl: config.baseUrl,
    authorizeUrl: config.authorizeUrl,
    tokenUrl: config.tokenUrl,
    scopes: config.scopes,
    resources: Object.keys(config.resourcePaths),
  };
};

const createIdeaSoftStateToken = ({ companyId, userId }, secret = process.env.JWT_SECRET || "ideasoft_state_secret") =>
  jwt.sign({ companyId, userId, type: "ideasoft_oauth_state" }, secret, { expiresIn: "15m" });

const verifyIdeaSoftStateToken = (state, secret = process.env.JWT_SECRET || "ideasoft_state_secret") =>
  jwt.verify(state, secret);

const buildIdeaSoftAuthUrl = ({ state, scopes, config = getIdeaSoftConfig() }) => {
  const validation = validateIdeaSoftConfig(config);
  if (!validation.valid) {
    const error = new Error(`IdeaSoft environment eksik: ${validation.missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", (scopes && scopes.length ? scopes : config.scopes).join(" "));
  url.searchParams.set("state", state);
  return url.toString();
};

const normalizeApiCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const firstValue = (source, keys = [], fallback = "") => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), source);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeImageList = (item = {}) => {
  const collected = [];

  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }

    if (typeof value === "object") {
      pushValue(value.url || value.src || value.imageUrl || value.image || value.path);
      return;
    }

    const text = String(value).trim();
    if (text) {
      collected.push(text);
    }
  };

  pushValue(item.image);
  pushValue(item.imageUrl);
  pushValue(item.imageURL);
  pushValue(item.imageUrls);
  pushValue(item.images);
  pushValue(item.photos);
  pushValue(item.media);

  for (let index = 1; index <= 10; index += 1) {
    pushValue(item[`image${index}`]);
    pushValue(item[`Image${index}`]);
    pushValue(item[`resim${index}`]);
    pushValue(item[`gorsel${index}`]);
    pushValue(item[`görsel${index}`]);
  }

  return [...new Set(collected)].filter(Boolean);
};

const mapIdeaSoftProductToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "productId", "product.id"], "")).trim(),
  name: String(firstValue(item, ["name", "title", "productName"], "")).trim(),
  sku: String(firstValue(item, ["sku", "stockCode", "code"], "")).trim(),
  barcode: String(firstValue(item, ["barcode", "gtin"], "")).trim(),
  brand: String(firstValue(item, ["brand", "brandName"], "")).trim(),
  category: String(firstValue(item, ["category", "categoryName"], "")).trim(),
  purchasePrice: toNumber(firstValue(item, ["purchasePrice", "costPrice"])),
  salePrice: toNumber(firstValue(item, ["salePrice", "price", "sellingPrice"])),
  vat: toNumber(firstValue(item, ["vat", "taxRate", "vatRate"], 20), 20),
  stock: toNumber(firstValue(item, ["stock", "stockQuantity", "quantity"])),
  minStock: toNumber(firstValue(item, ["minStock", "minimumStock"])),
  image: normalizeImageList(item)[0] || String(firstValue(item, ["image", "imageUrl", "images.0.url", "images.0"], "")).trim(),
  images: normalizeImageList(item),
  active: toBool(firstValue(item, ["active", "isActive", "status"], true), true),
});

const mapLocalProductToIdeaSoft = (item = {}) => ({
  id: item.externalId || undefined,
  name: item.name,
  sku: item.sku || "",
  barcode: item.barcode || "",
  brand: item.brand || "",
  category: item.category || "",
  purchasePrice: toNumber(item.purchasePrice),
  salePrice: toNumber(item.salePrice),
  vatRate: toNumber(item.vat, 20),
  stockQuantity: toNumber(item.stock),
  minimumStock: toNumber(item.minStock),
  imageUrl: item.image || "",
  active: item.active !== false,
});

const mapIdeaSoftCustomerToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "customerId"], "")).trim(),
  companyName: String(firstValue(item, ["companyName", "name", "fullName"], "")).trim(),
  name: String(firstValue(item, ["name", "fullName", "companyName"], "")).trim(),
  email: String(firstValue(item, ["email", "emailAddress"], "")).trim().toLowerCase(),
  phone: String(firstValue(item, ["phone", "phoneNumber", "mobilePhone"], "")).trim(),
  address: String(firstValue(item, ["address", "billingAddress.address1", "address1"], "")).trim(),
  city: String(firstValue(item, ["city", "billingAddress.city"], "")).trim(),
  district: String(firstValue(item, ["district", "town", "billingAddress.town"], "")).trim(),
  taxNumber: String(firstValue(item, ["taxNumber", "taxNo", "identityNumber"], "")).trim(),
  taxOffice: String(firstValue(item, ["taxOffice", "taxOfficeName"], "")).trim(),
  contactPerson: String(firstValue(item, ["contactPerson", "authorizedPerson"], "")).trim(),
  active: toBool(firstValue(item, ["active", "isActive", "status"], true), true),
  type: "customer",
});

const mapLocalCustomerToIdeaSoft = (item = {}) => ({
  id: item.externalId || undefined,
  companyName: item.companyName || item.name || "",
  fullName: item.name || item.companyName || "",
  email: item.email || "",
  phoneNumber: item.phone || item.mobilePhone || "",
  address1: item.address || "",
  city: item.city || "",
  town: item.district || "",
  taxNo: item.taxNumber || "",
  taxOfficeName: item.taxOffice || "",
  authorizedPerson: item.contactPerson || "",
  isActive: item.active !== false,
});

const mapIdeaSoftSupplierToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "supplierId"], "")).trim(),
  code: String(firstValue(item, ["code", "supplierCode", "id"], "")).trim(),
  name: String(firstValue(item, ["name", "companyName", "supplierName"], "")).trim(),
  contactPerson: String(firstValue(item, ["contactPerson", "authorizedPerson"], "")).trim(),
  phone: String(firstValue(item, ["phone", "phoneNumber"], "")).trim(),
  email: String(firstValue(item, ["email", "emailAddress"], "")).trim().toLowerCase(),
  address: String(firstValue(item, ["address", "address1"], "")).trim(),
  taxNumber: String(firstValue(item, ["taxNumber", "taxNo"], "")).trim(),
  taxOffice: String(firstValue(item, ["taxOffice", "taxOfficeName"], "")).trim(),
  category: String(firstValue(item, ["category", "categoryName"], "")).trim(),
  notes: String(firstValue(item, ["notes", "note", "description"], "")).trim(),
  status: toBool(firstValue(item, ["active", "isActive", "status"], true), true) ? "active" : "inactive",
});

const mapLocalSupplierToIdeaSoft = (item = {}) => ({
  id: item.externalId || undefined,
  supplierCode: item.code || "",
  companyName: item.name || "",
  authorizedPerson: item.contactPerson || "",
  phoneNumber: item.phone || "",
  emailAddress: item.email || "",
  address1: item.address || "",
  taxNo: item.taxNumber || "",
  taxOfficeName: item.taxOffice || "",
  categoryName: item.category || "",
  notes: item.notes || "",
  isActive: item.status !== "inactive",
});

const mapIdeaSoftOrderToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "orderId"], "")).trim(),
  customerName: String(firstValue(item, ["customerName", "customer.fullName", "customer.companyName"], "Müşteri")).trim(),
  status: String(firstValue(item, ["status", "orderStatus"], "GELEN_SIPARISLER")).trim(),
  totalAmount: toNumber(firstValue(item, ["totalAmount", "grandTotal", "total"])),
  notes: String(firstValue(item, ["notes", "note"], "")).trim(),
  items: normalizeApiCollection(firstValue(item, ["items"], [])).map((line) => ({
    externalId: String(firstValue(line, ["id", "productId"], "")).trim(),
    sku: String(firstValue(line, ["sku", "stockCode"], "")).trim(),
    productName: String(firstValue(line, ["productName", "name"], "Ürün")).trim(),
    quantity: toNumber(firstValue(line, ["quantity", "qty"], 1), 1),
    unitPrice: toNumber(firstValue(line, ["unitPrice", "price"])),
    lineTotal: toNumber(firstValue(line, ["lineTotal", "totalPrice", "total"])),
  })),
});

const mapIdeaSoftInvoiceToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "invoiceId"], "")).trim(),
  invoiceNumber: String(firstValue(item, ["invoiceNumber", "number", "documentNumber"], "")).trim(),
  customerName: String(firstValue(item, ["customerName", "customer.fullName", "customer.companyName"], "")).trim(),
  invoiceDate: firstValue(item, ["invoiceDate", "date", "createdAt"], ""),
  dueDate: firstValue(item, ["dueDate"], ""),
  paymentStatus: String(firstValue(item, ["paymentStatus", "status"], "UNPAID")).trim(),
  grandTotal: toNumber(firstValue(item, ["grandTotal", "totalAmount", "total"])),
  taxTotal: toNumber(firstValue(item, ["taxTotal", "vatTotal"])),
});

const mapIdeaSoftStockToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "productId"], "")).trim(),
  sku: String(firstValue(item, ["sku", "stockCode"], "")).trim(),
  barcode: String(firstValue(item, ["barcode"], "")).trim(),
  stock: toNumber(firstValue(item, ["stock", "stockQuantity", "quantity"])),
  minStock: toNumber(firstValue(item, ["minStock", "minimumStock"])),
  shelf: String(firstValue(item, ["shelf", "shelfCode", "location"], "")).trim(),
});

const mapIdeaSoftPriceToLocal = (item = {}) => ({
  externalId: String(firstValue(item, ["id", "productId"], "")).trim(),
  sku: String(firstValue(item, ["sku", "stockCode"], "")).trim(),
  barcode: String(firstValue(item, ["barcode"], "")).trim(),
  salePrice: toNumber(firstValue(item, ["salePrice", "price", "sellingPrice"])),
  purchasePrice: toNumber(firstValue(item, ["purchasePrice", "costPrice"])),
  vat: toNumber(firstValue(item, ["vat", "taxRate", "vatRate"], 20), 20),
});

const RESOURCE_DEFINITIONS = {
  products: { label: "Ürünler", pathKey: "products", commitSupported: true, mapFromIdeaSoft: mapIdeaSoftProductToLocal, mapToIdeaSoft: mapLocalProductToIdeaSoft },
  stock: { label: "Stok", pathKey: "stock", commitSupported: true, mapFromIdeaSoft: mapIdeaSoftStockToLocal },
  prices: { label: "Fiyatlar", pathKey: "prices", commitSupported: true, mapFromIdeaSoft: mapIdeaSoftPriceToLocal },
  customers: { label: "Müşteriler", pathKey: "customers", commitSupported: true, mapFromIdeaSoft: mapIdeaSoftCustomerToLocal, mapToIdeaSoft: mapLocalCustomerToIdeaSoft },
  orders: { label: "Siparişler", pathKey: "orders", commitSupported: false, mapFromIdeaSoft: mapIdeaSoftOrderToLocal },
  invoices: { label: "Faturalar", pathKey: "invoices", commitSupported: false, mapFromIdeaSoft: mapIdeaSoftInvoiceToLocal },
  suppliers: { label: "Tedarikçiler", pathKey: "suppliers", commitSupported: true, mapFromIdeaSoft: mapIdeaSoftSupplierToLocal, mapToIdeaSoft: mapLocalSupplierToIdeaSoft },
};

const listIdeaSoftResources = () => Object.entries(RESOURCE_DEFINITIONS).map(([key, value]) => ({ key, ...value }));

const getResourceDefinition = (resource) => {
  const definition = RESOURCE_DEFINITIONS[resource];
  if (!definition) {
    const error = new Error(`Desteklenmeyen IdeaSoft kaynağı: ${resource}`);
    error.statusCode = 400;
    throw error;
  }
  return definition;
};

const buildIdeaSoftHeaders = ({ accessToken }) => ({
  Accept: "application/json",
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

const exchangeIdeaSoftCode = async ({ code, config = getIdeaSoftConfig(), fetchImpl = fetch }) => {
  const validation = validateIdeaSoftConfig(config);
  if (!validation.valid) {
    const error = new Error(`IdeaSoft environment eksik: ${validation.missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const response = await fetchImpl(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
    }).toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error_description || payload?.message || "IdeaSoft token alma başarısız.");
    error.statusCode = response.status;
    error.meta = payload;
    throw error;
  }
  return payload;
};

const refreshIdeaSoftAccessToken = async ({ refreshToken, config = getIdeaSoftConfig(), fetchImpl = fetch }) => {
  const response = await fetchImpl(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
    }).toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error_description || payload?.message || "IdeaSoft token yenileme başarısız.");
    error.statusCode = response.status;
    error.meta = payload;
    throw error;
  }
  return payload;
};

const fetchIdeaSoftResource = async ({ resource, accessToken, query = {}, config = getIdeaSoftConfig(), fetchImpl = fetch }) => {
  const definition = getResourceDefinition(resource);
  const path = config.resourcePaths[definition.pathKey];
  const url = new URL(`${trimSlash(config.baseUrl)}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetchImpl(url.toString(), {
    method: "GET",
    headers: buildIdeaSoftHeaders({ accessToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || `IdeaSoft ${resource} isteği başarısız.`);
    error.statusCode = response.status;
    error.meta = payload;
    throw error;
  }

  return { raw: payload, items: normalizeApiCollection(payload).map(definition.mapFromIdeaSoft), definition };
};

module.exports = {
  IDEASOFT_GROUP,
  IDEASOFT_SETTING_KEY,
  RESOURCE_DEFINITIONS,
  getIdeaSoftConfig,
  validateIdeaSoftConfig,
  sanitizeConfigForClient,
  createIdeaSoftStateToken,
  verifyIdeaSoftStateToken,
  buildIdeaSoftAuthUrl,
  exchangeIdeaSoftCode,
  refreshIdeaSoftAccessToken,
  fetchIdeaSoftResource,
  getResourceDefinition,
  listIdeaSoftResources,
  mapIdeaSoftProductToLocal,
  mapLocalProductToIdeaSoft,
  mapIdeaSoftCustomerToLocal,
  mapLocalCustomerToIdeaSoft,
  mapIdeaSoftSupplierToLocal,
  mapLocalSupplierToIdeaSoft,
  mapIdeaSoftOrderToLocal,
  mapIdeaSoftInvoiceToLocal,
  mapIdeaSoftStockToLocal,
  mapIdeaSoftPriceToLocal,
};