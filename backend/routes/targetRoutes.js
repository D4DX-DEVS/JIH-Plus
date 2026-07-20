const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Target = require('../models/target');
const TargetAllocation = require('../models/targetAllocation');
const District = require('../models/district');
const AreaMaster = require('../models/area');
const UnitMaster = require('../models/unit');
const unifiedAuth = require('../middlewares/unifiedAuth');
const adminAuth = require('../middlewares/adminAuth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Distribute `total` count across `n` recipients using integer floor + remainder-to-first.
 * e.g. distribute(5000, 3) → [1667, 1667, 1666]
 */
function distributeEqually(total, n) {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base));
}

// ─── CREATE target ────────────────────────────────────────────────────────────
// POST /api/targets
// Access: State admin only (adminAuth)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, description, targetCount, districtId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    if (!targetCount || Number(targetCount) < 1) {
      return res.status(400).json({ success: false, message: 'targetCount must be >= 1' });
    }
    if (!districtId || !mongoose.isValidObjectId(districtId)) {
      return res.status(400).json({ success: false, message: 'valid districtId is required' });
    }

    const district = await District.findById(districtId).lean();
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }

    const target = await Target.create({
      title: title.trim(),
      description: description || '',
      targetCount: Number(targetCount),
      districtId,
      createdBy: req.admin.email || ''
    });

    // Auto-create the district-level allocation row
    await TargetAllocation.create({
      targetId: target._id,
      level: 'district',
      districtId,
      areaId: null,
      unitId: null,
      parentId: null,
      allocatedCount: Number(targetCount)
    });

    res.status(201).json({ success: true, message: 'Target created', data: target });
  } catch (err) {
    console.error('[TargetRoutes] create error:', err);
    res.status(500).json({ success: false, message: 'Error creating target', error: err.message });
  }
});

// ─── BULK CREATE targets (one per district in one shot) ──────────────────────
// POST /api/targets/bulk
// Body: { title, description, districts: [{ districtId, targetCount }] }
// Access: State admin only (adminAuth)
router.post('/bulk', adminAuth, async (req, res) => {
  try {
    const { title, description, districts } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    if (!Array.isArray(districts) || districts.length === 0) {
      return res.status(400).json({ success: false, message: 'districts array is required' });
    }

    const valid = districts.filter(d =>
      d.districtId && mongoose.isValidObjectId(d.districtId) &&
      Number(d.targetCount) >= 1
    );
    if (valid.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one district must have a count >= 1' });
    }

    const createdBy = req.admin.email || '';
    const results = [];

    for (const row of valid) {
      const districtId = row.districtId;
      const targetCount = Number(row.targetCount);

      const target = await Target.create({
        title: title.trim(),
        description: description || '',
        targetCount,
        districtId,
        createdBy
      });

      await TargetAllocation.create({
        targetId: target._id,
        level: 'district',
        districtId,
        areaId: null,
        unitId: null,
        parentId: null,
        allocatedCount: targetCount
      });

      results.push(target);
    }

    res.status(201).json({
      success: true,
      message: `${results.length} target(s) created`,
      data: results
    });
  } catch (err) {
    console.error('[TargetRoutes] bulk create error:', err);
    res.status(500).json({ success: false, message: 'Error creating targets', error: err.message });
  }
});

