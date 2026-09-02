import React from 'react';
import {
  isCellInput, cellInputType, staticCellValue,
  showSumRow, showSumColumn, columnTotals, rowTotals, grandTotal,
} from '../../utils/rowColumnTable';

export default function RowColumnField({ field, value, onChange, disabled }) {
  const rows = field.rowTitles || ['Row 1'];
  const cols = field.columnTitles || ['Col 1'];

  // value is a 2D array: value[rowIndex][colIndex]
  const getCellValue = (r, c) => {
    if (!value || !value[r]) return '';
    return value[r][c] ?? '';
  };

  const setCellValue = (r, c, val) => {
    const grid = rows.map((_, ri) => cols.map((_, ci) => getCellValue(ri, ci)));
    grid[r][c] = val;
    onChange(grid);
  };

  const withSumRow = showSumRow(field);
  const withSumCol = showSumColumn(field);
  const colTotals = withSumRow ? columnTotals(field, value) : [];
  const rTotals = withSumCol ? rowTotals(field, value) : [];

  // Shared mobile-card cell styles. Both sides wrap instead of overflowing:
  // Malayalam column titles and values have no break opportunities of their own.
  const cellRow = 'flex items-start justify-between gap-3 px-3.5 py-2.5';
  const cellLabel = 'min-w-0 flex-1 text-xs leading-snug text-gray-500 break-words [overflow-wrap:anywhere]';
  const cellValue = 'min-w-0 max-w-[45%] text-right text-sm leading-snug break-words [overflow-wrap:anywhere]';

  const thBase = 'border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600';
  const totalCell = 'border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-center font-semibold text-gray-800';

  return (
    <>
    {/* Mobile view: each row becomes a stacked card with labelled inputs */}
    <div className="sm:hidden space-y-2.5">
      {rows.map((row, ri) => (
        <div key={ri} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-100 px-3.5 py-2 text-xs font-semibold leading-snug text-gray-700 break-words">{row}</div>
          <div className="divide-y divide-gray-100">
            {cols.map((col, ci) => (
              <div key={ci} className={cellRow}>
                <span className={cellLabel}>{col}</span>
                {isCellInput(field, ri, ci) ? (
                  <input
                    type={cellInputType(field, ci) === 'number' ? 'number' : 'text'}
                    value={getCellValue(ri, ci)}
                    onChange={e => setCellValue(ri, ci, e.target.value)}
                    disabled={disabled}
                    className="w-20 flex-shrink-0 px-2 py-1.5 text-base text-center border border-gray-200 rounded-lg outline-none focus:bg-blue-50 focus:border-blue-300 disabled:bg-gray-50"
                  />
                ) : (
                  <span className={`${cellValue} text-gray-700`}>{staticCellValue(field, ri, ci)}</span>
                )}
              </div>
            ))}
            {withSumCol && (
              <div className={`${cellRow} bg-gray-50`}>
                <span className={`${cellLabel} font-semibold text-gray-600`}>{field.sumColumnLabel || 'Total'}</span>
                <span className={`${cellValue} font-bold text-gray-800`}>{rTotals[ri] == null ? '' : rTotals[ri]}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      {withSumRow && (
        <div className="rounded-xl border border-gray-300 bg-gray-100 overflow-hidden">
          <div className="px-3.5 py-2 text-xs font-bold leading-snug text-gray-700 break-words">{field.sumRowLabel || 'Total'}</div>
          <div className="divide-y divide-gray-200">
            {cols.map((col, ci) => (
              <div key={ci} className={cellRow}>
                <span className={cellLabel}>{col}</span>
                <span className={`${cellValue} font-semibold text-gray-800`}>{colTotals[ci] == null ? '' : colTotals[ci]}</span>
              </div>
            ))}
            {withSumCol && (
              <div className={`${cellRow} bg-gray-200`}>
                <span className={`${cellLabel} font-bold text-gray-700`}>{field.sumColumnLabel || 'Total'}</span>
                <span className={`${cellValue} font-bold text-gray-900`}>{grandTotal(field, value)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Desktop view: full editable table */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {/* Top-left cell: optional table title */}
            <th className={`${thBase} text-left w-28`}>
              {field.firstColumnHeader || ''}
            </th>
            {cols.map((col, ci) => (
              <th key={ci} className={`${thBase} text-center`}>
                {col}
              </th>
            ))}
            {withSumCol && (
              <th className={`${thBase} text-center bg-gray-100`}>
                {field.sumColumnLabel || 'Total'}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700">
                {row}
              </td>
              {cols.map((_, ci) => (
                isCellInput(field, ri, ci) ? (
                  <td key={ci} className="border border-gray-300 p-1">
                    <input
                      type={cellInputType(field, ci) === 'number' ? 'number' : 'text'}
                      value={getCellValue(ri, ci)}
                      onChange={e => setCellValue(ri, ci, e.target.value)}
                      disabled={disabled}
                      className="w-full px-1.5 py-1 text-sm outline-none focus:bg-blue-50 rounded disabled:bg-gray-50 text-center"
                    />
                  </td>
                ) : (
                  <td key={ci} className="border border-gray-300 bg-gray-50/60 px-2 py-1.5 text-sm text-center text-gray-700">
                    {staticCellValue(field, ri, ci)}
                  </td>
                )
              ))}
              {withSumCol && (
                <td className={totalCell}>
                  {rTotals[ri] == null ? '' : rTotals[ri]}
                </td>
              )}
            </tr>
          ))}

          {withSumRow && (
            <tr>
              <td className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-700">
                {field.sumRowLabel || 'Total'}
              </td>
              {cols.map((_, ci) => (
                <td key={ci} className={totalCell}>
                  {colTotals[ci] == null ? '' : colTotals[ci]}
                </td>
              ))}
              {withSumCol && (
                <td className="border border-gray-300 bg-gray-200 px-2 py-1.5 text-sm text-center font-bold text-gray-900">
                  {grandTotal(field, value)}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}
