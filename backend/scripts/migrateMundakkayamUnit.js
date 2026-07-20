/**
 * Migration: Mundakkayam → Mundakkayam Town
 *
 * Problem:
 *   - Users, Submissions and AlternativeSubmissions are stored with unit = "Mundakkayam"
 *   - The correct unit name is "Mundakkayam Town"
 *   - The UnitAdmin for this area also has a mismatched unit name
 *   - This causes the UnitAdmin dashboard to show 0 members and 0 submissions
 *
 * What this script does:
 *   1. Prints a dry-run summary of affected records
 *   2. On confirmation, updates:
 *        User          unit "Mundakkayam"              → "Mundakkayam Town"
 *        UnitAdmin     unit "Mundakkayam"/"Mudakkayam" → "Mundakkayam Town"
 *        Submission    unit "Mundakkayam"              → "Mundakkayam Town"
 *        AlternativeSubmit  unit "Mundakkayam"         → "Mundakkayam Town"
 */

const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// DB connection (dedicated ihthisabi connection)
// ---------------------------------------------------------------------------
const connectDB = async () => {
  const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MongoDB URI not found. Check IHTHISABI_MONGODB_URI in .env');
  }
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✓ Connected to Ihtisabi database\n');
};

// ---------------------------------------------------------------------------
// Models (use raw mongoose on the default connection for script simplicity)
// ---------------------------------------------------------------------------
const userSchema       = new mongoose.Schema({}, { strict: false });
const unitAdminSchema  = new mongoose.Schema({}, { strict: false });
const submissionSchema = new mongoose.Schema({}, { strict: false });
const altSubmitSchema  = new mongoose.Schema({}, { strict: false });

