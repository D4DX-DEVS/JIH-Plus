const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ihthisabiConnection = require('../config/ihthisabiConnection');
const User = require('../models/ihthisabi/User');
const DistrictAdmin = require('../models/ihthisabi/DistrictAdmin');
const districtAdminRows = require('../ihthisabi district admins.json');

const DEFAULT_PASSWORD = 'districtadmin123';

const normalizeString = (value) => String(value == null ? '' : value).trim();

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--yes') || args.includes('-y')
  };
};

const askConfirmation = async (question) => {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = normalizeString(answer).toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
};

// Validate + resolve each JSON row against the existing rukn `User` record.
// A row only qualifies if the rukn exists AND is registered under the same
// district stated in the JSON (case-insensitive/trim match — verified against
// production data, where JSON district casing differs from the DB's).
const resolveRows = async (rows) => {
  const resolved = [];
  const skipped = [];
  const seenRuknIds = new Set();

  for (const row of rows) {
    const ruknId = normalizeString(row['RUKN ID']);
    const jsonDistrict = normalizeString(row['DISTRICT']);

    if (!ruknId || !jsonDistrict) {
      skipped.push({ ruknId, jsonDistrict, reason: 'Missing RUKN ID or DISTRICT in source row' });
      continue;
    }

    if (seenRuknIds.has(ruknId)) {
      skipped.push({ ruknId, jsonDistrict, reason: 'Duplicate RUKN ID in source file' });
      continue;
    }
    seenRuknIds.add(ruknId);

    const user = await User.findOne({ ruknId, role: 'rukn' }).select('ruknId name district contactNo emailId');

    if (!user) {
      skipped.push({ ruknId, jsonDistrict, reason: 'No rukn found with this RUKN ID' });
      continue;
    }

    const dbDistrict = normalizeString(user.district);
    if (!dbDistrict || dbDistrict.toLowerCase() !== jsonDistrict.toLowerCase()) {
      skipped.push({
        ruknId,
        jsonDistrict,
        reason: `District mismatch: json="${jsonDistrict}" db="${dbDistrict || '(empty)'}"`
      });
      continue;
    }

    resolved.push({
      ruknId,
      name: user.name,
      district: user.district, // store DB-cased value so it matches existing User.district values
      contactNo: user.contactNo || '',
      emailId: user.emailId || ''
    });
  }

  return { resolved, skipped };
};

const hasAdminChanges = (existing, incoming) => {
  return (
    existing.name !== incoming.name ||
    (existing.district || '') !== incoming.district ||
    (existing.contactNo || '') !== incoming.contactNo ||
    (existing.emailId || '') !== incoming.emailId ||
    existing.isActive !== true
  );
};

const main = async () => {
  const { dryRun, force } = parseArgs();

  if (!ihthisabiConnection.ihthisabiUri) {
    throw new Error('IHTHISABI_MONGODB_URI is missing in environment variables.');
  }

  await ihthisabiConnection.asPromise();
  console.log('✓ Connected to IHTHISABI database');

  const { resolved, skipped } = await resolveRows(districtAdminRows);

  const existingAdmins = await DistrictAdmin.find({})
    .select('ruknId name district contactNo emailId isActive')
    .lean();
  const existingById = new Map(existingAdmins.map((a) => [String(a.ruknId), a]));

  const toCreate = [];
  const toUpdate = [];

  for (const incoming of resolved) {
    const existing = existingById.get(incoming.ruknId);
    if (!existing) {
      toCreate.push(incoming);
      continue;
    }
    if (hasAdminChanges(existing, incoming)) {
      toUpdate.push(incoming);
    }
  }

  console.log('\nDISTRICT ADMIN JSON SYNC SUMMARY');
  console.log(`- Source rows: ${districtAdminRows.length}`);
  console.log(`- Valid (rukn found + district matches): ${resolved.length}`);
  console.log(`- Skipped: ${skipped.length}`);
  console.log(`- To create: ${toCreate.length}`);
  console.log(`- To update: ${toUpdate.length}`);

  if (skipped.length > 0) {
    console.log('\nSkipped rows:');
    skipped.forEach((row) => {
      console.log(`  - ruknId=${row.ruknId || '(missing)'} district="${row.jsonDistrict || '(missing)'}" -> ${row.reason}`);
    });
  }

  if (toCreate.length > 0) {
    console.log('\nTo create:');
    toCreate.forEach((row) => console.log(`  - ruknId=${row.ruknId} name="${row.name}" district="${row.district}"`));
  }

  if (toUpdate.length > 0) {
    console.log('\nTo update:');
    toUpdate.forEach((row) => console.log(`  - ruknId=${row.ruknId} name="${row.name}" district="${row.district}"`));
  }

  if (dryRun) {
    console.log('\nDry run enabled. No changes applied.');
    return;
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  if (!force) {
    const confirmed = await askConfirmation('\nApply these changes? (yes/no): ');
    if (!confirmed) {
      console.log('Migration cancelled.');
      return;
    }
  }

  if (toCreate.length > 0) {
    const createPayload = toCreate.map((row) => ({
      ...row,
      password: DEFAULT_PASSWORD,
      isActive: true
    }));
    await DistrictAdmin.insertMany(createPayload, { ordered: false });
  }

  if (toUpdate.length > 0) {
    const updateOps = toUpdate.map((row) => ({
      updateOne: {
        filter: { ruknId: row.ruknId },
        update: {
          $set: {
            name: row.name,
            district: row.district,
            contactNo: row.contactNo,
            emailId: row.emailId,
            isActive: true
          }
        }
      }
    }));
    await DistrictAdmin.bulkWrite(updateOps);
  }

  console.log('\n✓ District admin JSON migration completed successfully.');
};

main()
  .catch((error) => {
    console.error('\n✗ District admin JSON migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await ihthisabiConnection.close();
    } catch (_) {
      // No-op: connection may already be closed.
    }
  });
