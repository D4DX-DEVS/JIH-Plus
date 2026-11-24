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
const { ORIGIN_REGIONS, GCC_COUNTRIES } = require('../../utils/members/origin');
const { uploadToDigitalOcean } = require('../../middlewares/digitalOceanCdn');

router.use(protect);

const DECISIONS = ['approved', 'rejected', 'hold'];
const roleKeyOf = (user) => user?.role?.key || '';
const actorLabel = (user) => user?.name || user?.username || 'Unknown';
const actorId = (user) => (user?.isSuperAdmin ? null : user?._id);
const labelOf = (application) => (application.formType === 'rukn' ? 'Rukn' : 'Karkun');

class RequestError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ─── Comment attachments ─────────────────────────────────────────────────────

const DATA_URL = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/;
const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
// The CDN uploader only knows image types; PDFs are allowed for comments alone.
const EXTRA_UPLOAD_TYPES = { 'application/pdf': '.pdf' };
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * Turn the client's attachment list into stored attachments.
 * Each item is either `{ name, data }` (a new file as a data URL, uploaded here)
 * or `{ url }` naming one of `keep` — a file already on the comment being revised.
 * Any other URL is refused, so a client can't attach arbitrary links.
 */
function checkAttachments(incoming, keep = []) {
  const list = Array.isArray(incoming) ? incoming : [];
  if (list.length > MAX_ATTACHMENTS) {
    throw new RequestError(400, `At most ${MAX_ATTACHMENTS} files can be attached to a comment`);
  }
  const known = new Map(keep.map(a => [a.url, a]));
  return list.map(item => {
    if (item?.url && known.has(item.url)) return { existing: known.get(item.url) };
    const name = String(item?.name || 'attachment').slice(0, 200);
    const match = typeof item?.data === 'string' ? item.data.match(DATA_URL) : null;
    if (!match) throw new RequestError(400, `"${name}" could not be read. Attach it again.`);
    const [, type, base64] = match;
    if (!ATTACHMENT_TYPES.includes(type)) {
      throw new RequestError(400, `"${name}" is not a supported file. Attach an image (JPG, PNG, GIF, WEBP) or a PDF.`);
    }
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_ATTACHMENT_BYTES) throw new RequestError(400, `"${name}" is larger than 5 MB`);
    return { name, type, buffer };
  });
}

/** Upload the new files from `checkAttachments`; call only once every other check has passed. */
async function uploadAttachments(checked) {
  const out = [];
  for (const item of checked) {
    if (item.existing) {
      out.push(item.existing);
      continue;
    }
    let url;
    try {
      url = await uploadToDigitalOcean(item.buffer, 'comment', item.type, EXTRA_UPLOAD_TYPES);
    } catch (error) {
      throw new RequestError(502, `"${item.name}" could not be uploaded. Try again.`);
    }
    out.push({ url, name: item.name, type: item.type, size: item.buffer.length });
  }
  return out;
}

const plainAttachments = (list) => (list || []).map(a => ({ url: a.url, name: a.name, type: a.type, size: a.size }));

// ─── Who sees whose comments ─────────────────────────────────────────────────

/**
 * A comment (and its files) is visible to its author's role and every role above
 * it: an area admin reads the unit admin's and unit nazim's comments, a district
 * admin reads those and the area admin's, and so on up to the state. Role levels
 * come from the Role collection (0 = highest).
 *
 * Exceptions: an author always sees their own comment, the admin asked to revise
 * sees the reason they were given, and a reopen reason is shown to everyone.
 */
