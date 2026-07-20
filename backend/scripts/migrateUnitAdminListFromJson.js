const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ihthisabiConnection = require('../config/ihthisabiConnection');
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');
const unitAdminRows = require('../uploads/ihtisabi/unitAdmin.json');

const DEFAULT_PASSWORD = 'unitadmin123';

const EMAIL_REGEX = /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/;
const CONTACT_REGEX = /^[\d\s\+\-\(\)]{10,20}$/;

const normalizeString = (value) => String(value || '').trim();

const sanitizeEmail = (value) => {
  const email = normalizeString(value).toLowerCase();
  if (!email) return '';
  return EMAIL_REGEX.test(email) ? email : '';
};

const sanitizeContact = (value) => {
  const contact = normalizeString(value);
  if (!contact) return '';
  return CONTACT_REGEX.test(contact) ? contact : '';
};

const normalizeAdminRow = (row) => {
  return {
    ruknId: normalizeString(row['Rukn ID']),
    name: normalizeString(row['Ameer Name']),
    unit: normalizeString(row.Unit),
    district: normalizeString(row.District),
    area: normalizeString(row.Area),
    contactNo: sanitizeContact(row['Contact No']),
    emailId: sanitizeEmail(row['Email Id']),
    isActive: true
  };
};

const dedupeByRuknId = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!row.ruknId) continue;
    map.set(row.ruknId, row);
  }
  return [...map.values()];
};

const hasAdminChanges = (existing, incoming) => {
  return (
    existing.name !== incoming.name ||
    existing.unit !== incoming.unit ||
    (existing.district || '') !== incoming.district ||
    (existing.area || '') !== incoming.area ||
    (existing.contactNo || '') !== incoming.contactNo ||
    (existing.emailId || '') !== incoming.emailId ||
    existing.isActive !== incoming.isActive
  );
};

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

const main = async () => {
  const { dryRun, force } = parseArgs();

  if (!ihthisabiConnection.ihthisabiUri) {
    throw new Error('IHTHISABI_MONGODB_URI is missing in environment variables.');
  }

  await ihthisabiConnection.asPromise();
  console.log('✓ Connected to IHTHISABI database');

  const normalizedRows = dedupeByRuknId(unitAdminRows.map(normalizeAdminRow)).filter(
    (row) => row.ruknId && row.name && row.unit
  );

  const incomingById = new Map(normalizedRows.map((row) => [row.ruknId, row]));
  const incomingIds = new Set(incomingById.keys());

  const existingAdmins = await UnitAdmin.find({})
    .select('ruknId name unit district area contactNo emailId isActive')
    .lean();

  const existingById = new Map(
    existingAdmins.filter((u) => u.ruknId).map((u) => [String(u.ruknId), u])
  );

  const toCreate = [];
  const toUpdate = [];
  const toDeleteIds = [];

  for (const [ruknId, incoming] of incomingById.entries()) {
    const existing = existingById.get(ruknId);
    if (!existing) {
      toCreate.push(incoming);
      continue;
    }
    if (hasAdminChanges(existing, incoming)) {
      toUpdate.push(incoming);
    }
  }

  for (const [ruknId] of existingById.entries()) {
    if (!incomingIds.has(ruknId)) {
      toDeleteIds.push(ruknId);
    }
  }

  console.log('\nUNIT ADMIN JSON SYNC SUMMARY');
  console.log(`- Source records: ${normalizedRows.length}`);
  console.log(`- Existing DB admins: ${existingAdmins.length}`);
  console.log(`- To create: ${toCreate.length}`);
  console.log(`- To update: ${toUpdate.length}`);
  console.log(`- To delete: ${toDeleteIds.length}`);

  if (dryRun) {
    console.log('\nDry run enabled. No changes applied.');
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
      password: DEFAULT_PASSWORD
    }));
    await UnitAdmin.insertMany(createPayload, { ordered: false });
  }

  if (toUpdate.length > 0) {
    const updateOps = toUpdate.map((row) => ({
      updateOne: {
        filter: { ruknId: row.ruknId },
        update: {
          $set: {
            name: row.name,
            unit: row.unit,
            district: row.district,
            area: row.area,
            contactNo: row.contactNo,
            emailId: row.emailId,
            isActive: true
          }
        }
      }
    }));
    await UnitAdmin.bulkWrite(updateOps);
  }

  if (toDeleteIds.length > 0) {
    await UnitAdmin.deleteMany({
      ruknId: { $in: toDeleteIds }
    });
  }

  console.log('\n✓ Unit admin JSON migration completed successfully.');
};

main()
  .catch((error) => {
    console.error('\n✗ Unit admin JSON migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await ihthisabiConnection.close();
    } catch (_) {
      // No-op: connection may already be closed.
    }
  });
