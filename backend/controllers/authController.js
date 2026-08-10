const User = require("../models/User");
const Company = require("../models/company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { writeActivityLog } = require("../services/activityLogService");
const { buildTrialSubscription, normalizeCompanySubscription } = require("../services/subscriptionService");
const Setting = require("../models/Setting");
const { buildSuperAdminCandidates } = require("../utils/superAdminAssignment");
const { isDuplicateKeyError, getDuplicateFieldMessage } = require("../utils/dbErrors");
const { notifySuperAdminsForAuthEvent } = require("../services/superAdminAlertService");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const getSuperAdminEmail = () => normalizeEmail(process.env.SUPER_ADMIN_EMAIL || "");
const isSuperAdminEmail = (email) => {
  const target = getSuperAdminEmail();
  return Boolean(target) && normalizeEmail(email) === target;
};

const safeNotifySuperAdmins = async (payload) => {
  try {
    await notifySuperAdminsForAuthEvent(payload);
  } catch (error) {
    console.error("SUPER_ADMIN_AUTH_NOTIFY_FAILED:", error.message);
  }
};

// ==========================
// Firma Kaydı
// ==========================
const register = async (req, res) => {
  try {
    const { companyName, name, phone, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const userExists = await User.findOne({
      email: normalizedEmail,
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Bu e-posta zaten kayıtlı.",
      });
    }

    const company = await Company.create({
      companyName,
      phone,
      email: normalizedEmail,
      ...buildTrialSubscription(),
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = isSuperAdminEmail(normalizedEmail) ? "SUPER_ADMIN" : "owner";

    const user = await User.create({
      company: company._id,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isActive: false,
    });

    await writeActivityLog({
      companyId: company._id,
      userId: user._id,
      module: "auth",
      action: "REGISTER",
      entityType: "User",
      entityId: user._id,
      after: {
        email: user.email,
        role: user.role,
        companyId: company._id,
      },
      meta: {
        companyName: company.companyName,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt,
      },
      ipAddress: req.ip,
    });

    await safeNotifySuperAdmins({
      eventType: "REGISTER",
      actorUser: user,
      company,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Firma başarıyla oluşturuldu.",
    });

  } catch (error) {
    console.log(error);

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: getDuplicateFieldMessage(error, "Bu e-posta zaten kayıtlı."),
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const inviteRegister = async (req, res) => {
  try {
    const { inviteToken, name, phone, email, password } = req.body;

    if (!inviteToken) {
      return res.status(400).json({
        success: false,
        message: "Davet bilgisi gerekli.",
      });
    }

    let invitePayload;
    try {
      invitePayload = jwt.verify(inviteToken, process.env.JWT_SECRET || "gizli_anahtar");
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Davet linki geçersiz veya süresi dolmuş.",
      });
    }

    if (invitePayload?.type !== "user-invite" || !invitePayload.company) {
      return res.status(400).json({
        success: false,
        message: "Davet linki geçersiz.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const companyId = invitePayload.company;
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Firma bulunamadı.",
      });
    }

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Ad, e-posta ve şifre zorunludur.",
      });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Bu e-posta zaten kayıtlı.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const allowedRoles = ["owner", "admin", "manager", "sales", "cashier", "accounting", "dealer"];
    const role = allowedRoles.includes(invitePayload.role) ? invitePayload.role : "sales";

    if (role === "dealer" && !invitePayload.customerId) {
      return res.status(400).json({
        success: false,
        message: "Bayi davetinde müşteri bilgisi zorunludur.",
      });
    }

    const user = await User.create({
      company: company._id,
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      customerId: role === "dealer" ? invitePayload.customerId || null : null,
      isActive: false,
    });

    await writeActivityLog({
      companyId: company._id,
      userId: user._id,
      module: "auth",
      action: "INVITE_REGISTER",
      entityType: "User",
      entityId: user._id,
      after: {
        email: user.email,
        role: user.role,
        companyId: company._id,
      },
      meta: {
        companyName: company.companyName,
        inviteRole: role,
      },
      ipAddress: req.ip,
    });

    await safeNotifySuperAdmins({
      eventType: "INVITE_REGISTER",
      actorUser: user,
      company,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Kayıt tamamlandı. Şimdi giriş yapabilirsiniz.",
    });
  } catch (error) {
    console.log(error);

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: getDuplicateFieldMessage(error, "Bu e-posta zaten kayıtlı."),
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Giriş
// ==========================
const login = async (req, res) => {
  try {

    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    const user = await User.findOne({ email }).populate("company");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "E-posta veya şifre hatalı.",
      });
    }

    const superAdminEmail = getSuperAdminEmail();
    if (superAdminEmail && normalizeEmail(user.email) === superAdminEmail && user.role !== "SUPER_ADMIN") {
      user.role = "SUPER_ADMIN";
      await user.save();
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "E-posta veya şifre hatalı.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Kullanici hesabi pasif veya e-posta/telefon doğrulaması tamamlanmamış.",
      });
    }

    if (user.role !== "SUPER_ADMIN") {
      const companyState = await normalizeCompanySubscription(user.company);
      if (!companyState.allowed) {
        return res.status(403).json({
          success: false,
          code: companyState.reason,
          message: "Firma hesabi pasif. Deneme suresi dolduysa abonelik odemesi yapiniz.",
        });
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        company: user.company._id,
        role: user.role,
        permissionProfileId: user.permissionProfileId || null,
      },
      process.env.JWT_SECRET || "gizli_anahtar",
      {
        expiresIn: "7d",
      }
    );

    user.lastLoginAt = new Date();
    await user.save();

    await writeActivityLog({
      companyId: user.company?._id || null,
      userId: user._id,
      module: "auth",
      action: "LOGIN",
      entityType: "User",
      entityId: user._id,
      meta: {
        role: user.role,
      },
      ipAddress: req.ip,
    });

    await safeNotifySuperAdmins({
      eventType: "LOGIN",
      actorUser: user,
      company: user.company,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token,
      user,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Kullanici bulunamadi.",
      });
    }

    const user = await User.findById(userId).populate("company");
    if (user) {
      await writeActivityLog({
        companyId: user.company?._id || user.company || null,
        userId: user._id,
        module: "auth",
        action: "LOGOUT",
        entityType: "User",
        entityId: user._id,
        meta: {
          role: user.role,
        },
        ipAddress: req.ip,
      });

      await safeNotifySuperAdmins({
        eventType: "LOGOUT",
        actorUser: user,
        company: user.company,
        ipAddress: req.ip,
      });
    }

    return res.json({
      success: true,
      message: "Cikis yapildi.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getSuperAdminCandidates = async (req, res) => {
  try {
    const users = await User.find({}).select("name email role company createdAt").populate("company", "companyName").lean();
    const candidates = buildSuperAdminCandidates(users, getSuperAdminEmail());
    return res.json({ success: true, users: candidates });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSuperAdminContact = async (req, res) => {
  try {
    const settings = await Setting.find({ companyId: null, key: { $in: ["superAdminPhone", "superAdminContactPhone"] } }).lean();
    const phone = settings.find((item) => item.value)?.value || process.env.SUPER_ADMIN_PHONE || "";
    return res.json({ success: true, phone });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  inviteRegister,
  login,
  logout,
  getSuperAdminCandidates,
  getSuperAdminContact,
};