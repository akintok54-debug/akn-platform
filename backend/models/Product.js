const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Burayı false yaptık
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    barcode: {
      type: String,
      default: "",
      trim: true,
    },

    oemCode: {
      type: String,
      default: "",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    purchasePrice: {
      type: Number,
      default: 0,
    },

    salePrice: {
      type: Number,
      default: 0,
    },

    vat: {
      type: Number,
      default: 20,
    },

    stock: {
      type: Number,
      default: 0,
    },

    minStock: {
      type: Number,
      default: 0,
    },

    shelf: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ company: 1, createdAt: -1 });
ProductSchema.index({ company: 1, name: 1 });
ProductSchema.index({ company: 1, barcode: 1 });

module.exports = mongoose.model("Product", ProductSchema);