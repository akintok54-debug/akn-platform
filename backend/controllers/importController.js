const XLSX = require("xlsx");
const crypto = require("crypto");
const Product = require("../models/Product");
const Customer = require("../models/customer");
const AccountTransaction = require("../models/AccountTransaction");
const StockMovement = require("../models/StockMovement");
const ImportJob = require("../models/ImportJob");
const { processImageUrls } = require("../services/imageService");
const { normalizeCustomerPayload } = require("../utils/customerUtils");

const MAX_ROWS = 5000;

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

// ─── Fiyat Normalizer (TR: 1.250,50 / EN: 1,250.50 / düz: 1250.50) ─────────
const normalizePrice = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return value;
  const str = String(value).trim().replace(/[₺$€£\s]/g, "");
  // TR formatı: hem nokta hem virgül varsa ve virgül sondaysa
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, "").replace(",", "."));
  }
  // EN formatı: hem virgül hem nokta varsa ve nokta sondaysa
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    return parseFloat(str.replace(/,/g, ""));
  }
  // Sadece virgül (TR ondalık)
  if (/^\d+,\d+$/.test(str)) return parseFloat(str.replace(",", "."));
  return parseFloat(str);
};

const normalizeKdv = (value) => {
  const str = String(value || "").trim().replace("%", "");
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : 20;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => String(value || "").trim();

const generateDealerPortalToken = () => crypto.randomBytes(20).toString("hex");

// ─── Resim URL'lerini ayıkla ───────────────────────────────────────────────
const extractImageUrls = (value) => {
  if (!value) return [];
  const raw = String(value).trim();
  return raw
    .split(/[,;|\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/.+/i.test(s));
};

// ─── Genişletilmiş alias tablosu ──────────────────────────────────────────
const PRODUCT_ALIASES = {
  name: [
    "name", "urunAdi", "productName", "title", "baslik", "ürün adı", "ürün başlığı",
    "product title", "urun_adi", "urunadi", "isim", "ad",
    // Trendyol
    "product main title", "title",
    // Hepsiburada
    "product name", "ürün ismi",
    // N11
    "ürün başlığı", "n11 urun basligi",
    // WooCommerce
    "Name",
    // Shopify
    "Title",
    // İkas
    "Ürün Adı",
  ],
  sku: [
    "sku", "urunKodu", "productCode", "stockCode", "stokKodu",
    "ürün kodu", "stok kodu", "urun_kodu", "product code", "stock code",
    "model", "model kodu", "modelin", "item number",
    // Trendyol
    "Product Main Id", "Ürün Ana Id",
    // Hepsiburada
    "HepsiburadaSku", "Satıcı SKU", "Satici Sku",
    // N11
    "n11 ürün kodu", "satici urun kodu",
    // WooCommerce
    "SKU",
    // Shopify
    "Variant SKU",
    // İkas
    "Stok Kodu",
  ],
  barcode: [
    "barcode", "barkod", "ean", "gtin", "upc", "isbn",
    "ürün barkodu", "barkod numarası", "barkod no",
    // Trendyol
    "Barcode",
    // Hepsiburada
    "Barkod",
    // N11
    "barkod", "barkod kodu",
    // WooCommerce
    "barcode",
    // Shopify
    "Variant Barcode",
    // İkas
    "Barkod",
  ],
  brand: [
    "brand", "marka", "brandName", "marka adi", "markaadi",
    // Trendyol
    "Brand",
    // Hepsiburada
    "Marka",
    // N11
    "marka", "üretici marka",
    // Shopify
    "Vendor",
    // İkas
    "Marka",
  ],
  category: [
    "category", "kategori", "categoryName", "kategoriAdi", "category path",
    "kategori yolu", "ana kategori", "alt kategori",
    // Trendyol
    "Category", "Kategori",
    // Hepsiburada
    "Kategori", "Alt Kategori",
    // N11
    "kategori",
    // WooCommerce
    "Categories",
    // Shopify
    "Type",
    // İkas
    "Kategori",
  ],
  purchasePrice: [
    "purchasePrice", "alisFiyati", "maliyet", "alisfiyati", "alis fiyati",
    "buying price", "cost", "cost price", "purchase price", "alım fiyatı",
    "tedarik fiyatı",
  ],
  salePrice: [
    "salePrice", "satisFiyati", "fiyat", "price", "satış fiyatı", "satis fiyati",
    "liste fiyatı", "liste fiyat", "sale price", "selling price",
    // Trendyol
    "Sale Price", "Satış Fiyatı",
    // Hepsiburada
    "Fiyat", "Satış Fiyatı",
    // N11
    "fiyat", "satış fiyatı",
    // WooCommerce
    "Regular price", "Sale price",
    // Shopify
    "Variant Price",
    // İkas
    "Satış Fiyatı",
  ],
  vat: [
    "vat", "kdv", "kdvOrani", "tax", "taxRate", "kdv oranı", "vergi",
    "kdv %", "kdv(%)", "vat rate",
    // Trendyol
    "Vat", "KDV",
    // İkas
    "KDV Oranı",
  ],
  stock: [
    "stock", "stok", "quantity", "miktar", "adet", "stok adedi", "stok miktarı",
    "envanter", "inventory",
    // Trendyol
    "Quantity", "Stok",
    // Hepsiburada
    "Stok Adedi",
    // WooCommerce
    "Stock",
    // Shopify
    "Variant Inventory Qty",
    // İkas
    "Stok",
  ],
  minStock: [
    "minStock", "minStok", "minimumStok", "min stock", "min stok",
    "minimum stok", "kritik stok",
  ],
  shelf: [
    "shelf", "raf", "rafKodu", "rafNo", "shelf code", "location", "depo konumu",
  ],
  description: [
    "description", "aciklama", "açıklama", "tanim", "tanım", "desc",
    "product description", "ürün açıklaması", "detay",
    // Trendyol
    "Description",
    // WooCommerce
    "Description",
    // Shopify
    "Body (HTML)",
    // İkas
    "Açıklama",
  ],
  image: [
    "image", "resim", "gorsel", "görsel", "foto", "fotoğraf", "photo",
    "image url", "image1", "resim1", "gorsel1", "görsel1",
    "images", "image urls", "product image", "photo url",
    // Trendyol
    "Image1", "Image2",
    // Hepsiburada
    "Görsel URL",
    // Shopify
    "Image Src",
    // WooCommerce
    "Images",
    // İkas
    "Ürün Görseli",
  ],
};

// Ek resim kolonları (image2-image5)
for (let i = 2; i <= 5; i++) {
  PRODUCT_ALIASES.image.push(`image${i}`, `resim${i}`, `gorsel${i}`, `görsel${i}`, `Image${i}`);
}

// ─── Platform otomatik tespiti ────────────────────────────────────────────
const detectPlatform = (headers) => {
  const hs = headers.map((h) => String(h).toLowerCase());
  if (hs.some((h) => h.includes("product main id") || h.includes("hepsiburadaid"))) return "Trendyol";
  if (hs.some((h) => h.includes("hepsiburadaSku") || h.includes("hepsiburadaskuid"))) return "Hepsiburada";
  if (hs.some((h) => h.includes("n11"))) return "N11";
  if (hs.some((h) => h === "handle" || h === "variant sku" || h === "vendor")) return "Shopify";
  if (hs.some((h) => h === "type" && hs.includes("sku") && hs.includes("published"))) return "WooCommerce";
  if (hs.some((h) => h.includes("ikas"))) return "İkas";
  return null;
};

// ─── Kolon eşleştirme analizi ─────────────────────────────────────────────
const analyzeColumns = (headers) => {
  const mappings = {};
  const unmapped = [];
  const platform = detectPlatform(headers);

  for (const header of headers) {
    let matched = false;
    const hLower = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(PRODUCT_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === hLower || a.toLowerCase() === header.toLowerCase())) {
        if (!mappings[field]) mappings[field] = header;
        matched = true;
        break;
      }
    }

    if (!matched) unmapped.push(header);
  }

  return { platform: platform || "Bilinmiyor", mappings, unmapped };
};

