const express = require('express');
const jwt = require('jsonwebtoken');
const userAuth = require('../middlewares/userAuth');
const adminAuth = require('../middlewares/adminAuth');
const Form = require('../models/form');
const User = require('../models/user');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');

const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');

// Initialize OpenAI client if API key exists
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ====== UTILITY FUNCTIONS ======
// Helper function to get first N letters (alphanumeric only, lowercase)
const getFirstLetters = (text, count) => {
  if (!text) return '';
  // Remove non-alphanumeric characters, convert to lowercase, and get first N letters
  const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return cleaned.substring(0, count);
};

// Generate access code based on new pattern
const generateAccessCode = (type, districtName, areaName = null, unitName = null) => {
  const districtCode = getFirstLetters(districtName, 4);
  
  switch (type) {
    case 'district':
      // District: first 4 letters + "12345"
      return `${districtCode}12345`;
    
    case 'area':
      // Area: first 4 letters of district + "@" + first 4 letters of area
      const areaCode = getFirstLetters(areaName, 4);
      return `${districtCode}@${areaCode}`;
    
    case 'unit':
      // Unit: first 4 letters of district + "@" + first 4 letters of area + "@" + first 5 letters of unit
      const areaCodeForUnit = getFirstLetters(areaName, 4);
      const unitCode = getFirstLetters(unitName, 5);
      return `${districtCode}@${areaCodeForUnit}@${unitCode}`;
    
    default:
      throw new Error(`Unknown user type: ${type}`);
  }
};

// Helper function to fetch district data from external API
const fetchDistrictData = async () => {
  try {
    const apiEndpoint = process.env.DISTRICT_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('District API endpoint not configured in environment variables');
    }
    
    const response = await axios.get(apiEndpoint);
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from districts API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching district data:', error);
    throw error;
  }
};

// Helper function to fetch area data from external API
const fetchAreaData = async (districtId) => {
  try {
    const apiEndpoint = process.env.AREA_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('Area API endpoint not configured in environment variables');
    }
    
    // Replace {districtId} placeholder in API endpoint if it exists
    const finalEndpoint = apiEndpoint.includes('{districtId}') 
      ? apiEndpoint.replace('{districtId}', encodeURIComponent(districtId))
      : `${apiEndpoint}/${encodeURIComponent(districtId)}`;
    
    const response = await axios.get(finalEndpoint);
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from areas API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching area data:', error);
    throw error;
  }
};

// Helper function to fetch unit data from external API
const fetchUnitData = async (areaId) => {
  try {
    const apiEndpoint = process.env.UNIT_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('Unit API endpoint not configured in environment variables');
    }
    
    // Replace {areaId} placeholder in API endpoint if it exists
    const finalEndpoint = apiEndpoint.includes('{areaId}') 
      ? apiEndpoint.replace('{areaId}', encodeURIComponent(areaId))
      : `${apiEndpoint}/${encodeURIComponent(areaId)}`;
    
    const response = await axios.get(finalEndpoint);
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from units API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching unit data:', error);
    throw error;
  }
};


// ====== HIERARCHY LIST ENDPOINTS ======
// Get districts from external API (if configured) otherwise fallback to static
router.get('/hierarchy/districts', async (req, res) => {
  try {
    console.log('Hierarchy districts endpoint called');
    if (process.env.DISTRICT_API_ENDPOINT) {
      console.log('Using external API:', process.env.DISTRICT_API_ENDPOINT);
      const data = await fetchDistrictData();
      
      return res.json({ success: true, data }

      );
    }
    // console.log('Using static districts');
    // const districtList = Object.keys(DISTRICTS).map(name => ({ id: name, name }));
    // console.log('Static districts:', districtList);
    // res.json({ success: true, data: districtList });
  } catch (e) {
    console.error('Error in hierarchy districts:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to load districts' });
  }
});

// Get areas for a districtId
router.get('/hierarchy/areas/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    const data = await fetchAreaData(districtId);
    
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load areas' });
  }
});

// Get units for an areaId
router.get('/hierarchy/units/:areaId', async (req, res) => {
  try {
    const { areaId } = req.params;
    const units = await UnitMaster.find({ areaId, isActive: true })
      .select('_id name uniqueCode areaId districtId')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: units });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load units' });
  }
});

