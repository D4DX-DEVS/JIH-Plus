import React from 'react';
import {
  displayCellValue, showSumRow, showSumColumn, columnTotals, rowTotals, grandTotal,
} from '../../utils/rowColumnTable';

// Read-only render of a `row` (table) field: static cells show the admin value,
// user-input cells show the submitted value, plus optional totals row/column.
// Shared by SubmissionPreviewModal and ReportSubmissionsPage.
export default function RowColumnReadonly({ field, value }) {
  const rows = field.rowTitles || [];
  const cols = field.columnTitles || [];
  const grid = Array.isArray(value) ? value : [];
  const withSumRow = showSumRow(field);
  const withSumCol = showSumColumn(field);
  const colTotals = withSumRow ? columnTotals(field, grid) : [];
  const rTotals = withSumCol ? rowTotals(field, grid) : [];

  // Mobile-card cell styles; both sides wrap so long Malayalam strings stay
  // inside the card border.
  const cellRow = 'flex items-start justify-between gap-3 px-3.5 py-2';
  const cellLabel = 'min-w-0 flex-1 text-xs leading-snug text-gray-500 break-words [overflow-wrap:anywhere]';
  const cellValue = 'min-w-0 max-w-[45%] text-right text-sm leading-snug break-words [overflow-wrap:anywhere]';

  return (
    <>
    {/* Mobile view: each row becomes a stacked card (no horizontal scroll) */}
    <div className="sm:hidden space-y-2.5 mt-1">
      {rows.map((row, ri) => (
        <div key={ri} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-100 px-3.5 py-2 text-xs font-semibold leading-snug text-gray-700 break-words">{row}</div>
          <div className="divide-y divide-gray-100">
            {cols.map((col, ci) => (
              <div key={ci} className={cellRow}>
                <span className={cellLabel}>{col}</span>
                <span className={`${cellValue} font-medium text-gray-900`}>
                  {String(displayCellValue(field, grid, ri, ci) ?? '')}
                </span>
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
                <span className={`${cellValue} font-bold text-gray-900`}>{grandTotal(field, grid)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Desktop view: full table */}
    <div className="hidden sm:block overflow-x-auto mt-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[7rem]">
              {field.firstColumnHeader || ''}
            </th>
            {cols.map((col, ci) => (
              <th key={ci} className="border border-gray-300 bg-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                {col}
              </th>
            ))}
            {withSumCol && (
              <th className="border border-gray-300 bg-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                {field.sumColumnLabel || 'Total'}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700">{row}</td>
              {cols.map((_, ci) => (
                <td key={ci} className="border border-gray-300 px-3 py-2 text-sm text-center text-gray-900">
                  {String(displayCellValue(field, grid, ri, ci) ?? '')}
                </td>
              ))}
              {withSumCol && (
                <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-center font-semibold text-gray-800">
                  {rTotals[ri] == null ? '' : rTotals[ri]}
                </td>
              )}
            </tr>
          ))}
          {withSumRow && (
            <tr>
              <td className="border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                {field.sumRowLabel || 'Total'}
              </td>
              {cols.map((_, ci) => (
                <td key={ci} className="border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-center font-semibold text-gray-800">
                  {colTotals[ci] == null ? '' : colTotals[ci]}
                </td>
              ))}
              {withSumCol && (
                <td className="border border-gray-300 bg-gray-200 px-3 py-2 text-sm text-center font-bold text-gray-900">
                  {grandTotal(field, grid)}
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
