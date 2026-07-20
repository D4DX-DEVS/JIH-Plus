const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const UnitAdmin = require('../models/ihthisabi/UnitAdmin');

// Connect to database
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
 * Find column index based on header keywords
 */
const findColumnIndex = (headers, keywords) => {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase().trim();
    for (const keyword of keywords) {
      if (header.includes(keyword.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
};

/**
 * Find RUKN ID column index
 */
const findRuknIdIndex = (headers) => {
  const normalized = headers.map(h => String(h || '').trim().toLowerCase());

  // Strong matches first
  const strongKeywords = ['rukn id', 'rukn_id', 'ruknid'];
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (strongKeywords.some(k => h === k)) return i;
  }

  // Contains patterns but exclude anything with 'name'
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (h.includes('name')) continue;
    if (h.includes('rukn') && h.includes('id')) return i;
  }

  // Last fallback: a plain 'id' column
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (h === 'id' || h === 'rukn') return i;
  }

  return -1;
};

/**
 * Parse Excel file and extract area data from "data 2" sheet
 */
const parseAreaDataFromExcel = async (filePath) => {
  try {
    console.log('📄 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    
    // Find "data 2" sheet
    const sheetNames = workbook.SheetNames;
    console.log('Available sheets:', sheetNames);
    
    let targetSheet = null;
    for (const sheetName of sheetNames) {
      const normalizedName = sheetName.toLowerCase().trim();
      if (normalizedName.includes('data 2') || 
          normalizedName.includes('data2') ||
          normalizedName.includes('data (2)') ||
          normalizedName === 'data 2') {
        targetSheet = sheetName;
        break;
      }
    }
    
    if (!targetSheet) {
      throw new Error('Sheet "data 2" not found in Excel file. Available sheets: ' + sheetNames.join(', '));
    }
    
    console.log(`✓ Found target sheet: "${targetSheet}"`);
    const worksheet = workbook.Sheets[targetSheet];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Use array format
      defval: '' // Default value for empty cells
    });
    
    console.log(`✓ Excel data rows: ${jsonData.length}\n`);
    
    // Find the header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        const cells = row.map(cell => String(cell || '').toLowerCase().trim());
        
        // Check if this row contains our expected headers
        let matches = 0;
        if (cells.some(c => c.includes('rukn') && c.includes('id'))) matches++;
        if (cells.some(c => c.includes('area'))) matches++;
        
        if (matches >= 1) { // At least RUKN ID or Area
          headerRowIndex = i;
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Excel file');
    }
    
    console.log(`✓ Header row found at index: ${headerRowIndex}`);
    
    // Extract headers
    const headers = jsonData[headerRowIndex].map(h => String(h || '').trim());
    console.log('Headers:', headers);
    
    // Find column indices
    const columnMap = {
      ruknId: findRuknIdIndex(headers),
      area: findColumnIndex(headers, ['area'])
    };
    
    console.log('Column mapping:', columnMap);
    
    // Validate required columns
    if (columnMap.ruknId === -1) {
      throw new Error('RUKN ID column not found in Excel file');
    }
    
    if (columnMap.area === -1) {
      throw new Error('Area column not found in Excel file');
    }
    
    // Extract data rows (skip header and any empty rows)
    const dataRows = jsonData.slice(headerRowIndex + 1);
    const areaDataMap = new Map(); // Map of ruknId -> area
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      const ruknId = String(row[columnMap.ruknId] || '').trim();
      const area = String(row[columnMap.area] || '').trim();
      
      // Skip rows with missing RUKN ID
      if (!ruknId) {
        continue;
      }
      
      // Ensure RUKN ID is numeric only
      const numericRuknId = ruknId.replace(/\s+/g, '');
      if (!/^\d+$/.test(numericRuknId)) {
        console.log(`⚠️  Skipping row ${i + headerRowIndex + 2}: Invalid RUKN ID "${ruknId}"`);
        continue;
      }
      
      // Store area data (even if empty, we'll update it)
      areaDataMap.set(numericRuknId, area);
    }
    
    console.log(`✓ Parsed ${areaDataMap.size} area records from Excel file\n`);
    return areaDataMap;
    
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw error;
  }
};

/**
 * Migrate area values to unit admins
 */
