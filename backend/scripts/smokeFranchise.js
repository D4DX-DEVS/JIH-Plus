/**
 * Franchise smoke test — no real database needed.
 *
 * Boots server.js against unreachable Mongo URIs and checks the tenant
 * plumbing: registry, model proxies, tenant-claimed JWTs, per-tenant admin
 * login, cross-tenant token rejection and the 503 gate for an unconfigured
 * franchise.
 *
 *   node scripts/smokeFranchise.js                # womens configured (fake URI)
 *   node scripts/smokeFranchise.js unconfigured   # womens without a Mongo URI
 */
const path = require('path');
const http = require('http');

const backendDir = path.resolve(__dirname, '..');
const backendRequire = require('module').createRequire(`${backendDir}/`);
process.chdir(backendDir);

const configured = process.argv[2] !== 'unconfigured';
Object.assign(process.env, {
  PORT: '34517',
  MONGODB_URI: 'mongodb://127.0.0.1:1/jih_smoke',
  IHTHISABI_MONGODB_URI: '',
  MEMBERS_MONGODB_URI: '',
  JWT_SECRET: 'smoke-secret',
  ADMIN_EMAIL: 'jih-admin@test',
  ADMIN_PASSWORD: 'jih-pass',
  JIH_WOMENS_MONGODB_URI: configured ? 'mongodb://127.0.0.1:1/womens_smoke' : '',
  JIH_WOMENS_ADMIN_EMAIL: 'womens-admin@test',
  JIH_WOMENS_ADMIN_PASSWORD: 'womens-pass',
  DISTRICT_API_ENDPOINT: '',
  AREA_API_ENDPOINT: '',
  UNIT_API_ENDPOINT: ''
});

const results = [];
const check = (name, ok, extra = '') => results.push([ok ? 'PASS' : 'FAIL', name, extra]);

