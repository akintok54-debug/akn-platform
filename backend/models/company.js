const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    taxNumber: {
      type: String,
      default: "",
    },

    taxOffice: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    logo: {
      type: String,
      default: "",
    },

    theme: {
      type: String,
      enum: ["light", "dark", "ocean", "corporate"],
      default: "light",
    },

    taxRates: {
      kdv1: { type: Number, default: 1 },
      kdv10: { type: Number, default: 10 },
      kdv20: { type: Number, default: 20 },
      withholding: { type: Number, default: 0 },
    },

    printSettings: {
      paperSize: { type: String, default: "A4" },
      showLogo: { type: Boolean, default: true },
      showSignature: { type: Boolean, default: false },
      footerText: { type: String, default: "" },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Company", companySchema);