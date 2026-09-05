/**
 * Members Application — one-way import of master data and admin accounts from
 * the IHTHISABI database.
 *
 * Reads only; nothing in the ihthisabi database is modified. Safe to re-run:
 * locations are upserted on their natural key and an account whose username
 * already exists is left untouched (so password changes made inside the members
 * app are never clobbered).
 *
 *   node scripts/migrateMembersFromIhthisabi.js              # dry run, prints the plan
 *   node scripts/migrateMembersFromIhthisabi.js --commit     # actually writes
 *   node scripts/migrateMembersFromIhthisabi.js --commit --skip-abroad
 *
 * Locations: ihthisabi's own LocationMaster collection is empty in practice, so
 * the hierarchy is reconstructed from the district/area/unit strings on User
 * documents, unioned with the postings named on admin records (some admins sit
 * on units no member row mentions). Mekhala parents come from the Mekhala
 * collection's `districts` array; districts it does not cover land under the
 * placeholder mekhala named by UNASSIGNED_MEKHALA so nothing is silently lost.
 *
 * Accounts: MekhalaNazim, DistrictAdmin and UnitAdmin become MemberAdmin rows
 * carrying the matching Role. Passwords are preserved byte-for-byte — already
 * hashed values are copied across, plaintext values are hashed here with the
 * same cost the model uses — so everyone signs in with the credential they
 * already have. Ihthisabi's MekhalaNazim has no password (a nazim signs in with
 * their RUKN ID alone), so those accounts get their RUKN ID as the password.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');

const ihthisabiConnection = require('../config/ihthisabiConnection');
const membersConnection = require('../config/membersConnection');

const Mekhala = require('../models/ihthisabi/Mekhala');
const MekhalaNazim = require('../models/ihthisabi/MekhalaNazim');
const DistrictAdmin = require('../models/ihthisabi/DistrictAdmin');
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');
const IhUser = require('../models/ihthisabi/User');

const LocationMaster = require('../models/members/LocationMaster');
const MemberAdmin = require('../models/members/MemberAdmin');
const Role = require('../models/members/Role');

const COMMIT = process.argv.includes('--commit');
const SKIP_ABROAD = process.argv.includes('--skip-abroad');

const UNASSIGNED_MEKHALA = 'Unassigned';
const ABROAD_MEKHALA = 'Abroad';
const BCRYPT_COST = 12; // matches models/members/MemberAdmin.js

// Placeholder strings ihthisabi uses for "no value"; not real locations.
// ("Halqa" looks like one but is a real district with its own members and admin.)
const JUNK_NAMES = new Set(['', '-', '--', 'n/a', 'na', 'nil', 'null']);

const clean = (v) => String(v ?? '').trim();
const isJunk = (v) => JUNK_NAMES.has(clean(v).toLowerCase());
const isBcrypt = (v) => /^\$2[aby]\$/.test(v || '');

const report = {
  locations: { mekhala: 0, district: 0, area: 0, unit: 0, existing: 0 },
  accounts: { created: 0, existing: 0, failed: 0 },
  warnings: [],
  renamedUsernames: [],
  orphanDistricts: [],
  abroadDistricts: []
};

/* ── Locations ─────────────────────────────────────────────────────────────── */

/**
 * Builds the full mekhala → district → area → unit tree from ihthisabi.
 * Returns location docs in dependency order (parents first).
 */
