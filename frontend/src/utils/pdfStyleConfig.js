/**
 * PDF Style Configuration
 * Centralized styling constants for all PDF generators
 * 
 * Last Updated: December 10, 2025
 * DO NOT modify individual PDF generator styles - update this file instead
 */

import jihLogo from '../assets/LogoColor.png';
import letterheadImage from '../assets/LH.png';

// ============================================================================
// BRANDING & LOGO STANDARDS
// ============================================================================

export const PDF_BRANDING = {
  logo: {
    source: jihLogo,
    width: 90,
    height: 54,
    marginRight: 12,
  },
  letterhead: {
    source: letterheadImage,
    maxHeight: 80,
    maxWidth: '100%',
    marginBottom: 8,
  },
  colors: {
    primary: '#002349',        // JIH primary blue
    secondary: '#1f2937',      // Dark gray
    accent: '#3b82f6',         // Bright blue
    text: '#000000',           // Body text
    textSecondary: '#4b5563',  // Muted text
    textMuted: '#6b7280',      // Very muted
    border: '#d1d5db',         // Borders
    background: '#ffffff',     // Page background
    tableHeaderBg: '#f3f4f6',  // Table header background
    highlightCell: '#fef3c7',  // Yellow highlight
    grayCell: '#f9fafb',       // Light gray cell
    errorText: '#dc2626',      // Error/required
    successText: '#059669',    // Success indicators
  },
};

// ============================================================================
// TYPOGRAPHY STANDARDS
// ============================================================================

export const PDF_TYPOGRAPHY = {
  fonts: {
    primary: 'Noto Serif Malayalam',
    secondary: 'Noto Sans Malayalam',
  },
  sizes: {
    pageTitle: 16,
    documentTitle: 14,
    sectionTitle: 12,
    subsectionTitle: 10,
    bodyLarge: 10,
    bodyRegular: 9,
    bodySmall: 8,
    caption: 7,
  },
  weights: {
    bold: 'bold',
    semibold: 'semibold',
    normal: 'normal',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// ============================================================================
// SPACING & LAYOUT STANDARDS
// ============================================================================

export const PDF_SPACING = {
  page: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  sections: {
    marginBottom: 14,  // Increased from 10 to 14 for better separation
    marginTop: 0,
  },
  subsections: {
    marginBottom: 8,   // Increased from 6 to 8
    marginTop: 8,      // Increased from 6 to 8
  },
  header: {
    marginBottom: 16,  // Increased from 12 to 16 for more breathing room
    paddingBottom: 10,
    borderBottom: '1.5px solid',
  },
  table: {
    marginBottom: 10,  // Increased from 8 to 10
    marginTop: 6,      // Increased from 4 to 6
  },
  row: {
    marginBottom: 4,   // Increased from 3 to 4
    paddingVertical: 2,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
};

// ============================================================================
// COMMON STYLES (StyleSheet compatible objects)
// ============================================================================

export const PDF_STYLES = {
  // Page
  page: {
    flexDirection: 'column',
    backgroundColor: PDF_BRANDING.colors.background,
    padding: PDF_SPACING.page.padding,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PDF_SPACING.header.marginBottom,
    borderBottom: `${PDF_SPACING.header.borderBottom} ${PDF_BRANDING.colors.secondary}`,
    paddingBottom: PDF_SPACING.header.paddingBottom,
  },

  headerWithoutBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PDF_SPACING.header.marginBottom,
    paddingBottom: PDF_SPACING.header.paddingBottom,
  },

  logo: {
    width: PDF_BRANDING.logo.width,
    height: PDF_BRANDING.logo.height,
    marginRight: PDF_BRANDING.logo.marginRight,
  },

  titleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Typography
  pageTitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.pageTitle,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    color: PDF_BRANDING.colors.primary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    marginBottom: 4,
  },

  documentTitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.documentTitle,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    color: PDF_BRANDING.colors.secondary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    marginBottom: 2,
  },

  subtitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.subsectionTitle,
    textAlign: 'center',
    color: PDF_BRANDING.colors.textSecondary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    marginBottom: 8,  // Increased from 6 to 8 for better spacing after title
    marginTop: 4,     // Added margin top for separation from previous content
    color: PDF_BRANDING.colors.secondary,
    borderBottom: `1px solid ${PDF_BRANDING.colors.border}`,
    paddingBottom: 4, // Increased from 3 to 4
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  subsectionTitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.subsectionTitle,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    marginBottom: 4,
    color: PDF_BRANDING.colors.secondary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  bodyText: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    lineHeight: PDF_TYPOGRAPHY.lineHeight.normal,
    color: PDF_BRANDING.colors.text,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  bodyTextSmall: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    lineHeight: PDF_TYPOGRAPHY.lineHeight.normal,
    color: PDF_BRANDING.colors.text,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  caption: {
    fontSize: PDF_TYPOGRAPHY.sizes.caption,
    color: PDF_BRANDING.colors.textMuted,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  // Sections
  section: {
    marginBottom: PDF_SPACING.sections.marginBottom,
  },

  subsection: {
    marginBottom: PDF_SPACING.subsections.marginBottom,
    marginTop: PDF_SPACING.subsections.marginTop,
  },

  // Chips/Badges
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  chip: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    paddingVertical: PDF_SPACING.chip.paddingVertical,
    paddingHorizontal: PDF_SPACING.chip.paddingHorizontal,
    color: PDF_BRANDING.colors.textSecondary,
  },

  // Fields
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: PDF_SPACING.subsections.marginBottom,
    padding: 5,
    border: `1px solid ${PDF_BRANDING.colors.border}`,
  },

  fieldLabel: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    marginRight: 10,
    color: PDF_BRANDING.colors.secondary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },

  fieldValue: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    color: PDF_BRANDING.colors.text,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    flex: 1,
  },
};

