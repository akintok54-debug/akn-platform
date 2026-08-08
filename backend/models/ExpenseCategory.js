const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const expenseCategorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "expenseCategories" }
);

expenseCategorySchema.plugin(softDeletePlugin);
expenseCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