async function buildLocations({ adminPostings }) {
  const mekhalas = await Mekhala.find().lean();

  // district name -> mekhala name
  const mekhalaOfDistrict = new Map();
  for (const m of mekhalas) {
    if (isJunk(m.name)) continue;
    for (const d of m.districts || []) {
      if (!isJunk(d)) mekhalaOfDistrict.set(clean(d), clean(m.name));
    }
  }

  // Every (district, area, unit) combination ihthisabi knows about: from member
  // rows, plus the postings admins sit on (11 unit admins reference units no
  // member row mentions).
  const triples = await IhUser.aggregate([
    { $group: { _id: { district: '$district', area: '$area', unit: '$unit' } } }
  ]);

  const combos = [
    ...triples.map(t => ({
      district: clean(t._id.district),
      area: clean(t._id.area),
      unit: clean(t._id.unit),
      abroad: false
    })),
    ...adminPostings
  ];

  const districts = new Map(); // name -> { mekhala }
  const areas = new Map();     // `${district}||${area}` -> { district, area }
  const units = new Map();     // `${district}||${area}||${unit}` -> {...}

  for (const combo of combos) {
    const { district, area, unit, abroad } = combo;
    if (isJunk(district)) continue;

    if (!districts.has(district)) {
      let mekhala = mekhalaOfDistrict.get(district);
      if (!mekhala) {
        mekhala = abroad ? ABROAD_MEKHALA : UNASSIGNED_MEKHALA;
        (abroad ? report.abroadDistricts : report.orphanDistricts).push(district);
      }
      districts.set(district, { mekhala });
    }

    if (isJunk(area)) continue;
    areas.set(`${district}||${area}`, { district, area });

    if (isJunk(unit)) continue;
    units.set(`${district}||${area}||${unit}`, { district, area, unit });
  }

  // Only emit the placeholder mekhalas if something actually needs them.
  const mekhalaNames = new Set(
    mekhalas.filter(m => !isJunk(m.name)).map(m => clean(m.name))
  );
  for (const { mekhala } of districts.values()) mekhalaNames.add(mekhala);

  const docs = [];
  for (const name of mekhalaNames) {
    docs.push({ type: 'mekhala', name, mekhala: '', district: '', area: '' });
  }
  for (const [name, { mekhala }] of districts) {
    docs.push({ type: 'district', name, mekhala, district: '', area: '' });
  }
  for (const { district, area } of areas.values()) {
    docs.push({
      type: 'area',
      name: area,
      mekhala: districts.get(district)?.mekhala || '',
      district,
      area: ''
    });
  }
  for (const { district, area, unit } of units.values()) {
    docs.push({
      type: 'unit',
      name: unit,
      mekhala: districts.get(district)?.mekhala || '',
      district,
      area
    });
  }
  return docs;
}

async function writeLocations(docs) {
  for (const doc of docs) {
    const key = {
      type: doc.type,
      name: doc.name,
      mekhala: doc.mekhala,
      district: doc.district,
      area: doc.area
    };
    const existing = await LocationMaster.findOne(key).lean();
    if (existing) {
      report.locations.existing += 1;
      continue;
    }
    if (COMMIT) {
      try {
        await LocationMaster.create({ ...doc, isActive: true });
      } catch (error) {
        report.warnings.push(`location ${doc.type} "${doc.name}": ${error.message}`);
        continue;
      }
    }
    report.locations[doc.type] += 1;
  }
}

/* ── Accounts ──────────────────────────────────────────────────────────────── */

/**
 * Preserves the credential the admin already uses: an existing bcrypt hash is
 * carried over untouched, a plaintext password is hashed here. Either way the
 * row is written with insertMany, which does not run the model's pre('save')
 * hook, so nothing gets double-hashed.
 */
async function preparePassword(raw, fallback) {
  const value = clean(raw) || clean(fallback);
  if (isBcrypt(value)) return value;
  return bcrypt.hash(value, await bcrypt.genSalt(BCRYPT_COST));
}

