const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const LocationMaster = require('../../models/ihthisabi/LocationMaster');

// Fallback district data
const fallbackDistricts = [
  { id: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
  { id: 'kollam', name: 'Kollam' },
  { id: 'pathanamthitta', name: 'Pathanamthitta' },
  { id: 'alappuzha', name: 'Alappuzha' },
  { id: 'kottayam', name: 'Kottayam' },
  { id: 'idukki', name: 'Idukki' },
  { id: 'ernakulam', name: 'Ernakulam' },
  { id: 'thrissur', name: 'Thrissur' },
  { id: 'palakkad', name: 'Palakkad' },
  { id: 'malappuram', name: 'Malappuram' },
  { id: 'kozhikode', name: 'Kozhikode' },
  { id: 'wayanad', name: 'Wayanad' },
  { id: 'kannur', name: 'Kannur' },
  { id: 'kasaragod', name: 'Kasaragod' }
];

// Helper function to fetch district data from external API
const fetchDistrictData = async () => {
  try {
    const apiEndpoint = process.env.DISTRICT_API_ENDPOINT;
    
    // Check if API endpoint is configured and not a placeholder
    if (!apiEndpoint || apiEndpoint.includes('your-api.com')) {
      console.log('Using fallback district data - API endpoint not configured');
      return fallbackDistricts;
    }
    
    const response = await axios.get(apiEndpoint, { timeout: 5000 });
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from districts API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching district data, using fallback:', error.message);
    return fallbackDistricts;
  }
};

// Fallback area data by district
const fallbackAreas = {
  'thiruvananthapuram': [
    { id: 'kazhakoottam', name: 'Kazhakoottam' },
    { id: 'nedumangad', name: 'Nedumangad' },
    { id: 'neyyattinkara', name: 'Neyyattinkara' }
  ],
  'malappuram': [
    { id: 'perinthalmanna', name: 'Perinthalmanna' },
    { id: 'tirur', name: 'Tirur' },
    { id: 'ponnani', name: 'Ponnani' }
  ],
  'kozhikode': [
    { id: 'kozhikode_city', name: 'Kozhikode City' },
    { id: 'koyilandy', name: 'Koyilandy' },
    { id: 'vatakara', name: 'Vatakara' }
  ]
};

// Helper function to fetch area data from external API
const fetchAreaData = async (districtId) => {
  try {
    const apiEndpoint = process.env.AREA_API_ENDPOINT;
    
    // Check if API endpoint is configured and not a placeholder
    if (!apiEndpoint || apiEndpoint.includes('your-api.com')) {
      console.log(`Using fallback area data for district: ${districtId}`);
      return fallbackAreas[districtId] || [];
    }
    
    // Replace {districtId} placeholder in API endpoint if it exists
    const finalEndpoint = apiEndpoint.includes('{districtId}') 
      ? apiEndpoint.replace('{districtId}', encodeURIComponent(districtId))
      : `${apiEndpoint}/${encodeURIComponent(districtId)}`;
    
    const response = await axios.get(finalEndpoint, { timeout: 5000 });
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from areas API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching area data for ${districtId}, using fallback:`, error.message);
    return fallbackAreas[districtId] || [];
  }
};

// Fallback unit data by area
const fallbackUnits = {
  'kazhakoottam': [
    { id: 'unit1', name: 'Unit 1' },
    { id: 'unit2', name: 'Unit 2' },
    { id: 'unit3', name: 'Unit 3' }
  ],
  'perinthalmanna': [
    { id: 'unit1', name: 'Unit 1' },
    { id: 'unit2', name: 'Unit 2' }
  ],
  'kozhikode_city': [
    { id: 'unit1', name: 'Unit 1' },
    { id: 'unit2', name: 'Unit 2' },
    { id: 'unit3', name: 'Unit 3' },
    { id: 'unit4', name: 'Unit 4' }
  ]
};

// Helper function to fetch unit data from external API
const fetchUnitData = async (areaId) => {
  try {
    const apiEndpoint = process.env.UNIT_API_ENDPOINT;
    
    // Check if API endpoint is configured and not a placeholder
    if (!apiEndpoint || apiEndpoint.includes('your-api.com')) {
      console.log(`Using fallback unit data for area: ${areaId}`);
      return fallbackUnits[areaId] || [];
    }
    
    // Replace {areaId} placeholder in API endpoint if it exists
    const finalEndpoint = apiEndpoint.includes('{areaId}') 
      ? apiEndpoint.replace('{areaId}', encodeURIComponent(areaId))
      : `${apiEndpoint}/${encodeURIComponent(areaId)}`;
    
    const response = await axios.get(finalEndpoint, { timeout: 5000 });
    
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from units API');
    }
    
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching unit data for ${areaId}, using fallback:`, error.message);
    return fallbackUnits[areaId] || [];
  }
};

