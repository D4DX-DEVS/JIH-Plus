/**
 * Migrate Districts / Areas / Units from backend/location.json into the
 * JIH location master collections (State → District → AreaMaster → UnitMaster).
 *
 * - Idempotent: existing docs (matched by name + parent) are reused, not recreated.
 * - Username (uniqueCode) and password are auto-generated using the same
 *   helpers the admin UI uses, so logins behave the same way after migration.
 * - Unit code collisions (same first-4 letters within the same area) are
 *   resolved by appending a numeric suffix via generateUnitCode().
 *
 * Usage:
 *   node scripts/migrateLocationFromJson.js --dry-run        # preview only
 *   node scripts/migrateLocationFromJson.js                  # asks to confirm
 *   node scripts/migrateLocationFromJson.js --yes            # no prompt
 *   node scripts/migrateLocationFromJson.js --state="Kerala" # override state name
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const readline = require('readline');

const State = require('../models/state');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');
const {
  generateDistrictCode,
  generateAreaCode,
  generateUnitCode,
  generateDistrictPassword,
  generateAreaPassword,
  generateUnitPassword
} = require('../utils/codeGenerator');

const locationRows = require(path.join(__dirname, '..', 'location.json'));

const norm = (v) => String(v || '').trim();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const stateArg = args.find((a) => a.startsWith('--state='));
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--yes') || args.includes('-y'),
    stateName: stateArg ? stateArg.split('=')[1].trim() : 'Kerala'
  };
};

const askConfirmation = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const a = norm(answer).toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });

const buildHierarchy = (rows) => {
  // Map<districtName, Map<areaName, Set<unitName>>>
  const tree = new Map();
  for (const row of rows) {
    const district = norm(row.District);
    const area = norm(row.Area);
    const unit = norm(row.Unit);
    if (!district || !area || !unit) continue;

    if (!tree.has(district)) tree.set(district, new Map());
    const areaMap = tree.get(district);
    if (!areaMap.has(area)) areaMap.set(area, new Set());
    areaMap.get(area).add(unit);
  }
  return tree;
};

const main = async () => {
  const { dryRun, force, stateName } = parseArgs();

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment variables.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
  });
  console.log('✓ Connected to JIH MongoDB');

  const tree = buildHierarchy(locationRows);

  const districtNames = [...tree.keys()];
  let totalAreas = 0;
  let totalUnits = 0;
  for (const areaMap of tree.values()) {
    totalAreas += areaMap.size;
    for (const units of areaMap.values()) totalUnits += units.size;
  }

  console.log('\nLOCATION JSON MIGRATION PREVIEW');
  console.log(`- Source rows         : ${locationRows.length}`);
  console.log(`- Unique districts    : ${districtNames.length}`);
  console.log(`- Unique areas        : ${totalAreas}`);
  console.log(`- Unique units        : ${totalUnits}`);
  console.log(`- Target state        : "${stateName}"`);

  if (dryRun) {
    console.log('\nDry run — no changes written.\n');
    await mongoose.disconnect();
    return;
  }

  if (!force) {
    const ok = await askConfirmation('\nProceed with migration? (yes/no): ');
    if (!ok) {
      console.log('Cancelled.');
      await mongoose.disconnect();
      return;
    }
  }

  // ── 1. Ensure state ────────────────────────────────────────────────────────
  let state = await State.findOne({ name: stateName });
  if (!state) {
    state = await State.create({ name: stateName });
    console.log(`✓ Created state: ${stateName}`);
  } else {
    console.log(`• State exists: ${stateName} (${state._id})`);
  }

  const stats = {
    districtsCreated: 0,
    districtsSkipped: 0,
    areasCreated: 0,
    areasSkipped: 0,
    unitsCreated: 0,
    unitsSkipped: 0
  };

  const createdCreds = {
    districts: [],
    areas: [],
    units: []
  };

  // ── 2. Districts ──────────────────────────────────────────────────────────
  for (const districtName of districtNames) {
    let district = await District.findOne({
      name: districtName,
      stateId: state._id
    });

    if (!district) {
      const { uniqueCode, sequentialNumber } = await generateDistrictCode(districtName, District, [AreaMaster, UnitMaster]);
      const password = generateDistrictPassword();
      district = await District.create({
        name: districtName,
        stateId: state._id,
        uniqueCode,
        password,
        sequentialNumber
      });
      stats.districtsCreated += 1;
      createdCreds.districts.push({ name: districtName, uniqueCode, password });
      console.log(`  ✓ District created: ${districtName}  →  ${uniqueCode} / ${password}`);
    } else {
      stats.districtsSkipped += 1;
    }

    const districtSeqCode = String(district.sequentialNumber).padStart(2, '0');
    const areaMap = tree.get(districtName);

    // ── 3. Areas under this district ────────────────────────────────────────
    for (const [areaName, unitSet] of areaMap.entries()) {
      let area = await AreaMaster.findOne({
        name: areaName,
        districtId: district._id
      });

      if (!area) {
        const { uniqueCode, randomCode } = await generateAreaCode(areaName, districtSeqCode, AreaMaster, [District, UnitMaster]);
        const password = generateAreaPassword();
        area = await AreaMaster.create({
          name: areaName,
          districtId: district._id,
          uniqueCode,
          password,
          randomCode
        });
        stats.areasCreated += 1;
        createdCreds.areas.push({
          district: districtName,
          name: areaName,
          uniqueCode,
          password
        });
      } else {
        stats.areasSkipped += 1;
      }

      // ── 4. Units under this area ──────────────────────────────────────────
      for (const unitName of unitSet) {
        const existingUnit = await UnitMaster.findOne({
          name: unitName,
          areaId: area._id
        });
        if (existingUnit) {
          stats.unitsSkipped += 1;
          continue;
        }

        const { uniqueCode } = await generateUnitCode(
          unitName,
          districtSeqCode,
          area.randomCode,
          UnitMaster,
          [District, AreaMaster]
        );
        const password = generateUnitPassword();

        await UnitMaster.create({
          name: unitName,
          areaId: area._id,
          districtId: district._id,
          uniqueCode,
          password
        });
        stats.unitsCreated += 1;
        createdCreds.units.push({
          district: districtName,
          area: areaName,
          name: unitName,
          uniqueCode,
          password
        });
      }
    }
  }

  console.log('\nMIGRATION SUMMARY');
  console.log(`- Districts created  : ${stats.districtsCreated}`);
  console.log(`- Districts skipped  : ${stats.districtsSkipped}`);
  console.log(`- Areas created      : ${stats.areasCreated}`);
  console.log(`- Areas skipped      : ${stats.areasSkipped}`);
  console.log(`- Units created      : ${stats.unitsCreated}`);
  console.log(`- Units skipped      : ${stats.unitsSkipped}`);

  // Dump credentials so they can be copied off the terminal if needed.
  const fs = require('fs');
  const dumpPath = path.join(__dirname, '..', `location-migration-${Date.now()}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(createdCreds, null, 2));
  console.log(`\nCredentials for newly-created rows written to:\n  ${dumpPath}`);

  await mongoose.disconnect();
};

main()
  .catch(async (err) => {
    console.error('\n✗ Location migration failed:', err);
    try { await mongoose.disconnect(); } catch (_) { /* noop */ }
    process.exitCode = 1;
  });
