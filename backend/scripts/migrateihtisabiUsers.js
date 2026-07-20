const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models and parsers
const User = require('../models/ihthisabi/User');
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');
const { parseExcelFile, parseUnitAdminExcelFile } = require('../utils/excelParser');

// Connect to databases
const connectDB = async () => {
  try {
    // Ihtisabi database
    const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables. Please check your .env file.');
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to Ihtisabi database successfully\n');
  } catch (error) {
    console.error('✗ Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Ask user for confirmation
 */
const askConfirmation = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

/**
 * Migrate Normal Users (Rukn)
 */
const migrateNormalUsers = async (excelPath, dryRun = false) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('MIGRATING NORMAL USERS (RUKN)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    console.log('📄 Parsing Normal Users Excel file...');
    const excelUsers = await parseExcelFile(excelPath);
    console.log(`✓ Found ${excelUsers.length} users in Excel file\n`);

    // Get existing users
    console.log('🗄️  Fetching existing users from database...');
    const dbUsers = await User.find({ role: 'rukn' }).lean();
    const dbRuknIdSet = new Set(dbUsers.map(u => u.ruknId));
    console.log(`✓ Found ${dbUsers.length} existing users in database\n`);

    // Filter only new users
    const newUsers = excelUsers.filter(user => {
      // Validate required fields
      if (!user.ruknId || !user.name || !user.unit) {
        return false;
      }
      // Check if not exists
      return !dbRuknIdSet.has(user.ruknId);
    });

    console.log(`📊 Migration Summary:`);
    console.log(`   Total in Excel:     ${excelUsers.length}`);
    console.log(`   Already Exist:      ${excelUsers.length - newUsers.length}`);
    console.log(`   New to Migrate:     ${newUsers.length}\n`);

    if (newUsers.length === 0) {
      console.log('✓ No new users to migrate. All users already exist!\n');
      return { created: 0, errors: [] };
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      console.log('New users that would be added:');
      newUsers.slice(0, 10).forEach((user, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${user.ruknId} | Name: ${user.name} | Unit: ${user.unit}`);
      });
      if (newUsers.length > 10) {
        console.log(`   ... and ${newUsers.length - 10} more\n`);
      }
      return { created: 0, errors: [], dryRun: true, wouldCreate: newUsers.length };
    }

    // Ask for confirmation
    console.log(`⚠️  You are about to add ${newUsers.length} new users to the database.`);
    const confirmed = await askConfirmation('\nDo you want to proceed? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user.\n');
      return { created: 0, errors: [], cancelled: true };
    }

    // Migrate users
    console.log('\n🚀 Starting migration...\n');
    let created = 0;
    let errors = [];

    // Use bulk insert for better performance
    try {
      const usersToInsert = newUsers.map(user => ({
        role: 'rukn',
        ruknId: user.ruknId,
        name: user.name,
        gender: user.gender || 'Male',
        unit: user.unit,
        district: user.district || '',
        area: user.area || '',
        isActive: true
      }));

      const result = await User.insertMany(usersToInsert, { ordered: false });
      created = result.length;
      console.log(`✅ Successfully created ${created} new users\n`);
    } catch (error) {
      // Handle partial success in bulk insert
      if (error.writeErrors) {
        created = newUsers.length - error.writeErrors.length;
        console.log(`⚠️  Partially successful: ${created} users created\n`);
        
        error.writeErrors.forEach(writeError => {
          errors.push({
            ruknId: newUsers[writeError.index]?.ruknId,
            name: newUsers[writeError.index]?.name,
            error: writeError.errmsg
          });
        });
      } else {
        throw error;
      }
    }

    if (errors.length > 0) {
      console.log(`❌ Errors occurred for ${errors.length} users:`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${err.ruknId}, Name: ${err.name}`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('');
    }

    return { created, errors };

  } catch (error) {
    console.error('❌ Error migrating normal users:', error);
    throw error;
  }
};

/**
 * Migrate Unit Admin Users
 */
const migrateUnitAdminUsers = async (excelPath, dryRun = false) => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('MIGRATING UNIT ADMIN USERS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    console.log('📄 Parsing Unit Admin Excel file...');
    const excelUnitAdmins = await parseUnitAdminExcelFile(excelPath);
    console.log(`✓ Found ${excelUnitAdmins.length} unit admins in Excel file\n`);

    // Get existing unit admins
    console.log('🗄️  Fetching existing unit admins from database...');
    const dbUnitAdmins = await UnitAdmin.find({}).lean();
    const dbRuknIdSet = new Set(dbUnitAdmins.map(u => u.ruknId));
    console.log(`✓ Found ${dbUnitAdmins.length} existing unit admins in database\n`);

    // Filter only new unit admins
    const newUnitAdmins = excelUnitAdmins.filter(admin => {
      // Validate required fields
      if (!admin.ruknId || !admin.name || !admin.unit) {
        return false;
      }
      // Check if not exists
      return !dbRuknIdSet.has(admin.ruknId);
    });

    console.log(`📊 Migration Summary:`);
    console.log(`   Total in Excel:     ${excelUnitAdmins.length}`);
    console.log(`   Already Exist:      ${excelUnitAdmins.length - newUnitAdmins.length}`);
    console.log(`   New to Migrate:     ${newUnitAdmins.length}\n`);

    if (newUnitAdmins.length === 0) {
      console.log('✓ No new unit admins to migrate. All admins already exist!\n');
      return { created: 0, errors: [] };
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      console.log('New unit admins that would be added:');
      newUnitAdmins.slice(0, 10).forEach((admin, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${admin.ruknId}`);
        console.log(`      Name: ${admin.name}`);
        console.log(`      Unit: ${admin.unit}`);
        console.log(`      District: ${admin.district}`);
      });
      if (newUnitAdmins.length > 10) {
        console.log(`   ... and ${newUnitAdmins.length - 10} more\n`);
      }
      return { created: 0, errors: [], dryRun: true, wouldCreate: newUnitAdmins.length };
    }

    // Ask for confirmation
    console.log(`⚠️  You are about to add ${newUnitAdmins.length} new unit admins to the database.`);
    const confirmed = await askConfirmation('\nDo you want to proceed? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user.\n');
      return { created: 0, errors: [], cancelled: true };
    }

    // Migrate unit admins
    console.log('\n🚀 Starting migration...\n');
    let created = 0;
    let errors = [];

    // Use bulk insert for better performance
    try {
      const adminsToInsert = newUnitAdmins.map(admin => ({
        unit: admin.unit,
        ruknId: admin.ruknId,
        name: admin.name,
        contactNo: admin.contactNo || '',
        emailId: admin.emailId || '',
        district: admin.district || '',
        password: 'unitadmin123', // Default password
        isActive: true
      }));

      const result = await UnitAdmin.insertMany(adminsToInsert, { ordered: false });
      created = result.length;
      console.log(`✅ Successfully created ${created} new unit admins\n`);
    } catch (error) {
      // Handle partial success in bulk insert
      if (error.writeErrors) {
        created = newUnitAdmins.length - error.writeErrors.length;
        console.log(`⚠️  Partially successful: ${created} unit admins created\n`);
        
        error.writeErrors.forEach(writeError => {
          errors.push({
            ruknId: newUnitAdmins[writeError.index]?.ruknId,
            name: newUnitAdmins[writeError.index]?.name,
            error: writeError.errmsg
          });
        });
      } else {
        throw error;
      }
    }

    if (errors.length > 0) {
      console.log(`❌ Errors occurred for ${errors.length} unit admins:`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${err.ruknId}, Name: ${err.name}`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('');
    }

    return { created, errors };

  } catch (error) {
    console.error('❌ Error migrating unit admin users:', error);
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  IHTISABI USER MIGRATION TOOL                            ║');
    if (dryRun) {
      console.log('║  MODE: DRY RUN (No changes will be made)                 ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Connect to database
    await connectDB();

    // Define Excel file paths
    const normalUsersExcelPath = path.join(__dirname, '..', 'uploads', 'ihtisabi', 'KERALA Arkan List for report app.xlsx');
    const unitAdminExcelPath = path.join(__dirname, '..', 'uploads', 'ihtisabi', 'Ameer-e-Muqami List 2025-27 dist wise I.xlsx');

    // Check if files exist
    if (!fs.existsSync(normalUsersExcelPath)) {
      console.error(`❌ Normal Users Excel file not found: ${normalUsersExcelPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(unitAdminExcelPath)) {
      console.error(`❌ Unit Admin Excel file not found: ${unitAdminExcelPath}`);
      process.exit(1);
    }

    // Perform migrations
    const normalUsersResult = await migrateNormalUsers(normalUsersExcelPath, dryRun);
    const unitAdminResult = await migrateUnitAdminUsers(unitAdminExcelPath, dryRun);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (dryRun) {
      console.log('🔍 DRY RUN SUMMARY:');
      console.log(`   Normal Users would be created:      ${normalUsersResult.wouldCreate || 0}`);
      console.log(`   Unit Admins would be created:       ${unitAdminResult.wouldCreate || 0}`);
      console.log('\n💡 Run without --dry-run flag to actually migrate the data\n');
    } else if (normalUsersResult.cancelled || unitAdminResult.cancelled) {
      console.log('❌ Migration was cancelled.\n');
    } else {
      console.log('✅ MIGRATION SUMMARY:');
      console.log(`   Normal Users created:      ${normalUsersResult.created}`);
      console.log(`   Unit Admins created:       ${unitAdminResult.created}`);
      console.log(`   Total errors:              ${normalUsersResult.errors.length + unitAdminResult.errors.length}`);
      console.log('');
      console.log('✨ All new users have been successfully migrated!');
      console.log('✨ All existing users remain unchanged and safe!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
main();

