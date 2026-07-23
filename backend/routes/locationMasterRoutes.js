const express = require('express');
const mongoose = require('mongoose');
const adminAuth = require('../middlewares/adminAuth');
const State = require('../models/state');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');
const {
  generateDistrictCode,
  generateAreaCode,
  generateUnitCode,
  generateDistrictPassword,
  generateAreaPassword,
  generateUnitPassword
} = require('../utils/codeGenerator');
const { cascadeDistrictToUsers, cascadeAreaToUsers, cascadeUnitToUsers } = require('../utils/locationCascade');

const router = express.Router();

// Escapes regex special characters so user search input is treated literally.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── STATE ROUTES ─────────────────────────────────────────────────────────────

// GET /api/master/states?page=&limit= - List states (paginated when page provided)
router.get('/states', adminAuth, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    if (req.query.page !== undefined) {
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip  = (page - 1) * limit;
      const [total, states] = await Promise.all([
        State.countDocuments(filter),
        State.find(filter).sort({ name: 1 }).skip(skip).limit(limit)
      ]);
      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, data: states,
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      });
    }
    const states = await State.find(filter).sort({ name: 1 });
    res.json({ success: true, data: states });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/states - Create state
router.post('/states', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'State name is required' });
    }
    const state = new State({ name: name.trim() });
    await state.save();
    res.status(201).json({ success: true, data: state });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'State with this name already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/master/states/:id - Update state name
router.put('/states/:id', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'State name is required' });
    }
    const state = await State.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/master/states/:id - Soft delete state
