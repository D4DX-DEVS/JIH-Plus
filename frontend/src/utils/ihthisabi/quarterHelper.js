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
