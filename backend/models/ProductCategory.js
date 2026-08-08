const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const productCategorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "productCategories" }
);

productCategorySchema.plugin(softDeletePlugin);
productCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ProductCategory", productCategorySchema);
