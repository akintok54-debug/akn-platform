# Excel İthalatı Sorun Çözüm - Kapsamlı Rehber

## 🎯 Sorun Özeti

**Kullanıcı Raporu**: "Excelden ürün yüklediğim de ürünler sistemde gözükmüyor işlenmiyor"

### Etkilenen Fonksiyon
- Frontend: ImportCenter.jsx → Excel dosyası yükleme
- Backend: `/api/imports/products/validate` ve `/api/imports/products/commit` endpoint'leri
- Database: MongoDB'de ürün kaydı

---

## 🔍 Sorun Teşhisi (3 Adım)

### ✅ Adım 1: Backend'i Başlat ve Kontrol Et

```bash
# Terminal'de backend klasörüne git
cd backend

# Backend'i başlat
npm start

# Beklenen çıktı:
# ✅ Dotenv injected env (7) from .env
# ✅ MongoDB'ye başarıyla bağlandı
# ✅ Server Port 5000 üzerinde çalışıyor

# Eğer hata görürsen:
# ❌ MONGODB BAĞLANTI HATASI → backend/.env'de MONGO_URI kontrol et
```

### ✅ Adım 2: En Basit Test Excel Dosyasını Oluştur

| Ürün Adı      | Ürün Kodu | Satış Fiyatı |
|---------------|-----------|--------------|
| Test Ürün     | SKU-001   | 100          |

**Kritik Detaylar**:
- Kolon adları TAMAMEN doğru (Türkçe karakterler önemli!)
- Sadece 1 ürün ile test et
- Fiyat formatı: `100` veya `100.50` (virgül `100,50` YANLIŞ)
- Dosyayı `test-import.xlsx` olarak kaydet

### ✅ Adım 3: Frontend'de İthalatı Dene (Browser DevTools Açık)

1. **Browser'ı Aç**: http://localhost:5173/import
2. **Admin Hesabıyla Giriş Yap**
3. **DevTools Aç**: F12 → Network sekmesi
4. **Dosyayı Yükle**: Test Excel dosyasını seç
5. **"Önizleme ve Doğrulama" Tıkla**
6. **Network'te Kontrol Et**:
   - POST `/api/imports/products/validate` isteğini bul
   - Response tab'ına tıkla
   - Sonuç ne?

---

## 🐛 Sorun Tanısı (Hata Mesajlarına Göre)

### ❌ Hata: "Sirket bilgisi bulunamadi"

```json
{
  "success": false,
  "message": "Sirket bilgisi bulunamadi."
}
```

**Sebep**: JWT token'da company ID yok

**Çözüm**:
1. Logout → Login yap
2. Tekrar Dene

---

### ❌ Hata: "Ürün adı (name) zorunludur"

```json
{
  "success": false,
  "summary": {
    "failedRows": 1,
    "errors": ["Ürün adı (name) zorunludur."]
  }
}
```

**Sebep**: Excel kolonunun adı "Ürün Adı" değil (typo vardır)

**Kontrol**:
- Excel'i aç
- Kolon adı nedir? ("Urunadi", "Ürün Kodu" vs mı?)
- Şablonu İndir: "Excel Şablonu İndir" butonu ile resmi template al

---

### ❌ Hata: "Satış fiyatı sayısal olmalı"

```json
{
  "errors": ["Satış fiyatı sayısal olmalı."]
}
```

**Sebep**: Fiyat formatı yanlış

