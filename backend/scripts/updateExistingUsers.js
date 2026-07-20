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
 * Find users with differences between Excel and Database
 */
const findUsersWithDifferences = async (excelPath) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ANALYZING NORMAL USERS WITH DIFFERENCES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    console.log('📄 Parsing Normal Users Excel file...');
    const excelUsers = await parseExcelFile(excelPath);
    console.log(`✓ Found ${excelUsers.length} users in Excel file\n`);

    // Get existing users
    console.log('🗄️  Fetching existing users from database...');
    const dbUsers = await User.find({ role: 'rukn' }).lean();
    console.log(`✓ Found ${dbUsers.length} existing users in database\n`);

    console.log('🔍 Finding users with differences...\n');

    const usersWithDifferences = [];
    const dbUserMap = new Map(dbUsers.map(u => [u.ruknId, u]));

    for (const excelUser of excelUsers) {
      if (!excelUser.ruknId) continue;
      
      const dbUser = dbUserMap.get(excelUser.ruknId);
      if (!dbUser) continue; // Skip new users

      // Check for differences
      const hasChanges = 
        excelUser.name !== dbUser.name ||
        excelUser.unit !== dbUser.unit ||
        excelUser.gender !== dbUser.gender;

      if (hasChanges) {
        usersWithDifferences.push({
          ruknId: excelUser.ruknId,
          dbData: {
            name: dbUser.name,
            unit: dbUser.unit,
            gender: dbUser.gender
          },
          excelData: {
            name: excelUser.name,
            unit: excelUser.unit,
            gender: excelUser.gender
          },
          changes: {
            name: excelUser.name !== dbUser.name,
            unit: excelUser.unit !== dbUser.unit,
            gender: excelUser.gender !== dbUser.gender
          }
        });
      }
    }

    return usersWithDifferences;
  } catch (error) {
    console.error('❌ Error analyzing normal users:', error);
    throw error;
  }
};

/**
 * Find unit admins with differences between Excel and Database
 */
const findUnitAdminsWithDifferences = async (excelPath) => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('ANALYZING UNIT ADMINS WITH DIFFERENCES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    console.log('📄 Parsing Unit Admin Excel file...');
    const excelUnitAdmins = await parseUnitAdminExcelFile(excelPath);
    console.log(`✓ Found ${excelUnitAdmins.length} unit admins in Excel file\n`);

    // Get existing unit admins
    console.log('🗄️  Fetching existing unit admins from database...');
    const dbUnitAdmins = await UnitAdmin.find({}).lean();
    console.log(`✓ Found ${dbUnitAdmins.length} existing unit admins in database\n`);

    console.log('🔍 Finding unit admins with differences...\n');

    const adminsWithDifferences = [];
    const dbAdminMap = new Map(dbUnitAdmins.map(u => [u.ruknId, u]));

    for (const excelAdmin of excelUnitAdmins) {
      if (!excelAdmin.ruknId) continue;
      
      const dbAdmin = dbAdminMap.get(excelAdmin.ruknId);
      if (!dbAdmin) continue; // Skip new admins

      // Check for differences
      const hasChanges = 
        excelAdmin.name !== dbAdmin.name ||
        excelAdmin.unit !== dbAdmin.unit ||
        excelAdmin.district !== dbAdmin.district ||
        excelAdmin.contactNo !== dbAdmin.contactNo ||
        excelAdmin.emailId !== dbAdmin.emailId;

      if (hasChanges) {
        adminsWithDifferences.push({
          ruknId: excelAdmin.ruknId,
          dbData: {
            name: dbAdmin.name,
            unit: dbAdmin.unit,
            district: dbAdmin.district,
            contactNo: dbAdmin.contactNo,
            emailId: dbAdmin.emailId
          },
          excelData: {
            name: excelAdmin.name,
            unit: excelAdmin.unit,
            district: excelAdmin.district,
            contactNo: excelAdmin.contactNo,
            emailId: excelAdmin.emailId
          },
          changes: {
            name: excelAdmin.name !== dbAdmin.name,
            unit: excelAdmin.unit !== dbAdmin.unit,
            district: excelAdmin.district !== dbAdmin.district,
            contactNo: excelAdmin.contactNo !== dbAdmin.contactNo,
            emailId: excelAdmin.emailId !== dbAdmin.emailId
          }
        });
      }
    }

    return adminsWithDifferences;
  } catch (error) {
    console.error('❌ Error analyzing unit admins:', error);
    throw error;
  }
};

