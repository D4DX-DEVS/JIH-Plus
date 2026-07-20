const express = require('express');
const router = express.Router();
const ApplicationForm = require('../../models/ihthisabi/ApplicationForm');
const Submission = require('../../models/ihthisabi/Submission');
const { protect, authorize } = require('../../middlewares/ihthisabi/auth');
const { getAvailableSubmissionQuarter, getCurrentQuarter } = require('../../utils/quarterHelper');

// Public route: Get published form for a specific quarter (used by submission flow)
router.get('/public/by-quarter/:quarter/:year', protect, async (req, res) => {
  try {
    const quarter = parseInt(req.params.quarter);
    const year = parseInt(req.params.year);

    const form = await ApplicationForm.findOne({
      quarter,
      year,
      status: 'published'
    }).lean({ virtuals: true });

    res.json({
      success: true,
      data: form,
      hasDynamicForm: !!form
    });
  } catch (error) {
    console.error('Error fetching form by quarter:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch form' });
  }
});

// All remaining routes require admin auth
router.use(protect, authorize('admin', 'mainAdmin'));

// GET /api/ihthisabi/application-forms - List all forms
router.get('/', async (req, res) => {
  try {
    const { status, year } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);

    const forms = await ApplicationForm.find(filter)
      .sort({ year: -1, quarter: -1 })
      .lean({ virtuals: true });

    res.json({ success: true, data: forms });
  } catch (error) {
    console.error('Error fetching application forms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch forms' });
  }
});

// GET /api/ihthisabi/application-forms/next-quarter - Get next quarter info for form creation
router.get('/next-quarter', async (req, res) => {
  try {
    const now = new Date();
    const available = getAvailableSubmissionQuarter(now);

    let nextQuarter = available.quarter + 1;
    let nextYear = available.year;
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear += 1;
    }

    const existingForm = await ApplicationForm.findOne({
      quarter: nextQuarter,
      year: nextYear
    });

    res.json({
      success: true,
      data: {
        currentSubmissionQuarter: available,
        nextQuarter: { quarter: nextQuarter, year: nextYear },
        formExists: !!existingForm,
        existingFormId: existingForm?._id
      }
    });
  } catch (error) {
    console.error('Error getting next quarter info:', error);
    res.status(500).json({ success: false, message: 'Failed to get quarter info' });
  }
});

// GET /api/ihthisabi/application-forms/:id - Get single form
router.get('/:id', async (req, res) => {
  try {
    const form = await ApplicationForm.findById(req.params.id).lean({ virtuals: true });
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch form' });
  }
});

// POST /api/ihthisabi/application-forms - Create new form
router.post('/', async (req, res) => {
  try {
    const { title, quarter, year, questions, status } = req.body;

    if (!title || !quarter || !year || !questions || !questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Title, quarter, year, and at least one question are required'
      });
    }

    const existing = await ApplicationForm.findOne({ quarter, year });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A form already exists for Q${quarter} ${year}. Please edit the existing form or delete it first.`
      });
    }

    const processedQuestions = questions.map((q, index) => ({
      ...q,
      questionId: q.questionId || `q_${index + 1}_${Date.now()}`,
      order: q.order !== undefined ? q.order : index + 1
    }));

    const form = await ApplicationForm.create({
      title,
      quarter,
      year,
      questions: processedQuestions,
      status: status || 'draft',
      createdBy: req.user?.email || req.user?._id || 'admin'
    });

    res.status(201).json({ success: true, data: form });
  } catch (error) {
    console.error('Error creating form:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A form already exists for this quarter and year'
      });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create form' });
  }
});

// PUT /api/ihthisabi/application-forms/:id - Update form
router.put('/:id', async (req, res) => {
  try {
    const form = await ApplicationForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.status === 'published') {
      const submissionCount = await Submission.countDocuments({
        dynamicFormId: form._id
      });
      if (submissionCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot modify form structure: ${submissionCount} submissions already exist. You can still change the title and status.`
        });
      }
    }

    const { title, quarter, year, questions, status } = req.body;

    if (quarter !== undefined && year !== undefined) {
      if (quarter !== form.quarter || year !== form.year) {
        const existing = await ApplicationForm.findOne({
          quarter, year, _id: { $ne: form._id }
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `A form already exists for Q${quarter} ${year}`
          });
        }
      }
    }

    if (title !== undefined) form.title = title;
    if (quarter !== undefined) form.quarter = quarter;
    if (year !== undefined) form.year = year;
    if (status !== undefined) form.status = status;
    if (questions !== undefined) {
      form.questions = questions.map((q, index) => ({
        ...q,
        questionId: q.questionId || `q_${index + 1}_${Date.now()}`,
        order: q.order !== undefined ? q.order : index + 1
      }));
    }

    await form.save();
    res.json({ success: true, data: form });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update form' });
  }
});

