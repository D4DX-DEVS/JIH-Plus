/**
 * Migration: Abroad Members from abroad-members.json
 *
 * Logic:
 *  - For each row in the JSON:
 *      1. Find or create AbroadCountry (by title)
 *      2. Find or create AbroadArea    (by title + countryId)
 *      3. Find or create AbroadUnit    (by title + areaId + countryId)
 *      4. Find User by ruknId:
 *          - EXISTS  → update isAbroad, abroadCountry, abroadArea, abroadUnit
 *                      and patch contactNo / emailId if they were empty
 *          - MISSING → create new rukn user with all fields
 *
 * Usage:
 *   node scripts/migrateAbroadMembersFromJson.js            (interactive confirm)
 *   node scripts/migrateAbroadMembersFromJson.js --dry-run  (preview only)
 *   node scripts/migrateAbroadMembersFromJson.js --yes      (no prompt)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ihthisabiConnection = require('../config/ihthisabiConnection');
const User = require('../models/ihthisabi/User');
const AbroadCountry = require('../models/ihthisabi/AbroadCountry');
const AbroadArea = require('../models/ihthisabi/AbroadArea');
const AbroadUnit = require('../models/ihthisabi/AbroadUnit');

const SOURCE_FILE = path.join(__dirname, '..', 'uploads', 'abroad-members.json');
const abroadRows = require(SOURCE_FILE);

// ── helpers ──────────────────────────────────────────────────────────────────

const normalizeString = (value) => String(value ?? '').trim();
const normalizeKey    = (value) => normalizeString(value).toLowerCase();

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force:  args.includes('--yes') || args.includes('-y'),
  };
};

const askConfirmation = (question) =>
  new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(['y', 'yes'].includes(normalizeString(answer).toLowerCase()));
    });
  });

const normalizeRow = (row) => ({
  ruknId:       normalizeString(row['Rukn ID']),
  name:         normalizeString(row['Name']),
  countryTitle: normalizeString(row['Country']),
  areaTitle:    normalizeString(row['Area']),
  unitTitle:    normalizeString(row['Unit']),
  contactNo:    normalizeString(row['Mobile']),
  emailId:      normalizeString(row['Mail ID']),
  placeInKerala: normalizeString(row['Place in Kerala']),
});

/** Deduplicate by ruknId, keeping the last occurrence. */
const dedupeByRuknId = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (row.ruknId) map.set(row.ruknId, row);
  }
  return [...map.values()];
};

// ── catalogue builder (find-or-create with in-memory cache) ──────────────────

/**
 * Build the full Country → Area → Unit catalogue from the JSON rows,
 * persisting missing documents to the DB and returning lookup Maps.
 */
