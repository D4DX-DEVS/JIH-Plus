const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
 * Analyze Normal Users (Rukn) Migration
 */
const analyzeNormalUsers = async (excelPath) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ANALYZING NORMAL USERS (RUKN) MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Parse Excel file
    console.log('📄 Parsing Normal Users Excel file...');
    const excelUsers = await parseExcelFile(excelPath);
    console.log(`✓ Found ${excelUsers.length} users in Excel file\n`);

    // Step 2: Check for duplicates within Excel
    console.log('🔍 Checking for duplicates within Excel...');
    const excelDuplicates = findDuplicatesInArray(excelUsers, 'ruknId');
    
    if (excelDuplicates.length > 0) {
      console.log(`⚠️  WARNING: Found ${excelDuplicates.length} duplicate RUKN IDs in Excel:`);
      excelDuplicates.forEach(dup => {
        console.log(`   - RUKN ID: ${dup.key} appears ${dup.count} times`);
        dup.items.forEach((item, idx) => {
          console.log(`     ${idx + 1}. Name: ${item.name}, Unit: ${item.unit}`);
        });
      });
      console.log('');
    } else {
      console.log('✓ No duplicates found in Excel file\n');
    }

    // Step 3: Get current database users
    console.log('🗄️  Fetching existing users from database...');
    const dbUsers = await User.find({ role: 'rukn' }).lean();
    console.log(`✓ Found ${dbUsers.length} existing users in database\n`);

    // Step 4: Compare and categorize
    console.log('🔄 Comparing Excel data with database...\n');
    
    const existingUsers = [];
    const newUsers = [];
    const invalidEntries = [];
    
    const dbRuknIdSet = new Set(dbUsers.map(u => u.ruknId));

    for (const excelUser of excelUsers) {
      // Validation checks
      if (!excelUser.ruknId || !excelUser.name || !excelUser.unit) {
        invalidEntries.push({
          ...excelUser,
          reason: 'Missing required fields (ruknId, name, or unit)'
        });
        continue;
      }

      // Check if user exists
      if (dbRuknIdSet.has(excelUser.ruknId)) {
        const dbUser = dbUsers.find(u => u.ruknId === excelUser.ruknId);
        existingUsers.push({
          ruknId: excelUser.ruknId,
          name: excelUser.name,
          unit: excelUser.unit,
          gender: excelUser.gender,
          dbName: dbUser.name,
          dbUnit: dbUser.unit,
          dbGender: dbUser.gender,
          hasChanges: excelUser.name !== dbUser.name || 
                      excelUser.unit !== dbUser.unit || 
                      excelUser.gender !== dbUser.gender
        });
      } else {
        newUsers.push(excelUser);
      }
    }

    // Step 5: Generate Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('NORMAL USERS ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 SUMMARY:`);
    console.log(`   Total in Excel:        ${excelUsers.length}`);
    console.log(`   Total in Database:     ${dbUsers.length}`);
    console.log(`   Already Exist:         ${existingUsers.length}`);
    console.log(`   New to Migrate:        ${newUsers.length}`);
    console.log(`   Invalid Entries:       ${invalidEntries.length}`);
    console.log(`   Duplicates in Excel:   ${excelDuplicates.length}`);
    console.log('');

    // Existing users with changes
    const usersWithChanges = existingUsers.filter(u => u.hasChanges);
    if (usersWithChanges.length > 0) {
      console.log(`⚠️  EXISTING USERS WITH DATA CHANGES (${usersWithChanges.length}):`);
      console.log('   These users exist but have different data in Excel vs Database:');
      usersWithChanges.slice(0, 10).forEach(user => {
        console.log(`   - RUKN ID: ${user.ruknId}`);
        console.log(`     Excel:    Name="${user.name}", Unit="${user.unit}", Gender="${user.gender}"`);
        console.log(`     Database: Name="${user.dbName}", Unit="${user.dbUnit}", Gender="${user.dbGender}"`);
      });
      if (usersWithChanges.length > 10) {
        console.log(`   ... and ${usersWithChanges.length - 10} more`);
      }
      console.log('   NOTE: These will NOT be updated (existing data preserved)\n');
    }

    // New users to migrate
    if (newUsers.length > 0) {
      console.log(`✅ NEW USERS TO MIGRATE (${newUsers.length}):`);
      newUsers.slice(0, 15).forEach((user, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${user.ruknId} | Name: ${user.name} | Unit: ${user.unit} | Gender: ${user.gender}`);
      });
      if (newUsers.length > 15) {
        console.log(`   ... and ${newUsers.length - 15} more`);
      }
      console.log('');
    } else {
      console.log('✓ No new users to migrate - all users already exist in database\n');
    }

    // Invalid entries
    if (invalidEntries.length > 0) {
      console.log(`❌ INVALID ENTRIES (${invalidEntries.length}):`);
      invalidEntries.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. Reason: ${entry.reason}`);
        console.log(`      Data: RUKN ID="${entry.ruknId || 'N/A'}", Name="${entry.name || 'N/A'}", Unit="${entry.unit || 'N/A'}"`);
      });
      console.log('');
    }

    return {
      summary: {
        totalInExcel: excelUsers.length,
        totalInDB: dbUsers.length,
        existing: existingUsers.length,
        newToMigrate: newUsers.length,
        invalid: invalidEntries.length,
        duplicates: excelDuplicates.length,
        usersWithChanges: usersWithChanges.length
      },
      existingUsers,
      newUsers,
      invalidEntries,
      duplicates: excelDuplicates,
      usersWithChanges
    };

  } catch (error) {
    console.error('❌ Error analyzing normal users:', error);
    throw error;
  }
};

