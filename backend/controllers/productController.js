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

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};