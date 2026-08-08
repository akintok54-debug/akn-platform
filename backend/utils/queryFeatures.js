const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseListQuery = (query = {}) => {
  const page = Math.max(1, toNumber(query.page, 1));
  const limit = Math.min(100, Math.max(1, toNumber(query.limit, 20)));
  const skip = (page - 1) * limit;
  const sortBy = String(query.sortBy || "createdAt").trim();
  const sortDir = String(query.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;

  return {
    page,
    limit,
    skip,
    sort: { [sortBy]: sortDir },
  };
};

module.exports = { parseListQuery };