async function commentVisibility(user, workflow) {
  const roles = await Role.find().select('key level').lean();
  const levelOf = Object.fromEntries(roles.map(r => [r.key, r.level]));
  const myRole = roleKeyOf(user);
  const myLevel = user.isSuperAdmin ? 0 : (levelOf[myRole] ?? user.role?.level ?? Infinity);
  const isMe = (id) => !user.isSuperAdmin && id && String(id) === String(user._id);

  const canSeeRole = (roleKey) => !roleKey || user.isSuperAdmin || (levelOf[roleKey] ?? Infinity) >= myLevel;

  const canSeeEntry = (entry) => {
    if (canSeeRole(entry.actorRoleKey) || isMe(entry.actorId)) return true;
    if (entry.action === 'reopened' || entry.action === 'reopen_withdrawn') return true;
    if (entry.action === 'revision_requested') {
      return workflow.stageByKey(entry.toStageKey)?.actorRoleKey === myRole;
    }
    return false;
  };

  const canSeeComment = (comment) => canSeeRole(comment.roleKey) || isMe(comment.actorId);

  return { canSeeRole, canSeeEntry, canSeeComment };
}

/** Earlier verify stages whose admin already acted and whose comments this admin may read. */
function revisionTargets(application, workflow, stage, visibility) {
  if (!stage) return [];
  const acted = new Set(
    (application.stageHistory || [])
      .filter(h => ['forwarded', 'revised', 'returned'].includes(h.action))
      .map(h => h.stageKey)
  );
  return [...(workflow.stages || [])]
    .filter(s => s.kind === 'verify'
      && s.order < stage.order
      && s.actorRoleKey
      && s.actorRoleKey !== stage.actorRoleKey
      && acted.has(s.key)
      && visibility.canSeeRole(s.actorRoleKey))
    .sort((a, b) => a.order - b.order);
}

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
    const { formType, status, stage, search, mine, origin, country, page = 1, limit = 25 } = req.query;
    const query = { ...scopeQuery(req.user) };
    if (formType) query.formType = formType;
    if (status) query.status = status;
    if (stage) query.currentStageKey = stage;
    // Where the form was filled from; 'none' finds applications from before the question.
    if (origin === 'none') query['origin.region'] = { $in: ['', null] };
    else if (ORIGIN_REGIONS[origin]) query['origin.region'] = origin;
    if (GCC_COUNTRIES.includes(country)) query['origin.country'] = country;
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      query.$or = [{ applicantName: rx }, { applicantMobile: rx }, { memberId: rx }];
    }

    // `mine=1` narrows to applications actually waiting on this caller's role.
    // The super admin can act anywhere, but what waits on them is the state
    // stages; a Rukn stays "approved" while it moves through the post-decision
    // state stages, so for them only a finished (stage-less) or rejected
    // application is excluded.
    if (mine) {
      const workflows = await Workflow.find(formType ? { formType } : {}).lean();
      const myStages = workflows.flatMap(w =>
        (w.stages || []).filter(s => s.actorRoleKey === roleKeyOf(req.user)).map(s => s.key)
      );
      query.currentStageKey = { $in: myStages };
      if (!query.status) {
        query.status = req.user.isSuperAdmin ? { $ne: 'rejected' } : { $nin: ['approved', 'rejected'] };
      }
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
    const correctionOpen = Boolean(application.correction?.open);
    const revision = application.revisionRequest?.open ? application.revisionRequest : null;
    const revising = Boolean(myTurn && revision && revision.toStageKey === stage?.key);
    const skipping = myTurn && !revising && canSkip(req.user, stage);
    // Nothing is writable while the applicant has the form back.
    const editable = myTurn && !correctionOpen ? editableRolesAt(req.user, stage, { skipping }) : [];
    const visibility = await commentVisibility(req.user, workflow);

    // Earlier roles' comment pages follow the same upward-only rule as comments.
    const view = reviewerView(template, {
      editableRoleKeys: editable,
      actedRoleKeys: actedRoleKeys(application).filter(visibility.canSeeRole)
    });

    const visibleKeys = new Set(
      view.pages.flatMap(p => p.fields.map(f => `field_${f.id}`))
    );
    const roleData = {};
    for (const [key, value] of Object.entries(application.roleData || {})) {
      if (visibleKeys.has(key)) roleData[key] = value;
    }

    const plain = application.toObject();
    // History rows stay (who did what, when); the words and files of a comment
    // from a higher role are withheld.
    plain.stageHistory = (plain.stageHistory || []).map(entry => (
      visibility.canSeeEntry(entry)
        ? entry
        : { ...entry, comment: '', attachments: [], commentHidden: Boolean(entry.comment || entry.attachments?.length) }
    ));
    plain.comments = (plain.comments || []).filter(visibility.canSeeComment);
    if (plain.revisionRequest?.open && !visibility.canSeeRole(plain.revisionRequest.fromRoleKey)
      && workflow.stageByKey(plain.revisionRequest.toStageKey)?.actorRoleKey !== roleKeyOf(req.user)) {
      plain.revisionRequest = { ...plain.revisionRequest, reason: '' };
    }

    // The reviewer's own last comment at this stage, to start from when revising.
    const ownRoleKey = req.user.isSuperAdmin ? stage?.actorRoleKey : roleKeyOf(req.user);
    const myComment = revising
      ? [...(application.comments || [])].reverse().find(c => c.stageKey === stage.key && c.roleKey === ownRoleKey)
      : null;

    const firstStage = workflow.firstStage();
    const canAct = myTurn && !correctionOpen;

    res.json({
      success: true,
      application: { ...plain, roleData },
      template: view,
      workflow: workflow.toObject(),
      permissions: {
        myTurn,
        canAct,
        awaitingApplicant: correctionOpen,
        canSkip: canAct && skipping,
        canEditFormData: canAct,
        editableRoleKeys: editable,
        stage: stage || null,
        revision: revising ? {
          reason: revision.reason,
          fromName: revision.fromName,
          fromStageKey: revision.fromStageKey,
          at: revision.at
        } : null,
        myComment: myComment ? { text: myComment.text, attachments: plainAttachments(myComment.attachments) } : null,
        revisionTargets: canAct && !revision
          ? revisionTargets(application, workflow, stage, visibility).map(s => ({ key: s.key, name: s.name }))
          : [],
        // Only the admin right after the applicant can hand the form back to them.
        canReopen: canAct && Boolean(application.accessLinkId) && stage?.key === firstStage?.key,
        canWithdrawReopen: correctionOpen && (myTurn || Boolean(req.user.isSuperAdmin))
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
    if (application.correction?.open) {
      return res.status(409).json({
        success: false,
        message: 'The applicant is correcting this form right now. Wait for them to resubmit.'
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
 * body: { action, comment, attachments, roleData, captured, nextStageKey, useSkip }
 *   action       'forwarded' | 'marked' | 'approved' | 'rejected' | 'hold' | 'finalized'
 *   comment      required on every action
 *   attachments  [{ name, data: <data URL> }] new files, or [{ url }] to keep a file
 *                already on the comment being revised
 *
 * When a later admin has asked this stage to revise its comment, any action here
 * rewrites this role's comment and sends the application straight back to them.
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
    if (application.correction?.open) {
      return res.status(409).json({
        success: false,
        message: 'This form is reopened for the applicant. Wait for them to resubmit, or withdraw the reopen.'
      });
    }

    const { action, comment = '', useSkip } = req.body || {};
    const commentText = String(comment || '').trim();
    if (!commentText) {
      return res.status(400).json({ success: false, message: 'Add your comment before you continue' });
    }
    if (action === 'returned') {
      return res.status(400).json({ success: false, message: 'To send this back, ask the earlier admin to revise their comment' });
    }

    const revision = application.revisionRequest?.open && application.revisionRequest.toStageKey === stage.key
      ? application.revisionRequest
      : null;
    if (revision && useSkip) {
      return res.status(400).json({ success: false, message: 'Resubmit your revised comment; the stage cannot be skipped now' });
    }

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
    const permittedTargets = [stage.nextStageKey, ...(stage.allowedNextStageKeys || [])].filter(Boolean);

    // Approve / reject / hold only mean something at a decision stage. Anywhere
    // else they would forward the application while telling the applicant it
    // was decided, so refuse them outright.
    if (stage.kind !== 'decision' && DECISIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `"${stage.name}" is not a decision stage; it cannot be ${action}`
      });
    }

    if (revision) {
      // Straight back to whoever asked for the revision.
      nextStageKey = revision.fromStageKey;
    } else if (stage.kind === 'decision') {
      if (!DECISIONS.includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'This stage needs a decision: approved, rejected or hold'
        });
      }
      status = action;
      if (action === 'approved') {
        nextStageKey = req.body.nextStageKey || stage.nextStageKey || '';
        if (req.body.nextStageKey && !permittedTargets.includes(req.body.nextStageKey)) {
          return res.status(400).json({ success: false, message: `This stage cannot forward to "${req.body.nextStageKey}"` });
        }
      }
      if (action === 'hold') nextStageKey = stage.key; // stays put until revisited
    } else if (skipping) {
      nextStageKey = stage.skipToStageKey;
    } else if (req.body.nextStageKey) {
      const target = req.body.nextStageKey;
      if (!permittedTargets.includes(target)) {
        return res.status(400).json({ success: false, message: `This stage cannot forward to "${target}"` });
      }
      // The skip target is reserved for actors who meet the skip condition.
      if (stage.skipToStageKey && target === stage.skipToStageKey && target !== stage.nextStageKey) {
        return res.status(400).json({ success: false, message: 'This stage cannot be skipped by your account' });
      }
      nextStageKey = target;
    } else {
      nextStageKey = stage.nextStageKey || '';
    }

    if (stage.isTerminal && !revision) nextStageKey = '';

    // Files on the comment being revised may be kept; anything else must be new.
    const ownComments = (application.comments || []).filter(c => c.stageKey === stage.key && editable.includes(c.roleKey));
    let checkedAttachments;
    try {
      checkedAttachments = checkAttachments(
        req.body?.attachments,
        revision ? ownComments.flatMap(c => plainAttachments(c.attachments)) : []
      );
    } catch (error) {
      if (error instanceof RequestError) return res.status(error.code).json({ success: false, message: error.message });
      throw error;
    }

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

    let attachments;
    try {
      attachments = await uploadAttachments(checkedAttachments);
    } catch (error) {
      if (error instanceof RequestError) return res.status(error.code).json({ success: false, message: error.message });
      throw error;
    }

    // Apply the write.
    application.roleData = { ...(application.roleData || {}), ...rolePatch };
    application.markModified('roleData');

    const now = new Date();
    const roleDocs = await Role.find({ key: { $in: editable } }).select('key name').lean();
    const nameByKey = Object.fromEntries(roleDocs.map(r => [r.key, r.name]));
    for (const key of editable) {
      // A revision rewrites this role's comment; the old wording stays in history.
      const previous = revision
        ? [...application.comments].reverse().find(c => c.stageKey === stage.key && c.roleKey === key)
        : null;
      if (previous) {
        previous.text = commentText;
        previous.attachments = attachments;
        previous.actorId = actorId(req.user);
        previous.actorName = actorLabel(req.user);
        previous.at = now;
        previous.revisedAt = now;
      } else {
        application.comments.push({
          roleKey: key,
          roleName: nameByKey[key] || key,
          actorId: actorId(req.user),
          actorName: actorLabel(req.user),
          stageKey: stage.key,
          text: commentText,
          attachments,
          at: now
        });
      }
    }

    application.stageHistory.push({
      stageKey: stage.key,
      stageName: stage.name,
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: revision ? 'revised'
        : ['approved', 'rejected', 'hold'].includes(action) ? action
          : stage.kind === 'marker' ? 'marked'
            : stage.kind === 'finalize' ? 'finalized' : 'forwarded',
      comment: commentText,
      attachments,
      data: captured,
      toStageKey: nextStageKey,
      at: now
    });

    if (revision) {
      application.revisionRequest.open = false;
      application.revisionRequest.resolvedAt = now;
    }
    application.currentStageKey = nextStageKey;
    application.status = status;
    await application.save();

    // Notifications are best-effort and never block the transition.
    const label = labelOf(application);
    if (nextStageKey && nextStageKey !== stage.key) {
      const nextStage = workflow.stageByKey(nextStageKey);
      await notifyRole({
        roleKey: nextStage?.actorRoleKey,
        scope: application.scope,
        title: revision ? `${label} comment revised` : `${label} application awaiting you`,
        body: revision
          ? `${actorLabel(req.user)} revised their comment on ${application.applicantName || 'an application'} as you asked.`
          : `${application.applicantName || 'An applicant'} reached "${nextStage?.name || nextStageKey}".`,
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

// ─── Asking an earlier admin to revise their comment ─────────────────────────

/**
 * PUT /:id/request-revision — the admin at the current stage is not satisfied
 * with an earlier admin's comment. The application moves to that admin's stage;
 * when they resubmit (PUT /:id/stage) it comes straight back here.
 *
 * body: { targetStageKey, reason }
 */
router.put('/:id/request-revision', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    if (!ownsCurrentStage(req.user, stage)) {
      return res.status(403).json({ success: false, message: 'This application is not at your stage' });
    }
    if (application.correction?.open) {
      return res.status(409).json({ success: false, message: 'This form is reopened for the applicant. Wait for them to resubmit.' });
    }
    if (application.revisionRequest?.open) {
      return res.status(409).json({ success: false, message: 'Resubmit the revision you were asked for before asking someone else' });
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Say what needs to change' });

    const visibility = await commentVisibility(req.user, workflow);
    const target = revisionTargets(application, workflow, stage, visibility)
      .find(s => s.key === req.body?.targetStageKey);
    if (!target) {
      return res.status(400).json({ success: false, message: 'Choose an earlier admin who has already reviewed this application' });
    }

    const now = new Date();
    application.revisionRequest = {
      open: true,
      reason,
      fromStageKey: stage.key,
      fromRoleKey: roleKeyOf(req.user),
      fromName: actorLabel(req.user),
      fromActorId: actorId(req.user),
      toStageKey: target.key,
      at: now,
      resolvedAt: null
    };
    application.stageHistory.push({
      stageKey: stage.key,
      stageName: stage.name,
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: 'revision_requested',
      comment: reason,
      toStageKey: target.key,
      at: now
    });
    application.currentStageKey = target.key;
    if (application.status === 'submitted') application.status = 'in_review';
    await application.save();

    await notifyRole({
      roleKey: target.actorRoleKey,
      scope: application.scope,
      title: `Revise your comment on a ${labelOf(application)} application`,
      body: `${actorLabel(req.user)} asked you to revise your comment on ${application.applicantName || 'an application'}: ${reason}`,
      applicationId: application._id
    });

    res.json({ success: true, application });
  } catch (error) {
    console.error('Members request revision error:', error);
    res.status(500).json({ success: false, message: 'Failed to request the revision' });
  }
});

// ─── Reopening the form for the applicant ────────────────────────────────────

/**
 * PUT /:id/reopen — the admin right after the applicant (the workflow's first
 * stage) hands the form back for correction. The applicant signs in through the
 * same link with the same credential, finds their submitted answers filled in,
 * and resubmits; the application then returns to this stage.
 *
 * body: { reason }
 */
router.put('/:id/reopen', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    const firstStage = workflow.firstStage();
    if (!ownsCurrentStage(req.user, stage) || stage.key !== firstStage?.key) {
      return res.status(403).json({
        success: false,
        message: `Only the admin at "${firstStage?.name || 'the first stage'}" can reopen the form, while it is with them`
      });
    }
    if (application.correction?.open) {
      return res.status(409).json({ success: false, message: 'This form is already reopened for the applicant' });
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Say what the applicant needs to correct' });

    const link = application.accessLinkId ? await AccessLink.findById(application.accessLinkId) : null;
    if (!link) {
      return res.status(409).json({ success: false, message: 'This application did not come through a form link, so it cannot be reopened' });
    }

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    link.status = 'reopened';
    link.blockedAt = undefined;
    link.blockedBy = null;
    if (!link.expiresAt || link.expiresAt < weekAhead) link.expiresAt = weekAhead;
    link.draftData = {};
    link.draftPage = 0;
    link.markModified('draftData');

    application.correction = {
      open: true,
      reason,
      stageKey: stage.key,
      requestedById: actorId(req.user),
      requestedByName: actorLabel(req.user),
      requestedByRoleKey: roleKeyOf(req.user),
      requestedAt: now,
      resolvedAt: null
    };
    application.stageHistory.push({
      stageKey: stage.key,
      stageName: stage.name,
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: 'reopened',
      comment: reason,
      at: now
    });

    await link.save();
    await application.save();

    res.json({ success: true, application, linkExpiresAt: link.expiresAt });
  } catch (error) {
    console.error('Members reopen application error:', error);
    res.status(500).json({ success: false, message: 'Failed to reopen the form' });
  }
});

/** DELETE /:id/reopen — take the form back before the applicant resubmits. */
router.delete('/:id/reopen', async (req, res) => {
  try {
    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });

    const { application, workflow } = ctx;
    const stage = workflow.stageByKey(application.currentStageKey);
    if (!application.correction?.open) {
      return res.status(409).json({ success: false, message: 'This form is not reopened' });
    }
    if (!ownsCurrentStage(req.user, stage) && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'This application is not at your stage' });
    }

    const link = application.accessLinkId ? await AccessLink.findById(application.accessLinkId) : null;
    if (link && link.status === 'reopened') {
      link.status = 'used';
      link.draftData = {};
      link.draftPage = 0;
      link.markModified('draftData');
      await link.save();
    }

    const now = new Date();
    application.correction.open = false;
    application.correction.resolvedAt = now;
    application.stageHistory.push({
      stageKey: application.currentStageKey,
      stageName: stage?.name || '',
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: 'reopen_withdrawn',
      at: now
    });
    await application.save();

    res.json({ success: true, application });
  } catch (error) {
    console.error('Members withdraw reopen error:', error);
    res.status(500).json({ success: false, message: 'Failed to withdraw the reopen' });
  }
});