/**
 * Display comparison table for users
 */
const displayUserComparison = (usersWithDifferences) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('NORMAL USERS WITH DIFFERENCES - COMPARISON');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (usersWithDifferences.length === 0) {
    console.log('✓ No users with differences found.\n');
    return;
  }

  console.log(`Found ${usersWithDifferences.length} users with differences:\n`);

  usersWithDifferences.forEach((user, index) => {
    console.log(`${index + 1}. RUKN ID: ${user.ruknId}`);
    console.log('   ┌─────────────────────────────────────────────────────┐');
    
    if (user.changes.name) {
      console.log(`   │ NAME:                                               │`);
      console.log(`   │   ❌ Database: ${user.dbData.name.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${user.excelData.name.padEnd(35)} │`);
    }
    
    if (user.changes.unit) {
      console.log(`   │ UNIT:                                               │`);
      console.log(`   │   ❌ Database: ${user.dbData.unit.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${user.excelData.unit.padEnd(35)} │`);
    }
    
    if (user.changes.gender) {
      console.log(`   │ GENDER:                                             │`);
      console.log(`   │   ❌ Database: ${user.dbData.gender.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${user.excelData.gender.padEnd(35)} │`);
    }
    
    console.log('   └─────────────────────────────────────────────────────┘\n');
  });
};

/**
 * Display comparison table for unit admins
 */
const displayUnitAdminComparison = (adminsWithDifferences) => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('UNIT ADMINS WITH DIFFERENCES - COMPARISON');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (adminsWithDifferences.length === 0) {
    console.log('✓ No unit admins with differences found.\n');
    return;
  }

  console.log(`Found ${adminsWithDifferences.length} unit admins with differences:\n`);

  adminsWithDifferences.forEach((admin, index) => {
    console.log(`${index + 1}. RUKN ID: ${admin.ruknId}`);
    console.log('   ┌─────────────────────────────────────────────────────┐');
    
    if (admin.changes.name) {
      console.log(`   │ NAME:                                               │`);
      console.log(`   │   ❌ Database: ${admin.dbData.name.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${admin.excelData.name.padEnd(35)} │`);
    }
    
    if (admin.changes.unit) {
      console.log(`   │ UNIT:                                               │`);
      console.log(`   │   ❌ Database: ${admin.dbData.unit.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${admin.excelData.unit.padEnd(35)} │`);
    }
    
    if (admin.changes.district) {
      console.log(`   │ DISTRICT:                                           │`);
      console.log(`   │   ❌ Database: ${admin.dbData.district.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${admin.excelData.district.padEnd(35)} │`);
    }
    
    if (admin.changes.contactNo) {
      console.log(`   │ CONTACT:                                            │`);
      console.log(`   │   ❌ Database: ${admin.dbData.contactNo.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${admin.excelData.contactNo.padEnd(35)} │`);
    }
    
    if (admin.changes.emailId) {
      console.log(`   │ EMAIL:                                              │`);
      console.log(`   │   ❌ Database: ${admin.dbData.emailId.padEnd(35)} │`);
      console.log(`   │   ✅ Excel:    ${admin.excelData.emailId.padEnd(35)} │`);
    }
    
    console.log('   └─────────────────────────────────────────────────────┘\n');
  });
};

/**
 * Update normal users with Excel data
 */
