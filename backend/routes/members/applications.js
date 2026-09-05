/**
 * Members Application — submissions and the approval workflow.
 * Mounted at /api/members/applications
 *
 * Two access rules run on every request here:
 *   scope  — an account only ever sees applications inside its own posting
 *   stage  — an account may only write the comment fields its role owns, and only
 *            while the application is sitting on a stage assigned to that role
 */

const express = require('express');
const router = express.Router();

const Application = require('../../models/members/Application');
const FormTemplate = require('../../models/members/FormTemplate');
const Workflow = require('../../models/members/Workflow');
const Role = require('../../models/members/Role');
const AccessLink = require('../../models/members/AccessLink');
const { protect } = require('../../middlewares/members/auth');
const { scopeQuery, isInScope } = require('../../utils/members/scopeFilter');
const {
  reviewerView,
  roleFieldKeys,
  applicantFieldKeys,
  pickAllowed,
  rejectedKeys
} = require('../../utils/members/formAccess');
const { notifyRole, notifyApplicantDecision } = require('../../utils/members/notify');

router.use(protect);

const roleKeyOf = (user) => user?.role?.key || '';
const actorLabel = (user) => user?.name || user?.username || 'Unknown';
const actorId = (user) => (user?.isSuperAdmin ? null : user?._id);

/** Roles that have already acted, so their comments can be shown read-only. */
function actedRoleKeys(application) {
  const keys = new Set();
  for (const entry of application.stageHistory || []) {
    if (entry.actorRoleKey) keys.add(entry.actorRoleKey);
  }
  for (const comment of application.comments || []) {
    if (comment.roleKey) keys.add(comment.roleKey);
  }
  return [...keys];
}

/** Whether `user` owns the stage the application is currently waiting on. */
function ownsCurrentStage(user, stage) {
  if (!stage) return false;
  if (user.isSuperAdmin) return true;
  return stage.actorRoleKey === roleKeyOf(user);
}

/** Roles whose comment fields `user` may write at this stage. */
function editableRolesAt(user, stage, { skipping }) {
  if (!stage) return [];
  const own = user.isSuperAdmin ? stage.actorRoleKey : roleKeyOf(user);
  const keys = own ? [own] : [];
  if (skipping) keys.push(...(stage.skipFillsRoleKeys || []));
  return [...new Set(keys)];
}

/** Whether the skip shortcut is available to this actor at this stage. */
function canSkip(user, stage) {
  if (!stage?.skipWhen || !stage.skipToStageKey) return false;
  if (stage.skipWhen === 'actorIsRukn') return Boolean(user.isRukn);
  return false;
}

async function loadContext(id, user) {
  const application = await Application.findById(id);
  if (!application) return { error: { code: 404, message: 'Application not found' } };
  if (!isInScope(user, application.scope)) {
    return { error: { code: 403, message: 'This application is outside your scope' } };
  }

  const [template, workflow] = await Promise.all([
    FormTemplate.findById(application.formTemplateId).lean(),
    Workflow.findOne({ formType: application.formType })
  ]);
  if (!template) return { error: { code: 500, message: 'The form this application was filled against is missing' } };
  if (!workflow) return { error: { code: 503, message: 'No workflow is configured for this application type' } };

  return { application, template, workflow };
}

// ─── Listing ─────────────────────────────────────────────────────────────────

/** GET / — applications the caller may see */
router.get('/', async (req, res) => {
  try {
    const { formType, status, stage, search, mine, page = 1, limit = 25 } = req.query;
    const query = { ...scopeQuery(req.user) };
    if (formType) query.formType = formType;
    if (status) query.status = status;
    if (stage) query.currentStageKey = stage;
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      query.$or = [{ applicantName: rx }, { applicantMobile: rx }, { memberId: rx }];
    }

    // `mine=1` narrows to applications actually waiting on this caller's role.
    if (mine && !req.user.isSuperAdmin) {
      const workflows = await Workflow.find(formType ? { formType } : {}).lean();
      const myStages = workflows.flatMap(w =>
        (w.stages || []).filter(s => s.actorRoleKey === roleKeyOf(req.user)).map(s => s.key)
      );
      query.currentStageKey = { $in: myStages };
      query.status = query.status || { $nin: ['approved', 'rejected'] };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find(query)
        .select('-formData -roleData -comments')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments(query)
    ]);

    res.json({
      success: true,
      applications,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('Members list applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to load applications' });
  }
});

/**
 * GET /:id — full detail.
 *
 * The template comes back already filtered: applicant answers read-only, this
 * role's comment fields editable when it is their turn, earlier roles' comments
 * read-only, and later roles' comment fields absent entirely.
 */
