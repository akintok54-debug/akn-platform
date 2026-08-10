const Company = require("../models/company");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const PermissionProfile = require("../models/PermissionProfile");
const { parseListQuery } = require("../utils/queryFeatures");
const { activatePaidSubscription } = require("../services/subscriptionService");
const { writeActivityLog } = require("../services/activityLogService");
const { canApproveSuperAdminSelf, canAssignRole } = require("../utils/superAdminAssignment");

const ROLE_OPTIONS = ["owner", "admin", "manager", "sales", "cashier", "accounting", "dealer", "SUPER_ADMIN"];

const listCompanies = async (req, res) => {
  try {
    const list = parseListQuery(req.query);
    const { q, status } = req.query;

    const filter = {};
    if (status) filter.subscriptionStatus = String(status).toUpperCase();
    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [{ companyName: regex }, { email: regex }, { phone: regex }];
    }

    const [items, total] = await Promise.all([
      Company.find(filter).sort(list.sort).skip(list.skip).limit(list.limit),
      Company.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      items,
      pagination: {
        page: list.page,
        limit: list.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / list.limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listUsers = async (req, res) => {
  try {
    const list = parseListQuery(req.query);
    const { companyId, role, q } = req.query;

    const filter = {};
    if (companyId) filter.company = companyId;
    if (role) filter.role = role;
    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }, { userName: regex }];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("name email phone userName role company isActive createdAt updatedAt lastLoginAt permissionProfileId")
        .populate("company", "companyName email subscriptionStatus isActive")
        .populate("permissionProfileId", "name role permissions companyId")
        .sort(list.sort)
        .skip(list.skip)
        .limit(list.limit),
      User.countDocuments(filter),
    ]);

    const companyIds = [...new Set(items.map((item) => String(item.company?._id || "")).filter(Boolean))];
    const availableProfiles = companyIds.length
      ? await PermissionProfile.find({ companyId: { $in: companyIds } })
          .select("_id companyId name role permissions")
          .lean()
      : [];

    return res.json({
      success: true,
      items,
      availableProfiles,
      roleOptions: ROLE_OPTIONS,
      pagination: {
        page: list.page,
        limit: list.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / list.limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, permissionProfileId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    if (user.role === "SUPER_ADMIN" && role && role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "SUPER_ADMIN hesabının rolü düşürülemez." });
    }

    if (typeof role !== "undefined") {
      if (!ROLE_OPTIONS.includes(role)) {
        return res.status(400).json({ success: false, message: "Geçersiz rol." });
      }
      user.role = role;
    }

    if (typeof isActive === "boolean") {
      user.isActive = isActive;
    }

    if (typeof permissionProfileId !== "undefined") {
      if (!permissionProfileId) {
        user.permissionProfileId = null;
      } else {
        const profile = await PermissionProfile.findOne({ _id: permissionProfileId, companyId: user.company });
        if (!profile) {
          return res.status(404).json({ success: false, message: "Yetki profili bulunamadı veya şirketle eşleşmiyor." });
        }
        user.permissionProfileId = profile._id;
      }
    }

    await user.save();

    await writeActivityLog({
      companyId: user.company,
      userId: req.user?.id,
      module: "super-admin",
      action: "USER_ACCESS_UPDATED",
      entityType: "User",
      entityId: user._id,
      after: {
        role: user.role,
        isActive: user.isActive,
        permissionProfileId: user.permissionProfileId,
      },
      ipAddress: req.ip,
    });

    const refreshed = await User.findById(user._id)
      .select("name email phone userName role company isActive createdAt updatedAt lastLoginAt permissionProfileId")
      .populate("company", "companyName email subscriptionStatus isActive")
      .populate("permissionProfileId", "name role permissions companyId");

    return res.json({ success: true, user: refreshed });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive boolean olmalı." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Super Admin hesabı değiştirilemez." });
    }

    user.isActive = isActive;
    await user.save();

    await writeActivityLog({
      companyId: user.company,
      userId: req.user?.id,
      module: "super-admin",
      action: "USER_STATUS_CHANGED",
      entityType: "User",
      entityId: user._id,
      before: { isActive: !isActive },
      after: { isActive },
      meta: { targetUserId: user._id, targetEmail: user.email, targetRole: user.role },
      ipAddress: req.ip,
    });

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCompanySubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, subscriptionStatus, months, trialEndsAt } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Firma bulunamadi." });
    }

    if (typeof isActive === "boolean") {
      company.isActive = isActive;
    }

    if (subscriptionStatus) {
      const status = String(subscriptionStatus).toUpperCase();
      if (!["TRIAL", "ACTIVE", "PASSIVE"].includes(status)) {
        return res.status(400).json({ success: false, message: "Gecersiz abonelik durumu." });
      }

      if (status === "ACTIVE") {
        activatePaidSubscription(company, months || 1);
      } else {
        company.subscriptionStatus = status;
        if (status === "PASSIVE") {
          company.isActive = false;
        }
      }
    }

    if (trialEndsAt) {
      company.trialEndsAt = new Date(trialEndsAt);
    }

    await company.save();

    await writeActivityLog({
      companyId: company._id,
      userId: req.user?.id,
      module: "super-admin",
      action: "COMPANY_SUBSCRIPTION_UPDATE",
      entityType: "Company",
      entityId: company._id,
      after: {
        isActive: company.isActive,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt,
        subscriptionEndsAt: company.subscriptionEndsAt,
        lastPaymentAt: company.lastPaymentAt,
      },
      ipAddress: req.ip,
    });

    return res.json({ success: true, company });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const approveSuperAdmin = async (req, res) => {
  try {
    const { userId, approved = false } = req.body;
    const currentUserId = req.user?.id || req.user?._id;

    if (!userId || !approved) {
      return res.status(400).json({ success: false, message: "Onay bilgisi ve kullanıcı ID gerekli." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    const actor = await User.findById(currentUserId);
    if (!actor) {
      return res.status(403).json({ success: false, message: "İşlem yapan kullanıcı bulunamadı." });
    }

    const explicitApproval = canApproveSuperAdminSelf({ actor: { _id: actor._id }, target: { _id: targetUser._id }, approved: true });
    if (!explicitApproval) {
      return res.status(403).json({ success: false, message: "Sadece kendinizi Super Admin yapabilirsiniz. Diğer kullanıcılar otomatik atanamaz." });
    }

    const roleChangeAllowed = canAssignRole({ actor: { _id: actor._id }, target: { _id: targetUser._id }, newRole: "SUPER_ADMIN", approved: true });
    if (!roleChangeAllowed) {
      return res.status(403).json({ success: false, message: "SUPER_ADMIN rolü sadece kendinize onaylı şekilde atanabilir." });
    }

    targetUser.role = "SUPER_ADMIN";
    await targetUser.save();

    await writeActivityLog({
      companyId: targetUser.company,
      userId: targetUser._id,
      module: "super-admin",
      action: "SUPER_ADMIN_ASSIGNED",
      entityType: "User",
      entityId: targetUser._id,
      after: { role: targetUser.role },
      meta: { approvedBy: actor._id },
      ipAddress: req.ip,
    });

    return res.json({ success: true, user: targetUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const assignKnownSuperAdminByEmail = async (req, res) => {
  try {
    const targetEmail = String(req.body?.email || "").trim().toLowerCase();
    const expectedEmail = String(process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

    if (!targetEmail || !expectedEmail) {
      return res.status(400).json({ success: false, message: "Hedef e-posta ve SUPER_ADMIN_EMAIL ayarlanmalı." });
    }

    if (targetEmail !== expectedEmail) {
      return res.status(403).json({ success: false, message: "Sadece tanımlı yönetici hesabı güncellenebilir." });
    }

    if (process.env.NODE_ENV !== "production") {
      return res.status(403).json({ success: false, message: "Bu işlem yalnızca production ortamında çalıştırılabilir." });
    }

    const mongoUri = String(process.env.MONGO_URI || "").trim();
    if (!mongoUri || /your_username|your_password|your_cluster|localhost|127\.0\.0\.1/i.test(mongoUri)) {
      return res.status(400).json({ success: false, message: "Production MONGO_URI doğrulanamadı." });
    }

    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Hedef kullanıcı bulunamadı." });
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return res.json({ success: true, message: "Kullanıcı zaten SUPER_ADMIN.", user: targetUser });
    }

    targetUser.role = "SUPER_ADMIN";
    await targetUser.save();

    await writeActivityLog({
      companyId: targetUser.company,
      userId: targetUser._id,
      module: "super-admin",
      action: "SUPER_ADMIN_ASSIGNED",
      entityType: "User",
      entityId: targetUser._id,
      after: { role: targetUser.role },
      meta: { assignedBy: "backend-only-safe-route", targetEmail },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: "Hedef kullanıcı backend tarafında SUPER_ADMIN olarak güncellendi.", user: targetUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createSuperAdminNotice = async (req, res) => {
  try {
    const { message, severity } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Mesaj gerekli." });
    }

    await writeActivityLog({
      companyId: null,
      userId: req.user?.id,
      module: "super-admin",
      action: "ADMIN_NOTICE",
      entityType: "System",
      entityId: null,
      meta: { message, severity: severity || "warning" },
      ipAddress: req.ip,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOverview = async (req, res) => {
  try {
    const [
      companyCount,
      activeCompanyCount,
      passiveCompanyCount,
      userCount,
      recentActivities,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      Company.countDocuments({ isActive: false }),
      User.countDocuments(),
      ActivityLog.find({}).sort({ createdAt: -1 }).limit(50).populate("companyId", "companyName").populate("userId", "name email role"),
    ]);

    return res.json({
      success: true,
      stats: {
        companyCount,
        activeCompanyCount,
        passiveCompanyCount,
        userCount,
      },
      recentActivities,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOverview,
  listCompanies,
  listUsers,
  updateUserAccess,
  updateUserStatus,
  updateCompanySubscription,
  approveSuperAdmin,
  assignKnownSuperAdminByEmail,
  createSuperAdminNotice,
};