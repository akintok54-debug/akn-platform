# AKN Platform - Yol Haritası

## Faz 1 - Stabilizasyon

- Route mount envanterini netleştir (accounting/storeProduct)
- Model isim tekilleştirme (Invoice/lnvoice)
- Tüm frontend metinlerinde Türkçe karakter standardı
- Kritik akışlar için smoke test seti

## Faz 2 - Sözleşme ve Kalite

- OpenAPI/Swagger üretimi
- Ortak response format standardı
- Merkezi hata kodları ve i18n mesaj anahtarları
- ESLint/Oxlint + pre-commit kalite kapısı

## Faz 3 - Performans ve Ölçek

- Frontend code splitting (route bazlı)
- Backend query/index optimizasyonu
- Read-heavy endpointlerde cache stratejisi
- Batch import için job queue (opsiyonel)

## Faz 4 - Operasyonel Olgunluk

- Containerization (Docker)
- CI/CD pipeline
- Merkezi log toplama (ELK/Loki)
- Health + readiness + liveness standartları
- Yedekleme/geri dönüş prosedürlerinin otomasyonu

## Açık İşler (Kısa Liste)

- Mount edilmeyen route dosyalarının kararı
- API dökümünün canlı tutulması
- Test kapsamında dealer/public akışlarının artırılması
- Güvenlik sertleştirmesi (rate limit, helmet, CORS whitelist)
