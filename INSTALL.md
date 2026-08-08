# Kurulum Rehberi

## 1) Ön Koşullar

- Node.js 20+ önerilir
- npm 10+ önerilir
- MongoDB Atlas URI veya yerel MongoDB erişimi

## 2) Kök Dizin

1. Bu dizine geçin:
   - c:/Users/Win10/OneDrive/Desktop/AKN-PLATFORM
2. Kök bağımlılıkları yükleyin:
   - npm install

## 3) Backend

1. Backend bağımlılıklarını yükleyin:
   - npm install --prefix backend
2. backend/.env dosyasını oluşturun veya güncelleyin
3. Zorunlu değişkenleri tanımlayın:
   - MONGO_URI
   - JWT_SECRET
   - PORT

## 4) Frontend

1. Frontend bağımlılıklarını yükleyin:
   - npm install --prefix frontend
2. Gerekirse frontend için VITE_API_URL tanımlayın (opsiyonel)

## 5) Çalıştırma

- Backend + Frontend birlikte:
  - npm run dev
- Sadece backend:
  - npm run start --prefix backend
- Sadece frontend:
  - npm run dev --prefix frontend

## 6) Doğrulama

- Backend test:
  - npm run test:all --prefix backend
- Frontend build:
  - npm run build --prefix frontend
- Tüm pipeline:
  - npm run test:all