const migrateAreaValues = async (excelPath, dryRun = false) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('MIGRATING AREA VALUES TO UNIT ADMINS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse Excel file
    const areaDataMap = await parseAreaDataFromExcel(excelPath);

    // Get all unit admins from database
    console.log('🗄️  Fetching existing unit admins from database...');
    const dbUnitAdmins = await UnitAdmin.find({}).lean();
    console.log(`✓ Found ${dbUnitAdmins.length} unit admins in database\n`);

    // Find unit admins that need area updates
    const updatesNeeded = [];
    const notFoundInExcel = [];
    const alreadyHasArea = [];

    for (const admin of dbUnitAdmins) {
      const ruknId = String(admin.ruknId || '').trim();
      
      if (areaDataMap.has(ruknId)) {
        const excelArea = areaDataMap.get(ruknId);
        const currentArea = String(admin.area || '').trim();
        
        if (currentArea !== excelArea) {
          updatesNeeded.push({
            ruknId: ruknId,
            name: admin.name,
            unit: admin.unit,
            currentArea: currentArea,
            newArea: excelArea
          });
        } else {
          alreadyHasArea.push({
            ruknId: ruknId,
            name: admin.name,
            area: currentArea
          });
        }
      } else {
        notFoundInExcel.push({
          ruknId: ruknId,
          name: admin.name,
          unit: admin.unit
        });
      }
    }

    console.log(`📊 Migration Summary:`);
    console.log(`   Total in Database:        ${dbUnitAdmins.length}`);
    console.log(`   Updates Needed:           ${updatesNeeded.length}`);
    console.log(`   Already Has Correct Area: ${alreadyHasArea.length}`);
    console.log(`   Not Found in Excel:       ${notFoundInExcel.length}\n`);

    if (updatesNeeded.length === 0) {
      console.log('✓ No area updates needed. All unit admins already have correct area values!\n');
      return { updated: 0, errors: [] };
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      console.log('Unit admins that would be updated:');
      updatesNeeded.slice(0, 20).forEach((update, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${update.ruknId}`);
        console.log(`      Name: ${update.name}`);
        console.log(`      Unit: ${update.unit}`);
        console.log(`      Current Area: "${update.currentArea}"`);
        console.log(`      New Area: "${update.newArea}"`);
        console.log('');
      });
      if (updatesNeeded.length > 20) {
        console.log(`   ... and ${updatesNeeded.length - 20} more\n`);
      }
      return { updated: 0, errors: [], dryRun: true, wouldUpdate: updatesNeeded.length };
    }

    // Show some examples of not found
    if (notFoundInExcel.length > 0 && notFoundInExcel.length <= 10) {
      console.log('⚠️  Unit admins not found in Excel (will be skipped):');
      notFoundInExcel.forEach((admin, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${admin.ruknId} | Name: ${admin.name} | Unit: ${admin.unit}`);
      });
      console.log('');
    } else if (notFoundInExcel.length > 10) {
      console.log(`⚠️  ${notFoundInExcel.length} unit admins not found in Excel (will be skipped)\n`);
    }

    // Ask for confirmation
    console.log(`⚠️  You are about to update area values for ${updatesNeeded.length} unit admins.`);
    const confirmed = await askConfirmation('\nDo you want to proceed? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Migration cancelled by user.\n');
      return { updated: 0, errors: [], cancelled: true };
    }

    // Perform updates
    console.log('\n🚀 Starting migration...\n');
    let updated = 0;
    let errors = [];

    for (const update of updatesNeeded) {
      try {
        await UnitAdmin.updateOne(
          { ruknId: update.ruknId },
          { $set: { area: update.newArea } }
        );
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`   Progress: ${updated}/${updatesNeeded.length} updated...`);
        }
      } catch (error) {
        errors.push({
          ruknId: update.ruknId,
          name: update.name,
          error: error.message
        });
      }
    }

    console.log(`\n✅ Successfully updated ${updated} unit admins\n`);

    if (errors.length > 0) {
      console.log(`❌ Errors occurred for ${errors.length} unit admins:`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. RUKN ID: ${err.ruknId}, Name: ${err.name}`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('');
    }

    return { updated, errors, notFound: notFoundInExcel.length };

  } catch (error) {
    console.error('❌ Error migrating area values:', error);
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
    console.log('║  UNIT ADMIN AREA MIGRATION TOOL                          ║');
    if (dryRun) {
      console.log('║  MODE: DRY RUN (No changes will be made)                 ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Connect to database
    await connectDB();

    // Define Excel file path
    const excelPath = path.join(__dirname, '..', 'uploads', 'ihtisabi', 'unit admins', 'Ameer-e-Muqami List 2025-27 dist wise I.xlsx');

    // Check if file exists
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ Excel file not found: ${excelPath}`);
      process.exit(1);
    }

    // Perform migration
    const result = await migrateAreaValues(excelPath, dryRun);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (dryRun) {
      console.log('🔍 DRY RUN SUMMARY:');
      console.log(`   Unit admins that would be updated: ${result.wouldUpdate || 0}`);
      console.log('\n💡 Run without --dry-run flag to actually update the data\n');
    } else if (result.cancelled) {
      console.log('❌ Migration was cancelled.\n');
    } else {
      console.log('✅ MIGRATION SUMMARY:');
      console.log(`   Unit admins updated:      ${result.updated}`);
      console.log(`   Not found in Excel:       ${result.notFound || 0}`);
      console.log(`   Total errors:             ${result.errors.length}`);
      console.log('');
      console.log('✨ Area values have been successfully migrated!');
      console.log('✨ All unit admins now have area values from the Excel file!\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
main();