// ─── mapGet (alias listesinden değer oku) ────────────────────────────────
const mapGet = (row, aliases) => {
  // Önce tam eşleşme dene
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  // Büyük/küçük harf duyarsız deneme
  const rowKeys = Object.keys(row);
  for (const key of aliases) {
    const kl = key.toLowerCase();
    const found = rowKeys.find((rk) => rk.toLowerCase() === kl);
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") {
      return row[found];
    }
  }
  return "";
};

const isDebitType = (type) => ["BORC", "INVOICE", "ORDER"].includes(type);
const isCreditType = (type) => ["ALACAK", "COLLECTION", "PAYMENT", "RETURN"].includes(type);

const normalizeTxType = (value) => {
  const raw = normalizeText(value).toUpperCase();
  const map = {
    TAHSILAT: "COLLECTION",
    ODEME: "PAYMENT",
    FATURA: "INVOICE",
    SIPARIS: "ORDER",
    IADE: "RETURN",
  };
  return map[raw] || raw;
};

const normalizeMovementType = (value) => {
  const raw = normalizeText(value).toUpperCase();
  const map = {
    GIRIS: "IN",
    CIKIS: "OUT",
    ARTIS: "IN",
    AZALIS: "OUT",
    SET: "SET",
    STOK_GIRIS: "IN",
    STOK_CIKIS: "OUT",
  };
  return map[raw] || raw;
};

