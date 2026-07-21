import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer';
import NotoSerifMalayalam from '../assets/fonts/NotoSerifMalayalam-Regular.ttf';
import jihLogo from '../assets/LogoColor.png';

import {
  PDF_STYLES,
  PDF_TYPOGRAPHY,
  safeToString,
  formatDateTime,
} from './pdfStyleConfig';
import {
  displayCellValue, showSumRow, showSumColumn, columnTotals, rowTotals, grandTotal,
} from './rowColumnTable';

Font.register({ family: 'Noto Serif Malayalam', src: NotoSerifMalayalam });

const styles = StyleSheet.create({
  page: PDF_STYLES.page,
  header: PDF_STYLES.header,
  logo: PDF_STYLES.logo,
  title: PDF_STYLES.documentTitle,
  sub: PDF_STYLES.subtitle,
  chipRow: PDF_STYLES.chipRow,
  chip: PDF_STYLES.chip,
  rowTable: {
    display: 'table',
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    marginTop: 4,
  },
  rowTableRow: {
    flexDirection: 'row',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  },
  rowTableHeaderCell: {
    flexGrow: 0,
    flexShrink: 0,
    padding: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: 'bold',
    color: '#4b5563',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
  },
  rowTableFirstHeaderCell: {
    flexGrow: 0,
    flexShrink: 0,
    padding: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: 'bold',
    color: '#4b5563',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'left',
  },
  rowTableCell: {
    flexGrow: 0,
    flexShrink: 0,
    padding: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    color: '#111827',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'center',
  },
  rowTableFirstCell: {
    flexGrow: 0,
    flexShrink: 0,
    padding: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    textAlign: 'left',
  },
  pageSection: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  pageSectionTitle: {
    fontSize: PDF_TYPOGRAPHY.sizes.subsectionTitle,
    fontWeight: 'bold',
    color: '#002349',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid #e5e7eb',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
  fieldBlock: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeft: '3px solid #002349',
  },
  fieldLabel: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 2,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
  fieldValue: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    color: '#111827',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    lineHeight: 1.4,
  },
  emptyValue: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    color: '#9ca3af',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
});

const isEmptyValue = (value) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

const FieldValue = ({ field, value }) => {
  // Row/table renders even when blank, so admin static cells still show.
  if (field?.type === 'row') {
    const rows = field.rowTitles || [];
    const cols = field.columnTitles || [];
    const grid = Array.isArray(value) ? value : [];
    const withSumRow = showSumRow(field);
    const withSumCol = showSumColumn(field);
    const colTotals = withSumRow ? columnTotals(field, grid) : [];
    const rTotals = withSumCol ? rowTotals(field, grid) : [];
    const firstColWidth = '30%';
    const dataCount = cols.length + (withSumCol ? 1 : 0);
    const dataColWidth = `${70 / Math.max(dataCount, 1)}%`;
    return (
      <View style={styles.rowTable}>
        <View style={styles.rowTableRow}>
          <Text style={{ ...styles.rowTableFirstHeaderCell, width: firstColWidth }}>{field.firstColumnHeader || ''}</Text>
          {cols.map((col, ci) => (
            <Text key={ci} style={{ ...styles.rowTableHeaderCell, width: dataColWidth }}>{col}</Text>
          ))}
          {withSumCol && (
            <Text style={{ ...styles.rowTableHeaderCell, width: dataColWidth }}>{field.sumColumnLabel || 'Total'}</Text>
          )}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.rowTableRow}>
            <Text style={{ ...styles.rowTableFirstCell, width: firstColWidth }}>{row}</Text>
            {cols.map((_, ci) => (
              <Text key={ci} style={{ ...styles.rowTableCell, width: dataColWidth }}>{safeToString(displayCellValue(field, grid, ri, ci))}</Text>
            ))}
            {withSumCol && (
              <Text style={{ ...styles.rowTableHeaderCell, width: dataColWidth }}>{rTotals[ri] == null ? '' : safeToString(rTotals[ri])}</Text>
            )}
          </View>
        ))}
        {withSumRow && (
          <View style={styles.rowTableRow}>
            <Text style={{ ...styles.rowTableFirstHeaderCell, width: firstColWidth }}>{field.sumRowLabel || 'Total'}</Text>
            {cols.map((_, ci) => (
              <Text key={ci} style={{ ...styles.rowTableHeaderCell, width: dataColWidth }}>{colTotals[ci] == null ? '' : safeToString(colTotals[ci])}</Text>
            ))}
            {withSumCol && (
              <Text style={{ ...styles.rowTableHeaderCell, width: dataColWidth }}>{safeToString(grandTotal(field, grid))}</Text>
            )}
          </View>
        )}
      </View>
    );
  }

  if (isEmptyValue(value)) {
    return <Text style={styles.emptyValue}>ഉത്തരം നൽകിയിട്ടില്ല</Text>;
  }

  if (Array.isArray(value)) {
    return <Text style={styles.fieldValue}>{value.map(safeToString).join(', ')}</Text>;
  }

  if (typeof value === 'boolean' || field?.type === 'yesno') {
    const yes = value === true || value === 'Yes';
    return <Text style={styles.fieldValue}>{yes ? 'Yes' : 'No'}</Text>;
  }

  if ((field?.type === 'date' || field?.type === 'datetime') && value) {
    return <Text style={styles.fieldValue}>{formatDateTime(value)}</Text>;
  }

  return <Text style={styles.fieldValue}>{safeToString(value)}</Text>;
};

