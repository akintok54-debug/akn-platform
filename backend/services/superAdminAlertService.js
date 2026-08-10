const nodemailer = require("nodemailer");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendWhatsAppMessage } = require("./whatsappService");

let smtpTransporter = null;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const getCompanyId = (...values) => {
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string") return value;
    if (value._id) return String(value._id);
  }
  return "";
};

const getSmtpTransporter = () => {
  if (smtpTransporter) return smtpTransporter;

  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASSWORD || "").trim();

  if (!host || !port || !user || !pass) {
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
};

const sendSuperAdminEmail = async ({ recipients, subject, text }) => {
  const transporter = getSmtpTransporter();
  if (!transporter || !recipients.length) {
    return { sent: false, reason: !recipients.length ? "NO_RECIPIENT" : "SMTP_NOT_CONFIGURED" };
  }

  const fromAddress = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  if (!fromAddress) {
    return { sent: false, reason: "SMTP_FROM_MISSING" };
  }

  await transporter.sendMail({
    from: fromAddress,
    to: recipients.join(","),
    subject,
    text,
  });

  return { sent: true };
};

const notifySuperAdminsForAuthEvent = async ({ eventType, actorUser, company, ipAddress }) => {
  const normalizedEvent = String(eventType || "AUTH_EVENT").trim().toUpperCase();
  const companyName = company?.companyName || actorUser?.company?.companyName || "Bilinmeyen Firma";
  const actorName = actorUser?.name || "Bilinmeyen Kullanici";
  const actorEmail = normalizeEmail(actorUser?.email || "");
  const occurredAt = new Date();

  const superAdmins = await User.find({ role: "SUPER_ADMIN", isActive: true })
    .select("_id name email company")
    .lean();

  const emailRecipients = [
    ...superAdmins.map((item) => normalizeEmail(item.email)),
    normalizeEmail(process.env.SUPER_ADMIN_EMAIL || ""),
  ].filter(Boolean);

  const uniqueEmails = [...new Set(emailRecipients)];
  const title = `Auth olayi: ${normalizedEvent}`;
  const message = [
    `Sistem auth olayi olustu: ${normalizedEvent}`,
    `Firma: ${companyName}`,
    `Kullanici: ${actorName}`,
    `E-posta: ${actorEmail || "-"}`,
    `IP: ${ipAddress || "-"}`,
    `Tarih: ${occurredAt.toISOString()}`,
  ].join("\n");

  const notificationCreates = superAdmins
    .map((adminUser) => {
      const companyId = getCompanyId(adminUser.company, actorUser?.company, company?._id, company);
      if (!companyId) return null;

      return Notification.create({
        companyId,
        userId: adminUser._id,
        type: "AUTH_EVENT",
        title,
        message,
        priority: "HIGH",
        sourceModule: "auth",
      });
    })
    .filter(Boolean);

  const [emailResult, phoneResult, notificationResult] = await Promise.all([
    sendSuperAdminEmail({
      recipients: uniqueEmails,
      subject: `[AKN] ${title}`,
      text: message,
    }).catch((error) => ({ sent: false, reason: error.message || "EMAIL_FAILED" })),
    sendWhatsAppMessage({
      phone: String(process.env.SUPER_ADMIN_ALERT_PHONE || "05051875403"),
      message,
    }).catch((error) => ({ sent: false, reason: error.message || "PHONE_ALERT_FAILED" })),
    Promise.all(notificationCreates),
  ]);

  return {
    success: true,
    eventType: normalizedEvent,
    emailResult,
    phoneResult,
    notificationCount: (notificationResult || []).length,
    superAdminCount: superAdmins.length,
  };
};

module.exports = {
  notifySuperAdminsForAuthEvent,
};