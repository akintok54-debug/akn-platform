const test = require("node:test");
const assert = require("node:assert/strict");

const { hasModuleAccess, resolveModulePermissions } = require("../middleware/authorizationMiddleware");

test("SUPER_ADMIN bypasses module restrictions", () => {
  const result = hasModuleAccess({ user: { role: "SUPER_ADMIN" } }, "sales");
  assert.equal(result, true);
});

test("role-based fallback allows sales role only for sales-related modules", () => {
  const result = hasModuleAccess({ user: { role: "sales" } }, "settings");
  assert.equal(result, false);
});

test("permission profile grants module access when role fallback is restrictive", () => {
  const permissions = resolveModulePermissions({
    user: { role: "sales", permissionProfileId: "profile-1" },
    permissionProfile: { permissions: { sales: true, customers: true, products: false } },
  });

  assert.equal(permissions.sales, true);
  assert.equal(permissions.customers, true);
  assert.equal(permissions.products, false);
});
