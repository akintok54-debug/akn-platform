# Excel İthalatı - Kod Analizi & Sorun Çözüm

## 🐛 Tanımlanan Potansiyel Sorunlar

### SORUN 1: validateImport Endpoint'i Company ID Kontrol Etmiyor ✅ DURUMU: BULUNDU

**Dosya**: [backend/controllers/importController.js](backend/controllers/importController.js)  
**Satır**: 901 (validateImport function)

```javascript
exports.validateImport = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    // ⚠️ SORUN: companyId kontrol edilmiyor!
    const rows = req.body?.rows;
    
    const rowsError = validateRowsCount(rows);
    if (rowsError) {
      return res.status(400).json({ success: false, message: rowsError });
    }

    const { validRows, errorRows } = await validateByModule({ moduleName, rows });
    // ← validateByModule'e companyId geçilmiyor!
```

**Etki**:
- Ürünler doğrulanıyor ama company ID olmadan kaydediliyor
- Başka şirkete ait ürünler gözüküyor
- `validateProducts()` company bilgisini ihtiyaç duymuyor, ama `validateTransactions()` ve `validateStock()` gerekli

**Çözüm**:
```javascript
// ✅ DÜZELTME
exports.validateImport = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const companyId = getCompanyId(req);  // ← EKLE
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }
    
    const rows = req.body?.rows;
    const rowsError = validateRowsCount(rows);
    if (rowsError) {
      return res.status(400).json({ success: false, message: rowsError });
    }

    const { validRows, errorRows } = await validateByModule({ moduleName, rows, companyId });
    // ← companyId geç
```

---

### SORUN 2: Error Handling Silme (try-catch sessiz geçiyor)

**Dosya**: [backend/controllers/importController.js](backend/controllers/importController.js)  
**Satırlar**: 631 (commitProducts), 1023 (commitImport)

```javascript
const commitProducts = async ({ validRows, companyId }) => {
  // ... işlemler ...
  const result = await Product.bulkWrite(operations, { ordered: false });
  // ⚠️ SORUN: Exception varsa bile frontend "başarılı" alıyor
  return {
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  };
};

// exports.commitImport içinde:
const result = await commitByModule({...});
// ← commitProducts() exception fırlatırsa, frontend 500 alır, ama "başarılı" mesajı varsa karışır
```

**Düzeltme**:
```javascript
// ✅ DÜZELTME - commitProducts içine error handling ekle
const commitProducts = async ({ validRows, companyId }) => {
  try {
    // ... existing code ...
    const result = await Product.bulkWrite(operations, { ordered: false });
    return {
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      imagesFound,
      imageErrors,
      imageLog,
    };
  } catch (error) {
    console.error("commitProducts bulkWrite hatası:", error);
    throw new Error(`Ürün kaydı başarısız: ${error.message}`);
  }
};
```

---

### SORUN 3: validateProducts Company Alanı Kontrol Etmiyor

**Dosya**: [backend/controllers/importController.js](backend/controllers/importController.js)  
**Satırlar**: 374-430 (validateProducts)

```javascript
const validateProducts = async (rows) => {
  const validRows = [];
  const errorRows = [];

  rows.forEach((row, idx) => {
    // ... validation logic ...
    if (!name) errors.push("Ürün adı (name) zorunludur.");
    if (rawSalePrice !== "" && Number.isNaN(salePrice)) 
      errors.push("Satış fiyatı sayısal olmalı.");
    // ← OK, ama company ID kontrol yok
    
    if (errors.length) {
      errorRows.push({ rowNumber, errors, raw: row });
    } else {
      validRows.push({ rowNumber, normalized, raw: row });
    }
  });

  return { validRows, errorRows };
};
```

**Not**: Bu fonksiyon company ID'ye ihtiyaç duymaz (duplicate kontrol `commitProducts`'da olur), ama consistency için iyidir.

---

## 🔧 Tam Çözüm (Uygula Aşağıdaki Sırada)

### Adım 1: validateImport Düzelt

File: [backend/controllers/importController.js](backend/controllers/importController.js)

**Bul** (satır ~901):
```javascript
exports.validateImport = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const rows = req.body?.rows;
    const rowsError = validateRowsCount(rows);
```

**Değiştir**:
```javascript
exports.validateImport = async (req, res) => {
  try {
    const moduleName = String(req.params.module || "").toLowerCase();
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Sirket bilgisi bulunamadi." });
    }

    const rows = req.body?.rows;
    const rowsError = validateRowsCount(rows);
```

---

### Adım 2: validateImport - validateByModule Çağrısı Düzelt

**Bul** (satır ~920):
```javascript
    const { validRows, errorRows } = await validateByModule({ moduleName, rows, companyId });
    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: "Kaydedilebilir satir bulunamadi.",
        summary: { totalRows: rows.length, validRows: 0, failedRows: errorRows.length },
        errorRows,
      });
    }
```

✅ **Bu kısım ZATEN doğru!** (companyId zaten geçiliyor)

---

### Adım 3: commitProducts Error Handling Ekle

