/**
 * Migration: Qatar abroad members + unit admins from qatar.json
 *
 * Source rows: { Rukn ID, Gender, Full Name, Country, Area, Unit, isUnitAdmin: 'TRUE'|'FALSE' }
 *
 * Logic:
 *  1. Apply known Rukn ID typo corrections (verified against the DB by name).
 *  2. Merge duplicate rows per Rukn ID (isUnitAdmin is OR-ed); abort if one
 *     Rukn ID points at two different units.
 *  3. Resolve the existing AbroadCountry → AbroadArea → AbroadUnit catalogue
 *     (abort if anything is missing — this script never creates locations).
 *  4. Every member must already exist as a rukn User whose gender matches;
 *     abort otherwise. Each one is moved into its abroad unit the same way the
 *     "Add/Edit Abroad Member" admin form stores it: isAbroad + refs set and
 *     unit '-' (so the old Kerala unit's roster no longer counts them).
 *     Home district/area strings are kept.
 *  5. Rows with isUnitAdmin TRUE get an abroad UnitAdmin, built like
 *     POST /api/ihthisabi/admin/abroad-unitadmins (name/contact/email taken
 *     from the member record, default password).
 *
 * Usage:
 *   node scripts/migrateQatarMembersFromJson.js            (interactive confirm)
 *   node scripts/migrateQatarMembersFromJson.js --dry-run  (preview only)
 *   node scripts/migrateQatarMembersFromJson.js --yes      (no prompt)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ihthisabiConnection = require('../config/ihthisabiConnection');
const User = require('../models/ihthisabi/User');
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');
const AbroadCountry = require('../models/ihthisabi/AbroadCountry');
const AbroadArea = require('../models/ihthisabi/AbroadArea');
const AbroadUnit = require('../models/ihthisabi/AbroadUnit');

const sourceRows = require(path.join(__dirname, '..', 'qatar.json'));

const DEFAULT_PASSWORD = 'unitadmin123';

// Typos in the source sheet: the listed Rukn ID belongs to someone else (or to
// nobody), while the DB holds this exact person under the corrected ID.
const RUKN_ID_CORRECTIONS = [
  { from: '114940', name: 'Yasar Arafath P', to: '114840' },
  { from: '110114', name: 'ABDUL JALEEL K M', to: '110104' },
  { from: '119989', name: 'SADIQ ALI CHNNADAN', to: '119986' },
];

// ── helpers ──────────────────────────────────────────────────────────────────

const normalizeString = (value) => String(value ?? '').trim();
const normalizeKey = (value) => normalizeString(value).toLowerCase();

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--yes') || args.includes('-y'),
  };
};

const askConfirmation = (question) =>
  new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(['y', 'yes'].includes(normalizeKey(answer)));
    });
  });

const normalizeGender = (value) => (normalizeKey(value) === 'female' ? 'Female' : 'Male');

const normalizeRow = (row) => {
  const ruknId = normalizeString(row['Rukn ID']);
  const name = normalizeString(row['Full Name']);
  const correction = RUKN_ID_CORRECTIONS.find(
    (c) => c.from === ruknId && normalizeKey(c.name) === normalizeKey(name)
  );
  return {
    ruknId: correction ? correction.to : ruknId,
    sourceRuknId: ruknId,
    name,
    gender: normalizeGender(row['Gender']),
    countryTitle: normalizeString(row['Country']),
    areaTitle: normalizeString(row['Area']),
    unitTitle: normalizeString(row['Unit']),
    isUnitAdmin: normalizeKey(row['isUnitAdmin']) === 'true',
  };
};

const locationKey = (row) =>
  [row.countryTitle, row.areaTitle, row.unitTitle].map(normalizeKey).join('||');

/** One row per Rukn ID; isUnitAdmin OR-ed. Conflicting units are returned as errors. */
const mergeByRuknId = (rows) => {
  const map = new Map();
  const conflicts = [];
  for (const row of rows) {
    const existing = map.get(row.ruknId);
    if (!existing) {
      map.set(row.ruknId, { ...row });
      continue;
    }
    if (locationKey(existing) !== locationKey(row)) {
      conflicts.push(`ruknId=${row.ruknId}: "${existing.name}" → ${existing.unitTitle} vs "${row.name}" → ${row.unitTitle}`);
      continue;
    }
    existing.isUnitAdmin = existing.isUnitAdmin || row.isUnitAdmin;
  }
  return { rows: [...map.values()], conflicts };
};

