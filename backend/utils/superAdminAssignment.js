const buildSuperAdminCandidates = (users = [], superAdminEmail = "") => {
  const normalizedEmail = String(superAdminEmail || "").trim().toLowerCase();

  return users.map((user) => ({
    ...user,
    isSuggested: Boolean(normalizedEmail && String(user?.email || "").trim().toLowerCase() === normalizedEmail),
  }));
};

const canApproveSuperAdminSelf = ({ actor, target, approved = false }) => {
  if (!approved) return false;
  if (!actor || !target) return false;
  return String(actor._id || actor.id || "") === String(target._id || target.id || "");
};

const canAssignRole = ({ actor, target, newRole, approved = false }) => {
  if (!actor || !target) return false;

  if (newRole === "SUPER_ADMIN") {
    return canApproveSuperAdminSelf({ actor, target, approved });
  }

  return true;
};

module.exports = { buildSuperAdminCandidates, canApproveSuperAdminSelf, canAssignRole };
