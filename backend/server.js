const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDatabase } = require("./config/db");
const activityLogMiddleware = require("./middleware/activityLogMiddleware");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// CORS ayarlarını environment variables'ından al, fallback: localhost dev
const getAllowedOrigins = () => {
  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];
  return envOrigins;
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: İzin verilmeyen origin."));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(activityLogMiddleware);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AKN Cloud ERP API çalışıyor.",
    database: process.env.MONGO_URI && !/your_username|your_password|your_cluster/i.test(process.env.MONGO_URI) ? "configured" : "fallback",
    timestamp: new Date().toISOString(),
  });
});

// Rotaları tanımlıyoruz
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const saleRoutes = require("./routes/saleRoutes");
const accountRoutes = require("./routes/accountRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const erpRoutes = require("./routes/erpRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cashRoutes = require("./routes/cashRoutes");
const bankRoutes = require("./routes/bankRoutes");
const stockRoutes = require("./routes/stockRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const masterDataRoutes = require("./routes/masterDataRoutes");
const dealerPortalRoutes = require("./routes/dealerPortalRoutes");
const importRoutes = require("./routes/importRoutes");
const reportRoutes = require("./routes/reportRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");

// Rota gruplarını bağlıyoruz
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/erp", erpRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/master", masterDataRoutes);
app.use("/api/dealer", dealerPortalRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use(notFound);
app.use(errorHandler);

const DEFAULT_PORT = Number(process.env.PORT || 5000);

const startServer = async ({ port = DEFAULT_PORT } = {}) => {
  try {
    const databaseConnected = await connectDatabase();
    if (databaseConnected) {
      console.log("✅ MongoDB veritabanına başarıyla bağlandı.");
    } else {
      console.log("⚠️ MongoDB bağlantısı kurulmadı; uygulama veri katmanı olmadan çalışıyor.");
    }

    const server = await new Promise((resolve, reject) => {
      const httpServer = app.listen(port, () => {
        console.log(`🚀 Server ${port} portunda çalışıyor.`);
        resolve(httpServer);
      });
      httpServer.on("error", reject);
    });

    return server;
  } catch (err) {
    console.error("❌ MONGODB BAĞLANTI HATASI (DETAYLI):", err.message);
    throw err;
  }
};

if (require.main === module) {
  startServer().catch(() => process.exit(1));
}

module.exports = {
  app,
  startServer,
};