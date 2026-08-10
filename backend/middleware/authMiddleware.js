const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const PermissionProfile = require("../models/PermissionProfile");
const { normalizeCompanySubscription } = require("../services/subscriptionService");
const { hasModuleAccess } = require("./authorizationMiddleware");

const isSuperAdmin = (user) => user?.role === "SUPER_ADMIN";

// 1. Kullanıcının oturum açıp açmadığını doğrulayan middleware
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Oturum açmanız gerekiyor." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "gizli_anahtar");
    req.user = decoded; // Kullanıcı bilgilerini isteğe ekle

    if (isSuperAdmin(decoded)) {
      return next();
    }

    const companyId = decoded.company || decoded.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Sirket bilgisi olmayan hesapla devam edilemez." });
    }

    Company.findById(companyId)
      .then((company) => normalizeCompanySubscription(company))
      .then((state) => {
        if (!state.allowed) {
          return res.status(403).json({
            success: false,
            code: state.reason,
            message: "Firma hesabi pasif. Lutfen abonelik durumunu kontrol edin.",
          });
        }
        return next();
      })
      .catch(() => {
        return res.status(500).json({ success: false, message: "Firma abonelik kontrolu yapilamadi." });
      });
  } catch (error) {
    return res.status(403).json({ success: false, message: "Geçersiz veya süresi dolmuş token." });
  }
};

// 2. Sadece Yönetici / Şirket Sahibinin geçmesine izin veren middleware
exports.verifyAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "SUPER_ADMIN" || req.user.role === "owner" || req.user.role === "admin" || req.user.role === "company_owner")) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: "Bu alana sadece yetkili yönetim / muhasebe personeli erişebilir." 
    });
  }
};

exports.requireModuleAccess = (moduleName) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Oturum açmanız gerekiyor." });
    }

    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    const companyId = req.user.company || req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Sirket bilgisi olmayan hesapla devam edilemez." });
    }

    const profile = await PermissionProfile.findOne({ companyId, _id: req.user.permissionProfileId }).lean();
    req.permissionProfile = profile || { permissions: {} };

    if (hasModuleAccess(req, moduleName)) {
      return next();
    }

    return res.status(403).json({ success: false, message: "Bu modüle erişim yetkiniz yok." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Yetki kontrolü yapılamadı." });
  }
};

exports.verifyDealer = (req, res, next) => {
  if (req.user && req.user.role === "dealer") {
    req.dealer = req.user;
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Bu alana sadece bayi kullanicilari erisebilir.",
  });
};

exports.verifySuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SUPER_ADMIN") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Bu alana sadece SUPER_ADMIN erisebilir.",
  });
};

exports.requireCompanyScope = (req, res, next) => {
  const requestedCompanyId = req.params.companyId || req.query.companyId || req.body?.companyId || null;
  const currentCompanyId = req.user?.company || req.user?.companyId || null;

  if (!currentCompanyId) {
    return res.status(403).json({ success: false, message: "Sirket bilgisi bulunamadı." });
  }

  if (requestedCompanyId && String(requestedCompanyId) !== String(currentCompanyId)) {
    return res.status(403).json({ success: false, message: "Başka şirket verisine erişim izniniz yok." });
  }

  return next();
};