// @desc    Get all districts
// @route   GET /api/location/districts
// @access  Public
router.get('/districts', async (req, res) => {
  try {
    const [userNames, masterRows] = await Promise.all([
      User.distinct('district', { role: 'rukn', district: { $nin: [null, ''] } }),
      LocationMaster.find({ type: 'district', isActive: true }).select('name').lean()
    ]);

    const nameSet = new Set(userNames);
    masterRows.forEach(r => nameSet.add(r.name));
    const names = Array.from(nameSet).sort();

    if (names.length === 0) {
      const fallback = await fetchDistrictData();
      return res.json({ success: true, message: 'Districts fetched successfully', data: fallback });
    }

    res.json({
      success: true,
      message: 'Districts fetched successfully',
      data: names.map(name => ({ id: name, name }))
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch districts', error: error.message });
  }
});

// @desc    Get areas by district
// @route   GET /api/location/areas/:districtId
// @access  Public
// districtId is the district name string (used as id in this system)
router.get('/areas/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    if (!districtId) {
      return res.status(400).json({ success: false, message: 'District ID is required' });
    }

    const [userNames, masterRows] = await Promise.all([
      User.distinct('area', { role: 'rukn', district: districtId, area: { $nin: [null, ''] } }),
      LocationMaster.find({ type: 'area', district: districtId, isActive: true }).select('name').lean()
    ]);

    const nameSet = new Set(userNames);
    masterRows.forEach(r => nameSet.add(r.name));
    const names = Array.from(nameSet).sort();

    if (names.length === 0) {
      const fallback = await fetchAreaData(districtId);
      return res.json({ success: true, message: 'Areas fetched successfully', data: fallback });
    }

    res.json({
      success: true,
      message: 'Areas fetched successfully',
      data: names.map(name => ({ id: name, name }))
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch areas', error: error.message });
  }
});

// @desc    Get units by area
// @route   GET /api/location/units/:areaId
// @access  Public
// areaId is the area name string (used as id in this system)
router.get('/units/:areaId', async (req, res) => {
  try {
    const { areaId } = req.params;
    if (!areaId) {
      return res.status(400).json({ success: false, message: 'Area ID is required' });
    }

    const [userNames, masterRows] = await Promise.all([
      User.distinct('unit', { role: 'rukn', area: areaId, unit: { $nin: [null, ''] } }),
      LocationMaster.find({ type: 'unit', area: areaId, isActive: true }).select('name').lean()
    ]);

    const nameSet = new Set(userNames);
    masterRows.forEach(r => nameSet.add(r.name));
    const names = Array.from(nameSet).sort();

    if (names.length === 0) {
      const fallback = await fetchUnitData(areaId);
      return res.json({ success: true, message: 'Units fetched successfully', data: fallback });
    }

    res.json({
      success: true,
      message: 'Units fetched successfully',
      data: names.map(name => ({ id: name, name }))
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch units', error: error.message });
  }
});

// @desc    Get unit options for login by role
// @route   GET /api/location/login/units?role=member|unitAdmin
// @access  Public
router.get('/login/units', async (req, res) => {
  try {
    const role = (req.query.role || 'member').toLowerCase()
    let units = []
    console.log(role)
    if (role === 'unitadmin') {
      units = await UnitAdmin.distinct('unit', { unit: { $nin: [null, ''] } })
    } else {
      units = await User.distinct('unit', { role: 'rukn', unit: { $nin: [null, ''] } })
    }

    res.json({
      success: true,
      message: 'Units fetched successfully',
      data: units.sort()
    })
  } catch (error) {
    console.error('Error fetching login units:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch units', error: error.message })
  }
})

// @desc    Get complete location hierarchy
// @route   GET /api/location/hierarchy
// @access  Public
router.get('/hierarchy', async (req, res) => {
  try {
    const [districts] = await Promise.all([
      fetchDistrictData()
    ]);
    
    res.json({
      success: true,
      message: 'Location hierarchy fetched successfully',
      data: {
        districts
      }
    });
  } catch (error) {
    console.error('Error fetching location hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location hierarchy',
      error: error.message
    });
  }
});

module.exports = router;