// ── main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const { dryRun, force } = parseArgs();

  if (!ihthisabiConnection.ihthisabiUri) {
    throw new Error('IHTHISABI_MONGODB_URI is missing in environment variables.');
  }

  await ihthisabiConnection.asPromise();
  console.log('✓ Connected to IHTHISABI database\n');

  const normalized = sourceRows.map(normalizeRow);
  const { rows, conflicts } = mergeByRuknId(normalized);
  const errors = [...conflicts];

  // ── catalogue (must already exist) ─────────────────────────────────────────
  const [countries, areas, units] = await Promise.all([
    AbroadCountry.find({}).select('_id title').lean(),
    AbroadArea.find({}).select('_id title countryId').lean(),
    AbroadUnit.find({}).select('_id title areaId countryId').lean(),
  ]);

  const resolveLocation = (row) => {
    const country = countries.find((c) => normalizeKey(c.title) === normalizeKey(row.countryTitle));
    const area = country && areas.find(
      (a) => String(a.countryId) === String(country._id) && normalizeKey(a.title) === normalizeKey(row.areaTitle)
    );
    const unit = area && units.find(
      (u) => String(u.areaId) === String(area._id) && normalizeKey(u.title) === normalizeKey(row.unitTitle)
    );
    return unit ? { country, area, unit } : null;
  };

  // ── members ────────────────────────────────────────────────────────────────
  const users = await User.find({ role: 'rukn', ruknId: { $in: rows.map((r) => r.ruknId) } })
    .select('_id ruknId name gender contactNo emailId district area unit isAbroad abroadCountry abroadArea abroadUnit')
    .populate('abroadCountry', 'title')
    .lean();
  const userByRuknId = new Map(users.map((u) => [String(u.ruknId), u]));

  const plan = [];
  for (const row of rows) {
    const location = resolveLocation(row);
    const user = userByRuknId.get(row.ruknId);
    if (!location) errors.push(`ruknId=${row.ruknId}: location not found ${row.countryTitle} / ${row.areaTitle} / ${row.unitTitle}`);
    if (!user) errors.push(`ruknId=${row.ruknId}: no rukn user in DB ("${row.name}")`);
    else if (user.gender !== row.gender) errors.push(`ruknId=${row.ruknId}: gender mismatch json="${row.name}" (${row.gender}) db="${user.name}" (${user.gender})`);
    if (location && user) plan.push({ row, user, ...location });
  }

  const existingAdmins = await UnitAdmin.find({ ruknId: { $in: plan.filter((p) => p.row.isUnitAdmin).map((p) => p.row.ruknId) } })
    .select('ruknId isAbroad abroadUnit unit')
    .lean();
  const adminByRuknId = new Map(existingAdmins.map((a) => [String(a.ruknId), a]));

  const userOps = [];
  const adminsToCreate = [];
  const crossCountryMoves = [];
  let usersInSync = 0;
  let adminsInSync = 0;

  for (const { row, user, country, area, unit } of plan) {
    const inSync =
      user.isAbroad === true &&
      String(user.abroadCountry?._id) === String(country._id) &&
      String(user.abroadArea) === String(area._id) &&
      String(user.abroadUnit) === String(unit._id) &&
      user.unit === '-';

    if (inSync) {
      usersInSync++;
    } else {
      if (user.isAbroad && user.abroadCountry && String(user.abroadCountry._id) !== String(country._id)) {
        crossCountryMoves.push(`ruknId=${row.ruknId} ${user.name}: ${user.abroadCountry.title} → ${country.title} / ${unit.title}`);
      }
      userOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              isAbroad: true,
              abroadCountry: country._id,
              abroadArea: area._id,
              abroadUnit: unit._id,
              unit: '-',
            },
          },
        },
      });
    }

    if (!row.isUnitAdmin) continue;

    const existingAdmin = adminByRuknId.get(row.ruknId);
    if (existingAdmin) {
      if (existingAdmin.isAbroad && String(existingAdmin.abroadUnit) === String(unit._id)) adminsInSync++;
      else errors.push(`ruknId=${row.ruknId}: already a unit admin of "${existingAdmin.unit}"`);
      continue;
    }

    adminsToCreate.push({
      unit: unit.title,
      district: country.title,
      area: area.title,
      ruknId: row.ruknId,
      name: user.name,
      contactNo: user.contactNo || '',
      emailId: user.emailId || '',
      password: DEFAULT_PASSWORD,
      isActive: true,
      isAbroad: true,
      abroadCountry: country._id,
      abroadArea: area._id,
      abroadUnit: unit._id,
    });
  }

  // ── summary ────────────────────────────────────────────────────────────────
  const corrected = normalized.filter((r) => r.ruknId !== r.sourceRuknId);
  const adminRows = plan.filter((p) => p.row.isUnitAdmin);

  console.log('QATAR MEMBERS MIGRATION SUMMARY');
  console.log('─'.repeat(50));
  console.log(`  Source rows:               ${sourceRows.length}`);
  console.log(`  Unique members:            ${rows.length}`);
  console.log(`  Rukn ID corrections:       ${corrected.length}`);
  corrected.forEach((r) => console.log(`    ${r.sourceRuknId} → ${r.ruknId}  ${r.name}`));
  console.log(`  Members to move to Qatar:  ${userOps.length}`);
  console.log(`  Members already in sync:   ${usersInSync}`);
  console.log(`  Unit admins to create:     ${adminsToCreate.length}`);
  console.log(`  Unit admins already set:   ${adminsInSync}`);

  console.log('\n  Per unit:');
  const perUnit = new Map();
  plan.forEach(({ area, unit, row }) => {
    const key = `${area.title} / ${unit.title}`;
    const entry = perUnit.get(key) || { members: 0, admins: [] };
    entry.members++;
    if (row.isUnitAdmin) entry.admins.push(`${row.ruknId}`);
    perUnit.set(key, entry);
  });
  [...perUnit.entries()].sort().forEach(([key, v]) =>
    console.log(`    ${key.padEnd(28)} members=${String(v.members).padStart(2)}  admin=${v.admins.join(', ') || '—'}`)
  );

  if (adminRows.length) {
    console.log('\n  Unit admins:');
    adminRows.forEach(({ row, user, unit }) => console.log(`    ${unit.title.padEnd(10)} ${row.ruknId}  ${user.name}`));
  }

  if (crossCountryMoves.length) {
    console.log('\n  ⚠ Members moving from another abroad country:');
    crossCountryMoves.forEach((m) => console.log(`    ${m}`));
  }

  if (errors.length) {
    console.log(`\n✗ ${errors.length} problem(s) — nothing applied:`);
    errors.forEach((e) => console.log(`    ${e}`));
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log('\nDry run mode — no changes applied.');
    return;
  }

  if (!force) {
    const confirmed = await askConfirmation('\nApply these changes? (yes/no): ');
    if (!confirmed) {
      console.log('Migration cancelled.');
      return;
    }
  }

  // ── execute ────────────────────────────────────────────────────────────────
  let updatedCount = 0;
  if (userOps.length > 0) {
    const result = await User.bulkWrite(userOps, { ordered: false });
    updatedCount = result.modifiedCount;
  }

  // create() (not insertMany) so the UnitAdmin pre-save hook hashes the password.
  let createdAdmins = 0;
  for (const admin of adminsToCreate) {
    await UnitAdmin.create(admin);
    createdAdmins++;
  }

  console.log('\n✓ Migration completed');
  console.log(`  Members moved:       ${updatedCount}`);
  console.log(`  Unit admins created: ${createdAdmins}`);
};

main()
  .catch((error) => {
    console.error('\n✗ Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await ihthisabiConnection.close();
    } catch (_) {
      // connection may already be closed
    }
  });
