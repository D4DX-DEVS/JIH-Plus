const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Parse Excel file and extract user data
 * Expected format for Arkan List Kerala.xlsx:
 * - Column A: SL No. (Serial Number)
 * - Column B: District
 * - Column C: Area
 * - Column D: Unit (MUQAM)
 * - Column E: Rukn Id
 * - Column F: Rukn Name (ENGLISH)
 * - Column G: Gender
 * - Column H: Contact No
 * - Column I: Email Id
 * - Column J: INR (Country/Location)
 */
const parseExcelFile = async (filePath) => {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Use array format
      defval: '' // Default value for empty cells
    });
    
    console.log('Excel data rows:', jsonData.length);
    
    // Find the header row (usually row 1 or 2)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 5) { // Header row should have multiple columns
        // Check if this row contains our expected headers
        const cells = row.map(cell => String(cell || '').toLowerCase().trim());
        
        // Look for key column headers (need at least 2 matches to confirm it's the header row)
        let matches = 0;
        if (cells.some(c => c.includes('sl no') || c.includes('s.no') || (c.includes('sl') && c.includes('no')))) matches++;
        if (cells.some(c => c === 'district' || c.includes('district'))) matches++;
        if (cells.some(c => c === 'area' || c.includes('area'))) matches++;
        if (cells.some(c => c === 'unit' || c.includes('unit') || c.includes('muqam'))) matches++;
        if (cells.some(c => c.includes('rukn') && c.includes('id'))) matches++;
        if (cells.some(c => c.includes('rukn') && c.includes('name'))) matches++;
        if (cells.some(c => c === 'gender' || c.includes('gender'))) matches++;
        
        if (matches >= 3) { // Need at least 3 column headers to confirm
          headerRowIndex = i;
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Excel file');
    }
    
    console.log('Header row found at index:', headerRowIndex);
    
    // Extract headers
    const headers = jsonData[headerRowIndex].map(h => String(h || '').trim());
    console.log('Headers:', headers);
    
    // Find column indices
    const columnMap = {
      serialNo: findColumnIndex(headers, ['s.no', 'serial', 'sl no', 'sl.no', 'no']),
      district: findColumnIndex(headers, ['district']),
      area: findColumnIndex(headers, ['area']),
      unit: findColumnIndex(headers, ['unit', 'muqam']),
      ruknId: findRuknIdIndex(headers), // Important: avoid matching "RUKN NAME"
      name: findColumnIndex(headers, ['rukn name', 'name', 'english']),
      gender: findColumnIndex(headers, ['gender', 'sex']),
      contactNo: findColumnIndex(headers, ['contact no', 'contact', 'phone', 'mobile']),
      emailId: findColumnIndex(headers, ['email id', 'email', 'emailid']),
      country: findColumnIndex(headers, ['inr', 'country', 'location'])
    };
    
    console.log('Column mapping:', columnMap);
    
    // Validate required columns
    if (columnMap.name === -1 || columnMap.ruknId === -1) {
      throw new Error('Required columns (Name and RUKN ID) not found in Excel file');
    }
    
    // Extract data rows (skip header and any empty rows)
    const dataRows = jsonData.slice(headerRowIndex + 1);
    const users = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      const name = String(row[columnMap.name] || '').trim();
      const gender = columnMap.gender !== -1 ? String(row[columnMap.gender] || '').trim() : 'Male';
      const district = columnMap.district !== -1 ? String(row[columnMap.district] || '').trim() : '';
      const area = columnMap.area !== -1 ? String(row[columnMap.area] || '').trim() : '';
      const unit = columnMap.unit !== -1 ? String(row[columnMap.unit] || '').trim() : '';
      const ruknId = String(row[columnMap.ruknId] || '').trim();
      const contactNo = columnMap.contactNo !== -1 ? String(row[columnMap.contactNo] || '').trim() : '';
      const emailId = columnMap.emailId !== -1 ? String(row[columnMap.emailId] || '').trim() : '';
      const country = columnMap.country !== -1 ? String(row[columnMap.country] || '').trim() : '';
      
      // Skip rows with missing essential data
      if (!name || !ruknId) {
        console.log(`Skipping row ${i + headerRowIndex + 2}: Missing name or RUKN ID`);
        continue;
      }
      // Ensure RUKN ID is numeric only
      const numericRuknId = ruknId.replace(/\s+/g, '');
      if (!/^\d+$/.test(numericRuknId)) {
        console.log(`Skipping row ${i + headerRowIndex + 2}: Invalid RUKN ID "${ruknId}"`);
        continue;
      }
      
      const cleanUnit = cleanUnitName(unit);
      if (!cleanUnit) {
        console.log(`Skipping row ${i + headerRowIndex + 2}: Missing Unit`);
        continue;
      }
      
      users.push({
        name,
        gender: ['Male', 'Female'].includes(gender) ? gender : 'Male',
        district: district || '',
        area: area || '',
        unit: cleanUnit,
        ruknId: numericRuknId,
        contactNo: contactNo || '',
        emailId: emailId || '',
        country: country || '',
        serialNo: columnMap.serialNo !== -1 ? row[columnMap.serialNo] : i + 1
      });
    }
    
    console.log(`Parsed ${users.length} users from Excel file`);
    return users;
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw error;
  }
};

