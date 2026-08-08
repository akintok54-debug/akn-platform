const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const collectionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    currentAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "CurrentAccount", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["CASH", "BANK", "CARD", "OTHER"], default: "CASH" },
    collectionDate: { type: Date, default: Date.now, index: true },
    referenceNo: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "collections" }
);

collectionSchema.plugin(softDeletePlugin);
collectionSchema.index({ companyId: 1, collectionDate: -1 });

module.exports = mongoose.model("Collection", collectionSchema);