const updateNormalUsers = async (usersWithDifferences, dryRun = false) => {
  if (usersWithDifferences.length === 0) {
    return { updated: 0, errors: [] };
  }

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would update ${usersWithDifferences.length} normal users\n`);
    return { updated: 0, errors: [], dryRun: true, wouldUpdate: usersWithDifferences.length };
  }

  console.log(`\n🚀 Updating ${usersWithDifferences.length} normal users...\n`);

  let updated = 0;
  let errors = [];

  for (const user of usersWithDifferences) {
    try {
      await User.updateOne(
        { ruknId: user.ruknId },
        {
          $set: {
            name: user.excelData.name,
            unit: user.excelData.unit,
            gender: user.excelData.gender
          }
        }
      );
      updated++;
      console.log(`✓ Updated RUKN ID: ${user.ruknId} - ${user.excelData.name}`);
    } catch (error) {
      errors.push({
        ruknId: user.ruknId,
        error: error.message
      });
      console.error(`✗ Failed to update RUKN ID: ${user.ruknId} - ${error.message}`);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} normal users`);
  if (errors.length > 0) {
    console.log(`❌ Failed to update ${errors.length} users\n`);
  }

  return { updated, errors };
};

/**
 * Update unit admins with Excel data
 */
const updateUnitAdmins = async (adminsWithDifferences, dryRun = false) => {
  if (adminsWithDifferences.length === 0) {
    return { updated: 0, errors: [] };
  }

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would update ${adminsWithDifferences.length} unit admins\n`);
    return { updated: 0, errors: [], dryRun: true, wouldUpdate: adminsWithDifferences.length };
  }

  console.log(`\n🚀 Updating ${adminsWithDifferences.length} unit admins...\n`);

  let updated = 0;
  let errors = [];

  for (const admin of adminsWithDifferences) {
    try {
      await UnitAdmin.updateOne(
        { ruknId: admin.ruknId },
        {
          $set: {
            name: admin.excelData.name,
            unit: admin.excelData.unit,
            district: admin.excelData.district,
            contactNo: admin.excelData.contactNo,
            emailId: admin.excelData.emailId
          }
        }
      );
      updated++;
      console.log(`✓ Updated RUKN ID: ${admin.ruknId} - ${admin.excelData.name}`);
    } catch (error) {
      errors.push({
        ruknId: admin.ruknId,
        error: error.message
      });
      console.error(`✗ Failed to update RUKN ID: ${admin.ruknId} - ${error.message}`);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} unit admins`);
  if (errors.length > 0) {
    console.log(`❌ Failed to update ${errors.length} admins\n`);
  }

  return { updated, errors };
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  UPDATE EXISTING USERS WITH EXCEL DATA                   ║');
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

    // Find users with differences
    const usersWithDifferences = await findUsersWithDifferences(normalUsersExcelPath);
    const adminsWithDifferences = await findUnitAdminsWithDifferences(unitAdminExcelPath);

    // Display comparisons
    displayUserComparison(usersWithDifferences);
    displayUnitAdminComparison(adminsWithDifferences);

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('UPDATE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📊 Normal Users with differences:      ${usersWithDifferences.length}`);
    console.log(`📊 Unit Admins with differences:       ${adminsWithDifferences.length}`);
    console.log(`📊 Total updates needed:               ${usersWithDifferences.length + adminsWithDifferences.length}\n`);

    if (usersWithDifferences.length === 0 && adminsWithDifferences.length === 0) {
      console.log('✓ No updates needed. All data is synchronized!\n');
      process.exit(0);
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      console.log('💡 Run without --dry-run flag to perform actual updates\n');
      process.exit(0);
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will UPDATE existing user data in the database!');
    console.log('⚠️  Database data will be replaced with Excel data.\n');
    
    const confirmed = await askConfirmation('Do you want to proceed with the updates? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Update cancelled by user.\n');
      process.exit(0);
    }

    // Perform updates
    const normalUsersResult = await updateNormalUsers(usersWithDifferences, false);
    const unitAdminsResult = await updateUnitAdmins(adminsWithDifferences, false);

    // Final Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('UPDATE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ UPDATE SUMMARY:');
    console.log(`   Normal Users updated:      ${normalUsersResult.updated}`);
    console.log(`   Unit Admins updated:       ${unitAdminsResult.updated}`);
    console.log(`   Total errors:              ${normalUsersResult.errors.length + unitAdminsResult.errors.length}`);
    console.log('');
    console.log('✨ User data has been synchronized with Excel files!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
main();







