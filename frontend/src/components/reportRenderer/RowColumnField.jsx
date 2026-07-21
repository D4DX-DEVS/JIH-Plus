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

  const thBase = 'border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600';
  const totalCell = 'border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-center font-semibold text-gray-800';

  return (
    <div className="overflow-x-auto">
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
  );
}