const TEMPLATE_DEFINITIONS = {
  products: [
    { header: "name", sample: "Debriyaj Balatasi" },
    { header: "sku", sample: "SKU-001" },
    { header: "barcode", sample: "869000000001" },
    { header: "brand", sample: "AKN" },
    { header: "category", sample: "Aksam" },
    { header: "purchasePrice", sample: 100 },
    { header: "salePrice", sample: 150 },
    { header: "vat", sample: 20 },
    { header: "stock", sample: 50 },
    { header: "minStock", sample: 10 },
    { header: "shelf", sample: "A-12" },
    { header: "active", sample: true },
  ],
  customers: [
    { header: "customerCode", sample: "CR-1001" },
    { header: "companyName", sample: "Ornek Ticaret" },
    { header: "type", sample: "customer" },
    { header: "phone", sample: "02120000000" },
    { header: "mobilePhone", sample: "05550000000" },
    { header: "email", sample: "ornek@firma.com" },
    { header: "taxOffice", sample: "Kadikoy" },
    { header: "taxNumber", sample: "1234567890" },
    { header: "address", sample: "Ornek Mahallesi" },
    { header: "city", sample: "Istanbul" },
    { header: "district", sample: "Kadikoy" },
    { header: "contactPerson", sample: "Ahmet Yilmaz" },
    { header: "balance", sample: 0 },
    { header: "riskLimit", sample: 10000 },
    { header: "discountRate", sample: 5 },
    { header: "customerCategory", sample: "retail" },
    { header: "active", sample: true },
    { header: "note", sample: "Toplu import" },
  ],
  transactions: [
    { header: "customerCode", sample: "CR-1001" },
    { header: "customerEmail", sample: "ornek@firma.com" },
    { header: "type", sample: "INVOICE" },
    { header: "amount", sample: 750 },
    { header: "description", sample: "Toplu cari hareket" },
    { header: "date", sample: "2026-08-07" },
  ],
  stock: [
    { header: "sku", sample: "SKU-001" },
    { header: "barcode", sample: "869000000001" },
    { header: "productName", sample: "Debriyaj Balatasi" },
    { header: "movementType", sample: "SET" },
    { header: "quantity", sample: 120 },
    { header: "description", sample: "Sayim duzeltmesi" },
    { header: "date", sample: "2026-08-07" },
  ],
};

const validateRowsCount = (rows) => {
  if (!Array.isArray(rows)) {
    return "rows alani dizi olmalidir.";
  }
  if (!rows.length) {
    return "En az bir satir gereklidir.";
  }
  if (rows.length > MAX_ROWS) {
    return `Tek seferde en fazla ${MAX_ROWS} satir import edebilirsiniz.`;
  }
  return "";
};

