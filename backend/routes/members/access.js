/**
 * Members Application — the applicant-facing form.
 * Mounted at /api/members/access
 *
 * These are the only members endpoints reachable without an admin account, and
 * even they demand a valid, unblocked access link plus its credential. The
 * applicant never receives, and can never write, a role-scoped field: the
 * template is filtered on the way out and the payload is filtered on the way in.
 */

const express = require('express');
const router = express.Router();

const AccessLink = require('../../models/members/AccessLink');
const FormTemplate = require('../../models/members/FormTemplate');
const Application = require('../../models/members/Application');
const Workflow = require('../../models/members/Workflow');
const { applicantAuth, requireMembersDb, signApplicantToken } = require('../../middlewares/members/auth');
const { applicantView, applicantFieldKeys, pickAllowed, flattenFields } = require('../../utils/members/formAccess');
const { uploadToDigitalOcean } = require('../../middlewares/digitalOceanCdn');
const { notifyRole } = require('../../utils/members/notify');

const DATA_URL = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/;
const MAX_UPLOADS_PER_SUBMISSION = 5;

/** Replace any base64 data URL in the payload with a CDN URL. */
async function uploadEmbeddedFiles(formData) {
  let uploads = 0;
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value !== 'string') continue;
    const match = value.match(DATA_URL);
    if (!match) continue;

    if (uploads >= MAX_UPLOADS_PER_SUBMISSION) {
      throw new Error(`At most ${MAX_UPLOADS_PER_SUBMISSION} files can be attached to one application`);
    }

    const [, mimetype, base64] = match;
    const url = await uploadToDigitalOcean(Buffer.from(base64, 'base64'), key, mimetype);
    formData[key] = url;
    uploads += 1;
  }
  return formData;
}

/** Best guess at the applicant's name and mobile, for listings and WhatsApp. */
function deriveIdentity(template, formData, link, body) {
  const fields = flattenFields(template).filter(f => f.audience === 'applicant');

  const firstMatching = (predicate) => {
    const hit = fields.find(predicate);
    if (!hit) return '';
    const value = formData[`field_${hit.field.id}`];
    return typeof value === 'string' ? value.trim() : '';
  };

  const name = String(body?.applicantName || '').trim()
    || firstMatching(f => /name/i.test(f.field.label || '') && ['text'].includes(f.field.type))
    || link.applicantName
    || '';

  const mobile = String(body?.applicantMobile || '').trim()
    || firstMatching(f => f.field.type === 'phone')
    || firstMatching(f => /mobile|phone/i.test(f.field.label || ''))
    || link.applicantMobile
    || '';

  return { name, mobile };
}

/** POST /login — exchange a link token plus credential for a short-lived session */
router.post('/login', requireMembersDb, async (req, res) => {
  try {
    const { token, username, password } = req.body || {};
    if (!token || !username || !password) {
      return res.status(400).json({ success: false, message: 'Link, username and password are all required' });
    }

    const link = await AccessLink.findOne({ token });
    // Same message whichever part is wrong, so the endpoint can't be used to
    // discover which tokens exist.
    const invalid = () => res.status(401).json({ success: false, message: 'Invalid link or credentials' });

    if (!link) return invalid();
    if (link.username !== String(username).trim()) return invalid();
    if (!(await link.comparePassword(password))) return invalid();

    if (!link.isUsable()) {
      return res.status(403).json({
        success: false,
        message: link.status === 'blocked'
          ? 'This form link has been closed by your unit admin'
          : 'This form link is no longer active'
      });
    }

    res.json({
      success: true,
      token: signApplicantToken(link),
      formType: link.formType,
      applicantName: link.applicantName
    });
  } catch (error) {
    console.error('Members applicant login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

/** GET /form — the published template with every role-scoped page and field removed */
router.get('/form', applicantAuth, async (req, res) => {
  try {
    const link = req.accessLink;

    if (link.applicationId) {
      return res.status(409).json({
        success: false,
        message: 'An application has already been submitted with this link'
      });
    }

    const template = await FormTemplate.findOne({
      formType: link.formType,
      isPublished: true,
      isActive: true
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'This form is not available right now' });
    }

    res.json({
      success: true,
      template: applicantView(template),
      draft: { formData: link.draftData || {}, lastPage: link.draftPage || 0 }
    });
  } catch (error) {
    console.error('Members applicant form error:', error);
    res.status(500).json({ success: false, message: 'Failed to load the form' });
  }
});

/** PUT /draft — save progress without submitting */
router.put('/draft', applicantAuth, async (req, res) => {
  try {
    const link = req.accessLink;
    if (link.applicationId) {
      return res.status(409).json({ success: false, message: 'This application has already been submitted' });
    }

    const template = await FormTemplate.findOne({
      formType: link.formType,
      isPublished: true,
      isActive: true
    }).lean();
    if (!template) return res.status(404).json({ success: false, message: 'This form is not available right now' });

    link.draftData = pickAllowed(req.body?.formData, applicantFieldKeys(template));
    link.draftPage = Number(req.body?.lastPage) || 0;
    await link.save();

    res.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('Members applicant draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to save progress' });
  }
});

/** POST /submit — create the application and hand it to the first workflow stage */
router.post('/submit', applicantAuth, async (req, res) => {
  try {
    const link = req.accessLink;
    if (link.applicationId) {
      return res.status(409).json({
        success: false,
        message: 'An application has already been submitted with this link'
      });
    }

    const template = await FormTemplate.findOne({
      formType: link.formType,
      isPublished: true,
      isActive: true
    }).lean();
    if (!template) return res.status(404).json({ success: false, message: 'This form is not available right now' });

    // Anything the applicant sent that is not an applicant-audience field is
    // dropped here, whatever the client claims.
    const formData = pickAllowed(req.body?.formData, applicantFieldKeys(template));

    let uploaded;
    try {
      uploaded = await uploadEmbeddedFiles(formData);
    } catch (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message });
    }

    const workflow = await Workflow.findOne({ formType: link.formType, isActive: true });
    const firstStage = workflow?.firstStage();
    if (!firstStage) {
      return res.status(503).json({
        success: false,
        message: 'No approval workflow is configured for this application type'
      });
    }

    const { name, mobile } = deriveIdentity(template, uploaded, link, req.body);

    const application = await Application.create({
      formType: link.formType,
      formTemplateId: template._id,
      formVersion: template.version || 1,
      accessLinkId: link._id,
      formData: uploaded,
      roleData: {},
      scope: link.scope,
      applicantName: name,
      applicantMobile: mobile,
      photo: typeof req.body?.photo === 'string' && !DATA_URL.test(req.body.photo) ? req.body.photo : '',
      currentStageKey: firstStage.key,
      status: 'submitted',
      stageHistory: [{
        stageKey: firstStage.key,
        stageName: firstStage.name,
        actorName: name || 'Applicant',
        action: 'submitted',
        at: new Date()
      }],
      submittedAt: new Date()
    });

    link.status = 'used';
    link.usedAt = new Date();
    link.applicationId = application._id;
    link.draftData = {};
    link.draftPage = 0;
    await link.save();

    await notifyRole({
      roleKey: firstStage.actorRoleKey,
      scope: link.scope,
      title: `New ${link.formType === 'rukn' ? 'Rukn' : 'Karkoon'} application`,
      body: `${name || 'An applicant'} submitted an application awaiting your verification.`,
      applicationId: application._id
    });

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Members applicant submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit the application' });
  }
});

module.exports = router;
