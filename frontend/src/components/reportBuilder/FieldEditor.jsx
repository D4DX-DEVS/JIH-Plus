import React, { useState } from 'react';
import { Trash2, GripVertical, Settings, Copy, CopyPlus, Check } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import OptionsEditor from './OptionsEditor';
import RowColumnEditor from './RowColumnEditor';
import ValidationEditor from './ValidationEditor';
import ConditionalLogicEditor from './ConditionalLogicEditor';

const TYPES_WITH_OPTIONS = ['select', 'dropdown', 'radio', 'checkbox', 'multiselect'];

export default function FieldEditor({ field, allFields, onChange, onRemove, onCopy, onDuplicate, pageIndex, fieldIndex, isCopied }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('basic');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${pageIndex}-${fieldIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const update = (key, val) => onChange({ ...field, [key]: val });

  const isLayout = ['title', 'html'].includes(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg transition-colors ${
        isDragging ? 'border-blue-400 shadow-lg' : isCopied ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={16} />
        </button>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          #{field.id} {field.type}
        </span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={field.label || ''}
            onChange={e => update('label', e.target.value)}
            placeholder={isLayout ? (field.type === 'title' ? 'Section title...' : 'HTML content...') : 'Field label...'}
            className="w-full text-sm border-0 bg-transparent outline-none text-gray-700 placeholder-gray-300"
          />
        </div>
        {!isLayout && (
          <label className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={e => update('required', e.target.checked)}
              className="rounded"
            />
            Req
          </label>
        )}
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title={isCopied ? 'Copied — paste it on any page' : 'Copy field (paste on any page)'}
            className={`flex-shrink-0 transition-colors ${isCopied ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
          >
            {isCopied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        )}
        {onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate below"
            className="text-gray-400 hover:text-blue-600 flex-shrink-0"
          >
            <CopyPlus size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          title="Field settings"
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <Settings size={15} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Delete field"
          className="text-red-300 hover:text-red-500 flex-shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 mt-1">
          <div className="flex gap-2 mt-2 mb-3 text-xs">
            {['basic', 'validation', 'conditional'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`capitalize px-2 py-1 rounded ${tab === t ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'basic' && (
            <div className="space-y-2">
              {!isLayout && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={e => update('placeholder', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Help Text</label>
                <input
                  type="text"
                  value={field.helpText || ''}
                  onChange={e => update('helpText', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              {field.type === 'html' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">HTML Content</label>
                  <textarea
                    value={field.label || ''}
                    onChange={e => update('label', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
              {TYPES_WITH_OPTIONS.includes(field.type) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Options</label>
                  <OptionsEditor
                    options={field.options || []}
                    onChange={opts => update('options', opts)}
                  />
                </div>
              )}
              {field.type === 'row' && (
                <RowColumnEditor field={field} onChange={onChange} />
              )}
            </div>
          )}

          {tab === 'validation' && !isLayout && (
            <ValidationEditor
              validation={field.validation || {}}
              fieldType={field.type}
              onChange={v => update('validation', v)}
            />
          )}

          {tab === 'conditional' && (
            <ConditionalLogicEditor
              logic={field.conditionalLogic}
              allFields={allFields}
              currentFieldId={field.id}
              onChange={cl => update('conditionalLogic', cl)}
            />
          )}
        </div>
      )}
    </div>
  );
}
