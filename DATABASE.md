# AKN Platform - Veritabanı Dokümantasyonu

## 1) Altyapı

- Veritabanı: MongoDB (Atlas/yerel URI desteği)
- ODM: Mongoose
- Bağlantı noktası: backend/config/db.js
- Zorunlu değişken: MONGO_URI

## 2) Model -> Koleksiyon Envanteri

Aşağıdaki liste backend/models altındaki model dosyalarından üretilmiştir.

- Account -> accounts
- AccountTransaction -> accounttransactions
- ActivityLog -> activitylogs
- BankAccount -> bankaccounts
- BankTransaction -> banktransactions
- Brand -> brands
- CashMovement -> cashmovements
- CashRegister -> cashregisters
- CashTransaction -> cashtransactions
- Collection -> collections
- company -> companies
- CurrentAccount -> currentaccounts
- CurrentTransaction -> currenttransactions
- customer -> customers
- CustomerGroup -> customergroups
- Expense -> expenses
- ExpenseCategory -> expensecategories
- Invoice -> invoices
- lnvoice -> lnvoices (muhtemel yazım hatası kaynaklı ayrı koleksiyon riski)
- MailHistory -> mailhistories
- Notification -> notifications
- NotificationHistory -> notificationhistories
- Order -> orders
- OrderDetail -> orderdetails
- Payment -> payments
- PdfArchive -> pdfarchives
- Permission -> permissions
- PermissionProfile -> permissionprofiles
- Product -> products
- ProductCategory -> productcategories
- Purchase -> purchases
- PurchaseDetail -> purchasedetails
- Refund -> refunds
- Report -> reports
- Role -> roles
- Sale -> sales
- SaleDetail -> saledetails
- Setting -> settings
- StatementHistory -> statementhistories
- StockCount -> stockcounts
- StockMovement -> stockmovements
- StoreProduct -> storeproducts
- Supplier -> suppliers
- Transaction -> transactions
- Unit -> units
- User -> users
- Warehouse -> warehouses
- WarehouseStock -> warehousestocks
- WhatsAppHistory -> whatsApphistories / whatsaphistories (model adına bağlı pluralizasyon farkı riski)

## 3) Ana İlişki Alanları

- company/companyId: çok kiracılı izolasyon alanı
- customerId, productId, userId: temel referans bağlantıları
- transactions, paymentSchedule: gömülü belge dizileri (özellikle customer modelinde)

## 4) İndeks Notları

- customer modelinde company + customerCode unique/sparse indeks kullanımı mevcut
- dealerPortalToken alanı unique/sparse indeksli; import/upsert akışında token üretimi zorunludur
- ürün ve müşteri tarafında şirket bazlı filtre indeksleri bulunur

## 5) Veri Bütünlüğü Önerileri

- Invoice.js ve lnvoice.js dosyaları tekilleştirilmeli
- model adlarında PascalCase standardı uygulanmalı
- tüm yazma işlemlerinde company/companyId zorunluluğu bir middleware ile merkezileştirilmeli
