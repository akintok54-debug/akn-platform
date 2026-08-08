const mongoose = require("mongoose");
const softDeletePlugin = require("./plugins/softDeletePlugin");

const permissionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true, index: true },
    module: { type: String, required: true, trim: true },
    actions: [{ type: String, trim: true }],
  },
  { timestamps: true, collection: "permissions" }
);

permissionSchema.plugin(softDeletePlugin);
permissionSchema.index({ companyId: 1, roleId: 1, module: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
