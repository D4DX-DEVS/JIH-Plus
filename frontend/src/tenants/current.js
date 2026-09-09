import { resolveTenant } from './registry';

// Which portal this page load belongs to. A franchise lives under its own base
// path, so the decision is made once from the URL and never changes while the
// page is open (switching portals is a full navigation from the landing page).
export const currentTenant = resolveTenant(
  typeof window !== 'undefined' ? window.location.pathname : ''
);

/**
 * Absolute href inside the current portal, for the few hard redirects
 * (`window.location.href = ...`) that bypass the router and would otherwise
 * escape a franchise basename.
 */
export const portalHref = (path) => `${currentTenant.basePath}${path}`;