async function buildAccounts(roleByKey) {
  const [nazims, districtAdmins, unitAdmins] = await Promise.all([
    MekhalaNazim.find().populate('mekhala', 'name').lean(),
    DistrictAdmin.find().lean(),
    UnitAdmin.find().lean()
  ]);

  // Highest rank first so that on a RUKN ID shared by two postings the senior
  // role keeps the bare id as its username.
  const sources = [
    ...nazims.map(x => ({ src: x, roleKey: 'mekhalaNazim', suffix: 'mekhala' })),
    ...districtAdmins.map(x => ({ src: x, roleKey: 'districtAdmin', suffix: 'district' })),
    ...unitAdmins
      .filter(x => !(SKIP_ABROAD && x.isAbroad))
      .map(x => ({ src: x, roleKey: 'unitAdmin', suffix: 'unit' }))
  ];

  const usedUsernames = new Set(
    (await MemberAdmin.find().select('username').lean()).map(a => a.username)
  );
  const claimedThisRun = new Set();
  const docs = [];

  for (const { src, roleKey, suffix } of sources) {
    const role = roleByKey.get(roleKey);
    if (!role) {
      report.warnings.push(`role "${roleKey}" missing — run the members seed first`);
      report.accounts.failed += 1;
      continue;
    }

    const ruknId = clean(src.ruknId).toLowerCase();
    if (!ruknId) {
      report.warnings.push(`${roleKey} "${src.name}" has no RUKN ID — skipped`);
      report.accounts.failed += 1;
      continue;
    }

    let username = ruknId;
    if (claimedThisRun.has(username)) {
      username = `${ruknId}.${suffix}`;
      report.renamedUsernames.push(`${ruknId} → ${username} (${clean(src.name)}, ${roleKey})`);
    }
    if (usedUsernames.has(username)) {
      report.accounts.existing += 1;
      claimedThisRun.add(username);
      continue;
    }

    const scope = { mekhala: '', district: '', area: '', unit: '' };
    if (roleKey === 'mekhalaNazim') {
      scope.mekhala = clean(src.mekhala?.name);
      if (!scope.mekhala) {
        report.warnings.push(`mekhala nazim ${ruknId} (${clean(src.name)}) has no mekhala — skipped`);
        report.accounts.failed += 1;
        continue;
      }
    } else if (roleKey === 'districtAdmin') {
      scope.district = clean(src.district);
      if (isJunk(scope.district)) {
        report.warnings.push(`district admin ${ruknId} (${clean(src.name)}) has no district — skipped`);
        report.accounts.failed += 1;
        continue;
      }
    } else {
      scope.unit = clean(src.unit);
      scope.area = clean(src.area);
      scope.district = clean(src.district);
      if (isJunk(scope.unit)) {
        report.warnings.push(`unit admin ${ruknId} (${clean(src.name)}) has no unit — skipped`);
        report.accounts.failed += 1;
        continue;
      }
    }

    docs.push({
      username,
      // MekhalaNazim carries no password in ihthisabi — the RUKN ID is the credential.
      password: await preparePassword(src.password, ruknId),
      name: clean(src.name) || ruknId,
      contactNo: clean(src.contactNo),
      email: clean(src.emailId).toLowerCase(),
      role: role._id,
      scope,
      isRukn: true, // every ihthisabi admin is a Rukn
      isActive: src.isActive !== false,
      createdAt: src.createdAt || new Date(),
      updatedAt: new Date()
    });
    claimedThisRun.add(username);
  }

  return docs;
}

async function writeAccounts(docs) {
  if (!docs.length) return;
  if (!COMMIT) {
    report.accounts.created = docs.length;
    return;
  }
  // insertMany skips the pre('save') hash hook, so the passwords prepared above
  // land exactly as-is. ordered:false keeps one bad row from stopping the rest.
  try {
    const inserted = await MemberAdmin.insertMany(docs, { ordered: false });
    report.accounts.created = inserted.length;
  } catch (error) {
    report.accounts.created = error.insertedDocs?.length || 0;
    for (const err of error.writeErrors || []) {
      report.warnings.push(`account insert: ${err.err?.errmsg || err.message}`);
      report.accounts.failed += 1;
    }
    if (!error.writeErrors) throw error;
  }
}

/* ── Verification ──────────────────────────────────────────────────────────── */