/**
 * PUT /:id/member-id — super admin only. Assigns the member ID to an approved
 * application that finished its workflow without one (e.g. approval was set to
 * end the workflow before the finalize stage).
 *
 * body: { memberId }
 */
router.put('/:id/member-id', async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only the super admin can assign a member ID' });
    }

    const ctx = await loadContext(req.params.id, req.user);
    if (ctx.error) return res.status(ctx.error.code).json({ success: false, message: ctx.error.message });
    const { application, workflow } = ctx;

    if (application.status !== 'approved' || workflow.stageByKey(application.currentStageKey)) {
      return res.status(400).json({ success: false, message: 'Only an approved application that has finished its workflow can be given an ID here' });
    }
    if (application.memberId) {
      return res.status(400).json({ success: false, message: 'This application already has a member ID' });
    }

    const memberId = String(req.body?.memberId || '').trim();
    if (!memberId) return res.status(400).json({ success: false, message: 'Enter the member ID' });

    const clash = await Application.findOne({
      formType: application.formType,
      memberId,
      _id: { $ne: application._id }
    }).select('_id').lean();
    if (clash) return res.status(409).json({ success: false, message: 'That member ID is already in use' });

    // Record it against the workflow's ID stage so history labels it the same way.
    const idStage = (workflow.stages || []).find(s => s.kind === 'finalize' && (s.captureFields || []).some(f => f.key === 'memberId'));
    application.memberId = memberId;
    application.memberIdAssignedAt = new Date();
    application.stageHistory.push({
      stageKey: idStage?.key || 'memberId',
      stageName: idStage?.name || 'Member ID assigned',
      actorId: actorId(req.user),
      actorRoleKey: roleKeyOf(req.user),
      actorName: actorLabel(req.user),
      action: 'finalized',
      data: { memberId },
      at: new Date()
    });
    await application.save();

    res.json({ success: true, application });
  } catch (error) {
    console.error('Members assign member ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign the member ID' });
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
