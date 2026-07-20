/**
 * Quarter Helper Utilities
 * 
 * BUSINESS RULE: Users submit performance reports for the PREVIOUS COMPLETED quarter, not the current one.
 * 
 * Logic:
 * - Each quarter represents a completed 3-month period
 * - Forms are submitted AFTER the quarter ends
 * - Current quarter is always in progress and cannot be submitted
 * 
 * Examples:
 * - Jan-Mar (Q1) → Submit Q4 of previous year
 * - Apr-Jun (Q2) → Submit Q1 of current year
 * - Jul-Sep (Q3) → Submit Q2 of current year
 * - Oct-Dec (Q4) → Submit Q3 of current year
 * 
 * SPECIAL RULE: Q3 (July-September) is currently hidden due to data integrity issues.
 * All Q3 submissions are filtered out from queries and blocked from creation.
 */

/**
 * Hidden quarters configuration
 * Q3 is hidden due to data mismatch issues in production
 */
const HIDDEN_QUARTERS = [3];

/**
 * Check if a quarter is hidden (should not be visible or submittable)
 * @param {number} quarter - Quarter number (1-4)
 * @returns {boolean} True if the quarter is hidden
 */
const isQuarterHidden = (quarter) => {
  return HIDDEN_QUARTERS.includes(quarter);
};

/**
 * Get quarter from month (standard calculation)
 * @param {number} month - Month number (1-12)
 * @returns {number} Quarter number (1-4)
 */
const getQuarterFromMonth = (month) => {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  if (month >= 10 && month <= 12) return 4;
  return 1;
};

/**
 * Get the CURRENT quarter (the quarter we are currently in)
 * This is for informational purposes only
 * 
 * @param {Date} date - Optional date to check (defaults to current date)
 * @returns {number} Current quarter number (1-4)
 */
const getCurrentQuarter = (date = new Date()) => {
  const month = date.getMonth() + 1; // 1-12
  return getQuarterFromMonth(month);
};

/**
 * Get the AVAILABLE quarter for submission (PREVIOUS completed quarter)
 * 
 * CRITICAL: This returns the PREVIOUS quarter, not the current one
 * Users can only submit for quarters that have already ended
 * 
 * @param {Date} date - Optional date to check (defaults to current date)
 * @returns {Object} { quarter: number, year: number } - The available quarter and its year
 */
const getAvailableSubmissionQuarter = (date = new Date()) => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // 1-12
  const currentQuarter = getQuarterFromMonth(currentMonth);
  
  // Previous quarter logic
  let availableQuarter;
  let availableYear;
  
  if (currentQuarter === 1) {
    // Current: Q1 (Jan-Mar) → Available: Q4 of previous year
    availableQuarter = 4;
    availableYear = currentYear - 1;
  } else {
    // Current: Q2, Q3, or Q4 → Available: Previous quarter of same year
    availableQuarter = currentQuarter - 1;
    availableYear = currentYear;
  }
  
  return {
    quarter: availableQuarter,
    year: availableYear
  };
};

/**
 * Check if a given quarter/year is the current (ongoing) quarter
 * @param {number} quarter
 * @param {number} year
 * @param {Date} date
 * @returns {boolean}
 */
const isCurrentQuarter = (quarter, year, date = new Date()) => {
  const currentYear = date.getFullYear();
  const currentQuarter = getCurrentQuarter(date);
  return year === currentYear && quarter === currentQuarter;
};

/**
 * @deprecated Use getAvailableSubmissionQuarter instead
 * 
 * Legacy function kept for backward compatibility
 * This now redirects to the correct logic
 */
const getOpenQuarter = (date = new Date()) => {
  const { quarter } = getAvailableSubmissionQuarter(date);
  return quarter;
};

/**
 * Check if a specific quarter/year combination is available for submission
 * 
 * @param {number} quarter - Quarter to check (1-4)
 * @param {number} year - Year to check
 * @param {Date} date - Optional date to check against (defaults to current date)
 * @returns {boolean} True if the quarter is available for submission
 */
const isQuarterAvailable = (quarter, year, date = new Date()) => {
  const available = getAvailableSubmissionQuarter(date);
  return quarter === available.quarter && year === available.year;
};

/**
 * Filter submissions to exclude hidden quarters (Q3)
 * This is the primary function to use when querying submissions
 * 
 * @param {Array} submissions - Array of submission documents
 * @returns {Array} Filtered submissions without Q3 data
 */
