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

    // FATURA AYARLARI
    invoicePrefix: {
      type: String,
      default: "FAT",
    },
    invoiceSequence: {
      type: Number,
      default: 0,
    },
    defaultInvoiceType: {
      type: String,
      enum: ["E_FATURA", "E_ARSIV", "NORMAL"],
      default: "E_ARSIV",
    },
    defaultPaymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "CARD", "CHECK", "OTHER"],
      default: "CASH",
    },

    taxRates: {
      kdv0: { type: Number, default: 0 },
      kdv8: { type: Number, default: 8 },
      kdv18: { type: Number, default: 18 },
      kdv20: { type: Number, default: 20 },
      withholding: { type: Number, default: 0 },
    },

    printSettings: {
      paperSize: { type: String, default: "A4" },
      showLogo: { type: Boolean, default: true },
      showSignature: { type: Boolean, default: false },
      footerText: { type: String, default: "" },
      showBankDetails: { type: Boolean, default: true },
      showPaymentTerms: { type: Boolean, default: true },
    },

    // MUHASEBE AYARLARI
    vatReportingFrequency: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
      default: "MONTHLY",
    },
    fiscalYearStart: {
      type: Number,
      default: 1, // 1 = Ocak
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