**Kontrol**:
- `100` ✅ Doğru
- `100.50` ✅ Doğru
- `100,50` ❌ Yanlış (TR formatı Excel'de karmaşık)
- `1.250,50` ❌ Yanlış (format conversion sorunu)

**Çözüm**:
- Fiyatları düz sayı yap: `100`, `1250.50`
- Excel: Format → Sayı → Ondalık olarak ayarla

---

### ✅ Hata Yok! Ama Ürün Gözükmüyor

**Eğer**:
- ✅ Validasyon: failedRows = 0
- ✅ Commit: inserted = 1, updated = 0
- ✅ Mesaj: "Aktarım işlemi başarıyla tamamlandı"
- ❌ FAKAT ürün listesinde yok

**Sebep**: Ürün başka şirkete kaydedilmiş

**Kontrol**:
1. Ürün listesi sayfasında şirket seçimi var mı?
2. Hangi şirket seçili? Doğru şirket mi?
3. Farklı şirkete geçip ürünü ara

**MongoDB'de Doğrudan Kontrol**:
```javascript
// MongoDB Shell veya Compass'ta
db.products.find({ sku: "SKU-001" }).pretty()

// Sonuç:
// {
//   "_id": ObjectId("..."),
//   "name": "Test Ürün",
//   "sku": "SKU-001",
//   "company": ObjectId("..."),  // ← Bu alanı kontrol et
//   "salePrice": 100
// }

// Eğer company alanı boş veya yanlış ObjectId ise:
// → User'ın company ID'si yanlış
```

---

## 📋 Çözüm Kaynakları

### 1️⃣ EXCEL_IMPORT_DEBUG.md
**Kapsamlı teşhis rehberi**
- Network isteklerini inceleme
- Backend loglarını okuma
- MongoDB kontrol sorguları
- Hata raporunu indirme

### 2️⃣ EXCEL_IMPORT_FIX.md
**Teknik kod çözümleri**
- Tanımlanan kod sorunları
- Düzeltme prosedürü (adım adım)
- Test prosedürü
- Değişiklik özeti

### 3️⃣ excel-import-diagnostic.js
**Otomatik teşhis aracı**
```bash
# Çalıştır
node excel-import-diagnostic.js

# Kontrol noktalarını göster
```

---

## ⚙️ Kontrol Listesi (Sorun Çözmek İçin)

- [ ] Backend çalışıyor mı? (npm start --prefix backend)
- [ ] MongoDB bağlı mı? ("✅ MongoDB'ye başarıyla bağlandı" log'u var mı?)
- [ ] Admin hesabıyla giriş yaptın mı? (verifyAdmin gerekli)
- [ ] Excel kolon adları doğru mu? ("Ürün Adı", "Ürün Kodu", "Satış Fiyatı")
- [ ] Excel boş satır yok mu?
- [ ] Fiyat formatı doğru mu? (100 veya 100.50)
- [ ] Validasyon başarılı mı? (failedRows = 0)
- [ ] Commit başarılı mı? (inserted > 0)
- [ ] Ürün listesinde doğru şirket seçili mi?
- [ ] MongoDB'de ürün var mı? (direct query)

---

## 🔧 Hızlı Çözüm İçin Komutlar

### Browser Console'da Test
```javascript
// JWT token'da company var mı kontrol et
const token = localStorage.getItem('token');  // veya sessionStorage
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log("Company ID:", payload.company);
console.log("User ID:", payload.id);
console.log("Role:", payload.role);
```

### MongoDB Shell'de Kontrol
```bash
# MongoDB'ye bağlan
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database_name"

# Ürünleri kontrol et
db.products.find({ sku: "SKU-001" }).pretty()

# Şirketleri kontrol et
db.companies.find().pretty()

# User'ı kontrol et
db.users.findOne({ email: "user@example.com" }).pretty()
```

### Backend Log'da Hata Ara
```bash
# Backend'i verbose mode'de başlat
DEBUG=* npm start --prefix backend

# Hataları ara
# - "MONGODB BAĞLANTI HATASI"
# - "bulkWrite hatası"
# - "Company bulunamadi"
```

---

## 📞 Hala Çalışmazsa

**Bilgi Topla ve Göster**:
1. Browser DevTools Network screenshot
   - POST `/api/imports/products/validate` response
   - POST `/api/imports/products/commit` response
2. Backend terminal çıktısı (ilk 50 satır hata öncesi)
3. Excel dosyası (anonim veri)
4. Sonuç MongoDB query'si:
   ```javascript
   db.products.find({ sku: /TEST/ }).pretty()
   ```

---

## 📚 İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `frontend/src/pages/ImportCenter.jsx` | Import UI bileşeni |
| `backend/controllers/importController.js` | Import lojik (500+ satır) |
| `backend/routes/importRoutes.js` | API route'ları |
| `backend/models/Product.js` | Product veritabanı şeması |
| `backend/middleware/authMiddleware.js` | JWT doğrulama |
| `EXCEL_IMPORT_DEBUG.md` | Detaylı debug rehberi |
| `EXCEL_IMPORT_FIX.md` | Kod çözümleri |
| `excel-import-diagnostic.js` | Otomatik teşhis |

---

## 🎓 Öğrenilen Dersler

1. **Multi-tenant sistem**: company alanı çok önemli
2. **Excel kolonu adları**: türkçe karakterler case-sensitive
3. **Fiyat formatı**: sayısal olması gerekir (string değil)
4. **Admin Yetkisi**: importRoutes'a verifyAdmin ekli
5. **Chunking**: 1000+ satır paralel istek yapar

---

## ✨ Sonuç

Excel import sistemi **tamamen fonksiyonel**, ama:
- Kolon adları doğru olmalı
- Admin yetkisi gerekli
- Company ID token'da bulunmalı
- MongoDB bağlı olmalı

Eğer bu koşullar sağlanırsa, sistem çalışır. Kontrol listesini takip et! 🚀