const validateProducts = async (rows) => {
  const validRows = [];
  const errorRows = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors = [];

    const name = normalizeText(mapGet(row, PRODUCT_ALIASES.name));
    const sku = normalizeText(mapGet(row, PRODUCT_ALIASES.sku));
    const barcode = normalizeText(mapGet(row, PRODUCT_ALIASES.barcode));
    const rawPurchasePrice = mapGet(row, PRODUCT_ALIASES.purchasePrice);
    const rawSalePrice = mapGet(row, PRODUCT_ALIASES.salePrice);
    const rawStock = mapGet(row, PRODUCT_ALIASES.stock);
    const purchasePrice = normalizePrice(rawPurchasePrice);
    const salePrice = normalizePrice(rawSalePrice);
    const stock = rawStock !== "" ? toNumber(rawStock, NaN) : 0;

    // Resim URL'lerini tüm resim kolonlarından topla
    const imageUrls = [];
    for (const key of Object.keys(row)) {
      const kl = key.toLowerCase().trim();
      if (PRODUCT_ALIASES.image.some((a) => a.toLowerCase() === kl)) {
        extractImageUrls(row[key]).forEach((u) => { if (!imageUrls.includes(u)) imageUrls.push(u); });
      }
    }

    if (!name) errors.push("Ürün adı (name) zorunludur.");
    if (rawSalePrice !== "" && Number.isNaN(salePrice)) errors.push("Satış fiyatı sayısal olmalı.");
    if (rawPurchasePrice !== "" && Number.isNaN(purchasePrice)) errors.push("Alış fiyatı sayısal olmalı.");
    if (Number.isNaN(stock)) errors.push("Stok sayısal olmalı.");

    const normalized = {
      name,
      sku,
      barcode,
      brand: normalizeText(mapGet(row, PRODUCT_ALIASES.brand)),
      category: normalizeText(mapGet(row, PRODUCT_ALIASES.category)),
      purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
      salePrice: Number.isFinite(salePrice) ? salePrice : 0,
      vat: normalizeKdv(mapGet(row, PRODUCT_ALIASES.vat)),
      stock: Number.isNaN(stock) ? 0 : stock,
      minStock: toNumber(mapGet(row, PRODUCT_ALIASES.minStock), 0),
      shelf: normalizeText(mapGet(row, PRODUCT_ALIASES.shelf)),
      description: normalizeText(mapGet(row, PRODUCT_ALIASES.description)),
      image: imageUrls[0] || "",
      active: String(mapGet(row, ["active", "aktif"]) || "true").toLowerCase() !== "false",
      _imageUrls: imageUrls,
    };

    if (errors.length) {
      errorRows.push({ rowNumber, errors, raw: row });
    } else {
      validRows.push({ rowNumber, normalized, raw: row });
    }
  });

  return { validRows, errorRows };
};

const validateCustomers = async (rows) => {
  const validRows = [];
  const errorRows = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors = [];

    const customerCode = normalizeText(mapGet(row, ["customerCode", "cariKod", "code"]));
    const companyName = normalizeText(mapGet(row, ["companyName", "name", "cariAdi"]));
    const email = normalizeText(mapGet(row, ["email", "eposta"])).toLowerCase();

    if (!companyName) errors.push("companyName zorunludur.");
    if (!customerCode && !email) errors.push("customerCode veya email zorunludur.");

    const normalized = normalizeCustomerPayload({
      customerCode,
      companyName,
      name: companyName,
      type: normalizeText(mapGet(row, ["type", "tur"])) || "customer",
      phone: normalizeText(mapGet(row, ["phone", "telefon"])),
      mobilePhone: normalizeText(mapGet(row, ["mobilePhone", "cep"])),
      email,
      taxOffice: normalizeText(mapGet(row, ["taxOffice", "vergiDairesi"])),
      taxNumber: normalizeText(mapGet(row, ["taxNumber", "vergiNo"])),
      address: normalizeText(mapGet(row, ["address", "adres"])),
      city: normalizeText(mapGet(row, ["city", "il"])),
      district: normalizeText(mapGet(row, ["district", "ilce"])),
      contactPerson: normalizeText(mapGet(row, ["contactPerson", "yetkili"])),
      balance: toNumber(mapGet(row, ["balance", "bakiye"]), 0),
      riskLimit: toNumber(mapGet(row, ["riskLimit", "riskLimiti"]), 0),
      discountRate: toNumber(mapGet(row, ["discountRate", "iskonto"]), 0),
      customerCategory: normalizeText(mapGet(row, ["customerCategory", "kategori"])) || "retail",
      active: String(mapGet(row, ["active", "aktif"]) || "true").toLowerCase() !== "false",
      note: normalizeText(mapGet(row, ["note", "not"])),
    });

    if (errors.length) {
      errorRows.push({ rowNumber, errors, raw: row });
    } else {
      validRows.push({ rowNumber, normalized, raw: row });
    }
  });

  return { validRows, errorRows };
};

