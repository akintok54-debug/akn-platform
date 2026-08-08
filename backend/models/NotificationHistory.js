const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const notificationHistorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    channel: { type: String, enum: ["WHATSAPP", "MAIL", "SYSTEM", "REMINDER"], required: true, index: true },
    title: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    status: { type: String, enum: ["CREATED", "SENT", "FAILED"], default: "CREATED" },
  },
  { timestamps: true, collection: "notificationHistory" }
);

notificationHistorySchema.plugin(softDeletePlugin);
notificationHistorySchema.index({ companyId: 1, customerId: 1, channel: 1, createdAt: -1 });

module.exports = mongoose.model("NotificationHistory", notificationHistorySchema);