// ============================================================================
// TABLE STYLES
// ============================================================================

export const PDF_TABLE_STYLES = {
  table: {
    display: 'table',
    width: '100%',  // Changed from 'auto' to '100%' for consistent width
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    marginBottom: PDF_SPACING.table.marginBottom,
    marginTop: PDF_SPACING.table.marginTop,
  },

  tableRow: {
    flexDirection: 'row',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableHeader: {
    backgroundColor: PDF_BRANDING.colors.tableHeaderBg,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableHeaderCell: {
    padding: 5,
    paddingLeft: 6,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    backgroundColor: PDF_BRANDING.colors.tableHeaderBg,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    verticalAlign: 'middle',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableCell: {
    padding: 5,
    paddingLeft: 6,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    verticalAlign: 'middle',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableCellLeft: {
    textAlign: 'left',
    paddingLeft: 6,
  },

  tableCellRight: {
    textAlign: 'right',
    paddingRight: 6,
  },

  tableCellWide: {
    width: '40%',
    textAlign: 'left',
    paddingLeft: 6,
  },

  tableCellNarrow: {
    width: '10%',
    textAlign: 'center',
  },

  tableCellMedium: {
    width: '20%',
    textAlign: 'center',
  },

  highlightCell: {
    backgroundColor: PDF_BRANDING.colors.highlightCell,
  },

  grayCell: {
    backgroundColor: PDF_BRANDING.colors.grayCell,
  },

  // Specific cell types
  tableHeaderCellWide: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    backgroundColor: PDF_BRANDING.colors.tableHeaderBg,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'left',
    width: '40%',
    paddingLeft: 6,
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableHeaderCellNarrow: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    backgroundColor: PDF_BRANDING.colors.tableHeaderBg,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    width: '10%',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableHeaderCellMedium: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    backgroundColor: PDF_BRANDING.colors.tableHeaderBg,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    width: '20%',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableCellWideValue: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'left',
    width: '40%',
    paddingLeft: 6,
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableCellNarrowValue: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    width: '10%',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },

  tableCellMediumValue: {
    padding: 4,
    borderWidth: 1,
    borderColor: PDF_BRANDING.colors.border,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
    width: '20%',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },
};

// ============================================================================
// PAGE FLOW & BREAKS
// ============================================================================

export const PDF_PAGE_FLOW = {
  sectionBreak: {
    pageBreakBefore: 'always',
    marginTop: 0,
  },
  avoidBreak: {
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },
  allowBreak: {
    pageBreakInside: 'auto',
    breakInside: 'auto',
  },
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Safely convert any value to string for PDF rendering
 */
export const safeToString = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return 'Object data';
    }
  }
  if (typeof value === 'string' && value.trim() === '') return '-';
  if (typeof value === 'number' && isNaN(value)) return '-';
  return String(value);
};

/**
 * Format date for PDF display
 */
export const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

/**
 * Format date and time for PDF display
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  PDF_BRANDING,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  PDF_STYLES,
  PDF_TABLE_STYLES,
  PDF_PAGE_FLOW,
  safeToString,
  formatDate,
  formatDateTime,
};

