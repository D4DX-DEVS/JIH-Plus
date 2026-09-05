/**
 * Members Application — first-boot seeding.
 *
 * Creates the six roles from the agreed hierarchy and the two approval workflows.
 * Idempotent: every write is an upsert keyed on a stable field, and existing
 * documents are left alone so admin edits made in the panel survive restarts.
 */

const Role = require('../../models/members/Role');
const Workflow = require('../../models/members/Workflow');

// Super admin > Mekhala Nazim > District Admin > Area Admin > Unit Admin > Unit Nazim/Nazimath.
// `superAdmin` is the state-level role the two workflows refer to as "state admin".
const DEFAULT_ROLES = [
  { key: 'superAdmin',    name: 'Super Admin',           nameMl: '',                    level: 0, scopeType: 'state',    canCreateAccessLinks: false, isSystem: true },
  { key: 'mekhalaNazim',  name: 'Mekhala Nazim',         nameMl: 'മേഖലാ നാസിം',        level: 1, scopeType: 'mekhala',  canCreateAccessLinks: false, isSystem: true },
  { key: 'districtAdmin', name: 'District Admin',        nameMl: 'ജില്ലാ അഡ്മിൻ',       level: 2, scopeType: 'district', canCreateAccessLinks: false, isSystem: true },
  { key: 'areaAdmin',     name: 'Area Admin',            nameMl: 'ഏരിയാ അഡ്മിൻ',       level: 3, scopeType: 'area',     canCreateAccessLinks: false, isSystem: true },
  { key: 'unitAdmin',     name: 'Unit Admin',            nameMl: 'യൂണിറ്റ് അഡ്മിൻ',     level: 4, scopeType: 'unit',     canCreateAccessLinks: true,  isSystem: true },
  { key: 'unitNazim',     name: 'Unit Nazim/Nazimath',   nameMl: 'യൂണിറ്റ് നാസിം',      level: 5, scopeType: 'unit',     canCreateAccessLinks: true,  isSystem: true }
];

// Rukn: Unit Admin -> District Admin -> State, then Party School, Mekhala Nazim,
// back to State, Ameer Mulakath, decision, Urdu form, Rukn ID, Thajdeed.
const RUKN_STAGES = [
  {
    key: 'unitVerify', name: 'Unit Admin Verification', order: 1,
    actorRoleKey: 'unitAdmin', kind: 'verify',
    nextStageKey: 'districtVerify', allowedNextStageKeys: ['districtVerify']
  },
  {
    key: 'districtVerify', name: 'District Admin Verification', order: 2,
    actorRoleKey: 'districtAdmin', kind: 'verify',
    nextStageKey: 'stateVerify', allowedNextStageKeys: ['stateVerify', 'unitVerify']
  },
  {
    key: 'stateVerify', name: 'State Verification', order: 3,
    actorRoleKey: 'superAdmin', kind: 'verify',
    nextStageKey: 'partySchool', allowedNextStageKeys: ['partySchool', 'districtVerify']
  },
  {
    key: 'partySchool', name: 'Party School', order: 4,
    actorRoleKey: 'superAdmin', kind: 'marker',
    nextStageKey: 'mekhalaVerify', allowedNextStageKeys: ['mekhalaVerify'],
    captureFields: [
      { key: 'attended', label: 'Attended Party School', type: 'yesno', required: true },
      { key: 'schoolDate', label: 'Party School Date', type: 'date' },
      { key: 'batch', label: 'Batch', type: 'text' }
    ]
  },
  {
    key: 'mekhalaVerify', name: 'Mekhala Nazim Verification', order: 5,
    actorRoleKey: 'mekhalaNazim', kind: 'verify',
    nextStageKey: 'stateReview', allowedNextStageKeys: ['stateReview']
  },
  {
    key: 'stateReview', name: 'State Review', order: 6,
    actorRoleKey: 'superAdmin', kind: 'verify',
    nextStageKey: 'ameerMulakath', allowedNextStageKeys: ['ameerMulakath', 'mekhalaVerify']
  },
  {
    key: 'ameerMulakath', name: 'Ameer Mulakath', order: 7,
    actorRoleKey: 'superAdmin', kind: 'marker',
    nextStageKey: 'decision', allowedNextStageKeys: ['decision'],
    captureFields: [
      { key: 'mulakathDate', label: 'Mulakath Date', type: 'date' },
      { key: 'attended', label: 'Attended', type: 'yesno' }
    ]
  },
  {
    key: 'decision', name: 'Decision', order: 8,
    actorRoleKey: 'superAdmin', kind: 'decision',
    nextStageKey: 'urduForm', allowedNextStageKeys: ['urduForm']
  },
  {
    key: 'urduForm', name: 'Urdu Form', order: 9,
    actorRoleKey: 'superAdmin', kind: 'marker',
    nextStageKey: 'finalize', allowedNextStageKeys: ['finalize'],
    captureFields: [
      { key: 'passed', label: 'Passed Urdu Form', type: 'yesno', required: true },
      { key: 'passedDate', label: 'Date', type: 'date' }
    ]
  },
  {
    key: 'finalize', name: 'Accept & Assign Rukn ID', order: 10,
    actorRoleKey: 'superAdmin', kind: 'finalize',
    nextStageKey: 'thajdeed', allowedNextStageKeys: ['thajdeed'],
    captureFields: [
      { key: 'memberId', label: 'Rukn ID', type: 'text', required: true },
      { key: 'acceptedDate', label: 'Accepted Date', type: 'date', required: true },
      { key: 'acceptedTime', label: 'Accepted Time', type: 'text' },
      { key: 'ruknDetails', label: 'Rukn Details', type: 'textarea' }
    ]
  },
  {
    key: 'thajdeed', name: 'Thajdeed Date Allocation', order: 11,
    actorRoleKey: 'superAdmin', kind: 'finalize', isTerminal: true,
    captureFields: [
      { key: 'thajdeedDate', label: 'Thajdeed Date', type: 'date', required: true }
    ]
  }
];

