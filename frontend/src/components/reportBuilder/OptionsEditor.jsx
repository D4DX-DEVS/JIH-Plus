import React from 'react';
import { Plus, X } from 'lucide-react';

export default function OptionsEditor({ options = [], onChange }) {
  const add = () => onChange([...options, '']);
  const update = (i, val) => onChange(options.map((o, idx) => (idx === i ? val : o)));
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={opt}
            onChange={e => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-base sm:text-sm focus:ring-1 focus:ring-blue-400 outline-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-red-400 hover:text-red-600 p-1.5 -m-1.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 py-1.5"
      >
        <Plus size={12} /> Add option
      </button>
    </div>
  );
}