// ====== SYNC ENDPOINT - Fetch and store all districts, areas, and units ======
router.post('/sync-hierarchy', adminAuth, async (req, res) => {
  try {
    console.log('Starting hierarchy sync...');
    
    // Fetch all districts
    const districts = await fetchDistrictData();
    if (!Array.isArray(districts)) {
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid districts data format' 
      });
    }

    let syncedCount = {
      districts: 0,
      areas: 0,
      units: 0,
      errors: []
    };

    // Sync districts
    for (const district of districts) {
      try {
        const districtId = district._id || district.id;
        const districtName = district.title || district.name || districtId;

        // Check if district user already exists
        let districtUser = await User.findOne({ 
          type: 'district', 
          districtId: districtId 
        });

        if (!districtUser) {
          // Generate access code using new pattern: first 4 letters + "12345"
          const accessCode = generateAccessCode('district', districtName);
          districtUser = new User({
            accessCode,
            type: 'district',
            districtId: districtId,
            districtName: districtName
          });
          await districtUser.save();
          syncedCount.districts++;
          console.log(`Created district user: ${districtName} with access code: ${accessCode}`);
        } else {
          // Update district name and access code if changed
          districtUser.districtName = districtName;
          districtUser.accessCode = generateAccessCode('district', districtName);
          await districtUser.save();
        }

        // Fetch and sync areas for this district
        try {
          const areas = await fetchAreaData(districtId);
          if (Array.isArray(areas)) {
            for (const area of areas) {
              try {
                const areaId = area._id || area.id;
                const areaName = area.title || area.name || areaId;

                // Check if area user already exists
                let areaUser = await User.findOne({ 
                  type: 'area', 
                  districtId: districtId,
                  areaId: areaId 
                });

                if (!areaUser) {
                  // Generate access code using new pattern: district@area
                  const accessCode = generateAccessCode('area', districtName, areaName);
                  areaUser = new User({
                    accessCode,
                    type: 'area',
                    districtId: districtId,
                    districtName: districtName,
                    areaId: areaId,
                    areaName: areaName
                  });
                  await areaUser.save();
                  syncedCount.areas++;
                  console.log(`Created area user: ${areaName} with access code: ${accessCode}`);
                } else {
                  // Update area name and access code if changed
                  areaUser.areaName = areaName;
                  areaUser.districtName = districtName;
                  areaUser.accessCode = generateAccessCode('area', districtName, areaName);
                  await areaUser.save();
                }

                // Fetch and sync units for this area
                try {
                  const units = await fetchUnitData(areaId);
                  if (Array.isArray(units)) {
                    for (const unit of units) {
                      try {
                        const unitId = unit._id || unit.id;
                        const unitName = unit.title || unit.name || unitId;

                        // Check if unit user already exists
                        let unitUser = await User.findOne({ 
                          type: 'unit', 
                          districtId: districtId,
                          areaId: areaId,
                          unitId: unitId 
                        });

                        if (!unitUser) {
                          // Generate access code using new pattern: district@area@unit
                          const accessCode = generateAccessCode('unit', districtName, areaName, unitName);
                          unitUser = new User({
                            accessCode,
                            type: 'unit',
                            districtId: districtId,
                            districtName: districtName,
                            areaId: areaId,
                            areaName: areaName,
                            unitId: unitId,
                            unitName: unitName
                          });
                          await unitUser.save();
                          syncedCount.units++;
                          console.log(`Created unit user: ${unitName} with access code: ${accessCode}`);
                        } else {
                          // Update unit name and access code if changed
                          unitUser.unitName = unitName;
                          unitUser.areaName = areaName;
                          unitUser.districtName = districtName;
                          unitUser.accessCode = generateAccessCode('unit', districtName, areaName, unitName);
                          await unitUser.save();
                        }
                      } catch (unitError) {
                        console.error(`Error syncing unit ${unit._id || unit.id}:`, unitError);
                        syncedCount.errors.push(`Unit ${unit._id || unit.id}: ${unitError.message}`);
                      }
                    }
                  }
                } catch (unitFetchError) {
                  console.error(`Error fetching units for area ${areaId}:`, unitFetchError);
                  syncedCount.errors.push(`Area ${areaId} units: ${unitFetchError.message}`);
                }
              } catch (areaError) {
                console.error(`Error syncing area ${area._id || area.id}:`, areaError);
                syncedCount.errors.push(`Area ${area._id || area.id}: ${areaError.message}`);
              }
            }
          }
        } catch (areaFetchError) {
          console.error(`Error fetching areas for district ${districtId}:`, areaFetchError);
          syncedCount.errors.push(`District ${districtId} areas: ${areaFetchError.message}`);
        }
      } catch (districtError) {
        console.error(`Error syncing district ${district._id || district.id}:`, districtError);
        syncedCount.errors.push(`District ${district._id || district.id}: ${districtError.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Hierarchy sync completed',
      synced: syncedCount
    });

  } catch (error) {
    console.error('Sync hierarchy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error syncing hierarchy', 
      error: error.message 
    });
  }
});

// ====== UNIFIED LOGIN ======
// Unified Login Route - supports:
//   1. username (uniqueCode) + password  → new location master system
//   2. accessCode only                   → legacy User model (backward compat)
router.post('/login/unified', async (req, res) => {
  try {
    const { accessCode, username, password } = req.body;

    // ── NEW: username + password login via location master models ────────────
    if (username && password) {
      const normalizedUsername = username.trim().toLowerCase();
      console.log(`=== New login attempt: username="${normalizedUsername}" ===`);

      // Check District
      const district = await District.findOne({ uniqueCode: normalizedUsername, isActive: true })
        .populate('stateId', 'name');
      if (district) {
        if (district.password !== password) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign(
          {
            id: district._id,
            _id: district._id,
            userId: district._id,
            userType: 'user',
            role: 'district',
            district: district.name,
            districtId: district._id.toString(),
            districtMasterId: district._id.toString(),
            uniqueCode: district.uniqueCode,
            isUser: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          message: 'District login successful',
          token,
          user: {
            role: 'district',
            district: district.name,
            districtId: district._id.toString()
          },
          userType: 'district'
        });
      }

      // Check Area
      const area = await AreaMaster.findOne({ uniqueCode: normalizedUsername, isActive: true })
        .populate('districtId', 'name uniqueCode sequentialNumber');
      if (area) {
        if (area.password !== password) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign(
          {
            id: area._id,
            _id: area._id,
            userId: area._id,
            userType: 'user',
            role: 'area',
            district: area.districtId ? area.districtId.name : '',
            districtId: area.districtId ? area.districtId._id.toString() : '',
            districtMasterId: area.districtId ? area.districtId._id.toString() : '',
            areaId: area._id.toString(),
            areaMasterId: area._id.toString(),
            areaName: area.name,
            uniqueCode: area.uniqueCode,
            isUser: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          message: 'Area login successful',
          token,
          user: {
            role: 'area',
            district: area.districtId ? area.districtId.name : '',
            districtId: area.districtId ? area.districtId._id.toString() : '',
            areaId: area._id.toString(),
            area: area.name
          },
          userType: 'area'
        });
      }

      // Check Unit
      const unit = await UnitMaster.findOne({ uniqueCode: normalizedUsername, isActive: true })
        .populate('districtId', 'name uniqueCode sequentialNumber')
        .populate('areaId', 'name uniqueCode randomCode');
      if (unit) {
        if (unit.password !== password) {
          return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign(
          {
            id: unit._id,
            _id: unit._id,
            userId: unit._id,
            userType: 'user',
            role: 'unit',
            district: unit.districtId ? unit.districtId.name : '',
            districtId: unit.districtId ? unit.districtId._id.toString() : '',
            districtMasterId: unit.districtId ? unit.districtId._id.toString() : '',
            areaId: unit.areaId ? unit.areaId._id.toString() : '',
            areaMasterId: unit.areaId ? unit.areaId._id.toString() : '',
            areaName: unit.areaId ? unit.areaId.name : '',
            unitId: unit._id.toString(),
            unitMasterId: unit._id.toString(),
            unitName: unit.name,
            uniqueCode: unit.uniqueCode,
            isUser: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          message: 'Unit login successful',
          token,
          user: {
            role: 'unit',
            district: unit.districtId ? unit.districtId.name : '',
            districtId: unit.districtId ? unit.districtId._id.toString() : '',
            areaId: unit.areaId ? unit.areaId._id.toString() : '',
            area: unit.areaId ? unit.areaId.name : '',
            unitId: unit._id.toString(),
            unit: unit.name
          },
          userType: 'unit'
        });
      }

      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ── LEGACY: accessCode-only login via User model ─────────────────────────
    if (!accessCode) {
      return res.status(400).json({ message: 'Access code or username+password is required' });
    }
    
    // Normalize access code: trim whitespace
    const normalizedAccessCode = accessCode.trim();
    console.log(`Unified login attempt with access code: "${normalizedAccessCode}"`);
    
    // Try exact match first (fastest)
    let users = await User.find({ accessCode: normalizedAccessCode });
    
    // If no exact match, try case-insensitive search (helps with production issues)
    if (!users || users.length === 0) {
      console.log('Exact match not found, trying case-insensitive search...');
      const escapedCode = normalizedAccessCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      users = await User.find({ 
        accessCode: { $regex: new RegExp(`^${escapedCode}$`, 'i') }
      });
    }
    
    console.log(`Found ${users.length} user(s) with access code: "${normalizedAccessCode}"`);
    
    if (!users || users.length === 0) {
      // Log additional info for debugging production issues
      console.log('No users found. Checking database...');
      const totalUsers = await User.countDocuments();
      const allAccessCodes = await User.distinct('accessCode');
      console.log(`Total users in database: ${totalUsers}`);
      console.log(`Total unique access codes in database: ${allAccessCodes.length}`);
      if (allAccessCodes.length > 0) {
        console.log('Sample access codes (first 10):', allAccessCodes.slice(0, 10));
        // Check if there's a similar access code (for debugging)
        const similarCodes = allAccessCodes.filter(code => 
          code.toLowerCase().includes(normalizedAccessCode.toLowerCase()) || 
          normalizedAccessCode.toLowerCase().includes(code.toLowerCase())
        );
        if (similarCodes.length > 0) {
          console.log('Similar access codes found:', similarCodes.slice(0, 5));
        }
      }
      
      return res.status(401).json({ 
        message: 'Invalid access code' 
      });
    }

    // If multiple users have the same access code, use the first one
    // (Admin can edit duplicates manually from dashboard)
    const user = users[0];
    
    if (users.length > 1) {
      console.warn(`Warning: Multiple users found with access code ${accessCode}. Using first match.`);
    }
    
    console.log('User found:', {
      type: user.type,
      districtId: user.districtId,
      areaId: user.areaId,
      unitId: user.unitId
    });
    
    // Generate JWT token based on user type
    let token;
    let userData;
    
    switch (user.type) {
      case 'district':
        token = jwt.sign(
          { 
            id: user._id,
            _id: user._id,
            userId: user._id,
            userType: 'user',
            role: 'district',
            district: user.districtName,
            districtId: user.districtId,
            accessCode: user.accessCode,
            isUser: true 
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        userData = { 
          role: 'district', 
          district: user.districtName,
          districtId: user.districtId
        };
        break;
        
      case 'area':
        token = jwt.sign(
          {
            id: user._id,
            _id: user._id,
            userId: user._id,
            userType: 'user',
            role: 'area',
            district: user.districtName,
            districtId: user.districtId,
            areaId: user.areaId,
            areaName: user.areaName,
            isUser: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        userData = { 
          role: 'area', 
          district: user.districtName,
          districtId: user.districtId,
          areaId: user.areaId,
          area: user.areaName
        };
        break;
        
      case 'unit':
        token = jwt.sign(
          {
            id: user._id,
            _id: user._id,
            userId: user._id,
            userType: 'user',
            role: 'unit',
            district: user.districtName,
            districtId: user.districtId,
            areaId: user.areaId,
            areaName: user.areaName,
            unitId: user.unitId,
            unitName: user.unitName,
            isUser: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        userData = { 
          role: 'unit', 
          district: user.districtName,
          districtId: user.districtId,
          areaId: user.areaId,
          area: user.areaName,
          unitId: user.unitId,
          unit: user.unitName
        };
        break;
        
      default:
        return res.status(400).json({ message: 'Unknown user type' });
    }
    
    console.log('Login successful for user type:', user.type);
    
    res.json({
      message: `${user.type.charAt(0).toUpperCase() + user.type.slice(1)} login successful`,
      token,
      user: userData,
      userType: user.type
    });
    
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====== DROP UNIQUE INDEX ENDPOINT ======
router.post('/users/drop-unique-index', adminAuth, async (req, res) => {
  try {
    // Drop the unique index on accessCode if it exists
    const User = require('../models/user');
    const collection = User.collection;
    
    try {
      await collection.dropIndex('accessCode_1');
      console.log('Dropped unique index on accessCode');
    } catch (indexError) {
      // Index might not exist or already dropped
      if (indexError.code !== 27 && indexError.codeName !== 'IndexNotFound') {
        console.error('Error dropping index:', indexError);
      }
    }

    res.json({
      success: true,
      message: 'Unique index dropped successfully. You can now have duplicate access codes.'
    });

  } catch (error) {
    console.error('Error dropping index:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error dropping unique index', 
      error: error.message 
    });
  }
});

// ====== MIGRATION ENDPOINT - Update all existing access codes to new pattern ======
router.post('/users/migrate-access-codes', adminAuth, async (req, res) => {
  try {
    console.log('Starting access code migration...');
    
    // First, try to drop the unique index
    try {
      const collection = User.collection;
      await collection.dropIndex('accessCode_1');
      console.log('Dropped unique index on accessCode');
    } catch (indexError) {
      // Index might not exist, that's okay
      if (indexError.code !== 27 && indexError.codeName !== 'IndexNotFound') {
        console.warn('Could not drop index (may not exist):', indexError.message);
      }
    }
    
    const users = await User.find({});
    let migrated = {
      districts: 0,
      areas: 0,
      units: 0,
      skipped: 0,
      failed: [],
      errors: []
    };

    // Track which access codes we've already assigned
    const assignedCodes = new Map(); // accessCode -> array of user IDs

    for (const user of users) {
      try {
        let newAccessCode;
        
        if (user.type === 'district') {
          newAccessCode = generateAccessCode('district', user.districtName);
        } else if (user.type === 'area') {
          newAccessCode = generateAccessCode('area', user.districtName, user.areaName);
        } else if (user.type === 'unit') {
          newAccessCode = generateAccessCode('unit', user.districtName, user.areaName, user.unitName);
        } else {
          continue;
        }

        // Check if this access code is already assigned to another user
        if (assignedCodes.has(newAccessCode)) {
          const existingUsers = assignedCodes.get(newAccessCode);
          // If this user already has this code, skip
          if (user.accessCode === newAccessCode) {
            migrated.skipped++;
            continue;
          }
          // Otherwise, mark as duplicate (will need manual editing)
          migrated.failed.push({
            userId: user._id.toString(),
            type: user.type,
            districtName: user.districtName,
            areaName: user.areaName,
            unitName: user.unitName,
            oldAccessCode: user.accessCode,
            newAccessCode: newAccessCode,
            reason: `Duplicate: Already assigned to ${existingUsers.length} other user(s)`
          });
          existingUsers.push(user._id.toString());
          continue;
        }

        // Update access code
        try {
          user.accessCode = newAccessCode;
          await user.save();
          
          // Track this assignment
          assignedCodes.set(newAccessCode, [user._id.toString()]);
          
          if (user.type === 'district') migrated.districts++;
          else if (user.type === 'area') migrated.areas++;
          else if (user.type === 'unit') migrated.units++;
          
          console.log(`Migrated ${user.type} ${user.districtName}: ${newAccessCode}`);
        } catch (saveError) {
          // Check if it's a duplicate key error (E11000)
          if (saveError.code === 11000 || saveError.codeName === 'DuplicateKey') {
            // This access code already exists in DB (unique index still active or duplicate)
            migrated.failed.push({
              userId: user._id.toString(),
              type: user.type,
              districtName: user.districtName,
              areaName: user.areaName,
              unitName: user.unitName,
              oldAccessCode: user.accessCode,
              newAccessCode: newAccessCode,
              reason: `Duplicate key error: Access code already exists in database`
            });
            console.warn(`Skipped migration for user ${user._id}: duplicate access code ${newAccessCode}`);
          } else {
            throw saveError; // Re-throw if it's a different error
          }
        }
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error);
        migrated.errors.push({
          userId: user._id.toString(),
          type: user.type,
          districtName: user.districtName,
          areaName: user.areaName,
          unitName: user.unitName,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Access code migration completed',
      migrated,
      failedCount: migrated.failed.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error migrating access codes', 
      error: error.message 
    });
  }
});

// ====== GET FAILED MIGRATIONS ======
router.get('/users/failed-migrations', adminAuth, async (req, res) => {
  try {
    // Find all users and check which ones have access codes that don't match the new pattern
    const users = await User.find({});
    const failed = [];

    for (const user of users) {
      let expectedCode;
      
      if (user.type === 'district') {
        expectedCode = generateAccessCode('district', user.districtName);
      } else if (user.type === 'area') {
        expectedCode = generateAccessCode('area', user.districtName, user.areaName);
      } else if (user.type === 'unit') {
        expectedCode = generateAccessCode('unit', user.districtName, user.areaName, user.unitName);
      } else {
        continue;
      }

      // If current access code doesn't match expected pattern, check if it needs migration
      if (user.accessCode !== expectedCode) {
        // Check if expected code already exists for another user (conflict)
        const existingUser = await User.findOne({ 
          accessCode: expectedCode,
          _id: { $ne: user._id }
        });

        // Check if current access code has conflicts (is used by other users)
        const usersWithSameCode = await User.find({ 
          accessCode: user.accessCode,
          _id: { $ne: user._id }
        });

        // Only include in failed migrations if:
        // 1. The expected code is already taken (conflict), OR
        // 2. The current code has conflicts (duplicates)
        // This way, if a user has been manually updated to a unique code, they won't appear
        if (existingUser || usersWithSameCode.length > 0) {
          failed.push({
            _id: user._id.toString(),
            type: user.type,
            districtName: user.districtName,
            areaName: user.areaName,
            unitName: user.unitName,
            currentAccessCode: user.accessCode,
            expectedAccessCode: expectedCode,
            conflict: existingUser ? {
              userId: existingUser._id.toString(),
              type: existingUser.type,
              districtName: existingUser.districtName,
              areaName: existingUser.areaName,
              unitName: existingUser.unitName
            } : null,
            hasDuplicates: usersWithSameCode.length > 0,
            duplicateCount: usersWithSameCode.length
          });
        }
        // If no conflicts exist (user has been manually fixed to a unique code), skip them
      }
    }

    res.json({
      success: true,
      failed,
      count: failed.length
    });

  } catch (error) {
    console.error('Error finding failed migrations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error finding failed migrations', 
      error: error.message 
    });
  }
});

// ====== GET DUPLICATE ACCESS CODES ======
router.get('/users/duplicates', adminAuth, async (req, res) => {
  try {
    // Find all users and group by access code
    const users = await User.find({}).sort({ 
      accessCode: 1, 
      type: 1, 
      districtName: 1, 
      areaName: 1, 
      unitName: 1 
    });

    // Group by access code
    const accessCodeMap = {};
    users.forEach(user => {
      if (!accessCodeMap[user.accessCode]) {
        accessCodeMap[user.accessCode] = [];
      }
      accessCodeMap[user.accessCode].push(user);
    });

    // Find duplicates (access codes with more than 1 user)
    const duplicates = Object.entries(accessCodeMap)
      .filter(([code, usersList]) => usersList.length > 1)
      .map(([code, usersList]) => ({
        accessCode: code,
        count: usersList.length,
        users: usersList.map(u => ({
          _id: u._id,
          type: u.type,
          districtName: u.districtName,
          areaName: u.areaName,
          unitName: u.unitName,
          districtId: u.districtId,
          areaId: u.areaId,
          unitId: u.unitId
        }))
      }));

    res.json({
      success: true,
      duplicates,
      totalDuplicates: duplicates.length
    });

  } catch (error) {
    console.error('Error finding duplicates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error finding duplicate access codes', 
      error: error.message 
    });
  }
});

// ====== UPDATE ACCESS CODE ======
router.put('/users/:id/access-code', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { accessCode } = req.body;

    if (!accessCode || accessCode.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Access code is required' 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.accessCode = accessCode.trim();
    await user.save();

    res.json({
      success: true,
      message: 'Access code updated successfully',
      user: {
        _id: user._id,
        accessCode: user.accessCode,
        type: user.type,
        districtName: user.districtName,
        areaName: user.areaName,
        unitName: user.unitName
      }
    });

  } catch (error) {
    console.error('Error updating access code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating access code', 
      error: error.message 
    });
  }
});

// ====== CSV DOWNLOAD ENDPOINT ======
router.get('/users/export-csv', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).sort({ 
      type: 1, 
      districtName: 1, 
      areaName: 1, 
      unitName: 1 
    });

    // Create CSV header
    const headers = [
      'Access Code',
      'Type',
      'District ID',
      'District Name',
      'Area ID',
      'Area Name',
      'Unit ID',
      'Unit Name',
      'Created At'
    ];

    // Create CSV rows
    const rows = users.map(user => [
      user.accessCode,
      user.type,
      user.districtId || '',
      user.districtName || '',
      user.areaId || '',
      user.areaName || '',
      user.unitId || '',
      user.unitName || '',
      user.createdAt ? new Date(user.createdAt).toISOString() : ''
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`);

    res.send(csvContent);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting users to CSV', 
      error: error.message 
    });
  }
});





