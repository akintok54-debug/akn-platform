const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const mailHistorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    toEmail: { type: String, default: "", trim: true, lowercase: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    status: { type: String, enum: ["CREATED", "SENT", "FAILED"], default: "CREATED" },
    relatedPdfName: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "mailHistory" }
);

mailHistorySchema.plugin(softDeletePlugin);
mailHistorySchema.index({ companyId: 1, customerId: 1, createdAt: -1 });

module.exports = mongoose.model("MailHistory", mailHistorySchema);