// DELETE /api/ihthisabi/application-forms/:id - Delete form
router.delete('/:id', async (req, res) => {
  try {
    const form = await ApplicationForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const submissionCount = await Submission.countDocuments({
      dynamicFormId: form._id
    });
    if (submissionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete form: ${submissionCount} submissions already exist for this form`
      });
    }

    await ApplicationForm.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ success: false, message: 'Failed to delete form' });
  }
});

// POST /api/ihthisabi/application-forms/:id/clone - Clone form to a new quarter
router.post('/:id/clone', async (req, res) => {
  try {
    const sourceForm = await ApplicationForm.findById(req.params.id);
    if (!sourceForm) {
      return res.status(404).json({ success: false, message: 'Source form not found' });
    }

    const { quarter, year, title } = req.body;
    if (!quarter || !year) {
      return res.status(400).json({
        success: false,
        message: 'Target quarter and year are required'
      });
    }

    const existing = await ApplicationForm.findOne({ quarter, year });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A form already exists for Q${quarter} ${year}`
      });
    }

    const clonedQuestions = sourceForm.questions.map((q, index) => {
      const cloned = q.toObject ? q.toObject() : { ...q };
      cloned.questionId = `q_${index + 1}_${Date.now()}`;
      return cloned;
    });

    const quarterNames = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
    const newForm = await ApplicationForm.create({
      title: title || `${quarterNames[quarter]} ${year} Form`,
      quarter,
      year,
      questions: clonedQuestions,
      status: 'draft',
      clonedFrom: sourceForm._id,
      createdBy: req.user?.email || req.user?._id || 'admin'
    });

    res.status(201).json({ success: true, data: newForm });
  } catch (error) {
    console.error('Error cloning form:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A form already exists for this quarter and year'
      });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to clone form' });
  }
});

// PUT /api/ihthisabi/application-forms/:id/publish - Publish a form
router.put('/:id/publish', async (req, res) => {
  try {
    const form = await ApplicationForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (!form.questions || form.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish a form with no questions'
      });
    }

    form.status = 'published';
    await form.save();

    res.json({ success: true, data: form, message: 'Form published successfully' });
  } catch (error) {
    console.error('Error publishing form:', error);
    res.status(500).json({ success: false, message: 'Failed to publish form' });
  }
});

// GET /api/ihthisabi/application-forms/by-quarter/:quarter/:year - Get published form for a quarter
// This endpoint can also be used by non-admin users (submission flow)
router.get('/by-quarter/:quarter/:year', async (req, res) => {
  try {
    const quarter = parseInt(req.params.quarter);
    const year = parseInt(req.params.year);

    const form = await ApplicationForm.findOne({
      quarter,
      year,
      status: 'published'
    }).lean({ virtuals: true });

    res.json({
      success: true,
      data: form,
      hasDynamicForm: !!form
    });
  } catch (error) {
    console.error('Error fetching form by quarter:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch form' });
  }
});

module.exports = router;
