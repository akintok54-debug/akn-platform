const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const expenseSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    expenseCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory", required: false, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    expenseDate: { type: Date, default: Date.now, index: true },
    description: { type: String, default: "", trim: true },
    paymentMethod: { type: String, enum: ["CASH", "BANK", "CARD", "OTHER"], default: "CASH" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "expenses" }
);

expenseSchema.plugin(softDeletePlugin);
expenseSchema.index({ companyId: 1, expenseDate: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
