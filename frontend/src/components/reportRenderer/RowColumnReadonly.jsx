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

  return (
    <div className="overflow-x-auto mt-1">
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
  );
}
