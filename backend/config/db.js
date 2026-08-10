const mongoose = require("mongoose");

let databaseConnected = false;

const isPlaceholderMongoUri = (uri) => {
  if (!uri) return true;
  return /your_username|your_password|your_cluster|mongodb\+srv:\/\/your_username/i.test(uri);
};

const connectDatabase = async () => {
  if (databaseConnected) {
    return true;
  }

  const configuredUri = process.env.MONGO_URI;

  if (configuredUri && !isPlaceholderMongoUri(configuredUri)) {
    await mongoose.connect(configuredUri, {
      serverSelectionTimeoutMS: 20000,
      maxPoolSize: 20,
      retryWrites: true,
    });
    databaseConnected = true;
    return true;
  } else {
    console.warn("⚠️ MONGO_URI bulunamadı veya örnek değer. Uygulama yerelde devam edecek; veri kaydı işlemleri devre dışı bırakılabilir.");
    databaseConnected = false;
    return false;
  }
};

module.exports = { connectDatabase };