// Karkoon: Unit Nazim/Nazimath -> Area Admin -> District Admin -> State.
// A Unit Nazim who is also a Rukn fills the area admin's comments and skips that stage.
const KARKOON_STAGES = [
  {
    key: 'unitNazimVerify', name: 'Unit Nazim/Nazimath Verification', order: 1,
    actorRoleKey: 'unitNazim', kind: 'verify',
    nextStageKey: 'areaVerify', allowedNextStageKeys: ['areaVerify', 'districtVerify'],
    skipWhen: 'actorIsRukn', skipToStageKey: 'districtVerify', skipFillsRoleKeys: ['areaAdmin']
  },
  {
    key: 'areaVerify', name: 'Area Admin Verification', order: 2,
    actorRoleKey: 'areaAdmin', kind: 'verify',
    nextStageKey: 'districtVerify', allowedNextStageKeys: ['districtVerify', 'unitNazimVerify']
  },
  {
    key: 'districtVerify', name: 'District Admin Verification', order: 3,
    actorRoleKey: 'districtAdmin', kind: 'verify',
    nextStageKey: 'stateDecision', allowedNextStageKeys: ['stateDecision', 'areaVerify']
  },
  {
    key: 'stateDecision', name: 'State Decision', order: 4,
    actorRoleKey: 'superAdmin', kind: 'decision',
    nextStageKey: 'finalize', allowedNextStageKeys: ['finalize']
  },
  {
    key: 'finalize', name: 'Assign Karkoon ID', order: 5,
    actorRoleKey: 'superAdmin', kind: 'finalize', isTerminal: true,
    captureFields: [
      { key: 'memberId', label: 'Karkoon ID', type: 'text', required: true }
    ]
  }
];

async function seedRoles() {
  let created = 0;
  for (const role of DEFAULT_ROLES) {
    const result = await Role.updateOne(
      { key: role.key },
      { $setOnInsert: role },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
  }
  return created;
}

async function seedWorkflows() {
  let created = 0;
  const defaults = [
    { formType: 'rukn', stages: RUKN_STAGES },
    { formType: 'karkoon', stages: KARKOON_STAGES }
  ];
  for (const workflow of defaults) {
    const existing = await Workflow.findOne({ formType: workflow.formType });
    if (existing) continue;
    await Workflow.create(workflow);
    created += 1;
  }
  return created;
}

async function seedMembersDefaults() {
  const roles = await seedRoles();
  const workflows = await seedWorkflows();
  if (roles || workflows) {
    console.log(`MEMBERS seed: ${roles} role(s), ${workflows} workflow(s) created`);
  }
}

module.exports = {
  seedMembersDefaults,
  DEFAULT_ROLES,
  RUKN_STAGES,
  KARKOON_STAGES
};
