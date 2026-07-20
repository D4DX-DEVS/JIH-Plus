const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/ihthisabi/User');
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');

// Connect to database
const connectDB = async () => {
  try {
    const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to database\n');
  } catch (error) {
    console.error('✗ Connection error:', error);
    process.exit(1);
  }
};

const main = async () => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  SELECTIVE UPDATE - EXCLUDING RUKN ID 111919            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    await connectDB();

    let totalUpdated = 0;

    // Update RUKN ID 119205 - Unit change
    console.log('1. Updating RUKN ID 119205 (Unit change)...');
    await User.updateOne(
      { ruknId: '119205' },
      { $set: { unit: 'Mathottam' } }
    );
    console.log('   ✓ Updated: Ummer Koya P V - Unit changed to Mathottam\n');
    totalUpdated++;

    // Update RUKN ID 110147 - Name with suspension status
    console.log('2. Updating RUKN ID 110147 (Add suspension status)...');
    await User.updateOne(
      { ruknId: '110147' },
      { $set: { name: 'K. A. Sadarudheen (suspension)' } }
    );
    console.log('   ✓ Updated: K. A. Sadarudheen (suspension)\n');
    totalUpdated++;

    // Skipping RUKN ID 111919
    console.log('3. ⚠️  SKIPPING RUKN ID 111919 - Data entry mistake in Excel');
    console.log('   Database value "Salma K. P" will be preserved\n');

    // Update 10 Unit Admins - Email capitalization
    console.log('4. Updating 10 Unit Admin emails (capitalization)...');
    
    const emailUpdates = [
      { ruknId: '111172', email: 'Kunhamikottaprath@gmail.com' },
      { ruknId: '110587', email: 'Salahmohi42@gmail.com' },
      { ruknId: '111000', email: 'Mujeebchatholy@gmail.com' },
      { ruknId: '109779', email: 'EBRAHIMETTAT@gmail.com' },
      { ruknId: '113149', email: 'Sidhiquepazhangadan@gmail.com' },
      { ruknId: '110571', email: 'malimankada999@Gmail.com' },
      { ruknId: '110877', email: 'M.koyapallikkal@gmail.com' },
      { ruknId: '109518', email: 'Rahimkallara1973@gmail.com' },
      { ruknId: '109491', email: 'Salahudeentvhouse@gmail.com' },
      { ruknId: '111582', email: 'Saeedomar1958@gmail.com' }
    ];

    for (const update of emailUpdates) {
      await UnitAdmin.updateOne(
        { ruknId: update.ruknId },
        { $set: { emailId: update.email } }
      );
      console.log(`   ✓ Updated RUKN ID ${update.ruknId} - Email: ${update.email}`);
      totalUpdated++;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('UPDATE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Successfully updated ${totalUpdated} users`);
    console.log(`⚠️  Skipped 1 user (RUKN ID 111919) - Data entry mistake\n`);
    console.log('📊 Summary:');
    console.log('   - 2 Normal Users updated (119205, 110147)');
    console.log('   - 1 Normal User skipped (111919)');
    console.log('   - 10 Unit Admins updated (email capitalization)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();







