#!/usr/bin/env node
/**
 * One-time migration: JIH portal RuknForm / KarkunForm  ->  Members Application.
 *
 *   node scripts/migrateMembersFromJih.js --dry-run
 *   node scripts/migrateMembersFromJih.js
 *
 * The old records were filled against two hardcoded React forms, so there is no
 * FormTemplate to point them at. The script first creates a "Legacy (imported)"
 * template per application type whose pages mirror the old schema field for
 * field, then rewrites each document into that shape. Imported applications
 * therefore render in the new form renderer exactly like new ones.
 *
 * Idempotent: every imported document is stamped with legacySource, and a second
 * run skips anything already present.
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const membersConnection = require('../config/membersConnection');
const FormTemplate = require('../models/members/FormTemplate');
const Application = require('../models/members/Application');
const LocationMaster = require('../models/members/LocationMaster');
const Role = require('../models/members/Role');
const Workflow = require('../models/members/Workflow');
const { seedMembersDefaults } = require('../utils/members/seed');
const { RUKN_PAGES, KARKOON_PAGES, LEGACY_COMMENT_ROLES } = require('./membersLegacyForms');

const DRY_RUN = process.argv.includes('--dry-run');
const log = (...args) => console.log(...args);

// ─── Template construction ───────────────────────────────────────────────────

/** Build a template plus the path -> field_<id> map used to read old documents. */
function buildTemplate(formType, pageDefs) {
  let nextId = 1;
  const pathToKey = {};

  const pages = pageDefs.map((pageDef, pageIndex) => ({
    id: nextId++,
    title: pageDef.title,
    description: '',
    order: pageIndex,
    audience: 'applicant',
    audienceRole: '',
    fields: pageDef.fields.map((fieldDef) => {
      const id = nextId++;
      pathToKey[fieldDef.path] = `field_${id}`;
      return {
        id,
        type: fieldDef.type,
        label: fieldDef.label,
        required: false,
        enabled: true,
        width: 'full',
        audience: 'applicant',
        audienceRole: '',
        options: fieldDef.options || []
      };
    })
  }));

  // One role-scoped comment page per legacy verification level.
  const commentKeys = {};
  for (const role of LEGACY_COMMENT_ROLES) {
    const pageId = nextId++;
    const fieldId = nextId++;
    commentKeys[role.verificationKey] = `field_${fieldId}`;
    pages.push({
      id: pageId,
      title: role.title,
      description: 'Imported from the previous portal.',
      order: pages.length,
      audience: 'role',
      audienceRole: role.roleKey,
      fields: [{
        id: fieldId,
        type: 'textarea',
        label: role.title,
        required: false,
        enabled: true,
        width: 'full',
        audience: 'role',
        audienceRole: role.roleKey,
        options: []
      }]
    });
  }

  return {
    template: {
      formType,
      title: `${formType === 'rukn' ? 'Rukn' : 'Karkoon'} Application (imported)`,
      description: 'Generated from the previous JIH portal form so imported applications stay readable.',
      pages,
      isPublished: false,
      isActive: true,
      isLegacyImport: true
    },
    pathToKey,
    commentKeys
  };
}

// ─── Value mapping ───────────────────────────────────────────────────────────

const readPath = (doc, path) =>
  path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), doc);

function toFieldValue(raw, type) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (type === 'yesno') return raw === true || raw === 'yes' || raw === 'Yes' ? 'Yes' : 'No';
  if (type === 'number') return Number(raw) || 0;
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

// Old overall status -> new stage + status, per form type.
const STAGE_BY_LEGACY_STATUS = {
  rukn: {
    pending: 'unitVerify',
    unit_review: 'unitVerify',
    area_review: 'districtVerify', // the Rukn flow has no area step
    district_review: 'districtVerify',
    state_review: 'stateVerify'
  },
  karkoon: {
    pending: 'unitNazimVerify',
    unit_review: 'unitNazimVerify',
    area_review: 'areaVerify',
    district_review: 'districtVerify',
    state_review: 'stateDecision'
  }
};

