const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCompanyId,
  isSuperAdmin,
  buildTenantFilter,
} = require("../utils/tenantScope");

const {
  normalizeCompanySubscription,
  buildTrialSubscription,
} = require("../services/subscriptionService");

const createMockModel = (paths) => ({
  schema: {
    path: (key) => Boolean(paths.includes(key)),
  },
});

test("tenant helper resolves company id from both token fields", () => {
  assert.equal(getCompanyId({ user: { company: "cmp-a" } }), "cmp-a");
  assert.equal(getCompanyId({ user: { companyId: "cmp-b" } }), "cmp-b");
  assert.equal(getCompanyId({ user: {} }), null);
});

test("tenant helper recognizes super admin", () => {
  assert.equal(isSuperAdmin({ user: { role: "SUPER_ADMIN" } }), true);
  assert.equal(isSuperAdmin({ user: { role: "admin" } }), false);
});

test("buildTenantFilter uses company field when model has company", () => {
  const model = createMockModel(["company"]);
  const filter = buildTenantFilter({
    req: { user: { company: "cmp1" } },
    Model: model,
    baseFilter: { active: true },
  });

  assert.deepEqual(filter, { active: true, company: "cmp1" });
});

test("buildTenantFilter uses companyId field when model has companyId", () => {
  const model = createMockModel(["companyId"]);
  const filter = buildTenantFilter({
    req: { user: { companyId: "cmp2" } },
    Model: model,
    baseFilter: { status: "ACTIVE" },
  });

  assert.deepEqual(filter, { status: "ACTIVE", companyId: "cmp2" });
});

test("buildTenantFilter bypasses tenant filter for super admin when enabled", () => {
  const model = createMockModel(["companyId"]);
  const filter = buildTenantFilter({
    req: { user: { role: "SUPER_ADMIN", companyId: "cmp2" } },
    Model: model,
    baseFilter: { status: "ACTIVE" },
    superAdminBypass: true,
  });

  assert.deepEqual(filter, { status: "ACTIVE" });
});

test("buildTrialSubscription returns 30-day trial defaults", () => {
  const trial = buildTrialSubscription();
  assert.equal(trial.subscriptionStatus, "TRIAL");
  assert.equal(trial.isActive, true);
  assert.equal(trial.monthlyPrice, 2500);
  assert.ok(new Date(trial.trialEndsAt).getTime() > new Date(trial.trialStartedAt).getTime());
});

test("normalizeCompanySubscription expires trial and deactivates company", async () => {
  let saved = false;
  const companyDoc = {
    subscriptionStatus: "TRIAL",
    isActive: true,
    trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    save: async () => {
      saved = true;
    },
  };

  const result = await normalizeCompanySubscription(companyDoc);

  assert.equal(saved, true);
  assert.equal(companyDoc.subscriptionStatus, "PASSIVE");
  assert.equal(companyDoc.isActive, false);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "PASSIVE_COMPANY");
});

test("normalizeCompanySubscription keeps active company allowed", async () => {
  const companyDoc = {
    subscriptionStatus: "ACTIVE",
    isActive: true,
    subscriptionEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    save: async () => {},
  };

  const result = await normalizeCompanySubscription(companyDoc);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "OK");
});