/**
 * Analyze Unit Admin Users Migration
 */
const analyzeUnitAdminUsers = async (excelPath) => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('ANALYZING UNIT ADMIN USERS MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Parse Excel file
    console.log('📄 Parsing Unit Admin Excel file...');
    const excelUnitAdmins = await parseUnitAdminExcelFile(excelPath);
    console.log(`✓ Found ${excelUnitAdmins.length} unit admins in Excel file\n`);

    // Step 2: Check for duplicates within Excel
    console.log('🔍 Checking for duplicates within Excel...');
    const excelDuplicates = findDuplicatesInArray(excelUnitAdmins, 'ruknId');
    
    if (excelDuplicates.length > 0) {
      console.log(`⚠️  WARNING: Found ${excelDuplicates.length} duplicate RUKN IDs in Excel:`);
      excelDuplicates.forEach(dup => {
        console.log(`   - RUKN ID: ${dup.key} appears ${dup.count} times`);
        dup.items.forEach((item, idx) => {
          console.log(`     ${idx + 1}. Name: ${item.name}, Unit: ${item.unit}, District: ${item.district}`);
        });
      });
      console.log('');
    } else {
      console.log('✓ No duplicates found in Excel file\n');
    }

    // Step 3: Get current database unit admins
    console.log('🗄️  Fetching existing unit admins from database...');
    const dbUnitAdmins = await UnitAdmin.find({}).lean();
    console.log(`✓ Found ${dbUnitAdmins.length} existing unit admins in database\n`);

    // Step 4: Compare and categorize
    console.log('🔄 Comparing Excel data with database...\n');
    
    const existingUnitAdmins = [];
    const newUnitAdmins = [];
    const invalidEntries = [];
    
    const dbRuknIdSet = new Set(dbUnitAdmins.map(u => u.ruknId));

    for (const excelAdmin of excelUnitAdmins) {
      // Validation checks
      if (!excelAdmin.ruknId || !excelAdmin.name || !excelAdmin.unit) {
        invalidEntries.push({
          ...excelAdmin,
          reason: 'Missing required fields (ruknId, name, or unit)'
        });
        continue;
      }

      // Check if unit admin exists
      if (dbRuknIdSet.has(excelAdmin.ruknId)) {
        const dbAdmin = dbUnitAdmins.find(u => u.ruknId === excelAdmin.ruknId);
        existingUnitAdmins.push({
          ruknId: excelAdmin.ruknId,
          name: excelAdmin.name,
          unit: excelAdmin.unit,
          district: excelAdmin.district,
          contactNo: excelAdmin.contactNo,
          emailId: excelAdmin.emailId,
          dbName: dbAdmin.name,
          dbUnit: dbAdmin.unit,
          dbDistrict: dbAdmin.district,
          dbContactNo: dbAdmin.contactNo,
          dbEmailId: dbAdmin.emailId,
          hasChanges: excelAdmin.name !== dbAdmin.name || 
                      excelAdmin.unit !== dbAdmin.unit || 
                      excelAdmin.district !== dbAdmin.district ||
                      excelAdmin.contactNo !== dbAdmin.contactNo ||
                      excelAdmin.emailId !== dbAdmin.emailId
        });
      } else {
        newUnitAdmins.push(excelAdmin);
      }
    }

    // Step 5: Generate Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('UNIT ADMIN USERS ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 SUMMARY:`);
    console.log(`   Total in Excel:        ${excelUnitAdmins.length}`);
    console.log(`   Total in Database:     ${dbUnitAdmins.length}`);
    console.log(`   Already Exist:         ${existingUnitAdmins.length}`);
    console.log(`   New to Migrate:        ${newUnitAdmins.length}`);
    console.log(`   Invalid Entries:       ${invalidEntries.length}`);
    console.log(`   Duplicates in Excel:   ${excelDuplicates.length}`);
    console.log('');

    // Existing unit admins with changes
    const adminsWithChanges = existingUnitAdmins.filter(u => u.hasChanges);
    if (adminsWithChanges.length > 0) {
      console.log(`⚠️  EXISTING UNIT ADMINS WITH DATA CHANGES (${adminsWithChanges.length}):`);
      console.log('   These admins exist but have different data in Excel vs Database:');
      adminsWithChanges.slice(0, 10).forEach(admin => {
        console.log(`   - RUKN ID: ${admin.ruknId}`);
        console.log(`     Excel:    Name="${admin.name}", Unit="${admin.unit}", District="${admin.district}"`);
        console.log(`     Database: Name="${admin.dbName}", Unit="${admin.dbUnit}", District="${admin.dbDistrict}"`);
        if (admin.contactNo !== admin.dbContactNo) {
          console.log(`     Contact:  Excel="${admin.contactNo}", DB="${admin.dbContactNo}"`);
        }
      });
      if (adminsWithChanges.length > 10) {
        console.log(`   ... and ${adminsWithChanges.length - 10} more`);
      }
      console.log('   NOTE: These will NOT be updated (existing data preserved)\n');
    }

    // New unit admins to migrate
    if (newUnitAdmins.length > 0) {
      console.log(`✅ NEW UNIT ADMINS TO MIGRATE (${newUnitAdmins.length}):`);
      newUnitAdmins.slice(0, 15).forEach((admin, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${admin.ruknId}`);
        console.log(`      Name: ${admin.name}`);
        console.log(`      Unit: ${admin.unit}`);
        console.log(`      District: ${admin.district}`);
        console.log(`      Contact: ${admin.contactNo || 'N/A'}`);
        console.log(`      Email: ${admin.emailId || 'N/A'}`);
      });
      if (newUnitAdmins.length > 15) {
        console.log(`   ... and ${newUnitAdmins.length - 15} more`);
      }
      console.log('');
    } else {
      console.log('✓ No new unit admins to migrate - all admins already exist in database\n');
    }

    // Invalid entries
    if (invalidEntries.length > 0) {
      console.log(`❌ INVALID ENTRIES (${invalidEntries.length}):`);
      invalidEntries.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. Reason: ${entry.reason}`);
        console.log(`      Data: RUKN ID="${entry.ruknId || 'N/A'}", Name="${entry.name || 'N/A'}", Unit="${entry.unit || 'N/A'}"`);
      });
      console.log('');
    }

    return {
      summary: {
        totalInExcel: excelUnitAdmins.length,
        totalInDB: dbUnitAdmins.length,
        existing: existingUnitAdmins.length,
        newToMigrate: newUnitAdmins.length,
        invalid: invalidEntries.length,
        duplicates: excelDuplicates.length,
        adminsWithChanges: adminsWithChanges.length
      },
      existingUnitAdmins,
      newUnitAdmins,
      invalidEntries,
      duplicates: excelDuplicates,
      adminsWithChanges
    };

  } catch (error) {
    console.error('❌ Error analyzing unit admin users:', error);
    throw error;
  }
};

