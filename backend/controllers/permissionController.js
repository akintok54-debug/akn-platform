const PermissionProfile = require('../models/PermissionProfile');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const ROLE_OPTIONS = ['owner', 'admin', 'manager', 'sales', 'cashier', 'accounting', 'dealer'];

exports.getProfiles = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const profiles = await PermissionProfile.find({ companyId }).sort({ createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const users = await User.find({ company: companyId }).select('name email userName role customerId permissionProfileId').populate('permissionProfileId').populate('customerId', 'customerCode companyName name');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const profile = await PermissionProfile.create({ companyId, ...req.body });
    res.status(201).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const profile = await PermissionProfile.findOneAndUpdate({ _id: req.params.id, companyId }, req.body, { new: true });
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignProfileToUser = async (req, res) => {
  try {
    const { userId, profileId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    user.permissionProfileId = profileId;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoleOptions = async (req, res) => {
  try {
    res.json({ success: true, roles: ROLE_OPTIONS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const { name, email, userName, password, role, customerId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Ad ve e-posta zorunludur.' });
    }

    const normalizedRole = ROLE_OPTIONS.includes(role) ? role : 'sales';
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedRole === 'dealer' && !customerId) {
      return res.status(400).json({ success: false, message: 'Bayi kullanicisi icin musteri secimi zorunludur.' });
    }

    const exists = await User.findOne({ company: companyId, email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Bu e-posta zaten kayıtlı.' });
    }

    const normalizedUserName = String(userName || normalizedEmail).trim().toLowerCase();
    const existingUserName = await User.findOne({ company: companyId, userName: normalizedUserName });
    if (existingUserName) {
      return res.status(400).json({ success: false, message: 'Bu kullanici adi zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(String(password || '123456'), 10);
    const user = await User.create({
      company: companyId,
      name: String(name).trim(),
      email: normalizedEmail,
      userName: normalizedUserName,
      password: hashedPassword,
      role: normalizedRole,
      customerId: normalizedRole === 'dealer' ? customerId || null : null,
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const { id } = req.params;
    const { role, isActive, customerId, userName } = req.body;

    const updatePayload = {};
    if (role && ROLE_OPTIONS.includes(role)) updatePayload.role = role;
    if (typeof isActive === 'boolean') updatePayload.isActive = isActive;
    if (typeof customerId !== 'undefined') updatePayload.customerId = customerId || null;
    if (typeof userName !== 'undefined') updatePayload.userName = String(userName || '').trim().toLowerCase();

    const user = await User.findOneAndUpdate(
      { _id: id, company: companyId },
      updatePayload,
      { new: true }
    ).select('name email userName role customerId isActive permissionProfileId').populate('customerId', 'customerCode companyName name');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
