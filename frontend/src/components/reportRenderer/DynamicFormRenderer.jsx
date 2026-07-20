import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Send, Save } from 'lucide-react';
import FieldRenderer from './FieldRenderer';

function evaluateCondition(logic, formData) {
  if (!logic || !logic.field) return null; // no condition
  const triggerKey = `field_${logic.field}`;
  const triggerVal = formData[triggerKey];

  let met = false;
  switch (logic.operator) {
    case 'equals': met = String(triggerVal ?? '') === String(logic.value ?? ''); break;
    case 'not_equals': met = String(triggerVal ?? '') !== String(logic.value ?? ''); break;
    case 'contains': met = String(triggerVal ?? '').includes(String(logic.value ?? '')); break;
    case 'not_empty': met = triggerVal !== undefined && triggerVal !== '' && triggerVal !== null; break;
    case 'empty': met = !triggerVal || triggerVal === ''; break;
    default: met = false;
  }

  return { met, action: logic.action };
}

export default function DynamicFormRenderer({
  report,
  initialData = {},
  initialPage = 0,
  onSubmit,
  onSaveDraft,
  onPageChange,
  disabled = false,
  submitting = false,
  allowSubmitOnEveryPage = false,
}) {
  const pages = report.pages || [];
  const clampPage = (p) => Math.min(Math.max(p, 0), Math.max(pages.length - 1, 0));
  const [currentPage, setCurrentPage] = useState(() => clampPage(initialPage));
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    onPageChange && onPageChange(currentPage, pages[currentPage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [`field_${fieldId}`]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[`field_${fieldId}`]; return e; });
  };

  const isFieldVisible = (field) => {
    const cl = field.conditionalLogic;
    if (!cl || !cl.field) return true;
    const result = evaluateCondition(cl, formData);
    if (!result) return true;
    if (cl.action === 'show') return result.met;
    if (cl.action === 'hide') return !result.met;
    return true;
  };

  const isFieldRequired = (field) => {
    if (field.required) return true;
    const cl = field.conditionalLogic;
    if (!cl || !cl.field) return false;
    const result = evaluateCondition(cl, formData);
    if (!result) return false;
    if (cl.action === 'require') return result.met;
    if (cl.action === 'optional') return !result.met;
    return false;
  };

  const validatePage = () => {
    const page = pages[currentPage];
    const newErrors = {};
    (page.fields || []).forEach(field => {
      if (!isFieldVisible(field)) return;
      if (isFieldRequired(field)) {
        const val = formData[`field_${field.id}`];
        const empty = val === undefined || val === '' || val === null || (Array.isArray(val) && val.length === 0);
        if (empty) newErrors[`field_${field.id}`] = field.validation?.customMessage || 'This field is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validatePage()) return;
    setCurrentPage(p => Math.min(p + 1, pages.length - 1));
    window.scrollTo(0, 0);
  };

  const goPrev = () => {
    setCurrentPage(p => Math.max(p - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    if (!validatePage()) return;
    onSubmit(formData, currentPage);
  };

  const handleDraft = () => {
    onSaveDraft && onSaveDraft(formData, currentPage);
  };

  if (pages.length === 0) {
    return <p className="text-gray-500 text-sm">This report has no pages configured.</p>;
  }

  const page = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div className="px-4 sm:px-6 py-4">
      {/* Page progress indicator */}
      {pages.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Page {currentPage + 1} of {pages.length}</span>
            {page.title && <span className="font-medium text-gray-700">{page.title}</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {page.description && (
        <p className="text-sm text-gray-600 mb-4">{page.description}</p>
      )}

      <div className="space-y-5">
        {(page.fields || []).map(field => {
          if (!isFieldVisible(field)) return null;
          const required = isFieldRequired(field);
          const errorKey = `field_${field.id}`;

          if (field.type === 'title' || field.type === 'html') {
            return (
              <div key={field.id}>
                <FieldRenderer
                  field={field}
                  value={formData[errorKey]}
                  onChange={val => handleChange(field.id, val)}
                  disabled={disabled}
                />
              </div>
            );
          }

          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {field.helpText && (
                <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
              )}
              <FieldRenderer
                field={field}
                value={formData[errorKey]}
                onChange={val => handleChange(field.id, val)}
                disabled={disabled}
              />
              {errors[errorKey] && (
                <p className="text-xs text-red-500 mt-1">{errors[errorKey]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <div>
          {currentPage > 0 && (
            <button
              type="button"
              onClick={goPrev}
              disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Previous
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {!disabled && onSaveDraft && (
            <button
              type="button"
              onClick={handleDraft}
              disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} /> Save Draft
            </button>
          )}
          {!disabled && allowSubmitOnEveryPage && !isLastPage && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send size={16} />
              )}
              Save &amp; Submit
            </button>
          )}
          {isLastPage ? (
            !disabled && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send size={16} />
                )}
                Submit
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
