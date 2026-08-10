const getCompanyId = (req) => req?.user?.company || req?.user?.companyId || null;

const isSuperAdmin = (req) => req?.user?.role === "SUPER_ADMIN";

const getTenantFieldFromModel = (Model) => {
  if (!Model?.schema?.path) return null;
  if (Model.schema.path("company")) return "company";
  if (Model.schema.path("companyId")) return "companyId";
  return null;
};

const buildTenantFilter = ({ req, Model, baseFilter = {}, companyId, superAdminBypass = false }) => {
  const resolvedCompanyId = companyId || getCompanyId(req);
  const filter = { ...baseFilter };

  if (superAdminBypass && isSuperAdmin(req)) {
    return filter;
  }

  const field = getTenantFieldFromModel(Model);
  if (!field || !resolvedCompanyId) {
    return filter;
  }

  return { ...filter, [field]: resolvedCompanyId };
};

module.exports = {
  getCompanyId,
  isSuperAdmin,
  getTenantFieldFromModel,
  buildTenantFilter,
};