router.get('/:id', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, template, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    const myTurn = ownsCurrentStage(req.user, stage);
    const skipping = myTurn && canSkip(req.user, stage);
    const editable = myTurn ? editableRolesAt(req.user, stage, { skipping }) : [];

    const view = reviewerView(template, {
      editableRoleKeys: editable,
      actedRoleKeys: actedRoleKeys(application)
    });

    const visibleKeys = new Set(
      view.pages.flatMap(p => p.fields.map(f => `field_${f.id}`))
    );
    const roleData = {};
    for (const [key, value] of Object.entries(application.roleData || {})) {
      if (visibleKeys.has(key)) roleData[key] = value;
    }

    res.json({
      success: true,
      application: { ...application.toObject(), roleData },
      template: view,
      workflow: workflow.toObject(),
      permissions: {
        myTurn,
        canSkip: skipping,
        canEditFormData: myTurn,
        editableRoleKeys: editable,
        stage: stage || null
      }
    });
  } catch (error) {
    console.error('Members get application error:', error);
    res.status(500).json({ success: false, message: 'Failed to load application' });
  }
});

// ─── Editing the applicant's answers ─────────────────────────────────────────

/**
 * PUT /:id/form-data — correct the applicant's answers.
 *
 * Available to whoever owns the current stage (the unit admin / unit nazim while
 * the application is with them, per both workflows) and to the super admin at any
 * point. The applicant themself is locked out the moment their link is blocked.
 */
router.put('/:id/form-data', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, template, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    if (!ownsCurrentStage(req.user, stage)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit an application while it is at your stage'
      });
    }

    const allowed = applicantFieldKeys(template);
    const rejected = rejectedKeys(req.body?.formData, allowed);
    const patch = pickAllowed(req.body?.formData, allowed);

    application.formData = { ...(application.formData || {}), ...patch };
    if (req.body.applicantName !== undefined) application.applicantName = String(req.body.applicantName).trim();
    if (req.body.applicantMobile !== undefined) application.applicantMobile = String(req.body.applicantMobile).trim();

    application.stageHistory.push({
      stageKey: application.currentStageKey,
      stageName: stage?.name || '',
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: 'edited',
      comment: req.body?.note || '',
      at: new Date()
    });

    application.markModified('formData');
    await application.save();

    res.json({
      success: true,
      application,
      ignoredFields: rejected.length ? rejected : undefined
    });
  } catch (error) {
    console.error('Members edit application error:', error);
    res.status(500).json({ success: false, message: 'Failed to update application' });
  }
});

// ─── Stage transitions ───────────────────────────────────────────────────────

/**
 * PUT /:id/stage — act on the application.
 *
 * body: { action, comment, roleData, captured, nextStageKey, useSkip }
 *   action  'forwarded' | 'returned' | 'marked' | 'approved' | 'rejected' | 'hold' | 'finalized'
 */
