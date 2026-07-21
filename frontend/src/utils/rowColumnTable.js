// Shared logic for the advanced `row` (table) field type.
// Used by the builder editor, the submission form, and every read-only render
// surface (preview modal, submissions page, PDF) so cell-resolution and totals
// math stay identical everywhere.
//
// Backward compat: legacy `row` fields carry no meta at all. The getters below
// backfill defaults (every row/column is a user-input text cell, no totals), so
// old fields behave exactly as before.

export const cellKey = (r, c) => `${r}_${c}`;

// Normalized per-column meta parallel to field.columnTitles.
export function getColumnMeta(field) {
  const cols = field.columnTitles || [];
  const meta = field.columnMeta || [];
  return cols.map((_, ci) => {
    const m = meta[ci] || {};
    const kind = m.kind === 'static' ? 'static' : 'input';
    const inputType = m.inputType === 'number' ? 'number' : 'text';
    return { kind, inputType };
  });
}

// Normalized per-row meta parallel to field.rowTitles.
export function getRowMeta(field) {
  const rows = field.rowTitles || [];
  const meta = field.rowMeta || [];
  return rows.map((_, ri) => {
    const m = meta[ri] || {};
    return { kind: m.kind === 'static' ? 'static' : 'input' };
  });
}

// A cell is a user-input cell only when BOTH its row and column are dynamic.
export function isCellInput(field, r, c) {
  const rowMeta = getRowMeta(field);
  const colMeta = getColumnMeta(field);
  return rowMeta[r]?.kind === 'input' && colMeta[c]?.kind === 'input';
}

// input type of the cell's column ('text' | 'number'); meaningless for static cells.
export function cellInputType(field, c) {
  return getColumnMeta(field)[c]?.inputType || 'text';
}

// Admin-entered value for a static cell.
export function staticCellValue(field, r, c) {
  return (field.staticCells || {})[cellKey(r, c)] ?? '';
}

// Value shown for a cell: static -> admin value; input -> the submitted value.
export function displayCellValue(field, value, r, c) {
  if (isCellInput(field, r, c)) {
    return value?.[r]?.[c] ?? '';
  }
  return staticCellValue(field, r, c);
}

// Sum is only allowed when every user-input column is a Number column (any Text
// input column blocks it). Matches the "all submission entries must be number" rule.
export function sumAllowed(field) {
  const colMeta = getColumnMeta(field);
  const inputCols = colMeta.filter(m => m.kind === 'input');
  if (inputCols.length === 0) return false;
  return inputCols.every(m => m.inputType === 'number');
}

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// A column contributes to totals only if it is a user-input number column.
function isSummableColumn(colMeta, c) {
  return colMeta[c]?.kind === 'input' && colMeta[c]?.inputType === 'number';
}

// Per-column totals (bottom row). Returns array parallel to columns; null for
// non-summable columns.
export function columnTotals(field, value) {
  const rowMeta = getRowMeta(field);
  const colMeta = getColumnMeta(field);
  return colMeta.map((_, c) => {
    if (!isSummableColumn(colMeta, c)) return null;
    let sum = 0;
    rowMeta.forEach((rm, r) => {
      if (rm.kind === 'input') sum += toNum(value?.[r]?.[c]);
    });
    return sum;
  });
}

// Per-row totals (right column). Returns array parallel to rows; null for static rows.
export function rowTotals(field, value) {
  const rowMeta = getRowMeta(field);
  const colMeta = getColumnMeta(field);
  return rowMeta.map((rm, r) => {
    if (rm.kind !== 'input') return null;
    let sum = 0;
    colMeta.forEach((_, c) => {
      if (isSummableColumn(colMeta, c)) sum += toNum(value?.[r]?.[c]);
    });
    return sum;
  });
}

// Grand total of every user-input number cell (bottom-right corner).
export function grandTotal(field, value) {
  const rowMeta = getRowMeta(field);
  const colMeta = getColumnMeta(field);
  let sum = 0;
  rowMeta.forEach((rm, r) => {
    if (rm.kind !== 'input') return;
    colMeta.forEach((_, c) => {
      if (isSummableColumn(colMeta, c)) sum += toNum(value?.[r]?.[c]);
    });
  });
  return sum;
}

// Whether to actually render each totals line (enabled AND allowed).
export const showSumRow = (field) => !!field.sumRow && sumAllowed(field);
export const showSumColumn = (field) => !!field.sumColumn && sumAllowed(field);
