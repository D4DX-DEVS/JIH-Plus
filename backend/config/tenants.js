require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { bindSchemasToConnection } = require('./tenantModel');

/**
 * Franchise registry for the JIH Portal.
 *
 * The JIH Portal code (routes, models, schedulers, pages) is written once and
 * served for every tenant listed here. Each tenant owns a MongoDB database and
 * an admin credential, and may override the JWT secret and the hierarchy
 * endpoints. Env variables are read as `<envPrefix>_<NAME>`; the default
 * tenant uses the unprefixed names (MONGODB_URI, ADMIN_EMAIL, ...).
 *
 * Adding a franchise: append an entry to FRANCHISES, add the matching entry to
 * frontend/src/tenants/registry.js and set <PREFIX>_MONGODB_URI,
 * <PREFIX>_ADMIN_EMAIL and <PREFIX>_ADMIN_PASSWORD in .env.
 * See docs/franchise-portals.md.
 */
const FRANCHISES = [
  { key: 'womens', envPrefix: 'JIH_WOMENS', label: 'JIH Womens Portal', apiPrefix: '/api/womens' }
];

const DEFAULT_DEFINITION = { key: 'jih', envPrefix: '', label: 'JIH Portal', apiPrefix: '/api' };

// Legacy hierarchy service the master portal falls back to when no endpoint is set.
const CENLOGIN_HIERARCHY = {
  district: 'https://cenloginbackend.d4dx.co/api/districts',
  area: 'https://cenloginbackend.d4dx.co/api/areas/district/{districtId}',
  unit: 'https://cenloginbackend.d4dx.co/api/units/area/{areaId}'
};

const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  bufferCommands: false,
  bufferTimeoutMS: 5000
};

const readEnv = (prefix, name) => process.env[prefix ? `${prefix}_${name}` : name];

const createFranchiseConnection = (tenant) => {
  if (!tenant.mongoUri) {
    console.warn(
      `${tenant.label} Mongo URI not set (${tenant.envPrefix}_MONGODB_URI). ` +
      `Starting with a disconnected connection; ${tenant.apiPrefix}/* will return 503.`
    );
    return mongoose.createConnection();
  }

  const connection = mongoose.createConnection(tenant.mongoUri, CONNECTION_OPTIONS);
  connection.on('connected', () => console.log(`Connected to ${tenant.label} MongoDB`));
  connection.on('error', (err) => console.error(`${tenant.label} MongoDB connection error:`, err));
  connection.on('disconnected', () => console.warn(`${tenant.label} MongoDB disconnected`));
  connection.on('reconnected', () => console.log(`${tenant.label} MongoDB reconnected`));
  return connection;
};

const buildTenant = ({ key, envPrefix, label, apiPrefix }) => {
  const isDefault = !envPrefix;
  const env = (name) => readEnv(envPrefix, name);

  const tenant = {
    key,
    envPrefix,
    label,
    apiPrefix,
    isDefault,
    mongoUri: env('MONGODB_URI'),
    adminEmail: env('ADMIN_EMAIL'),
    adminPassword: env('ADMIN_PASSWORD'),
    jwtSecret: env('JWT_SECRET') || process.env.JWT_SECRET,
    // External district/area/unit lists. A franchise without its own endpoints
    // is served from its location-master collections (utils/hierarchySource.js).
    hierarchy: {
      district: env('DISTRICT_API_ENDPOINT') || (isDefault ? CENLOGIN_HIERARCHY.district : ''),
      area: env('AREA_API_ENDPOINT') || (isDefault ? CENLOGIN_HIERARCHY.area : ''),
      unit: env('UNIT_API_ENDPOINT') || (isDefault ? CENLOGIN_HIERARCHY.unit : '')
    },
    connection: null,
    isReady() {
      return Boolean(this.connection) && this.connection.readyState === 1;
    }
  };

  // The default tenant rides on mongoose.connect() from server.js.
  tenant.connection = isDefault ? mongoose.connection : createFranchiseConnection(tenant);
  bindSchemasToConnection(tenant.connection);
  return tenant;
};

const defaultTenant = buildTenant(DEFAULT_DEFINITION);
const franchiseTenants = FRANCHISES.map(buildTenant);
const tenants = [defaultTenant, ...franchiseTenants];
const tenantsByKey = new Map(tenants.map((tenant) => [tenant.key, tenant]));

module.exports = {
  listTenants: () => tenants.slice(),
  listFranchises: () => franchiseTenants.slice(),
  getDefaultTenant: () => defaultTenant,
  getTenantByKey: (key) => tenantsByKey.get(key) || null
};