const Header = ({ report, userContext }) => (
  <View style={styles.header}>
    <Image src={jihLogo} style={styles.logo} />
    <View>
      <Text style={styles.title}>{report?.title || 'Report'}</Text>
      <Text style={styles.sub}>
        {[userContext?.district, userContext?.area, userContext?.unit].filter(Boolean).join(' • ')}
      </Text>
    </View>
  </View>
);

const MetaRow = ({ report, submission, pageLabel }) => (
  <View style={styles.chipRow}>
    <Text style={styles.chip}>Type: {report?.type || '-'}</Text>
    <Text style={styles.chip}>Status: {submission?.status === 'submitted' ? 'Submitted' : 'Pending'}</Text>
    <Text style={styles.chip}>Submitted: {submission?.submittedAt ? formatDateTime(submission.submittedAt) : '-'}</Text>
    {pageLabel && <Text style={styles.chip}>{pageLabel}</Text>}
  </View>
);

const NewFormatPage = ({ page, submission }) => (
  <View style={styles.pageSection}>
    {page.title && <Text style={styles.pageSectionTitle}>{page.title}</Text>}
    {(page.fields || [])
      .filter(f => !['title', 'html'].includes(f.type))
      .map(field => (
        <View key={field.id} style={styles.fieldBlock} wrap={false}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <FieldValue field={field} value={submission.formData?.[`field_${field.id}`]} />
        </View>
      ))}
  </View>
);

const getLegacyAnswer = (submission, partIndex, questionIndex) => {
  if (!submission || !Array.isArray(submission.answers)) return null;
  const found = submission.answers.find(a =>
    String(a.partId) === String(partIndex) && String(a.questionId) === String(questionIndex)
  );
  return found ? found.answer : null;
};

const LegacyPart = ({ part, partIndex, submission }) => (
  <View style={styles.pageSection}>
    <Text style={styles.pageSectionTitle}>{part.partName || `Section ${partIndex + 1}`}</Text>
    {(part.questions || []).map((question, questionIndex) => (
      <View key={questionIndex} style={styles.fieldBlock} wrap={false}>
        <Text style={styles.fieldLabel}>{question.questionText}</Text>
        <FieldValue field={question.answerType ? { type: question.answerType } : null} value={getLegacyAnswer(submission, partIndex, questionIndex)} />
      </View>
    ))}
  </View>
);

const ReportSubmissionDocument = ({ report, submission, userContext }) => {
  const isNewFormat = report?.pages && report.pages.length > 0;
  const sections = isNewFormat ? (report.pages || []) : (report.parts || []);

  if (sections.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Header report={report} userContext={userContext} />
          <MetaRow report={report} submission={submission} />
          <Text style={styles.fieldValue}>No form structure available for this report.</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {sections.map((section, idx) => (
        // Each report page/section is rendered on its own physical PDF page so
        // pages are never combined even when one has leftover space.
        <Page key={idx} size="A4" style={styles.page} wrap>
          {idx === 0 && <Header report={report} userContext={userContext} />}
          <MetaRow report={report} submission={submission} pageLabel={`Page ${idx + 1} of ${sections.length}`} />
          {isNewFormat ? (
            <NewFormatPage page={section} submission={submission} />
          ) : (
            <LegacyPart part={section} partIndex={idx} submission={submission} />
          )}
        </Page>
      ))}
    </Document>
  );
};

export const downloadDynamicReportPdf = async (report, submission, userData = {}) => {
  if (!report || !submission) return;

  const userContext = {
    district: userData?.district || userData?.districtName,
    area: userData?.area || userData?.areaName,
    unit: userData?.unit || userData?.unitName,
  };

  const blob = await pdf(
    <ReportSubmissionDocument report={report} submission={submission} userContext={userContext} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (report.title || 'report').trim().replace(/[\\/:*?"<>|\s]+/g, '_');
  a.href = url;
  a.download = `${safeTitle}-${submission._id?.slice(-6) || 'submission'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default downloadDynamicReportPdf;