// Protected route example - verify user is authenticated
router.get('/profile', userAuth, (req, res) => {
  res.json({
    message: 'User profile accessed successfully',
    user: req.user
  });
});



// Form Submission - Create new form (POST)
router.post('/forms', userAuth, async (req, res) => {
  try {
    const formData = req.body;
    // Add user information to the form
    const newForm = new Form({
      ...formData,
      submittedBy: req.user.district, // Track which district submitted
      submittedAt: new Date()
    });

    const savedForm = await newForm.save();
    
    res.status(201).json({
      message: 'Form submitted successfully',
      form: savedForm
    });

  } catch (error) {
    console.error('Form submission error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ message: 'Server error during form submission' });
  }
});

// Get all forms submitted by the authenticated user (GET)
router.get('/forms', userAuth, async (req, res) => {
  try {
    const forms = await Form.find({ submittedBy: req.user.district })
      .sort({ submittedAt: -1 }); // Most recent first
    
    res.json({
      message: 'Forms retrieved successfully',
      count: forms.length,
      forms: forms
    });

  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ message: 'Server error while retrieving forms' });
  }
});

// Get a specific form by ID (GET)
router.get('/forms/:id', userAuth, async (req, res) => {
  try {
    const form = await Form.findOne({
      _id: req.params.id,
      submittedBy: req.user.district
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      message: 'Form retrieved successfully',
      form: form
    });

  } catch (error) {
    console.error('Get form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    res.status(500).json({ message: 'Server error while retrieving form' });
  }
});

// Update a specific form by ID (PUT)
router.put('/forms/:id', userAuth, async (req, res) => {
  try {
    const formData = req.body;
    
    const updatedForm = await Form.findOneAndUpdate(
      {
        _id: req.params.id,
        submittedBy: req.user.district
      },
      {
        ...formData,
        updatedAt: new Date()
      },
      {
        new: true, // Return the updated document
        runValidators: true // Run validation on update
      }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      message: 'Form updated successfully',
      form: updatedForm
    });

  } catch (error) {
    console.error('Update form error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    res.status(500).json({ message: 'Server error while updating form' });
  }
});

// Delete a specific form by ID (DELETE)
router.delete('/forms/:id', userAuth, async (req, res) => {
  try {
    const deletedForm = await Form.findOneAndDelete({
      _id: req.params.id,
      submittedBy: req.user.district
    });

    if (!deletedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      message: 'Form deleted successfully',
      deletedForm: deletedForm
    });

  } catch (error) {
    console.error('Delete form error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    
    res.status(500).json({ message: 'Server error while deleting form' });
  }
});


// ===== MONTHLY SURVEY ROUTES =====

// Get all surveys (district, area, unit) for the "all" tab
router.get('/monthly-surveys/all', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, month, level } = req.query;
    const currentUser = req.user;
    
    // Since user is always district admin, get all surveys in their district hierarchy
    // Simply use district field to get all surveys from all levels
    
    // Import the specific survey models
    const DistrictSurvey = require('../models/districtSurvey');
    const AreaSurvey = require('../models/areaSurvey');
    const UnitSurvey = require('../models/unitSurvey');
    
    // Build base query for each model - use case-insensitive district matching
    const baseQuery = { 
      district: { 
        $regex: new RegExp(`^${currentUser.district}$`, 'i') 
      } 
    };
    const monthQuery = month ? { ...baseQuery, month: month } : baseQuery;
    
    // Fetch surveys based on level filter
    let districtSurveys = [], areaSurveys = [], unitSurveys = [];
    
    if (!level || level === 'district') {
      districtSurveys = await DistrictSurvey.find(monthQuery).sort({ submittedAt: -1 });
    }
    
    if (!level || level === 'area') {
      areaSurveys = await AreaSurvey.find(monthQuery).sort({ submittedAt: -1 });
    }
    
    if (!level || level === 'unit') {
      unitSurveys = await UnitSurvey.find(monthQuery).sort({ submittedAt: -1 });
    }
    
    
    // Debug: Check what's actually in the database
    const allAreaSurveys = await AreaSurvey.find({});
    

    

    

    // Combine all surveys and add submission level
    const allSurveys = [
      ...districtSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'district' })),
      ...areaSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'area' })),
      ...unitSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'unit' }))
    ];
    
    // Sort combined surveys by submission date
    allSurveys.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    // Apply pagination
    const totalSurveys = allSurveys.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedSurveys = allSurveys.slice(startIndex, endIndex);
    
    // Enrich surveys with hierarchy information and proper names
    const enrichedSurveys = await Promise.all(
      paginatedSurveys.map(async (survey) => {
        const enriched = { ...survey };
        
        // Resolve submittedBy to proper names
        if (survey.submissionLevel === 'district') {
          enriched.submittedByName = survey.district || 'District Admin';
        } else if (survey.submissionLevel === 'area') {
          
          
          
          // Use the area field directly since it contains the area name
          enriched.submittedByName = survey.area || survey.submittedBy;
          enriched.areaName = survey.area || 'Unknown Area';
          
          
        } else if (survey.submissionLevel === 'unit') {
         
          
          // Use the component and area fields directly
          enriched.submittedByName = survey.component || survey.submittedBy;
          enriched.unitName = survey.component || 'Unknown Unit';
          enriched.areaName = survey.area || 'Unknown Area';
      
        }
        
        return enriched;
      })
    );
    
    // Calculate statistics for each level
    const surveyStats = {
      district: districtSurveys.length,
      area: areaSurveys.length,
      unit: unitSurveys.length,
      total: totalSurveys
    };
    
    res.json({
      success: true,
      surveys: enrichedSurveys,
      totalSurveys,
      totalPages: Math.ceil(totalSurveys / limit),
      currentPage: parseInt(page),
      stats: surveyStats
    });
    
  } catch (error) {
    console.error('Error fetching all surveys:', error);
    res.status(500).json({ success: false, message: 'Failed to load all surveys' });
  }
});



