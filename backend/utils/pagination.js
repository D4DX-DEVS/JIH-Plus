const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Parse page/limit query params into a safe { page, limit, skip } triple.
// limit is clamped to [1, MAX_LIMIT] so callers can't request unbounded pages.
const parsePagination = (query = {}, defaultLimit = DEFAULT_LIMIT) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  current: page,
  pages: Math.max(Math.ceil(total / limit), 1),
  total,
  limit,
  hasNext: page * limit < total,
  hasPrev: page > 1
});

module.exports = { parsePagination, buildPaginationMeta, DEFAULT_LIMIT, MAX_LIMIT };
