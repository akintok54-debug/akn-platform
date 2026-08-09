const https = require("https");
const http = require("http");
const { URL } = require("url");

// Cloudinary lazy init — credentials yoksa devre dışı
let cloudinary = null;
const getCloudinary = () => {
  if (cloudinary) return cloudinary;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  const { v2 } = require("cloudinary");
  v2.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
  cloudinary = v2;
  return cloudinary;
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

// HEAD isteği ile URL erişilebilir mi ve gerçekten resim mi kontrol et
const validateImageUrl = (rawUrl) =>
  new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return resolve({ ok: false, reason: "Geçersiz URL formatı" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return resolve({ ok: false, reason: "Yalnızca HTTP/HTTPS desteklenir" });
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      { method: "HEAD", hostname: parsed.hostname, path: parsed.pathname + parsed.search, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), timeout: 8000 },
      (res) => {
        const ct = (res.headers["content-type"] || "").toLowerCase().split(";")[0].trim();
        const cl = parseInt(res.headers["content-length"] || "0", 10);

        if (res.statusCode < 200 || res.statusCode >= 400) {
          return resolve({ ok: false, reason: `HTTP ${res.statusCode}` });
        }
        if (!ALLOWED_CONTENT_TYPES.includes(ct)) {
          return resolve({ ok: false, reason: `İçerik türü resim değil: ${ct}` });
        }
        if (cl > MAX_IMAGE_BYTES) {
          return resolve({ ok: false, reason: `Dosya çok büyük: ${(cl / 1024 / 1024).toFixed(1)} MB` });
        }
        resolve({ ok: true, contentType: ct });
      }
    );

    req.on("timeout", () => { req.destroy(); resolve({ ok: false, reason: "Bağlantı zaman aşımı" }); });
    req.on("error", (e) => resolve({ ok: false, reason: e.message }));
    req.end();
  });

// Cloudinary'e URL üzerinden yükle (indirme yok — Cloudinary kendi çekiyor)
const uploadToCloudinary = async (imageUrl, folder = "akn-products") => {
  const cld = getCloudinary();
  if (!cld) return { ok: false, reason: "Cloudinary yapılandırılmamış", url: imageUrl };

  try {
    const result = await cld.uploader.upload(imageUrl, {
      folder,
      resource_type: "image",
      timeout: 30000,
      use_filename: false,
      unique_filename: true,
    });
    return { ok: true, url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    return { ok: false, reason: err.message, url: imageUrl };
  }
};

/**
 * Tek URL'yi işle:
 * 1. Validate
 * 2. Cloudinary varsa upload → kalıcı URL döndür
 * 3. Cloudinary yoksa orijinal URL döndür
 */
const processImageUrl = async (rawUrl) => {
  const url = String(rawUrl || "").trim();
  if (!url) return { ok: false, reason: "Boş URL", url: "" };

  const validation = await validateImageUrl(url);
  if (!validation.ok) return { ok: false, reason: validation.reason, url };

  const cld = getCloudinary();
  if (!cld) {
    // Cloudinary yok — orijinal URL'yi sakla
    return { ok: true, url, source: "original_url" };
  }

  return uploadToCloudinary(url);
};

/**
 * Birden fazla URL'yi paralel işle (max 5 eş zamanlı)
 */
const processImageUrls = async (urls) => {
  const results = [];
  const batch = 5;
  for (let i = 0; i < urls.length; i += batch) {
    const slice = urls.slice(i, i + batch);
    const settled = await Promise.all(slice.map((u) => processImageUrl(u)));
    results.push(...settled);
  }
  return results;
};

module.exports = { validateImageUrl, processImageUrl, processImageUrls };
