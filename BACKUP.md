# Yedekleme ve Geri Yükleme

## 1) Uygulama Seviyesi Yedek

- Endpoint: GET /api/company/backup
- Yetki: doğrulanmış kullanıcı (tercihen admin)
- Çıktı: JSON tabanlı uygulama verisi

## 2) MongoDB Seviyesi Yedek

Öneri:

- Atlas Snapshot veya mongodump tabanlı otomasyon
- Günlük artımlı + haftalık tam yedek
- Farklı bölgede saklama (off-site)

## 3) Yedekleme Frekansı

- Kritik operasyon saatlerinde en az günlük
- Finansal yoğun sistemlerde saatlik snapshot önerilir

## 4) Geri Yükleme Tatbikatı

- En az ayda bir restore test ortamı doğrulaması
- Doğrulama:
  - Login
  - Müşteri listesi
  - Satış/ödeme hareketleri
  - Rapor ekranları
  - Import sonrası veri tutarlılığı

## 5) Güvenlik

- Yedek dosyaları şifreli saklanmalı
- Erişim en az yetki prensibiyle kısıtlanmalı
- Yedeklerde gizli anahtarlar ve tokenlar loglanmamalı
