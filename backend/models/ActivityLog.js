const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const activityLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "activityLogs",
  }
);

activityLogSchema.plugin(softDeletePlugin);
activityLogSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
