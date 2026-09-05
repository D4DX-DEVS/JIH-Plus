import React from 'react';

export default function ValidationEditor({ validation = {}, fieldType, onChange }) {
  const update = (key, val) => onChange({ ...validation, [key]: val === '' ? undefined : val });

  const isText = ['text', 'textarea', 'email', 'phone', 'url', 'password'].includes(fieldType);
  const isNum = fieldType === 'number';

  return (
    <div className="space-y-2">
      {(isText || isNum) && (
        <div className="grid grid-cols-2 gap-2">
          {isText && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Length</label>
                <input
                  type="number"
                  min={0}
                  value={validation.minLength ?? ''}
                  onChange={e => update('minLength', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Length</label>
                <input
                  type="number"
                  min={0}
                  value={validation.maxLength ?? ''}
                  onChange={e => update('maxLength', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </>
          )}
          {isNum && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={validation.min ?? ''}
                  onChange={e => update('min', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={validation.max ?? ''}
                  onChange={e => update('max', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </>
          )}
        </div>
      )}
      {isText && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pattern (Regex)</label>
          <input
            type="text"
            value={validation.pattern ?? ''}
            onChange={e => update('pattern', e.target.value)}
            placeholder="e.g. ^[A-Za-z]+$"
            className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Custom Error Message</label>
        <input
          type="text"
          value={validation.customMessage ?? ''}
          onChange={e => update('customMessage', e.target.value)}
          placeholder="Message shown on validation failure"
          className="w-full border border-gray-300 rounded px-2 py-1 text-base sm:text-sm outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}
