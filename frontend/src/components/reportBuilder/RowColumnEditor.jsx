import React from 'react';
import { Plus, X } from 'lucide-react';

export default function RowColumnEditor({ field, onChange }) {
  const rows = field.rowTitles || ['Row 1'];
  const cols = field.columnTitles || ['Col 1'];
  const topLeft = field.firstColumnHeader || '';

  const updateRows = (newRows) => onChange({ ...field, rowTitles: newRows });
  const updateCols = (newCols) => onChange({ ...field, columnTitles: newCols });
  const updateTopLeft = (val) => onChange({ ...field, firstColumnHeader: val });

  const cellBase = 'border border-gray-300 text-xs outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">
        Edit directly in the table. First column is the row label; top row is column headers.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {/* Top-left cell: optional table title */}
              <th className="border border-gray-300 bg-gray-50 p-0 min-w-[100px]">
                <input
                  type="text"
                  value={topLeft}
                  onChange={e => updateTopLeft(e.target.value)}
                  placeholder="Title (optional)"
                  className={`${cellBase} w-full px-2 py-1.5 bg-gray-50 font-semibold text-gray-600 placeholder:font-normal placeholder:text-gray-300`}
                />
              </th>

              {/* Column header cells */}
              {cols.map((c, ci) => (
                <th key={ci} className="border border-gray-300 bg-blue-50 p-0 min-w-[90px]">
                  <div className="flex items-center gap-0.5 px-1 py-0.5">
                    <input
                      type="text"
                      value={c}
                      onChange={e => updateCols(cols.map((v, idx) => idx === ci ? e.target.value : v))}
                      placeholder={`Col ${ci + 1}`}
                      className={`${cellBase} flex-1 px-1 py-1 bg-blue-50 font-semibold text-blue-800 min-w-0`}
                    />
                    {cols.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updateCols(cols.filter((_, idx) => idx !== ci))}
                        className="text-red-300 hover:text-red-500 flex-shrink-0"
                        title="Remove column"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </th>
              ))}

              {/* Add column button cell */}
              <th className="border border-dashed border-gray-300 bg-gray-50 p-0 w-8">
                <button
                  type="button"
                  onClick={() => updateCols([...cols, `Col ${cols.length + 1}`])}
                  className="w-full h-full flex items-center justify-center py-2 text-blue-500 hover:bg-blue-50 transition-colors"
                  title="Add column"
                >
                  <Plus size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {/* Row title cell */}
                <td className="border border-gray-300 bg-gray-50 p-0">
                  <div className="flex items-center gap-0.5 px-1 py-0.5">
                    <input
                      type="text"
                      value={r}
                      onChange={e => updateRows(rows.map((v, idx) => idx === ri ? e.target.value : v))}
                      placeholder={`Row ${ri + 1}`}
                      className={`${cellBase} flex-1 px-1 py-1 bg-gray-50 font-medium text-gray-700 min-w-0`}
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updateRows(rows.filter((_, idx) => idx !== ri))}
                        className="text-red-300 hover:text-red-500 flex-shrink-0"
                        title="Remove row"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </td>

                {/* Data cells (read-only placeholders showing user will fill these) */}
                {cols.map((_, ci) => (
                  <td key={ci} className="border border-gray-200 bg-white px-2 py-1.5 text-center text-gray-300 italic">
                    —
                  </td>
                ))}

                {/* Empty cell under add-column */}
                <td className="border border-dashed border-gray-200 bg-gray-50" />
              </tr>
            ))}

            {/* Add row button row */}
            <tr>
              <td
                colSpan={cols.length + 2}
                className="border border-dashed border-gray-300 bg-gray-50 p-0"
              >
                <button
                  type="button"
                  onClick={() => updateRows([...rows, `Row ${rows.length + 1}`])}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={12} /> Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
