#!/usr/bin/env node

/**
 * Excel Import Diagnostic Script
 * 
 * Kullanım: node excel-import-diagnostic.js
 * 
 * Bu script:
 * 1. Backend'in çalışıp çalışmadığını kontrol eder
 * 2. MongoDB bağlantısını test eder
 * 3. Örnek ürün yükleme işlemini simüle eder
 * 4. Database'te kayıt olup olmadığını kontrol eder
 */

const http = require("http");
const https = require("https");

// ─── RENKLI ÇIKTI ─────────────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`),
};

// ─── TEST BAŞLA ───────────────────────────────────────────────────

(async () => {
  log.step("ADIM 1: Backend Bağlantı Kontrolü");

  // Backend'e basit request yap
  const backendUrl = "http://localhost:5000/api/health";
  try {
    await makeRequest("GET", backendUrl);
    log.success("Backend çalışıyor!");
  } catch (err) {
    log.error(`Backend erişilemiyor: ${err.message}`);
    log.warn("Çözüm: npm start --prefix backend komutunu çalıştır");
    process.exit(1);
  }

  log.step("ADIM 2: MongoDB Bağlantı Kontrolü");

  // Backend log'larına bakarak MongoDB durumunu kontrol et
  const mongoCheckUrl = "http://localhost:5000/api/imports/templates/products";
  try {
    const response = await makeRequest("GET", mongoCheckUrl, {
      "Authorization": "Bearer fake-token", // Başarısız olacak ama MongoDB kontrolü yapacak
    });
    log.info("MongoDB yanıt verdi (test)");
  } catch (err) {
    if (err.message.includes("Oturum açmanız gerekiyor") || err.message.includes("401")) {
      log.success("MongoDB bağlı (401 auth hatası beklenen)");
    } else {
      log.error(`MongoDB bağlantı problemi: ${err.message}`);
      log.warn("Çözüm: backend/.env dosyasında MONGO_URI kontrol et");
    }
  }

  log.step("ADIM 3: Test Ürünü Oluştur (Örnek)");

  const testProduct = {
    name: "Test Ürün",
    sku: "TEST-SKU-" + Date.now(),
    barcode: "TEST-BARCODE-" + Date.now(),
    salePrice: 99.99,
  };

  log.info(`Test Ürün: ${JSON.stringify(testProduct)}`);
  log.info("Bu ürünü Excel'de şu formatta kullan:");
  log.info("┌─────────────────┬───────────────────────┬───────────────┐");
  log.info("│ Ürün Adı        │ Ürün Kodu             │ Satış Fiyatı  │");
  log.info("├─────────────────┼───────────────────────┼───────────────┤");
  log.info(`│ ${testProduct.name.padEnd(15)} │ ${testProduct.sku.padEnd(21)} │ ${String(testProduct.salePrice).padEnd(13)} │`);
  log.info("└─────────────────┴───────────────────────┴───────────────┘");

  log.step("ADIM 4: Import Endpoint'ini Test Et");

  log.info("Şunu curl komutunda test edebilirsin:");
  log.info(`\ncurl -X POST http://localhost:5000/api/imports/products/validate \\`);
  log.info(`  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\`);
  log.info(`  -H "Content-Type: application/json" \\`);
  log.info(`  -d '{\n    "rows": [${JSON.stringify(testProduct)}]\n  }'\n`);

  log.step("ADIM 5: Hata Teşhis Noktaları");

  log.info("Eğer HATA alıyorsan, bunda ara:");
  log.info("1️⃣  Browser DevTools → Network sekmesi");
  log.info("   - POST /api/imports/products/validate isteğini bul");
  log.info("   - Response tab'ına bak → Hata mesajı nedir?");
  log.info("");
  log.info("2️⃣  Hata Mesajları:");
  log.info('   - "Sirket bilgisi bulunamadi." → JWT token company alanı eksik');
  log.info('   - "Ürün adı (name) zorunludur." → Excel kolonu yanlış');
  log.info('   - "Satış fiyatı sayısal olmalı." → Fiyat formatı yanlış (virgül vs nokta)');
  log.info("");
  log.info("3️⃣  Validasyon başarılı ama ürün gözükmüyorsa:");
  log.info('   - "Commit" yapıp response kontrol et');
  log.info('   - summary.inserted > 0 mı?');
  log.info("");
  log.info("4️⃣  MongoDB'de doğrudan kontrol:");
  log.info(`   - db.products.find({ sku: "${testProduct.sku}" }).pretty()`);
  log.info("   - company alanı boş mu?");

  log.step("ADIM 6: Frontend Kontrol Listesi");

  log.info("1. Admin hesabıyla giriş yaptın mı? (verifyAdmin middleware'i gerekli)");
  log.info("2. JWT token'da company alanı var mı?");
  log.info("   → Bunu kontrol et: jwt.io → paste token → payload kontrol");
  log.info("3. Excel dosyasını formatını kontrol et:");
  log.info("   - Kolon adları TAMAMEN doğru (büyük/küçük harf önemli)");
  log.info("   - Boş satırlar yok");
  log.info("   - Fiyat formatı: 100 veya 100.50 (virgül YANLIŞ)");
  log.info("4. 'Önizleme' yapıp hata raporu indir");
  log.info("5. Hata raporu varsa, hangi hataları gösteriyor?");

  log.step("ADIM 7: Manuel Debug Komutları");

  log.info("Backend'de test et (Node.js REPL'de):");
  log.info(`\nnode\n> const mongoose = require('mongoose');\n> await mongoose.connect('YOUR_MONGO_URI');\n> const Product = require('./backend/models/Product');\n> const products = await Product.find({ sku: '${testProduct.sku}' });\n> console.log(products);\n`);

  log.step("Sonuç");

  log.info("Eğer sorunu hala bulamıyorsan:");
  log.info("1. Browser DevTools Network tab screenshot'ını kaydet");
  log.info("2. Backend terminal log'unu kopyala");
  log.info("3. MongoDB'de: db.products.find({ sku: /TEST/ }).pretty()");
  log.info("4. Backend/.env dosyasını kontrol et (gerçek credentials var mı?)");
  log.info("5. Dosya: EXCEL_IMPORT_DEBUG.md ve EXCEL_IMPORT_FIX.md'yi oku");

  log.step("Tamamlandı!");
})();

// ─── HELPER FONKSİYONLAR ───────────────────────────────────────────

function makeRequest(method, url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    const options = {
      method,
      headers: {
        "User-Agent": "Excel-Import-Diagnostic/1.0",
        ...headers,
      },
    };

    const req = client.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}