router.put('/:id/stage', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, template, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    if (!stage) {
      return res.status(409).json({
        success: false,
        message: `This application is at stage "${application.currentStageKey}", which no longer exists in the workflow`
      });
    }
    if (!ownsCurrentStage(req.user, stage)) {
      return res.status(403).json({ success: false, message: 'This application is not at your stage' });
    }

    const { action, comment = '', useSkip } = req.body || {};
    const skipping = Boolean(useSkip) && canSkip(req.user, stage);
    if (useSkip && !skipping) {
      return res.status(400).json({ success: false, message: 'This stage cannot be skipped by your account' });
    }

    // Only the roles this actor owns right now may be written.
    const editable = editableRolesAt(req.user, stage, { skipping });
    const allowedRoleFields = roleFieldKeys(template, editable);
    const ignored = rejectedKeys(req.body?.roleData, allowedRoleFields);
    const rolePatch = pickAllowed(req.body?.roleData, allowedRoleFields);

    // Values the stage itself collects (Rukn ID, attendance, dates...).
    const captured = {};
    for (const field of stage.captureFields || []) {
      const value = req.body?.captured?.[field.key];
      if (field.required && (value === undefined || value === '' || value === null)) {
        return res.status(400).json({ success: false, message: `"${field.label}" is required at this stage` });
      }
      if (value !== undefined) captured[field.key] = value;
    }

    // Work out where it goes next.
    let nextStageKey = '';
    let status = application.status === 'submitted' ? 'in_review' : application.status;

    if (stage.kind === 'decision') {
      if (!['approved', 'rejected', 'hold'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'This stage needs a decision: approved, rejected or hold'
        });
      }
      status = action;
      nextStageKey = action === 'approved' ? (req.body.nextStageKey || stage.nextStageKey || '') : '';
      if (action === 'hold') nextStageKey = stage.key; // stays put until revisited
    } else if (action === 'returned') {
      const target = req.body.nextStageKey;
      if (!target || !(stage.allowedNextStageKeys || []).includes(target)) {
        return res.status(400).json({ success: false, message: 'Choose a valid stage to send this back to' });
      }
      nextStageKey = target;
    } else if (skipping) {
      nextStageKey = stage.skipToStageKey;
    } else if (req.body.nextStageKey) {
      const target = req.body.nextStageKey;
      const permitted = [stage.nextStageKey, ...(stage.allowedNextStageKeys || [])].filter(Boolean);
      if (!permitted.includes(target)) {
        return res.status(400).json({ success: false, message: `This stage cannot forward to "${target}"` });
      }
      nextStageKey = target;
    } else {
      nextStageKey = stage.nextStageKey || '';
    }

    if (stage.isTerminal) nextStageKey = '';

    // Finalize stages assign the member ID and any dates.
    if (stage.kind === 'finalize') {
      if (captured.memberId) {
        const clash = await Application.findOne({
          formType: application.formType,
          memberId: String(captured.memberId).trim(),
          _id: { $ne: application._id }
        }).select('_id').lean();
        if (clash) {
          return res.status(409).json({ success: false, message: 'That member ID is already in use' });
        }
        application.memberId = String(captured.memberId).trim();
        application.memberIdAssignedAt = new Date();
      }
      if (captured.thajdeedDate) application.thajdeedDate = new Date(captured.thajdeedDate);
      if (stage.isTerminal && application.status !== 'rejected') status = 'approved';
    }

    // Apply the write.
    application.roleData = { ...(application.roleData || {}), ...rolePatch };
    application.markModified('roleData');

    if (comment && String(comment).trim()) {
      const roleDocs = await Role.find({ key: { $in: editable } }).select('key name').lean();
      const nameByKey = Object.fromEntries(roleDocs.map(r => [r.key, r.name]));
      for (const key of editable) {
        application.comments.push({
          roleKey: key,
          roleName: nameByKey[key] || key,
          actorId: actorId(req.user),
          actorName: actorLabel(req.user),
          stageKey: stage.key,
          text: String(comment).trim(),
          at: new Date()
        });
      }
    }

    application.stageHistory.push({
      stageKey: stage.key,
      stageName: stage.name,
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: ['approved', 'rejected', 'hold'].includes(action) ? action
        : stage.kind === 'marker' ? 'marked'
          : stage.kind === 'finalize' ? 'finalized'
            : action === 'returned' ? 'returned' : 'forwarded',
      comment: String(comment || '').trim(),
      data: captured,
      toStageKey: nextStageKey,
      at: new Date()
    });

    application.currentStageKey = nextStageKey;
    application.status = status;
    await application.save();

    // Notifications are best-effort and never block the transition.
    const label = application.formType === 'rukn' ? 'Rukn' : 'Karkoon';
    if (nextStageKey && nextStageKey !== stage.key) {
      const nextStage = workflow.stageByKey(nextStageKey);
      await notifyRole({
        roleKey: nextStage?.actorRoleKey,
        scope: application.scope,
        title: `${label} application awaiting you`,
        body: `${application.applicantName || 'An applicant'} reached "${nextStage?.name || nextStageKey}".`,
        applicationId: application._id
      });
    }

    if (['approved', 'rejected', 'hold'].includes(action)) {
      // Tell everyone who has already handled it how it ended.
      for (const key of actedRoleKeys(application)) {
        await notifyRole({
          roleKey: key,
          scope: application.scope,
          title: `${label} application ${action}`,
          body: `${application.applicantName || 'An applicant'}'s application was ${action}.`,
          applicationId: application._id
        });
      }
      await notifyApplicantDecision(application, action, String(comment || '').trim());
    }

    res.json({
      success: true,
      application,
      ignoredFields: ignored.length ? ignored : undefined
    });
  } catch (error) {
    console.error('Members stage action error:', error);
    res.status(500).json({ success: false, message: 'Failed to update the application stage' });
  }
});

/** DELETE /:id — super admin only; also frees the access link */
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only the super admin can delete an application' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    if (application.accessLinkId) {
      await AccessLink.updateOne(
        { _id: application.accessLinkId },
        { $set: { applicationId: null, status: 'blocked' } }
      );
    }

    await application.deleteOne();
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Members delete application error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
});

module.exports = router;
