import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function PageTabs({ pages, activeIndex, onSelect, onAdd, onRemove }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
      {pages.map((page, i) => (
        <div key={i} className="flex-shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={`px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors ${
              i === activeIndex
                ? 'border-blue-500 text-blue-700 bg-blue-50 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page.title || `Page ${i + 1}`}
          </button>
          {pages.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-gray-300 hover:text-red-400 p-1.5 rounded"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex-shrink-0 flex items-center gap-1 px-2 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
      >
        <Plus size={14} /> Add Page
      </button>
    </div>
  );
}