/** Every account must sit on a posting that exists in the new master data. */
async function verifyScopes() {
  const accounts = await MemberAdmin.find().populate('role', 'key scopeType').lean();
  const dangling = [];
  for (const account of accounts) {
    const type = account.role?.scopeType;
    if (!type || type === 'state') continue;
    const name = account.scope?.[type];
    if (!name) { dangling.push(`${account.username}: empty ${type}`); continue; }
    const found = await LocationMaster.exists({ type, name });
    if (!found) dangling.push(`${account.username}: ${type} "${name}" not in master data`);
  }
  return dangling;
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

(async () => {
  await Promise.all([ihthisabiConnection.asPromise(), membersConnection.asPromise()]);
  console.log(`\n${COMMIT ? '=== COMMIT ===' : '=== DRY RUN (pass --commit to write) ==='}\n`);

  const roles = await Role.find().lean();
  if (!roles.length) throw new Error('No roles in the members database — run the members seed first');
  const roleByKey = new Map(roles.map(r => [r.key, r]));

  // Admin postings feed the location tree as well as the accounts themselves.
  const unitAdmins = await UnitAdmin.find().lean();
  const districtAdmins = await DistrictAdmin.find().lean();
  const adminPostings = [
    ...unitAdmins
      .filter(x => !(SKIP_ABROAD && x.isAbroad))
      .map(x => ({
        district: clean(x.district),
        area: clean(x.area),
        unit: clean(x.unit),
        abroad: Boolean(x.isAbroad)
      })),
    ...districtAdmins.map(x => ({
      district: clean(x.district),
      area: '',
      unit: '',
      // A district admin posted somewhere no member row mentions is an abroad posting.
      abroad: !x.district || /bahrain|kuwait|oman|ksa|qatar|uae/i.test(x.district)
    }))
  ];

  console.log('Building the location tree...');
  const locationDocs = await buildLocations({ adminPostings });
  await writeLocations(locationDocs);

  console.log('Building accounts...');
  const accountDocs = await buildAccounts(roleByKey);
  await writeAccounts(accountDocs);

  /* ── Summary ── */
  const L = report.locations;
  console.log('\n─── Locations ───');
  console.log(`  mekhalas  : ${L.mekhala}`);
  console.log(`  districts : ${L.district}`);
  console.log(`  areas     : ${L.area}`);
  console.log(`  units     : ${L.unit}`);
  console.log(`  total new : ${L.mekhala + L.district + L.area + L.unit}`);
  console.log(`  already present (skipped): ${L.existing}`);

  console.log('\n─── Accounts ───');
  console.log(`  created  : ${report.accounts.created}`);
  console.log(`  existing : ${report.accounts.existing}`);
  console.log(`  failed   : ${report.accounts.failed}`);

  const uniq = (a) => [...new Set(a)];
  if (report.orphanDistricts.length) {
    console.log(`\n  Districts with no mekhala → placed under "${UNASSIGNED_MEKHALA}":`);
    console.log(`    ${uniq(report.orphanDistricts).join(', ')}`);
    console.log('    Reassign them from Master Data once the correct mekhala is known.');
  }
  if (report.abroadDistricts.length) {
    console.log(`\n  Abroad postings → placed under "${ABROAD_MEKHALA}":`);
    console.log(`    ${uniq(report.abroadDistricts).join(', ')}`);
  }
  if (report.renamedUsernames.length) {
    console.log('\n  RUKN IDs held by two postings (second got a suffixed username):');
    report.renamedUsernames.forEach(w => console.log(`    ${w}`));
  }
  if (report.warnings.length) {
    console.log('\n  Warnings:');
    uniq(report.warnings).forEach(w => console.log(`    ${w}`));
  }

  if (COMMIT) {
    const dangling = await verifyScopes();
    console.log('\n─── Verification ───');
    if (dangling.length) {
      console.log(`  ${dangling.length} account(s) sit on a posting missing from master data:`);
      dangling.slice(0, 20).forEach(d => console.log(`    ${d}`));
    } else {
      console.log('  Every account resolves to a real location.');
    }
    console.log(`\n  members LocationMaster total: ${await LocationMaster.countDocuments()}`);
    console.log(`  members MemberAdmin total   : ${await MemberAdmin.countDocuments()}`);
  }

  console.log(COMMIT ? '\nDone.\n' : '\nNothing was written. Re-run with --commit to apply.\n');
  await Promise.all([ihthisabiConnection.close(), membersConnection.close()]);
})().catch(async (error) => {
  console.error('\nMigration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