const validateTransactions = async (rows, companyId) => {
  const validRows = [];
  const errorRows = [];

  const codes = new Set();
  const emails = new Set();
  rows.forEach((row) => {
    const customerCode = normalizeText(mapGet(row, ["customerCode", "cariKod"]));
    const customerEmail = normalizeText(mapGet(row, ["customerEmail", "email", "eposta"])).toLowerCase();
    if (customerCode) codes.add(customerCode);
    if (customerEmail) emails.add(customerEmail);
  });

  const customers = await Customer.find({
    company: companyId,
    $or: [
      { customerCode: { $in: Array.from(codes) } },
      { email: { $in: Array.from(emails) } },
    ],
  }).lean();

  const codeMap = new Map();
  const emailMap = new Map();
  customers.forEach((c) => {
    if (c.customerCode) codeMap.set(c.customerCode, c);
    if (c.email) emailMap.set(String(c.email).toLowerCase(), c);
  });

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors = [];

    const customerCode = normalizeText(mapGet(row, ["customerCode", "cariKod"]));
    const customerEmail = normalizeText(mapGet(row, ["customerEmail", "email", "eposta"])).toLowerCase();
    const rawType = normalizeTxType(mapGet(row, ["type", "islemTipi"]));
    const amount = toNumber(mapGet(row, ["amount", "tutar"]), NaN);

    if (!customerCode && !customerEmail) errors.push("customerCode veya customerEmail zorunludur.");
    if (Number.isNaN(amount) || amount <= 0) errors.push("amount sifirdan buyuk sayi olmali.");
    if (!rawType) errors.push("type zorunludur.");

    const customer = customerCode ? codeMap.get(customerCode) : emailMap.get(customerEmail);
    if (!customer) errors.push("Musteri bulunamadi.");

    const normalizedType = rawType;
    if (!["BORC", "ALACAK", "INVOICE", "ORDER", "COLLECTION", "PAYMENT", "RETURN"].includes(normalizedType)) {
      errors.push("type gecersiz.");
    }

    const normalized = {
      customer,
      customerCode,
      customerEmail,
      type: normalizedType,
      amount: Number.isNaN(amount) ? 0 : amount,
      description: normalizeText(mapGet(row, ["description", "aciklama"])),
      date: mapGet(row, ["date", "tarih"]) ? new Date(mapGet(row, ["date", "tarih"])) : new Date(),
    };

    if (errors.length) {
      errorRows.push({ rowNumber, errors, raw: row });
    } else {
      validRows.push({ rowNumber, normalized, raw: row });
    }
  });

  return { validRows, errorRows };
};

const validateStock = async (rows, companyId) => {
  const validRows = [];
  const errorRows = [];

  const skus = new Set();
  const barcodes = new Set();
  const names = new Set();

  rows.forEach((row) => {
    const sku = normalizeText(mapGet(row, ["sku", "urunKodu"]));
    const barcode = normalizeText(mapGet(row, ["barcode", "barkod"]));
    const productName = normalizeText(mapGet(row, ["productName", "name", "urunAdi"]));
    if (sku) skus.add(sku);
    if (barcode) barcodes.add(barcode);
    if (productName) names.add(productName);
  });

  const products = await Product.find({
    company: companyId,
    $or: [
      { sku: { $in: Array.from(skus) } },
      { barcode: { $in: Array.from(barcodes) } },
      { name: { $in: Array.from(names) } },
    ],
  }).lean();

  const skuMap = new Map();
  const barcodeMap = new Map();
  const nameMap = new Map();
  products.forEach((p) => {
    if (p.sku) skuMap.set(p.sku, p);
    if (p.barcode) barcodeMap.set(p.barcode, p);
    if (p.name) nameMap.set(p.name, p);
  });

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors = [];

    const sku = normalizeText(mapGet(row, ["sku", "urunKodu"]));
    const barcode = normalizeText(mapGet(row, ["barcode", "barkod"]));
    const productName = normalizeText(mapGet(row, ["productName", "name", "urunAdi"]));
    const movementType = normalizeMovementType(mapGet(row, ["movementType", "islemTipi"]));
    const quantity = toNumber(mapGet(row, ["quantity", "miktar"]), NaN);

    if (!sku && !barcode && !productName) errors.push("sku/barcode/productName zorunludur.");
    if (!["SET", "IN", "OUT"].includes(movementType)) errors.push("movementType SET|IN|OUT olmali.");
    if (Number.isNaN(quantity) || quantity < 0) errors.push("quantity sifir veya pozitif sayi olmali.");

    const product = sku ? skuMap.get(sku) : barcode ? barcodeMap.get(barcode) : nameMap.get(productName);
    if (!product) errors.push("Urun bulunamadi.");
    if (product && movementType === "OUT" && Number(product.stock || 0) < quantity) {
      errors.push("Stok cikisi icin yeterli stok yok.");
    }

    const normalized = {
      product,
      movementType,
      quantity: Number.isNaN(quantity) ? 0 : quantity,
      description: normalizeText(mapGet(row, ["description", "aciklama"])),
      date: mapGet(row, ["date", "tarih"]) ? new Date(mapGet(row, ["date", "tarih"])) : new Date(),
    };

    if (errors.length) {
      errorRows.push({ rowNumber, errors, raw: row });
    } else {
      validRows.push({ rowNumber, normalized, raw: row });
    }
  });

  return { validRows, errorRows };
};

