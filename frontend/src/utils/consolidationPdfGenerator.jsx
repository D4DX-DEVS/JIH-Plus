import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer';
import NotoSerifMalayalam from '../assets/fonts/NotoSerifMalayalam-Regular.ttf';
import jihLogo from '../assets/LogoColor.png';
import { PDF_BRANDING, formatDateTime } from './pdfStyleConfig';

// The consolidation screen as a PDF: the summary bar and every field card with
// its headline numbers. Drill-down data (who chose what, level-wise breakdowns)
// is left out on purpose.

// The Sans cut trips a fontkit mark-anchor bug; the Serif one renders cleanly.
Font.register({ family: 'Noto Serif Malayalam', src: NotoSerifMalayalam });

const NAVY = PDF_BRANDING.colors.primary;
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const KIND_BADGE = {
  choice: { label: 'Single choice', bg: '#eff6ff', color: '#1d4ed8' },
  multi: { label: 'Multiple choice', bg: '#faf5ff', color: '#7e22ce' },
  number: { label: 'Number', bg: '#ecfdf5', color: '#047857' },
  table: { label: 'Table totals', bg: '#fffbeb', color: '#b45309' },
  text: { label: 'Text', bg: '#f3f4f6', color: '#4b5563' },
};

const s = StyleSheet.create({
  page: { fontFamily: 'Noto Serif Malayalam', fontSize: 9, color: '#1f2937', padding: 24, paddingBottom: 36, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${PDF_BRANDING.colors.border}` },
  logo: { width: 70, height: 42, marginRight: 10 },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: NAVY },
  headerSub: { fontSize: 8, color: PDF_BRANDING.colors.textMuted, marginTop: 2 },

  summary: { backgroundColor: NAVY, borderRadius: 6, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  summarySub: { fontSize: 8, color: '#bfdbfe', marginTop: 2 },
  summaryPill: { backgroundColor: '#1a3a63', borderRadius: 5, paddingVertical: 5, paddingHorizontal: 8, flexDirection: 'row', marginLeft: 10 },
  summaryCount: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  summaryOf: { fontSize: 10, color: '#bfdbfe' },

  pageTitle: { fontSize: 10, fontWeight: 'bold', color: NAVY, borderBottom: '1px solid #e5e7eb', paddingBottom: 3, marginTop: 4, marginBottom: 6 },

  card: { border: '1px solid #e5e7eb', borderRadius: 6, padding: 9, marginBottom: 7 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLabel: { flex: 1, fontSize: 9.5, fontWeight: 'bold', color: '#1f2937', marginRight: 8 },
  badge: { fontSize: 7, borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 6 },

  choiceRow: { marginBottom: 5 },
  choiceLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  choiceLabel: { flex: 1, fontSize: 9, color: '#374151', marginRight: 8 },
  choiceCount: { fontSize: 9, fontWeight: 'bold', color: NAVY },
  choicePct: { fontSize: 7.5, color: '#9ca3af' },
  barTrack: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3 },
  bar: { height: 5, backgroundColor: NAVY, borderRadius: 3 },

  tiles: { flexDirection: 'row' },
  tile: { flex: 1, borderRadius: 5, paddingVertical: 7, alignItems: 'center', backgroundColor: '#f9fafb', marginRight: 5 },
  tileValue: { fontSize: 13, fontWeight: 'bold', color: NAVY },
  tileLabel: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  note: { fontSize: 7.5, color: '#9ca3af', marginTop: 4 },
  muted: { fontSize: 9, color: '#6b7280' },

  table: { border: '1px solid #e5e7eb' },
  tr: { flexDirection: 'row' },
  th: { fontSize: 7.5, fontWeight: 'bold', color: '#4b5563', backgroundColor: '#f9fafb', padding: 4, borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center' },
  td: { fontSize: 8.5, color: '#1f2937', padding: 4, borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center' },

  message: { border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, textAlign: 'center', color: '#6b7280' },
  footer: { position: 'absolute', bottom: 14, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
});

const ChoiceRows = ({ field, submittedCount }) => {
  const rows = field.options.map(opt => ({ label: opt, count: field.counts[opt] || 0 }));
  if (field.notAnswered > 0) {
    rows.push({ label: 'Not answered / ഉത്തരം നൽകിയിട്ടില്ല', count: field.notAnswered, muted: true });
  }
  return rows.map((row, i) => {
    const p = pct(row.count, submittedCount);
    return (
      <View key={i} style={s.choiceRow} wrap={false}>
        <View style={s.choiceLine}>
          <Text style={[s.choiceLabel, row.muted && { color: '#9ca3af' }]}>{row.label}</Text>
          <Text style={[s.choiceCount, row.muted && { color: '#9ca3af' }]}>
            {row.count} <Text style={s.choicePct}>({p}%)</Text>
          </Text>
        </View>
        <View style={s.barTrack}>
          {p > 0 && <View style={[s.bar, { width: `${p}%` }, row.muted && { backgroundColor: '#d1d5db' }]} />}
        </View>
      </View>
    );
  });
};

const NumberTiles = ({ field }) => {
  const tiles = [
    { label: 'Total / ആകെ', value: field.sum },
    { label: 'Average / ശരാശരി', value: Math.round(field.avg * 100) / 100 },
    { label: 'Lowest', value: field.min ?? '—' },
    { label: 'Highest', value: field.max ?? '—' },
  ];
  return (
    <View>
      <View style={s.tiles}>
        {tiles.map((t, i) => (
          <View key={i} style={[s.tile, i === 0 && { backgroundColor: NAVY }, i === tiles.length - 1 && { marginRight: 0 }]}>
            <Text style={[s.tileValue, i === 0 && { color: '#ffffff' }]}>{String(t.value)}</Text>
            <Text style={[s.tileLabel, i === 0 && { color: '#bfdbfe' }]}>{t.label}</Text>
          </View>
        ))}
      </View>
      {field.notAnswered > 0 && <Text style={s.note}>{field.notAnswered} did not answer</Text>}
    </View>
  );
};

const TableTotals = ({ field }) => {
  const { rowTitles, columnTitles, cellSums } = field;
  const colSummable = columnTitles.map((_, ci) => cellSums.some(r => r[ci] !== null));
  if (!colSummable.some(Boolean)) {
    return <Text style={s.muted}>This table has no number columns to sum. / ഈ ടേബിളിൽ കൂട്ടാവുന്ന നമ്പർ കോളങ്ങളില്ല.</Text>;
  }
  const colTotals = columnTitles.map((_, ci) =>
    colSummable[ci] ? cellSums.reduce((t, r) => t + (r[ci] ?? 0), 0) : null
  );
  const rowTotals = rowTitles.map((_, ri) =>
    cellSums[ri].some(v => v !== null) ? cellSums[ri].reduce((t, v) => t + (v ?? 0), 0) : null
  );
  const grand = colTotals.reduce((t, v) => t + (v ?? 0), 0);
  const first = { width: '28%', textAlign: 'left' };
  const col = { width: `${72 / (columnTitles.length + 1)}%` };
  const cell = v => (v === null ? '—' : String(v));
  return (
    <View style={s.table}>
      <View style={s.tr} wrap={false}>
        <Text style={[s.th, first]}>{field.firstColumnHeader || ''}</Text>
        {columnTitles.map((c, ci) => <Text key={ci} style={[s.th, col]}>{c}</Text>)}
        <Text style={[s.th, col, { backgroundColor: '#f3f4f6' }]}>Total / ആകെ</Text>
      </View>
      {rowTitles.map((row, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          <Text style={[s.th, first, { fontWeight: 'normal', color: '#374151' }]}>{row}</Text>
          {columnTitles.map((_, ci) => <Text key={ci} style={[s.td, col]}>{cell(cellSums[ri][ci])}</Text>)}
          <Text style={[s.td, col, { backgroundColor: '#f9fafb', fontWeight: 'bold', color: NAVY }]}>{cell(rowTotals[ri])}</Text>
        </View>
      ))}
      <View style={s.tr} wrap={false}>
        <Text style={[s.th, first, { backgroundColor: '#f3f4f6', color: '#374151' }]}>Total / ആകെ</Text>
        {columnTitles.map((_, ci) => (
          <Text key={ci} style={[s.td, col, { backgroundColor: '#f3f4f6', fontWeight: 'bold', color: NAVY }]}>{cell(colTotals[ci])}</Text>
        ))}
        <Text style={[s.td, col, { backgroundColor: NAVY, fontWeight: 'bold', color: '#ffffff' }]}>{grand}</Text>
      </View>
    </View>
  );
};

// Cards stay whole on one page; only a table too long for a page may split.
const canSplit = field => field.kind === 'table' && field.rowTitles.length > 20;

const FieldCard = ({ field, submittedCount }) => {
  const badge = KIND_BADGE[field.kind] || KIND_BADGE.text;
  return (
    <View style={s.card} wrap={canSplit(field)}>
      <View style={s.cardHead} minPresenceAhead={40}>
        <Text style={s.cardLabel}>{field.label}</Text>
        <Text style={[s.badge, { backgroundColor: badge.bg, color: badge.color }]}>{badge.label}</Text>
      </View>
      {(field.kind === 'choice' || field.kind === 'multi') && <ChoiceRows field={field} submittedCount={submittedCount} />}
      {field.kind === 'number' && <NumberTiles field={field} />}
      {field.kind === 'table' && <TableTotals field={field} />}
      {field.kind === 'text' && (
        <Text style={s.muted}>Written answers are not consolidated ({field.answered} answered).</Text>
      )}
    </View>
  );
};

const ConsolidationDocument = ({ result, subtitle }) => {
  const { report, stats } = result;
  return (
    <Document title={`Consolidation - ${report.title}`}>
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <Image src={jihLogo} style={s.logo} />
          <View>
            <Text style={s.headerTitle}>കൺസോളിഡേഷൻ / Consolidation</Text>
            <Text style={s.headerSub}>Generated: {formatDateTime(new Date())}</Text>
          </View>
        </View>

        <View style={s.summary} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryTitle}>{report.title}</Text>
            {subtitle ? <Text style={s.summarySub}>{subtitle}</Text> : null}
          </View>
          <View style={s.summaryPill}>
            <Text style={s.summaryOf}>
              <Text style={s.summaryCount}>{stats.submittedCount}</Text> / {stats.totalLocations} submitted ({stats.submissionRate}%)
            </Text>
          </View>
        </View>

        {result.legacy ? (
          <Text style={s.message}>This is a legacy report — answer consolidation is not available for old-format forms.</Text>
        ) : stats.submittedCount === 0 ? (
          <Text style={s.message}>No submissions yet for the selected report and location. / തിരഞ്ഞെടുത്ത ഫോമിനും സ്ഥലത്തിനും ഇതുവരെ സബ്മിഷനുകളില്ല.</Text>
        ) : (
          result.pages.map(pg => {
            const [first, ...rest] = pg.fields;
            return (
              <View key={pg.id}>
                {/* The section heading never ends a page on its own: it travels with its first card. */}
                <View wrap={Boolean(first && canSplit(first))}>
                  <Text style={s.pageTitle}>{pg.title}</Text>
                  {first && <FieldCard field={first} submittedCount={stats.submittedCount} />}
                </View>
                {rest.map(field => (
                  <FieldCard key={field.id} field={field} submittedCount={stats.submittedCount} />
                ))}
              </View>
            );
          })
        )}

        <View style={s.footer} fixed>
          <Text>{report.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

const safeFileName = (name) => (name || 'consolidation').trim().replace(/[\\/:*?"<>|\s]+/g, '_');

// `subtitle` is the period · location line shown under the title on screen.
export const downloadConsolidationPdf = async (result, subtitle) => {
  if (!result?.report) return;
  const blob = await pdf(<ConsolidationDocument result={result} subtitle={subtitle} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Consolidation-${safeFileName(result.report.title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
