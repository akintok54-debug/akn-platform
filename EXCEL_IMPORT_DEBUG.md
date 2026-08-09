# Excel İthalatı Debug Kılavuzu

## 🔍 Sorunu Teşhis Et

**Kullanıcı Raporu**: Excelden ürün yüklediğimde ürünler sistemde gözükmüyor işlenmiyor

### 1. **İdeal Test Senaryosu**

#### Step 1: En Basit Excel Dosyasını Oluştur
```
| Ürün Adı      | Ürün Kodu | Satış Fiyatı |
|---------------|-----------|--------------|
| Test Ürün 1   | SKU001    | 100          |
| Test Ürün 2   | SKU002    | 200          |
```

**Kritik**: Excel sütunları tam olarak şu isimlerle olmalı:
- `Ürün Adı` (name)
- `Ürün Kodu` (sku) 
- `Satış Fiyatı` (salePrice)

#### Step 2: Admin Olarak Giriş Yap
- Sistem admin hesabı kullanmalısın (verifyAdmin middleware gerektiriyor)
- JWT token'ında `company` ve `id` alanları bulunmalı

#### Step 3: ImportCenter Sayfasını Aç
- Frontend: http://localhost:5173/import
- Dosyayı yükle
- "Önizleme ve Doğrulama" butonuna tıkla

---

## 🔴 En Muhtemel Sorunlar (Teşhis Sırası)

### SORUN #1: JWT Token'da Company ID Yok
**Belirtiler**:
- Validasyon başarılı gözüküyor ama "Sirket bilgisi bulunamadi." hatası alıyorsun
- Browser console'da 400 hataları görüyorsun

**Kontrol**:
```javascript
// Browser DevTools → Application → Cookies → JWT token'ını kopyala
// jwt.io adresine paste et ve check et
{
  "company": "...",    // ⚠️ BU OLMALI
  "id": "...",         // ⚠️ BU OLMALI
  "role": "admin"      // ⚠️ "admin" OLMALI (verifyAdmin tarafından kontrol edilir)
}
```

**Çözüm**: 
- backend/.env'de `JWT_SECRET` doğru ayarlanmış mı kontrol et
- Token'ı fresh olarak giriş yaparak yenile
- User modeli JWT oluştururken company ID'yi include ediyor mu kontrol et

---

### SORUN #2: Validasyon Başarısız (API Hatası)
**Belirtiler**:
- "Doğrulama başarısız." mesajı alıyorsun
- Browser DevTools → Network → `/imports/products/validate` isteğine bak
- Response: 400 status + error message

**Validasyon Hataları Nedir**:
```
// importController.js → validateProducts() fonksiyonu

const errors = [];
if (!name) errors.push("Ürün adı (name) zorunludur.");           // ← EN YAYGINI
if (rawSalePrice !== "" && Number.isNaN(salePrice)) 
  errors.push("Satış fiyatı sayısal olmalı.");                   // ← Sayı formatı yanlış
if (rawPurchasePrice !== "" && Number.isNaN(purchasePrice)) 
  errors.push("Alış fiyatı sayısal olmalı.");                    // ← Sayı formatı yanlış
if (Number.isNaN(stock)) 
  errors.push("Stok sayısal olmalı.");                           // ← Sayı formatı yanlış
```

**Hataları Görmek**:
1. Browser Network sekmesini aç
2. Dosyayı yükle
3. "Önizleme" butonuna tıkla
4. Network → Response'a bak:
```json
{
  "success": false,
  "message": "Kaydedilebilir satir bulunamadi.",
  "errorRows": [
    {
      "rowNumber": 2,
      "errors": ["Ürün adı (name) zorunludur."],
      "raw": { "Ürün Adı": "", "Ürün Kodu": "SKU001" }
    }
  ]
}
```

**Çözüm**:
- Excel kolonlarının adlarını kontrol et (büyük/küçük harf önemli)
- Boş satırları sil
- Fiyat formatını kontrol et (TR: 1.250,50 veya EN: 1,250.50 veya 1250.50)

---

### SORUN #3: Validasyon Başarılı Ama Ürünler Gözükmüyor
**Belirtiler**:
- "Aktarım işlemi başarıyla tamamlandı." mesajı alıyorsun
- Summary gösteriyor: inserted: 2, updated: 0
- Ama ürün listesinde yok

**Olası Nedenler**:

#### 3A: Yanlış Şirkete Kaydedildi
```javascript
// commitProducts() fonksiyonu
const filter = rowData.barcode
  ? { company: companyId, barcode: rowData.barcode }
  : rowData.sku
  ? { company: companyId, sku: rowData.sku }          // ← company alanı ekleniyor
  : { company: companyId, name: rowData.name };
```

**Kontrol**:
- MongoDB'de direct kontrol:
```javascript
db.products.find({ 
  sku: "SKU001",
  company: ObjectId("...") 
}).pretty()
```

**Çözüm**:
- Ürün listesini gözlemek istediğin şirkete geçiş yap
- Veya MongoDB'de yanlış şirkete kaydedilmiş ürünleri sil

#### 3B: Yanlış Model Adı (Büyük/Küçük Harf)
```javascript
// backend/models/ klasöründe
Product.js        // ✅ Doğru
product.js        // ❌ Hatalı (Windows case-insensitive ama Linux/Mac case-sensitive)
```

**Kontrol**:
```bash
# backend/models/ klasöründen
ls -la | grep -i product    # Dosya adını kontrol et
```

#### 3C: MongoDB Bağlantısı Başarısız
```javascript
// commitProducts() → Product.bulkWrite() 
// Eğer MongoDB bağlantısı yok ise:
// - Hata fırlatmıyor (try-catch yok)
// - Database'e yazma yapılmıyor
// - Frontend: "başarılı" alıyor
```

**Kontrol**:
```bash
# Terminal'de backend'i çalıştır ve ilk log'u bak
npm start --prefix backend

# Beklenen çıktı:
# ✅ MongoDB'ye başarıyla bağlandı
# ✅ Server Port 5000 üzerinde çalışıyor

# Hata ise:
# ❌ MONGODB BAĞLANTI HATASI
# ❌ querySrv ENOTFOUND _mongodb._tcp.your_cluster.mongodb.net
```

**Çözüm**:
- backend/.env dosyasını kontrol et
- `MONGO_URI` değeri düzgün formatta mı?
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
```

#### 3D: Ürün Listesi Filtresi Yanlış
```javascript
// Product modeli company alanı ile filtreli sorgu yapıyor
db.products.find({ company: companyId })

// Eğer UI'da company filtresi varsa ve yanlış seçiliyse
// Ürünler başka şirkete ait olarak gözükecek
```

**Kontrol**:
- Ürün listesinin üstünde şirket seçimi var mı?
- Doğru şirket seçili mi?

---

### SORUN #4: Frontend Chunking Hatası
**Belirtiler**:
- 1000'den fazla satırda "Aktarım işlemi başarıyla tamamlandı." ama eksik ürün
- Browser DevTools → Network → `/imports/products/commit` isteklerinin sayısı 1'den fazla

**Teknik**:
```javascript
// ImportCenter.jsx → runChunkedAction()
const CHUNK_SIZE = 1000;
const chunks = chunkRows(rows, CHUNK_SIZE);  // 1000 satır parçalar
// Örnek: 2500 satır = 3 request (1000 + 1000 + 500)

// mergeChunkResults() parçaları birleştiriyor
```

**Çözüm**:
- Hata raporu indir (`Hatalı Satırları Raporla`)
- İkinci parçada hata var mı kontrol et

---

## 🛠️ Debug Prosedürü (Adım Adım)

### Aşama 1: Network İsteklerini İnceleme

1. Browser DevTools aç (F12)
2. Network sekmesi → Filter: "imports"
3. Excel dosyasını yükle
4. "Önizleme" butonuna tıkla

**POST /api/imports/products/validate** isteğine tıkla:
- Headers sekmesi:
  - Authorization: `Bearer eyJ...` ← Token var mı?
- Request Body:
  ```json
  {
    "rows": [
      {
        "Ürün Adı": "Test",
        "Ürün Kodu": "SKU001",
        "Satış Fiyatı": 100
      }
    ]
  }
  ```
- Response sekmesi:
  ```json
  {
    "success": true,
    "validRows": [
      { "rowNumber": 2, "normalized": {...} }
    ],
    "errorRows": []
  }
  ```

### Aşama 2: Backend Loglarını İnceleme

1. Backend'i terminal'de başlat (npm start --prefix backend)
2. İstekleri gönder
3. Backend terminal'inde log'ları oku

**Beklenen Log**:
```
POST /api/imports/products/validate
Query: { moduleName: 'products', rowCount: 2 }
Validating 2 rows...
Valid rows: 2, Error rows: 0
Response sent: 200 OK
```

**Hata Log'u**:
```
POST /api/imports/products/validate
ERROR: Company ID not found in request
Response: 400 - "Sirket bilgisi bulunamadi."
```

### Aşama 3: MongoDB Kontrol

```javascript
// MongoDB CLI veya Compass
use akn_platform
db.products.find({ sku: "SKU001" }).pretty()