// ===== STATISTICS DASHBOARD ROUTES =====


// Alias: Get district admin statistics at /api/user/stats
router.get('/stats', userAuth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const previousYear = currentYear - 1;

    // Import survey models
    const DistrictSurvey = require('../models/districtSurvey');
    const AreaSurvey = require('../models/areaSurvey');
    const UnitSurvey = require('../models/unitSurvey');

    // Get yearly survey for the district admin (use case-insensitive match)
    const yearlySurvey = await Form.findOne({ 
      district: req.user.district  // Yearly surveys don't have month field
    }).sort({ submittedAt: -1 });
    // Get current year monthly surveys by level
    const districtMonthlySurveys = await DistrictSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    }).sort({ submittedAt: -1 });

    const areaMonthlySurveys = await AreaSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    }).sort({ submittedAt: -1 });

    const unitMonthlySurveys = await UnitSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    }).sort({ submittedAt: -1 });

    // Combine all monthly surveys
    const allMonthlySurveys = [
      ...districtMonthlySurveys.map(s => ({ ...s.toObject(), submissionLevel: 'district' })),
      ...areaMonthlySurveys.map(s => ({ ...s.toObject(), submissionLevel: 'area' })),
      ...unitMonthlySurveys.map(s => ({ ...s.toObject(), submissionLevel: 'unit' }))
    ];

    // Get current month data
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const currentMonthSurveys = allMonthlySurveys.filter(s => s.month === currentMonthName);
    const currentMonthDistrict = currentMonthSurveys.filter(s => s.submissionLevel === 'district');
    const currentMonthArea = currentMonthSurveys.filter(s => s.submissionLevel === 'area');
    const currentMonthUnit = currentMonthSurveys.filter(s => s.submissionLevel === 'unit');

    // Get last year's monthly surveys for comparison
    const lastYearDistrictSurveys = await DistrictSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(previousYear, 0, 1),
        $lte: new Date(previousYear, 11, 31)
      }
    }).sort({ submittedAt: -1 });

    const lastYearAreaSurveys = await AreaSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(previousYear, 0, 1),
        $lte: new Date(previousYear, 11, 31)
      }
    }).sort({ submittedAt: -1 });

    const lastYearUnitSurveys = await UnitSurvey.find({ 
      district: { $regex: new RegExp(`^${req.user.district}$`, 'i') },
      submittedAt: { 
        $gte: new Date(previousYear, 0, 1),
        $lte: new Date(previousYear, 11, 31)
      }
    }).sort({ submittedAt: -1 });

    const lastYearAllSurveys = [
      ...lastYearDistrictSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'district' })),
      ...lastYearAreaSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'area' })),
      ...lastYearUnitSurveys.map(s => ({ ...s.toObject(), submissionLevel: 'unit' }))
    ];

    const stats = {
      yearly: yearlySurvey ? {
        district: yearlySurvey.district,
      
        submittedAt: yearlySurvey.submittedAt,
        year: yearlySurvey.submittedAt ? new Date(yearlySurvey.submittedAt).getFullYear() : currentYear
      } : null,
      monthly: {
        count: allMonthlySurveys.length,
        districtCount: districtMonthlySurveys.length,
        areaCount: areaMonthlySurveys.length,
        unitCount: unitMonthlySurveys.length,
        surveys: allMonthlySurveys.map(survey => ({
          month: survey.month,
          district: survey.district,
          submissionLevel: survey.submissionLevel,
          submittedAt: survey.submittedAt
        }))
      },
      currentMonth: {
        month: currentMonthName,
        year: currentYear,
        totalSurveys: currentMonthSurveys.length,
        districtSurveys: currentMonthDistrict.length,
        areaSurveys: currentMonthArea.length,
        unitSurveys: currentMonthUnit.length
      },
      lastYear: {
        year: previousYear,
        totalSurveys: lastYearAllSurveys.length,
        districtSurveys: lastYearDistrictSurveys.length,
        areaSurveys: lastYearAreaSurveys.length,
        unitSurveys: lastYearUnitSurveys.length
      },
      comparison: null,
      summary: {
        currentYearTotal: allMonthlySurveys.length,
        currentMonthTotal: currentMonthSurveys.length,
        lastYearTotal: lastYearAllSurveys.length
      }
    };

    // Generate natural language summary via OpenAI (optional)
    let summary = null;
    try {
      if (openaiClient) {
        const prompt = buildDistrictSummaryPrompt(req.user.district, stats);
        const completion = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_API_KEY || 'gpt-4o-mini',
          temperature: 0.5,
          messages: [
            { role: 'system', content: 'You are an assistant that writes clear, detailed, plain-language summaries of district statistics for non-technical readers. Write 5-7 sentences. Include: (1) brief snapshot, (2) how this year compares to last year for workers, units, and institutions, (3) highlight best and slowest months this year, (4) describe whether the trend is up/down/stable, (5) one concrete next step. Avoid jargon and long lists of raw numbers; prefer qualitative comparisons (higher/lower/similar).' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 420
        });
        summary = completion.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) {
      console.error('OpenAI summary (district alias) error:', e.message);
    }
    if (!summary) {
      summary = buildDistrictFallbackSummary(req.user.district, stats);
    }

    res.json({
      message: 'District admin statistics retrieved successfully',
      district: req.user.district,
      stats,
      summary
    });
  } catch (error) {
    console.error('Get district stats error:', error);
    res.status(500).json({ message: 'Server error while retrieving district statistics' });
  }
});

