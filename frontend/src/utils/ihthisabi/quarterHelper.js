/**
 * Quarter Helper Utility for Frontend
 * Provides feature flags and helper functions for quarter management
 */

// Feature flag to disable Q3 submissions
export const Q3_DISABLED = false;

/**
 * Check if Q3 is disabled
 * @param {number} quarter - Optional quarter number to check
 * @returns {boolean} - True if Q3 is disabled (globally or for specific quarter)
 */
export const isQ3Disabled = (quarter = null) => {
  if (!Q3_DISABLED) return false;
  if (quarter === null) return true; // Global check
  return quarter === 3;
};

/**
 * Get quarter name with optional disabled indicator
 * @param {number} quarter - Quarter number (1-4)
 * @returns {string} - Quarter name (e.g., "Q1 (Jan-Mar)")
 */
export const getQuarterName = (quarter) => {
  const quarterNames = {
    1: 'Q1 (Jan-Mar)',
    2: 'Q2 (Apr-Jun)',
    3: 'Q3 (Jul-Sep)',
    4: 'Q4 (Oct-Dec)'
  };
  
  const name = quarterNames[quarter] || `Q${quarter}`;
  
  if (isQ3Disabled(quarter)) {
    return `${name} (Disabled)`;
  }
  
  return name;
};

/**
 * Get available quarters (excluding disabled ones)
 * @returns {number[]} - Array of available quarter numbers
 */
export const getAvailableQuarters = () => {
  if (Q3_DISABLED) {
    return [1, 2, 4];
  }
  return [1, 2, 3, 4];
};

/**
 * Get filter object for API queries to exclude Q3
 * @returns {Object} - Filter object for API params
 */
export const getQuarterFilter = () => {
  if (Q3_DISABLED) {
    return { 'quarter': { $ne: 3 } };
  }
  return {};
};
