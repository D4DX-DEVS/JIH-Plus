/**
 * Migration Script: Update Alternative Submission Type from 'Gulf' to 'Aged'
 * 
 * This script updates all existing alternative submissions with type 'Gulf' to 'Aged'
 * Run this script once after deploying the code changes
 */

const mongoose = require('mongoose');
const ihthisabiConnection = require('../config/ihthisabiConnection');
const AlternativeSubmit = require('../models/ihthisabi/alternativeSubmit');

async function migrateGulfToAged() {
  try {
    console.log('🔄 Starting migration: Gulf → Aged');
    
    // Wait for database connection to be ready
    if (ihthisabiConnection.readyState !== 1) {
      console.log('⏳ Waiting for database connection...');
      await new Promise((resolve, reject) => {
        if (ihthisabiConnection.readyState === 1) {
          resolve();
        } else {
          ihthisabiConnection.once('connected', resolve);
          ihthisabiConnection.once('error', reject);
          // Timeout after 30 seconds
          setTimeout(() => reject(new Error('Database connection timeout')), 30000);
        }
      });
      console.log('✅ Database connected');
    }
    
    // Count existing records with 'Gulf'
    const gulfCount = await AlternativeSubmit.countDocuments({ type: 'Gulf' });
    console.log(`📊 Found ${gulfCount} alternative submissions with type 'Gulf'`);
    
    if (gulfCount === 0) {
      console.log('✅ No records to migrate. Migration complete!');
      return { success: true, updated: 0 };
    }
    
    // Update all records from 'Gulf' to 'Aged'
    const result = await AlternativeSubmit.updateMany(
      { type: 'Gulf' },
      { $set: { type: 'Aged' } }
    );
    
    console.log(`✅ Successfully updated ${result.modifiedCount} records`);
    console.log(`   - Matched: ${result.matchedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);
    
    // Verify the migration
    const remainingGulf = await AlternativeSubmit.countDocuments({ type: 'Gulf' });
    const newAged = await AlternativeSubmit.countDocuments({ type: 'Aged' });
    
    console.log('\n📈 Migration Summary:');
    console.log(`   - Remaining 'Gulf' records: ${remainingGulf}`);
    console.log(`   - Total 'Aged' records: ${newAged}`);
    
    if (remainingGulf === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Warning: Some Gulf records remain. Please investigate.');
    }
    
    return {
      success: true,
      updated: result.modifiedCount,
      matched: result.matchedCount
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { migrateGulfToAged };

// Run migration if called directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  console.log('🚀 Starting Alternative Submission Migration...\n');
  
  migrateGulfToAged()
    .then((result) => {
      console.log('\n✅ Migration process completed');
      console.log('Result:', result);
      // Close database connection
      return ihthisabiConnection.close();
    })
    .then(() => {
      console.log('🔌 Database connection closed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration process failed');
      console.error('Error:', error.message);
      // Try to close connection even on error
      ihthisabiConnection.close().finally(() => {
        process.exit(1);
      });
    });
}

