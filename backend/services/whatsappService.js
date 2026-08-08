const normalizePhoneForWhatsApp = (rawValue) => {
  const cleaned = String(rawValue || "").replace(/[^\d]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("00")) return cleaned.slice(2);

  const countryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "90").replace(/[^\d]/g, "") || "90";

  if (cleaned.startsWith(countryCode)) return cleaned;
  if (cleaned.startsWith("0")) return `${countryCode}${cleaned.slice(1)}`;
  if (cleaned.length <= 10) return `${countryCode}${cleaned}`;

  return cleaned;
};

const sendViaMetaCloudApi = async ({ phone, message, mediaUrl }) => {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { sent: false, reason: "WHATSAPP_META_CONFIG_MISSING" };
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      mediaUrl
        ? {
            messaging_product: "whatsapp",
            to: phone,
            type: "document",
            document: {
              link: mediaUrl,
              caption: message,
              filename: "cari-hesap-ekstresi.pdf",
            },
          }
        : {
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: {
              body: message,
            },
          }
    ),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: data?.error?.message || "WHATSAPP_META_SEND_FAILED", raw: data };
  }

  return {
    sent: true,
    provider: "meta",
    providerMessageId: data?.messages?.[0]?.id || "",
    raw: data,
  };
};

const sendViaTwilio = async ({ phone, message, mediaUrl }) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !authToken || !fromNumber) {
    return { sent: false, reason: "TWILIO_CONFIG_MISSING" };
  }

  const toAddress = `whatsapp:+${phone}`;
  const fromAddress = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
  const body = new URLSearchParams({
    To: toAddress,
    From: fromAddress,
    Body: message,
  });
  if (mediaUrl) {
    body.append("MediaUrl", mediaUrl);
  }

  const auth = Buffer.from(`${sid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: data?.message || "TWILIO_SEND_FAILED", raw: data };
  }

  return {
    sent: true,
    provider: "twilio",
    providerMessageId: data?.sid || "",
    raw: data,
  };
};

const sendWhatsAppMessage = async ({ phone, message, mediaUrl }) => {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  if (!normalizedPhone) {
    return { sent: false, reason: "PHONE_MISSING", normalizedPhone: "" };
  }

  const provider = String(process.env.WHATSAPP_PROVIDER || "none").trim().toLowerCase();

  if (provider === "meta") {
    const result = await sendViaMetaCloudApi({ phone: normalizedPhone, message, mediaUrl });
    return { ...result, normalizedPhone };
  }

  if (provider === "twilio") {
    const result = await sendViaTwilio({ phone: normalizedPhone, message, mediaUrl });
    return { ...result, normalizedPhone };
  }

  return {
    sent: false,
    reason: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
    normalizedPhone,
  };
};

module.exports = {
  sendWhatsAppMessage,
  normalizePhoneForWhatsApp,
};
