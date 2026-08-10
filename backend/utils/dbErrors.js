const isDuplicateKeyError = (error) => Boolean(error && (error.code === 11000 || error.code === 11001));

const getDuplicateFieldMessage = (error, fallback = "Bu değer zaten kullanılıyor.") => {
  const keyPattern = error?.keyPattern || error?.keyValue || {};
  const keys = Object.keys(keyPattern || {});

  if (keys.some((key) => String(key).toLowerCase().includes("email"))) {
    return "Bu e-posta zaten kayıtlı.";
  }

  if (keys.some((key) => String(key).toLowerCase().includes("username"))) {
    return "Bu kullanıcı adı zaten kayıtlı.";
  }

  return fallback;
};

module.exports = {
  isDuplicateKeyError,
  getDuplicateFieldMessage,
};
