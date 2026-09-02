/**
 * Members Application — approval pipeline configuration.
 * Mounted at /api/members/workflows
 *
 * Reads are open to any authenticated account (the application detail view needs
 * the stage list to label things); writes are super-admin only.
 */

const express = require('express');
const router = express.Router();

const Workflow = require('../../models/members/Workflow');
const Application = require('../../models/members/Application');
const Role = require('../../models/members/Role');
const { protect, requireSuperAdmin } = require('../../middlewares/members/auth');
const { RUKN_STAGES, KARKOON_STAGES } = require('../../utils/members/seed');

router.use(protect);

/** GET / — both workflows */
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.find().lean();
    res.json({ success: true, workflows });
  } catch (error) {
    console.error('Members list workflows error:', error);
    res.status(500).json({ success: false, message: 'Failed to load workflows' });
  }
});

/** GET /:formType */
router.get('/:formType', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ formType: req.params.formType }).lean();
    if (!workflow) return res.status(404).json({ success: false, message: 'No workflow configured for this form type' });
    res.json({ success: true, workflow });
  } catch (error) {
    console.error('Members get workflow error:', error);
    res.status(500).json({ success: false, message: 'Failed to load workflow' });
  }
});

/**
 * PUT /:formType — replace the stage list.
 *
 * Stages that applications are currently sitting on may not be removed, since
 * those applications would have nowhere to go. Reordering and relabelling is
 * always allowed.
 */
router.put('/:formType', requireSuperAdmin, async (req, res) => {
  try {
    const { formType } = req.params;
    const { stages } = req.body || {};
    if (!Array.isArray(stages) || !stages.length) {
      return res.status(400).json({ success: false, message: 'At least one stage is required' });
    }

    const roleKeys = new Set((await Role.find({ isActive: true }).select('key').lean()).map(r => r.key));
    for (const stage of stages) {
      if (!stage.key || !stage.name) {
        return res.status(400).json({ success: false, message: 'Every stage needs a key and a name' });
      }
      if (stage.actorRoleKey && !roleKeys.has(stage.actorRoleKey)) {
        return res.status(400).json({
          success: false,
          message: `Stage "${stage.name}" is assigned to unknown role "${stage.actorRoleKey}"`
        });
      }
      for (const fillKey of stage.skipFillsRoleKeys || []) {
        if (!roleKeys.has(fillKey)) {
          return res.status(400).json({
            success: false,
            message: `Stage "${stage.name}" skip-fills unknown role "${fillKey}"`
          });
        }
      }
    }

    const incomingKeys = new Set(stages.map(s => s.key));
    const occupied = await Application.distinct('currentStageKey', {
      formType,
      status: { $nin: ['approved', 'rejected'] }
    });
    const orphaned = occupied.filter(k => k && !incomingKeys.has(k));
    if (orphaned.length) {
      return res.status(409).json({
        success: false,
        message: `Applications are still waiting at stage(s): ${orphaned.join(', ')}. Move them on before removing these stages.`
      });
    }

    const workflow = await Workflow.findOneAndUpdate(
      { formType },
      {
        formType,
        stages: stages.map((s, i) => ({ ...s, order: s.order ?? i + 1 })),
        updatedBy: req.user.isSuperAdmin ? null : req.user._id
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, workflow });
  } catch (error) {
    console.error('Members update workflow error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** POST /:formType/reset — restore the seeded pipeline */
router.post('/:formType/reset', requireSuperAdmin, async (req, res) => {
  try {
    const { formType } = req.params;
    const defaults = { rukn: RUKN_STAGES, karkoon: KARKOON_STAGES }[formType];
    if (!defaults) return res.status(400).json({ success: false, message: 'Unknown form type' });

    const workflow = await Workflow.findOneAndUpdate(
      { formType },
      { formType, stages: defaults },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, workflow });
  } catch (error) {
    console.error('Members reset workflow error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
