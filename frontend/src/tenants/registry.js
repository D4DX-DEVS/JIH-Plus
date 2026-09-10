/**
 * Franchise registry for the JIH Portal (frontend half).
 *
 * Mirror of backend/config/tenants.js: `key`, `basePath` and `apiPrefix` must
 * match the backend entry. A franchise is the JIH Portal rendered under its
 * own router basename, talking to its own API prefix and keeping its tokens
 * under its own storage namespace (see bootstrap.js). Nothing else changes.
 *
 * Adding a franchise: append an entry here, add the backend entry and set
 * <PREFIX>_MONGODB_URI / ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env.
 */
export const DEFAULT_TENANT = Object.freeze({
  key: 'jih',
  basePath: '',
  apiPrefix: '/api',
  label: 'JIH Portal',
  isFranchise: false,
});

export const FRANCHISES = Object.freeze([
  Object.freeze({
    key: 'womens',
    basePath: '/womens',
    apiPrefix: '/api/womens',
    label: 'JIH Womens Portal',
    description: 'Womens wing district, area and unit management',
    accent: 'rose',
    isFranchise: true,
  }),
]);

export const resolveTenant = (pathname) => {
  const path = pathname || '';
  return (
    FRANCHISES.find((tenant) => path === tenant.basePath || path.startsWith(`${tenant.basePath}/`)) ||
    DEFAULT_TENANT
  );
};