/**
 * Helper function to find duplicates in an array
 */
const findDuplicatesInArray = (arr, key) => {
  const counts = {};
  const duplicates = [];

  arr.forEach(item => {
    const value = item[key];
    if (!counts[value]) {
      counts[value] = { count: 0, items: [] };
    }
    counts[value].count++;
    counts[value].items.push(item);
  });

  Object.entries(counts).forEach(([key, data]) => {
    if (data.count > 1) {
      duplicates.push({ key, count: data.count, items: data.items });
    }
  });

  return duplicates;
};

/**
 * Save results to JSON files
 */
const saveResults = async (normalUsersResults, unitAdminResults) => {
  const outputDir = path.join(__dirname, '..', 'migration-analysis');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  // Save Normal Users results
  const normalUsersFile = path.join(outputDir, `normal-users-analysis-${timestamp}.json`);
  fs.writeFileSync(normalUsersFile, JSON.stringify(normalUsersResults, null, 2));
  console.log(`\n💾 Normal Users analysis saved to: ${normalUsersFile}`);

  // Save Unit Admin results
  const unitAdminFile = path.join(outputDir, `unit-admin-analysis-${timestamp}.json`);
  fs.writeFileSync(unitAdminFile, JSON.stringify(unitAdminResults, null, 2));
  console.log(`💾 Unit Admin analysis saved to: ${unitAdminFile}`);

  // Save migration-ready data (only new users)
  const migrationReadyData = {
    normalUsers: normalUsersResults.newUsers,
    unitAdmins: unitAdminResults.newUnitAdmins,
    timestamp: new Date().toISOString(),
    summary: {
      normalUsersToMigrate: normalUsersResults.newUsers.length,
      unitAdminsToMigrate: unitAdminResults.newUnitAdmins.length
    }
  };

  const migrationFile = path.join(outputDir, `migration-ready-${timestamp}.json`);
  fs.writeFileSync(migrationFile, JSON.stringify(migrationReadyData, null, 2));
  console.log(`💾 Migration-ready data saved to: ${migrationFile}\n`);
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  IHTISABI USER MIGRATION ANALYSIS TOOL                   ║');
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

    // Analyze both user types
    const normalUsersResults = await analyzeNormalUsers(normalUsersExcelPath);
    const unitAdminResults = await analyzeUnitAdminUsers(unitAdminExcelPath);

    // Save results
    await saveResults(normalUsersResults, unitAdminResults);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FINAL MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 NORMAL USERS (RUKN):');
    console.log(`   ✓ Safe to keep:        ${normalUsersResults.summary.existing} users`);
    console.log(`   ✅ Ready to migrate:   ${normalUsersResults.summary.newToMigrate} users`);
    console.log(`   ⚠️  With data changes:  ${normalUsersResults.summary.usersWithChanges} users (will be preserved)`);
    console.log(`   ❌ Invalid entries:     ${normalUsersResults.summary.invalid} entries`);
    console.log('');
    console.log('📋 UNIT ADMIN USERS:');
    console.log(`   ✓ Safe to keep:        ${unitAdminResults.summary.existing} admins`);
    console.log(`   ✅ Ready to migrate:   ${unitAdminResults.summary.newToMigrate} admins`);
    console.log(`   ⚠️  With data changes:  ${unitAdminResults.summary.adminsWithChanges} admins (will be preserved)`);
    console.log(`   ❌ Invalid entries:     ${unitAdminResults.summary.invalid} entries`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📌 NEXT STEPS:');
    console.log('   1. Review the JSON files in the migration-analysis folder');
    console.log('   2. Verify the new users to be migrated');
    console.log('   3. Run the migration script to add new users');
    console.log('   4. All existing users will remain unchanged\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
main();

