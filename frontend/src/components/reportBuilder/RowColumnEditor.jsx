import React from 'react';
import { Plus, X } from 'lucide-react';
import {
  getColumnMeta, getRowMeta, isCellInput, staticCellValue, sumAllowed, cellKey,
} from '../../utils/rowColumnTable';

// Reindex staticCells keys ("r_c") when a row or column is removed: drop keys on
// the removed line and shift keys past it down by one.
function reindexStaticCells(staticCells, { removeRow, removeCol }) {
  const out = {};
  Object.entries(staticCells || {}).forEach(([k, v]) => {
    let [r, c] = k.split('_').map(Number);
    if (removeCol != null) {
      if (c === removeCol) return;
      if (c > removeCol) c -= 1;
    }
    if (removeRow != null) {
      if (r === removeRow) return;
      if (r > removeRow) r -= 1;
    }
    out[`${r}_${c}`] = v;
  });
  return out;
}

const colKindValue = (m) => (m.kind === 'static' ? 'static' : m.inputType === 'number' ? 'number' : 'text');

export default function RowColumnEditor({ field, onChange }) {
  const rows = field.rowTitles || ['Row 1'];
  const cols = field.columnTitles || ['Col 1'];
  const topLeft = field.firstColumnHeader || '';
  const colMeta = getColumnMeta(field);
  const rowMeta = getRowMeta(field);
  const canSum = sumAllowed(field);

  // Every write keeps columnMeta/rowMeta parallel to their titles.
  const patch = (extra) => onChange({ ...field, columnMeta: colMeta, rowMeta, ...extra });

  const updateTopLeft = (val) => patch({ firstColumnHeader: val });

  const updateColTitle = (ci, val) =>
    patch({ columnTitles: cols.map((v, i) => (i === ci ? val : v)) });
  const updateRowTitle = (ri, val) =>
    patch({ rowTitles: rows.map((v, i) => (i === ri ? val : v)) });

  const setColKind = (ci, val) => {
    const entry =
      val === 'static' ? { kind: 'static', inputType: colMeta[ci].inputType }
        : val === 'number' ? { kind: 'input', inputType: 'number' }
          : { kind: 'input', inputType: 'text' };
    patch({ columnMeta: colMeta.map((m, i) => (i === ci ? entry : m)) });
  };
  const setRowKind = (ri, val) =>
    patch({ rowMeta: rowMeta.map((m, i) => (i === ri ? { kind: val } : m)) });

  const addColumn = () =>
    onChange({
      ...field,
      columnTitles: [...cols, `Col ${cols.length + 1}`],
      columnMeta: [...colMeta, { kind: 'input', inputType: 'text' }],
      rowMeta,
    });
  const removeColumn = (ci) =>
    onChange({
      ...field,
      columnTitles: cols.filter((_, i) => i !== ci),
      columnMeta: colMeta.filter((_, i) => i !== ci),
      rowMeta,
      staticCells: reindexStaticCells(field.staticCells, { removeCol: ci }),
    });

  const addRow = () =>
    onChange({
      ...field,
      rowTitles: [...rows, `Row ${rows.length + 1}`],
      rowMeta: [...rowMeta, { kind: 'input' }],
      columnMeta: colMeta,
    });
  const removeRow = (ri) =>
    onChange({
      ...field,
      rowTitles: rows.filter((_, i) => i !== ri),
      rowMeta: rowMeta.filter((_, i) => i !== ri),
      columnMeta: colMeta,
      staticCells: reindexStaticCells(field.staticCells, { removeRow: ri }),
    });

  const setStaticCell = (r, c, val) =>
    patch({ staticCells: { ...(field.staticCells || {}), [cellKey(r, c)]: val } });

  const cellBase = 'border border-gray-300 text-xs outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';
  const kindSelect = 'w-full text-[10px] rounded border border-gray-200 bg-white text-gray-600 px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">
        Set each column to <b>Static</b> (you fill the value), <b>Number</b> or <b>Text</b> (user fills).
        Rows can be <b>User input</b> or <b>Static</b>. A cell is admin-filled when its row or column is static.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {/* Top-left cell: optional table title */}
              <th className="border border-gray-300 bg-gray-50 p-0 min-w-[110px] align-top">
                <input
                  type="text"
                  value={topLeft}
                  onChange={e => updateTopLeft(e.target.value)}
                  placeholder="Title (optional)"
                  className={`${cellBase} w-full px-2 py-1.5 bg-gray-50 font-semibold text-gray-600 placeholder:font-normal placeholder:text-gray-300`}
                />
              </th>

              {/* Column header cells: title + kind selector */}
              {cols.map((c, ci) => (
                <th key={ci} className="border border-gray-300 bg-blue-50 p-0 min-w-[110px] align-top">
                  <div className="flex flex-col gap-0.5 px-1 py-0.5">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        value={c}
                        onChange={e => updateColTitle(ci, e.target.value)}
                        placeholder={`Col ${ci + 1}`}
                        className={`${cellBase} flex-1 px-1 py-1 bg-blue-50 font-semibold text-blue-800 min-w-0`}
                      />
                      {cols.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          className="text-red-300 hover:text-red-500 flex-shrink-0"
                          title="Remove column"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <select
                      value={colKindValue(colMeta[ci])}
                      onChange={e => setColKind(ci, e.target.value)}
                      className={kindSelect}
                      title="Column type"
                    >
                      <option value="text">Text (user)</option>
                      <option value="number">Number (user)</option>
                      <option value="static">Static (admin)</option>
                    </select>
                  </div>
                </th>
              ))}

              {/* Add column button cell */}
              <th className="border border-dashed border-gray-300 bg-gray-50 p-0 w-8">
                <button
                  type="button"
                  onClick={addColumn}
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
                {/* Row label cell: title + kind selector */}
                <td className="border border-gray-300 bg-gray-50 p-0 align-top">
                  <div className="flex flex-col gap-0.5 px-1 py-0.5">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        value={r}
                        onChange={e => updateRowTitle(ri, e.target.value)}
                        placeholder={`Row ${ri + 1}`}
                        className={`${cellBase} flex-1 px-1 py-1 bg-gray-50 font-medium text-gray-700 min-w-0`}
                      />
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(ri)}
                          className="text-red-300 hover:text-red-500 flex-shrink-0"
                          title="Remove row"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <select
                      value={rowMeta[ri].kind}
                      onChange={e => setRowKind(ri, e.target.value)}
                      className={kindSelect}
                      title="Row type"
                    >
                      <option value="input">User input</option>
                      <option value="static">Static (admin)</option>
                    </select>
                  </div>
                </td>

                {/* Data cells: static -> admin input; dynamic -> user-fill placeholder */}
                {cols.map((_, ci) => (
                  isCellInput(field, ri, ci) ? (
                    <td key={ci} className="border border-gray-200 bg-white px-2 py-1.5 text-center text-gray-300 italic">
                      —
                    </td>
                  ) : (
                    <td key={ci} className="border border-amber-200 bg-amber-50 p-0">
                      <input
                        type="text"
                        value={staticCellValue(field, ri, ci)}
                        onChange={e => setStaticCell(ri, ci, e.target.value)}
                        placeholder="admin value"
                        className={`${cellBase} w-full px-1.5 py-1 bg-amber-50 text-center text-gray-700 placeholder:text-amber-300`}
                      />
                    </td>
                  )
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
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={12} /> Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Auto-totals config ── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">Auto-totals (sum)</p>
          {!canSum && (
            <span className="text-[10px] text-amber-600">
              Available only when every user column is Number
            </span>
          )}
        </div>

        <label className={`flex items-center gap-2 text-xs ${canSum ? 'text-gray-700' : 'text-gray-400'}`}>
          <input
            type="checkbox"
            disabled={!canSum}
            checked={!!field.sumRow && canSum}
            onChange={e => onChange({ ...field, sumRow: e.target.checked })}
            className="rounded"
          />
          Totals row at the bottom (sums each column)
        </label>
        {field.sumRow && canSum && (
          <input
            type="text"
            value={field.sumRowLabel ?? 'Total'}
            onChange={e => onChange({ ...field, sumRowLabel: e.target.value })}
            placeholder="Row label (e.g. Total)"
            className="ml-6 w-40 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
          />
        )}

        <label className={`flex items-center gap-2 text-xs ${canSum ? 'text-gray-700' : 'text-gray-400'}`}>
          <input
            type="checkbox"
            disabled={!canSum}
            checked={!!field.sumColumn && canSum}
            onChange={e => onChange({ ...field, sumColumn: e.target.checked })}
            className="rounded"
          />
          Totals column on the right (sums each row)
        </label>
        {field.sumColumn && canSum && (
          <input
            type="text"
            value={field.sumColumnLabel ?? 'Total'}
            onChange={e => onChange({ ...field, sumColumnLabel: e.target.value })}
            placeholder="Column label (e.g. Total)"
            className="ml-6 w-40 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
          />
        )}
      </div>
    </div>
  );
}
