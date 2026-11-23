const express = require('express');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');

/**
 * Master-data lists for "masterdata" form dropdowns (JIH portal and franchises).
 * Mount: <tenant apiPrefix>/form-master-data
 *
 * Read from the tenant's own Location Master collections. Names only, with the
 * parent names a cascading dropdown filters on; the same names are already
 * public through /user/hierarchy/*-db, so this route is public too (forms are
 * filled by district, area and unit logins that carry different tokens).
 */
const router = express.Router();

const ACTIVE = { isActive: { $ne: false } };

const idToName = (docs) => new Map(docs.map((d) => [String(d._id), d.name]));

const LOADERS = {
  district: async () => {
    const districts = await District.find(ACTIVE).select('name').sort({ name: 1 }).lean();
    return districts.map((d) => ({ name: d.name }));
  },
  area: async () => {
    const [areas, districts] = await Promise.all([
      AreaMaster.find(ACTIVE).select('name districtId').sort({ name: 1 }).lean(),
      District.find({}).select('name').lean()
    ]);
    const districtName = idToName(districts);
    return areas.map((a) => ({ name: a.name, district: districtName.get(String(a.districtId)) || '' }));
  },
  unit: async () => {
    const [units, areas, districts] = await Promise.all([
      UnitMaster.find(ACTIVE).select('name areaId districtId').sort({ name: 1 }).lean(),
      AreaMaster.find({}).select('name').lean(),
      District.find({}).select('name').lean()
    ]);
    const areaName = idToName(areas);
    const districtName = idToName(districts);
    return units.map((u) => ({
      name: u.name,
      district: districtName.get(String(u.districtId)) || '',
      area: areaName.get(String(u.areaId)) || ''
    }));
  }
};

// GET /form-master-data/:source  (source = district | area | unit)
router.get('/:source', async (req, res) => {
  const load = LOADERS[req.params.source];
  if (!load) {
    return res.status(400).json({ success: false, message: `Unknown master data list "${req.params.source}"` });
  }
  try {
    res.json({ success: true, data: await load() });
  } catch (error) {
    console.error('Error loading form master data:', error);
    res.status(500).json({ success: false, message: 'Failed to load master data' });
  }
});

module.exports = router;
