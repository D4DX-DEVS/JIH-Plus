import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Send, Save } from 'lucide-react';
import FieldRenderer from './FieldRenderer';
import { fieldWidthClass, fieldWidth } from '../../utils/fieldWidth';

// Simple value fields read better with the label and input on the same
// row; everything else (textarea, html, row/column, choice fields, etc.)
// keeps the label-above-field stacked layout.
const INLINE_FIELD_TYPES = new Set(['text', 'number', 'phone', 'email']);

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
  onCancelEdit,
}) {
  const pages = report.pages || [];
  const clampPage = (p) => Math.min(Math.max(p, 0), Math.max(pages.length - 1, 0));
  const [currentPage, setCurrentPage] = useState(() => clampPage(initialPage));
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const rendererRef = useRef(null);
  const pageStartRef = useRef(null);
  const pendingErrorFocus = useRef(null);
  const errorIdPrefix = useId().replace(/:/g, '');

  useEffect(() => {
    onPageChange && onPageChange(currentPage, pages[currentPage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // FieldRenderer is shared by legacy JIH forms and intentionally keeps a small
  // prop surface. Apply validation semantics to its rendered controls here so
  // every field type (including radio groups and row/column inputs) is covered
  // without changing those consumers.
  useEffect(() => {
    const root = rendererRef.current;
    if (!root) return;

    root.querySelectorAll('[data-form-field-key]').forEach(container => {
      const key = container.getAttribute('data-form-field-key');
      const errorId = `${errorIdPrefix}-${key}-error`;
      const invalid = Boolean(errors[key]);
      const controls = container.querySelectorAll('input, select, textarea');

      controls.forEach(control => {
        if (invalid) {
          control.setAttribute('aria-invalid', 'true');
          const describedBy = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
          describedBy.add(errorId);
          control.setAttribute('aria-describedby', [...describedBy].join(' '));
        } else {
          control.removeAttribute('aria-invalid');
          const describedBy = (control.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter(id => id && id !== errorId);
          if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '));
          else control.removeAttribute('aria-describedby');
        }
      });
    });

    const key = pendingErrorFocus.current;
    if (!key) return;
    const container = [...root.querySelectorAll('[data-form-field-key]')]
      .find(node => node.getAttribute('data-form-field-key') === key);
    const control = container?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (control) {
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      container?.focus({ preventScroll: true });
      container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    pendingErrorFocus.current = null;
  }, [currentPage, errorIdPrefix, errors]);

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
    const errorKeys = Object.keys(newErrors);
    pendingErrorFocus.current = errorKeys[0] || null;
    setErrors(newErrors);
    return errorKeys.length === 0;
  };

  const focusPageStart = () => {
    window.requestAnimationFrame(() => {
      const start = pageStartRef.current;
      const scroller = start?.closest('[data-app-scroll], .overflow-y-auto');
      if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
      else start?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      start?.focus({ preventScroll: true });
    });
  };

  const goNext = () => {
    if (!validatePage()) return;
    setCurrentPage(p => Math.min(p + 1, pages.length - 1));
    focusPageStart();
  };

  const goPrev = () => {
    setCurrentPage(p => Math.max(p - 1, 0));
    focusPageStart();
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
    <div ref={rendererRef} className="px-2 py-3 sm:px-6 sm:py-4">
      <div ref={pageStartRef} tabIndex={-1} aria-label={`ഫോം ഭാഗം ${currentPage + 1} / ${pages.length}`} className="scroll-mt-3 outline-none" />
      {/* Page progress indicator */}
      {pages.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1">
            <span className="shrink-0">Page {currentPage + 1} of {pages.length}</span>
            {page.title && <span className="min-w-0 truncate font-medium text-gray-700">{page.title}</span>}
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

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
        >
          Please correct {Object.keys(errors).length === 1 ? 'the highlighted field' : `${Object.keys(errors).length} highlighted fields`} before continuing.
        </div>
      )}

      <div className="grid grid-cols-12 gap-x-3 gap-y-3 sm:gap-x-4 sm:gap-y-5">
        {(page.fields || []).map(field => {
          if (!isFieldVisible(field)) return null;
          const required = isFieldRequired(field);
          const errorKey = `field_${field.id}`;
          const controlId = `${errorIdPrefix}-${errorKey}-control`;
          const labelId = `${errorIdPrefix}-${errorKey}-label`;
          const errorId = errors[errorKey] ? `${errorIdPrefix}-${errorKey}-error` : undefined;

          const widthClass = fieldWidthClass(field);

          if (field.type === 'title' || field.type === 'html') {
            return (
              <div key={field.id} className={widthClass}>
                <FieldRenderer
                  field={field}
                  value={formData[errorKey]}
                  onChange={val => handleChange(field.id, val)}
                  disabled={disabled}
                />
              </div>
            );
          }

          // Side-by-side fields have no room for a label column, so only
          // full-width simple fields keep the label-beside-input layout.
          if (INLINE_FIELD_TYPES.has(field.type) && fieldWidth(field) === 'full') {
            const compactNumber = field.type === 'number';
            return (
              <div
                key={field.id}
                data-form-field-key={errorKey}
                tabIndex={-1}
                className={`${widthClass} flex ${compactNumber ? 'items-center gap-3' : 'flex-col gap-1 sm:flex-row sm:items-center sm:gap-4'}`}
              >
                <label
                  htmlFor={controlId}
                  id={labelId}
                  className={`${compactNumber ? 'min-w-0 flex-1' : 'sm:w-1/3 sm:flex-shrink-0'} text-sm font-semibold leading-snug text-gray-800`}
                >
                  {field.label}
                  {required && <span className="text-red-500 ml-0.5">*</span>}
                  {field.helpText && (
                    <span className="block text-xs font-normal text-gray-500">{field.helpText}</span>
                  )}
                </label>
                <div className={compactNumber ? 'w-24 flex-shrink-0' : 'min-w-0 flex-1'}>
                  <FieldRenderer
                    field={field}
                    controlId={controlId}
                    labelledBy={labelId}
                    ariaInvalid={Boolean(errors[errorKey])}
                    ariaDescribedBy={errorId}
                    value={formData[errorKey]}
                    onChange={val => handleChange(field.id, val)}
                    disabled={disabled}
                  />
                  {errors[errorKey] && (
                    <p id={`${errorIdPrefix}-${errorKey}-error`} className="text-xs text-red-600 mt-1">{errors[errorKey]}</p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={field.id} data-form-field-key={errorKey} tabIndex={-1} className={widthClass}>
              <label
                id={labelId}
                htmlFor={['row', 'radio', 'checkbox', 'multiselect', 'yesno'].includes(field.type) ? undefined : controlId}
                className="mb-1 block text-sm font-semibold leading-snug text-gray-800"
              >
                {field.label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {field.helpText && (
                <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
              )}
              <FieldRenderer
                field={field}
                controlId={controlId}
                labelledBy={labelId}
                ariaInvalid={Boolean(errors[errorKey])}
                ariaDescribedBy={errorId}
                value={formData[errorKey]}
                onChange={val => handleChange(field.id, val)}
                disabled={disabled}
              />
              {errors[errorKey] && (
                <p id={`${errorIdPrefix}-${errorKey}-error`} className="text-xs text-red-600 mt-1">{errors[errorKey]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation — Save Draft / Previous / Next stay on one row, on phones
          too, so the footer never costs a whole extra screen of height. */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3 mt-6 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {!disabled && onSaveDraft && (
            <button
              type="button"
              onClick={handleDraft}
              disabled={submitting}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              <Save size={16} /> <span className="hidden sm:inline">Save </span>Draft
            </button>
          )}
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={submitting}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {currentPage > 0 && (
            <button
              type="button"
              onClick={goPrev}
              disabled={submitting}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              <ChevronLeft size={16} /> Prev
            </button>
          )}
          {!disabled && allowSubmitOnEveryPage && !isLastPage && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 min-h-[44px] sm:min-h-0 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 disabled:opacity-60 whitespace-nowrap"
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
                className="flex items-center gap-1.5 px-3 sm:px-5 py-2 min-h-[44px] sm:min-h-0 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
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
              className="flex items-center gap-1 px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
