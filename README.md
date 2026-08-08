# AKN Platform

Bu proje, müşteri yönetimi, satış, stok, ön muhasebe ve fatura akışlarını destekleyen bir ERP benzeri demo uygulamadır.

## Kurulum

### 0) Kök klasörde orkestrasyon bağımlılıklarını yükleyin

```bash
npm install
```

### 1) Bağımlılıkları yükleyin

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 2) MongoDB başlatın

Yerel MongoDB çalıştırılabiliyorsa:

```bash
mongod
```

### 3) Arka ucu başlatın

```bash
cd backend
node server.js
```

### 4) Ön yüzü başlatın

```bash
cd frontend
npm run dev
```

Alternatif olarak kök klasörden tek komutla iki servisi aynı anda başlatabilirsiniz:

```bash
npm run dev
```

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
