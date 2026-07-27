import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/ihthisabi/api';
import { Eye, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const DynamicFormsUser = () => {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = useMemo(() => {
    if (location.pathname.includes('/submissions/') && submissionId) return 'detail';
    if (location.pathname.includes('/submit/') && formId) return 'submit';
    return 'list';
  }, [location.pathname, formId, submissionId]);

  // List state
  const [forms, setForms] = useState([]);
  const [mySubs, setMySubs] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // Submit state
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail state
  const [submission, setSubmission] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Helpers
  const mySubmissionFor = (reportId) => mySubs.find((s) => s.reportId === reportId);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const [formsRes, subsRes] = await Promise.all([
        api.get('/ihthisabi/dynamic-reports'),
        api.get('/ihthisabi/dynamic-reports/my/submissions')
      ]);
      setForms(formsRes.data.data || []);
      setMySubs(subsRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load forms');
    } finally {
      setListLoading(false);
    }
  };

  const fetchForm = async () => {
    if (!formId) return;
    try {
      setFormLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/${formId}`);
      const data = res.data.data;
      setForm(data);
      const initialAnswers = [];
      (data.parts || []).forEach((p) => {
        (p.questions || []).forEach((q) => {
          initialAnswers.push({
            partOrder: p.partOrder,
            partName: p.partName,
            questionOrder: q.questionOrder,
            questionText: q.questionText,
            answerType: q.answerType,
            value: q.answerType === 'checkbox' ? [] : ''
          });
        });
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load form');
    } finally {
      setFormLoading(false);
    }
  };

  const fetchSubmission = async () => {
    if (!submissionId) return;
    try {
      setDetailLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/submissions/${submissionId}`);
      setSubmission(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submission');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateAnswer = (questionText, value) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionText === questionText ? { ...a, value } : a))
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(`/ihthisabi/dynamic-reports/${formId}/submit`, { answers });
      toast.success('Submitted');
      navigate('/ihthisabi/dynamic-forms');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (mode === 'list') fetchList();
  }, [mode]);

  useEffect(() => {
    if (mode === 'submit') fetchForm();
  }, [mode, formId]);

  useEffect(() => {
    if (mode === 'detail') fetchSubmission();
  }, [mode, submissionId]);

  const renderInput = (q) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    switch (q.answerType) {
      case 'text':
        return (
          <input
            className="w-full border rounded px-3 py-2"
            value={q.value}
            onChange={(e) => updateAnswer(q.questionText, e.target.value)}
            placeholder={q.placeholder}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={q.value}
            onChange={(e) => updateAnswer(q.questionText, e.target.value)}
            placeholder={q.placeholder}
          />
        );
      case 'textarea':
        return (
          <textarea
            className="w-full border rounded px-3 py-2"
            value={q.value}
            onChange={(e) => updateAnswer(q.questionText, e.target.value)}
            rows={3}
            placeholder={q.placeholder}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={q.value}
            onChange={(e) => updateAnswer(q.questionText, e.target.value)}
          />
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {opts.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name={q.questionText}
                  value={opt}
                  checked={q.value === opt}
                  onChange={() => updateAnswer(q.questionText, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <select
            className="w-full border rounded px-3 py-2"
            value={q.value}
            onChange={(e) => updateAnswer(q.questionText, e.target.value)}
          >
            <option value="">Select</option>
            {opts.map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {opts.map((opt, idx) => {
              const checked = Array.isArray(q.value) && q.value.includes(opt);
              return (
                <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const current = Array.isArray(q.value) ? q.value : [];
                      const next = e.target.checked
                        ? [...current, opt]
                        : current.filter((v) => v !== opt);
                      updateAnswer(q.questionText, next);
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  // Renderers
  const renderList = () => (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Dynamic Forms</h1>
      {listLoading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="overflow-x-hidden sm:overflow-x-auto bg-white shadow rounded-lg">
          <table className="ih-table-compact w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Form</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forms.map((f) => {
                const mine = mySubmissionFor(f._id);
                return (
                  <tr key={f._id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{f.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {mine ? new Date(mine.createdAt).toLocaleString() : 'No'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => navigate(`/ihthisabi/dynamic-forms/${f._id}/submit`)}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                          <Send className="w-4 h-4 mr-1" /> {mine ? 'Edit' : 'Submit'}
                        </button>
                        {mine && (
                          <button
                            onClick={() => navigate(`/ihthisabi/dynamic-forms/submissions/${mine._id}`)}
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100 transition"
                          >
                            <Eye className="w-4 h-4 mr-1" /> View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {forms.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-6 text-center text-sm text-gray-500">
                    No forms available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSubmit = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fill Form</h1>
        <button
          onClick={() => navigate('/ihthisabi/dynamic-forms')}
          className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          Back
        </button>
      </div>

      {formLoading ? (
        <div className="text-gray-600">Loading...</div>
      ) : !form ? (
        <div className="text-gray-600">Form not found</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white shadow rounded p-4">
            <div className="text-lg font-semibold">{form.title}</div>
            <div className="text-sm text-gray-700">{form.description}</div>
          </div>

          {(form.parts || []).map((p) => (
            <div key={p.partOrder} className="bg-white shadow rounded p-4 space-y-3">
              <div className="text-md font-semibold">{p.partName}</div>
              {(p.questions || []).map((q) => {
                const ans = answers.find((a) => a.questionText === q.questionText) || q;
                const merged = { ...q, ...ans, options: q.options || [] };
                return (
                  <div key={q.questionOrder} className="space-y-2">
                    <div className="text-sm font-medium text-gray-800">{q.questionText}</div>
                    {renderInput(merged)}
                  </div>
                );
              })}
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    const answersList = submission?.answers || [];
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Submission</h1>
          <button
            onClick={() => navigate('/ihthisabi/dynamic-forms')}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            Back
          </button>
        </div>

        {detailLoading ? (
          <div className="text-gray-600">Loading...</div>
        ) : !submission ? (
          <div className="text-gray-600">Submission not found</div>
        ) : (
          <>
            <div className="bg-white shadow rounded p-4 space-y-2">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Submitted At:</span>{' '}
                {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
              </div>
            </div>

            <div className="bg-white shadow rounded p-4 space-y-3">
              <h2 className="text-lg font-semibold">Answers</h2>
              {answersList.length === 0 && <div className="text-sm text-gray-600">No answers.</div>}
              {answersList.map((a, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="text-sm text-gray-900 font-medium">{a.questionText}</div>
                  <div className="text-xs text-gray-500 mb-1">{a.partName}</div>
                  <div className="text-sm text-gray-700">
                    {Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '')}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white shadow rounded p-4 space-y-2">
              <h2 className="text-lg font-semibold">Admin Reply</h2>
              {submission.reply?.message ? (
                <div className="text-sm text-gray-700">
                  <div>{submission.reply.message}</div>
                  <div className="text-xs text-gray-500">
                    {submission.reply.repliedAt ? new Date(submission.reply.repliedAt).toLocaleString() : ''}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No reply yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (mode === 'submit') return renderSubmit();
  if (mode === 'detail') return renderDetail();
  return renderList();
};

export default DynamicFormsUser;

