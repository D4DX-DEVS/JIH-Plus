import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function PageTabs({ pages, activeIndex, onSelect, onAdd, onRemove }) {
  return (
    <div className="flex flex-col gap-2 pb-1 border-b border-gray-200 lg:flex-row lg:items-center lg:gap-1 lg:overflow-x-auto">
      {pages.map((page, i) => (
        <div key={i} className="flex w-full items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1 shadow-sm lg:w-auto lg:flex-shrink-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={`flex-1 px-3 py-2 text-left text-sm rounded-lg border-b-2 transition-colors lg:flex-none lg:text-center lg:rounded-t-md ${
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
              className="text-gray-300 hover:text-red-400 p-2 rounded lg:-m-1"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-2 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-600 lg:w-auto lg:flex-shrink-0 lg:justify-start lg:border-0"
      >
        <Plus size={14} /> Add Page
      </button>
    </div>
  );
}