/**
 * Find column index based on header keywords
 */
const findColumnIndex = (headers, keywords) => {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    for (const keyword of keywords) {
      if (header.includes(keyword.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
};

/**
 * Find RUKN ID column index with stricter rules
 * - Prefer exact/clear matches like "rukn id", "rukn_id", "id"
 * - Explicitly avoid headers that include the word "name"
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
 * Find District column index with specific patterns
 * - Look for "district/city", "district", "city" patterns
 * - Handle variations like "District/City", "DISTRICT/CITY"
 */
const findDistrictIndex = (headers) => {
  const normalized = headers.map(h => String(h || '').trim().toLowerCase());

  // Strong matches first - exact patterns
  const strongKeywords = ['district/city', 'district', 'city', 'division'];
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (strongKeywords.some(k => h === k)) return i;
  }
  
  // Also check for exact match with forward slash
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (h === 'district/city' || h === 'district / city') return i;
  }

  // Contains patterns
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (h.includes('district') || h.includes('city') || h.includes('division')) return i;
  }

  return -1;
};

/**
 * Extract district name from unit string
 * Example: "ALAPPUZHA (69+28=97)" -> "ALAPPUZHA"
 */
// No district/area extraction needed anymore

/**
 * Clean unit name by removing district info and numbers
 */
const cleanUnitName = (unit) => {
  if (!unit) return '';
  
  // Remove parenthetical content
  let cleanUnit = unit.replace(/\s*\([^)]*\)\s*/, '').trim();
  
  // If it's just a district name, use it as unit
  return cleanUnit;
};

/**
 * Parse Excel file for Unit Admin data
 * Expected format based on the provided example:
 * - Column A: S.NO (Serial Number)
 * - Column B: Unit
 * - Column C: District/City
 * - Column D: Rukn ID
 * - Column E: Rukn Name
 * - Column F: Contact No
 * - Column G: Email Id
 */
