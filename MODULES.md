# AKN Platform - Modül Durumu

## 1) Tamamlanan Modüller

- Kimlik ve yetkilendirme: kayıt, giriş, JWT, rol/profil tabanlı yetki
- Müşteri yönetimi: CRUD, cari ekstre, işlem geçmişi, portal link yönetimi
- Ürün yönetimi: CRUD, şirket bazlı filtreleme
- Satış modülü: satış oluşturma ve listeleme
- Sipariş modülü: ürün arama, sipariş oluşturma, durum güncelleme
- Kasa modülü: kasa işlemleri ve raporlama
- Banka modülü: banka hesap/işlem yönetimi
- Stok modülü: depo, hareket, stok özetleri
- Raporlama: satış/kasa/banka/cari/stok rapor ekranları
- İzin ve kullanıcı yönetimi: profil, rol, kullanıcı atama
- Bayi portalı:
  - private dealer login akışı
  - public token self-service portal
  - PDF/WhatsApp/Mail paylaşım akışları
- Excel içe aktarma merkezi:
  - ürün, müşteri, cari hareket, stok
  - şablon indirme, doğrulama, önizleme, hatalı satır raporu
  - toplu commit ve işlem sonu özet

## 2) Devam Eden / İyileştirme Gerektiren Modüller

- Tam Türkçeleştirme standardizasyonu:
  - bazı sayfalarda ASCII Türkçe ve aksansız metinler mevcut
- Route standardizasyonu:
  - accountingRoutes.js ve storeProductRoutes.js mount edilmiyor
- Model standardizasyonu:
  - Invoice.js ve lnvoice.js çiftliliği
- Frontend performans:
  - tek büyük bundle, code splitting yok
- Operasyonel katman:
  - merkezi log/monitoring/alerting entegrasyonları sınırlı
- API sözleşmesi:
  - Swagger/OpenAPI dokümanı bulunmuyor

## 3) Modül Önceliklendirme Önerisi

1. Route/model tekilleştirme
2. Türkçeleştirme ve UX tutarlılığı
3. API sözleşmesi (OpenAPI)
4. Performans iyileştirme ve kod bölme
5. Operasyonel gözlemlenebilirlik