// Sonuç:
// { "_id": ..., "name": "Test", "sku": "SKU001", "company": ObjectId(...) }
// ✅ Ürün var ve doğru şirkete ait
// 
// Hiç sonuç yoksa:
// ❌ commitProducts() yazma işlemi başarısız
```

---

## 📝 Düzeltme Kontrol Listesi

- [ ] **Excel Dosyası**
  - [ ] Kolon adları TAMAMEN doğru (`Ürün Adı`, `Ürün Kodu`, `Satış Fiyatı`)
  - [ ] Boş satırlar yok
  - [ ] Fiyat formatı doğru (1250.50 veya 1.250,50)
  - [ ] Adı boş olmayan en az 1 ürün var

- [ ] **Giriş & Yetkilendirme**
  - [ ] Admin hesabıyla giriş yaptın
  - [ ] JWT token browser'da var (Application → Cookies)
  - [ ] Token içinde "company" ve "admin" role var

- [ ] **Backend**
  - [ ] Backend çalışıyor (npm start --prefix backend)
  - [ ] MongoDB bağlı (`✅ MongoDB'ye başarıyla bağlandı` log'u var)
  - [ ] CORS doğru ayarlanmış (localhost:5173 allowed)

- [ ] **Validasyon**
  - [ ] "Önizleme" butonuna tıklayınca hata mesajı yok
  - [ ] Validasyon summary: failedRows = 0

- [ ] **Commit**
  - [ ] "Toplu Kaydet" butonuna tıkla
  - [ ] Summary: inserted > 0 gösteriyor
  - [ ] MongoDB'de ürün var

- [ ] **Sonuç Kontrol**
  - [ ] Doğru şirket seçili
  - [ ] Ürün listesinde yeni ürünler gözüküyor

---

## 📞 Hala Çalışmazsa

1. **Excel dosyasını paylaş** (anonimleştirilmiş)
2. **Browser Network tab screenshot** (`POST /imports/products/validate` response)
3. **Backend log çıktısı** (stderr + stdout)
4. **MongoDB kontrol**:
   ```javascript
   db.products.find({ sku: /SKU001/ }).pretty()
   db.users.findOne().pretty()  // company alanı kontrol
   ```

---

## 💡 Olası Backend Düzeltmeler

Eğer tüm adımları takip ettikten sonra hala çalışmazsa:

### Sorun: commitProducts() Exception'ı Sessiz Geçiyor
```javascript
// ❌ Hatalı
const commitProducts = async ({ validRows, companyId }) => {
  // ...
  const result = await Product.bulkWrite(operations, { ordered: false });
  return { inserted: result.upsertedCount || 0, updated: result.modifiedCount || 0 };
};

// ✅ Doğru (error handling ekle)
const commitProducts = async ({ validRows, companyId }) => {
  try {
    // ...
    const result = await Product.bulkWrite(operations, { ordered: false });
    return { inserted: result.upsertedCount || 0, updated: result.modifiedCount || 0 };
  } catch (error) {
    console.error("Product bulkWrite hatası:", error);
    throw error;  // ← Frontend'e hata dön
  }
};
```

### Sorun: Company ID Kayıtlı Değil
```javascript
// ❌ Hatalı
const commitByModule = async ({ moduleName, validRows, companyId, userId }) => {
  if (moduleName === "products") return commitProducts({ validRows });
  // ← companyId geçilmiyor!
};

// ✅ Doğru
const commitByModule = async ({ moduleName, validRows, companyId, userId }) => {
  if (moduleName === "products") return commitProducts({ validRows, companyId });
  // ← companyId geçiliyor
};
```

---

## 🔗 İlgili Kod Dosyaları

- **Frontend**: [frontend/src/pages/ImportCenter.jsx](frontend/src/pages/ImportCenter.jsx)
- **Backend Kontrolör**: [backend/controllers/importController.js](backend/controllers/importController.js)
- **Backend Route**: [backend/routes/importRoutes.js](backend/routes/importRoutes.js)
- **Product Model**: [backend/models/Product.js](backend/models/Product.js)
- **Auth Middleware**: [backend/middleware/authMiddleware.js](backend/middleware/authMiddleware.js)
