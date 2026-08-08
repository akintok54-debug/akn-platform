const mongoose = require("mongoose");

const runInTransaction = async (handler) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await handler(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { runInTransaction };
