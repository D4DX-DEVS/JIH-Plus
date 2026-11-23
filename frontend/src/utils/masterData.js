import { useEffect, useState } from 'react';
import axios from 'axios';
import { api as membersApi, applicantApi } from './members/api';

/**
 * Master-data ("masterdata") dropdown fields for the shared form builder and
 * renderer. The field stores which level it lists (`masterSource`) and,
 * optionally, another masterdata field it is narrowed by (`masterParentField`):
 * an Area dropdown linked to a District dropdown lists only that district's
 * areas. The answer is stored as the plain name, like any other dropdown.
 *
 * The builder and renderer are shared by every portal, so the portal (and with
 * it the API and the levels on offer) is read from the page URL.
 */

export const MASTER_LEVELS = {
  mekhala: { label: 'Mekhala', plural: 'mekhalas' },
  district: { label: 'District', plural: 'districts' },
  area: { label: 'Area', plural: 'areas' },
  unit: { label: 'Unit', plural: 'units' },
};

// Top to bottom; a level can only be narrowed by a level above it.
const HIERARCHY = ['mekhala', 'district', 'area', 'unit'];

const PORTAL_LEVELS = {
  jih: ['district', 'area', 'unit'], // also franchises such as /womens
  ihthisabi: ['mekhala', 'district', 'area', 'unit'],
  members: ['mekhala', 'district', 'area', 'unit'],
};

const currentPortal = () => {
  const path = window.location.pathname;
  if (path.startsWith('/ihthisabi')) return 'ihthisabi';
  if (path.startsWith('/members')) return 'members';
  return 'jih';
};

export const masterLevelsForPortal = () => PORTAL_LEVELS[currentPortal()];

export const masterLevelLabel = (source) => MASTER_LEVELS[source]?.label || source || '';

export const isAncestorLevel = (upper, lower) => {
  const u = HIERARCHY.indexOf(upper);
  const l = HIERARCHY.indexOf(lower);
  return u !== -1 && l !== -1 && u < l;
};

const API_ROOT = import.meta.env.VITE_API_URL || '';

const request = (portal, source) => {
  const path = `/form-master-data/${encodeURIComponent(source)}`;
  if (portal === 'ihthisabi') return axios.get(`${API_ROOT}/api/location${path}`);
  if (portal === 'members') {
    // The public application form signs in with the applicant token.
    const client = window.location.pathname.startsWith('/members/apply') ? applicantApi : membersApi;
    return client.get(path);
  }
  // JIH; a franchise's boot adapters rewrite /api/ to its own prefix.
  return axios.get(`${API_ROOT}/api${path}`);
};

// One request per list, shared by every field that shows it; refreshed after a
// few minutes so a location added in Master Data shows up without a reload.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

const loadMasterData = (source) => {
  const portal = currentPortal();
  const key = `${portal}:${source}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const promise = request(portal, source)
    .then((res) => res.data?.data || [])
    .catch((err) => {
      cache.delete(key);
      throw err;
    });
  cache.set(key, { promise, at: Date.now() });
  return promise;
};

/** Entries of one master-data level; pass a falsy source to load nothing. */
export function useMasterData(source) {
  const [state, setState] = useState({ items: [], loading: Boolean(source), error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!source) {
      setState({ items: [], loading: false, error: '' });
      return undefined;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    loadMasterData(source)
      .then((items) => live && setState({ items, loading: false, error: '' }))
      .catch((err) => live && setState({
        items: [],
        loading: false,
        error: err?.response?.data?.message || 'Could not load the list',
      }));
    return () => { live = false; };
  }, [source, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/**
 * Names to offer, keeping only entries under every chosen parent
 * (`scope` = { district: 'Kozhikode', ... }). Names repeat across parents, so
 * the list is de-duplicated.
 */
export const masterOptionNames = (items, scope = {}) => {
  const levels = Object.entries(scope);
  const names = new Set();
  items.forEach((item) => {
    if (levels.every(([level, value]) => (item[level] || '') === value)) names.add(item.name);
  });
  return [...names];
};

/**
 * Where a masterdata field stands in the form being filled: `values` holds
 * the chosen value of each linked parent up the chain, and `waitingFor` is the
 * direct parent field while it is still empty.
 */
export const masterScopeFor = (field, fieldsById, formData) => {
  const values = {};
  let waitingFor = null;
  const seen = new Set([field.id]);
  let parentId = field.masterParentField;

  while (parentId != null && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = fieldsById.get(parentId);
    if (!parent || parent.type !== 'masterdata' || !parent.masterSource) break;
    const value = formData[`field_${parent.id}`];
    if (value === undefined || value === null || value === '') {
      if (parentId === field.masterParentField) waitingFor = parent;
    } else {
      values[parent.masterSource] = value;
    }
    parentId = parent.masterParentField;
  }
  return { values, waitingFor };
};

/** Ids of the masterdata fields narrowed (directly or not) by `fieldId`. */
export const masterDependentIds = (fieldId, allFields) => {
  const found = [];
  const queue = [fieldId];
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    allFields.forEach((f) => {
      if (f.type === 'masterdata' && f.masterParentField === id && !seen.has(f.id)) {
        seen.add(f.id);
        found.push(f.id);
        queue.push(f.id);
      }
    });
  }
  return found;
};
