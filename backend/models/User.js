const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "manager", "sales", "cashier", "accounting", "dealer"],
      default: "owner",
    },

    userName: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    permissionProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PermissionProfile',
      default: null,
    },
    maxDiscountRate: {
      type: Number,
      default: 3,
      min: 0,
      max: 100,
    },
    discountAllowedPaymentTypes: {
      type: [String],
      default: ['NAKIT'],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ company: 1, email: 1 }, { unique: true });
userSchema.index({ company: 1, userName: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);