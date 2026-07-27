import React from 'react';
import { X, Download, Loader2, CheckCircle2, Clock } from 'lucide-react';
import RowColumnReadonly from './RowColumnReadonly';

// Mirrors DynamicFormRenderer's layout rule: simple value fields show
// label + value on one row, everything else stays stacked.
const INLINE_FIELD_TYPES = new Set(['text', 'number', 'phone', 'email']);

const renderFieldValue = (field, rawValue) => {
  // Row/table renders even when the user left it blank, so admin static cells still show.
  if (field.type === 'row') {
    return <RowColumnReadonly field={field} value={rawValue} />;
  }

  const isEmpty = rawValue === undefined || rawValue === null || rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (isEmpty) {
    return <span className="text-gray-400 italic text-sm">ഉത്തരം നൽകിയിട്ടില്ല</span>;
  }

  if (field.type === 'checkbox' || field.type === 'multiselect') {
    const selected = Array.isArray(rawValue) ? rawValue : [rawValue];
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {selected.map((v, i) => (
          <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === 'yesno' || typeof rawValue === 'boolean') {
    const yes = rawValue === true || rawValue === 'Yes';
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${yes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {yes ? 'Yes' : 'No'}
      </span>
    );
  }

  if (['select', 'dropdown', 'radio'].includes(field.type)) {
    return (
      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded text-sm font-medium border border-indigo-200">
        {String(rawValue)}
      </span>
    );
  }

  if (field.type === 'date' || field.type === 'datetime') {
    try {
      return <span className="text-sm text-gray-900">{new Date(rawValue).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>;
    } catch {
      return <span className="text-sm text-gray-900">{String(rawValue)}</span>;
    }
  }

  return <span className="text-sm text-gray-900 whitespace-pre-wrap">{String(rawValue)}</span>;
};

const formatLegacyAnswer = (answer) => {
  if (answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
    return <span className="text-gray-400 italic text-sm">ഉത്തരം നൽകിയിട്ടില്ല</span>;
  }
  if (Array.isArray(answer)) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {answer.map((item, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{String(item)}</span>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-gray-900 whitespace-pre-wrap">{String(answer)}</span>;
};

const getLegacyAnswer = (submission, partIndex, questionIndex) => {
  if (!submission || !Array.isArray(submission.answers)) return null;
  const found = submission.answers.find(a =>
    String(a.partId) === String(partIndex) && String(a.questionId) === String(questionIndex)
  );
  return found ? found.answer : null;
};

export default function SubmissionPreviewModal({ open, loading, data, onClose, onDownload, downloading }) {
  if (!open) return null;

  const report = data?.report;
  const submission = data?.submission;
  const isNewFormat = report?.pages && report.pages.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-auto border border-gray-200 max-h-[90vh] flex flex-col">
          <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">സമർപ്പണം പ്രിവ്യൂ</p>
              <h3 className="text-lg font-bold text-[#002349] truncate">{report?.title || 'Report'}</h3>
              {submission?.submittedAt && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Submitted on {new Date(submission.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {submission?.status && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                  submission.status === 'submitted' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                }`}>
                  {submission.status === 'submitted' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {submission.status === 'submitted' ? 'Submitted' : 'Pending'}
                </span>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading submission...
              </div>
            ) : !submission ? (
              <div className="py-16 text-center text-gray-500 text-sm">No submission found for this report.</div>
            ) : (
              <div className="space-y-4">
                {isNewFormat ? (
                  report.pages.map((page, pageIdx) => (
                    <div key={pageIdx} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      {page.title && <h4 className="text-sm font-bold text-[#002349] mb-3 border-b border-gray-200 pb-2">{page.title}</h4>}
                      <div className="space-y-3">
                        {(page.fields || [])
                          .filter(f => !['title', 'html'].includes(f.type))
                          .map(field => (
                            INLINE_FIELD_TYPES.has(field.type) ? (
                              <div key={field.id} className="border-l-4 border-[#002349]/60 pl-3 py-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                <div className="text-xs font-semibold text-gray-600 sm:w-1/3 sm:flex-shrink-0">{field.label}</div>
                                <div className="sm:flex-1 min-w-0">{renderFieldValue(field, submission.formData?.[`field_${field.id}`])}</div>
                              </div>
                            ) : (
                              <div key={field.id} className="border-l-4 border-[#002349]/60 pl-3 py-1">
                                <div className="text-xs font-semibold text-gray-600 mb-1">{field.label}</div>
                                {renderFieldValue(field, submission.formData?.[`field_${field.id}`])}
                              </div>
                            )
                          ))}
                      </div>
                    </div>
                  ))
                ) : report?.parts && report.parts.length > 0 ? (
                  report.parts.map((part, partIndex) => (
                    <div key={partIndex} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <h4 className="text-sm font-bold text-[#002349] mb-3 border-b border-gray-200 pb-2">{part.partName || `Section ${partIndex + 1}`}</h4>
                      <div className="space-y-3">
                        {(part.questions || []).map((question, questionIndex) => (
                          INLINE_FIELD_TYPES.has(question.answerType) ? (
                            <div key={questionIndex} className="border-l-4 border-[#002349]/60 pl-3 py-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <div className="text-xs font-semibold text-gray-600 sm:w-1/3 sm:flex-shrink-0">{question.questionText}</div>
                              <div className="sm:flex-1 min-w-0">{formatLegacyAnswer(getLegacyAnswer(submission, partIndex, questionIndex))}</div>
                            </div>
                          ) : (
                            <div key={questionIndex} className="border-l-4 border-[#002349]/60 pl-3 py-1">
                              <div className="text-xs font-semibold text-gray-600 mb-1">{question.questionText}</div>
                              {formatLegacyAnswer(getLegacyAnswer(submission, partIndex, questionIndex))}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-gray-500 text-sm">No form structure available to display.</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Close
            </button>
            {submission && onDownload && (
              <button
                onClick={onDownload}
                disabled={downloading}
                className="px-4 py-2 rounded-xl bg-[#002349] text-white text-sm font-semibold hover:bg-[#1a3a5c] disabled:opacity-60 flex items-center gap-2"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
