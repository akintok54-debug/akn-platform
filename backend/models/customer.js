const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const CustomerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    customerCode: {
      type: String,
      default: "",
      trim: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    taxNumber: {
      type: String,
      default: "",
      trim: true,
    },
    taxOffice: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    district: {
      type: String,
      default: "",
      trim: true,
    },
    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["customer", "supplier", "both"],
      default: "customer",
    },
    balance: {
      type: Number,
      default: 0,
    },
    riskLimit: {
      type: Number,
      default: 0,
    },
    discountRate: {
      type: Number,
      default: 0,
    },
    customerCategory: {
      type: String,
      default: 'retail',
      trim: true,
    },
    mobilePhone: {
      type: String,
      default: '',
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    paymentSchedule: [
      {
        label: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        dueDate: { type: String, default: '' },
        status: { type: String, default: 'Beklemede' }
      }
    ],
    dealerPortalToken: {
      type: String,
      default: "",
      trim: true,
    },
    dealerPortalEnabled: {
      type: Boolean,
      default: true,
    },
    dealerPortalTokenUpdatedAt: {
      type: Date,
      default: null,
    },
    dealerPortalLastAccessAt: {
      type: Date,
      default: null,
    },
    // --- FATURA, SİPARİŞ VE İADE LİSTESİNİ TUTAN ALAN ---
    transactions: [
      {
        type: { type: String, required: true }, // 'INVOICE', 'ORDER', 'RETURN', 'COLLECTION'
        amount: { type: Number, required: true },
        items: [
          {
            name: String,
            quantity: Number,
            unitPrice: Number
          }
        ],
        description: String,
        date: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
  }
);

CustomerSchema.plugin(softDeletePlugin);
CustomerSchema.index({ company: 1, customerCode: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ company: 1, companyName: 1, name: 1 });
CustomerSchema.index({ company: 1, type: 1, active: 1, createdAt: -1 });
CustomerSchema.index({ dealerPortalToken: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ company: 1, dealerPortalEnabled: 1 });

module.exports = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);