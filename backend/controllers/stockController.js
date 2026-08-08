const mongoose = require("mongoose");
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const StockMovement = require("../models/StockMovement");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCompanyId = (req) => req.user?.companyId || req.user?.company || null;

const buildProductFilter = (companyId) => {
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    return { $or: [{ company: companyId }, { company: { $exists: false } }, { company: null }] };
  }
  return {};
};

const buildScopedFilter = (companyId) => {
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    return { companyId };
  }
  return {};
};

exports.getStockOverview = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const products = await Product.find(buildProductFilter(companyId)).sort({ updatedAt: -1 });
    const warehouses = await Warehouse.find(buildScopedFilter(companyId)).sort({ createdAt: -1 });

    const productList = products.map((product) => {
      const stock = toNumber(product.stock, 0);
      const minStock = toNumber(product.minStock, 0);
      return {
        _id: product._id,
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        salePrice: toNumber(product.salePrice, 0),
        stock,
        minStock,
        shelf: product.shelf || "",
        critical: stock <= minStock,
      };
    });

    const criticalProducts = productList.filter((item) => item.critical);

    res.status(200).json({
      success: true,
      products: productList,
      warehouses,
      summary: {
        totalProduct: productList.length,
        totalStock: productList.reduce((sum, item) => sum + item.stock, 0),
        criticalStockCount: criticalProducts.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, isDefault } = req.body;

    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      return res.status(400).json({ success: false, message: "Depo adı zorunludur." });
    }

    const scope = buildScopedFilter(companyId);
    const existing = await Warehouse.findOne({ ...scope, name: normalizedName });
    if (existing) {
      return res.status(400).json({ success: false, message: "Bu isimde depo zaten var." });
    }

    if (isDefault) {
      await Warehouse.updateMany(scope, { isDefault: false });
    }

    const payload = {
      ...scope,
      name: normalizedName,
      isDefault: !!isDefault,
    };

    const warehouse = await Warehouse.create(payload);
    res.status(201).json({ success: true, warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const warehouses = await Warehouse.find(buildScopedFilter(companyId)).sort({ createdAt: -1 });
    res.status(200).json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStockMovement = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const companyId = getCompanyId(req);
    const { productId, warehouseId, movementType, quantity, countStock, description, movementDate } = req.body;

    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error("Ürün bulunamadı.");
    }

    const previousStock = toNumber(product.stock, 0);
    let newStock = previousStock;
    let movementQuantity = toNumber(quantity, 0);

    if (movementType === "STOK_GIRIS") {
      if (movementQuantity <= 0) throw new Error("Stok giriş miktarı sıfırdan büyük olmalıdır.");
      newStock = previousStock + movementQuantity;
    } else if (movementType === "STOK_CIKIS") {
      if (movementQuantity <= 0) throw new Error("Stok çıkış miktarı sıfırdan büyük olmalıdır.");
      if (previousStock < movementQuantity) throw new Error("Yetersiz stok.");
      newStock = previousStock - movementQuantity;
    } else if (movementType === "SAYIM") {
      const counted = toNumber(countStock, NaN);
      if (!Number.isFinite(counted) || counted < 0) {
        throw new Error("Sayım sonucu geçersiz.");
      }
      newStock = counted;
      movementQuantity = counted - previousStock;
    } else {
      throw new Error("Geçersiz hareket tipi.");
    }

    product.stock = newStock;
    await product.save({ session });

    const scoped = buildScopedFilter(companyId);
    let validWarehouseId;
    if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
      const warehouse = await Warehouse.findOne({ ...scoped, _id: warehouseId }).session(session);
      if (!warehouse) {
        throw new Error("Depo bulunamadı.");
      }
      validWarehouseId = warehouse._id;
    }

    const movement = await StockMovement.create(
      [
        {
          ...scoped,
          productId: product._id,
          warehouseId: validWarehouseId,
          movementType,
          quantity: movementQuantity,
          previousStock,
          newStock,
          description: String(description || "").trim(),
          createdBy: req.user?.id,
          movementDate: movementDate ? new Date(movementDate) : new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, movement: movement[0], product });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message || "Stok hareketi kaydedilemedi." });
  } finally {
    session.endSession();
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { movementType, productId } = req.query;

    const filter = buildScopedFilter(companyId);
    if (movementType) filter.movementType = movementType;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) filter.productId = productId;

    const movements = await StockMovement.find(filter)
      .populate("productId", "name sku barcode")
      .populate("warehouseId", "name")
      .sort({ movementDate: -1, createdAt: -1 })
      .limit(500);

    res.status(200).json({ success: true, movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