const buildCatalogue = async (rows, dryRun) => {
  // ── Countries ──────────────────────────────────────────────────────────────
  const uniqueCountryTitles = [...new Set(rows.map((r) => r.countryTitle).filter(Boolean))];

  const existingCountries = await AbroadCountry.find({}).select('_id title').lean();
  const countryByKey = new Map(existingCountries.map((c) => [normalizeKey(c.title), c]));

  const missingCountries = uniqueCountryTitles.filter((t) => !countryByKey.has(normalizeKey(t)));

  if (!dryRun && missingCountries.length > 0) {
    const inserted = await AbroadCountry.insertMany(
      missingCountries.map((title) => ({ title })),
      { ordered: false }
    );
    inserted.forEach((c) => countryByKey.set(normalizeKey(c.title), c));
  } else if (dryRun) {
    // Simulate IDs for dry-run so downstream code doesn't break
    missingCountries.forEach((title) => {
      if (!countryByKey.has(normalizeKey(title))) {
        countryByKey.set(normalizeKey(title), { _id: `dry-run-country-${title}`, title });
      }
    });
  }

  // Refresh after insert (captures any that were already there by another concurrent run)
  if (!dryRun) {
    const refreshed = await AbroadCountry.find({}).select('_id title').lean();
    refreshed.forEach((c) => countryByKey.set(normalizeKey(c.title), c));
  }

  // ── Areas ──────────────────────────────────────────────────────────────────
  const areaKeySet = new Set(
    rows
      .filter((r) => r.countryTitle && r.areaTitle)
      .map((r) => `${normalizeKey(r.countryTitle)}||${normalizeKey(r.areaTitle)}`)
  );

  const existingAreas = await AbroadArea.find({}).select('_id title countryId').lean();
  // key: `countryId||areaTitle`
  const areaByKey = new Map(
    existingAreas.map((a) => [`${String(a.countryId)}||${normalizeKey(a.title)}`, a])
  );

  const missingAreas = [];
  for (const compositeKey of areaKeySet) {
    const [ck, ak] = compositeKey.split('||');
    const country = countryByKey.get(ck);
    if (!country) continue;
    const lookupKey = `${String(country._id)}||${ak}`;
    if (!areaByKey.has(lookupKey)) {
      // Recover original casing from rows
      const sampleRow = rows.find(
        (r) => normalizeKey(r.countryTitle) === ck && normalizeKey(r.areaTitle) === ak
      );
      missingAreas.push({ title: sampleRow.areaTitle, countryId: country._id });
    }
  }

  if (!dryRun && missingAreas.length > 0) {
    const inserted = await AbroadArea.insertMany(missingAreas, { ordered: false });
    inserted.forEach((a) => areaByKey.set(`${String(a.countryId)}||${normalizeKey(a.title)}`, a));
  } else if (dryRun) {
    missingAreas.forEach((a) => {
      const key = `${String(a.countryId)}||${normalizeKey(a.title)}`;
      if (!areaByKey.has(key)) {
        areaByKey.set(key, { _id: `dry-run-area-${a.title}`, title: a.title, countryId: a.countryId });
      }
    });
  }

  if (!dryRun) {
    const refreshed = await AbroadArea.find({}).select('_id title countryId').lean();
    refreshed.forEach((a) => areaByKey.set(`${String(a.countryId)}||${normalizeKey(a.title)}`, a));
  }

  // ── Units ──────────────────────────────────────────────────────────────────
  const unitKeySet = new Set(
    rows
      .filter((r) => r.countryTitle && r.areaTitle && r.unitTitle)
      .map(
        (r) =>
          `${normalizeKey(r.countryTitle)}||${normalizeKey(r.areaTitle)}||${normalizeKey(r.unitTitle)}`
      )
  );

  const existingUnits = await AbroadUnit.find({}).select('_id title areaId countryId').lean();
  const unitByKey = new Map(
    existingUnits.map((u) => [`${String(u.areaId)}||${normalizeKey(u.title)}`, u])
  );

  const missingUnits = [];
  for (const compositeKey of unitKeySet) {
    const [ck, ak, uk] = compositeKey.split('||');
    const country = countryByKey.get(ck);
    if (!country) continue;
    const area = areaByKey.get(`${String(country._id)}||${ak}`);
    if (!area) continue;
    const lookupKey = `${String(area._id)}||${uk}`;
    if (!unitByKey.has(lookupKey)) {
      const sampleRow = rows.find(
        (r) =>
          normalizeKey(r.countryTitle) === ck &&
          normalizeKey(r.areaTitle) === ak &&
          normalizeKey(r.unitTitle) === uk
      );
      missingUnits.push({ title: sampleRow.unitTitle, areaId: area._id, countryId: country._id });
    }
  }

  if (!dryRun && missingUnits.length > 0) {
    const inserted = await AbroadUnit.insertMany(missingUnits, { ordered: false });
    inserted.forEach((u) => unitByKey.set(`${String(u.areaId)}||${normalizeKey(u.title)}`, u));
  } else if (dryRun) {
    missingUnits.forEach((u) => {
      const key = `${String(u.areaId)}||${normalizeKey(u.title)}`;
      if (!unitByKey.has(key)) {
        unitByKey.set(key, { _id: `dry-run-unit-${u.title}`, title: u.title, areaId: u.areaId, countryId: u.countryId });
      }
    });
  }

  if (!dryRun) {
    const refreshed = await AbroadUnit.find({}).select('_id title areaId countryId').lean();
    refreshed.forEach((u) => unitByKey.set(`${String(u.areaId)}||${normalizeKey(u.title)}`, u));
  }

  return { countryByKey, areaByKey, unitByKey, missingCountries, missingAreas, missingUnits };
};

// ── resolve catalogue refs for a single row ───────────────────────────────────

const resolveRefs = (row, countryByKey, areaByKey, unitByKey) => {
  const country = countryByKey.get(normalizeKey(row.countryTitle));
  if (!country) return null;

  const area = areaByKey.get(`${String(country._id)}||${normalizeKey(row.areaTitle)}`);
  if (!area) return null;

  const unit = unitByKey.get(`${String(area._id)}||${normalizeKey(row.unitTitle)}`);
  if (!unit) return null;

  return { country, area, unit };
};

