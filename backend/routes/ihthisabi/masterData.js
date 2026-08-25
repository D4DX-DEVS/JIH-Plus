/**
 * Ihthisabi Master Data Routes
 * Mount: /api/ihthisabi/admin/master-data
 *
 * Locations are DERIVED from User strings and from the LocationMaster collection.
 * Transforms are bulk string updates on User + UnitAdmin documents.
 * New locations can be added via POST; they persist in LocationMaster and appear
 * in both this Master Data page (count=0) and in member-creation dropdowns.
 */

const express = require('express');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');
const User = require('../../models/ihthisabi/User');
const UnitAdmin = require('../../models/ihthisabi/UnitAdmin');
const LocationMaster = require('../../models/ihthisabi/LocationMaster');
const Mekhala = require('../../models/ihthisabi/Mekhala');
const MekhalaNazim = require('../../models/ihthisabi/MekhalaNazim');

const router = express.Router();

// All routes require authenticated admin
router.use(protect, authorize('admin'));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Bulk-update district/area/unit strings on both User and UnitAdmin collections.
 * Uses a precise path-scoped filter to avoid cross-contaminating similarly named locations.
 */
async function bulkUpdateLocation(filter, update) {
  await Promise.all([
    User.updateMany(filter, update),
    UnitAdmin.updateMany(filter, update)
  ]);
}

/**
 * Count User (rukn members) + UnitAdmin records scoped to a location path.
 * Used to block deletion while members/unit-admins still reference the location.
 */
async function countAtLocation(filter) {
  const [userCount, uaCount] = await Promise.all([
    User.countDocuments({ ...filter, role: 'rukn' }),
    UnitAdmin.countDocuments(filter)
  ]);
  return userCount + uaCount;
}

// ── READ (aggregated from User documents) ────────────────────────────────────

