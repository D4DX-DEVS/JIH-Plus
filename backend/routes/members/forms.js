/**
 * Members Application — form configuration.
 * Mounted at /api/members/forms
 *
 * One template per application type is published at a time. A template stays
 * fully editable — published or not — until applications reference it; from then
 * on its structure is frozen (clone to a draft to change it). Applications keep
 * pointing at the template version they were filled against, so old submissions
 * always render with the questions their applicant actually answered.
 */

const express = require('express');
const router = express.Router();

const FormTemplate = require('../../models/members/FormTemplate');
const Application = require('../../models/members/Application');
const Role = require('../../models/members/Role');
const { protect, requireSuperAdmin } = require('../../middlewares/members/auth');
const { flattenFields } = require('../../utils/members/formAccess');

const CHOICE_FIELD_TYPES = ['select', 'dropdown', 'radio', 'checkbox', 'multiselect'];
const LAYOUT_FIELD_TYPES = ['title', 'html'];

/**
 * Drafts may be sparse; publishing demands a usable form.
 * Mirrors validatePagesPayload in routes/ihthisabi/dynamicReports.js, plus the
 * audience checks that are specific to this section.
 */
function validateTemplatePayload(body, { publishing, roleKeys }) {
  const { title, pages, formType } = body;
  if (!title || !String(title).trim()) return 'Form title is required';
  if (!formType) return 'formType is required';
  if (!Array.isArray(pages)) return 'pages must be an array';

  const seenFieldIds = new Set();
  const seenPageIds = new Set();
  let applicantFieldCount = 0;

  for (const page of pages) {
    if (!Number.isInteger(page.id)) return 'Each page needs a numeric id';
    if (seenPageIds.has(page.id)) return `Duplicate page id ${page.id}`;
    seenPageIds.add(page.id);

    if (page.audience === 'role') {
      if (!page.audienceRole) return `Page "${page.title || page.id}" is role-scoped but names no role`;
      if (!roleKeys.has(page.audienceRole)) {
        return `Page "${page.title || page.id}" names unknown role "${page.audienceRole}"`;
      }
    }

    for (const field of page.fields || []) {
      if (!Number.isInteger(field.id)) return 'Each field needs a numeric id';
      if (seenFieldIds.has(field.id)) return `Duplicate field id ${field.id}`;
      seenFieldIds.add(field.id);
      if (!field.type) return 'Each field must have a type';

      if (field.audience === 'role' && field.audienceRole && !roleKeys.has(field.audienceRole)) {
        return `Field #${field.id} names unknown role "${field.audienceRole}"`;
      }

      const isRoleScoped = page.audience === 'role' || field.audience === 'role';
      if (!isRoleScoped && !LAYOUT_FIELD_TYPES.includes(field.type)) applicantFieldCount += 1;

      if (publishing) {
        if (!LAYOUT_FIELD_TYPES.includes(field.type) && !String(field.label || '').trim()) {
          return `Field #${field.id} needs a label before publishing`;
        }
        if (CHOICE_FIELD_TYPES.includes(field.type)) {
          const options = (field.options || []).filter(o => String(o).trim());
          if (!options.length) return `Field "${field.label || field.id}" needs at least one option`;
        }
      }
    }
  }

  if (publishing && applicantFieldCount === 0) {
    return 'Add at least one applicant field before publishing';
  }
  return null;
}

async function activeRoleKeys() {
  const roles = await Role.find({ isActive: true }).select('key').lean();
  return new Set(roles.map(r => r.key));
}

router.use(protect);

/** GET / — list templates, newest first. Paginated when `limit` is passed. */
router.get('/', async (req, res) => {
  try {
    const { formType, includeInactive, search, state, page = 1, limit } = req.query;
    const query = {};
    if (formType) query.formType = formType;
    if (search) query.title = new RegExp(String(search).trim(), 'i');
    if (!includeInactive) query.isActive = true;
    if (state === 'published') query.isPublished = true;
    if (state === 'draft') query.isPublished = { $ne: true };

    const cursor = FormTemplate.find(query)
      .select('-pages')
      .sort({ formType: 1, isPublished: -1, updatedAt: -1 });
    if (limit) {
      cursor.skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    }

    const [templates, total] = await Promise.all([
      cursor.lean(),
      FormTemplate.countDocuments(query)
    ]);

    res.json({
      success: true,
      templates,
      pagination: { total, page: Number(page), limit: limit ? Number(limit) : total }
    });
  } catch (error) {
    console.error('Members list forms error:', error);
    res.status(500).json({ success: false, message: 'Failed to load forms' });
  }
});

/** GET /published/:formType — the live template for an application type */
router.get('/published/:formType', async (req, res) => {
  try {
    const template = await FormTemplate.findOne({
      formType: req.params.formType,
      isPublished: true,
      isActive: true
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'No published form for this application type yet' });
    }
    res.json({ success: true, template });
  } catch (error) {
    console.error('Members published form error:', error);
    res.status(500).json({ success: false, message: 'Failed to load form' });
  }
});

