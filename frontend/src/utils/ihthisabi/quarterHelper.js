/**
 * Quarter Helper Utility for Frontend
 * Provides helper functions for quarter management
 */

/**
 * Get quarter name
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

  return quarterNames[quarter] || `Q${quarter}`;
};

/**
 * Get available quarters
 * @returns {number[]} - Array of available quarter numbers
 */
export const getAvailableQuarters = () => {
  return [1, 2, 3, 4];
};

/**
 * First report quarter an Aged / Patient category set now applies to: the
 * quarter after the one open for submission (members report the previous
 * completed quarter). Mirrors backend utils/memberCategory.js.
 * @returns {{ year: number, quarter: number }}
 */
export const getNextReportQuarter = (date = new Date()) => {
  const current = Math.ceil((date.getMonth() + 1) / 3)
  // Open for submission = previous quarter; the next report quarter is the current one
  return { year: date.getFullYear(), quarter: current }
};
