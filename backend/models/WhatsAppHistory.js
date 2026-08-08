const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const whatsAppHistorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    phone: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["CREATED", "SENT", "FAILED"], default: "CREATED" },
    relatedPdfName: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "whatsappHistory" }
);

whatsAppHistorySchema.plugin(softDeletePlugin);
whatsAppHistorySchema.index({ companyId: 1, customerId: 1, createdAt: -1 });

module.exports = mongoose.model("WhatsAppHistory", whatsAppHistorySchema);