/** GET /:id */
router.get('/:id', async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });

    const usageCount = await Application.countDocuments({ formTemplateId: template._id });
    res.json({ success: true, template, usageCount });
  } catch (error) {
    console.error('Members get form error:', error);
    res.status(500).json({ success: false, message: 'Failed to load form' });
  }
});

/** POST / — create a draft */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const roleKeys = await activeRoleKeys();
    const error = validateTemplatePayload(req.body, { publishing: false, roleKeys });
    if (error) return res.status(400).json({ success: false, message: error });

    const template = await FormTemplate.create({
      formType: req.body.formType,
      title: req.body.title,
      description: req.body.description || '',
      pages: req.body.pages || [],
      isPublished: false,
      createdBy: req.user.isSuperAdmin ? null : req.user._id,
      updatedBy: req.user.isSuperAdmin ? null : req.user._id
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Members create form error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** PUT /:id — edit a template (drafts and published forms alike).
 * Mirrors the ihthisabi report builder: once applications have been submitted
 * against a template its structure is frozen — only title and description may
 * change — so old submissions always render the questions they answered. */
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });

    const hasApplications = await Application.exists({ formTemplateId: template._id });
    if (hasApplications && req.body.pages !== undefined) {
      return res.status(409).json({
        success: false,
        message: 'This form already has applications; its structure cannot be edited. Clone it to a new draft instead.'
      });
    }

    const roleKeys = await activeRoleKeys();
    const error = validateTemplatePayload(
      {
        ...req.body,
        formType: req.body.formType || template.formType,
        pages: req.body.pages !== undefined ? req.body.pages : template.pages
      },
      // A live form must stay publishable after the edit.
      { publishing: template.isPublished, roleKeys }
    );
    if (error) return res.status(400).json({ success: false, message: error });

    if (req.body.title !== undefined) template.title = req.body.title;
    if (req.body.description !== undefined) template.description = req.body.description;
    if (req.body.pages !== undefined) template.pages = req.body.pages;
    template.updatedBy = req.user.isSuperAdmin ? null : req.user._id;

    await template.save();
    res.json({ success: true, template });
  } catch (error) {
    console.error('Members update form error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** PATCH /:id/publish — make this the live form for its type */
router.patch('/:id/publish', requireSuperAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });
    if (template.isPublished) {
      return res.json({ success: true, template, message: 'Already published' });
    }

    const roleKeys = await activeRoleKeys();
    const error = validateTemplatePayload(template.toObject(), { publishing: true, roleKeys });
    if (error) return res.status(400).json({ success: false, message: error });

    // Retire whatever is live for this type; its applications keep referencing it.
    const previous = await FormTemplate.findOne({
      formType: template.formType,
      isPublished: true,
      _id: { $ne: template._id }
    });
    if (previous) {
      previous.isPublished = false;
      await previous.save();
      template.version = (previous.version || 1) + 1;
    }

    template.isPublished = true;
    template.publishedAt = new Date();
    template.updatedBy = req.user.isSuperAdmin ? null : req.user._id;
    await template.save();

    res.json({ success: true, template, replaced: previous ? previous._id : null });
  } catch (error) {
    console.error('Members publish form error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** PATCH /:id/unpublish — take the form offline without deleting it */
router.patch('/:id/unpublish', requireSuperAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });

    template.isPublished = false;
    await template.save();
    res.json({ success: true, template });
  } catch (error) {
    console.error('Members unpublish form error:', error);
    res.status(500).json({ success: false, message: 'Failed to unpublish form' });
  }
});

/** POST /:id/clone — copy any template into a fresh draft */
router.post('/:id/clone', requireSuperAdmin, async (req, res) => {
  try {
    const source = await FormTemplate.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Form not found' });

    const clone = await FormTemplate.create({
      formType: source.formType,
      title: req.body?.title || `${source.title} (copy)`,
      description: source.description,
      pages: source.pages,
      version: source.version,
      isPublished: false,
      createdBy: req.user.isSuperAdmin ? null : req.user._id
    });

    res.status(201).json({ success: true, template: clone });
  } catch (error) {
    console.error('Members clone form error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/** DELETE /:id — any form without applications (published ones included, like
 * ihthisabi report deletion; the submissions guard is what protects history) */
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });

    const usage = await Application.countDocuments({ formTemplateId: template._id });
    if (usage) {
      return res.status(409).json({
        success: false,
        message: `${usage} application(s) were submitted against this form; it cannot be deleted`
      });
    }

    await template.deleteOne();
    res.json({ success: true, message: 'Form deleted' });
  } catch (error) {
    console.error('Members delete form error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete form' });
  }
});

/** GET /:id/audit — which roles own comment fields on this form */
router.get('/:id/audit', async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Form not found' });

    const counts = {};
    let applicantFields = 0;
    for (const entry of flattenFields(template)) {
      if (entry.audience === 'applicant') applicantFields += 1;
      else counts[entry.roleKey || '(unassigned)'] = (counts[entry.roleKey || '(unassigned)'] || 0) + 1;
    }

    res.json({ success: true, applicantFields, roleFields: counts });
  } catch (error) {
    console.error('Members form audit error:', error);
    res.status(500).json({ success: false, message: 'Failed to audit form' });
  }
});

module.exports = router;
