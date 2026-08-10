const Company = require("../models/company");

const TRIAL_DAYS = 30;
const MONTHLY_PRICE = 2500;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const shouldDisableForExpiration = (company, now = new Date()) => {
  if (!company) return false;

  if (company.subscriptionStatus === "TRIAL") {
    return Boolean(company.trialEndsAt && new Date(company.trialEndsAt) < now);
  }

  if (company.subscriptionStatus === "ACTIVE") {
    return Boolean(company.subscriptionEndsAt && new Date(company.subscriptionEndsAt) < now);
  }

  return company.subscriptionStatus === "PASSIVE";
};

const normalizeCompanySubscription = async (companyDoc) => {
  if (!companyDoc) {
    return { allowed: false, reason: "COMPANY_NOT_FOUND" };
  }

  const now = new Date();

  if (shouldDisableForExpiration(companyDoc, now)) {
    if (companyDoc.subscriptionStatus !== "PASSIVE" || companyDoc.isActive !== false) {
      companyDoc.subscriptionStatus = "PASSIVE";
      companyDoc.isActive = false;
      await companyDoc.save();
    }
  }

  if (!companyDoc.isActive || companyDoc.subscriptionStatus === "PASSIVE") {
    return { allowed: false, reason: "PASSIVE_COMPANY", company: companyDoc };
  }

  return { allowed: true, reason: "OK", company: companyDoc };
};

const buildTrialSubscription = () => ({
  isActive: true,
  subscriptionStatus: "TRIAL",
  trialStartedAt: new Date(),
  trialEndsAt: addDays(new Date(), TRIAL_DAYS),
  monthlyPrice: MONTHLY_PRICE,
  lastPaymentAt: null,
  subscriptionStartedAt: null,
  subscriptionEndsAt: null,
});

const activatePaidSubscription = (companyDoc, months = 1) => {
  const start = new Date();
  const end = addDays(start, 30 * Math.max(1, Number(months) || 1));

  companyDoc.subscriptionStatus = "ACTIVE";
  companyDoc.isActive = true;
  companyDoc.lastPaymentAt = start;
  companyDoc.subscriptionStartedAt = start;
  companyDoc.subscriptionEndsAt = end;
};

module.exports = {
  TRIAL_DAYS,
  MONTHLY_PRICE,
  buildTrialSubscription,
  normalizeCompanySubscription,
  activatePaidSubscription,
};