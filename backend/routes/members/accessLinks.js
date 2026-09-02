/**
 * Members Application — temporary form access links.
 * Mounted at /api/members/access-links
 *
 * The form is never public. A unit-level admin creates one link per applicant per
 * form type, passes the URL and credential to them outside the system, and blocks
 * the link once the application is in. Every link gets its own token, username
 * and password.
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const AccessLink = require('../../models/members/AccessLink');
const FormTemplate = require('../../models/members/FormTemplate');
const Application = require('../../models/members/Application');
const { protect, requireAccessLinkCreator } = require('../../middlewares/members/auth');
const { scopeQuery, isInScope } = require('../../utils/members/scopeFilter');

const DEFAULT_EXPIRY_DAYS = 7;

// Ambiguous characters (0/O, 1/I/l) are left out so credentials survive being
// read aloud or copied by hand.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomCode(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function uniqueUsername(formType) {
  const prefix = formType === 'rukn' ? 'rk' : 'kk';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${prefix}-${randomCode(6)}`;
    if (!(await AccessLink.exists({ username: candidate }))) return candidate;
  }
  throw new Error('Could not allocate a unique username');
}

router.use(protect);

/**
 * POST / — issue a link.
 * The generated password is returned here and nowhere else; only its hash is stored.
 */
router.post('/', requireAccessLinkCreator, async (req, res) => {
  try {
    const { formType, applicantName, applicantMobile, expiryDays } = req.body || {};
    if (!formType) return res.status(400).json({ success: false, message: 'formType is required' });

    const template = await FormTemplate.findOne({ formType, isPublished: true, isActive: true }).select('_id').lean();
    if (!template) {
      return res.status(409).json({
        success: false,
        message: 'There is no published form for this application type yet. Ask the super admin to publish one.'
      });
    }

    // A scoped creator stamps their own posting onto the link; the super admin
    // must say which unit the applicant belongs to.
    const scope = req.user.isSuperAdmin ? (req.body.scope || {}) : req.user.scope;
    if (!scope?.unit) {
      return res.status(400).json({ success: false, message: 'A unit is required for the access link' });
    }

    const days = Number(expiryDays) > 0 ? Number(expiryDays) : DEFAULT_EXPIRY_DAYS;
    const password = randomCode(8);

    const link = await AccessLink.create({
      formType,
      token: crypto.randomBytes(24).toString('hex'),
      username: await uniqueUsername(formType),
      password,
      createdBy: req.user.isSuperAdmin ? null : req.user._id,
      scope: {
        mekhala: scope.mekhala || '',
        district: scope.district || '',
        area: scope.area || '',
        unit: scope.unit
      },
      applicantName: applicantName || '',
      applicantMobile: applicantMobile || '',
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      success: true,
      link: link.toJSON(),
      // Shown once. There is no way to recover it later.
      credentials: {
        path: `/members/apply/${link.token}`,
        username: link.username,
        password
      }
    });
  } catch (error) {
    console.error('Members create access link error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** GET / — links visible to the caller */
router.get('/', async (req, res) => {
  try {
    const { formType, status, page = 1, limit = 50 } = req.query;
    const query = { ...scopeQuery(req.user) };
    if (formType) query.formType = formType;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [links, total] = await Promise.all([
      AccessLink.find(query)
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AccessLink.countDocuments(query)
    ]);

    res.json({
      success: true,
      links: links.map(l => l.toJSON()),
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('Members list access links error:', error);
    res.status(500).json({ success: false, message: 'Failed to load access links' });
  }
});

/** PATCH /:id/block — close a link so the applicant can no longer open the form */
router.patch('/:id/block', requireAccessLinkCreator, async (req, res) => {
  try {
    const link = await AccessLink.findById(req.params.id);
    if (!link) return res.status(404).json({ success: false, message: 'Access link not found' });
    if (!isInScope(req.user, link.scope)) {
      return res.status(403).json({ success: false, message: 'This access link is outside your scope' });
    }
    if (link.status === 'blocked') {
      return res.json({ success: true, link: link.toJSON(), message: 'Already blocked' });
    }

    link.status = 'blocked';
    link.blockedAt = new Date();
    link.blockedBy = req.user.isSuperAdmin ? null : req.user._id;
    await link.save();

    res.json({ success: true, link: link.toJSON() });
  } catch (error) {
    console.error('Members block access link error:', error);
    res.status(500).json({ success: false, message: 'Failed to block access link' });
  }
});

/** PATCH /:id/reopen — undo a block, e.g. the applicant needs another attempt */
router.patch('/:id/reopen', requireAccessLinkCreator, async (req, res) => {
  try {
    const link = await AccessLink.findById(req.params.id);
    if (!link) return res.status(404).json({ success: false, message: 'Access link not found' });
    if (!isInScope(req.user, link.scope)) {
      return res.status(403).json({ success: false, message: 'This access link is outside your scope' });
    }
    if (link.applicationId) {
      return res.status(409).json({
        success: false,
        message: 'This link has already been used to submit an application. Edit the application instead.'
      });
    }

    link.status = 'active';
    link.blockedAt = undefined;
    link.blockedBy = null;
    if (link.expiresAt.getTime() < Date.now()) {
      link.expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    }
    await link.save();

    res.json({ success: true, link: link.toJSON() });
  } catch (error) {
    console.error('Members reopen access link error:', error);
    res.status(500).json({ success: false, message: 'Failed to reopen access link' });
  }
});

/** DELETE /:id — discard a link that was never used */
router.delete('/:id', requireAccessLinkCreator, async (req, res) => {
  try {
    const link = await AccessLink.findById(req.params.id);
    if (!link) return res.status(404).json({ success: false, message: 'Access link not found' });
    if (!isInScope(req.user, link.scope)) {
      return res.status(403).json({ success: false, message: 'This access link is outside your scope' });
    }

    const used = link.applicationId || (await Application.exists({ accessLinkId: link._id }));
    if (used) {
      return res.status(409).json({ success: false, message: 'This link has an application against it and cannot be deleted' });
    }

    await link.deleteOne();
    res.json({ success: true, message: 'Access link deleted' });
  } catch (error) {
    console.error('Members delete access link error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete access link' });
  }
});

module.exports = router;