const validateByModule = async ({ moduleName, rows, companyId }) => {
  if (moduleName === "products") return validateProducts(rows);
  if (moduleName === "customers") return validateCustomers(rows);
  if (moduleName === "transactions") return validateTransactions(rows, companyId);
  if (moduleName === "stock") return validateStock(rows, companyId);
  return { validRows: [], errorRows: rows.map((raw, i) => ({ rowNumber: i + 2, errors: ["Gecersiz modul"], raw })) };
};

const commitProducts = async ({ validRows, companyId }) => {
  let imagesFound = 0;
  let imageErrors = 0;
  const imageLog = [];

  // Resim işleme: her satır için paralel URL kontrolü + Cloudinary upload
  const processedRows = await Promise.all(
    validRows.map(async (item) => {
      const { _imageUrls, ...rowData } = item.normalized;
      if (!_imageUrls || _imageUrls.length === 0) return { rowData, item };

      imagesFound++;
      const results = await processImageUrls(_imageUrls);
      const successful = results.filter((r) => r.ok).map((r) => r.url);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        imageErrors += failed.length;
        imageLog.push({
          rowNumber: item.rowNumber,
          name: rowData.name,
          failedUrls: failed.map((f) => `${f.url}: ${f.reason}`),
        });
      }

      rowData.image = successful[0] || rowData.image || "";
      rowData.images = successful;

      return { rowData, item };
    })
  );

  // Duplicate kontrolü: barkod → sku → ürün adı sırasıyla
  const operations = processedRows.map(({ rowData }) => {
    const filter = rowData.barcode
      ? { company: companyId, barcode: rowData.barcode }
      : rowData.sku
      ? { company: companyId, sku: rowData.sku }
      : { company: companyId, name: rowData.name };

    // Mevcut görselleri silme: sadece yeni görseller varsa güncelle
    const updateFields = { ...rowData, company: companyId };
    if (!rowData.image) delete updateFields.image;
    if (!rowData.images || rowData.images.length === 0) delete updateFields.images;

    return {
      updateOne: {
        filter,
        update: { $set: updateFields },
        upsert: true,
      },
    };
  });

  const result = await Product.bulkWrite(operations, { ordered: false });
  return {
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    imagesFound,
    imageErrors,
    imageLog,
  };
};

