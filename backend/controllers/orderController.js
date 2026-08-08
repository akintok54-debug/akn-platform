const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);
const VALID_STATUSES = new Set(["GELEN_SIPARISLER", "HAZIRLANIYOR", "KARGODA", "TESLIM_EDILDI"]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getProductPrices = (product) => {
  const retailPrice = toNumber(product.retailPrice, toNumber(product.salePrice, 0));
  const dealerPrice = toNumber(product.dealerPrice, retailPrice);
  return { dealerPrice, retailPrice };
};

exports.searchOrderProducts = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const companyId = req.user?.company;

    const query = {};
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      query.$or = [{ company: companyId }, { company: { $exists: false } }, { company: null }];
    }

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { sku: { $regex: search, $options: "i" } },
            { barcode: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    const products = await Product.find(query)
      .select("name sku barcode stock salePrice dealerPrice retailPrice")
      .sort({ updatedAt: -1 })
      .limit(150);

    const mapped = products.map((product) => {
      const { dealerPrice, retailPrice } = getProductPrices(product);
      return {
        _id: product._id,
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        stock: toNumber(product.stock, 0),
        dealerPrice,
        retailPrice,
      };
    });

    res.status(200).json({ success: true, products: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, customerName, notes } = req.body;
    const companyId = req.user?.company;

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Sepette ürün bulunmuyor." });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const productId = item.productId;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const selectedPriceType = item.selectedPriceType === "BAYI" ? "BAYI" : "PERAKENDE";

      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error("Ürün bulunamadı.");
      }

      const currentStock = toNumber(product.stock, 0);
      if (currentStock < quantity) {
        throw new Error(`${product.name} için stok yetersiz.`);
      }

      const { dealerPrice, retailPrice } = getProductPrices(product);
      const unitPrice = selectedPriceType === "BAYI" ? dealerPrice : retailPrice;
      const lineTotal = Number((unitPrice * quantity).toFixed(2));

      product.stock = currentStock - quantity;
      await product.save({ session });

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity,
        dealerPrice,
        retailPrice,
        selectedPriceType,
        unitPrice,
        lineTotal,
      });

      totalAmount += lineTotal;
    }

    const order = await Order.create(
      [
        {
          companyId: companyId && mongoose.Types.ObjectId.isValid(companyId) ? companyId : undefined,
          createdBy: req.user?.id,
          customerName: String(customerName || req.user?.name || "Müşteri").trim() || "Müşteri",
          items: orderItems,
          totalAmount: Number(totalAmount.toFixed(2)),
          status: "GELEN_SIPARISLER",
          notes: String(notes || "").trim(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, message: "Sipariş başarıyla oluşturuldu.", order: order[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message || "Sipariş oluşturulamadı." });
  } finally {
    session.endSession();
  }
};

exports.getOrders = async (req, res) => {
  try {
    const companyId = req.user?.company;
    const role = req.user?.role;
    const status = String(req.query.status || "").trim();

    const query = {};
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      query.companyId = companyId;
    }

    if (status && VALID_STATUSES.has(status)) {
      query.status = status;
    }

    if (!ADMIN_ROLES.has(role)) {
      query.createdBy = req.user?.id;
    }

    const orders = await Order.find(query)
      .populate("items.productId", "name sku barcode")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const role = req.user?.role;

    if (!ADMIN_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: "Sipariş durumu değiştirme yetkiniz yok." });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: "Geçersiz sipariş durumu." });
    }

    const companyId = req.user?.company;
    const query = { _id: id };
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      query.companyId = companyId;
    }

    const updated = await Order.findOneAndUpdate(query, { status }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Sipariş bulunamadı." });
    }

    res.status(200).json({ success: true, message: "Sipariş durumu güncellendi.", order: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
