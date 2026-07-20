import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/ihthisabi/api';
import { useAuth } from '../../contexts/ihthisabi/AuthContext';
import { Plus, Eye, Trash2, List } from 'lucide-react';
import toast from 'react-hot-toast';

const blankQuestion = () => ({
  questionText: '',
  questionOrder: 1,
  answerType: 'text',
  options: [''],
  isRequired: false,
  placeholder: ''
});

const blankPart = () => ({
  partName: '',
  partOrder: 1,
  questions: [blankQuestion()]
});

const DynamicFormsAdmin = () => {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isStandaloneRoute = location.pathname.startsWith('/ihthisabi/admin/dynamic-forms');

  const mode = useMemo(() => {
    if (location.pathname.includes('/create')) return 'create';
    if (location.pathname.includes('/submissions/') && submissionId) return 'submissionDetail';
    if (location.pathname.includes('/submissions')) return 'submissions';
    if (formId) return 'formDetail';
    return 'list';
  }, [location.pathname, submissionId, formId]);

  // Shared state
  const [loading, setLoading] = useState(false);

  // List state
  const [forms, setForms] = useState([]);

  // Create state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parts, setParts] = useState([blankPart()]);
  const [saving, setSaving] = useState(false);

  // Submissions list
  const [submissions, setSubmissions] = useState([]);

  // Submission detail
  const [submission, setSubmission] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);

  // Form detail
  const [formDetail, setFormDetail] = useState(null);

  // Fetch forms
  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ihthisabi/dynamic-reports', { params: { includeTemplates: true } });
      setForms(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  // Delete form
  const handleDeleteForm = async (id) => {
    if (!window.confirm('Delete this form?')) return;
    try {
      await api.delete(`/ihthisabi/dynamic-reports/${id}`);
      toast.success('Form deleted');
      fetchForms();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Save form
  const handleSaveForm = async () => {
    if (!title.trim()) {
      toast.error('Title required');
      return;
    }
    setSaving(true);
    try {
      const payload = { title, description, parts };
      await api.post('/ihthisabi/dynamic-reports', payload);
      toast.success('Form created');
      navigate('/ihthisabi/admin/dynamic-forms');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  // Submissions list fetch
  const fetchSubmissions = async () => {
    if (!formId) return;
    try {
      setLoading(true);
      const res = await api.get('/ihthisabi/dynamic-reports/submissions', { params: { reportId: formId, limit: 100 } });
      setSubmissions(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Submission detail fetch
  const fetchSubmissionDetail = async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/submissions/${submissionId}`);
      setSubmission(res.data.data);
      setReplyMessage(res.data.data?.reply?.message || '');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  // Form detail fetch
  const fetchFormDetail = async () => {
    if (!formId) return;
    try {
      setLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/${formId}`);
      setFormDetail(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load form detail');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Reply message is required');
      return;
    }
    try {
      setDetailSaving(true);
      await api.post(`/ihthisabi/dynamic-reports/submissions/${submissionId}/reply`, { message: replyMessage });
      toast.success('Reply saved');
      fetchSubmissionDetail();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save reply');
    } finally {
      setDetailSaving(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      setDetailSaving(true);
      await api.delete(`/ihthisabi/dynamic-reports/submissions/${submissionId}/reply`);
      toast.success('Reply deleted');
      fetchSubmissionDetail();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDetailSaving(false);
    }
  };

  // Effects
  useEffect(() => {
    if (mode === 'list' && user?.role === 'admin') fetchForms();
  }, [mode, user]);

  useEffect(() => {
    if (mode === 'submissions') fetchSubmissions();
  }, [mode, formId]);

  useEffect(() => {
    if (mode === 'submissionDetail') fetchSubmissionDetail();
  }, [mode, submissionId]);

  useEffect(() => {
    if (mode === 'formDetail') fetchFormDetail();
  }, [mode, formId]);

  // Form builders helpers
  const updatePart = (idx, updated) => {
    const next = [...parts];
    next[idx] = updated;
    setParts(next);
  };
  const addPart = () => setParts([...parts, blankPart()]);
  const addQuestion = (pIdx) => {
    const part = { ...parts[pIdx] };
    part.questions = [...part.questions, blankQuestion()];
    updatePart(pIdx, part);
  };

  // Render
  if (mode === 'create') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Create Dynamic Form</h1>
          <button
            onClick={handleSaveForm}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Form'}
          </button>
        </div>

        <div className="bg-white shadow rounded p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Form title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Description"
            />
          </div>
        </div>

        <div className="space-y-4">
          {parts.map((part, pIdx) => (
            <div key={pIdx} className="bg-white shadow rounded p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  value={part.partName}
                  onChange={(e) => updatePart(pIdx, { ...part, partName: e.target.value })}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Part name"
                />
                <input
                  type="number"
                  value={part.partOrder}
                  onChange={(e) => updatePart(pIdx, { ...part, partOrder: Number(e.target.value) })}
                  className="w-24 border rounded px-3 py-2"
                  placeholder="Order"
                />
                <button
                  onClick={() => addQuestion(pIdx)}
                  className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  + Question
                </button>
              </div>
              <div className="space-y-3">
                {part.questions.map((q, qIdx) => (
                  <div key={qIdx} className="border rounded p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        value={q.questionText}
                        onChange={(e) => {
                          const questions = [...part.questions];
                          questions[qIdx] = { ...q, questionText: e.target.value };
                          updatePart(pIdx, { ...part, questions });
                        }}
                        className="border rounded px-3 py-2"
                        placeholder="Question text"
                      />
                      <input
                        type="number"
                        value={q.questionOrder}
                        onChange={(e) => {
                          const questions = [...part.questions];
                          questions[qIdx] = { ...q, questionOrder: Number(e.target.value) };
                          updatePart(pIdx, { ...part, questions });
                        }}
                        className="border rounded px-3 py-2"
                        placeholder="Order"
                      />
                      <select
                        value={q.answerType}
                        onChange={(e) => {
                          const questions = [...part.questions];
                          questions[qIdx] = { ...q, answerType: e.target.value };
                          updatePart(pIdx, { ...part, questions });
                        }}
                        className="border rounded px-3 py-2"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="radio">Radio</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="textarea">Textarea</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <label className="inline-flex items-center text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={q.isRequired}
                          onChange={(e) => {
                            const questions = [...part.questions];
                            questions[qIdx] = { ...q, isRequired: e.target.checked };
                            updatePart(pIdx, { ...part, questions });
                          }}
                          className="mr-2"
                        />
                        Required
                      </label>
                    </div>
                    {(q.answerType === 'radio' || q.answerType === 'dropdown' || q.answerType === 'checkbox') && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Options</div>
                        {q.options.map((opt, oIdx) => (
                          <input
                            key={oIdx}
                            value={opt}
                            onChange={(e) => {
                              const options = [...q.options];
                              options[oIdx] = e.target.value;
                              const questions = [...part.questions];
                              questions[qIdx] = { ...q, options };
                              updatePart(pIdx, { ...part, questions });
                            }}
                            className="w-full border rounded px-3 py-2"
                            placeholder={`Option ${oIdx + 1}`}
                          />
                        ))}
                        <button
                          onClick={() => {
                            const questions = [...part.questions];
                            questions[qIdx] = { ...q, options: [...q.options, ''] };
                            updatePart(pIdx, { ...part, questions });
                          }}
                          className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                        >
                          + Option
                        </button>
                      </div>
                    )}
                    <input
                      value={q.placeholder}
                      onChange={(e) => {
                        const questions = [...part.questions];
                        questions[qIdx] = { ...q, placeholder: e.target.value };
                        updatePart(pIdx, { ...part, questions });
                      }}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Placeholder"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={addPart}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            + Add Part
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'submissions') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Form Submissions</h1>
          <button
            onClick={() => navigate('/ihthisabi/admin/dynamic-forms')}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            Back to Forms
          </button>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rukn / Unit Admin</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submitted At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((s) => (
                  <tr key={s._id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{s.submittedBy?.name || s.submittedBy?.ruknId || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.submittedRole}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <button
                        onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/submissions/${s._id}`)}
                        className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">
                      No submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'submissionDetail') {
    const answers = submission?.answers || [];
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Submission Detail</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : !submission ? (
          <div className="text-gray-600">Submission not found</div>
        ) : (
          <>
            <div className="bg-white shadow rounded p-4 space-y-2">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Submitted By:</span> {submission.submittedBy?.name || submission.submittedBy?.ruknId || 'N/A'}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Role:</span> {submission.submittedRole}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Submitted At:</span>{' '}
                {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
              </div>
            </div>

            <div className="bg-white shadow rounded p-4 space-y-3">
              <h2 className="text-lg font-semibold">Answers</h2>
              {answers.length === 0 && <div className="text-sm text-gray-600">No answers.</div>}
              {answers.map((a, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="text-sm text-gray-900 font-medium">{a.questionText}</div>
                  <div className="text-xs text-gray-500 mb-1">{a.partName}</div>
                  <div className="text-sm text-gray-700">
                    {Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '')}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white shadow rounded p-4 space-y-3">
              <h2 className="text-lg font-semibold">Admin Reply</h2>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={4}
                placeholder="Enter reply message"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReply}
                  disabled={detailSaving}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-600 disabled:opacity-50"
                >
                  {detailSaving ? 'Saving...' : 'Save Reply'}
                </button>
                {submission.reply?.message && (
                  <button
                    onClick={handleDeleteReply}
                    disabled={detailSaving}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Delete Reply
                  </button>
                )}
              </div>
              {submission.reply?.message && (
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Current Reply:</div>
                  <div>{submission.reply.message}</div>
                  <div className="text-xs text-gray-500">
                    At: {submission.reply.repliedAt ? new Date(submission.reply.repliedAt).toLocaleString() : '-'}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (mode === 'formDetail') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Form Detail</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${formId}/submissions`)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm inline-flex items-center"
            >
              <Eye className="w-4 h-4 mr-1" /> View Submissions
            </button>
            {isStandaloneRoute && (
              <button
                onClick={() => navigate('/ihthisabi/admin')}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Back to Dashboard
              </button>
            )}
            <button
              onClick={() => navigate('/ihthisabi/admin/dynamic-forms')}
              className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
            >
              Back to Forms
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : !formDetail ? (
          <div className="text-gray-600">Form not found</div>
        ) : (
          <>
            <div className="bg-white shadow rounded p-4 space-y-2">
              <div className="text-lg font-semibold text-gray-900">{formDetail.title}</div>
              <div className="text-sm text-gray-700">{formDetail.description || 'No description provided.'}</div>
              <div className="text-sm text-gray-600 flex flex-wrap gap-4">
                <span><span className="font-semibold">Status:</span> {formDetail.isActive ? 'Active' : 'Inactive'}</span>
                {formDetail.createdAt && (
                  <span>
                    <span className="font-semibold">Created:</span>{' '}
                    {new Date(formDetail.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {(formDetail.parts || []).map((part, pIdx) => (
                <div key={part._id || pIdx} className="bg-white shadow rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-md font-semibold text-gray-900">{part.partName || `Part ${pIdx + 1}`}</div>
                      <div className="text-xs text-gray-500">Order: {part.partOrder ?? pIdx + 1}</div>
                    </div>
                    <span className="text-xs text-gray-500">Questions: {part.questions?.length || 0}</span>
                  </div>
                  <div className="space-y-2">
                    {(part.questions || []).map((q, qIdx) => (
                      <div key={q._id || qIdx} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">{q.questionText || `Question ${qIdx + 1}`}</div>
                          <span className="text-xs text-gray-500">Type: {q.answerType}</span>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">Options: {q.options.join(', ')}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Required: {q.isRequired ? 'Yes' : 'No'} | Order: {q.questionOrder ?? qIdx + 1}
                        </div>
                      </div>
                    ))}
                    {(part.questions || []).length === 0 && (
                      <div className="text-sm text-gray-600">No questions in this part.</div>
                    )}
                  </div>
                </div>
              ))}
              {(formDetail.parts || []).length === 0 && (
                <div className="bg-white shadow rounded p-4 text-sm text-gray-600">
                  No parts defined for this form.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default: list
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <List className="w-5 h-5" /> Dynamic Forms
        </h1>
        <div className="flex items-center gap-2">
          {isStandaloneRoute && (
            <button
              onClick={() => navigate('/ihthisabi/admin')}
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          )}
          <button
            onClick={() => navigate('/ihthisabi/admin/dynamic-forms/create')}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Form
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Form Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forms.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{f.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{f.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 space-x-2">
                    <button
                      onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${f._id}/submissions`)}
                      className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Submissions
                    </button>
                    <button
                      onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${f._id}`)}
                      className="inline-flex items-center px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
                    >
                      <Eye className="w-4 h-4 mr-1" /> View Form
                    </button>
                    <button
                      onClick={() => handleDeleteForm(f._id)}
                      className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {forms.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                    No forms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DynamicFormsAdmin;

