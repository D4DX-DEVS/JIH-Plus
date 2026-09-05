/**
 * Members Application — audience rules for a form template.
 *
 * A members form holds the applicant's questions and the per-role comment
 * sections in one template. These helpers are the single source of truth for who
 * sees and writes what; routes must go through them rather than trusting the
 * client to send only permitted keys.
 *
 * Precedence: a page marked `audience: 'role'` makes every field on it role-scoped
 * (a field may still name a different role). On an applicant page, an individual
 * field can still opt into a role. Defaulting this way hides more, not less.
 */

/** The audience a field actually has, once page-level scoping is applied. */
function effectiveAudience(page, field) {
  if (page?.audience === 'role') {
    return { audience: 'role', roleKey: field?.audienceRole || page.audienceRole || '' };
  }
  if (field?.audience === 'role') {
    return { audience: 'role', roleKey: field.audienceRole || '' };
  }
  return { audience: 'applicant', roleKey: '' };
}

/** Every field on the template, flattened, with its resolved audience. */
function flattenFields(template) {
  const out = [];
  for (const page of template?.pages || []) {
    for (const field of page.fields || []) {
      out.push({ page, field, ...effectiveAudience(page, field) });
    }
  }
  return out;
}

/** `field_<id>` keys the applicant is allowed to write. */
function applicantFieldKeys(template) {
  return new Set(
    flattenFields(template)
      .filter(f => f.audience === 'applicant')
      .map(f => `field_${f.field.id}`)
  );
}

/** `field_<id>` keys owned by any of `roleKeys`. */
function roleFieldKeys(template, roleKeys) {
  const allowed = new Set(Array.isArray(roleKeys) ? roleKeys : [roleKeys]);
  return new Set(
    flattenFields(template)
      .filter(f => f.audience === 'role' && allowed.has(f.roleKey))
      .map(f => `field_${f.field.id}`)
  );
}

/**
 * The template as the applicant should receive it: role-scoped pages dropped
 * entirely, role-scoped fields stripped out of applicant pages.
 */
function applicantView(template) {
  const plain = typeof template.toObject === 'function' ? template.toObject() : template;
  const pages = (plain.pages || [])
    .filter(page => page.audience !== 'role')
    .map(page => ({
      ...page,
      fields: (page.fields || []).filter(field => effectiveAudience(page, field).audience === 'applicant')
    }))
    .filter(page => (page.fields || []).length > 0);

  return { ...plain, pages };
}

/**
 * The template as a reviewer should receive it.
 *
 * `editableRoleKeys` are the roles whose fields this reviewer may write right now
 * (their own role, plus any role the workflow lets them fill via a skip). Every
 * other role's pages come back flagged readOnly so the frontend renders past
 * comments without offering inputs; pages belonging to roles that have not acted
 * yet are dropped so a reviewer cannot preview or pre-fill a later stage.
 */
function reviewerView(template, { editableRoleKeys = [], actedRoleKeys = [] } = {}) {
  const plain = typeof template.toObject === 'function' ? template.toObject() : template;
  const editable = new Set(editableRoleKeys);
  const acted = new Set(actedRoleKeys);

  const pages = [];
  for (const page of plain.pages || []) {
    const fields = [];
    let sawEditable = false;

    for (const field of page.fields || []) {
      const { audience, roleKey } = effectiveAudience(page, field);

      if (audience === 'applicant') {
        fields.push({ ...field, readOnly: true });
        continue;
      }
      if (editable.has(roleKey)) {
        fields.push({ ...field, readOnly: false, ownerRoleKey: roleKey });
        sawEditable = true;
        continue;
      }
      if (acted.has(roleKey)) {
        fields.push({ ...field, readOnly: true, ownerRoleKey: roleKey });
      }
      // Otherwise the role has not acted yet — omit entirely.
    }

    if (fields.length) {
      pages.push({ ...page, fields, hasEditableFields: sawEditable });
    }
  }

  return { ...plain, pages };
}

/** Keep only the entries of `incoming` whose keys are in `allowedKeys`. */
function pickAllowed(incoming, allowedKeys) {
  const out = {};
  if (!incoming || typeof incoming !== 'object') return out;
  for (const [key, value] of Object.entries(incoming)) {
    if (allowedKeys.has(key)) out[key] = value;
  }
  return out;
}

/** Keys the caller sent that they were not allowed to write. */
function rejectedKeys(incoming, allowedKeys) {
  if (!incoming || typeof incoming !== 'object') return [];
  return Object.keys(incoming).filter(key => !allowedKeys.has(key));
}

module.exports = {
  effectiveAudience,
  flattenFields,
  applicantFieldKeys,
  roleFieldKeys,
  applicantView,
  reviewerView,
  pickAllowed,
  rejectedKeys
};