// ─── LOCATION HELPERS (used by target allocation UI) ─────────────────────────
// GET /api/targets/locations/areas/:districtId — list real areas for a district
router.get('/locations/areas/:districtId', unifiedAuth, async (req, res) => {
  try {
    const areas = await AreaMaster.find({ districtId: req.params.districtId, isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: areas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/targets/locations/units/:areaId — list real units for an area
router.get('/locations/units/:areaId', unifiedAuth, async (req, res) => {
  try {
    const units = await UnitMaster.find({ areaId: req.params.areaId, isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: units });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── LIST targets ─────────────────────────────────────────────────────────────
// GET /api/targets
// Access: all roles; scoped by JWT
router.get('/', unifiedAuth, async (req, res) => {
  try {
    const { role, districtId, areaId, unitId } = req.user;

    let query = {};
    if (role === 'admin') {
      // State admin sees all
    } else if (role === 'district') {
      query.districtId = districtId;
    } else if (role === 'area') {
      query.districtId = districtId;
    } else if (role === 'unit') {
      query.districtId = districtId;
    } else {
      return res.status(403).json({ success: false, message: 'Insufficient role' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    if (status && ['active', 'closed'].includes(status)) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, targets] = await Promise.all([
      Target.countDocuments(query),
      Target.find(query)
        .populate('districtId', 'name uniqueCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: targets
    });
  } catch (err) {
    console.error('[TargetRoutes] list error:', err);
    res.status(500).json({ success: false, message: 'Error fetching targets', error: err.message });
  }
});

// ─── GET target detail with allocation tree + rollup ─────────────────────────
// GET /api/targets/:id
// Access: all roles; scoped by JWT
router.get('/:id', unifiedAuth, async (req, res) => {
  try {
    const { role, districtId: userDistrictId, areaId: userAreaId } = req.user;

    const target = await Target.findById(req.params.id)
      .populate('districtId', 'name uniqueCode')
      .lean();
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }

    // Scope check
    if (role !== 'admin' && target.districtId._id.toString() !== userDistrictId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allocations = await TargetAllocation.find({ targetId: target._id }).lean();

    // Populate location names
    const areaIds = allocations.filter(a => a.areaId).map(a => a.areaId);
    const unitIds = allocations.filter(a => a.unitId).map(a => a.unitId);

    const [areaNames, unitNames] = await Promise.all([
      AreaMaster.find({ _id: { $in: areaIds } }).select('_id name').lean(),
      UnitMaster.find({ _id: { $in: unitIds } }).select('_id name').lean()
    ]);

    const areaNameMap = {};
    areaNames.forEach(a => { areaNameMap[a._id.toString()] = a.name; });
    const unitNameMap = {};
    unitNames.forEach(u => { unitNameMap[u._id.toString()] = u.name; });

    const enriched = allocations.map(a => ({
      ...a,
      areaName: a.areaId ? areaNameMap[a.areaId.toString()] || '' : '',
      unitName: a.unitId ? unitNameMap[a.unitId.toString()] || '' : ''
    }));

    // Rollup: sum unit submittedCounts
    const unitAllocations = enriched.filter(a => a.level === 'unit');
    const totalSubmitted = unitAllocations.reduce((sum, u) => sum + (u.submittedCount ?? 0), 0);
    const totalAllocatedToUnits = unitAllocations.reduce((sum, u) => sum + u.allocatedCount, 0);

    res.json({
      success: true,
      data: {
        target,
        allocations: enriched,
        rollup: {
          targetCount: target.targetCount,
          totalAllocatedToUnits,
          totalSubmitted,
          difference: totalSubmitted - target.targetCount,
          status: totalSubmitted > target.targetCount
            ? 'exceeded'
            : totalSubmitted === target.targetCount
              ? 'exact'
              : 'below'
        }
      }
    });
  } catch (err) {
    console.error('[TargetRoutes] get detail error:', err);
    res.status(500).json({ success: false, message: 'Error fetching target', error: err.message });
  }
});

// ─── District allocates to Areas ──────────────────────────────────────────────
// POST /api/targets/:id/allocate-areas
// Body: { mode: 'equal' | 'custom', customAllocations: [{ areaId, allocatedCount }] }
// Access: district role
router.post('/:id/allocate-areas', unifiedAuth, async (req, res) => {
  try {
    const { role, districtId } = req.user;
    if (role !== 'district') {
      return res.status(403).json({ success: false, message: 'Only district admins can allocate to areas' });
    }

    const target = await Target.findById(req.params.id).lean();
    if (!target) return res.status(404).json({ success: false, message: 'Target not found' });
    if (target.districtId.toString() !== districtId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const districtAlloc = await TargetAllocation.findOne({
      targetId: target._id, level: 'district', districtId
    }).lean();
    if (!districtAlloc) {
      return res.status(400).json({ success: false, message: 'District allocation not found' });
    }

    const { mode = 'equal', customAllocations = [] } = req.body;

    let areaAllocations; // [{ areaId, allocatedCount }]

    if (mode === 'equal') {
      const areas = await AreaMaster.find({ districtId, isActive: true }).select('_id').lean();
      if (areas.length === 0) {
        return res.status(400).json({ success: false, message: 'No active areas found in this district' });
      }
      const counts = distributeEqually(districtAlloc.allocatedCount, areas.length);
      areaAllocations = areas.map((a, i) => ({ areaId: a._id, allocatedCount: counts[i] }));
    } else {
      // custom mode
      if (!Array.isArray(customAllocations) || customAllocations.length === 0) {
        return res.status(400).json({ success: false, message: 'customAllocations array required for custom mode' });
      }
      areaAllocations = customAllocations.map(ca => ({
        areaId: ca.areaId,
        allocatedCount: Number(ca.allocatedCount) || 0
      }));
      const totalCustom = areaAllocations.reduce((s, a) => s + a.allocatedCount, 0);
      if (totalCustom > districtAlloc.allocatedCount) {
        return res.status(400).json({
          success: false,
          message: `Sum of custom allocations (${totalCustom}) exceeds district allocation (${districtAlloc.allocatedCount})`
        });
      }
    }

    // Upsert area allocation rows
    const ops = areaAllocations.map(a => ({
      updateOne: {
        filter: { targetId: target._id, level: 'area', areaId: a.areaId },
        update: {
          $set: {
            targetId: target._id,
            level: 'area',
            districtId,
            areaId: a.areaId,
            unitId: null,
            parentId: districtAlloc._id,
            allocatedCount: a.allocatedCount
          }
        },
        upsert: true
      }
    }));

    await TargetAllocation.bulkWrite(ops);

    res.json({ success: true, message: 'Areas allocated successfully', count: areaAllocations.length });
  } catch (err) {
    console.error('[TargetRoutes] allocate-areas error:', err);
    res.status(500).json({ success: false, message: 'Error allocating to areas', error: err.message });
  }
});

// ─── Area allocates to Units ──────────────────────────────────────────────────
// POST /api/targets/:id/allocate-units
// Body: { mode: 'equal' | 'custom', customAllocations: [{ unitId, allocatedCount }] }
// Access: area role
router.post('/:id/allocate-units', unifiedAuth, async (req, res) => {
  try {
    const { role, areaId, districtId } = req.user;
    if (role !== 'area') {
      return res.status(403).json({ success: false, message: 'Only area admins can allocate to units' });
    }

    const target = await Target.findById(req.params.id).lean();
    if (!target) return res.status(404).json({ success: false, message: 'Target not found' });
    if (target.districtId.toString() !== districtId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const areaAlloc = await TargetAllocation.findOne({
      targetId: target._id, level: 'area', areaId
    }).lean();
    if (!areaAlloc) {
      return res.status(400).json({ success: false, message: 'Area allocation not found. District must allocate to your area first.' });
    }

    const { mode = 'equal', customAllocations = [] } = req.body;

    let unitAllocations; // [{ unitId, allocatedCount }]

    if (mode === 'equal') {
      const units = await UnitMaster.find({ areaId, isActive: true }).select('_id').lean();
      if (units.length === 0) {
        return res.status(400).json({ success: false, message: 'No active units found in this area' });
      }
      const counts = distributeEqually(areaAlloc.allocatedCount, units.length);
      unitAllocations = units.map((u, i) => ({ unitId: u._id, allocatedCount: counts[i] }));
    } else {
      if (!Array.isArray(customAllocations) || customAllocations.length === 0) {
        return res.status(400).json({ success: false, message: 'customAllocations array required for custom mode' });
      }
      unitAllocations = customAllocations
        .filter(ca => Number(ca.allocatedCount) > 0) // skip excluded (0 or omitted) units
        .map(ca => ({
          unitId: ca.unitId,
          allocatedCount: Number(ca.allocatedCount)
        }));
      const totalCustom = unitAllocations.reduce((s, u) => s + u.allocatedCount, 0);
      if (totalCustom > areaAlloc.allocatedCount) {
        return res.status(400).json({
          success: false,
          message: `Sum of custom allocations (${totalCustom}) exceeds area allocation (${areaAlloc.allocatedCount})`
        });
      }
    }

    const ops = unitAllocations.map(u => ({
      updateOne: {
        filter: { targetId: target._id, level: 'unit', unitId: u.unitId },
        update: {
          $set: {
            targetId: target._id,
            level: 'unit',
            districtId,
            areaId,
            unitId: u.unitId,
            parentId: areaAlloc._id,
            allocatedCount: u.allocatedCount
          }
        },
        upsert: true
      }
    }));

    await TargetAllocation.bulkWrite(ops);

    res.json({ success: true, message: 'Units allocated successfully', count: unitAllocations.length });
  } catch (err) {
    console.error('[TargetRoutes] allocate-units error:', err);
    res.status(500).json({ success: false, message: 'Error allocating to units', error: err.message });
  }
});

// ─── Unit submits actual count ─────────────────────────────────────────────────
// PUT /api/targets/:id/submit
// Body: { submittedCount: Number }
// Access: unit role
router.put('/:id/submit', unifiedAuth, async (req, res) => {
  try {
    const { role, unitId } = req.user;
    if (role !== 'unit') {
      return res.status(403).json({ success: false, message: 'Only unit admins can submit counts' });
    }

    const { submittedCount } = req.body;
    if (submittedCount === undefined || submittedCount === null || Number(submittedCount) < 0) {
      return res.status(400).json({ success: false, message: 'submittedCount must be >= 0' });
    }

    const alloc = await TargetAllocation.findOne({
      targetId: req.params.id, level: 'unit', unitId
    });
    if (!alloc) {
      return res.status(404).json({ success: false, message: 'No allocation found for your unit on this target' });
    }

    alloc.submittedCount = Number(submittedCount);
    alloc.submittedAt = new Date();
    await alloc.save();

    res.json({
      success: true,
      message: 'Count submitted successfully',
      data: {
        allocatedCount: alloc.allocatedCount,
        submittedCount: alloc.submittedCount,
        diff: alloc.submittedCount - alloc.allocatedCount
      }
    });
  } catch (err) {
    console.error('[TargetRoutes] submit error:', err);
    res.status(500).json({ success: false, message: 'Error submitting count', error: err.message });
  }
});

// ─── DELETE target ────────────────────────────────────────────────────────────
// DELETE /api/targets/:id
// Access: State admin only
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Target not found' });

    await TargetAllocation.deleteMany({ targetId: target._id });
    await Target.findByIdAndDelete(target._id);

    res.json({ success: true, message: 'Target deleted successfully' });
  } catch (err) {
    console.error('[TargetRoutes] delete error:', err);
    res.status(500).json({ success: false, message: 'Error deleting target', error: err.message });
  }
});

module.exports = router;
