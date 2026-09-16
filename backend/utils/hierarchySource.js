const axios = require('axios');
const mongoose = require('mongoose');
const { getTenant } = require('../config/tenantContext');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');

/**
 * Tenant-aware district / area / unit lists.
 *
 * The master JIH portal reads its hierarchy from the external cenlogin service
 * (DISTRICT_API_ENDPOINT and friends). A franchise without endpoints of its
 * own is served from its location-master collections instead, in the same
 * shape as the /hierarchy/*-db routes (`_id`, `name`, `uniqueCode`).
 */
const hasExternalHierarchy = () => {
  const { district, area, unit } = getTenant().hierarchy;
  return Boolean(district && area && unit);
};

const fillPlaceholder = (endpoint, placeholder, value) =>
  endpoint.includes(placeholder)
    ? endpoint.replace(placeholder, encodeURIComponent(value))
    : `${endpoint}/${encodeURIComponent(value)}`;

const getExternal = async (url, what) => {
  const response = await axios.get(url);
  if (!response.data || !response.data.success) {
    throw new Error(`Invalid response from ${what} API`);
  }
  return response.data.data || response.data;
};

const fetchDistrictData = async () => {
  try {
    const endpoint = getTenant().hierarchy.district;
    if (!endpoint) {
      return await District.find({ isActive: true })
        .select('_id name uniqueCode')
        .sort({ name: 1 })
        .lean();
    }
    return await getExternal(endpoint, 'districts');
  } catch (error) {
    console.error('Error fetching district data:', error);
    throw error;
  }
};

const fetchAreaData = async (districtId) => {
  try {
    const endpoint = getTenant().hierarchy.area;
    if (!endpoint) {
      if (!mongoose.isValidObjectId(districtId)) return [];
      return await AreaMaster.find({ districtId })
        .select('_id name uniqueCode districtId')
        .sort({ name: 1 })
        .lean();
    }
    return await getExternal(fillPlaceholder(endpoint, '{districtId}', districtId), 'areas');
  } catch (error) {
    console.error('Error fetching area data:', error);
    throw error;
  }
};

const fetchUnitData = async (areaId) => {
  try {
    const endpoint = getTenant().hierarchy.unit;
    if (!endpoint) {
      if (!mongoose.isValidObjectId(areaId)) return [];
      return await UnitMaster.find({ areaId, isActive: true })
        .select('_id name uniqueCode areaId districtId')
        .sort({ name: 1 })
        .lean();
    }
    return await getExternal(fillPlaceholder(endpoint, '{areaId}', areaId), 'units');
  } catch (error) {
    console.error('Error fetching unit data:', error);
    throw error;
  }
};

module.exports = { fetchDistrictData, fetchAreaData, fetchUnitData, hasExternalHierarchy };
