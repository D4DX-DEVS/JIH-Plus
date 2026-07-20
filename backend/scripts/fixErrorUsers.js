const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/ihthisabi/User');

/**
 * Fix Error Users - Quick Fixes for Obvious Errors
 * 
 * This script fixes 3 users with obvious formatting errors:
 * 1. RUKN ID 110152 - Email truncated (missing 'om' from .com)
 * 2. RUKN ID 109533 - Email with trailing period
 * 3. RUKN ID 110609 - Contact with decimal point
 */

const fixErrorUsers = async () => {
  try {
    const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  QUICK ERROR FIXES FOR MIGRATION VALIDATION ERRORS       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('✓ Connected to database\n');

    // Quick fixes (100% certain corrections)
    const quickFixes = [
      { 
        ruknId: '110152', 
        emailId: 'hydruseli@gmail.com',
        oldValue: 'hydruseli@gmail.c',
        reason: 'Truncated email - missing "om" from .com',
        confidence: 'HIGH'
      },
      { 
        ruknId: '109533', 
        emailId: 'thajudeen94469@gmail.com',
        oldValue: 'thajudeen94469@gmail.com.',
        reason: 'Trailing period removed',
        confidence: 'HIGH'
      },
      { 
        ruknId: '110609', 
        contactNo: '8891944662',
        oldValue: '88919.44662',
        reason: 'Decimal point removed from contact number',
        confidence: 'HIGH'
      }
    ];

    // Verified corrections (after user confirmation)
    // Add here after verification with users/unit admins
    const verifiedFixes = [
      // Example format:
      // { 
      //   ruknId: '119570', 
      //   emailId: 'verified@email.com',
      //   oldValue: 'bi@sriy.a',
      //   reason: 'Verified with user',
      //   confidence: 'VERIFIED'
      // },
    ];

    const allFixes = [...quickFixes, ...verifiedFixes];

    console.log('═══════════════════════════════════════════════════════════');
    console.log('FIXES TO APPLY');
    console.log('═══════════════════════════════════════════════════════════\n');

    allFixes.forEach((fix, index) => {
      console.log(`${index + 1}. RUKN ID: ${fix.ruknId} [${fix.confidence}]`);
      console.log(`   Old Value: ${fix.oldValue}`);
      if (fix.emailId) console.log(`   New Email: ${fix.emailId}`);
      if (fix.contactNo) console.log(`   New Contact: ${fix.contactNo}`);
      console.log(`   Reason: ${fix.reason}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('APPLYING FIXES');
    console.log('═══════════════════════════════════════════════════════════\n');

    let fixed = 0;
    let failed = 0;
    const results = [];
    
    for (const fix of allFixes) {
      try {
        // Build update object
        const update = {};
        if (fix.emailId) update.emailId = fix.emailId;
        if (fix.contactNo) update.contactNo = fix.contactNo;

        // Check if user exists
        const user = await User.findOne({ ruknId: fix.ruknId });
        if (!user) {
          console.log(`⚠️  RUKN ID ${fix.ruknId} not found in database`);
          failed++;
          results.push({
            ruknId: fix.ruknId,
            status: 'NOT_FOUND',
            message: 'User not found in database'
          });
          continue;
        }

        // Apply update
        const result = await User.updateOne(
          { ruknId: fix.ruknId },
          { $set: update },
          { runValidators: true }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ RUKN ID ${fix.ruknId}: Successfully updated`);
          if (fix.emailId) console.log(`   Email: ${fix.emailId}`);
          if (fix.contactNo) console.log(`   Contact: ${fix.contactNo}`);
          console.log(`   Reason: ${fix.reason}\n`);
          fixed++;
          results.push({
            ruknId: fix.ruknId,
            status: 'SUCCESS',
            ...update
          });
        } else {
          console.log(`ℹ️  RUKN ID ${fix.ruknId}: No changes (may already be correct)\n`);
          results.push({
            ruknId: fix.ruknId,
            status: 'NO_CHANGE',
            message: 'Value may already be correct'
          });
        }
      } catch (error) {
        console.error(`❌ RUKN ID ${fix.ruknId}: Error - ${error.message}\n`);
        failed++;
        results.push({
          ruknId: fix.ruknId,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`   Total Fixes Attempted:     ${allFixes.length}`);
    console.log(`   ✅ Successfully Fixed:     ${fixed}`);
    console.log(`   ℹ️  No Changes Needed:     ${allFixes.length - fixed - failed}`);
    console.log(`   ❌ Failed:                 ${failed}\n`);

    if (fixed > 0) {
      console.log('✨ Fixed Users:');
      results.filter(r => r.status === 'SUCCESS').forEach(r => {
        console.log(`   - RUKN ID ${r.ruknId}`);
      });
      console.log('');
    }

    if (failed > 0) {
      console.log('⚠️  Failed Users:');
      results.filter(r => r.status === 'ERROR' || r.status === 'NOT_FOUND').forEach(r => {
        console.log(`   - RUKN ID ${r.ruknId}: ${r.message || r.error}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Verify the fixes
    for (const result of results.filter(r => r.status === 'SUCCESS')) {
      const user = await User.findOne({ ruknId: result.ruknId })
        .select('ruknId name emailId contactNo')
        .lean();
      
      if (user) {
        console.log(`✓ RUKN ID ${user.ruknId} - ${user.name}`);
        if (user.emailId) console.log(`  Email: ${user.emailId}`);
        if (user.contactNo) console.log(`  Contact: ${user.contactNo}`);
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Verify the fixes above are correct');
    console.log('2. For remaining errors, see MIGRATION_ERROR_ANALYSIS_REPORT.md');
    console.log('3. Contact users/unit admins to verify 16 other invalid entries');
    console.log('4. Add verified fixes to verifiedFixes array in this script');
    console.log('5. Re-run this script after adding verified fixes');
    console.log('6. Run verification: npm run node scripts/verifyMigration.js\n');

    console.log('═══════════════════════════════════════════════════════════\n');

    if (fixed === allFixes.length) {
      console.log('🎉 All fixes applied successfully!\n');
    } else if (fixed > 0) {
      console.log('✅ Partial success - some fixes applied\n');
    } else {
      console.log('⚠️  No changes made - check logs above\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    console.error('\nStack Trace:', error.stack);
    process.exit(1);
  }
};

// Run the script
fixErrorUsers();

