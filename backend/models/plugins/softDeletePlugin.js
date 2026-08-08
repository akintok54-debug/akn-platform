const mongoose = require("mongoose");

const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  });

  schema.pre(/^find/, function preFind(next) {
    const options = this.getOptions ? this.getOptions() : {};
    if (options && options.withDeleted) {
      return next();
    }
    this.where({ isDeleted: false });
    next();
  });

  schema.methods.softDelete = async function softDelete(userId, session) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId || null;
    return this.save({ session });
  };

  schema.methods.restore = async function restore(session) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save({ session });
  };
};

module.exports = softDeletePlugin;
