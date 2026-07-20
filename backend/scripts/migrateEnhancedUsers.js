const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/ihthisabi/User');
const { parseExcelFile } = require('../utils/excelParser');

// Connect to database
const connectDB = async () => {
  try {
    const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables.');
    }
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to Ihtisabi database successfully\n');
  } catch (error) {
    console.error('✗ Database connection error:', error);
    process.exit(1);
  }
};

// Compare two values and return true if different
const hasChanged = (oldVal, newVal) => {
  const old = String(oldVal || '').trim();
  const newV = String(newVal || '').trim();
  return old !== newV && newV !== '';
};

/**
 * Migrate users with RUKN ID as unique key
 * - If exists: Update with any new/changed fields
 * - If not exists: Create new user
 */
const migrateUsersWithUpdate = async (excelPath, dryRun = false) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ENHANCED USER MIGRATION WITH UPDATE SUPPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    console.log('📄 Parsing Excel file...');
    const excelUsers = await parseExcelFile(excelPath);
    console.log(`✓ Found ${excelUsers.length} users in Excel file\n`);

    // Get existing users
    console.log('🗄️  Fetching existing users from database...');
    const dbUsers = await User.find({ role: 'rukn' }).lean();
    const dbUserMap = new Map(dbUsers.map(u => [u.ruknId, u]));
    console.log(`✓ Found ${dbUsers.length} existing users in database\n`);

    // Categorize users
    const toCreate = [];
    const toUpdate = [];
    const unchanged = [];
    const invalid = [];

    for (const excelUser of excelUsers) {
      // Validate required fields
      if (!excelUser.ruknId || !excelUser.name || !excelUser.unit) {
        invalid.push({
          ...excelUser,
          reason: 'Missing required fields (ruknId, name, or unit)'
        });
        continue;
      }

      const existingUser = dbUserMap.get(excelUser.ruknId);

      if (existingUser) {
        // User exists - check if any field changed
        const changes = {};
        
        if (hasChanged(existingUser.name, excelUser.name)) {
          changes.name = { old: existingUser.name, new: excelUser.name };
        }
        if (hasChanged(existingUser.gender, excelUser.gender)) {
          changes.gender = { old: existingUser.gender, new: excelUser.gender };
        }
        if (hasChanged(existingUser.district, excelUser.district)) {
          changes.district = { old: existingUser.district, new: excelUser.district };
        }
        if (hasChanged(existingUser.area, excelUser.area)) {
          changes.area = { old: existingUser.area, new: excelUser.area };
        }
        if (hasChanged(existingUser.unit, excelUser.unit)) {
          changes.unit = { old: existingUser.unit, new: excelUser.unit };
        }
        if (hasChanged(existingUser.contactNo, excelUser.contactNo)) {
          changes.contactNo = { old: existingUser.contactNo, new: excelUser.contactNo };
        }
        if (hasChanged(existingUser.emailId, excelUser.emailId)) {
          changes.emailId = { old: existingUser.emailId, new: excelUser.emailId };
        }
        if (hasChanged(existingUser.country, excelUser.country)) {
          changes.country = { old: existingUser.country, new: excelUser.country };
        }

        if (Object.keys(changes).length > 0) {
          toUpdate.push({
            ruknId: excelUser.ruknId,
            _id: existingUser._id,
            excelData: excelUser,
            changes
          });
        } else {
          unchanged.push(excelUser);
        }
      } else {
        // New user
        toCreate.push(excelUser);
      }
    }

    // Display summary
    console.log('📊 Migration Analysis Summary:');
    console.log(`   Total in Excel:           ${excelUsers.length}`);
    console.log(`   Existing in DB:           ${dbUsers.length}`);
    console.log(`   ✅ New to Create:         ${toCreate.length}`);
    console.log(`   🔄 To Update:             ${toUpdate.length}`);
    console.log(`   ✓  Unchanged:             ${unchanged.length}`);
    console.log(`   ❌ Invalid:               ${invalid.length}\n`);

    // Show details if there are changes
    if (toCreate.length > 0) {
      console.log('📝 NEW USERS TO CREATE (First 10):');
      toCreate.slice(0, 10).forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name} - ${user.unit} (ID: ${user.ruknId})`);
        if (user.contactNo) console.log(`      Contact: ${user.contactNo}`);
        if (user.emailId) console.log(`      Email: ${user.emailId}`);
      });
      if (toCreate.length > 10) {
        console.log(`   ... and ${toCreate.length - 10} more\n`);
      }
      console.log('');
    }

    if (toUpdate.length > 0) {
      console.log('🔄 USERS TO UPDATE (First 10):');
      toUpdate.slice(0, 10).forEach((user, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${user.ruknId}`);
        Object.entries(user.changes).forEach(([field, change]) => {
          console.log(`      ${field}: "${change.old}" → "${change.new}"`);
        });
      });
      if (toUpdate.length > 10) {
        console.log(`   ... and ${toUpdate.length - 10} more\n`);
      }
      console.log('');
    }

    if (invalid.length > 0) {
      console.log('❌ INVALID ENTRIES:');
      invalid.forEach((user, idx) => {
        console.log(`   ${idx + 1}. Reason: ${user.reason}`);
        console.log(`      Data: ${JSON.stringify(user)}`);
      });
      console.log('');
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      return {
        dryRun: true,
        wouldCreate: toCreate.length,
        wouldUpdate: toUpdate.length,
        unchanged: unchanged.length,
        invalid: invalid.length
      };
    }

    // Ask for confirmation
    if (toCreate.length === 0 && toUpdate.length === 0) {
      console.log('✅ No changes needed. All data is up to date!\n');
      return { created: 0, updated: 0, errors: [] };
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmed = await new Promise((resolve) => {
      rl.question(
        `\n⚠️  You are about to CREATE ${toCreate.length} users and UPDATE ${toUpdate.length} users.\nDo you want to proceed? (yes/no): `,
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        }
      );
    });

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user.\n');
      return { created: 0, updated: 0, errors: [], cancelled: true };
    }

    // Perform migration
    console.log('\n🚀 Starting migration...\n');
    let created = 0;
    let updated = 0;
    let errors = [];

    // Create new users
    if (toCreate.length > 0) {
      console.log('📝 Creating new users...');
      try {
        const usersToInsert = toCreate.map(user => ({
          role: 'rukn',
          ruknId: user.ruknId,
          name: user.name,
          gender: user.gender || 'Male',
          district: user.district || '',
          area: user.area || '',
          unit: user.unit,
          contactNo: user.contactNo || '',
          emailId: user.emailId || '',
          country: user.country || '',
          isActive: true
        }));

        const result = await User.insertMany(usersToInsert, { ordered: false });
        created = result.length;
        console.log(`✅ Successfully created ${created} new users\n`);
      } catch (error) {
        if (error.writeErrors) {
          created = toCreate.length - error.writeErrors.length;
          console.log(`⚠️  Partially successful: ${created} users created\n`);
          
          error.writeErrors.forEach(writeError => {
            errors.push({
              ruknId: toCreate[writeError.index]?.ruknId,
              name: toCreate[writeError.index]?.name,
              operation: 'create',
              error: writeError.errmsg
            });
          });
        } else {
          throw error;
        }
      }
    }

    // Update existing users
    if (toUpdate.length > 0) {
      console.log('🔄 Updating existing users...');
      for (const updateItem of toUpdate) {
        try {
          const updateData = {};
          
          // Only update fields that have changed
          Object.keys(updateItem.changes).forEach(field => {
            updateData[field] = updateItem.changes[field].new;
          });

          await User.findByIdAndUpdate(
            updateItem._id,
            { $set: updateData },
            { runValidators: true }
          );
          updated++;
        } catch (error) {
          console.error(`Error updating user ${updateItem.ruknId}:`, error.message);
          errors.push({
            ruknId: updateItem.ruknId,
            operation: 'update',
            error: error.message
          });
        }
      }
      console.log(`✅ Successfully updated ${updated} users\n`);
    }

    if (errors.length > 0) {
      console.log(`❌ Errors occurred for ${errors.length} users:`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${err.ruknId} (${err.operation})`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('');
    }

    return { created, updated, errors };

  } catch (error) {
    console.error('❌ Error during migration:', error);
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
    console.log('║  ENHANCED IHTISABI USER MIGRATION TOOL                   ║');
    console.log('║  Mode: Create New + Update Existing Users                ║');
    if (dryRun) {
      console.log('║  DRY RUN: No changes will be made                        ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Connect to database
    await connectDB();

    // Define Excel file path
    const excelPath = path.join(__dirname, '..', 'uploads', 'ihtisabi', 'major migration', 'Arkan List Kerala.xlsx');

    // Check if file exists
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ Excel file not found: ${excelPath}`);
      process.exit(1);
    }

    console.log(`📁 Excel File: ${path.basename(excelPath)}\n`);

    // Perform migration
    const result = await migrateUsersWithUpdate(excelPath, dryRun);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (dryRun) {
      console.log('🔍 DRY RUN SUMMARY:');
      console.log(`   Would create:        ${result.wouldCreate} users`);
      console.log(`   Would update:        ${result.wouldUpdate} users`);
      console.log(`   Unchanged:           ${result.unchanged} users`);
      console.log(`   Invalid entries:     ${result.invalid} users`);
      console.log('\n💡 Run without --dry-run flag to actually migrate the data\n');
    } else if (result.cancelled) {
      console.log('❌ Migration was cancelled.\n');
    } else {
      console.log('✅ MIGRATION SUMMARY:');
      console.log(`   Users created:       ${result.created}`);
      console.log(`   Users updated:       ${result.updated}`);
      console.log(`   Total errors:        ${result.errors.length}`);
      console.log('');
      console.log('✨ Migration completed successfully!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
main();

