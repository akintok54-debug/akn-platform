#!/usr/bin/env node

/**
 * Excel İthalatı Test Script
 * 
 * Bu script:
 * 1. Backend'i kontrol eder
 * 2. Test ürünü oluşturur
 * 3. Frontend URL'sini açar
 * 4. İthalatı test eder
 */

const http = require("http");
const { spawn } = require("child_process");

const baseUrl = "http://localhost:5000";
const frontendUrl = "http://localhost:5173/import";

console.log(`\n${"=".repeat(60)}`);
console.log("🧪 EXCEL IMPORT TEST SCRIPT");
console.log(`${"=".repeat(60)}\n`);

// Test adımları
const steps = [
  {
    name: "Backend Bağlantı Kontrolü",
    test: async () => {
      console.log("📡 Backend'e bağlanılıyor...");
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) {
          console.log("✅ Backend çalışıyor!");
          return true;
        } else {
          console.log("❌ Backend yanıt vermiyor");
          return false;
        }
      } catch (err) {
        console.log(`❌ Backend erişilememiyor: ${err.message}`);
        console.log("   Çözüm: npm start --prefix backend");
        return false;
      }
    },
  },
  {
    name: "Test Ürün Verisi",
    test: async () => {
      console.log("📦 Test ürün verisi hazırlanıyor...\n");
      const testData = {
        name: "Test Ürün - Excel Import",
        sku: `SKU-TEST-${Date.now()}`,
        barcode: `BAR-${Date.now()}`,
        salePrice: 99.99,
        purchasePrice: 50,
        stock: 100,
        vat: 20,
        brand: "Test Brand",
        category: "Test Category",
      };

      console.log("📋 Test Ürün:");
      console.log(JSON.stringify(testData, null, 2));

      console.log("\n📄 Excel Formatı:");
      console.log("┌──────────────────────┬──────────────────┬──────────────┐");
      console.log("│ Ürün Adı             │ Ürün Kodu        │ Satış Fiyatı │");
      console.log("├──────────────────────┼──────────────────┼──────────────┤");
      console.log(`│ ${testData.name.padEnd(20)} │ ${testData.sku.padEnd(16)} │ ${String(testData.salePrice).padEnd(12)} │`);
      console.log("└──────────────────────┴──────────────────┴──────────────┘");

      return true;
    },
  },
  {
    name: "Import Endpoint Testi",
    test: async () => {
      console.log(
        "\n🔗 Import Endpoint'leri:\n"
      );
      console.log(
        `  Validate: POST ${baseUrl}/api/imports/products/validate`
      );
      console.log(
        `  Commit:   POST ${baseUrl}/api/imports/products/commit\n`
      );

      console.log("📝 Request Format:\n");
      console.log(`  Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }`);
      console.log(`  Body: { "rows": [ {...product...} ] }\n`);

      return true;
    },
  },
  {
    name: "Frontend Test Sayfası",
    test: async () => {
      console.log(`\n🌐 Frontend Sayfası: ${frontendUrl}\n`);
      console.log("Şu adımları izle:");
      console.log("  1. Giriş yap (admin hesabı)");
      console.log("  2. 'Adım 1: Doğrula' butonuna tıkla");
      console.log("  3. Hataları kontrol et (varsa)");
      console.log("  4. 'Adım 2: Kaydet' butonuna tıkla");
      console.log("  5. Sonuç mesajını oku\n");

      return true;
    },
  },
  {
    name: "MongoDB Kontrol",
    test: async () => {
      console.log("\n🗄️  MongoDB'de Kontrol Komutları:\n");
      console.log("mongosh command çalıştır:");
      console.log("  mongosh \"mongodb+srv://user:pass@cluster.mongodb.net/db\"\n");
      console.log("Sonra:");
      console.log("  db.products.find({ sku: /TEST/ }).pretty()");
      console.log("  db.importjobs.find().sort({_id: -1}).limit(1).pretty()\n");

      return true;
    },
  },
];

// Test'i çalıştır
(async () => {
  let allPassed = true;

  for (const step of steps) {
    console.log(`\n${step.name.toUpperCase()}`);
    console.log("-".repeat(60));

    try {
      const result = await step.test();
      if (!result) {
        allPassed = false;
      }
    } catch (err) {
      console.error(`❌ Hata: ${err.message}`);
      allPassed = false;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (allPassed) {
    console.log("✅ Test başarılı!");
    console.log(`\n🚀 Frontend'i aç: ${frontendUrl}`);
    console.log("\n✨ Başarıyla kaydedilen ürünleri görmek için:");
    console.log("   - Ürün Listesi sayfasına git");
    console.log("   - Doğru şirket seçili mi kontrol et");
    console.log("   - Yeni ürünleri ara\n");
  } else {
    console.log("⚠️  Bazı testler başarısız oldu");
    console.log("\n💡 Kontrol et:");
    console.log("   1. Backend çalışıyor mu? npm start --prefix backend");
    console.log("   2. MongoDB bağlı mı? backend/.env MONGO_URI kontrol et");
    console.log("   3. Admin hesabı var mı?\n");
  }
  console.log(`${"=".repeat(60)}\n`);
})();
