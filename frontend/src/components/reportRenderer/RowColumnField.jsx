import React from 'react';

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {/* Top-left cell: optional table title */}
            <th className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-left text-xs font-medium text-gray-600 w-28">
              {field.firstColumnHeader || ''}
            </th>
            {cols.map((col, ci) => (
              <th key={ci} className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-center text-xs font-medium text-gray-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700">
                {row}
              </td>
              {cols.map((_, ci) => (
                <td key={ci} className="border border-gray-300 p-1">
                  <input
                    type="text"
                    value={getCellValue(ri, ci)}
                    onChange={e => setCellValue(ri, ci, e.target.value)}
                    disabled={disabled}
                    className="w-full px-1.5 py-1 text-sm outline-none focus:bg-blue-50 rounded disabled:bg-gray-50 text-center"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