router.delete('/states/:id', adminAuth, async (req, res) => {
  try {
    const state = await State.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    res.json({ success: true, message: 'State deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DISTRICT ROUTES ───────────────────────────────────────────────────────────

// GET /api/master/districts?stateId=&page=&limit= - List districts (paginated when page provided)
router.get('/districts', adminAuth, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.stateId) filter.stateId = req.query.stateId;
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    if (req.query.page !== undefined) {
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip  = (page - 1) * limit;
      const [total, districts] = await Promise.all([
        District.countDocuments(filter),
        District.find(filter).populate('stateId', 'name').sort({ name: 1 }).skip(skip).limit(limit)
      ]);
      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, data: districts,
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      });
    }
    const districts = await District.find(filter)
      .populate('stateId', 'name')
      .sort({ name: 1 });
    res.json({ success: true, data: districts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/districts - Create district (auto-generates uniqueCode + password)
router.post('/districts', adminAuth, async (req, res) => {
  try {
    const { name, stateId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'District name is required' });
    }
    if (!stateId) {
      return res.status(400).json({ success: false, message: 'State is required' });
    }

    const state = await State.findById(stateId);
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });

    const { uniqueCode, sequentialNumber, seqCode } = await generateDistrictCode(name.trim(), District, [AreaMaster, UnitMaster]);
    const password = generateDistrictPassword();

    const district = new District({
      name: name.trim(),
      stateId,
      uniqueCode,
      password,
      sequentialNumber
    });
    await district.save();

    // Return password in plain text — this is the only time it is shown
    res.status(201).json({
      success: true,
      data: {
        ...district.toObject(),
        plainPassword: password
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/master/districts/:id - Update district name only (code stays)
router.put('/districts/:id', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'District name is required' });
    }
    const district = await District.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).populate('stateId', 'name');
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, data: district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/districts/:id/reset-password - Reset district password
router.post('/districts/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const newPassword = generateDistrictPassword();
    const district = await District.findByIdAndUpdate(
      req.params.id,
      { password: newPassword },
      { new: true }
    );
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, newPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/master/districts/:id - Soft delete district
router.delete('/districts/:id', adminAuth, async (req, res) => {
  try {
    const district = await District.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, message: 'District deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AREA ROUTES ───────────────────────────────────────────────────────────────

// GET /api/master/areas?districtId=&page=&limit= - List areas (paginated when page provided)
router.get('/areas', adminAuth, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.districtId) filter.districtId = req.query.districtId;
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    if (req.query.page !== undefined) {
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip  = (page - 1) * limit;
      const [total, areas] = await Promise.all([
        AreaMaster.countDocuments(filter),
        AreaMaster.find(filter)
          .populate('districtId', 'name uniqueCode sequentialNumber')
          .sort({ name: 1 }).skip(skip).limit(limit)
      ]);
      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, data: areas,
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      });
    }
    const areas = await AreaMaster.find(filter)
      .populate('districtId', 'name uniqueCode sequentialNumber')
      .sort({ name: 1 });
    res.json({ success: true, data: areas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/areas - Create area
router.post('/areas', adminAuth, async (req, res) => {
  try {
    const { name, districtId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }
    if (!districtId) {
      return res.status(400).json({ success: false, message: 'District is required' });
    }

    const district = await District.findById(districtId);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });

    const districtSeqCode = String(district.sequentialNumber).padStart(2, '0');
    const { uniqueCode, randomCode } = await generateAreaCode(name.trim(), districtSeqCode, AreaMaster, [District, UnitMaster]);
    const password = generateAreaPassword();

    const area = new AreaMaster({
      name: name.trim(),
      districtId,
      uniqueCode,
      password,
      randomCode
    });
    await area.save();

    res.status(201).json({
      success: true,
      data: {
        ...area.toObject(),
        plainPassword: password
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/master/areas/:id - Update area name only
router.put('/areas/:id', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }
    const area = await AreaMaster.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).populate('districtId', 'name uniqueCode');
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    res.json({ success: true, data: area });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/areas/:id/reset-password - Reset area password
router.post('/areas/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const newPassword = generateAreaPassword();
    const area = await AreaMaster.findByIdAndUpdate(
      req.params.id,
      { password: newPassword },
      { new: true }
    );
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    res.json({ success: true, newPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/master/areas/:id - Soft delete area
router.delete('/areas/:id', adminAuth, async (req, res) => {
  try {
    const area = await AreaMaster.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    res.json({ success: true, message: 'Area deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UNIT ROUTES ───────────────────────────────────────────────────────────────

// GET /api/master/units?areaId=&districtId=&page=&limit= - List units (paginated when page provided)
router.get('/units', adminAuth, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.areaId) filter.areaId = req.query.areaId;
    if (req.query.districtId) filter.districtId = req.query.districtId;
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    if (req.query.page !== undefined) {
      const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip  = (page - 1) * limit;
      const [total, units] = await Promise.all([
        UnitMaster.countDocuments(filter),
        UnitMaster.find(filter)
          .populate('districtId', 'name uniqueCode sequentialNumber')
          .populate('areaId', 'name uniqueCode randomCode')
          .sort({ name: 1 }).skip(skip).limit(limit)
      ]);
      const totalPages = Math.ceil(total / limit);
      return res.json({
        success: true, data: units,
        pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      });
    }
    const units = await UnitMaster.find(filter)
      .populate('districtId', 'name uniqueCode sequentialNumber')
      .populate('areaId', 'name uniqueCode randomCode')
      .sort({ name: 1 });
    res.json({ success: true, data: units });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/units - Create unit
router.post('/units', adminAuth, async (req, res) => {
  try {
    const { name, areaId, districtId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Unit name is required' });
    }
    if (!areaId) {
      return res.status(400).json({ success: false, message: 'Area is required' });
    }
    if (!districtId) {
      return res.status(400).json({ success: false, message: 'District is required' });
    }

    const district = await District.findById(districtId);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });

    const area = await AreaMaster.findById(areaId);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    const districtSeqCode = String(district.sequentialNumber).padStart(2, '0');
    const { uniqueCode } = await generateUnitCode(name.trim(), districtSeqCode, area.randomCode, UnitMaster, [District, AreaMaster]);
    const password = generateUnitPassword();

    const unit = new UnitMaster({
      name: name.trim(),
      areaId,
      districtId,
      uniqueCode,
      password
    });
    await unit.save();

    res.status(201).json({
      success: true,
      data: {
        ...unit.toObject(),
        plainPassword: password
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/master/units/:id - Update unit name only
router.put('/units/:id', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Unit name is required' });
    }
    const unit = await UnitMaster.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    )
      .populate('districtId', 'name uniqueCode')
      .populate('areaId', 'name uniqueCode');
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/units/:id/reset-password - Reset unit password
router.post('/units/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const newPassword = generateUnitPassword();
    const unit = await UnitMaster.findByIdAndUpdate(
      req.params.id,
      { password: newPassword },
      { new: true }
    );
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, newPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/master/units/:id - Soft delete unit
router.delete('/units/:id', adminAuth, async (req, res) => {
  try {
    const unit = await UnitMaster.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, message: 'Unit deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TRANSFORMATION ROUTES (Split / Merge / Transfer) ─────────────────────────
// Utility: best-effort transaction wrapper
async function withTransaction(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (_) { /* ignore */ }
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

// ── SPLIT ────────────────────────────────────────────────────────────────────

// POST /api/master/districts/:id/split
// Body: { sideAName, sideBName, areaIds[] }
// Renames original to sideAName; creates new district sideBName; moves selected areas (+ their units) to the new side.
router.post('/districts/:id/split', adminAuth, async (req, res) => {
  try {
    const { sideAName, sideBName, areaIds = [] } = req.body;
    if (!sideAName || !sideBName) {
      return res.status(400).json({ success: false, message: 'sideAName and sideBName are required' });
    }

    const originalDistrict = await District.findById(req.params.id);
    if (!originalDistrict) return res.status(404).json({ success: false, message: 'District not found' });

    // Generate new district code/password for side B
    const { uniqueCode, sequentialNumber, seqCode } = await generateDistrictCode(sideBName, District, [AreaMaster, UnitMaster]);
    const password = generateDistrictPassword();

    let newDistrict;
    await withTransaction(async (session) => {
      // Rename original → side A
      originalDistrict.name = sideAName.trim();
      await originalDistrict.save({ session });

      // Create side B
      newDistrict = new District({
        name: sideBName.trim(),
        stateId: originalDistrict.stateId,
        uniqueCode,
        sequentialNumber,
        password,
        isActive: true
      });
      await newDistrict.save({ session });

      if (areaIds.length > 0) {
        // Move selected areas to new district
        await AreaMaster.updateMany(
          { _id: { $in: areaIds }, isActive: true },
          { $set: { districtId: newDistrict._id } },
          { session }
        );
        // Move their child units
        await UnitMaster.updateMany(
          { districtId: originalDistrict._id, areaId: { $in: areaIds }, isActive: true },
          { $set: { districtId: newDistrict._id } },
          { session }
        );
      }
    });

    // Cascade to login users (best-effort, outside transaction)
    if (areaIds.length > 0) {
      for (const areaId of areaIds) {
        await cascadeAreaToUsers(areaId, {
          newDistrictId: newDistrict._id.toString(),
          newDistrictName: newDistrict.name
        });
      }
    }

    res.json({
      success: true,
      message: `District split into "${sideAName}" and "${sideBName}"`,
      data: {
        sideA: { _id: originalDistrict._id, name: originalDistrict.name },
        sideB: { _id: newDistrict._id, name: newDistrict.name, uniqueCode, plainPassword: password }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/areas/:id/split
// Body: { sideAName, sideBName, unitIds[] }
router.post('/areas/:id/split', adminAuth, async (req, res) => {
  try {
    const { sideAName, sideBName, unitIds = [] } = req.body;
    if (!sideAName || !sideBName) {
      return res.status(400).json({ success: false, message: 'sideAName and sideBName are required' });
    }

    const originalArea = await AreaMaster.findById(req.params.id);
    if (!originalArea) return res.status(404).json({ success: false, message: 'Area not found' });

    const district = await District.findById(originalArea.districtId);
    if (!district) return res.status(404).json({ success: false, message: 'Parent district not found' });

    const districtSeqCode = String(district.sequentialNumber).padStart(2, '0');
    const { uniqueCode, randomCode } = await generateAreaCode(sideBName, districtSeqCode, AreaMaster, [District, UnitMaster]);
    const password = generateAreaPassword();

    let newArea;
    await withTransaction(async (session) => {
      originalArea.name = sideAName.trim();
      await originalArea.save({ session });

      newArea = new AreaMaster({
        name: sideBName.trim(),
        districtId: originalArea.districtId,
        uniqueCode,
        randomCode,
        password,
        isActive: true
      });
      await newArea.save({ session });

      if (unitIds.length > 0) {
        await UnitMaster.updateMany(
          { _id: { $in: unitIds }, isActive: true },
          { $set: { areaId: newArea._id } },
          { session }
        );
      }
    });

    // Cascade to login users
    if (unitIds.length > 0) {
      for (const unitId of unitIds) {
        await cascadeUnitToUsers(unitId, {
          newAreaId: newArea._id.toString(),
          newAreaName: newArea.name
        });
      }
    }

    res.json({
      success: true,
      message: `Area split into "${sideAName}" and "${sideBName}"`,
      data: {
        sideA: { _id: originalArea._id, name: originalArea.name },
        sideB: { _id: newArea._id, name: newArea.name, uniqueCode, plainPassword: password }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/units/:id/split
// Body: { sideAName, sideBName }
router.post('/units/:id/split', adminAuth, async (req, res) => {
  try {
    const { sideAName, sideBName } = req.body;
    if (!sideAName || !sideBName) {
      return res.status(400).json({ success: false, message: 'sideAName and sideBName are required' });
    }

    const originalUnit = await UnitMaster.findById(req.params.id);
    if (!originalUnit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const area = await AreaMaster.findById(originalUnit.areaId);
    if (!area) return res.status(404).json({ success: false, message: 'Parent area not found' });
    const district = await District.findById(originalUnit.districtId);
    if (!district) return res.status(404).json({ success: false, message: 'Parent district not found' });

    const districtSeqCode = String(district.sequentialNumber).padStart(2, '0');
    const { uniqueCode } = await generateUnitCode(sideBName, districtSeqCode, area.randomCode, UnitMaster, [District, AreaMaster]);
    const password = generateUnitPassword();

    let newUnit;
    await withTransaction(async (session) => {
      originalUnit.name = sideAName.trim();
      await originalUnit.save({ session });

      newUnit = new UnitMaster({
        name: sideBName.trim(),
        areaId: originalUnit.areaId,
        districtId: originalUnit.districtId,
        uniqueCode,
        password,
        isActive: true
      });
      await newUnit.save({ session });
    });

    res.json({
      success: true,
      message: `Unit split into "${sideAName}" and "${sideBName}"`,
      data: {
        sideA: { _id: originalUnit._id, name: originalUnit.name },
        sideB: { _id: newUnit._id, name: newUnit.name, uniqueCode, plainPassword: password }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── MERGE ────────────────────────────────────────────────────────────────────

// POST /api/master/districts/merge
// Body: { survivorId, absorbedId }
router.post('/districts/merge', adminAuth, async (req, res) => {
  try {
    const { survivorId, absorbedId } = req.body;
    if (!survivorId || !absorbedId) {
      return res.status(400).json({ success: false, message: 'survivorId and absorbedId are required' });
    }
    if (survivorId === absorbedId) {
      return res.status(400).json({ success: false, message: 'Survivor and absorbed must be different' });
    }

    const [survivor, absorbed] = await Promise.all([
      District.findById(survivorId),
      District.findById(absorbedId)
    ]);
    if (!survivor) return res.status(404).json({ success: false, message: 'Survivor district not found' });
    if (!absorbed) return res.status(404).json({ success: false, message: 'Absorbed district not found' });

    // Find all areas of absorbed district before transaction for cascade
    const absorbedAreas = await AreaMaster.find({ districtId: absorbedId, isActive: true }).select('_id').lean();
    const absorbedAreaIds = absorbedAreas.map(a => a._id);

    await withTransaction(async (session) => {
      // Re-point all areas to survivor
      await AreaMaster.updateMany(
        { districtId: absorbedId },
        { $set: { districtId: survivor._id } },
        { session }
      );
      // Re-point all units to survivor
      await UnitMaster.updateMany(
        { districtId: absorbedId },
        { $set: { districtId: survivor._id } },
        { session }
      );
      // Soft-delete absorbed
      await District.findByIdAndUpdate(absorbedId, { isActive: false }, { session });
    });

    // Cascade login users for each moved area
    for (const areaId of absorbedAreaIds) {
      await cascadeAreaToUsers(areaId, {
        newDistrictId: survivor._id.toString(),
        newDistrictName: survivor.name
      });
    }
    // Also directly update district-type login users from absorbed
    await cascadeDistrictToUsers(absorbedId, {
      newId: survivor._id.toString(),
      newName: survivor.name
    });

    res.json({
      success: true,
      message: `District "${absorbed.name}" merged into "${survivor.name}"`,
      data: { survivor: { _id: survivor._id, name: survivor.name }, absorbedId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/areas/merge
// Body: { survivorId, absorbedId }
router.post('/areas/merge', adminAuth, async (req, res) => {
  try {
    const { survivorId, absorbedId } = req.body;
    if (!survivorId || !absorbedId) {
      return res.status(400).json({ success: false, message: 'survivorId and absorbedId are required' });
    }
    if (survivorId === absorbedId) {
      return res.status(400).json({ success: false, message: 'Survivor and absorbed must be different' });
    }

    const [survivor, absorbed] = await Promise.all([
      AreaMaster.findById(survivorId),
      AreaMaster.findById(absorbedId)
    ]);
    if (!survivor) return res.status(404).json({ success: false, message: 'Survivor area not found' });
    if (!absorbed) return res.status(404).json({ success: false, message: 'Absorbed area not found' });

    const absorbedUnits = await UnitMaster.find({ areaId: absorbedId, isActive: true }).select('_id').lean();
    const absorbedUnitIds = absorbedUnits.map(u => u._id);

    await withTransaction(async (session) => {
      await UnitMaster.updateMany(
        { areaId: absorbedId },
        { $set: { areaId: survivor._id, districtId: survivor.districtId } },
        { session }
      );
      await AreaMaster.findByIdAndUpdate(absorbedId, { isActive: false }, { session });
    });

    for (const unitId of absorbedUnitIds) {
      await cascadeUnitToUsers(unitId, {
        newAreaId: survivor._id.toString(),
        newAreaName: survivor.name
      });
    }
    // Update area-type login users from absorbed area
    await cascadeAreaToUsers(absorbedId, {
      newId: survivor._id.toString(),
      newName: survivor.name
    });

    res.json({
      success: true,
      message: `Area "${absorbed.name}" merged into "${survivor.name}"`,
      data: { survivor: { _id: survivor._id, name: survivor.name }, absorbedId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/units/merge
// Body: { survivorId, absorbedId }
router.post('/units/merge', adminAuth, async (req, res) => {
  try {
    const { survivorId, absorbedId } = req.body;
    if (!survivorId || !absorbedId) {
      return res.status(400).json({ success: false, message: 'survivorId and absorbedId are required' });
    }
    if (survivorId === absorbedId) {
      return res.status(400).json({ success: false, message: 'Survivor and absorbed must be different' });
    }

    const [survivor, absorbed] = await Promise.all([
      UnitMaster.findById(survivorId),
      UnitMaster.findById(absorbedId)
    ]);
    if (!survivor) return res.status(404).json({ success: false, message: 'Survivor unit not found' });
    if (!absorbed) return res.status(404).json({ success: false, message: 'Absorbed unit not found' });

    await withTransaction(async (session) => {
      await UnitMaster.findByIdAndUpdate(absorbedId, { isActive: false }, { session });
    });

    await cascadeUnitToUsers(absorbedId, {
      newId: survivor._id.toString(),
      newName: survivor.name,
      newAreaId: survivor.areaId.toString(),
      newDistrictId: survivor.districtId.toString()
    });

    res.json({
      success: true,
      message: `Unit "${absorbed.name}" merged into "${survivor.name}"`,
      data: { survivor: { _id: survivor._id, name: survivor.name }, absorbedId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TRANSFER ─────────────────────────────────────────────────────────────────

// POST /api/master/areas/:id/transfer
// Body: { newDistrictId }
router.post('/areas/:id/transfer', adminAuth, async (req, res) => {
  try {
    const { newDistrictId } = req.body;
    if (!newDistrictId) {
      return res.status(400).json({ success: false, message: 'newDistrictId is required' });
    }

    const area = await AreaMaster.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    if (area.districtId.toString() === newDistrictId) {
      return res.status(400).json({ success: false, message: 'Area is already in this district' });
    }

    const newDistrict = await District.findById(newDistrictId);
    if (!newDistrict) return res.status(404).json({ success: false, message: 'Target district not found' });

    const oldDistrictId = area.districtId.toString();

    await withTransaction(async (session) => {
      area.districtId = newDistrictId;
      await area.save({ session });
      // Move child units too
      await UnitMaster.updateMany(
        { areaId: area._id },
        { $set: { districtId: newDistrictId } },
        { session }
      );
    });

    // Cascade login users in this area
    await cascadeAreaToUsers(area._id, {
      newDistrictId: newDistrict._id.toString(),
      newDistrictName: newDistrict.name
    });

    res.json({
      success: true,
      message: `Area "${area.name}" transferred to district "${newDistrict.name}"`,
      data: { area: { _id: area._id, name: area.name }, newDistrict: { _id: newDistrict._id, name: newDistrict.name } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/master/units/:id/transfer
// Body: { newAreaId }
router.post('/units/:id/transfer', adminAuth, async (req, res) => {
  try {
    const { newAreaId } = req.body;
    if (!newAreaId) {
      return res.status(400).json({ success: false, message: 'newAreaId is required' });
    }

    const unit = await UnitMaster.findById(req.params.id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    if (unit.areaId.toString() === newAreaId) {
      return res.status(400).json({ success: false, message: 'Unit is already in this area' });
    }

    const newArea = await AreaMaster.findById(newAreaId);
    if (!newArea) return res.status(404).json({ success: false, message: 'Target area not found' });
    const newDistrict = await District.findById(newArea.districtId);

    await withTransaction(async (session) => {
      unit.areaId = newAreaId;
      unit.districtId = newArea.districtId;
      await unit.save({ session });
    });

    await cascadeUnitToUsers(unit._id, {
      newAreaId: newArea._id.toString(),
      newAreaName: newArea.name,
      newDistrictId: newArea.districtId.toString(),
      newDistrictName: newDistrict ? newDistrict.name : undefined
    });

    res.json({
      success: true,
      message: `Unit "${unit.name}" transferred to area "${newArea.name}"`,
      data: {
        unit: { _id: unit._id, name: unit.name },
        newArea: { _id: newArea._id, name: newArea.name }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
