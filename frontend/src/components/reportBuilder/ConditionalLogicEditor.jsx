import React from 'react';

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_empty', label: 'is not empty' },
  { value: 'empty', label: 'is empty' },
];

const ACTIONS = [
  { value: 'show', label: 'Show this field' },
  { value: 'hide', label: 'Hide this field' },
  { value: 'require', label: 'Make required' },
  { value: 'optional', label: 'Make optional' },
];

export default function ConditionalLogicEditor({ logic, allFields, currentFieldId, onChange }) {
  const cl = logic || {};
  const update = (key, val) => onChange({ ...cl, [key]: val });
  const clear = () => onChange(null);

  const triggerFields = allFields.filter(f => f.id !== currentFieldId && !['title', 'html'].includes(f.type));

  return (
    <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-yellow-800">Conditional Logic</p>
        {cl.field && (
          <button type="button" onClick={clear} className="text-xs text-red-500 hover:text-red-700">
            Clear
          </button>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">When field</label>
        <select
          value={cl.field ?? ''}
          onChange={e => update('field', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">Select a field...</option>
          {triggerFields.map(f => (
            <option key={f.id} value={f.id}>#{f.id} {f.label || f.type}</option>
          ))}
        </select>
      </div>
      {cl.field && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Operator</label>
              <select
                value={cl.operator ?? 'equals'}
                onChange={e => update('operator', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Value</label>
              <input
                type="text"
                value={cl.value ?? ''}
                onChange={e => update('value', e.target.value)}
                placeholder="Expected value"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Then</label>
            <select
              value={cl.action ?? 'show'}
              onChange={e => update('action', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
            >
              {ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
