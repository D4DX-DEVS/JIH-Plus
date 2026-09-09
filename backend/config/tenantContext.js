const { AsyncLocalStorage } = require('async_hooks');
const jwt = require('jsonwebtoken');

/**
 * Request-scoped tenant context for the JIH Portal franchises.
 *
 * Every JIH route file keeps using `require('../models/x')` and `X.find()`;
 * the model proxies (config/tenantModel.js) look up the current tenant here
 * to pick the right MongoDB connection. HTTP requests get their tenant from
 * `tenantMiddleware`, cron jobs use `runWithTenant`, and one-off scripts can
 * target a franchise with `JIH_TENANT=<key> node scripts/...`.
 */
const storage = new AsyncLocalStorage();

// Lazy to avoid a require cycle: tenants.js -> tenantModel.js -> this file.
const registry = () => require('./tenants');

const getTenant = () => {
  const active = storage.getStore();
  if (active) return active;

  const { getTenantByKey, getDefaultTenant } = registry();
  if (process.env.JIH_TENANT) {
    const tenant = getTenantByKey(process.env.JIH_TENANT);
    if (!tenant) {
      throw new Error(`Unknown JIH_TENANT "${process.env.JIH_TENANT}"`);
    }
    return tenant;
  }
  return getDefaultTenant();
};

const runWithTenant = (tenant, fn) => storage.run(tenant, fn);

const tenantMiddleware = (tenant) => (req, res, next) => {
  // The default /api mount is also the path every other portal's request
  // passes through, so only a franchise fails closed when unconfigured.
  if (!tenant.isDefault && !tenant.mongoUri) {
    return res.status(503).json({
      success: false,
      message: `${tenant.label} is not configured on this server`
    });
  }
  req.tenant = tenant;
  return storage.run(tenant, next);
};

/** jwt.sign with the tenant's secret and a `tenant` claim. */
const signTenantJwt = (payload, options) => {
  const tenant = getTenant();
  return jwt.sign({ ...payload, tenant: tenant.key }, tenant.jwtSecret, options);
};

/**
 * jwt.verify against the tenant that owns the request. A token minted by one
 * portal is rejected on every other portal, even though they may share a
 * secret. Tokens issued before franchises existed carry no claim and are
 * treated as belonging to the default tenant.
 */
const verifyTenantJwt = (token, req) => {
  const tenant = (req && req.tenant) || getTenant();
  const decoded = jwt.verify(token, tenant.jwtSecret);
  const claimed = decoded.tenant || registry().getDefaultTenant().key;
  if (claimed !== tenant.key) {
    const error = new Error('Token does not belong to this portal');
    error.name = 'TenantMismatchError';
    throw error;
  }
  return decoded;
};

module.exports = {
  getTenant,
  runWithTenant,
  tenantMiddleware,
  signTenantJwt,
  verifyTenantJwt
};
