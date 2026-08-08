# Changelog

Bu dosya Keep a Changelog yaklaşımına yakın formatta tutulur.

## [Unreleased]

### Added

- Excel import merkezi backend uçları:
  - /api/imports/templates/:module
  - /api/imports/:module/validate
  - /api/imports/:module/commit
- Frontend ImportCenter ekranı
- Import için chunked validate/commit ve sayfalı önizleme
- Import entegrasyon testi genişletmeleri

### Changed

- Sidebar menü metinlerinde Türkçe karşılık iyileştirmeleri
- Settings tema seçeneklerinin Türkçeleştirilmesi
- Import ekranı kullanıcı metinlerinin profesyonel Türkçe standardına çekilmesi

### Fixed

- Import customer upsert akışında dealerPortalToken unique index çakışması
- importController içindeki patch artifact/syntax sorunu

## [2026-08] - Önceki Çalışmaların Özeti

### Added

- Bayi self-service portal akışları
- WhatsApp paylaşım altyapısı
- PDF paylaşım ve statement akışları

### Fixed

- PDF stream write-after-end kaynaklı hata
- Ürün modülü CRUD ve company izolasyonu
- Accounting company alan uyumsuzlukları
