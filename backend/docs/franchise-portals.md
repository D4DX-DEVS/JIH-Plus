# Franchise portals (JIH Portal clones)

The JIH Portal (routes under `/api/admin|user|master|area|district|unit|notifications|targets`,
pages under `/expansion-portal/login`, `/admin-dashboard`, `/district-dashboard/:id`, …) can be
served any number of times, each time against a different database and admin credential, without
copying a single page or route file. The first franchise is the **JIH Womens Portal**.

| | JIH Portal (master) | JIH Womens Portal |
|---|---|---|
| Tenant key | `jih` | `womens` |
| Frontend base path | `/` | `/womens` |
| API prefix | `/api/...` | `/api/womens/...` |
| Mongo URI | `MONGODB_URI` | `JIH_WOMENS_MONGODB_URI` |
| Admin login | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `JIH_WOMENS_ADMIN_EMAIL` / `JIH_WOMENS_ADMIN_PASSWORD` |
| JWT secret | `JWT_SECRET` | `JIH_WOMENS_JWT_SECRET` (optional, defaults to `JWT_SECRET`) |
| District/area/unit lists | external cenlogin service (`DISTRICT_API_ENDPOINT`, …) | own Location Master data, unless `JIH_WOMENS_*_API_ENDPOINT` is set |
| Browser storage keys | `adminToken`, `userToken`, … | `womens::adminToken`, `womens::userToken`, … |

Everything else (OpenAI, DigitalOcean Spaces, DXING WhatsApp, port) is shared.

## How it works

### Backend
- `config/tenants.js` — the registry. Builds one tenant object per entry (default + `FRANCHISES`),
  opens a mongoose connection per franchise (same options as the IHTHISABI/Members connections)
  and registers all JIH schemas on it.
- `config/tenantContext.js` — `AsyncLocalStorage` holding the active tenant. `tenantMiddleware`
  sets it per request (and returns 503 for a franchise with no Mongo URI); schedulers use
  `runWithTenant`; scripts can set `JIH_TENANT=<key>`. `signTenantJwt` / `verifyTenantJwt` add and
  check a `tenant` claim, so a token from one portal is rejected on every other portal.
- `config/tenantModel.js` — every JIH model file ends with
  `module.exports = require('../config/tenantModel').tenantModel('Name', schema)`. The export is a
  proxy that resolves to the active tenant's connection, so `User.find()` in any route just works.
- `utils/hierarchySource.js` — district/area/unit lists, external for the master, DB-backed for a
  franchise without endpoints.
- `server.js` mounts the single JIH router once per tenant, franchises first.

### Frontend
- `src/tenants/registry.js` — the registry (must match the backend keys/prefixes).
- `src/tenants/current.js` — resolves the tenant from the URL once per page load; `portalHref()`
  for the few hard redirects.
- `src/tenants/bootstrap.js` — for a franchise only: rewrites `/api/` → `/api/<key>/` on axios and
  fetch, namespaces `localStorage`/`sessionStorage` keys, sets the document title.
- `src/portal/JihPortalRoutes.jsx` — the JIH route tree and session hook, shared by
  `App.jsx` (master, at `/`) and `src/portal/FranchiseApp.jsx` (franchise, under its basename).
- The landing page renders one card per franchise.

## Smoke test (no database needed)

```bash
node scripts/smokeFranchise.js               # womens configured (fake URI)
node scripts/smokeFranchise.js unconfigured  # womens without a Mongo URI → 503 gate
```

Checks the registry, model proxies, tenant-claimed JWTs, per-tenant admin login and cross-tenant
token rejection against `server.js` booted with unreachable Mongo URIs.

## Adding another franchise

1. `backend/config/tenants.js` — add `{ key, envPrefix, label, apiPrefix }` to `FRANCHISES`.
2. `frontend/src/tenants/registry.js` — add the matching `{ key, basePath, apiPrefix, label, … }`.
3. `backend/.env` — set `<PREFIX>_MONGODB_URI`, `<PREFIX>_ADMIN_EMAIL`, `<PREFIX>_ADMIN_PASSWORD`.
4. Restart the backend, rebuild the frontend. The landing page shows the new card automatically.

## Bootstrapping a new franchise database

The database starts empty. Log in as the franchise admin at `/<basePath>/expansion-portal/login`,
open Location Master and create the state / districts / areas / units (their generated credentials
are what district, area and unit users log in with). Location Master transactions need a replica
set (MongoDB Atlas is fine). To bulk-load from JSON instead:

```bash
JIH_TENANT=womens node scripts/migrateLocationFromJson.js <file>
```

Any script that requires the JIH models runs against the master database unless `JIH_TENANT` is set.
