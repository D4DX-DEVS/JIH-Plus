import React, { useLayoutEffect, useRef } from 'react';

// Keep the original controls and handlers mounted. Only the phone presentation
// changes; desktop and print retain the native table layout.
export default function ResponsiveTable({ children, className = '', ...props }) {
  const tableRef = useRef(null);
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const headerGrid = [];
    Array.from(table.tHead?.rows || []).forEach((row, ri) => {
      headerGrid[ri] ||= [];
      let column = 0;
      Array.from(row.cells).forEach(cell => {
        while (headerGrid[ri][column] !== undefined) column++;
        const label = cell.textContent.trim();
        for (let r = ri; r < ri + cell.rowSpan; r++) {
          headerGrid[r] ||= [];
          for (let c = column; c < column + cell.colSpan; c++) headerGrid[r][c] = label;
        }
        column += cell.colSpan;
      });
    });
    const labels = Array.from({ length: Math.max(0, ...headerGrid.map(row => row.length)) }, (_, ci) =>
      [...new Set(headerGrid.map(row => row[ci]).filter(Boolean))].join(' · '));
    table.classList.toggle('responsive-table-header-actions', Boolean(table.tHead?.querySelector('button,input,select,a')));
    Array.from(table.tBodies).concat(table.tFoot ? [table.tFoot] : []).forEach(section => {
      const occupied = [];
      Array.from(section.rows).forEach(row => {
        let column = 0;
        Array.from(row.cells).forEach(cell => {
          while (occupied[column] > 0) column++;
          const label = [...new Set(labels.slice(column, column + cell.colSpan))].filter(Boolean).join(' / ');
          cell.dataset.mobileLabel = label;
          if (cell.colSpan > 1) cell.dataset.mobileWide = 'true';
          else delete cell.dataset.mobileWide;
          for (let c = column; c < column + cell.colSpan; c++) occupied[c] = cell.rowSpan;
          column += cell.colSpan;
        });
        for (let c = 0; c < occupied.length; c++) occupied[c] = Math.max(0, (occupied[c] || 0) - 1);
      });
    });
  }, [children]);
  return <table {...props} ref={tableRef} className={`responsive-record-table ${className}`}>{children}</table>;
}
