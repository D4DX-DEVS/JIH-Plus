import React, { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import FieldEditor from './FieldEditor';
import ConfirmationModal from '../ihthisabi/ConfirmationModal';

export default function FieldCanvas({
  pages,
  pageIndex,
  allFields,
  onPagesChange,
  onAddField,
  clipboard,
  copiedFieldId,
  onCopyField,
  onDuplicateField,
  onPasteField,
  onClearClipboard,
  // Optional. Passing a role list turns on audience scoping for this page and
  // its fields (used by the members application form builder).
  roleOptions = null,
}) {
  const page = pages[pageIndex];
  const fields = page.fields || [];
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = fields.findIndex((_, i) => `${pageIndex}-${i}` === active.id);
    const overIndex = fields.findIndex((_, i) => `${pageIndex}-${i}` === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const newFields = arrayMove(fields, activeIndex, overIndex);
    const newPages = pages.map((p, pi) => pi === pageIndex ? { ...p, fields: newFields } : p);
    onPagesChange(newPages);
  };

  const updateField = (fieldIndex, newField) => {
    const newFields = fields.map((f, i) => i === fieldIndex ? newField : f);
    const newPages = pages.map((p, pi) => pi === pageIndex ? { ...p, fields: newFields } : p);
    onPagesChange(newPages);
  };

  const removeField = (fieldIndex) => {
    const newFields = fields.filter((_, i) => i !== fieldIndex);
    const newPages = pages.map((p, pi) => pi === pageIndex ? { ...p, fields: newFields } : p);
    onPagesChange(newPages);
  };

  // A blank, just-added field can be removed immediately — nothing to lose. A
  // field with a label or options gets a confirmation so it isn't tapped away by accident.
  const requestRemoveField = (fieldIndex) => {
    const field = fields[fieldIndex];
    const hasContent = Boolean(field?.label?.trim()) || (field?.options && field.options.length > 0);
    if (hasContent) {
      setConfirmRemoveIndex(fieldIndex);
    } else {
      removeField(fieldIndex);
    }
  };

  // Thin drop-zone shown between fields while a field is on the clipboard, so
  // a copied field can be pasted at any position — like pasting text.
  const PasteSlot = ({ index }) => (
    <div className="group relative h-2 -my-1 flex items-center justify-center">
      <span className="absolute inset-x-0 top-1/2 h-px bg-blue-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" />
      <button
        type="button"
        onClick={() => onPasteField(index)}
        className="relative z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-full border border-dashed border-blue-300 bg-white px-2 py-1 text-[11px] font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
      >
        <ClipboardPaste size={11} /> Paste here
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4 space-y-2">
      <div className="mb-3">
        <input
          type="text"
          value={page.title || ''}
          onChange={e => {
            const newPages = pages.map((p, pi) => pi === pageIndex ? { ...p, title: e.target.value } : p);
            onPagesChange(newPages);
          }}
          placeholder="Page title (optional)"
          className="text-lg font-semibold border-0 border-b-2 border-gray-200 focus:border-blue-400 outline-none bg-transparent w-full pb-1"
        />
        <input
          type="text"
          value={page.description || ''}
          onChange={e => {
            const newPages = pages.map((p, pi) => pi === pageIndex ? { ...p, description: e.target.value } : p);
            onPagesChange(newPages);
          }}
          placeholder="Page description (optional)"
          className="mt-1 text-base sm:text-sm border-0 outline-none bg-transparent text-gray-500 w-full"
        />
        {roleOptions && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Page audience</label>
            <select
              value={page.audience === 'role' ? (page.audienceRole || '') : ''}
              onChange={e => {
                const roleKey = e.target.value;
                const newPages = pages.map((p, pi) => pi === pageIndex
                  ? { ...p, audience: roleKey ? 'role' : 'applicant', audienceRole: roleKey }
                  : p);
                onPagesChange(newPages);
              }}
              className="w-full sm:w-80 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Applicant page (visible on the public form)</option>
              {roleOptions.map(r => (
                <option key={r.key} value={r.key}>{r.name} comments only</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              A role page is hidden from the applicant entirely — the usual shape for a
              &quot;Unit Admin Comment&quot; style section.
            </p>
          </div>
        )}
      </div>

      {fields.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No fields yet. Click &quot;Add Field&quot; to start.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={fields.map((_, i) => `${pageIndex}-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((field, fieldIndex) => (
            <React.Fragment key={field.id}>
              {clipboard && <PasteSlot index={fieldIndex} />}
              <FieldEditor
                field={field}
                allFields={allFields}
                pageIndex={pageIndex}
                fieldIndex={fieldIndex}
                isCopied={copiedFieldId === field.id}
                onChange={newField => updateField(fieldIndex, newField)}
                onRemove={() => requestRemoveField(fieldIndex)}
                onCopy={onCopyField ? () => onCopyField(field) : undefined}
                onDuplicate={onDuplicateField ? () => onDuplicateField(fieldIndex) : undefined}
                roleOptions={page.audience === 'role' ? null : roleOptions}
              />
            </React.Fragment>
          ))}
          {clipboard && fields.length > 0 && <PasteSlot index={fields.length} />}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onAddField}
          className="flex-1 border-2 border-dashed border-blue-200 text-blue-500 hover:bg-blue-50 rounded-lg py-2 text-sm flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Add Field
        </button>
        {clipboard && (
          <button
            type="button"
            onClick={() => onPasteField(fields.length)}
            className="flex-1 border-2 border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 rounded-lg py-2 text-sm flex items-center justify-center gap-1"
          >
            <ClipboardPaste size={16} /> Paste Field
          </button>
        )}
      </div>

      {/* Clipboard bar — stays visible while switching pages */}
      {clipboard && (
        <div className="sticky bottom-0 pt-2">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/95 backdrop-blur px-3 py-2 shadow-sm">
            <ClipboardPaste size={15} className="text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-800 truncate">
                Copied: {clipboard.label?.trim() || `Untitled ${clipboard.type} field`}
              </p>
              <p className="text-[11px] text-emerald-600/80">
                Switch to any page, then click a “Paste here” slot or “Paste Field”.
              </p>
            </div>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex-shrink-0">
              {clipboard.type}
            </span>
            <button
              type="button"
              onClick={onClearClipboard}
              title="Clear clipboard"
              className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 p-2 -m-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmRemoveIndex != null}
        onClose={() => setConfirmRemoveIndex(null)}
        onConfirm={() => { removeField(confirmRemoveIndex); setConfirmRemoveIndex(null); }}
        title="Delete Field"
        message="This field has content. Deleting it cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