const request = (method, url, { body, token } = {}) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request(`http://127.0.0.1:${process.env.PORT}${url}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }, (res) => {
    let text = '';
    res.on('data', (chunk) => { text += chunk; });
    res.on('end', () => {
      let json = null;
      try { json = JSON.parse(text); } catch (_) { /* not json */ }
      resolve({ status: res.statusCode, json, text });
    });
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

const decode = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

(async () => {
  // The fake URIs make mongoose log connection errors; keep the output readable.
  const originalError = console.error;
  console.error = (...args) => { if (!String(args[0]).includes('MongoDB')) originalError(...args); };

  require(path.join(backendDir, 'server.js'));
  await new Promise((resolve) => setTimeout(resolve, 800));

  const { listTenants, getTenantByKey, getDefaultTenant } = require(path.join(backendDir, 'config/tenants'));
  const { runWithTenant, signTenantJwt, verifyTenantJwt } = require(path.join(backendDir, 'config/tenantContext'));
  const mongoose = backendRequire('mongoose');
  const jwt = backendRequire('jsonwebtoken');
  const womens = getTenantByKey('womens');
  console.log(`\n=== franchise smoke: womens ${configured ? 'CONFIGURED' : 'NOT configured'} ===`);

  // Registry
  check('registry lists jih + womens', listTenants().map((t) => t.key).join(',') === 'jih,womens');
  check('womens creds come from JIH_WOMENS_*', womens.adminEmail === 'womens-admin@test' && womens.adminPassword === 'womens-pass');
  check('womens hierarchy is DB-backed (no external endpoints)', !womens.hierarchy.district && !womens.hierarchy.area && !womens.hierarchy.unit);
  check('jih hierarchy falls back to cenlogin', getDefaultTenant().hierarchy.district.includes('cenloginbackend'));

  // Model proxies
  const User = require(path.join(backendDir, 'models/user'));
  const Report = require(path.join(backendDir, 'models/report'));
  check('proxy: default context → default connection', User.db === mongoose.connection && User.modelName === 'User');
  runWithTenant(womens, () => {
    check('proxy: womens context → womens connection', User.db === womens.connection && User.db !== mongoose.connection);
    const doc = new Report({ title: 't', type: 'monthly' });
    check('proxy: `new Model()` binds to womens connection', doc.db === womens.connection && doc.constructor.modelName === 'Report');
    check('proxy: 14 JIH schemas registered on womens connection', Object.keys(womens.connection.models).length === 14, Object.keys(womens.connection.models).length);
    check('proxy: static query builder works', typeof User.find().exec === 'function');
  });
  const jihNames = Object.keys(womens.connection.models);
  check('proxy: same schemas registered on default connection', jihNames.every((name) => mongoose.connection.models[name]));

  // JWT claims
  const jihToken = signTenantJwt({ isAdmin: true, email: 'x' }, { expiresIn: '1h' });
  const womensToken = runWithTenant(womens, () => signTenantJwt({ isAdmin: true, email: 'y' }, { expiresIn: '1h' }));
  check('jwt: jih token carries tenant=jih', decode(jihToken).tenant === 'jih');
  check('jwt: womens token carries tenant=womens', decode(womensToken).tenant === 'womens');
  const rejects = (token, tenant) => { try { verifyTenantJwt(token, { tenant }); return false; } catch (e) { return e.name === 'TenantMismatchError'; } };
  check('jwt: womens token rejected on jih', rejects(womensToken, getDefaultTenant()));
  const legacy = jwt.sign({ isAdmin: true }, 'smoke-secret');
  check('jwt: legacy token (no claim) still valid on jih', verifyTenantJwt(legacy, { tenant: getDefaultTenant() }).isAdmin === true);
  check('jwt: legacy token rejected on womens', rejects(legacy, womens));

  // HTTP
  let r = await request('GET', '/api/health');
  check('GET /api/health → 200', r.status === 200, r.status);
  r = await request('POST', '/api/admin/login', { body: { email: 'jih-admin@test', password: 'nope' } });
  check('POST /api/admin/login wrong password → 401', r.status === 401, r.status);
  r = await request('POST', '/api/admin/login', { body: { email: 'jih-admin@test', password: 'jih-pass' } });
  check('POST /api/admin/login → 200 with tenant=jih token', r.status === 200 && decode(r.json.token).tenant === 'jih', r.status);
  const jihHttpToken = r.json && r.json.token;
  r = await request('GET', '/api/admin/profile', { token: jihHttpToken });
  check('GET /api/admin/profile (jih token) → 200', r.status === 200, r.status);

  r = await request('POST', '/api/womens/admin/login', { body: { email: 'womens-admin@test', password: 'womens-pass' } });
  if (!configured) {
    check('POST /api/womens/admin/login (unconfigured) → 503', r.status === 503, `${r.status} ${r.text}`);
    r = await request('GET', '/api/womens/admin/profile', { token: jihHttpToken });
    check('GET /api/womens/* (unconfigured) → 503 even with a token', r.status === 503, r.status);
  } else {
    check('POST /api/womens/admin/login → 200 with tenant=womens token', r.status === 200 && decode(r.json.token).tenant === 'womens', `${r.status} ${r.text}`);
    const womensHttpToken = r.json && r.json.token;
    r = await request('POST', '/api/womens/admin/login', { body: { email: 'jih-admin@test', password: 'jih-pass' } });
    check('POST /api/womens/admin/login with JIH creds → 401', r.status === 401, r.status);
    r = await request('GET', '/api/womens/admin/profile', { token: womensHttpToken });
    check('GET /api/womens/admin/profile (womens token) → 200', r.status === 200, r.status);
    r = await request('GET', '/api/womens/admin/profile', { token: jihHttpToken });
    check('GET /api/womens/admin/profile (jih token) → 401', r.status === 401, r.status);
    r = await request('GET', '/api/admin/profile', { token: womensHttpToken });
    check('GET /api/admin/profile (womens token) → 401', r.status === 401, r.status);
    r = await request('GET', '/api/womens/notifications/unread-count', { token: womensHttpToken });
    check('unifiedAuth on /api/womens/* accepts womens token', r.status !== 401 && r.status !== 404, r.status);
    r = await request('GET', '/api/notifications/unread-count', { token: womensHttpToken });
    check('unifiedAuth on /api/* rejects womens token → 401', r.status === 401, r.status);
    r = await request('GET', '/api/womens/user/hierarchy/districts');
    check('GET /api/womens/user/hierarchy/districts uses DB fallback (fails fast without DB)', r.status === 500, r.status);
    r = await request('POST', '/api/womens/user/sync-hierarchy', { token: womensHttpToken });
    check('POST /api/womens/user/sync-hierarchy → 400 (no external hierarchy)', r.status === 400, r.status);
  }
  r = await request('POST', '/api/auth/unified-login', { body: {} });
  check('IHTHISABI /api/auth/unified-login still routed (not 404)', r.status !== 404, r.status);
  r = await request('GET', '/api/nope');
  check('unknown /api route → 404', r.status === 404, r.status);

  console.log(results.map(([status, name, extra]) => `${status}  ${name}${status === 'FAIL' && extra !== '' ? `   [${extra}]` : ''}`).join('\n'));
  const failed = results.filter(([status]) => status === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error('SMOKE CRASH', error);
  process.exit(2);
});