// ── main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const { dryRun, force } = parseArgs();

  if (!ihthisabiConnection.ihthisabiUri) {
    throw new Error('IHTHISABI_MONGODB_URI is missing in environment variables.');
  }

  await ihthisabiConnection.asPromise();
  console.log('✓ Connected to IHTHISABI database\n');

  // Normalize and deduplicate source rows
  const rows = dedupeByRuknId(
    abroadRows
      .map(normalizeRow)
      .filter((r) => r.ruknId && r.countryTitle && r.areaTitle && r.unitTitle)
  );

  const skippedIncomplete = abroadRows.length - rows.length;

  // Build / refresh Country → Area → Unit catalogue
  const { countryByKey, areaByKey, unitByKey, missingCountries, missingAreas, missingUnits } =
    await buildCatalogue(rows, dryRun);

  // Look up all Users by ruknId in one query
  const allRuknIds = rows.map((r) => r.ruknId);
  const existingUsers = await User.find({ role: 'rukn', ruknId: { $in: allRuknIds } })
    .select('_id ruknId name isAbroad abroadCountry abroadArea abroadUnit contactNo emailId')
    .lean();
  const userByRuknId = new Map(existingUsers.map((u) => [String(u.ruknId), u]));

  // Build bulk operations
  const updateOps   = [];
  const toCreate    = [];
  const skippedBadRef = [];
  let alreadyInSync = 0;

  for (const row of rows) {
    const refs = resolveRefs(row, countryByKey, areaByKey, unitByKey);
    if (!refs) {
      skippedBadRef.push(row);
      continue;
    }

    const { country, area, unit } = refs;
    const existingUser = userByRuknId.get(row.ruknId);

    if (existingUser) {
      // Check if already fully in sync
      const sameCountry = String(existingUser.abroadCountry) === String(country._id);
      const sameArea    = String(existingUser.abroadArea)    === String(area._id);
      const sameUnit    = String(existingUser.abroadUnit)    === String(unit._id);
      const sameAbroad  = existingUser.isAbroad === true;

      if (sameAbroad && sameCountry && sameArea && sameUnit) {
        alreadyInSync++;
        continue;
      }

      const updateFields = {
        isAbroad:      true,
        abroadCountry: country._id,
        abroadArea:    area._id,
        abroadUnit:    unit._id,
      };

      // Patch contactNo / emailId only if currently empty
      if (!existingUser.contactNo && row.contactNo) updateFields.contactNo = row.contactNo;
      if (!existingUser.emailId   && row.emailId)   updateFields.emailId   = row.emailId;

      updateOps.push({
        updateOne: {
          filter: { _id: existingUser._id },
          update: { $set: updateFields },
        },
      });
    } else {
      toCreate.push({
        role:          'rukn',
        ruknId:        row.ruknId,
        name:          row.name || `Rukn ${row.ruknId}`,
        gender:        'Male', // default; no gender info in source
        unit:          unit.title,
        area:          area.title,
        district:      row.placeInKerala || '',
        contactNo:     row.contactNo || '',
        emailId:       row.emailId || '',
        country:       country.title,
        isAbroad:      true,
        abroadCountry: country._id,
        abroadArea:    area._id,
        abroadUnit:    unit._id,
        isActive:      true,
      });
    }
  }

  // ── summary ────────────────────────────────────────────────────────────────
  console.log('ABROAD MEMBERS MIGRATION SUMMARY');
  console.log('─'.repeat(50));
  console.log(`  Source rows (raw):         ${abroadRows.length}`);
  console.log(`  Skipped (incomplete data): ${skippedIncomplete}`);
  console.log(`  Valid unique rows:          ${rows.length}`);
  console.log(`  New countries to create:   ${missingCountries.length}  → ${missingCountries.join(', ') || '—'}`);
  console.log(`  New areas to create:       ${missingAreas.length}`);
  console.log(`  New units to create:       ${missingUnits.length}`);
  console.log(`  Users to update:           ${updateOps.length}`);
  console.log(`  New users to create:       ${toCreate.length}`);
  console.log(`  Already in sync:           ${alreadyInSync}`);
  console.log(`  Skipped (bad ref):         ${skippedBadRef.length}`);

  if (skippedBadRef.length > 0) {
    console.log('\n  Skipped rows (catalogue ref missing):');
    skippedBadRef.forEach((r) =>
      console.log(`    ruknId=${r.ruknId} | ${r.countryTitle} / ${r.areaTitle} / ${r.unitTitle}`)
    );
  }

  if (toCreate.length > 0) {
    console.log('\n  New members to insert (sample, up to 10):');
    toCreate.slice(0, 10).forEach((u) =>
      console.log(`    ruknId=${u.ruknId} | ${u.name} | ${u.country}`)
    );
    if (toCreate.length > 10) console.log(`    ... and ${toCreate.length - 10} more`);
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
  let createdCount = 0;
  const writeErrors = [];

  if (updateOps.length > 0) {
    const result = await User.bulkWrite(updateOps, { ordered: false });
    updatedCount = result.modifiedCount ?? updateOps.length;
  }

  if (toCreate.length > 0) {
    try {
      const result = await User.insertMany(toCreate, { ordered: false });
      createdCount = result.length;
    } catch (err) {
      // insertMany with ordered:false still inserts valid docs; collect write errors
      if (err.writeErrors) {
        writeErrors.push(...err.writeErrors.map((e) => ({
          ruknId: toCreate[e.index]?.ruknId,
          error:  e.errmsg || e.message,
        })));
        createdCount = toCreate.length - err.writeErrors.length;
      } else {
        throw err;
      }
    }
  }

  console.log('\n✓ Migration completed');
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Created: ${createdCount}`);

  if (writeErrors.length > 0) {
    console.warn(`\n  ⚠ ${writeErrors.length} insert error(s):`);
    writeErrors.forEach((e) => console.warn(`    ruknId=${e.ruknId} → ${e.error}`));
  }
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
