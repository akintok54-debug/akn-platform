const mongoose = require("mongoose");

const importJobSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    module: { type: String, required: true, enum: ["products", "customers", "transactions", "stock"] },
    filename: { type: String, default: "" },
    platform: { type: String, default: "unknown" },
    status: { type: String, enum: ["completed", "partial", "failed"], default: "completed" },
    totalRows: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    imagesFound: { type: Number, default: 0 },
    columnMappings: { type: mongoose.Schema.Types.Mixed, default: {} },
    errorSummary: { type: mongoose.Schema.Types.Mixed, default: [] },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "importJobs" }
);

module.exports = mongoose.model("ImportJob", importJobSchema);
