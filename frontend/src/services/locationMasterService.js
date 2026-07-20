import axios from 'axios';

const BASE = `${import.meta.env.VITE_API_URL}/api/master`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
});

// ── States ────────────────────────────────────────────────────────────────────
// Returns all states (no pagination) – used for dropdowns
export const getStates = () =>
  axios.get(`${BASE}/states`, authHeaders()).then((r) => r.data.data);

// Returns paginated states for the table listing
export const getStatesPaginated = ({ page = 1, limit = 20, search } = {}) => {
  const params = { page, limit };
  if (search) params.search = search;
  return axios
    .get(`${BASE}/states`, { ...authHeaders(), params })
    .then((r) => ({ data: r.data.data, pagination: r.data.pagination }));
};

export const createState = (name) =>
  axios.post(`${BASE}/states`, { name }, authHeaders()).then((r) => r.data.data);

export const updateState = (id, name) =>
  axios.put(`${BASE}/states/${id}`, { name }, authHeaders()).then((r) => r.data.data);

export const deleteState = (id) =>
  axios.delete(`${BASE}/states/${id}`, authHeaders()).then((r) => r.data);

// ── Districts ─────────────────────────────────────────────────────────────────
// Returns all districts (no pagination) – used for dropdowns
export const getDistricts = (stateId) =>
  axios
    .get(`${BASE}/districts`, { ...authHeaders(), params: stateId ? { stateId } : {} })
    .then((r) => r.data.data);

// Returns paginated districts for the table listing
export const getDistrictsPaginated = ({ stateId, page = 1, limit = 20, search } = {}) => {
  const params = { page, limit };
  if (stateId) params.stateId = stateId;
  if (search) params.search = search;
  return axios
    .get(`${BASE}/districts`, { ...authHeaders(), params })
    .then((r) => ({ data: r.data.data, pagination: r.data.pagination }));
};

export const createDistrict = (name, stateId) =>
  axios.post(`${BASE}/districts`, { name, stateId }, authHeaders()).then((r) => r.data);

export const updateDistrict = (id, name) =>
  axios.put(`${BASE}/districts/${id}`, { name }, authHeaders()).then((r) => r.data.data);

export const resetDistrictPassword = (id) =>
  axios.post(`${BASE}/districts/${id}/reset-password`, {}, authHeaders()).then((r) => r.data);

export const deleteDistrict = (id) =>
  axios.delete(`${BASE}/districts/${id}`, authHeaders()).then((r) => r.data);

// ── Areas ─────────────────────────────────────────────────────────────────────
// Returns all areas (no pagination) – used for dropdowns
export const getAreas = (districtId) =>
  axios
    .get(`${BASE}/areas`, { ...authHeaders(), params: districtId ? { districtId } : {} })
    .then((r) => r.data.data);

// Returns paginated areas for the table listing
export const getAreasPaginated = ({ districtId, page = 1, limit = 20, search } = {}) => {
  const params = { page, limit };
  if (districtId) params.districtId = districtId;
  if (search) params.search = search;
  return axios
    .get(`${BASE}/areas`, { ...authHeaders(), params })
    .then((r) => ({ data: r.data.data, pagination: r.data.pagination }));
};

export const createArea = (name, districtId) =>
  axios.post(`${BASE}/areas`, { name, districtId }, authHeaders()).then((r) => r.data);

export const updateArea = (id, name) =>
  axios.put(`${BASE}/areas/${id}`, { name }, authHeaders()).then((r) => r.data.data);

export const resetAreaPassword = (id) =>
  axios.post(`${BASE}/areas/${id}/reset-password`, {}, authHeaders()).then((r) => r.data);

export const deleteArea = (id) =>
  axios.delete(`${BASE}/areas/${id}`, authHeaders()).then((r) => r.data);

// ── Units ─────────────────────────────────────────────────────────────────────
// Returns all units (no pagination) – used for dropdowns
export const getUnits = ({ areaId, districtId } = {}) => {
  const params = {};
  if (areaId) params.areaId = areaId;
  if (districtId) params.districtId = districtId;
  return axios
    .get(`${BASE}/units`, { ...authHeaders(), params })
    .then((r) => r.data.data);
};

// Returns paginated units for the table listing
export const getUnitsPaginated = ({ areaId, districtId, page = 1, limit = 20, search } = {}) => {
  const params = { page, limit };
  if (areaId) params.areaId = areaId;
  if (districtId) params.districtId = districtId;
  if (search) params.search = search;
  return axios
    .get(`${BASE}/units`, { ...authHeaders(), params })
    .then((r) => ({ data: r.data.data, pagination: r.data.pagination }));
};

export const createUnit = (name, areaId, districtId) =>
  axios.post(`${BASE}/units`, { name, areaId, districtId }, authHeaders()).then((r) => r.data);

export const updateUnit = (id, name) =>
  axios.put(`${BASE}/units/${id}`, { name }, authHeaders()).then((r) => r.data.data);

export const resetUnitPassword = (id) =>
  axios.post(`${BASE}/units/${id}/reset-password`, {}, authHeaders()).then((r) => r.data);

export const deleteUnit = (id) =>
  axios.delete(`${BASE}/units/${id}`, authHeaders()).then((r) => r.data);

// ── Transforms (Split / Merge / Transfer) ────────────────────────────────────

export const splitDistrict = (id, sideAName, sideBName, areaIds) =>
  axios.post(`${BASE}/districts/${id}/split`, { sideAName, sideBName, areaIds }, authHeaders()).then((r) => r.data);

export const splitArea = (id, sideAName, sideBName, unitIds) =>
  axios.post(`${BASE}/areas/${id}/split`, { sideAName, sideBName, unitIds }, authHeaders()).then((r) => r.data);

export const splitUnit = (id, sideAName, sideBName) =>
  axios.post(`${BASE}/units/${id}/split`, { sideAName, sideBName }, authHeaders()).then((r) => r.data);

export const mergeDistricts = (survivorId, absorbedId) =>
  axios.post(`${BASE}/districts/merge`, { survivorId, absorbedId }, authHeaders()).then((r) => r.data);

export const mergeAreas = (survivorId, absorbedId) =>
  axios.post(`${BASE}/areas/merge`, { survivorId, absorbedId }, authHeaders()).then((r) => r.data);

export const mergeUnits = (survivorId, absorbedId) =>
  axios.post(`${BASE}/units/merge`, { survivorId, absorbedId }, authHeaders()).then((r) => r.data);

export const transferArea = (id, newDistrictId) =>
  axios.post(`${BASE}/areas/${id}/transfer`, { newDistrictId }, authHeaders()).then((r) => r.data);

export const transferUnit = (id, newAreaId) =>
  axios.post(`${BASE}/units/${id}/transfer`, { newAreaId }, authHeaders()).then((r) => r.data);