const commitCustomers = async ({ validRows, companyId }) => {
  const operations = validRows.map((item, idx) => {
    const row = item.normalized;
    const customerCode = row.customerCode || `CR-IMP-${Date.now()}-${idx}`;

    const filter = row.customerCode
      ? { company: companyId, customerCode: row.customerCode }
      : row.email
      ? { company: companyId, email: row.email }
      : { company: companyId, companyName: row.companyName, phone: row.phone || "" };

    return {
      updateOne: {
        filter,
        update: {
          $set: {
            ...row,
            customerCode,
            company: companyId,
          },
          $setOnInsert: {
            dealerPortalToken: generateDealerPortalToken(),
            dealerPortalEnabled: true,
            dealerPortalTokenUpdatedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Customer.bulkWrite(operations, { ordered: false });
  return {
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  };
};

const commitTransactions = async ({ validRows, companyId }) => {
  const accountDocs = [];
  const customerTxMap = new Map();

  validRows.forEach((item) => {
    const row = item.normalized;
    const customer = row.customer;
    const accountType = isCreditType(row.type) ? "ALACAK" : "BORC";

    accountDocs.push({
      companyId,
      customerId: customer._id,
      type: accountType,
      amount: row.amount,
      description: row.description || `Toplu import ${row.type}`,
      createdAt: row.date,
      updatedAt: row.date,
    });

    const effect = isDebitType(row.type) ? row.amount : -row.amount;
    const txLine = {
      type: row.type,
      amount: row.amount,
      description: row.description || `Toplu import ${row.type}`,
      date: row.date,
    };

    const key = String(customer._id);
    if (!customerTxMap.has(key)) {
      customerTxMap.set(key, { customerId: customer._id, balanceDelta: 0, lines: [] });
    }

    const bucket = customerTxMap.get(key);
    bucket.balanceDelta += effect;
    bucket.lines.push(txLine);
  });

  if (accountDocs.length) {
    await AccountTransaction.insertMany(accountDocs, { ordered: false });
  }

  const customerOps = Array.from(customerTxMap.values()).map((bucket) => ({
    updateOne: {
      filter: { _id: bucket.customerId, company: companyId },
      update: {
        $inc: { balance: Number(bucket.balanceDelta.toFixed(2)) },
        $push: { transactions: { $each: bucket.lines } },
      },
    },
  }));

  if (customerOps.length) {
    await Customer.bulkWrite(customerOps, { ordered: false });
  }

  return {
    inserted: accountDocs.length,
    updated: customerOps.length,
  };
};

const commitStock = async ({ validRows, companyId, userId }) => {
  const stockMap = new Map();
  validRows.forEach((item) => {
    const p = item.normalized.product;
    if (!stockMap.has(String(p._id))) {
      stockMap.set(String(p._id), Number(p.stock || 0));
    }
  });

  const productOps = [];
  const movementDocs = [];

  validRows.forEach((item) => {
    const row = item.normalized;
    const productId = String(row.product._id);
    const current = stockMap.get(productId) || 0;

    let newStock = current;
    let movement = "SAYIM";

    if (row.movementType === "SET") {
      newStock = row.quantity;
      movement = "SAYIM";
      productOps.push({
        updateOne: {
          filter: { _id: row.product._id, company: companyId },
          update: { $set: { stock: newStock } },
        },
      });
    } else if (row.movementType === "IN") {
      newStock = current + row.quantity;
      movement = "STOK_GIRIS";
      productOps.push({
        updateOne: {
          filter: { _id: row.product._id, company: companyId },
          update: { $inc: { stock: row.quantity } },
        },
      });
    } else {
      newStock = current - row.quantity;
      movement = "STOK_CIKIS";
      productOps.push({
        updateOne: {
          filter: { _id: row.product._id, company: companyId },
          update: { $inc: { stock: -row.quantity } },
        },
      });
    }

    stockMap.set(productId, newStock);

    movementDocs.push({
      companyId,
      productId: row.product._id,
      movementType: movement,
      quantity: row.quantity,
      previousStock: current,
      newStock,
      description: row.description || `Toplu stok import (${row.movementType})`,
      createdBy: userId || null,
      movementDate: row.date,
    });
  });

  if (productOps.length) {
    await Product.bulkWrite(productOps, { ordered: false });
  }
  if (movementDocs.length) {
    await StockMovement.insertMany(movementDocs, { ordered: false });
  }

  return {
    inserted: movementDocs.length,
    updated: productOps.length,
  };
};

const commitByModule = async ({ moduleName, validRows, companyId, userId }) => {
  if (moduleName === "products") return commitProducts({ validRows, companyId });
  if (moduleName === "customers") return commitCustomers({ validRows, companyId });
  if (moduleName === "transactions") return commitTransactions({ validRows, companyId });
  if (moduleName === "stock") return commitStock({ validRows, companyId, userId });
  return { inserted: 0, updated: 0 };
};

exports.downloadTemplate = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const columns = TEMPLATE_DEFINITIONS[moduleName];
    if (!columns) {
      return res.status(400).json({ success: false, message: "Gecersiz import modulu." });
    }

    const worksheet = XLSX.utils.json_to_sheet([Object.fromEntries(columns.map((c) => [c.header, c.sample]))]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${moduleName}-import-template.xlsx`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateImport = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    if (!TEMPLATE_DEFINITIONS[moduleName]) {
      return res.status(400).json({ success: false, message: "Gecersiz import modulu." });
    }

    const rows = req.body?.rows;
    const rowsError = validateRowsCount(rows);
    if (rowsError) {
      return res.status(400).json({ success: false, message: rowsError });
    }

    const { validRows, errorRows } = await validateByModule({ moduleName, rows, companyId });

    return res.status(200).json({
      success: true,
      module: moduleName,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        failedRows: errorRows.length,
      },
      errorRows,
      preview: validRows.slice(0, 20).map((item) => ({ rowNumber: item.rowNumber, normalized: item.normalized })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.commitImport = async (req, res) => {
  const startedAt = new Date();
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const companyId = getCompanyId(req);
    const filename = req.body?.filename || "";

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    if (!TEMPLATE_DEFINITIONS[moduleName]) {
      return res.status(400).json({ success: false, message: "Gecersiz import modulu." });
    }

    const rows = req.body?.rows;
    const rowsError = validateRowsCount(rows);
    if (rowsError) {
      return res.status(400).json({ success: false, message: rowsError });
    }

    const { validRows, errorRows } = await validateByModule({ moduleName, rows, companyId });
    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: "Kaydedilebilir satir bulunamadi.",
        summary: { totalRows: rows.length, validRows: 0, failedRows: errorRows.length },
        errorRows,
      });
    }

    const result = await commitByModule({
      moduleName,
      validRows,
      companyId,
      userId: req.user?.id || null,
    });

    // ImportJob kaydı
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const { platform, mappings } = analyzeColumns(headers);
    await ImportJob.create({
      companyId,
      userId: req.user?.id || null,
      module: moduleName,
      filename,
      platform,
      status: errorRows.length > 0 ? "partial" : "completed",
      totalRows: rows.length,
      inserted: result.inserted || 0,
      updated: result.updated || 0,
      failed: errorRows.length,
      imagesFound: result.imagesFound || 0,
      columnMappings: mappings,
      errorSummary: [
        ...errorRows.slice(0, 50).map((e) => ({ rowNumber: e.rowNumber, errors: e.errors })),
        ...(result.imageLog || []).map((e) => ({ rowNumber: e.rowNumber, errors: e.failedUrls, type: "image" })),
      ],
      startedAt,
      completedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      module: moduleName,
      platform,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        failedRows: errorRows.length,
        inserted: result.inserted,
        updated: result.updated,
        imagesFound: result.imagesFound || 0,
        imageErrors: result.imageErrors || 0,
      },
      errorRows,
      imageLog: result.imageLog || [],
      message: "Import islemi tamamlandi.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Kolon analizi endpoint'i ─────────────────────────────────────────────
exports.analyzeImport = async (req, res) => {
  try {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "rows dizisi zorunludur." });
    }

    const headers = Object.keys(rows[0]);
    const { platform, mappings, unmapped } = analyzeColumns(headers);

    const samplePrices = [];
    rows.slice(0, 5).forEach((row) => {
      const sp = mapGet(row, PRODUCT_ALIASES.salePrice);
      if (sp) samplePrices.push({ raw: sp, parsed: normalizePrice(sp) });
    });

    const imageColsFound = headers.filter((h) =>
      PRODUCT_ALIASES.image.some((a) => a.toLowerCase() === h.toLowerCase().trim())
    );

    return res.status(200).json({
      success: true,
      platform,
      totalColumns: headers.length,
      mappings,
      unmapped,
      imageColumns: imageColsFound,
      samplePrices,
      totalRows: rows.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ImportJob geçmişi endpoint'i ─────────────────────────────────────────
exports.getImportJobs = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: "Sirket bulunamadi." });

    const jobs = await ImportJob.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
