const MODULE_DEFAULTS = {
  customers: true,
  suppliers: true,
  products: true,
  sales: true,
  invoices: true,
  accounting: false,
  reports: true,
  settings: false,
  cash: false,
  bank: false,
  inventory: true,
  approvePayments: false,
};

const ROLE_MODULE_ACCESS = {
  SUPER_ADMIN: () => true,
  owner: () => true,
  admin: () => true,
  manager: () => true,
  sales: (module) => ["customers", "products", "sales", "invoices", "reports", "inventory"].includes(module),
  cashier: (module) => ["sales", "cash", "invoices", "reports"].includes(module),
  accounting: (module) => ["accounting", "bank", "cash", "invoices", "reports"].includes(module),
  dealer: (module) => ["sales"].includes(module),
};

const getUserPermissions = (req) => {
  const user = req?.user || {};
  const profile = req?.permissionProfile || {};

  if (user.role === "SUPER_ADMIN") {
    return { ...MODULE_DEFAULTS, all: true };
  }

  const profilePermissions = profile?.permissions || {};
  const base = { ...MODULE_DEFAULTS, ...profilePermissions };

  if (user.permissionProfileId && profilePermissions && Object.keys(profilePermissions).length) {
    return base;
  }

  return base;
};

const resolveModulePermissions = (req) => {
  const user = req?.user || {};
  const permissions = getUserPermissions(req);

  if (user.role === "SUPER_ADMIN") {
    return permissions;
  }

  const roleAccess = ROLE_MODULE_ACCESS[user.role];
  if (roleAccess) {
    return Object.keys(MODULE_DEFAULTS).reduce((acc, module) => {
      acc[module] = roleAccess(module) && permissions[module] !== false;
      return acc;
    }, {});
  }

  return permissions;
};

const hasModuleAccess = (req, module) => {
  if (!module) return true;
  const permissions = resolveModulePermissions(req);
  return Boolean(permissions[module]);
};

module.exports = {
  MODULE_DEFAULTS,
  ROLE_MODULE_ACCESS,
  resolveModulePermissions,
  hasModuleAccess,
};
