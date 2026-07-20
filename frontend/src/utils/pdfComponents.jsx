/**
 * Reusable PDF Components
 * Common components for all PDF generators
 * 
 * Last Updated: December 10, 2025
 */

import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import {
  PDF_BRANDING,
  PDF_STYLES,
  PDF_TABLE_STYLES,
  safeToString,
  formatDate,
  formatDateTime,
} from './pdfStyleConfig';

// ============================================================================
// HEADER COMPONENTS
// ============================================================================

/**
 * Standard PDF Header with Logo and Title
 * @param {string} title - Main title
 * @param {string} subtitle - Optional subtitle
 * @param {boolean} showBorder - Show border under header (default: true)
 */
export const StandardPDFHeader = ({ title, subtitle, showBorder = true }) => (
  <View style={showBorder ? PDF_STYLES.header : PDF_STYLES.headerWithoutBorder}>
    <Image src={PDF_BRANDING.logo.source} style={PDF_STYLES.logo} />
    <View style={PDF_STYLES.titleContainer}>
      <Text style={PDF_STYLES.documentTitle}>{title}</Text>
      {subtitle && <Text style={PDF_STYLES.subtitle}>{subtitle}</Text>}
    </View>
  </View>
);

/**
 * Letterhead Header (for official letters)
 */
export const LetterheadHeader = () => (
  <View style={{
    borderBottom: `1.5px solid ${PDF_BRANDING.colors.text}`,
    textAlign: 'center',
    paddingTop: '8mm',
    paddingLeft: '15mm',
    paddingRight: '15mm',
    paddingBottom: '10px',
  }}>
    <Image 
      src={PDF_BRANDING.letterhead.source} 
      style={{
        maxWidth: PDF_BRANDING.letterhead.maxWidth,
        maxHeight: PDF_BRANDING.letterhead.maxHeight,
        marginBottom: PDF_BRANDING.letterhead.marginBottom,
        objectFit: 'contain',
      }} 
    />
  </View>
);

/**
 * Info Chips Row (for metadata display)
 */
export const InfoChipsRow = ({ items }) => (
  <View style={PDF_STYLES.chipRow}>
    {items.map((item, index) => (
      <Text key={index} style={PDF_STYLES.chip}>
        {item.label}: {safeToString(item.value)}
      </Text>
    ))}
  </View>
);

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

/**
 * Section Header
 * @param {string} title - Section title
 * @param {number} level - 1 for main section, 2 for subsection
 */
export const SectionHeader = ({ title, level = 1 }) => (
  <Text style={level === 1 ? PDF_STYLES.sectionTitle : PDF_STYLES.subsectionTitle}>
    {title}
  </Text>
);

/**
 * Simple Field Display (Label: Value)
 */
export const FieldDisplay = ({ label, value }) => (
  <View style={PDF_STYLES.field}>
    <Text style={PDF_STYLES.fieldLabel}>{label}:</Text>
    <Text style={PDF_STYLES.fieldValue}>{safeToString(value)}</Text>
  </View>
);

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

/**
 * Standard Table Component
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array>} rows - Table data (array of arrays)
 * @param {Array<string>} columnWidths - Optional column widths (e.g., ['40%', '10%'])
 * @param {Object} options - Additional options (highlightRows, grayRows, etc.)
 */
