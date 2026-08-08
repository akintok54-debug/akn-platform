const mongoose = require("mongoose");

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI tanimli degil. MongoDB Atlas baglantisi zorunludur.");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    retryWrites: true,
  });
};

module.exports = { connectDatabase };
