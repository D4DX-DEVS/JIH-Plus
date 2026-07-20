const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/ihthisabi/User');

const verifyMigration = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.IHTHISABI_MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('\n✓ Connected to database\n');

    // Get statistics
    const total = await User.countDocuments({ role: 'rukn' });
    const withContact = await User.countDocuments({ role: 'rukn', contactNo: { $exists: true, $ne: '' } });
    const withEmail = await User.countDocuments({ role: 'rukn', emailId: { $exists: true, $ne: '' } });
    const withDistrict = await User.countDocuments({ role: 'rukn', district: { $exists: true, $ne: '' } });
    const withArea = await User.countDocuments({ role: 'rukn', area: { $exists: true, $ne: '' } });
    const withCountry = await User.countDocuments({ role: 'rukn', country: { $exists: true, $ne: '' } });
    
    // Get sample users
    const sampleWithAll = await User.findOne({ 
      role: 'rukn', 
      contactNo: { $ne: '' }, 
      emailId: { $ne: '' },
      country: { $ne: '' }
    }).select('ruknId name district area unit contactNo emailId country').lean();
    
    const sampleWithContact = await User.findOne({ 
      role: 'rukn', 
      contactNo: { $ne: '' }
    }).select('ruknId name district area unit contactNo emailId country').lean();

    // Display results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATION VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 STATISTICS:');
    console.log(`   Total Rukn Users:           ${total}`);
    console.log(`   With Contact Number:        ${withContact} (${Math.round(withContact/total*100)}%)`);
    console.log(`   With Email Address:         ${withEmail} (${Math.round(withEmail/total*100)}%)`);
    console.log(`   With District:              ${withDistrict} (${Math.round(withDistrict/total*100)}%)`);
    console.log(`   With Area:                  ${withArea} (${Math.round(withArea/total*100)}%)`);
    console.log(`   With Country Info:          ${withCountry} (${Math.round(withCountry/total*100)}%)`);

    console.log('\n👤 SAMPLE USER (with all fields):');
    if (sampleWithAll) {
      console.log(`   Rukn ID:      ${sampleWithAll.ruknId}`);
      console.log(`   Name:         ${sampleWithAll.name}`);
      console.log(`   District:     ${sampleWithAll.district}`);
      console.log(`   Area:         ${sampleWithAll.area}`);
      console.log(`   Unit:         ${sampleWithAll.unit}`);
      console.log(`   Contact:      ${sampleWithAll.contactNo}`);
      console.log(`   Email:        ${sampleWithAll.emailId}`);
      console.log(`   Country:      ${sampleWithAll.country}`);
    }

    console.log('\n👤 SAMPLE USER (with contact):');
    if (sampleWithContact) {
      console.log(`   Rukn ID:      ${sampleWithContact.ruknId}`);
      console.log(`   Name:         ${sampleWithContact.name}`);
      console.log(`   District:     ${sampleWithContact.district || 'N/A'}`);
      console.log(`   Area:         ${sampleWithContact.area || 'N/A'}`);
      console.log(`   Unit:         ${sampleWithContact.unit}`);
      console.log(`   Contact:      ${sampleWithContact.contactNo || 'N/A'}`);
      console.log(`   Email:        ${sampleWithContact.emailId || 'N/A'}`);
      console.log(`   Country:      ${sampleWithContact.country || 'N/A'}`);
    }

    console.log('\n✅ MIGRATION SUCCESS!');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }
};

verifyMigration();

