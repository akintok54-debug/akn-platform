const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const brandSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: "brands" }
);

brandSchema.plugin(softDeletePlugin);
brandSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Brand", brandSchema);