// GET /api/ihthisabi/admin/master-data/districts?page=&limit=
// Returns distinct districts (User-derived + LocationMaster added) with member count.
// When `page` is absent, returns the full list (used internally by dropdown consumers).
router.get('/districts', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const [userRows, masterRows] = await Promise.all([
      User.aggregate([
        { $match: { role: 'rukn', district: { $nin: [null, ''] } } },
        { $group: { _id: '$district', count: { $sum: 1 } } }
      ]),
      LocationMaster.find({ type: 'district', isActive: true }).select('name').lean()
    ]);

    const map = new Map();
    userRows.forEach((r) => map.set(r._id, { name: r._id, count: r.count }));
    masterRows.forEach((r) => {
      if (!map.has(r.name)) map.set(r.name, { name: r.name, count: 0 });
    });

    let allRows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (search) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      allRows = allRows.filter((r) => re.test(r.name));
    }

    if (!page) {
      return res.json({ success: true, data: allRows });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const total = allRows.length;
    const data = allRows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ihthisabi/admin/master-data/areas?district=&page=&limit=
router.get('/areas', async (req, res) => {
  try {
    const { district, page, limit, search } = req.query;
    const userMatch = { role: 'rukn', area: { $nin: [null, ''] } };
    if (district) userMatch.district = district;
    const masterFilter = { type: 'area', isActive: true };
    if (district) masterFilter.district = district;

    const [userRows, masterRows] = await Promise.all([
      User.aggregate([
        { $match: userMatch },
        { $group: { _id: { district: '$district', area: '$area' }, count: { $sum: 1 } } }
      ]),
      LocationMaster.find(masterFilter).select('name district').lean()
    ]);

    const map = new Map();
    userRows.forEach((r) => {
      const key = `${r._id.district}||${r._id.area}`;
      map.set(key, { district: r._id.district, name: r._id.area, count: r.count });
    });
    masterRows.forEach((r) => {
      const key = `${r.district}||${r.name}`;
      if (!map.has(key)) map.set(key, { district: r.district, name: r.name, count: 0 });
    });

    let allRows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (search) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      allRows = allRows.filter((r) => re.test(r.name));
    }

    // When page param is absent return all (used internally by modals)
    if (!page) {
      return res.json({ success: true, data: allRows });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const total = allRows.length;
    const data = allRows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ihthisabi/admin/master-data/units?district=&area=&page=&limit=
router.get('/units', async (req, res) => {
  try {
    const { district, area, page, limit, search } = req.query;
    const userMatch = { role: 'rukn', unit: { $nin: [null, ''] } };
    if (district) userMatch.district = district;
    if (area) userMatch.area = area;
    const masterFilter = { type: 'unit', isActive: true };
    if (district) masterFilter.district = district;
    if (area) masterFilter.area = area;

    const [userRows, masterRows] = await Promise.all([
      User.aggregate([
        { $match: userMatch },
        { $group: { _id: { district: '$district', area: '$area', unit: '$unit' }, count: { $sum: 1 } } }
      ]),
      LocationMaster.find(masterFilter).select('name district area').lean()
    ]);

    const map = new Map();
    userRows.forEach((r) => {
      const key = `${r._id.district}||${r._id.area}||${r._id.unit}`;
      map.set(key, { district: r._id.district, area: r._id.area, name: r._id.unit, count: r.count });
    });
    masterRows.forEach((r) => {
      const key = `${r.district}||${r.area}||${r.name}`;
      if (!map.has(key)) map.set(key, { district: r.district, area: r.area, name: r.name, count: 0 });
    });

    let allRows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (search) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      allRows = allRows.filter((r) => re.test(r.name));
    }

    // When page param is absent return all (used internally by modals)
    if (!page) {
      return res.json({ success: true, data: allRows });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const total = allRows.length;
    const data = allRows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/districts
// Body: { name }
router.post('/districts', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    await LocationMaster.create({ type: 'district', name, district: '', area: '' });
    res.json({ success: true, message: `District "${name}" added`, data: { name } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `District "${(req.body.name || '').trim()}" already exists` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/areas
// Body: { name, district }
router.post('/areas', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const district = (req.body.district || '').trim();
    if (!name || !district) {
      return res.status(400).json({ success: false, message: 'name and district are required' });
    }
    await LocationMaster.create({ type: 'area', name, district, area: '' });
    res.json({ success: true, message: `Area "${name}" added to "${district}"`, data: { name, district } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `Area "${(req.body.name || '').trim()}" already exists in this district` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units
// Body: { name, district, area }
router.post('/units', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const district = (req.body.district || '').trim();
    const area = (req.body.area || '').trim();
    if (!name || !district || !area) {
      return res.status(400).json({ success: false, message: 'name, district and area are required' });
    }
    await LocationMaster.create({ type: 'unit', name, district, area });
    res.json({ success: true, message: `Unit "${name}" added to "${district} / ${area}"`, data: { name, district, area } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `Unit "${(req.body.name || '').trim()}" already exists in this area` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── RENAME (edit) ────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/districts/rename
// Body: { oldName, newName }
router.post('/districts/rename', async (req, res) => {
  try {
    const oldName = (req.body.oldName || '').trim();
    const newName = (req.body.newName || '').trim();
    if (!oldName || !newName) {
      return res.status(400).json({ success: false, message: 'oldName and newName are required' });
    }
    if (oldName === newName) {
      return res.status(400).json({ success: false, message: 'New name must be different' });
    }

    const [userExists, masterExists] = await Promise.all([
      User.exists({ role: 'rukn', district: newName }),
      LocationMaster.exists({ type: 'district', name: newName })
    ]);
    if (userExists || masterExists) {
      return res.status(409).json({ success: false, message: `District "${newName}" already exists. Use merge instead.` });
    }

    await bulkUpdateLocation({ district: oldName }, { $set: { district: newName } });
    await Promise.all([
      LocationMaster.updateMany({ type: 'district', name: oldName }, { $set: { name: newName } }),
      LocationMaster.updateMany({ type: 'area', district: oldName }, { $set: { district: newName } }),
      LocationMaster.updateMany({ type: 'unit', district: oldName }, { $set: { district: newName } })
    ]);

    res.json({ success: true, message: `District "${oldName}" renamed to "${newName}"`, data: { oldName, newName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/areas/rename
// Body: { district, oldName, newName }
router.post('/areas/rename', async (req, res) => {
  try {
    const district = (req.body.district || '').trim();
    const oldName = (req.body.oldName || '').trim();
    const newName = (req.body.newName || '').trim();
    if (!district || !oldName || !newName) {
      return res.status(400).json({ success: false, message: 'district, oldName and newName are required' });
    }
    if (oldName === newName) {
      return res.status(400).json({ success: false, message: 'New name must be different' });
    }

    const [userExists, masterExists] = await Promise.all([
      User.exists({ role: 'rukn', district, area: newName }),
      LocationMaster.exists({ type: 'area', district, name: newName })
    ]);
    if (userExists || masterExists) {
      return res.status(409).json({ success: false, message: `Area "${newName}" already exists in "${district}". Use merge instead.` });
    }

    await bulkUpdateLocation({ district, area: oldName }, { $set: { area: newName } });
    await Promise.all([
      LocationMaster.updateMany({ type: 'area', district, name: oldName }, { $set: { name: newName } }),
      LocationMaster.updateMany({ type: 'unit', district, area: oldName }, { $set: { area: newName } })
    ]);

    res.json({ success: true, message: `Area "${oldName}" renamed to "${newName}"`, data: { district, oldName, newName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units/rename
// Body: { district, area, oldName, newName }
router.post('/units/rename', async (req, res) => {
  try {
    const district = (req.body.district || '').trim();
    const area = (req.body.area || '').trim();
    const oldName = (req.body.oldName || '').trim();
    const newName = (req.body.newName || '').trim();
    if (!district || !area || !oldName || !newName) {
      return res.status(400).json({ success: false, message: 'district, area, oldName and newName are required' });
    }
    if (oldName === newName) {
      return res.status(400).json({ success: false, message: 'New name must be different' });
    }

    const [userExists, masterExists] = await Promise.all([
      User.exists({ role: 'rukn', district, area, unit: newName }),
      LocationMaster.exists({ type: 'unit', district, area, name: newName })
    ]);
    if (userExists || masterExists) {
      return res.status(409).json({ success: false, message: `Unit "${newName}" already exists in "${district} / ${area}". Use merge instead.` });
    }

    await bulkUpdateLocation({ district, area, unit: oldName }, { $set: { unit: newName } });
    await LocationMaster.updateMany({ type: 'unit', district, area, name: oldName }, { $set: { name: newName } });

    res.json({ success: true, message: `Unit "${oldName}" renamed to "${newName}"`, data: { district, area, oldName, newName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/districts/delete
// Body: { name }
router.post('/districts/delete', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const memberCount = await countAtLocation({ district: name });
    if (memberCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${name}": ${memberCount} member(s)/unit-admin(s) still assigned to it`
      });
    }

    await LocationMaster.deleteMany({
      $or: [
        { type: 'district', name },
        { type: 'area', district: name },
        { type: 'unit', district: name }
      ]
    });

    res.json({ success: true, message: `District "${name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/areas/delete
// Body: { district, name }
router.post('/areas/delete', async (req, res) => {
  try {
    const district = (req.body.district || '').trim();
    const name = (req.body.name || '').trim();
    if (!district || !name) {
      return res.status(400).json({ success: false, message: 'district and name are required' });
    }

    const memberCount = await countAtLocation({ district, area: name });
    if (memberCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${name}": ${memberCount} member(s)/unit-admin(s) still assigned to it`
      });
    }

    await LocationMaster.deleteMany({
      $or: [
        { type: 'area', district, name },
        { type: 'unit', district, area: name }
      ]
    });

    res.json({ success: true, message: `Area "${name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units/delete
// Body: { district, area, name }
router.post('/units/delete', async (req, res) => {
  try {
    const district = (req.body.district || '').trim();
    const area = (req.body.area || '').trim();
    const name = (req.body.name || '').trim();
    if (!district || !area || !name) {
      return res.status(400).json({ success: false, message: 'district, area and name are required' });
    }

    const memberCount = await countAtLocation({ district, area, unit: name });
    if (memberCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${name}": ${memberCount} member(s)/unit-admin(s) still assigned to it`
      });
    }

    await LocationMaster.deleteMany({ type: 'unit', district, area, name });

    res.json({ success: true, message: `Unit "${name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SPLIT ────────────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/districts/split
// Body: { district, sideAName, sideBName, areas[] }
// areas = area names to move under sideBName; remaining areas keep sideAName
router.post('/districts/split', async (req, res) => {
  try {
    const { district, sideAName, sideBName, areas = [] } = req.body;
    if (!district || !sideAName || !sideBName) {
      return res.status(400).json({ success: false, message: 'district, sideAName and sideBName are required' });
    }

    // Rename original district to sideAName for all users NOT in the moved areas
    await bulkUpdateLocation(
      { district, ...(areas.length > 0 ? { area: { $nin: areas } } : {}) },
      { $set: { district: sideAName.trim() } }
    );

    // Move selected areas to sideBName
    if (areas.length > 0) {
      await bulkUpdateLocation(
        { district, area: { $in: areas } },
        { $set: { district: sideBName.trim() } }
      );
    }

    res.json({
      success: true,
      message: `District "${district}" split into "${sideAName}" and "${sideBName}"`,
      data: { sideA: sideAName.trim(), sideB: sideBName.trim(), movedAreas: areas }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/areas/split
// Body: { district, area, sideAName, sideBName, units[] }
router.post('/areas/split', async (req, res) => {
  try {
    const { district, area, sideAName, sideBName, units = [] } = req.body;
    if (!district || !area || !sideAName || !sideBName) {
      return res.status(400).json({ success: false, message: 'district, area, sideAName and sideBName are required' });
    }

    // Rename area to sideAName for users NOT in moved units
    await bulkUpdateLocation(
      { district, area, ...(units.length > 0 ? { unit: { $nin: units } } : {}) },
      { $set: { area: sideAName.trim() } }
    );

    // Move selected units to sideBName area
    if (units.length > 0) {
      await bulkUpdateLocation(
        { district, area, unit: { $in: units } },
        { $set: { area: sideBName.trim() } }
      );
    }

    res.json({
      success: true,
      message: `Area "${area}" split into "${sideAName}" and "${sideBName}"`,
      data: { sideA: sideAName.trim(), sideB: sideBName.trim(), movedUnits: units }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units/split
// Body: { district, area, unit, sideAName, sideBName }
// Simply renames unit -> sideAName; sideBName is informational (no members to assign)
router.post('/units/split', async (req, res) => {
  try {
    const { district, area, unit, sideAName, sideBName } = req.body;
    if (!district || !area || !unit || !sideAName || !sideBName) {
      return res.status(400).json({
        success: false, message: 'district, area, unit, sideAName and sideBName are required'
      });
    }

    // Rename current unit to sideAName (all members stay)
    await bulkUpdateLocation(
      { district, area, unit },
      { $set: { unit: sideAName.trim() } }
    );

    res.json({
      success: true,
      message: `Unit "${unit}" renamed to "${sideAName}"; "${sideBName}" is the new empty side B`,
      data: { sideA: sideAName.trim(), sideB: sideBName.trim() }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── MERGE ────────────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/districts/merge
// Body: { survivor, absorbed }  (district names)
router.post('/districts/merge', async (req, res) => {
  try {
    const { survivor, absorbed } = req.body;
    if (!survivor || !absorbed) {
      return res.status(400).json({ success: false, message: 'survivor and absorbed are required' });
    }
    if (survivor === absorbed) {
      return res.status(400).json({ success: false, message: 'survivor and absorbed must be different' });
    }

    await bulkUpdateLocation({ district: absorbed }, { $set: { district: survivor } });

    res.json({
      success: true,
      message: `District "${absorbed}" merged into "${survivor}"`,
      data: { survivor, absorbed }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/areas/merge
// Body: { survivorDistrict, survivorArea, absorbedDistrict, absorbedArea }
router.post('/areas/merge', async (req, res) => {
  try {
    const { survivorDistrict, survivorArea, absorbedDistrict, absorbedArea } = req.body;
    if (!survivorDistrict || !survivorArea || !absorbedDistrict || !absorbedArea) {
      return res.status(400).json({ success: false, message: 'All four area path fields are required' });
    }
    if (survivorDistrict === absorbedDistrict && survivorArea === absorbedArea) {
      return res.status(400).json({ success: false, message: 'Survivor and absorbed must be different' });
    }

    await bulkUpdateLocation(
      { district: absorbedDistrict, area: absorbedArea },
      { $set: { district: survivorDistrict, area: survivorArea } }
    );

    res.json({
      success: true,
      message: `Area "${absorbedArea}" merged into "${survivorArea}"`,
      data: { survivor: { district: survivorDistrict, area: survivorArea }, absorbed: { district: absorbedDistrict, area: absorbedArea } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units/merge
// Body: { survivorDistrict, survivorArea, survivorUnit, absorbedDistrict, absorbedArea, absorbedUnit }
router.post('/units/merge', async (req, res) => {
  try {
    const { survivorDistrict, survivorArea, survivorUnit, absorbedDistrict, absorbedArea, absorbedUnit } = req.body;
    const allPresent = survivorDistrict && survivorArea && survivorUnit && absorbedDistrict && absorbedArea && absorbedUnit;
    if (!allPresent) {
      return res.status(400).json({ success: false, message: 'All six unit path fields are required' });
    }

    await bulkUpdateLocation(
      { district: absorbedDistrict, area: absorbedArea, unit: absorbedUnit },
      { $set: { district: survivorDistrict, area: survivorArea, unit: survivorUnit } }
    );

    res.json({
      success: true,
      message: `Unit "${absorbedUnit}" merged into "${survivorUnit}"`,
      data: {
        survivor: { district: survivorDistrict, area: survivorArea, unit: survivorUnit },
        absorbed: { district: absorbedDistrict, area: absorbedArea, unit: absorbedUnit }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TRANSFER ─────────────────────────────────────────────────────────────────

// POST /api/ihthisabi/admin/master-data/areas/transfer
// Body: { district, area, newDistrict }
router.post('/areas/transfer', async (req, res) => {
  try {
    const { district, area, newDistrict } = req.body;
    if (!district || !area || !newDistrict) {
      return res.status(400).json({ success: false, message: 'district, area and newDistrict are required' });
    }
    if (district === newDistrict) {
      return res.status(400).json({ success: false, message: 'Area is already in this district' });
    }

    await bulkUpdateLocation(
      { district, area },
      { $set: { district: newDistrict } }
    );

    res.json({
      success: true,
      message: `Area "${area}" transferred from "${district}" to "${newDistrict}"`,
      data: { area, fromDistrict: district, toDistrict: newDistrict }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ihthisabi/admin/master-data/units/transfer
// Body: { district, area, unit, newDistrict, newArea }
router.post('/units/transfer', async (req, res) => {
  try {
    const { district, area, unit, newDistrict, newArea } = req.body;
    if (!district || !area || !unit || !newDistrict || !newArea) {
      return res.status(400).json({ success: false, message: 'All path fields are required' });
    }
    if (district === newDistrict && area === newArea) {
      return res.status(400).json({ success: false, message: 'Unit is already in this area' });
    }

    await bulkUpdateLocation(
      { district, area, unit },
      { $set: { district: newDistrict, area: newArea } }
    );

    res.json({
      success: true,
      message: `Unit "${unit}" transferred to "${newDistrict} / ${newArea}"`,
      data: { unit, from: { district, area }, to: { district: newDistrict, area: newArea } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── MEKHALA ──────────────────────────────────────────────────────────────────
// A Mekhala groups districts and sits above District, below State. A district
// belongs to at most one Mekhala — enforced here, since Mongo cannot express
// "unique across the elements of an array field on other documents".

/**
 * Districts already claimed by a mekhala other than `excludeId`.
 * Used both to validate writes and to build the picker's option list.
 */
async function claimedDistricts(excludeId) {
  const filter = excludeId ? { _id: { $ne: excludeId } } : {};
  const others = await Mekhala.find(filter).select('name districts').lean();
  const map = new Map();
  others.forEach((m) => (m.districts || []).forEach((d) => map.set(d, m.name)));
  return map;
}

// GET /mekhalas?page=&limit=&search=
router.get('/mekhalas', async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const [mekhalas, nazims] = await Promise.all([
      Mekhala.find({}).sort({ name: 1 }).lean(),
      MekhalaNazim.find({}).select('mekhala name ruknId isActive').lean()
    ]);

    const nazimByMekhala = new Map(nazims.map((n) => [String(n.mekhala), n]));

    let allRows = mekhalas.map((m) => {
      const nazim = nazimByMekhala.get(String(m._id));
      return {
        _id: m._id,
        name: m.name,
        districts: m.districts || [],
        districtCount: (m.districts || []).length,
        isActive: m.isActive,
        nazim: nazim ? { _id: nazim._id, name: nazim.name, ruknId: nazim.ruknId, isActive: nazim.isActive } : null
      };
    });

    if (search) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      allRows = allRows.filter((r) => re.test(r.name) || r.districts.some((d) => re.test(d)));
    }

    if (!page) {
      return res.json({ success: true, data: allRows });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const total = allRows.length;
    const data = allRows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /mekhalas/available-districts?excludeId=
// Every district in master data, flagged with the mekhala that already owns it.
router.get('/mekhalas/available-districts', async (req, res) => {
  try {
    const { excludeId } = req.query;

    const [userRows, masterRows, allMekhalas, claimed] = await Promise.all([
      User.distinct('district', { role: 'rukn', district: { $nin: [null, ''] } }),
      LocationMaster.find({ type: 'district', isActive: true }).select('name').lean(),
      Mekhala.find({}).select('districts').lean(),
      claimedDistricts(excludeId)
    ]);

    const names = new Set(userRows.filter(Boolean));
    masterRows.forEach((r) => names.add(r.name));
    // Keep districts already inside a mekhala visible even if no member currently
    // references them — otherwise editing a mekhala would silently drop them.
    allMekhalas.forEach((m) => (m.districts || []).forEach((d) => names.add(d)));

    const data = Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, takenBy: claimed.get(name) || null }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /mekhalas  Body: { name, districts: [] }
router.post('/mekhalas', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const districts = [...new Set((req.body.districts || []).map((d) => String(d).trim()).filter(Boolean))];

    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (districts.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one district' });
    }

    const claimed = await claimedDistricts(null);
    const conflicts = districts.filter((d) => claimed.has(d));
    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: `Already assigned to another mekhala: ${conflicts.map((d) => `${d} (${claimed.get(d)})`).join(', ')}`
      });
    }

    const mekhala = await Mekhala.create({ name, districts });
    res.status(201).json({ success: true, data: mekhala });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A mekhala with this name already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /mekhalas/:id  Body: { name?, districts?, isActive? }
router.put('/mekhalas/:id', async (req, res) => {
  try {
    const mekhala = await Mekhala.findById(req.params.id);
    if (!mekhala) return res.status(404).json({ success: false, message: 'Mekhala not found' });

    if (req.body.districts !== undefined) {
      const districts = [...new Set((req.body.districts || []).map((d) => String(d).trim()).filter(Boolean))];
      if (districts.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one district' });
      }

      const claimed = await claimedDistricts(mekhala._id);
      const conflicts = districts.filter((d) => claimed.has(d));
      if (conflicts.length) {
        return res.status(409).json({
          success: false,
          message: `Already assigned to another mekhala: ${conflicts.map((d) => `${d} (${claimed.get(d)})`).join(', ')}`
        });
      }
      mekhala.districts = districts;
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ success: false, message: 'name is required' });
      mekhala.name = name;
    }
    if (typeof req.body.isActive === 'boolean') mekhala.isActive = req.body.isActive;

    await mekhala.save();
    res.json({ success: true, data: mekhala });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A mekhala with this name already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /mekhalas/:id
router.delete('/mekhalas/:id', async (req, res) => {
  try {
    const nazim = await MekhalaNazim.findOne({ mekhala: req.params.id }).select('name').lean();
    if (nazim) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — "${nazim.name}" is assigned as nazim. Remove the nazim first.`
      });
    }

    const deleted = await Mekhala.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Mekhala not found' });

    res.json({ success: true, message: `Mekhala "${deleted.name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
