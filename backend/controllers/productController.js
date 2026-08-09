const Product = require("../models/Product");

const getCompanyId = (req) => req.user?.company || req.user?.companyId || null;

// Satış temsilcisine gizlenecek maliyet alanları
const COST_FIELDS = ['purchasePrice', 'oemCode'];

const stripCostFields = (product) => {
  const p = { ...product };
  COST_FIELDS.forEach((f) => delete p[f]);
  return p;
};

const isSalesRole = (req) => req.user?.role === 'sales';

// Yeni ürün oluştur
const createProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const product = await Product.create({
      ...req.body,
      company: companyId,
    });

    res.status(201).json({
      success: true,
      message: "Ürün başarıyla oluşturuldu.",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Tüm ürünleri getir
const getProducts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = companyId ? { company: companyId } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const data = isSalesRole(req) ? products.map(stripCostFields) : products;

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ID'ye göre ürün getir
const getProductById = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = { _id: req.params.id, ...(companyId ? { company: companyId } : {}) };
    const product = await Product.findOne(filter).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = { _id: req.params.id, ...(companyId ? { company: companyId } : {}) };

    const product = await Product.findOneAndUpdate(
      filter,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı." });
    }

    res.status(200).json({ success: true, message: "Ürün güncellendi.", data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = { _id: req.params.id, ...(companyId ? { company: companyId } : {}) };
    const deleted = await Product.findOneAndDelete(filter).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı." });
    }

    res.status(200).json({ success: true, message: "Ürün silindi." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ÜRÜN MERKEZİ ÖZELLİKLERİ ───────────────────────────────────────────

// Filtreli ürün listesi (kategori, marka, stok, aktif/pasif)
const getProductsWithFilters = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { category, brand, minStock, maxStock, active, search, sortBy } = req.query;
    
    const filter = companyId ? { company: companyId } : {};
    
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (active !== undefined) filter.active = active === "true";
    if (minStock !== undefined || maxStock !== undefined) {
      filter.stock = {};
      if (minStock !== undefined) filter.stock.$gte = parseInt(minStock);
      if (maxStock !== undefined) filter.stock.$lte = parseInt(maxStock);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } }
      ];
    }
    
    let query = Product.find(filter);
    if (sortBy === "name") query = query.sort({ name: 1 });
    else if (sortBy === "price_asc") query = query.sort({ salePrice: 1 });
    else if (sortBy === "price_desc") query = query.sort({ salePrice: -1 });
    else if (sortBy === "stock_asc") query = query.sort({ stock: 1 });
    else if (sortBy === "stock_desc") query = query.sort({ stock: -1 });
    else query = query.sort({ createdAt: -1 });
    
    const products = await query.lean();
    const data = isSalesRole(req) ? products.map(stripCostFields) : products;
    
    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mevcut kategoriler listesi
const getCategories = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = companyId ? { company: companyId } : {};
    
    const categories = await Product.distinct("category", { ...filter, category: { $ne: "" } });
    res.status(200).json({ success: true, data: categories.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mevcut markalar listesi
const getBrands = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = companyId ? { company: companyId } : {};
    
    const brands = await Product.distinct("brand", { ...filter, brand: { $ne: "" } });
    res.status(200).json({ success: true, data: brands.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toplu fiyat güncelle
const bulkUpdatePrices = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Yalnızca yöneticiler toplu fiyat güncelleyebilir." });
    }
    
    const companyId = getCompanyId(req);
    const { productIds, salePrice, purchasePrice } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "Ürün listesi gerekli." });
    }
    
    const updateData = {};
    if (salePrice !== undefined) updateData.salePrice = salePrice;
    if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice;
    
    const filter = { 
      _id: { $in: productIds },
      ...(companyId ? { company: companyId } : {})
    };
    
    const result = await Product.updateMany(filter, { $set: updateData });
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} ürün fiyatı güncellendi.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toplu stok güncelle
const bulkUpdateStock = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { productIds, stock, operation } = req.body; // operation: "set", "add", "subtract"
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "Ürün listesi gerekli." });
    }
    
    const filter = { 
      _id: { $in: productIds },
      ...(companyId ? { company: companyId } : {})
    };
    
    let updateData = {};
    if (operation === "set") {
      updateData.stock = stock;
    } else if (operation === "add") {
      updateData.$inc = { stock: stock };
    } else if (operation === "subtract") {
      updateData.$inc = { stock: -Math.abs(stock) };
    }
    
    const result = await Product.updateMany(filter, updateData);
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} ürünün stok bilgisi güncellendi.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toplu alan güncelle (kategori, marka, vb)
const bulkUpdateField = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { productIds, field, value } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "Ürün listesi gerekli." });
    }
    
    if (!field || !["category", "brand", "active", "minStock"].includes(field)) {
      return res.status(400).json({ success: false, message: "Geçersiz alan." });
    }
    
    const filter = { 
      _id: { $in: productIds },
      ...(companyId ? { company: companyId } : {})
    };
    
    const updateData = { [field]: value };
    const result = await Product.updateMany(filter, { $set: updateData });
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} ürün ${field} alanı güncellendi.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ürün istatistikleri
const getProductStats = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const filter = companyId ? { company: companyId } : {};
    
    const total = await Product.countDocuments(filter);
    const active = await Product.countDocuments({ ...filter, active: true });
    const inactive = await Product.countDocuments({ ...filter, active: false });
    const criticalStock = await Product.countDocuments({ 
      ...filter, 
      $expr: { $lte: ["$stock", "$minStock"] } 
    });
    
    const products = await Product.find(filter).select("salePrice stock").lean();
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.salePrice), 0);
    const avgPrice = products.length > 0 ? products.reduce((sum, p) => sum + p.salePrice, 0) / products.length : 0;
    
    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        criticalStock,
        totalStockValue: Math.round(totalStockValue),
        avgPrice: Math.round(avgPrice * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsWithFilters,
  getCategories,
  getBrands,
  bulkUpdatePrices,
  bulkUpdateStock,
  bulkUpdateField,
  getProductStats,
};