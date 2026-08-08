const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const reportSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    reportType: { type: String, required: true, trim: true, index: true },
    periodType: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"], default: "CUSTOM" },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputFormats: [{ type: String, enum: ["PDF", "EXCEL", "JSON"] }],
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "reports" }
);

reportSchema.plugin(softDeletePlugin);
reportSchema.index({ companyId: 1, reportType: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
