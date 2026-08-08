# AKN Platform - Proje Yapısı

Bu doküman proje klasör yapısının ve katmanların güncel envanteridir.

## 1) Kök Dizin

- backend/: Node.js + Express + MongoDB API katmanı
- frontend/: React + Vite istemci uygulaması
- database/: Şema/seed/migration dosyaları
- README.md: Genel proje tanımı
- PRODUCTION-READINESS-REPORT.md: Üretim hazırlık raporu
- package.json: Monorepo orkestrasyon scriptleri

## 2) Backend Yapısı

- backend/server.js: Uygulama giriş noktası, middleware ve route mount noktaları
- backend/config/: Altyapı konfigürasyonları
  - db.js: MongoDB bağlantısı
- backend/controllers/: İş kuralları ve endpoint handler'ları
  - auth, company, customer, product, sale, order, invoice
  - cash, bank, stock, accounting, account
  - dealer portal, import, erp, permission, activity log, master data
- backend/routes/: Endpoint tanımları
- backend/models/: Mongoose model tanımları
- backend/middleware/: auth, activity log, global error middleware
- backend/services/: Harici servisler (ör. WhatsApp sağlayıcıları)
- backend/utils/: Yardımcı fonksiyonlar
- backend/test/: Entegrasyon testleri

## 3) Frontend Yapısı

- frontend/src/main.jsx: React uygulama bootstrap
- frontend/src/App.jsx: Router tanımları ve route guard akışı
- frontend/src/components/: Ortak UI bileşenleri
  - Layout.jsx, Navbar.jsx, Sidebar.jsx
  - customers/: müşteri form/tablo bileşenleri
  - ui/: kart ve özet bileşenleri
- frontend/src/pages/: Sayfa bazlı modüller
  - Dashboard, Customers, CustomerDetail, Products, Orders, Sales
  - Cash, Bank, CurrentAccounts, Accounting, Stock
  - Reports, ImportCenter, Settings, InvoiceCreate
  - DealerLogin, DealerPortal, DealerSelfServicePortal
- frontend/src/services/: API istemcileri
  - api.js, dealerApi.js
- frontend/src/index.css: Global tema ve stil değişkenleri

## 4) Database Klasörü

- database/schema.sgl: Şema tanımları
- database/seed.sgl: Başlangıç veri setleri
- database/migrations/: Migration dosyaları

## 5) Notlar

- backend/routes/storeProductRoutes.js mevcut ancak backend/server.js içinde mount edilmemiştir.
- backend/routes/accountingRoutes.js mevcut ancak backend/server.js içinde mount edilmemiştir (hesap/muhasebe akışı accountRoutes üzerinden sürmektedir).
- backend/models içinde Invoice.js ve lnvoice.js birlikte bulunmaktadır; bakım sırasında tekilleştirme önerilir.
