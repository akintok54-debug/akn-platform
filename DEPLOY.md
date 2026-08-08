# Deploy Rehberi

## 1) Genel Mimari

- Frontend: Vite ile üretilmiş statik çıktı (frontend/dist)
- Backend: Node.js Express API
- Database: MongoDB Atlas

## 2) Production Ortam Değişkenleri

Backend için:

- PORT
- MONGO_URI
- JWT_SECRET
- DEALER_PORTAL_BASE_URL
- PUBLIC_API_BASE_URL
- WHATSAPP_PROVIDER
- WHATSAPP_DEFAULT_COUNTRY_CODE
- WHATSAPP_META_TOKEN
- WHATSAPP_META_PHONE_NUMBER_ID
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_FROM

Frontend için:

- VITE_API_URL

## 3) Build Akışı

1. Backend testleri:
   - npm run test:all --prefix backend
2. Frontend build:
   - npm run build --prefix frontend
3. Root doğrulama:
   - npm run test:all

## 4) Yayınlama Sırası

1. Veritabanı erişimini doğrula (MONGO_URI)
2. Backend'i ayağa kaldır
3. Frontend dist çıktısını statik sunucuya taşı
4. CORS ve proxy ayarlarını doğrula
5. /api/health ile sağlık kontrolü yap

## 5) Operasyon Kontrol Listesi

- API health endpoint yanıtı
- Login ve token üretimi
- Kritik modüller: müşteri, satış, stok, import akışı
- Bayi portal erişimi (private/public)
- PDF/WhatsApp/Mail paylaşım akışları

## 6) Geri Dönüş Planı

- Son çalışan backend build'i sakla
- Son çalışan frontend dist paketini sakla
- Konfigürasyon snapshot al
- Hata durumunda bir önceki sürüme dön
