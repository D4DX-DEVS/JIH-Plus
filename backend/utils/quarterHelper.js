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
 */

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

const QUARTER_LABELS = {
  1: 'Q1 (Jan-Mar)',
  2: 'Q2 (Apr-Jun)',
  3: 'Q3 (Jul-Sep)',
  4: 'Q4 (Oct-Dec)'
};

/**
 * Human-readable "Q1 (Jan-Mar) 2026" label for a submissionPeriod.
 * Mirrors the Submission/AlternativeSubmit model's `periodDisplay` virtual,
 * but works on plain objects too (e.g. aggregation results, where Mongoose
 * virtuals aren't computed).
 * @param {{year?: number, quarter?: number, month?: number}} submissionPeriod
 * @returns {string}
 */
const getPeriodDisplay = (submissionPeriod) => {
  if (!submissionPeriod) return 'N/A';

  const quarter = submissionPeriod.quarter || (submissionPeriod.month ? getQuarterFromMonth(submissionPeriod.month) : null);
  if (quarter) {
    return `${QUARTER_LABELS[quarter]} ${submissionPeriod.year}`;
  }

  return submissionPeriod.year || 'N/A';
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
 * Validate if a submission quarter is valid (not future, not current)
 * 
 * @param {number} quarter - Quarter to validate (1-4)
 * @param {number} year - Year to validate
 * @param {Date} date - Optional date to validate against (defaults to current date)
 * @returns {Object} { valid: boolean, reason: string }
 */
const validateSubmissionQuarter = (quarter, year, date = new Date()) => {
  const currentYear = date.getFullYear();
  const available = getAvailableSubmissionQuarter(date);
  
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
 * Build a MongoDB query filter that excludes archived quarter/year combinations.
 *
 * @param {Array<{quarter: number, year: number}>} archivedList - List fetched from ArchivedQuarter collection
 * @returns {Object} MongoDB filter object
 */
const buildCombinedQuarterFilter = (archivedList = []) => {
  if (archivedList.length === 0) return {};

  // Use $nor to exclude each archived quarter/year pair
  return {
    $nor: archivedList.map(({ quarter, year }) => ({
      'submissionPeriod.quarter': quarter,
      'submissionPeriod.year': year
    }))
  };
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
    // Fall back to no filter if DB is unavailable
    console.error('[quarterHelper] Could not load archived quarters:', err.message);
    return {};
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
  buildCombinedQuarterFilter,
  getArchivedQuarterFilter,
  getPeriodDisplay
};