**Bul** (satır ~631):
```javascript
const commitProducts = async ({ validRows, companyId }) => {
  let imagesFound = 0;
  let imageErrors = 0;
  const imageLog = [];

  // ... işlemler ...

  const result = await Product.bulkWrite(operations, { ordered: false });
  return {
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    imagesFound,
    imageErrors,
    imageLog,
  };
};
```

**Değiştir**:
```javascript
const commitProducts = async ({ validRows, companyId }) => {
  let imagesFound = 0;
  let imageErrors = 0;
  const imageLog = [];

  try {
    // Resim işleme: her satır için paralel URL kontrolü + Cloudinary upload
    const processedRows = await Promise.all(
      validRows.map(async (item) => {
        const { _imageUrls, ...rowData } = item.normalized;
        if (!_imageUrls || _imageUrls.length === 0) return { rowData, item };

        imagesFound++;
        const results = await processImageUrls(_imageUrls);
        const successful = results.filter((r) => r.ok).map((r) => r.url);
        const failed = results.filter((r) => !r.ok);

        if (failed.length > 0) {
          imageErrors += failed.length;
          imageLog.push({
            rowNumber: item.rowNumber,
            name: rowData.name,
            failedUrls: failed.map((f) => `${f.url}: ${f.reason}`),
          });
        }

        rowData.image = successful[0] || rowData.image || "";
        rowData.images = successful;

        return { rowData, item };
      })
    );

    // Duplicate kontrolü: barkod → sku → ürün adı sırasıyla
    const operations = processedRows.map(({ rowData }) => {
      const filter = rowData.barcode
        ? { company: companyId, barcode: rowData.barcode }
        : rowData.sku
        ? { company: companyId, sku: rowData.sku }
        : { company: companyId, name: rowData.name };

      const updateFields = { ...rowData, company: companyId };
      if (!rowData.image) delete updateFields.image;
      if (!rowData.images || rowData.images.length === 0) delete updateFields.images;

      return {
        updateOne: {
          filter,
          update: { $set: updateFields },
          upsert: true,
        },
      };
    });

    const result = await Product.bulkWrite(operations, { ordered: false });
    
    return {
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      imagesFound,
      imageErrors,
      imageLog,
    };
  } catch (error) {
    console.error("commitProducts hatası:", error);
    throw new Error(`Ürün kaydı başarısız: ${error.message}`);
  }
};
```

---

## 🧪 Düzeltme Sonrası Test Prosedürü

1. Backend'i restart et: `npm start --prefix backend`
2. Frontend'i yenile (F5)
3. Admin hesabıyla giriş yap
4. ImportCenter sayfasına git
5. Test Excel dosyasını yükle (3-5 ürün)
6. "Önizleme" butonuna tıkla
7. Kontrol et:
   - [ ] Validasyon summary: failedRows = 0
   - [ ] Hiç hata yoksa validRows = 3-5
8. "Toplu Kaydet" butonuna tıkla
9. Kontrol et:
   - [ ] summary: inserted = 3-5, updated = 0
   - [ ] Browser DevTools Network: `/api/imports/products/commit` response 200
10. MongoDB'de kontrol:
    ```javascript
    db.products.find({ sku: { $in: ["SKU001", "SKU002", "SKU003"] } }).pretty()
    ```
11. Ürün listesinde kontrol:
    - [ ] Doğru şirket seçili
    - [ ] Yeni ürünler gözüküyor

---

## 📊 Değişiklik Özeti

| Problem | Dosya | Satırlar | Çözüm |
|---------|-------|----------|-------|
| validateImport companyId eksik | importController.js | 901-905 | companyId ekle ve kontrol et |
| commitProducts error handling | importController.js | 631+ | try-catch ekle |
| validateProducts company kontrol | importController.js | 374+ | Düşüktür (products module'ünde zorunlu değil) |

---

## 🎯 En Olası Sebep (Teşhisim)

**Ürünlerin gözükmemesinin sebebi:**

Kombinasyon:
1. `validateImport` company ID kontrolü yapmıyor
2. Product model company alanı ile filtreli sorgu yapıyor (`Product.find({ company: companyId })`)
3. Ürünler yükleniyor **AMA BAŞKA/UNKNOWN ŞİRKET ID'YE**
4. Ürün listesinde sadece user'ın company'sinin ürünleri gözüküyor

**Test**: MongoDB'de kontrol et:
```javascript
db.products.find({ sku: "SKU001" }).pretty()
// Sonuç: company değeri yanlış/farklı olabilir
```

---

## 📋 Kontrol Listesi

- [ ] validateImport'ta companyId eklendi mi?
- [ ] companyId kontrol edildi mi (401 döndürülüyor mu)?
- [ ] companyId validateByModule'e geçiliyor mu?
- [ ] commitProducts try-catch eklenimdi?
- [ ] Backend restart edildi mi?
- [ ] Test Excel dosyası oluşturuldu mu?
- [ ] Validasyon başarılı mı?
- [ ] Commit işlemi başarılı mı (200 status)?
- [ ] MongoDB'de ürün var mı?
- [ ] Ürün listesinde yeni ürün gözüküyor mu?
