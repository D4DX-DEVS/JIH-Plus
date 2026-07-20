import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import FieldEditor from './FieldEditor';

export default function FieldCanvas({ pages, pageIndex, allFields, onPagesChange, onAddField }) {
  const page = pages[pageIndex];
  const fields = page.fields || [];

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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
          className="mt-1 text-sm border-0 outline-none bg-transparent text-gray-500 w-full"
        />
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
            <FieldEditor
              key={field.id}
              field={field}
              allFields={allFields}
              pageIndex={pageIndex}
              fieldIndex={fieldIndex}
              onChange={newField => updateField(fieldIndex, newField)}
              onRemove={() => removeField(fieldIndex)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onAddField}
        className="w-full border-2 border-dashed border-blue-200 text-blue-500 hover:bg-blue-50 rounded-lg py-2 text-sm flex items-center justify-center gap-1 mt-2"
      >
        <Plus size={16} /> Add Field
      </button>
    </div>
  );
}
