const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const pdfArchiveSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    source: { type: String, enum: ["DEALER", "ADMIN"], default: "DEALER", index: true },
    pdfType: { type: String, enum: ["STATEMENT", "INVOICE", "REMINDER"], default: "STATEMENT", index: true },
    fileName: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "pdfArchive" }
);

pdfArchiveSchema.plugin(softDeletePlugin);
pdfArchiveSchema.index({ companyId: 1, customerId: 1, pdfType: 1, createdAt: -1 });

module.exports = mongoose.model("PdfArchive", pdfArchiveSchema);
