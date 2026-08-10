const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = String(process.env.MONGO_URI || "").trim();
const isValidMongoUri = /^mongodb(\+srv)?:\/\//i.test(mongoUri) && !/your_username|your_password|your_cluster/i.test(mongoUri);

if (!isValidMongoUri) {
  console.log("⚠️ TEST ATLANDI - Geçerli bir MONGO_URI yapılandırılmadı.");
  process.exit(0);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ TEST BAŞARILI - MongoDB bağlandı");
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ TEST BAŞARISIZ");
    console.error(err);
    process.exit(1);
  });