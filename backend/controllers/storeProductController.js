const StoreProduct = require("../models/StoreProduct");
const Product = require("../models/Product");
const { getCompanyId } = require("../utils/tenantScope");

// 1. Tamircinin Dükkanına Yeni Ürün / Stok Eklemesi
exports.addStoreProduct = async (req, res) => {
  try {
    const { storeId, productId, salePrice, stock, barcode, shelfLocation } = req.body;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    // Ürün daha önce bu dükkana eklenmiş mi kontrol et
    let storeProduct = await StoreProduct.findOne({ storeId, productId, companyId });

    if (storeProduct) {
      // Varsa stok ve fiyatı güncelle
      storeProduct.salePrice = salePrice !== undefined ? salePrice : storeProduct.salePrice;
      storeProduct.stock += Number(stock || 0);
      if (barcode) storeProduct.barcode = barcode;
      if (shelfLocation) storeProduct.shelfLocation = shelfLocation;
      
      await storeProduct.save();
      return res.status(200).json({ 
        success: true, 
        message: "Ürün stoğu güncellendi.", 
        storeProduct 
      });
    }

    // Yeni kayıt oluştur
    storeProduct = new StoreProduct({
      companyId,
      storeId,
      productId,
      salePrice,
      stock: stock || 0,
      barcode,
      shelfLocation,
    });

    await storeProduct.save();
    res.status(201).json({ 
      success: true, 
      message: "Ürün dükkan vitrinine eklendi.", 
      storeProduct 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Belirli Bir Dükkanın Tüm Stok / Ürün Listesini Getir
exports.getStoreProducts = async (req, res) => {
  try {
    const { storeId } = req.params;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const products = await StoreProduct.find({ storeId, companyId })
      .populate("productId", "name brand category image")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Dükkan Ürün Fiyatını veya Stok Adedini Güncelle
exports.updateStoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { salePrice, stock, shelfLocation, barcode } = req.body;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const storeProduct = await StoreProduct.findOne({ _id: id, companyId });
    if (!storeProduct) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı." });
    }

    if (salePrice !== undefined) storeProduct.salePrice = salePrice;
    if (stock !== undefined) storeProduct.stock = stock;
    if (shelfLocation !== undefined) storeProduct.shelfLocation = shelfLocation;
    if (barcode !== undefined) storeProduct.barcode = barcode;

    await storeProduct.save();
    res.status(200).json({ success: true, message: "Ürün bilgileri güncellendi.", storeProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Dükkan Ürününü Vitrinden / Stoktan Kaldır
exports.deleteStoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const storeProduct = await StoreProduct.findOneAndDelete({ _id: id, companyId });
    if (!storeProduct) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı." });
    }

    res.status(200).json({ success: true, message: "Ürün dükkanınızdan kaldırıldı." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};