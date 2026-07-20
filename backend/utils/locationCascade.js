/**
 * locationCascade.js
 *
 * Helpers to keep the expansion-portal login `users` collection in sync when
 * District / Area / Unit master records are split, merged, or transferred.
 *
 * The `users` collection stores location as plain string IDs + denormalised names:
 *   districtId, districtName, areaId, areaName, unitId, unitName
 *
 * "id" fields carry the MongoDB ObjectId as a string.
 */

const User = require('../models/user');

/**
 * Reassign all login users whose districtId === oldId to the new district.
 * Used when splitting or merging districts (moves all affected users at once).
 * @param {string} oldId - original district _id as string
 * @param {{ newId?: string, newName?: string }} updates
 */
async function cascadeDistrictToUsers(oldId, { newId, newName } = {}) {
  const set = {};
  if (newId)   set.districtId   = newId;
  if (newName) set.districtName = newName;
  if (!Object.keys(set).length) return;
  await User.updateMany({ districtId: String(oldId) }, { $set: set });
}

/**
 * Reassign all login users whose areaId === oldId to the new area.
 * Also updates districtId/districtName when an area is transferred.
 * @param {string} oldId - original area _id as string
 * @param {{ newId?: string, newName?: string, newDistrictId?: string, newDistrictName?: string }} updates
 */
async function cascadeAreaToUsers(oldId, { newId, newName, newDistrictId, newDistrictName } = {}) {
  const set = {};
  if (newId)          set.areaId       = newId;
  if (newName)        set.areaName     = newName;
  if (newDistrictId)  set.districtId   = newDistrictId;
  if (newDistrictName) set.districtName = newDistrictName;
  if (!Object.keys(set).length) return;
  await User.updateMany({ areaId: String(oldId) }, { $set: set });
}

/**
 * Reassign all login users whose unitId === oldId to the new unit.
 * Also updates areaId/areaName/districtId/districtName when a unit is transferred.
 * @param {string} oldId - original unit _id as string
 * @param {{ newId?: string, newName?: string, newAreaId?: string, newAreaName?: string, newDistrictId?: string, newDistrictName?: string }} updates
 */
async function cascadeUnitToUsers(
  oldId,
  { newId, newName, newAreaId, newAreaName, newDistrictId, newDistrictName } = {}
) {
  const set = {};
  if (newId)           set.unitId       = newId;
  if (newName)         set.unitName     = newName;
  if (newAreaId)       set.areaId       = newAreaId;
  if (newAreaName)     set.areaName     = newAreaName;
  if (newDistrictId)   set.districtId   = newDistrictId;
  if (newDistrictName) set.districtName = newDistrictName;
  if (!Object.keys(set).length) return;
  await User.updateMany({ unitId: String(oldId) }, { $set: set });
}

module.exports = { cascadeDistrictToUsers, cascadeAreaToUsers, cascadeUnitToUsers };
