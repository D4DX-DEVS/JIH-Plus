const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration/login validation
  userLogin: Joi.object({
    username: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long'
      })
  }),

  // User registration validation
  userRegister: Joi.object({
    role: Joi.string()
      .valid('rukn', 'admin')
      .required()
      .messages({
        'any.only': 'Role must be either rukn or admin'
      }),
    username: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long'
      }),
    district: Joi.string()
      .trim()
      .when('role', {
        is: 'rukn',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    area: Joi.string()
      .trim()
      .when('role', {
        is: 'rukn',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    unit: Joi.string()
      .trim()
      .when('role', {
        is: 'rukn',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
    name: Joi.string()
      .trim()
      .max(100)
      .when('role', {
        is: 'rukn',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
  }),

  // Submission form validation
  submission: Joi.object({
    district: Joi.string().trim().required(),
    area: Joi.string().trim().required(),
    unit: Joi.string().trim().required(),
    ruknName: Joi.string().trim().max(100).required(),
    // Support both top-level and nested submissionPeriod formats
    quarter: Joi.number().min(1).max(4).optional(),
    year: Joi.number().min(2020).max(2030).optional(),
    submissionPeriod: Joi.object({
      year: Joi.number().min(2020).max(2030).optional(),
      quarter: Joi.number().min(1).max(4).optional(),
      month: Joi.number().min(1).max(12).optional()
    }).optional(),
    form: Joi.object({
      quranStudy: Joi.object({
        status: Joi.string().valid('complete', 'partial', 'none').required(),
        others: Joi.string().trim().max(200).allow('')
      }).required(),
      hadithCount: Joi.number().min(0).max(1000).required(),
      bookReading: Joi.object({
        islami: Joi.string().valid('complete', 'partial', 'notread').required(),
        atma: Joi.string().valid('complete', 'partial', 'notread').required(),
        others: Joi.string().trim().max(200).allow('')
      }).required(),
      weeklyMeeting: Joi.object({
        hadir: Joi.number().min(0).max(100).required(),
        leave: Joi.number().min(0).max(100).required(),
        absent: Joi.number().min(0).max(100).required()
      }).required(),
      jamaathMeeting: Joi.object({
        hadir: Joi.number().min(0).max(100).required(),
        leave: Joi.number().min(0).max(100).required(),
        absent: Joi.number().min(0).max(100).required()
      }).required(),
      grihameetings: Joi.number().min(0).max(10).required(),
      thahreekiMeetings: Joi.number().min(0).max(10).required(),
      baithulmaal: Joi.string().valid('complete', 'partial', 'incomplete').required(),
      zakatPaid: Joi.string().valid('yes', 'no', 'notApplicable').required(),
      recruitEffort: Joi.string()
        .valid('satisfactory', 'unsatisfactory')
        .allow(null, '')
        .default(null),
      newMembers: Joi.number().min(0).max(50).required(),
      muslimRelations: Joi.number().min(0).max(100).required(),
      communityRelations: Joi.number().min(0).max(100).required(),
      scoreCount: Joi.number().min(0).max(100).required(),
      meqathService: Joi.string().valid('yes', 'no').required(),
      skillUsage: Joi.string().valid('yes', 'no').required(),
      jamaathAgenda: Joi.string()
        .valid('yes', 'no', 'almost')
        .allow(null, '')
        .default(null),
      jamaathInfluence: Joi.string().valid('yes', 'no', 'small').required(),
      suggestions: Joi.string().trim().max(1000).allow('', null).default(null)
    }).required()
  }),

  // Admin filter validation
  adminFilter: Joi.object({
    district: Joi.string().trim().allow(''),
    area: Joi.string().trim().allow(''),
    unit: Joi.string().trim().allow(''),
    year: Joi.number().min(2020).max(2030),
    month: Joi.number().min(1).max(12),
    status: Joi.string().valid('submitted', 'reviewed', 'approved').allow(''),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  }),

  // Alternative submission validation
  alternativeSubmission: Joi.object({
    type: Joi.string().valid('Aged', 'Patient').required(),
    district: Joi.string().trim().required(),
    area: Joi.string().trim().required(),
    unit: Joi.string().trim().required(),
    ruknName: Joi.string().trim().max(100).required(),
    reason: Joi.string().trim().max(1000).optional().allow('', null),
    // Support both top-level and nested submissionPeriod formats
    quarter: Joi.number().min(1).max(4).optional(),
    year: Joi.number().min(2020).max(2030).optional(),
    submissionPeriod: Joi.object({
      year: Joi.number().min(2020).max(2030).optional(),
      quarter: Joi.number().min(1).max(4).optional(),
      month: Joi.number().min(1).max(12).optional()
    }).optional()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors: errorMessages
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
  validateQuery
};
