# Kurulum Rehberi

> **Yeni Başlayanlar İçin**: Kapsamlı kurulum adımları için [SETUP.md](./SETUP.md) dosyasını okuyun.

## Hızlı Kurulum (5 Dakika)

### 1. Ön Koşullar

Aşağıdakilerini yüklü olduğundan emin ol:
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** v9+ (Node.js ile otomatik gelir)
- **Git** (kod indirmek için)
- **MongoDB** erişimi (Atlas veya yerel)

Sürümleri kontrol et:
```bash
node --version
npm --version
```

### 2. Projeyi İndir

```bash
# GitHub'dan klon yap
git clone https://github.com/yourusername/akn-platform.git
cd akn-platform

# Veya ZIP dosyasını indir ve aç
```

### 3. Tüm Bağımlılıkları Yükle

```bash
# Root bağımlılıkları
npm install

# Backend bağımlılıkları
npm install --prefix backend

# Frontend bağımlılıkları
npm install --prefix frontend
```

### 4. Environment Dosyalarını Oluştur

**Backend:**
```bash
cd backend
cp .env.example .env
# .env dosyasını aç ve MongoDB URI'nı gir
nano .env
```

**Frontend:**
```bash
cd ../frontend
cp .env.example .env
# Varsayılan ayarlar geliştirme için uygun, değişiklik gerektirmez
```

### 5. Geliştirme Modunda Başlat

**Terminal 1 - Backend (API Server):**
```bash
cd backend
npm start
# Çıktı: Server 5000 portunda çalışıyor...
```

**Terminal 2 - Frontend (Dev Server):**
```bash
cd frontend
npm run dev
# Çıktı: Local: http://localhost:5173
```

**Tarayıcı:**
```
http://localhost:5173
```

---

## Environment Variables

### Backend (.env) - Gerekli Değerler

```bash
# MongoDB bağlantı stringi
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0

# JWT secret key (uzun rastgele string)
JWT_SECRET=your_super_secret_key_change_this_in_production

# CORS (frontend domain'leri)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Port (default: 5000)
PORT=5000

# Environment (development/production)
NODE_ENV=development
```

### Frontend (.env)

Çoğu durumda varsayılan ayarlar yeterli. Production'da:
```bash
VITE_API_URL=https://your-backend-domain.com/api
```

---

## Sorun Giderme

**"MongoDB bağlantısı başarısız"**
- `.env` dosyasında `MONGO_URI` doğru mu?
- Parolada özel karakterler var mı? (URL encode gerekir)
- MongoDB Atlas: Network Access → IP Whitelist'e ekle

**"CORS hatası"**
- `.env` dosyasında `CORS_ORIGINS` doğru mu?
- Frontend URL'si tam eşleşiyor mu?

**"Port 5000 zaten kullanımda"**
```bash
PORT=5001 npm start
```

---

## Sonraki Adımlar

- ✅ **Production Deployment**: [DEPLOY.md](./DEPLOY.md) oku
- ✅ **Detaylı Kurulum**: [SETUP.md](./SETUP.md) oku
- ✅ **API Referansı**: [API.md](./API.md) oku
- ✅ **Database**: [DATABASE.md](./DATABASE.md) oku
- ✅ **Geliştirici Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) oku

---

## Komutlar Özeti

| Komut | Açıklama |
|-------|----------|
| `npm install` | Tüm bağımlılıkları yükle |
| `npm start --prefix backend` | Backend server'ı başlat |
| `npm run dev --prefix frontend` | Frontend dev server'ı başlat |
| `npm run build --prefix frontend` | Frontend production build'i |
| `npm test --prefix backend` | Backend test'lerini çalıştır |
| `npm run dev` | Backend + Frontend birlikte (root'tan) |

---

**Yardıma mı ihtiyacınız var?** [Sorun Giderme](./SETUP.md#sorun-giderme) bölümüne bakın.
