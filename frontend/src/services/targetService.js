import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const authHeaders = () => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || '';
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ─── Admin (State) ───────────────────────────────────────────────────────────

export const createTarget = (data) =>
  axios.post(`${API_BASE}/api/targets`, data, authHeaders()).then(r => r.data);

/**
 * @param {{ title: string, description?: string, districts: Array<{districtId: string, targetCount: number}> }} data
 */
export const bulkCreateTargets = (data) =>
  axios.post(`${API_BASE}/api/targets/bulk`, data, authHeaders()).then(r => r.data);

export const deleteTarget = (id) =>
  axios.delete(`${API_BASE}/api/targets/${id}`, authHeaders()).then(r => r.data);

// ─── All roles ───────────────────────────────────────────────────────────────

export const listTargets = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return axios.get(`${API_BASE}/api/targets${qs ? `?${qs}` : ''}`, authHeaders()).then(r => r.data);
};

export const getTarget = (id) =>
  axios.get(`${API_BASE}/api/targets/${id}`, authHeaders()).then(r => r.data);

// ─── District ────────────────────────────────────────────────────────────────

/**
 * @param {string} id - Target ID
 * @param {'equal'|'custom'} mode
 * @param {Array<{areaId: string, allocatedCount: number}>} [customAllocations]
 */
export const allocateToAreas = (id, mode, customAllocations = []) =>
  axios.post(
    `${API_BASE}/api/targets/${id}/allocate-areas`,
    { mode, customAllocations },
    authHeaders()
  ).then(r => r.data);

// ─── Area ────────────────────────────────────────────────────────────────────

/**
 * @param {string} id - Target ID
 * @param {'equal'|'custom'} mode
 * @param {Array<{unitId: string, allocatedCount: number}>} [customAllocations]
 */
export const allocateToUnits = (id, mode, customAllocations = []) =>
  axios.post(
    `${API_BASE}/api/targets/${id}/allocate-units`,
    { mode, customAllocations },
    authHeaders()
  ).then(r => r.data);

// ─── Unit ────────────────────────────────────────────────────────────────────

export const submitCount = (id, submittedCount) =>
  axios.put(
    `${API_BASE}/api/targets/${id}/submit`,
    { submittedCount },
    authHeaders()
  ).then(r => r.data);
