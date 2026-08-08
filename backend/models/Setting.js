const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const settingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    key: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    group: { type: String, default: "general", trim: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "settings" }
);

settingSchema.plugin(softDeletePlugin);
settingSchema.index({ companyId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Setting", settingSchema);
