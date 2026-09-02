/**
 * Members Application — geographic scoping.
 *
 * Every list and detail query runs through `scopeQuery` so the rule lives in one
 * place. A role's `scopeType` decides which part of the account's scope is
 * matched; 'state' sees everything.
 *
 * Names are matched exactly. The old JIH rukn/karkun routes matched unit/area
 * names with case-insensitive regexes because their master data came from another
 * section; here this section owns LocationMaster, so exact matching is correct
 * and far cheaper.
 */

const LocationMaster = require('../../models/members/LocationMaster');

const SCOPE_FIELD_BY_TYPE = {
  mekhala: 'scope.mekhala',
  district: 'scope.district',
  area: 'scope.area',
  unit: 'scope.unit'
};

/**
 * Mongo query fragment restricting documents to what `account` may see.
 * @param {Object} account - a MemberAdmin with `role` populated
 * @returns {Object} query fragment, {} for state-wide roles
 */
function scopeQuery(account) {
  const scopeType = account?.role?.scopeType;
  if (!scopeType || scopeType === 'state') return {};

  const field = SCOPE_FIELD_BY_TYPE[scopeType];
  const value = account?.scope?.[scopeType];
  if (!field) return {};

  // A scoped account with no posting must not fall back to seeing everything.
  if (!value) return { _id: null };

  return { [field]: value };
}

/**
 * Whether `account` may act on a document carrying `scope`.
 */
function isInScope(account, scope) {
  const scopeType = account?.role?.scopeType;
  if (!scopeType || scopeType === 'state') return true;
  const value = account?.scope?.[scopeType];
  if (!value) return false;
  return scope?.[scopeType] === value;
}

/**
 * Fill in the parent chain for a partial scope by walking LocationMaster upwards,
 * so a unit-level account always carries its area, district and mekhala too. This
 * is what lets a mekhala nazim match on `scope.mekhala` alone.
 *
 * Returns { scope, missing } — `missing` names any level that could not be
 * resolved, so callers can reject rather than silently store a half scope.
 */
async function resolveScopeChain(partial = {}) {
  const scope = { mekhala: '', district: '', area: '', unit: '' };
  const missing = [];

  if (partial.unit) {
    const unit = await LocationMaster.findOne({ type: 'unit', name: partial.unit, isActive: true }).lean();
    if (!unit) {
      missing.push(`unit "${partial.unit}"`);
    } else {
      scope.unit = unit.name;
      scope.area = unit.area;
      scope.district = unit.district;
    }
  } else if (partial.area) {
    const area = await LocationMaster.findOne({ type: 'area', name: partial.area, isActive: true }).lean();
    if (!area) {
      missing.push(`area "${partial.area}"`);
    } else {
      scope.area = area.name;
      scope.district = area.district;
    }
  } else if (partial.district) {
    scope.district = partial.district;
  } else if (partial.mekhala) {
    scope.mekhala = partial.mekhala;
  }

  if (scope.district) {
    const district = await LocationMaster.findOne({ type: 'district', name: scope.district, isActive: true }).lean();
    if (!district) {
      missing.push(`district "${scope.district}"`);
    } else {
      scope.mekhala = district.mekhala;
    }
  }

  return { scope, missing };
}

module.exports = { scopeQuery, isInScope, resolveScopeChain, SCOPE_FIELD_BY_TYPE };
