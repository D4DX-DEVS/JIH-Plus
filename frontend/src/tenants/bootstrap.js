import axios from 'axios';

/**
 * Boot-time adapters that turn the JIH Portal bundle into a franchise portal.
 *
 * The JIH pages talk to `${VITE_API_URL}/api/...` and keep their session under
 * fixed localStorage keys. Instead of rewriting ~40 pages, a franchise installs
 * three adapters once, before React renders:
 *   1. axios + fetch rewrite `/api/` to the franchise API prefix,
 *   2. Storage keys are namespaced (`womens::adminToken`), so a master and a
 *      franchise login can coexist in one browser,
 *   3. the document title follows the franchise label.
 *
 * For the master portal this is a no-op: nothing is patched.
 */
const API_ROOT = import.meta.env.VITE_API_URL || '';

const makeApiRewriter = (tenant) => {
  const masterPrefix = `${API_ROOT}/api/`;
  const tenantPrefix = `${API_ROOT}${tenant.apiPrefix}/`;

  return (url) => {
    if (typeof url !== 'string' || url.startsWith(tenantPrefix)) return url;
    return url.startsWith(masterPrefix) ? `${tenantPrefix}${url.slice(masterPrefix.length)}` : url;
  };
};

const patchAxios = (rewrite) => {
  axios.interceptors.request.use((config) => {
    config.url = rewrite(config.url);
    return config;
  });
};

const patchFetch = (rewrite) => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') return originalFetch(rewrite(input), init);
    if (input instanceof URL) return originalFetch(rewrite(input.href), init);
    if (input instanceof Request) {
      const url = rewrite(input.url);
      return originalFetch(url === input.url ? input : new Request(url, input), init);
    }
    return originalFetch(input, init);
  };
};

const namespaceStorage = (tenant) => {
  const prefix = `${tenant.key}::`;
  const proto = Storage.prototype;
  const { getItem, setItem, removeItem } = proto;

  proto.getItem = function namespacedGetItem(key) {
    return getItem.call(this, `${prefix}${key}`);
  };
  proto.setItem = function namespacedSetItem(key, value) {
    return setItem.call(this, `${prefix}${key}`, value);
  };
  proto.removeItem = function namespacedRemoveItem(key) {
    return removeItem.call(this, `${prefix}${key}`);
  };
};

export const installTenantAdapters = (tenant) => {
  if (!tenant.isFranchise) return;
  if (window.__jihTenantAdapters === tenant.key) return; // HMR / double import guard
  window.__jihTenantAdapters = tenant.key;

  const rewrite = makeApiRewriter(tenant);
  patchAxios(rewrite);
  patchFetch(rewrite);
  namespaceStorage(tenant);
  document.title = tenant.label;
};
