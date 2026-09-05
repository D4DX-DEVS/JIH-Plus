/**
 * Members Application — Mekhala / District / Area / Unit master data.
 * Mounted at /api/members/admin/master-data
 *
 * Owned by this section: entered by hand in the members admin panel, never read
 * from the JIH or ihthisabi databases. Reads are open to any authenticated
 * account (dropdowns need them); writes are super-admin only.
 */

const express = require('express');
const router = express.Router();

const LocationMaster = require('../../models/members/LocationMaster');
const MemberAdmin = require('../../models/members/MemberAdmin');
const { protect, requireSuperAdmin } = require('../../middlewares/members/auth');

router.use(protect);

const CHILD_OF = { mekhala: 'district', district: 'area', area: 'unit' };

/** Query matching every location directly under `location`. */
function childQuery(location) {
  const childType = CHILD_OF[location.type];
  if (!childType) return null;
  return { type: childType, [location.type]: location.name };
}

/**
 * GET /  — list, optionally filtered by type and parent.
 *
 * Paginated only when `limit` is passed, so the dropdown callers that need the
 * full set (account postings, access-link units, parent pickers) keep working
 * unchanged. `counts` is always the unfiltered per-type total, which is what the
 * Master Data tabs display regardless of the current search.
 */
router.get('/', async (req, res) => {
  try {
    const { type, types, mekhala, district, area, search, status, includeInactive, page = 1, limit } = req.query;
    const query = {};
    if (type) query.type = type;
    // `types=mekhala,district,area` fetches several levels in one request — the
    // filter dropdowns need the parent levels but never the (largest) unit list.
    else if (types) query.type = { $in: String(types).split(',').map(t => t.trim()).filter(Boolean) };
    if (mekhala) query.mekhala = mekhala;
    if (district) query.district = district;
    if (area) query.area = area;
    if (search) query.name = new RegExp(String(search).trim(), 'i');
    if (!includeInactive) query.isActive = true;
    // Explicit status wins over the includeInactive default.
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const countQuery = includeInactive ? {} : { isActive: true };
    const countsPromise = LocationMaster.aggregate([
      { $match: countQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const cursor = LocationMaster.find(query).sort({ type: 1, name: 1 });
    if (limit) {
      cursor.skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    }

    const [locations, total, countRows] = await Promise.all([
      cursor.lean(),
      LocationMaster.countDocuments(query),
      countsPromise
    ]);

    const counts = { mekhala: 0, district: 0, area: 0, unit: 0 };
    for (const row of countRows) counts[row._id] = row.count;

    res.json({
      success: true,
      locations,
      counts,
      pagination: { total, page: Number(page), limit: limit ? Number(limit) : total }
    });
  } catch (error) {
    console.error('Members master-data list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load master data' });
  }
});

/** GET /tree — the whole hierarchy, for cascading selectors */
router.get('/tree', async (req, res) => {
  try {
    const all = await LocationMaster.find({ isActive: true }).sort({ name: 1 }).lean();
    const tree = all
      .filter(l => l.type === 'mekhala')
      .map(m => ({
        ...m,
        districts: all.filter(d => d.type === 'district' && d.mekhala === m.name).map(d => ({
          ...d,
          areas: all.filter(a => a.type === 'area' && a.district === d.name).map(a => ({
            ...a,
            units: all.filter(u => u.type === 'unit' && u.area === a.name && u.district === d.name)
          }))
        }))
      }));
    res.json({ success: true, tree });
  } catch (error) {
    console.error('Members master-data tree error:', error);
    res.status(500).json({ success: false, message: 'Failed to load master data tree' });
  }
});

/** POST / — create one location */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { type, name, mekhala, district, area } = req.body || {};
    if (!type || !name) {
      return res.status(400).json({ success: false, message: 'type and name are required' });
    }

    const location = await LocationMaster.create({
      type,
      name: String(name).trim(),
      mekhala: mekhala || '',
      district: district || '',
      area: area || ''
    });
    res.status(201).json({ success: true, location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'That location already exists under this parent' });
    }
    console.error('Members master-data create error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PUT /:id — rename or deactivate.
 * A rename must cascade: children and every account/application scope store the
 * name, not an id, so leaving them behind would silently orphan records.
 */
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const location = await LocationMaster.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

    const { name, isActive } = req.body || {};
    const oldName = location.name;
    const newName = name !== undefined ? String(name).trim() : oldName;

    if (newName !== oldName) {
      location.name = newName;
      await location.save();

      // Cascade the rename down the hierarchy and into account postings.
      await LocationMaster.updateMany({ [location.type]: oldName }, { $set: { [location.type]: newName } });
      await MemberAdmin.updateMany(
        { [`scope.${location.type}`]: oldName },
        { $set: { [`scope.${location.type}`]: newName } }
      );
    }

    if (isActive !== undefined) {
      location.isActive = Boolean(isActive);
      await location.save();
    }

    res.json({ success: true, location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Another location with that name already exists here' });
    }
    console.error('Members master-data update error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** DELETE /:id — refused while anything still points at it */
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const location = await LocationMaster.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

    const children = childQuery(location);
    if (children) {
      const childCount = await LocationMaster.countDocuments(children);
      if (childCount) {
        return res.status(409).json({
          success: false,
          message: `${childCount} ${CHILD_OF[location.type]}(s) still belong to this ${location.type}`
        });
      }
    }

    const accounts = await MemberAdmin.countDocuments({ [`scope.${location.type}`]: location.name });
    if (accounts) {
      return res.status(409).json({
        success: false,
        message: `${accounts} account(s) are still posted to this ${location.type}`
      });
    }

    await location.deleteOne();
    res.json({ success: true, message: 'Location deleted' });
  } catch (error) {
    console.error('Members master-data delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete location' });
  }
});

module.exports = router;