// ===== SCOPED DASHBOARD OVERVIEW =====
// GET /api/user/dashboard/overview
// Returns location counts and report submission stats scoped to the logged-in district or area user
router.get('/dashboard/overview', userAuth, async (req, res) => {
  try {
    const Report = require('../models/report');
    const ReportSubmission = require('../models/reportSubmission');
    const mongoose = require('mongoose');

    const user = req.user;
    const role = user.role; // 'district' | 'area'

    if (role === 'district') {
      const districtMasterId = user.districtId || user.districtMasterId || user.id;
      const districtObjId = mongoose.Types.ObjectId.isValid(districtMasterId)
        ? new mongoose.Types.ObjectId(districtMasterId) : null;

      // Count areas and units in this district
      const [areaCount, unitCount] = await Promise.all([
        AreaMaster.countDocuments({ districtId: districtObjId, isActive: true }),
        UnitMaster.countDocuments({ districtId: districtObjId, isActive: true })
      ]);

      // Active reports for district level
      const activeReports = await Report.find({ reportFor: 'district', isActive: true })
        .select('_id').lean();
      const activeReportIds = activeReports.map(r => r._id);

      // Submissions from this district user across those reports
      const totalReports = activeReportIds.length;
      let submitted = 0;
      let pending = 0;
      if (districtObjId && totalReports > 0) {
        const subs = await ReportSubmission.find({
          reportId: { $in: activeReportIds },
          userId: districtObjId
        }).select('status').lean();
        submitted = subs.filter(s => s.status === 'submitted').length;
        pending = subs.filter(s => s.status !== 'submitted').length;
      }

      return res.json({
        success: true,
        role: 'district',
        data: {
          areas: areaCount,
          units: unitCount,
          activeReports: totalReports,
          submitted,
          pending,
          notStarted: totalReports - submitted - pending
        }
      });
    }

    if (role === 'area') {
      const areaMasterId = user.areaId || user.areaMasterId || user.id;
      const districtMasterId = user.districtId || user.districtMasterId;
      const areaObjId = mongoose.Types.ObjectId.isValid(areaMasterId)
        ? new mongoose.Types.ObjectId(areaMasterId) : null;
      const districtObjId = mongoose.Types.ObjectId.isValid(districtMasterId)
        ? new mongoose.Types.ObjectId(districtMasterId) : null;

      // Count units in this area
      const unitFilter = { isActive: true };
      if (areaObjId) unitFilter.areaId = areaObjId;
      else if (districtObjId) unitFilter.districtId = districtObjId;
      const unitCount = await UnitMaster.countDocuments(unitFilter);

      // Active reports for area level
      const activeReports = await Report.find({ reportFor: 'area', isActive: true })
        .select('_id').lean();
      const activeReportIds = activeReports.map(r => r._id);
      const totalReports = activeReportIds.length;

      let submitted = 0;
      let pending = 0;
      if (areaObjId && totalReports > 0) {
        const subs = await ReportSubmission.find({
          reportId: { $in: activeReportIds },
          userId: areaObjId
        }).select('status').lean();
        submitted = subs.filter(s => s.status === 'submitted').length;
        pending = subs.filter(s => s.status !== 'submitted').length;
      }

      return res.json({
        success: true,
        role: 'area',
        data: {
          units: unitCount,
          activeReports: totalReports,
          submitted,
          pending,
          notStarted: totalReports - submitted - pending
        }
      });
    }

    if (role === 'unit') {
      const unitMasterId = user.unitId || user.unitMasterId || user.id;
      const unitObjId = mongoose.Types.ObjectId.isValid(unitMasterId)
        ? new mongoose.Types.ObjectId(unitMasterId) : null;

      // Active reports for unit level
      const activeReports = await Report.find({ reportFor: 'unit', isActive: true })
        .select('_id').lean();
      const activeReportIds = activeReports.map(r => r._id);
      const totalReports = activeReportIds.length;

      let submitted = 0;
      let pending = 0;
      if (unitObjId && totalReports > 0) {
        const subs = await ReportSubmission.find({
          reportId: { $in: activeReportIds },
          userId: unitObjId
        }).select('status').lean();
        submitted = subs.filter(s => s.status === 'submitted').length;
        pending = subs.filter(s => s.status !== 'submitted').length;
      }

      return res.json({
        success: true,
        role: 'unit',
        data: {
          activeReports: totalReports,
          submitted,
          pending,
          notStarted: totalReports - submitted - pending
        }
      });
    }

    return res.json({ success: true, role, data: {} });
  } catch (error) {
    console.error('User dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;



// ===== Helper: Prompt builder =====
function buildDistrictSummaryPrompt(district, stats) {
  const monthlyCount = stats.monthly?.count || 0;
  const districtCount = stats.monthly?.districtCount || 0;
  const areaCount = stats.monthly?.areaCount || 0;
  const unitCount = stats.monthly?.unitCount || 0;
  const currentMonthTotal = stats.currentMonth?.totalSurveys || 0;
  const lastYearTotal = stats.lastYear?.totalSurveys || 0;

  return [
    `District: ${district}.`,
    `Total monthly surveys this year: ${monthlyCount} (${districtCount} district, ${areaCount} area, ${unitCount} unit surveys).`,
    `Current month surveys: ${currentMonthTotal}.`,
    `Last year total surveys: ${lastYearTotal}.`,
    'Write 3-5 simple sentences covering: (1) overall submission activity, (2) current month progress, (3) comparison with last year, (4) submission trend direction, and (5) one recommendation. Use plain language.'
  ].join(' ');
}

function buildDistrictFallbackSummary(district, stats) {
  const monthlyCount = stats.monthly?.count || 0;
  const districtCount = stats.monthly?.districtCount || 0;
  const areaCount = stats.monthly?.areaCount || 0;
  const unitCount = stats.monthly?.unitCount || 0;
  const currentMonthTotal = stats.currentMonth?.totalSurveys || 0;
  const lastYearTotal = stats.lastYear?.totalSurveys || 0;
  
  const trend = currentMonthTotal > 0 ? 'active' : 'needs attention';
  const yearComparison = monthlyCount > lastYearTotal ? 'higher than' : monthlyCount < lastYearTotal ? 'lower than' : 'similar to';
  
  return `In ${district}, ${monthlyCount} monthly surveys submitted this year (${districtCount} district, ${areaCount} area, ${unitCount} unit). Current month shows ${currentMonthTotal} submissions. This year's activity is ${yearComparison} last year (${lastYearTotal} surveys). Overall submission activity appears ${trend}. Continue encouraging timely monthly submissions from all levels to maintain good reporting momentum.`;
}

