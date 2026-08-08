const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const customerGroupSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    discountRate: { type: Number, default: 0 },
    riskLimit: { type: Number, default: 0 },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "customerGroups" }
);

customerGroupSchema.plugin(softDeletePlugin);
customerGroupSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("CustomerGroup", customerGroupSchema);