/** Turn the four legacy verification blocks into stage history and comments. */
function buildTrail(doc, roleNames) {
  const history = [];
  const comments = [];

  history.push({
    stageKey: 'imported',
    stageName: 'Submitted (imported)',
    actorName: doc.name || 'Applicant',
    action: 'submitted',
    at: doc.submittedAt || doc.createdAt || new Date()
  });

  for (const role of LEGACY_COMMENT_ROLES) {
    const block = doc.verification?.[role.verificationKey];
    if (!block || block.status === 'pending') continue;

    history.push({
      stageKey: 'imported',
      stageName: role.title,
      actorRoleKey: role.roleKey,
      actorName: block.verifiedBy || '',
      action: block.status === 'approved' ? 'forwarded' : 'rejected',
      comment: block.comments || '',
      at: block.verifiedAt || doc.updatedAt || new Date()
    });

    if (block.comments) {
      comments.push({
        roleKey: role.roleKey,
        roleName: roleNames[role.roleKey] || role.roleKey,
        actorName: block.verifiedBy || '',
        stageKey: 'imported',
        text: block.comments,
        at: block.verifiedAt || doc.updatedAt || new Date()
      });
    }
  }

  return { history, comments };
}

// ─── Scope resolution ────────────────────────────────────────────────────────

/**
 * Match the old free-text unit/area/district names against the members master
 * data. Nothing is invented: unresolved names are reported, and the raw values
 * are still stored so the record is never silently detached from its unit.
 */
