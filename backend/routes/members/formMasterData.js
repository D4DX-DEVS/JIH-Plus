/**
 * Members Application — master-data lists for "masterdata" form dropdowns.
 * Mounted at /api/members/form-master-data
 *
 * Read by the form builder and reviewers (members token) and by applicants
 * filling the form (applicant token). Names only, each with its full parent
 * chain so a dropdown can be narrowed by another field's value.
 */

const express = require('express');
const router = express.Router();

const LocationMaster = require('../../models/members/LocationMaster');
const { protectOrApplicant } = require('../../middlewares/members/auth');

router.use(protectOrApplicant);

/** GET /:source — source is mekhala | district | area | unit */
router.get('/:source', async (req, res) => {
  const { source } = req.params;
  if (!LocationMaster.LOCATION_TYPES.includes(source)) {
    return res.status(400).json({ success: false, message: `Unknown master data list "${source}"` });
  }
  try {
    const [rows, districts] = await Promise.all([
      LocationMaster.find({ type: source, isActive: true })
        .select('name mekhala district area')
        .sort({ name: 1 })
        .lean(),
      LocationMaster.find({ type: 'district' }).select('name mekhala').lean()
    ]);
    // Areas and units store no mekhala of their own; take it from their district.
    const mekhalaOf = new Map(districts.map(d => [d.name, d.mekhala]));
    const data = rows.map(({ name, mekhala, district, area }) => {
      const item = { name };
      const parentMekhala = mekhala || mekhalaOf.get(district);
      if (parentMekhala && source !== 'mekhala') item.mekhala = parentMekhala;
      if (district && ['area', 'unit'].includes(source)) item.district = district;
      if (area && source === 'unit') item.area = area;
      return item;
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Members form master-data error:', error);
    res.status(500).json({ success: false, message: 'Failed to load master data' });
  }
});

module.exports = router;
