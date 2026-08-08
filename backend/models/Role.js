const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const roleSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "roles" }
);

roleSchema.plugin(softDeletePlugin);
roleSchema.index({ companyId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);
