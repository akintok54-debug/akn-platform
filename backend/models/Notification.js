const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const notificationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    type: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    sourceModule: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "notifications" }
);

notificationSchema.plugin(softDeletePlugin);
notificationSchema.index({ companyId: 1, userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
