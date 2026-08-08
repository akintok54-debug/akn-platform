const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const statementHistorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    source: { type: String, enum: ["DEALER", "ADMIN"], default: "DEALER", index: true },
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    docType: { type: String, default: "", trim: true },
    minDebit: { type: Number, default: 0 },
    minCredit: { type: Number, default: 0 },
    rowCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "statementHistory" }
);

statementHistorySchema.plugin(softDeletePlugin);
statementHistorySchema.index({ companyId: 1, customerId: 1, createdAt: -1 });

module.exports = mongoose.model("StatementHistory", statementHistorySchema);
