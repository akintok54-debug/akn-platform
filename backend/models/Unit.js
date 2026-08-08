const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const unitSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: "units" }
);

unitSchema.plugin(softDeletePlugin);
unitSchema.index({ companyId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Unit", unitSchema);
