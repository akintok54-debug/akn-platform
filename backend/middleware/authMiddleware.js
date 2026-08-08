const jwt = require("jsonwebtoken");

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
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Geçersiz veya süresi dolmuş token." });
  }
};

// 2. Sadece Yönetici / Şirket Sahibinin geçmesine izin veren middleware
exports.verifyAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "owner" || req.user.role === "admin" || req.user.role === "company_owner")) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: "Bu alana sadece yetkili yönetim / muhasebe personeli erişebilir." 
    });
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