const parseUnitAdminExcelFile = async (filePath) => {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Use array format
      defval: '' // Default value for empty cells
    });
    
    console.log('Unit Admin Excel data rows:', jsonData.length);
    
    // Find the header row (usually row 1 or 2)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        // Check if this row contains our expected headers
        const firstCell = String(row[0] || '').toLowerCase().trim();
        const secondCell = String(row[1] || '').toLowerCase().trim();
        
        if (firstCell.includes('s.no') || firstCell.includes('serial') || 
            secondCell.includes('unit') || secondCell.includes('rukn')) {
          headerRowIndex = i;
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Unit Admin Excel file');
    }
    
    console.log('Unit Admin header row found at index:', headerRowIndex);
    
    // Extract headers
    const headers = jsonData[headerRowIndex].map(h => String(h || '').trim());
    console.log('Unit Admin headers:', headers);
    
    // Find column indices for unit admin data
    const columnMap = {
      serialNo: findColumnIndex(headers, ['S.NO.', 's.no', 'serial', 'no']),
      unit: findColumnIndex(headers, ['unit', 'muqam']),
      district: findDistrictIndex(headers), // Use specialized function for district
      area: findColumnIndex(headers, ['area']),
      ruknId: findRuknIdIndex(headers),
      name: findColumnIndex(headers, ['rukn name', 'name', 'english']),
      contactNo: findColumnIndex(headers, ['contact no', 'contact', 'phone', 'mobile']),
      emailId: findColumnIndex(headers, ['Email Id', 'email id', 'email', 'emailid'])
    };
    
    console.log('Unit Admin column mapping:', columnMap);
    console.log('District column found at index:', columnMap.district);
    if (columnMap.district !== -1) {
      console.log('District column header:', headers[columnMap.district]);
    }
    
    // Validate required columns
    if (columnMap.unit === -1 || columnMap.ruknId === -1 || columnMap.name === -1) {
      throw new Error('Required columns (Unit, RUKN ID, Name) not found in Unit Admin Excel file');
    }
    
    // Extract data rows (skip header and any empty rows)
    const dataRows = jsonData.slice(headerRowIndex + 1);
    const unitAdmins = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      const unit = String(row[columnMap.unit] || '').trim();
      const district = columnMap.district !== -1 ? String(row[columnMap.district] || '').trim() : '';
      const area = columnMap.area !== -1 ? String(row[columnMap.area] || '').trim() : '';
      const ruknId = String(row[columnMap.ruknId] || '').trim();
      const name = String(row[columnMap.name] || '').trim();
      const contactNo = columnMap.contactNo !== -1 ? String(row[columnMap.contactNo] || '').trim() : '';
      const emailId = columnMap.emailId !== -1 ? String(row[columnMap.emailId] || '').trim() : '';
      
      // Debug logging for first few rows
      if (i < 3) {
        console.log(`Row ${i + 1}: Unit="${unit}", District="${district}", Area="${area}", RUKN ID="${ruknId}", Name="${name}"`);
      }
      
      // Skip rows with missing essential data
      if (!unit || !ruknId || !name) {
        console.log(`Skipping Unit Admin row ${i + headerRowIndex + 2}: Missing unit, RUKN ID, or name`);
        continue;
      }
      
      // Ensure RUKN ID is numeric only
      const numericRuknId = ruknId.replace(/\s+/g, '');
      if (!/^\d+$/.test(numericRuknId)) {
        console.log(`Skipping Unit Admin row ${i + headerRowIndex + 2}: Invalid RUKN ID "${ruknId}"`);
        continue;
      }
      
      // Determine district - if empty, try to infer from unit or use a default
      let finalDistrict = district;
      if (!finalDistrict || finalDistrict.trim() === '') {
        // If district is empty, we need to handle this case
        // For now, we'll use a placeholder that indicates it needs to be set
        finalDistrict = 'District Not Specified';
        console.log(`Warning: District is empty for unit "${unit}" - using placeholder`);
      }

      unitAdmins.push({
        unit: unit,
        district: finalDistrict,
        area: area || '',
        ruknId: numericRuknId,
        name: name,
        contactNo: contactNo || '',
        emailId: emailId || '',
        serialNo: columnMap.serialNo !== -1 ? row[columnMap.serialNo] : i + 1
      });
    }
    
    console.log(`Parsed ${unitAdmins.length} unit admins from Excel file`);
    return unitAdmins;
    
  } catch (error) {
    console.error('Error parsing Unit Admin Excel file:', error);
    throw error;
  }
};

module.exports = {
  parseExcelFile,
  parseUnitAdminExcelFile
};