const filterHiddenQuarters = (submissions) => {
  if (!Array.isArray(submissions)) return submissions;
  
  return submissions.filter(submission => {
    const quarter = submission.submissionPeriod?.quarter;
    return quarter && !isQuarterHidden(quarter);
  });
};

/**
 * Get MongoDB query filter to exclude hidden quarters
 * Use this in database queries to filter at the database level
 * 
 * @returns {Object} MongoDB query filter
 */
const getHiddenQuarterFilter = () => {
  return {
    'submissionPeriod.quarter': { $nin: HIDDEN_QUARTERS }
  };
};

/**
 * Validate if a submission quarter is valid (not future, not current, not hidden)
 * 
 * @param {number} quarter - Quarter to validate (1-4)
 * @param {number} year - Year to validate
 * @param {Date} date - Optional date to validate against (defaults to current date)
 * @returns {Object} { valid: boolean, reason: string }
 */
const validateSubmissionQuarter = (quarter, year, date = new Date()) => {
  const currentYear = date.getFullYear();
  const available = getAvailableSubmissionQuarter(date);
  
  // CRITICAL: Block Q3 submissions
  if (isQuarterHidden(quarter)) {
    return {
      valid: false,
      reason: 'Q3 submissions are currently not available due to data processing. Please contact admin if you need assistance.'
    };
  }
  
  // Check if it's a future year
  if (year > currentYear) {
    return {
      valid: false,
      reason: 'Cannot submit for future years'
    };
  }
  
  // Check if it's the current quarter
  const currentQuarter = getCurrentQuarter(date);
  if (isCurrentQuarter(quarter, year, date)) {
    return {
      valid: false,
      reason: 'Cannot submit for the current quarter. Please wait until the quarter ends.'
    };
  }
  
  // Check if it's a future quarter in the current year
  if (year === currentYear && quarter > currentQuarter) {
    return {
      valid: false,
      reason: 'Cannot submit for future quarters'
    };
  }
  
  // Check if it's the available quarter
  if (quarter === available.quarter && year === available.year) {
    return {
      valid: true,
      reason: 'Valid submission quarter'
    };
  }
  
  // It's a past quarter - could be valid for viewing/editing existing submissions
  if (year < currentYear || (year === currentYear && quarter < currentQuarter)) {
    return {
      valid: false,
      reason: 'This quarter has passed. Only the most recent completed quarter is available for new submissions.'
    };
  }
  
  return {
    valid: false,
    reason: 'Invalid quarter/year combination'
  };
};

/**
 * Build a MongoDB query filter that excludes both static hidden quarters (Q3)
 * and dynamically archived quarter/year combinations.
 *
 * @param {Array<{quarter: number, year: number}>} archivedList - List fetched from ArchivedQuarter collection
 * @returns {Object} MongoDB filter object
 */
const buildCombinedQuarterFilter = (archivedList = []) => {
  if (archivedList.length === 0) {
    // No archived quarters — fall back to the simple static filter
    return { 'submissionPeriod.quarter': { $nin: HIDDEN_QUARTERS } };
  }

  // Use $nor to exclude static hidden quarters AND each archived quarter/year pair
  const norConditions = [
    { 'submissionPeriod.quarter': { $in: HIDDEN_QUARTERS } },
    ...archivedList.map(({ quarter, year }) => ({
      'submissionPeriod.quarter': quarter,
      'submissionPeriod.year': year
    }))
  ];

  return { $nor: norConditions };
};

/**
 * Async helper: fetch archived quarters from DB and return the combined filter.
 * Import ArchivedQuarter lazily to avoid circular-dependency issues.
 *
 * @returns {Promise<Object>} MongoDB filter object
 */
const getArchivedQuarterFilter = async () => {
  try {
    const ArchivedQuarter = require('../models/ihthisabi/ArchivedQuarter');
    const archivedList = await ArchivedQuarter.find({}).select('quarter year -_id').lean();
    return buildCombinedQuarterFilter(archivedList);
  } catch (err) {
    // Fallback to static filter if DB is unavailable
    console.error('[quarterHelper] Could not load archived quarters:', err.message);
    return getHiddenQuarterFilter();
  }
};

module.exports = {
  getQuarterFromMonth,
  getCurrentQuarter,
  getAvailableSubmissionQuarter,
  getOpenQuarter, // Deprecated but kept for compatibility
  isCurrentQuarter,
  isQuarterAvailable,
  validateSubmissionQuarter,
  // Q3 Filtering functions
  isQuarterHidden,
  filterHiddenQuarters,
  getHiddenQuarterFilter,
  buildCombinedQuarterFilter,
  getArchivedQuarterFilter,
  HIDDEN_QUARTERS
};

