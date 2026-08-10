# 🏢 AKN - Yönetim Sistemi

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18%2B-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-green)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Tamamen **bağımsız**, **açık kaynak** ve **üretim hazır** yönetim sistemi. Müşteri yönetimi, satış, stok, muhasebe ve fatura akışlarını güçlü arayüzle yönetin.

---

## ✨ Özellikler

### 💼 İş Yönetimi
- **Müşteri Yönetimi**: CRM benzeri müşteri profilleri, geçmiş işlem takibi
- **Satış Modülü**: Fatura oluşturma, satış raporları, ürün bazlı analiz
- **Sipariş Yönetimi**: Sipariş takibi, sevkiyat durumu
- **Muhasebe**: Cari hesaplar, gelir-gider takibi, raporlar

### 📦 Ürün & Stok
- **Ürün Merkezi**: Toplu ürün yönetimi, Excel import/export
- **Stok Kontrol**: Real-time stok takibi, minimum stok uyarıları
- **Kategori & Marka**: Ürün sınıflandırması ve raporlama

### 💰 Finans
- **Banka İşlemleri**: Banka hesap takibi, transfer işlemleri
- **Kasa Yönetimi**: Kasa hareketi ve deneme
- **Ödeme Takibi**: Müşteri ödemeleri, tahsilat

### 📊 Raporlama
- **Satış Raporları**: Tarih, ürün, müşteri bazlı analiz
- **Müşteri Analitiği**: Satın alma eğilimleri, ödeme geçmişi
- **Stok Raporu**: Hareket, değer, minimum stok analiziı
- **Denetim İzleri**: Tüm sistem aktiviteleri logu

### 🔐 Güvenlik
- **JWT Kimlik Doğrulama**: Güvenli token tabanlı erişim
- **Role-Based Access Control**: Admin, satış temsilcisi, bayi rolleri
- **Aktivite Günlüğü**: Tüm işlemler kaydedilir (audit trail)
- **Multi-Tenant Support**: Şirket bazlı veri ayrılması

### 🔄 İntegrasyon
- **Excel Import/Export**: Toplu ürün ve sipariş yükleme
- **RESTful API**: Üçüncü taraf uygulamalar için API
- **Webhook Support**: Event-driven entegrasyon (isteğe bağlı)

---

## 🚀 Hızlı Başlangıç