const User             = mongoose.model('User',             userSchema,       'users');
const UnitAdmin        = mongoose.model('UnitAdmin',        unitAdminSchema,  'unitadmins');
const Submission       = mongoose.model('Submission',       submissionSchema, 'submissions');
const AlternativeSubmit = mongoose.model('AlternativeSubmit', altSubmitSchema, 'alternativesubmits');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ask = (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const run = async () => {
  await connectDB();

  // ── Dry-run analysis ─────────────────────────────────────────────────────

  // Users with old unit names (case-insensitive)
  const usersToMigrate = await User.find({
    unit: { $regex: /^Mundakkayam$/i },
  }).select('ruknId name unit district area').lean();

  // UnitAdmins with old unit names
  const adminPattern = /^(Mundakkayam|Mudakkayam)$/i;
  const adminsToMigrate = await UnitAdmin.find({
    unit: { $regex: adminPattern },
  }).select('ruknId name unit district area').lean();

  // Submissions with old unit name
  const submissionsToMigrate = await Submission.find({
    unit: { $regex: /^Mundakkayam$/i },
  }).select('ruknName ruknId unit').lean();

  // AlternativeSubmissions with old unit name
  const altSubmitsToMigrate = await AlternativeSubmit.find({
    unit: { $regex: /^Mundakkayam$/i },
  }).select('ruknName ruknId unit').lean();

  console.log('='.repeat(60));
  console.log('DRY RUN SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nUsers with unit = "Mundakkayam": ${usersToMigrate.length}`);
  if (usersToMigrate.length > 0) {
    const sample = usersToMigrate.slice(0, 5);
    sample.forEach((u) =>
      console.log(`  [${u.ruknId}] ${u.name} — unit: "${u.unit}", area: "${u.area}", district: "${u.district}"`)
    );
    if (usersToMigrate.length > 5) console.log(`  ... and ${usersToMigrate.length - 5} more`);
  }

  console.log(`\nUnitAdmins with unit = "Mundakkayam" / "Mudakkayam": ${adminsToMigrate.length}`);
  adminsToMigrate.forEach((a) =>
    console.log(`  [${a.ruknId}] ${a.name} — unit: "${a.unit}"`)
  );

  console.log(`\nSubmissions with unit = "Mundakkayam": ${submissionsToMigrate.length}`);
  if (submissionsToMigrate.length > 0) {
    submissionsToMigrate.slice(0, 5).forEach((s) =>
      console.log(`  [${s.ruknId || '—'}] ${s.ruknName || '—'} — unit: "${s.unit}"`)
    );
    if (submissionsToMigrate.length > 5) console.log(`  ... and ${submissionsToMigrate.length - 5} more`);
  }

  console.log(`\nAlternativeSubmissions with unit = "Mundakkayam": ${altSubmitsToMigrate.length}`);
  if (altSubmitsToMigrate.length > 0) {
    altSubmitsToMigrate.slice(0, 5).forEach((s) =>
      console.log(`  [${s.ruknId || '—'}] ${s.ruknName || '—'} — unit: "${s.unit}"`)
    );
    if (altSubmitsToMigrate.length > 5) console.log(`  ... and ${altSubmitsToMigrate.length - 5} more`);
  }

  if (usersToMigrate.length === 0 && adminsToMigrate.length === 0 && submissionsToMigrate.length === 0 && altSubmitsToMigrate.length === 0) {
    console.log('\nNothing to migrate. Exiting.');
    process.exit(0);
  }

  console.log('\nTarget unit name after migration: "Mundakkayam Town"');
  console.log('='.repeat(60));

  const confirm = await ask('\nProceed with migration? (yes/no): ');
  if (confirm !== 'yes' && confirm !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  // ── Migrate Users ─────────────────────────────────────────────────────────
  if (usersToMigrate.length > 0) {
    const userResult = await User.updateMany(
      { unit: { $regex: /^Mundakkayam$/i } },
      { $set: { unit: 'Mundakkayam Town' } }
    );
    console.log(`\n✓ Users updated: ${userResult.modifiedCount} of ${usersToMigrate.length}`);
  }

  // ── Migrate UnitAdmins ────────────────────────────────────────────────────
  if (adminsToMigrate.length > 0) {
    const adminResult = await UnitAdmin.updateMany(
      { unit: { $regex: adminPattern } },
      { $set: { unit: 'Mundakkayam Town' } }
    );
    console.log(`✓ UnitAdmins updated: ${adminResult.modifiedCount} of ${adminsToMigrate.length}`);
  }

  // ── Migrate Submissions ───────────────────────────────────────────────────
  if (submissionsToMigrate.length > 0) {
    const subResult = await Submission.updateMany(
      { unit: { $regex: /^Mundakkayam$/i } },
      { $set: { unit: 'Mundakkayam Town' } }
    );
    console.log(`✓ Submissions updated: ${subResult.modifiedCount} of ${submissionsToMigrate.length}`);
  }

  // ── Migrate AlternativeSubmissions ────────────────────────────────────────
  if (altSubmitsToMigrate.length > 0) {
    const altResult = await AlternativeSubmit.updateMany(
      { unit: { $regex: /^Mundakkayam$/i } },
      { $set: { unit: 'Mundakkayam Town' } }
    );
    console.log(`✓ AlternativeSubmissions updated: ${altResult.modifiedCount} of ${altSubmitsToMigrate.length}`);
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  const remainingUsers  = await User.countDocuments({ unit: { $regex: /^Mundakkayam$/i } });
  const remainingAdmins = await UnitAdmin.countDocuments({ unit: { $regex: adminPattern } });
  const remainingSubs   = await Submission.countDocuments({ unit: { $regex: /^Mundakkayam$/i } });
  const remainingAlts   = await AlternativeSubmit.countDocuments({ unit: { $regex: /^Mundakkayam$/i } });

  console.log('\n── Verification ──────────────────────────────────────────────');
  console.log(`Users still with old unit name:               ${remainingUsers}`);
  console.log(`UnitAdmins still with old unit name:          ${remainingAdmins}`);
  console.log(`Submissions still with old unit name:         ${remainingSubs}`);
  console.log(`AlternativeSubmissions still with old unit:   ${remainingAlts}`);

  const newUsersCount  = await User.countDocuments({ unit: 'Mundakkayam Town' });
  const newAdminsCount = await UnitAdmin.countDocuments({ unit: 'Mundakkayam Town' });
  const newSubsCount   = await Submission.countDocuments({ unit: 'Mundakkayam Town' });
  const newAltsCount   = await AlternativeSubmit.countDocuments({ unit: 'Mundakkayam Town' });
  console.log(`Users now in "Mundakkayam Town":               ${newUsersCount}`);
  console.log(`UnitAdmins now in "Mundakkayam Town":          ${newAdminsCount}`);
  console.log(`Submissions now in "Mundakkayam Town":         ${newSubsCount}`);
  console.log(`AlternativeSubmissions now in "Mundakkayam Town": ${newAltsCount}`);

  if (remainingUsers === 0 && remainingAdmins === 0 && remainingSubs === 0 && remainingAlts === 0) {
    console.log('\n✓ Migration completed successfully.');
  } else {
    console.log('\n⚠ Some records were not migrated. Please check manually.');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