export const StandardTable = ({ 
  headers, 
  rows, 
  columnWidths = [], 
  options = {} 
}) => {
  const { highlightRows = [], grayRows = [], centerAll = true } = options;

  return (
    <View style={PDF_TABLE_STYLES.table}>
      {/* Header Row */}
      <View style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}>
        {headers.map((header, idx) => (
          <Text
            key={idx}
            style={[
              PDF_TABLE_STYLES.tableHeaderCell,
              columnWidths[idx] && { width: columnWidths[idx] },
              !centerAll && idx === 0 && PDF_TABLE_STYLES.tableCellLeft,
            ]}
          >
            {header}
          </Text>
        ))}
      </View>

      {/* Data Rows */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={PDF_TABLE_STYLES.tableRow}>
          {row.map((cell, cellIdx) => {
            const cellValue = typeof cell === 'object' ? cell.value : cell;
            const cellStyle = typeof cell === 'object' ? cell.style : {};
            const isHighlight = highlightRows.includes(rowIdx);
            const isGray = grayRows.includes(rowIdx);

            return (
              <Text
                key={cellIdx}
                style={[
                  PDF_TABLE_STYLES.tableCell,
                  columnWidths[cellIdx] && { width: columnWidths[cellIdx] },
                  !centerAll && cellIdx === 0 && PDF_TABLE_STYLES.tableCellLeft,
                  isHighlight && PDF_TABLE_STYLES.highlightCell,
                  isGray && PDF_TABLE_STYLES.grayCell,
                  cellStyle,
                ]}
              >
                {safeToString(cellValue)}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
};

/**
 * Two-Column Table (for label-value pairs)
 * Commonly used in forms with questions and answers
 */
export const TwoColumnTable = ({ data, labelWidth = '40%', valueWidth = '10%' }) => (
  <View style={PDF_TABLE_STYLES.table}>
    {data.map((item, index) => (
      <View key={index} style={PDF_TABLE_STYLES.tableRow}>
        <Text style={[PDF_TABLE_STYLES.tableCellWideValue, { width: labelWidth }]}>
          {item.label}
        </Text>
        <Text style={[PDF_TABLE_STYLES.tableCellNarrowValue, { width: valueWidth }]}>
          {safeToString(item.value)}
        </Text>
      </View>
    ))}
  </View>
);

/**
 * Attendance Table (specific for district/area/unit reports)
 */
export const AttendanceTable = ({ attendance }) => {
  const wings = [
    { key: 'jih', label: 'JIH' },
    { key: 'vanitha', label: 'വനിത' },
    { key: 'solidarity', label: 'Solidarity' },
    { key: 'sio', label: 'SIO' },
    { key: 'gio', label: 'GIO' },
  ];

  return (
    <View style={PDF_TABLE_STYLES.table}>
      {/* Header */}
      <View style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}>
        <Text style={PDF_TABLE_STYLES.tableHeaderCellMedium}>വിംഗ്</Text>
        <Text style={PDF_TABLE_STYLES.tableHeaderCellMedium}>ഹാജർ</Text>
        <Text style={PDF_TABLE_STYLES.tableHeaderCellMedium}>ലീവ്</Text>
        <Text style={PDF_TABLE_STYLES.tableHeaderCellMedium}>അനുപസ്ഥിതി</Text>
      </View>

      {/* Rows */}
      {wings.map((wing) => (
        <View key={wing.key} style={PDF_TABLE_STYLES.tableRow}>
          <Text style={PDF_TABLE_STYLES.tableCellMediumValue}>{wing.label}</Text>
          <Text style={PDF_TABLE_STYLES.tableCellMediumValue}>
            {safeToString(attendance?.[wing.key]?.present || 0)}
          </Text>
          <Text style={PDF_TABLE_STYLES.tableCellMediumValue}>
            {safeToString(attendance?.[wing.key]?.leave || 0)}
          </Text>
          <Text style={PDF_TABLE_STYLES.tableCellMediumValue}>
            {safeToString(attendance?.[wing.key]?.absent || 0)}
          </Text>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// SPECIAL COMPONENTS
// ============================================================================

/**
 * Gender Boolean Grid (for categories with male/female checkboxes)
 */
export const GenderBooleanGrid = ({ obj, labels = {} }) => {
  if (!obj) return null;

  const entries = Object.entries(obj).filter(
    ([k, v]) => v && (v.male || v.female)
  );

  if (entries.length === 0) {
    return (
      <Text style={[PDF_STYLES.bodyTextSmall, { color: PDF_BRANDING.colors.textMuted }]}>
        ഒരു വിഭാഗവും തിരഞ്ഞെടുത്തിട്ടില്ല
      </Text>
    );
  }

  return (
    <View>
      {entries.map(([key, value], index) => {
        const label = labels[key] || key.replace(/([A-Z])/g, ' $1').trim();
        const genders = [];
        if (value.male) genders.push('ആൺ');
        if (value.female) genders.push('പെൺ');

        return (
          <Text key={index} style={[PDF_STYLES.bodyTextSmall, { marginBottom: 2 }]}>
            {`${label}: ${genders.join(', ')}`}
          </Text>
        );
      })}
    </View>
  );
};

/**
 * Gender Count Grid (for categories with male/female checkboxes AND counts)
 */
export const GenderCountGrid = ({ genderData, countData, options = [] }) => {
  if (!genderData && !countData) return null;

  const entries = options.map((option) => ({
    key: option.key,
    label: option.label,
    gender: genderData?.[option.key] || { male: false, female: false },
    count: countData?.[option.key] || { male: 0, female: 0 },
  }));

  const validEntries = entries.filter(
    ({ gender, count }) =>
      gender.male || gender.female || count.male > 0 || count.female > 0
  );

  if (validEntries.length === 0) return null;

  return (
    <View>
      {validEntries.map(({ key, label, gender, count }, index) => (
        <View
          key={index}
          style={{
            marginBottom: 4,
            padding: 4,
            border: 1,
            borderColor: PDF_BRANDING.colors.border,
          }}
        >
          <Text style={[PDF_STYLES.bodyTextSmall, { fontWeight: 'bold', marginBottom: 2 }]}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[PDF_STYLES.bodyTextSmall, { color: PDF_BRANDING.colors.accent }]}>
              ആൺ: {gender.male ? '✓' : '✗'} {count.male > 0 ? `(${count.male})` : ''}
            </Text>
            <Text style={[PDF_STYLES.bodyTextSmall, { color: '#ec4899' }]}>
              പെൺ: {gender.female ? '✓' : '✗'} {count.female > 0 ? `(${count.female})` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * Boolean Grid (for yes/no checkboxes)
 */
export const BooleanGrid = ({ obj, labels = {} }) => {
  if (!obj) return null;

  const entries = Object.entries(obj);

  return (
    <View>
      {entries.map(([key, value], index) => {
        const label = labels[key] || key.replace(/([A-Z])/g, ' $1').trim();
        return (
          <Text key={index} style={[PDF_STYLES.bodyTextSmall, { marginBottom: 2 }]}>
            {`${label}: ${value ? 'അതെ' : 'അല്ല'}`}
          </Text>
        );
      })}
    </View>
  );
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  StandardPDFHeader,
  LetterheadHeader,
  InfoChipsRow,
  SectionHeader,
  FieldDisplay,
  StandardTable,
  TwoColumnTable,
  AttendanceTable,
  GenderBooleanGrid,
  GenderCountGrid,
  BooleanGrid,
};