### Minimum Gereksinimler
- **Node.js** v18+ ([indir](https://nodejs.org))
- **npm** v9+ (Node.js ile gelir)
- **MongoDB** v6+ (MongoDB Atlas cloud veya yerel)
- **Git** (opsiyonel, ZIP ile indirebilirsin)

### 5 Dakika Kurulumu

```bash
# 1. Projeyi indir
git clone https://github.com/yourusername/akn-platform.git
cd akn-platform

# 2. Bağımlılıkları yükle
npm install && npm install --prefix backend && npm install --prefix frontend

# 3. Environment dosyalarını oluştur
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. .env'de MongoDB URI'nı düzenle (backend/.env)
# MONGO_URI=mongodb+srv://username:password@cluster...

# 5. Başlat
npm run dev
```

**Sonra açın:** http://localhost:5173

| Bileşen | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 5000 | http://localhost:5000 |
| MongoDB | 27017 | Yerel veya Atlas |

---

## 📚 Dokümantasyon

| Dosya | Açıklama |
|-------|----------|
| [SETUP.md](./SETUP.md) | **📖 Kapsamlı kurulum ve deployment rehberi** |
| [INSTALL.md](./INSTALL.md) | Hızlı kurulum adımları |
| [API.md](./API.md) | REST API dokümantasyonu |
| [DATABASE.md](./DATABASE.md) | Database şema ve modeller |
| [DEPLOY.md](./DEPLOY.md) | Production deployment (Vercel, Railway, kendi sunucu) |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Geliştirici rehberi |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Detaylı proje yapısı |

**Başlamak için:** [SETUP.md](./SETUP.md) oku!

---

## 🏗️ Teknoloji Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Responsive design

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM (Object Document Mapper)
- **JWT** - Stateless authentication
- **XLSX** - Excel import/export

### DevOps
- **PM2** - Process management
- **Nginx** - Reverse proxy
- **Docker** (opsiyonel) - Containerization
- **GitHub Actions** (opsiyonel) - CI/CD

---

## 📁 Proje Yapısı

```
akn-platform/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/         # Sayfa bileşenleri
│   │   ├── components/    # UI bileşenleri
│   │   ├── services/      # API istemciler
│   │   └── App.jsx        # Ana routing
│   ├── .env.example       # Environment şablonu
│   └── package.json
│
├── backend/                # Node.js + Express
│   ├── controllers/       # İş mantığı
│   ├── models/            # MongoDB şemaları
│   ├── routes/            # API uç noktaları
│   ├── middleware/        # Auth, logging, vb
│   ├── config/            # Database config
│   ├── .env.example       # Environment şablonu
│   └── server.js          # Ana app
│
├── database/               # Şema ve seed
│   └── schema.sql
│
├── SETUP.md               # 📖 Kapsamlı rehber
├── INSTALL.md             # Hızlı kurulum
├── README.md              # Bu dosya
├── API.md                 # API dokümantasyonu
└── LICENSE                # MIT
```

Detaylı yapı: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

---

## 🔧 Geliştirme Modunda Çalıştırma

### Terminal 1 - Backend
```bash
cd backend
npm install        # İlk kurulumda
npm start         # Server'ı başlat (5000 portunda)
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install        # İlk kurulumda
npm run dev       # Dev server'ı başlat (5173 portunda)
```

**Sonra açın:** http://localhost:5173

### Hot Reload
- **Frontend**: Dosya değişimleri anında yansıtılır (Vite)
- **Backend**: `nodemon` ile otomatik reload (isteğe bağlı)

---

## 🚀 Production Deployment

### Hızlı Deploy (Vercel + Railway)

```bash
# Frontend → Vercel
cd frontend
npm run build
vercel --prod

# Backend → Railway
# GitHub repo'nu Railway'e bağla
# Environment variables ekle (MONGO_URI, vb)
```

### Kendi Sunucu'na Deploy

```bash
# Ubuntu/Debian sunucusu setup et
# Nginx + PM2 + Node.js kurulu olsun

# 1. Sunucuya klon yap
git clone https://github.com/yourusername/akn-platform.git

# 2. .env dosyasını production değerleriyle oluştur
cp backend/.env.example backend/.env
# MONGO_URI, JWT_SECRET, CORS_ORIGINS'ları düzenle

# 3. Dependencies yükle
npm install --prefix backend
npm run build --prefix frontend

# 4. PM2 ile başlat
pm2 start backend/server.js --name "akn-backend"
pm2 startup
pm2 save

# 5. Nginx kurut
# /etc/nginx/sites-available/default'u düzenle
# upstream backend { server localhost:5000; }

sudo systemctl restart nginx
```

**Detaylı deployment rehberi:** [DEPLOY.md](./DEPLOY.md)

---

## 🔐 Environment Variables

### Backend (.env) Zorunlu

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=your_super_secret_key_minimum_32_chars
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
PORT=5000
NODE_ENV=development
```

### Frontend (.env) Varsayılan

```bash
VITE_API_URL=http://localhost:5000/api
VITE_MODE=development
```

Detaylı liste: [SETUP.md#environment-variables](./SETUP.md#environment-variables)

---

## 📦 Database Kurulumu

### MongoDB Atlas (Bulut - Önerilir)
1. [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) kaydol
2. Cluster oluştur (M0 Free tier)
3. Database user oluştur
4. Connection string kopyala
5. `.env`'de `MONGO_URI` set et

### Yerel MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu)
sudo apt install -y mongodb
sudo systemctl start mongodb

# Windows
# MongoDB installer'ı indir: https://www.mongodb.com/try/download/community
```

URI: `mongodb://localhost:27017/akn-platform`

---

## 🧪 Test Etme

```bash
# Backend bağlantı testi
cd backend
npm test

# Frontend build kontrolü
cd frontend
npm run build

# Production simulation
npm run preview
```

---

## ❓ Sık Sorulan Sorular

### "MongoDB bağlantısı başarısız"
- `.env` dosyasında `MONGO_URI` doğru mu?
- Parolada özel karakterler URL-encoded mi? (`%40` @ için)
- MongoDB Atlas firewall'ında IP whitelist'e eklendi mi?

### "CORS hatası alıyorum"
- `CORS_ORIGINS` Frontend URL'sini içeriyor mu?
- Protocol eşleşiyor mu? (http vs https)
- www prefix eşleşiyor mu?

### "Port 5000 zaten kullanımda"
```bash
PORT=5001 npm start --prefix backend
```

### "npm install başarısız"
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

Daha fazla: [SETUP.md#sorun-giderme](./SETUP.md#sorun-giderme)

---

## 🔄 Sistem Mimarisi

```mermaid
graph TB
    UI["📱 React Frontend<br/>Vite Dev Server<br/>:5173"]
    API["🔌 Express Backend<br/>API Server<br/>:5000"]
    DB["💾 MongoDB<br/>Database"]
    
    UI -->|HTTP/REST| API
    API -->|Query/Insert| DB
    DB -->|Results| API
    API -->|JSON| UI
```

**Data Flow:**
1. Kullanıcı Frontend'de işlem yapar
2. Frontend API'ye istek gönderir (axios)
3. Backend JWT ile doğrular
4. MongoDB'den veri alır/değiştirir
5. Response döner ve Frontend güncellenir

---

## 📊 Özellikleri Gösteren Video

[YouTube Demo Linki - yakında]

---

## 🤝 Katkıda Bulunma

Katkılarınız hoş geldiniz! 

1. Fork et
2. Feature branch oluştur (`git checkout -b feature/AmazingFeature`)
3. Commit et (`git commit -m 'Add some AmazingFeature'`)
4. Push et (`git push origin feature/AmazingFeature`)
5. Pull Request aç

---

## 📝 Lisans

MIT License - Bkz. [LICENSE](LICENSE) dosyası

```
MIT License © 2024 Your Company Name
Tüm hakkı saklıdır. Serbest kullanım ve değişikliğe izin verilir.
```

---

## 📞 İletişim & Destek

- 📧 **Email**: support@yourdomain.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/akn-platform/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/akn-platform/discussions)
- 📖 **Dokümantasyon**: [Tüm Docs](./SETUP.md)

---

## 🎯 Yol Haritası

### ✅ Şimdi Mevcut
- [x] Core ERP fonksiyonları
- [x] Ürün Merkezi (Excel import, toplu işlemler)
- [x] Raporlama sistemi
- [x] Multi-tenant support
- [x] Role-based access control

### 🚧 Yakında
- [ ] Mobile app (React Native)
- [ ] Advanced reporting (BI dashboard)
- [ ] Workflow automation
- [ ] API rate limiting & caching
- [ ] Docker containerization
- [ ] CI/CD GitHub Actions

### 💭 İleri Plans
- [ ] AI-powered predictions
- [ ] Multi-language support
- [ ] Marketplace integration (e-commerce)
- [ ] Real-time notifications (WebSocket)

---

## 📈 İstatistikler

- **Backend Routes**: 50+
- **Frontend Pages**: 30+
- **Database Collections**: 45+
- **API Methods**: 150+
- **Users**: Sınırsız multi-tenant

---

## ⚠️ Bilinen Limitasyonlar

1. Yerel file storage varsayılan (S3 setup gerekli production'da)
2. Email notifications otomatik değil (SMTP setup gerekli)
3. Real-time websocket desteği yok (polling kullanılır)

---

## 🎓 Öğrenme Kaynakları

- [Node.js Dokümantasyonu](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Manual](https://docs.mongodb.com/manual)
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)

---

## 🌟 Teşekkürler

Bu proje, aşağıdaki harika açık kaynak projeleri kullanır:
- Express.js
- MongoDB
- React
- Vite
- Mongoose
- Axios

---

<div align="center">

**🚀 Başlamaya Hazır Mısın?**

[SETUP.md Oku](./SETUP.md) | [Hızlı Kurulum](./INSTALL.md) | [API Dokümantasyonu](./API.md)

<br/>

Made with ❤️ for the community

</div>

### 6) Production build doğrulaması

Kök klasörden backend test + frontend build birlikte:

```bash
npm run build
```

### 5) Uygulamaya erişin

- Ön yüz: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:5000/api](http://localhost:5000/api)

## Özellikler

- Müşteri yönetimi
- Satış ekranı
- Stok yönetimi
- Ön muhasebe
- Fatura taslağı oluşturma

## Bayi Self Servis Portal ve WhatsApp Ayarlari

`backend/.env` dosyasina asagidaki degiskenleri ekleyebilirsiniz:

```env
# Public bayi portal linklerinin on eki (ornek: https://erp.akncloud.com)
DEALER_PORTAL_BASE_URL=http://localhost:5173
# WhatsApp medya baglantisi icin API taban URL (ornek: https://api.akncloud.com)
PUBLIC_API_BASE_URL=http://localhost:5000

# WhatsApp gonderim saglayicisi: none | meta | twilio
WHATSAPP_PROVIDER=none
WHATSAPP_DEFAULT_COUNTRY_CODE=90

# Meta WhatsApp Cloud API
WHATSAPP_META_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Notlar:

- `WHATSAPP_PROVIDER=meta` veya `twilio` yapildiginda butondan gercek API cagrisi yapilir.
- `PUBLIC_API_BASE_URL` internete acik bir API adrese ayarlanirsa PDF ekstre baglantisi medya olarak da gonderilir.
- Saglayici ayarlari yoksa sistem fallback olarak WhatsApp linki uretmeye devam eder ve gecmiste durum `FAILED` olarak isaretlenir.

Hazir ayar sablonu: `backend/.env.whatsapp.example`

Musteri listesinde secili kayitlar icin toplu bayi portal islemlerinden sonra
`Toplu Islem Raporu CSV` butonu ile son islem raporu indirilebilir.
