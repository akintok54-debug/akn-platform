const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ TEST BAŞARILI - MongoDB bağlandı");
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ TEST BAŞARISIZ");
    console.error(err);
    process.exit(1);
  });