async function resolveScope(names, unresolved) {
  const scope = { mekhala: '', district: '', area: '', unit: '' };
  const ci = (value) => new RegExp(`^${String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  if (names.unit) {
    const unit = await LocationMaster.findOne({ type: 'unit', name: ci(names.unit) }).lean();
    if (unit) {
      scope.unit = unit.name;
      scope.area = unit.area;
      scope.district = unit.district;
      scope.mekhala = unit.mekhala;
      return scope;
    }
    unresolved.units.add(names.unit);
    scope.unit = names.unit;
  }

  if (names.area) {
    const area = await LocationMaster.findOne({ type: 'area', name: ci(names.area) }).lean();
    if (area) {
      scope.area = area.name;
      scope.district = area.district;
      scope.mekhala = area.mekhala;
      return scope;
    }
    unresolved.areas.add(names.area);
    scope.area = scope.area || names.area;
  }

  if (names.district) {
    const district = await LocationMaster.findOne({ type: 'district', name: ci(names.district) }).lean();
    if (district) {
      scope.district = district.name;
      scope.mekhala = district.mekhala;
    } else {
      unresolved.districts.add(names.district);
      scope.district = scope.district || names.district;
    }
  }

  return scope;
}

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrateCollection({ LegacyModel, modelName, formType, pageDefs, namesOf, roleNames, unresolved }) {
  const built = buildTemplate(formType, pageDefs);

  let template = await FormTemplate.findOne({ formType, isLegacyImport: true });
  if (!template) {
    if (DRY_RUN) {
      log(`  [dry-run] would create legacy template for ${formType} (${built.template.pages.length} pages)`);
      template = { _id: new mongoose.Types.ObjectId(), version: 1 };
    } else {
      template = await FormTemplate.create(built.template);
      log(`  created legacy template for ${formType} (${built.template.pages.length} pages)`);
    }
  } else {
    log(`  legacy template for ${formType} already exists — reusing`);
  }

  const docs = await LegacyModel.find().lean();
  log(`  found ${docs.length} ${modelName} document(s)`);

  const fieldTypeByPath = {};
  for (const page of pageDefs) {
    for (const field of page.fields) fieldTypeByPath[field.path] = field.type;
  }

  let imported = 0;
  let skipped = 0;

  for (const doc of docs) {
    const already = await Application.exists({
      'legacySource.model': modelName,
      'legacySource.id': String(doc._id)
    });
    if (already) { skipped += 1; continue; }

    const formData = {};
    for (const [path, key] of Object.entries(built.pathToKey)) {
      const value = toFieldValue(readPath(doc, path), fieldTypeByPath[path]);
      if (value !== '') formData[key] = value;
    }

    const roleData = {};
    for (const role of LEGACY_COMMENT_ROLES) {
      const text = doc.verification?.[role.verificationKey]?.comments;
      if (text) roleData[built.commentKeys[role.verificationKey]] = text;
    }

    const scope = await resolveScope(namesOf(doc), unresolved);
    const { history, comments } = buildTrail(doc, roleNames);

    const legacyStatus = doc.status || 'pending';
    const finished = legacyStatus === 'approved' || legacyStatus === 'rejected';

    const application = {
      formType,
      formTemplateId: template._id,
      formVersion: template.version || 1,
      accessLinkId: null,
      formData,
      roleData,
      scope,
      applicantName: doc.name || doc.nameEnglish || '',
      applicantMobile: doc.mobile || '',
      photo: typeof doc.photo === 'string' && doc.photo.startsWith('http') ? doc.photo : '',
      currentStageKey: finished ? '' : (STAGE_BY_LEGACY_STATUS[formType][legacyStatus] || ''),
      stageHistory: history,
      comments,
      status: finished ? legacyStatus : (legacyStatus === 'pending' ? 'submitted' : 'in_review'),
      memberId: doc.officeUse?.registrationNumber || doc.registrationNumber || '',
      submittedAt: doc.submittedAt || doc.createdAt || new Date(),
      legacySource: { model: modelName, id: String(doc._id) }
    };

    if (DRY_RUN) {
      imported += 1;
      continue;
    }

    try {
      await Application.create(application);
      imported += 1;
    } catch (error) {
      // A duplicate member ID from the old data must not abort the whole run.
      if (error.code === 11000) {
        application.memberId = '';
        await Application.create(application);
        imported += 1;
        log(`  ! ${doc._id}: duplicate registration number dropped`);
      } else {
        log(`  ! ${doc._id}: ${error.message}`);
      }
    }
  }

  return { imported, skipped, total: docs.length };
}

async function main() {
  log(DRY_RUN ? 'MEMBERS migration — DRY RUN (nothing will be written)\n' : 'MEMBERS migration\n');

  if (!process.env.MEMBERS_MONGODB_URI) {
    console.error('MEMBERS_MONGODB_URI is not set. Fill it in backend/.env first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  log('connected to JIH database');

  await new Promise((resolve, reject) => {
    if (membersConnection.readyState === 1) return resolve();
    membersConnection.once('connected', resolve);
    membersConnection.once('error', reject);
  });
  log('connected to MEMBERS database\n');

  if (!DRY_RUN) await seedMembersDefaults();

  const workflows = await Workflow.countDocuments();
  if (!workflows && !DRY_RUN) {
    console.error('No workflows found. Start the server once so defaults are seeded, then re-run.');
    process.exit(1);
  }

  const roleNames = Object.fromEntries(
    (await Role.find().select('key name').lean()).map(r => [r.key, r.name])
  );

  const { LegacyRuknForm, LegacyKarkunForm } = require('./legacyJihModels');

  const unresolved = { units: new Set(), areas: new Set(), districts: new Set() };

  log('Rukn applications:');
  const rukn = await migrateCollection({
    LegacyModel: LegacyRuknForm,
    modelName: 'RuknForm',
    formType: 'rukn',
    pageDefs: RUKN_PAGES,
    namesOf: (doc) => ({ unit: doc.unitName, area: doc.areaName, district: doc.districtName }),
    roleNames,
    unresolved
  });
  log(`  imported ${rukn.imported}, skipped ${rukn.skipped} of ${rukn.total}\n`);

  log('Karkoon applications:');
  const karkoon = await migrateCollection({
    LegacyModel: LegacyKarkunForm,
    modelName: 'KarkunForm',
    formType: 'karkoon',
    pageDefs: KARKOON_PAGES,
    namesOf: (doc) => ({ unit: doc.halkhaName, area: doc.area, district: doc.district }),
    roleNames,
    unresolved
  });
  log(`  imported ${karkoon.imported}, skipped ${karkoon.skipped} of ${karkoon.total}\n`);

  // Master data is entered by hand in the admin panel, so it will usually be
  // incomplete on the first run. Report rather than invent.
  const missing = ['units', 'areas', 'districts'].filter(k => unresolved[k].size);
  if (missing.length) {
    log('Locations not found in the members master data — add them, then re-run to re-resolve:');
    for (const key of missing) {
      log(`  ${key}: ${[...unresolved[key]].sort().join(', ')}`);
    }
    log('');
  } else {
    log('All locations resolved against the members master data.\n');
  }

  log(DRY_RUN
    ? 'Dry run complete. Re-run without --dry-run to write.'
    : 'Migration complete. Review the imported template under Form Builder before publishing anything.');

  await mongoose.disconnect();
  await membersConnection.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
