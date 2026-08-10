const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSuperAdminCandidates, canApproveSuperAdminSelf, canAssignRole } = require("../utils/superAdminAssignment");

test("buildSuperAdminCandidates marks matching email as suggested but does not change role", () => {
  const candidates = buildSuperAdminCandidates(
    [
      { _id: "u1", name: "Owner User", email: "owner@example.com", role: "owner" },
      { _id: "u2", name: "Admin User", email: "admin@example.com", role: "admin" },
    ],
    "admin@example.com"
  );

  assert.equal(candidates[1].isSuggested, true);
  assert.equal(candidates[0].isSuggested, false);
  assert.equal(candidates[1].role, "admin");
});

test("self-approval is allowed only for the same user and explicit confirmation", () => {
  const actor = { _id: "u1", role: "owner" };
  const target = { _id: "u1", role: "owner" };
  assert.equal(canApproveSuperAdminSelf({ actor, target, approved: true }), true);
  assert.equal(canApproveSuperAdminSelf({ actor, target, approved: false }), false);
  assert.equal(canApproveSuperAdminSelf({ actor: { _id: "u2", role: "owner" }, target, approved: true }), false);
});

test("SUPER_ADMIN role can only be assigned to the same user after explicit approval", () => {
  assert.equal(canAssignRole({ actor: { _id: "u1" }, target: { _id: "u1" }, newRole: "SUPER_ADMIN", approved: true }), true);
  assert.equal(canAssignRole({ actor: { _id: "u1" }, target: { _id: "u2" }, newRole: "SUPER_ADMIN", approved: true }), false);
  assert.equal(canAssignRole({ actor: { _id: "u1" }, target: { _id: "u1" }, newRole: "admin", approved: true }), true);
  assert.equal(canAssignRole({ actor: { _id: "u1" }, target: { _id: "u1" }, newRole: "SUPER_ADMIN", approved: false }), false);
});
