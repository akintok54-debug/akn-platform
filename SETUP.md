# 🏢 AKN - Yönetim Sistemi

Tamamen bağımsız, açık kaynak, üretim hazırı yönetim sistemi.

---

## 📋 İçindekiler

1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [Proje Yapısı](#proje-yapısı)
3. [Hızlı Başlangıç](#hızlı-başlangıç)
4. [Geliştirme Kurulumu](#geliştirme-kurulumu)
5. [Production Deployment](#production-deployment)
6. [Environment Variables](#environment-variables)
7. [Database Yönetimi](#database-yönetimi)
8. [API Referansı](#api-referansı)
9. [Sorun Giderme](#sorun-giderme)
10. [Yedekleme & Taşıma](#yedekleme--taşıma)

---

## 🖥️ Sistem Gereksinimleri

### Minimum
- **Node.js**: v18+ (v24+ önerilir)
- **npm**: v9+
- **MongoDB**: v6.0+ (Atlas veya yerel)
- **RAM**: 2GB+
- **Disk**: 5GB+

### Önerilen (Production)
- **Node.js**: v24 LTS
- **MongoDB**: MongoDB Atlas (yerel backup'lı)
- **OS**: Linux (Ubuntu 20.04+), macOS, Windows Server
- **RAM**: 4GB+
- **Disk**: 20GB+ (ölçeklenebilir)

### Yazılım Bağımlılıkları
```bash
# Frontend
- React 18+
- Vite (build tool)
- Axios (HTTP client)
- React Router v6

# Backend  
- Express.js v4.18+
- Mongoose v7.0+ (MongoDB ODM)
- JWT (JSON Web Tokens) - authentication
- XLSX (Excel import/export)
- CORS (cross-origin requests)
```

Tüm bağımlılıklar `package.json` dosyalarında listelenir.

---

## 📁 Proje Yapısı

```
AKN-PLATFORM/
├── frontend/                          # React + Vite uygulaması
│   ├── public/                        # Statik dosyalar
│   ├── src/
│   │   ├── components/               # Reusable UI bileşenleri
│   │   │   ├── Navbar.jsx           # Üst navigasyon
│   │   │   ├── Sidebar.jsx          # Sol menu
│   │   │   └── Layout.jsx           # Ana layout wrapper
│   │   ├── pages/                   # Sayfa bileşenleri
│   │   │   ├── Dashboard.jsx        # Ana dashboard
│   │   │   ├── ProductsCenter.jsx   # Ürün merkezi
│   │   │   ├── Sales.jsx            # Satış yönetimi
│   │   │   ├── Customers.jsx        # Müşteri yönetimi
│   │   │   ├── Orders.jsx           # Sipariş yönetimi
│   │   │   ├── Stock.jsx            # Stok yönetimi
│   │   │   ├── Bank.jsx             # Banka işlemleri
│   │   │   ├── Cash.jsx             # Kasa yönetimi
│   │   │   ├── Accounting.jsx       # Muhasebe
│   │   │   ├── DealerPortal.jsx     # Bayi paneli
│   │   │   └── Reports/             # Rapor sayfaları
│   │   ├── services/
│   │   │   ├── api.js              # Axios API instance
│   │   │   ├── permissions.js      # Yetki kontrolü
│   │   │   └── dealerApi.js        # Bayi API instance
│   │   ├── App.jsx                 # Routing & ana app
│   │   └── main.jsx                # Entry point
│   ├── .env.example                # Environment şablonu
│   ├── package.json                # npm bağımlılıkları
│   ├── vite.config.js              # Vite konfigürasyonu
│   └── index.html                  # HTML şablonu
│
├── backend/                           # Express.js API sunucusu
│   ├── config/
│   │   └── db.js                   # MongoDB bağlantısı
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT doğrulaması
│   │   ├── activityLogMiddleware.js# Audit trail
│   │   └── errorMiddleware.js      # Hata işleme
│   ├── models/                     # Mongoose şemaları
│   │   ├── User.js                 # Kullanıcı modeli
│   │   ├── Product.js              # Ürün modeli
│   │   ├── Sale.js                 # Satış modeli
│   │   ├── Customer.js             # Müşteri modeli
│   │   ├── Order.js                # Sipariş modeli
│   │   ├── StockMovement.js        # Stok hareketi
│   │   ├── AccountTransaction.js   # Cari işlem
│   │   ├── ImportJob.js            # İmport geçmişi
│   │   └── [diğer modeller]        # Ek modeller
│   ├── controllers/                # İş mantığı
│   │   ├── authController.js       # Kimlik yönetimi
│   │   ├── productController.js    # Ürün CRUD + toplu işlemler
│   │   ├── salesController.js      # Satış işlemleri
│   │   ├── customerController.js   # Müşteri yönetimi
│   │   ├── importController.js     # Excel import
│   │   ├── reportController.js     # Rapor oluşturma
│   │   └── [diğer controllers]     # Ek kontrolörler
│   ├── routes/                     # API endpoint'leri
│   │   ├── authRoutes.js           # /api/auth
│   │   ├── productRoutes.js        # /api/products
│   │   ├── salesRoutes.js          # /api/sales
│   │   ├── customerRoutes.js       # /api/customers
│   │   └── [diğer routes]          # Ek route'lar
│   ├── services/                   # Yardımcı servisler
│   │   └── imageService.js         # Resim işleme
│   ├── utils/                      # Utility fonksiyonlar
│   │   └── customerUtils.js        # Müşteri yardımcıları
│   ├── .env.example                # Environment şablonu
│   ├── server.js                   # Express uygulaması
│   ├── package.json                # npm bağımlılıkları
│   ├── railway.json                # Railway deployment config
│   └── test.js                     # Bağlantı testi
│
├── database/                          # Database şemaları & seed
│   ├── schema.sql                  # SQL şema (referans)
│   ├── seed.sql                    # Örnek veri
│   └── README.md                   # Database dokümantasyonu
│
├── .gitignore                         # Git ignore kuralları
├── package.json                       # Root package.json
├── README.md                          # Bu dosya
├── PROJECT_STRUCTURE.md               # Detaylı proje yapısı
├── INSTALL.md                         # Kurulum adımları
├── DEVELOPER_GUIDE.md                 # Geliştirici rehberi
├── DATABASE.md                        # Database referansı
├── API.md                             # API dokumentasyonu
├── DEPLOY.md                          # Deployment rehberi
└── LICENSE                            # MIT License

```

---

## 🚀 Hızlı Başlangıç

### 1. Projeyi İndir

```bash
# GitHub'dan klon yap (ya da ZIP indir)
git clone https://github.com/yourusername/akn-platform.git
cd akn-platform

# Tüm bağımlılıkları yükle
npm install              # Root bağımlılıkları
npm install --prefix backend
npm install --prefix frontend
```

### 2. Environment Dosyalarını Oluştur

```bash
# Backend .env dosyası
cd backend
cp .env.example .env
# .env dosyasını aç ve MongoDB URI'nı gir:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/...

# Frontend .env dosyası
cd ../frontend
cp .env.example .env
# Varsayılan ayarlar geliştirme için uygun (localhost:5000)
```

### 3. Geliştirme Sunucusunu Başlat

```bash
# Terminal 1: Backend başlat (API server)
cd backend
npm start
# Çıktı: Server 5000 portunda çalışıyor...

# Terminal 2: Frontend başlat (dev server)
cd frontend
npm run dev
# Çıktı: Local: http://localhost:5173

# Tarayıcıda aç: http://localhost:5173
```

### 4. İlk Giriş

```
Admin Hesabı:
Email: admin@example.com
Şifre: 123456 (ilk kurulumda varsayılan)
```

> ⚠️ **Önemli**: Production'da varsayılan şifreyi değiştirin!

---

## 📚 Geliştirme Kurulumu

### Backend Kurulumu (Node.js + Express + MongoDB)

#### Adım 1: MongoDB Bağlantısı

**Seçenek A: MongoDB Atlas (Bulut - Önerilir)**

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) hesabı oluştur
2. Yeni bir cluster oluştur (M0 Free tier yeterli)
3. Database user oluştur (username/password)
4. Connection string kopyala:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
   ```
5. `.env` dosyasında `MONGO_URI` set et

**Seçenek B: Yerel MongoDB**

```bash
# Windows (MSI installer varsa)
# Eller Homebrew (macOS)
brew install mongodb-community

# Başlat
brew services start mongodb-community

# URI: mongodb://localhost:27017/akn-platform
```

#### Adım 2: Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env

# MongoDB bağlantısını test et
npm test

# Development modunda başlat
npm start

# Veya watch modunda (değişiklikleri izle)
npm run dev
```

**Başarılı çıktı:**
```
✅ MongoDB veritabanına başarıyla bağlandı.
✔️ Server 5000 portunda çalışıyor.
```

### Frontend Kurulumu (React + Vite)

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env

# Development modunda başlat (hot reload ile)
npm run dev

# Build (production için)
npm run build

# Preview (production build'i preview et)
npm run preview
```

**Başarılı çıktı:**
```
VITE v8.2.0 dev server running at:

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

---

## 🔒 Production Deployment

### Seçenek 1: Vercel (Frontend) + Railway (Backend)

#### Frontend: Vercel Deploy

```bash
# Vercel CLI'yi yükle
npm install -g vercel

# Vercel'e giriş yap
vercel login

# Frontend klasöründen deploy et
cd frontend
vercel --prod

# .env.production ayarları:
# VITE_API_URL=https://your-api.railway.app/api
```

#### Backend: Railway Deploy

```bash
# Railway.app hesabı oluştur
# GitHub repo'nu bağla

# Railway dashboard'da:
1. New Project → GitHub repo seç
2. Environment Variables ekle:
   - MONGO_URI=mongodb+srv://...
   - CORS_ORIGINS=https://yourdomain.com
   - NODE_ENV=production

# Railway otomatik deploy eder
```

### Seçenek 2: Kendi Server'ına (DigitalOcean, AWS, Linode, vb)

#### Server Kurulumu (Ubuntu 20.04)

```bash
# System güncellemesi
sudo apt update && sudo apt upgrade -y

# Node.js yükle
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB yükle (veya MongoDB Atlas kullan)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt install -y mongodb-org

# PM2 process manager yükle
sudo npm install -g pm2

# Git yükle
sudo apt install -y git

# Nginx yükle (reverse proxy için)
sudo apt install -y nginx
```

#### Backend Deployment

```bash
# Backend klasörü oluştur
sudo mkdir -p /var/www/akn-backend
cd /var/www/akn-backend

# Git repo'nun backend'ini clone et
git clone https://github.com/yourusername/akn-platform.git .
cd backend

# Bağımlılıkları yükle
npm install

# Production .env oluştur
sudo nano .env
# Gerekli değerleri gir

# PM2 ile start et
pm2 start server.js --name "akn-backend"
pm2 save
sudo pm2 startup

# Nginx'de reverse proxy ayarla
sudo nano /etc/nginx/sites-available/default

# Aşağıdaki konfigürasyonu ekle:
/*
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
*/

# Nginx'i yeniden başlat
sudo systemctl restart nginx

# SSL sertifikası (Let's Encrypt + Certbot)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### Frontend Deployment

```bash
# Frontend klasörü
cd /var/www/akn-frontend

# Production build
npm run build

# Nginx'de frontend serve et
sudo nano /etc/nginx/sites-available/default

# Aşağıdaki konfigürasyonu ekle:
/*
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/akn-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api.yourdomain.com;
    }
}
*/

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

---

## 🔧 Environment Variables

### Backend (.env)

```bash
# MongoDB bağlantısı (gerekli)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0

# JWT authentication secret (gerekli)
JWT_SECRET=your_very_long_random_secret_key_change_this

# CORS origins (virgülle ayırılmış)
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com,https://www.yourdomain.com

# API URLs
API_BASE_URL=http://localhost:5000
PUBLIC_API_BASE_URL=https://yourdomain.com

# Port (default: 5000)
PORT=5000

# Environment
NODE_ENV=production

# İsteğe bağlı: Email bildirimleri
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password

# İsteğe bağlı: Cloud storage
STORAGE_TYPE=local
# S3_BUCKET, AWS_ACCESS_KEY_ID, vb.
```

### Frontend (.env)

```bash
# API URL
VITE_API_URL=https://api.yourdomain.com/api

# Development proxy
VITE_API_PROXY_TARGET=http://localhost:5000

# Environment
VITE_MODE=production

# Uygulama ayarları
VITE_APP_NAME=AKN
VITE_DEBUG=false

# İsteğe bağlı: Google Analytics
VITE_GA_ID=your_google_analytics_id
```

---

## 💾 Database Yönetimi

### Yedekleme (Backup)

**MongoDB Atlas Otomatik Backup:**
```
Dashboard → Backup → Enable Automatic Backup
```

**Manuel Backup (mongodump):**

```bash
# MongoDB Atlas'tan backup
mongodump --uri "mongodb+srv://username:password@cluster.mongodb.net/" --out ./backup

# Yerel MongoDB
mongodump --out ./backup
```

**Restore:**

```bash
mongorestore --uri "mongodb+srv://username:password@cluster.mongodb.net/" ./backup
```

### Database İstatistikleri

```bash
# MongoDB'ye bağlan
mongosh "mongodb+srv://username:password@cluster.mongodb.net/akn-platform"

# Database boyutu
db.stats()

# Collection sayıları
db.getCollectionNames()

# Index'leri görüntüle
db.collection_name.getIndexes()
```

---

## 📡 API Referansı

### Kimlik Doğrulama (Authentication)

**POST** `/api/auth/login`
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "...", "name": "Admin", "role": "admin" }
  }
}
```

### Ürünler (Products)

**GET** `/api/products` - Tüm ürünleri listele
**POST** `/api/products` - Yeni ürün ekle
**GET** `/api/products/:id` - Ürün detay
**PUT** `/api/products/:id` - Ürün düzenle
**DELETE** `/api/products/:id` - Ürün sil

**GET** `/api/products/center/filters?search=&category=&brand=` - Filtreleme
**GET** `/api/products/center/stats` - İstatistikler
**POST** `/api/products/center/bulk-price` - Toplu fiyat güncelle
**POST** `/api/products/center/bulk-stock` - Toplu stok güncelle

### Satışlar (Sales)

**GET** `/api/sales` - Satış listesi
**POST** `/api/sales` - Yeni satış
**GET** `/api/reports/sales` - Satış raporu

### Müşteriler (Customers)

**GET** `/api/customers` - Müşteri listesi
**POST** `/api/customers` - Yeni müşteri
**GET** `/api/reports/customers` - Müşteri raporu

### Raporlar (Reports)

- `GET /api/reports/sales` - Satış raporu
- `GET /api/reports/customers` - Müşteri raporu
- `GET /api/reports/stock` - Stok raporu
- `GET /api/reports/orders` - Sipariş raporu
- `GET /api/reports/products` - Ürün raporu
- `GET /api/reports/audit` - İşlem geçmişi (admin)

Detaylı API dokümantasyonu: [API.md](./API.md)

---

## ❓ Sorun Giderme

### "MongoDB bağlantısı başarısız"

```bash
# MongoDB URI'nı kontrol et
# Doğru format: mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
# Paroladaki özel karakterleri URL encode et (%40 @ için, vs)

# Firewall kontrol et
# MongoDB Atlas: Network Access → IP Whitelist → 0.0.0.0/0 (test için)

# Bağlantı test et
mongo "mongodb+srv://username:password@cluster.mongodb.net/test"
```

### "CORS hatası"

```bash
# backend/.env kontrol et
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Tarayıcıda çalışan domain'i kontrol et
# URL'nin tam match olması gerekir (http vs https, www vs no-www)
```

### "401 Unauthorized (Auth Token hatası)"

```bash
# Frontend localStorage kontrolü
# DevTools → Application → localStorage → token

# Token'ın her request'de Authorization header'ında gönderildiğini kontrol et
# services/api.js'deki axios instance doğruluğunu kontrol et
```

### "Port 5000 zaten kullanımda"

```bash
# İşlemi bul
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Port'u değiştir
PORT=5001 npm start
```

### "Build hatası: 'npm not found'"

```bash
# Node.js kurulumunu kontrol et
node --version   # v18+ gerekli
npm --version    # v9+ gerekli

# Yeniden yükle
# https://nodejs.org/en/ → LTS sürümü indir
```

---

## 🔄 Yedekleme & Taşıma

### Başka Sunucuya Taşıma

#### Adım 1: Veri Yedeklemesi

```bash
# Database backup
mongodump --uri "mongodb+srv://username:password@cluster.mongodb.net/" --out ./backup

# Kod backup
tar -czf akn-platform-backup.tar.gz akn-platform/

# Dosyaları transfer et
scp akn-platform-backup.tar.gz user@newserver:/home/user/
```

#### Adım 2: Yeni Sunucuya Kurulum

```bash
# Yeni sunucuda
tar -xzf akn-platform-backup.tar.gz
cd akn-platform

# Bağımlılıkları yükle
npm install
npm install --prefix backend
npm install --prefix frontend

# .env dosyasını düzenle
nano backend/.env
# Yeni database URI, secret keys, vb.

# Database restore
mongorestore --uri "mongodb+srv://new-username:new-password@new-cluster/" ./backup

# Production build ve start
npm run build --prefix frontend
pm2 start backend/server.js --name "akn-backend"
```

### Disaster Recovery

1. **Regular Backups**: Günlük MongoDB backup'ı (MongoDB Atlas otomatik)
2. **Code Backup**: Git repository (GitHub, GitLab, vb)
3. **File Backup**: Önemli dosyaları (exports, konfigürasyonlar) ayrı sakla
4. **Test Recovery**: Ayda bir backup'ı test et

---

## 📞 Destek & Kaynaklar

- **Proje Repository**: https://github.com/yourusername/akn-platform
- **Issues & Bugs**: GitHub Issues
- **API Dokümantasyonu**: [API.md](./API.md)
- **Database Şema**: [DATABASE.md](./DATABASE.md)
- **Deployment Guide**: [DEPLOY.md](./DEPLOY.md)
- **Developer Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

---

## 📄 Lisans

MIT License - Detaylar: [LICENSE](./LICENSE) dosyasında

---

## ✅ Kontrol Listesi (Pre-Production)

- [ ] MongoDB URI doğru ve test edildi
- [ ] JWT_SECRET değiştirildi
- [ ] CORS_ORIGINS production domain'leri içeriyor
- [ ] Frontend build başarılı (`npm run build`)
- [ ] Backend test geçti (`npm test`)
- [ ] HTTPS/SSL sertifikası yüklü
- [ ] Firewall ve port forwarding ayarlandı
- [ ] Backup stratejisi belirlenmiş
- [ ] Admin şifre değiştirildi
- [ ] Email bildirimleri test edildi (isteğe bağlı)
- [ ] Monitoring kuruldu (PM2, Sentry, vb)
- [ ] Logging düzeyi production'a uygun (info/warn)

---

**Herhangi bir sorunuz olursa, issues sayfasını kullanın veya dokümantasyonu kontrol edin.**

Başarılar! 🚀
