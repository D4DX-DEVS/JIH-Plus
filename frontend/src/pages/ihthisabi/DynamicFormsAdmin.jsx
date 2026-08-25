import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/ihthisabi/api';
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal';
import FieldCanvas from '../../components/reportBuilder/FieldCanvas';
import FieldTypeSelector from '../../components/reportBuilder/FieldTypeSelector';
import DynamicFormRenderer from '../../components/reportRenderer/DynamicFormRenderer';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Eye, FileStack, X, FileText, Save, ArrowLeft, Inbox,
  User, Users, Landmark, MessageSquare, Send, Globe, Settings, CheckCircle2
} from 'lucide-react';

// Who a report is assigned to. Reports created before targeting existed carry no
// targetRoles and are shown as the legacy "Rukn + Unit Admin" pair.
const TARGET_ROLES = [
  { value: 'rukn', label: 'Rukn', desc: 'Members submit this report.', icon: User },
  { value: 'unitAdmin', label: 'Unit Admin', desc: 'Unit-level admins submit this report.', icon: Users },
  { value: 'mekhalaNazim', label: 'Mekhala Nazim', desc: 'Mekhala nazims submit this report.', icon: Landmark }
];

const ROLE_LABEL = TARGET_ROLES.reduce((acc, r) => ({ ...acc, [r.value]: r.label }), {});

const targetRolesOf = (form) => (form?.targetRoles?.length ? form.targetRoles : ['rukn', 'unitAdmin']);

// Field ids must be unique across the whole report — the conditional-logic editor
// and the renderer both address fields by bare id.
let _nextFieldId = 1;
const nextId = () => _nextFieldId++;

const makeNewPage = (order = 0) => ({ id: nextId(), title: '', description: '', order, fields: [] });

const makeNewField = (type) => ({
  id: nextId(), type, label: '', required: false, placeholder: '', helpText: '',
  options: ['select', 'dropdown', 'radio', 'checkbox', 'multiselect'].includes(type) ? ['Option 1', 'Option 2'] : [],
  validation: {}, conditionalLogic: null,
  rowTitles: type === 'row' ? ['Row 1'] : [],
  columnTitles: type === 'row' ? ['Col 1'] : [],
  rowMeta: type === 'row' ? [{ kind: 'input' }] : [],
  columnMeta: type === 'row' ? [{ kind: 'input', inputType: 'text' }] : [],
  staticCells: type === 'row' ? {} : undefined,
  sumRow: false, sumColumn: false, sumRowLabel: 'Total', sumColumnLabel: 'Total'
});

// Reports authored before the builder stored parts/questions. Read them into the
// pages shape so they can still be viewed and edited.
const partsToPages = (parts = []) =>
  parts.map((part, pi) => ({
    id: nextId(),
    title: part.partName || `Part ${pi + 1}`,
    description: '',
    order: pi,
    fields: (part.questions || []).map((q) => ({
      ...makeNewField(q.answerType === 'multiple_choice' ? 'radio' : q.answerType || 'text'),
      label: q.questionText || '',
      required: q.isRequired || false,
      placeholder: q.placeholder || '',
      options: q.options || []
    }))
  }));

function TargetChips({ form }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {targetRolesOf(form).map((role) => {
        const meta = TARGET_ROLES.find((r) => r.value === role);
        const Icon = meta?.icon || User;
        return (
          <span key={role} className="ih-chip bg-gray-100 text-gray-600">
            <Icon className="w-3 h-3" />
            {meta?.label || role}
          </span>
        );
      })}
    </span>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${
        value ? 'bg-[#161F2F]' : 'bg-gray-300'
      }`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
        value ? 'translate-x-5' : ''
      }`} />
    </button>
  );
}

const DynamicFormsAdmin = () => {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = useMemo(() => {
    if (location.pathname.includes('/create')) return 'editor';
    if (location.pathname.endsWith('/edit')) return 'editor';
    if (location.pathname.includes('/submissions/') && submissionId) return 'submissionDetail';
    if (location.pathname.includes('/submissions')) return 'submissions';
    if (formId) return 'formDetail';
    return 'list';
  }, [location.pathname, submissionId, formId]);

  const isEdit = location.pathname.endsWith('/edit');

  const [loading, setLoading] = useState(false);

  // List
  const [forms, setForms] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Builder
  const [reportMeta, setReportMeta] = useState({
    title: '', description: '', targetRoles: [], isActive: true
  });
  const [pages, setPages] = useState([makeNewPage(0)]);
  const [activePage, setActivePage] = useState(0);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewScope, setPreviewScope] = useState('all');
  const [clipboard, setClipboard] = useState(null);
  const [copiedFieldId, setCopiedFieldId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [lockedStructure, setLockedStructure] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');

  // Submission detail
  const [submission, setSubmission] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState(false);

  // Report detail (preview)
  const [formDetail, setFormDetail] = useState(null);

  const allFields = pages.flatMap((p) => p.fields || []);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/ihthisabi/dynamic-reports', { params: { includeTemplates: true } });
      setForms(res.data.data || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIntoEditor = useCallback(async () => {
    if (!isEdit || !formId) {
      _nextFieldId = 1;
      setPages([makeNewPage(0)]);
      setActivePage(0);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/${formId}`);
      const r = res.data.data;
      setReportMeta({
        title: r.title || '',
        description: r.description || '',
        targetRoles: targetRolesOf(r),
        isActive: r.isActive !== false
      });
      setIsPublished(Boolean(r.isPublished));
      setLockedStructure(Boolean(r.hasSubmissions));

      if (r.pages?.length) {
        const maxId = Math.max(0, ...r.pages.flatMap((p) => [p.id || 0, ...(p.fields || []).map((f) => f.id || 0)]));
        _nextFieldId = maxId + 1;
        setPages(r.pages);
      } else if (r.parts?.length) {
        _nextFieldId = 1;
        setPages(partsToPages(r.parts));
      } else {
        _nextFieldId = 1;
        setPages([makeNewPage(0)]);
      }
      setActivePage(0);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [isEdit, formId]);

  const fetchSubmissions = useCallback(async () => {
    if (!formId) return;
    try {
      setLoading(true);
      const params = { reportId: formId, limit: 100 };
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/ihthisabi/dynamic-reports/submissions', { params });
      setSubmissions(res.data.data || []);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [formId, roleFilter]);

  const fetchSubmissionDetail = useCallback(async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/submissions/${submissionId}`);
      setSubmission(res.data.data);
      setReplyMessage(res.data.data?.reply?.message || '');
    } catch {
      toast.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  const fetchFormDetail = useCallback(async () => {
    if (!formId) return;
    try {
      setLoading(true);
      const res = await api.get(`/ihthisabi/dynamic-reports/${formId}`);
      setFormDetail(res.data.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { if (mode === 'list') fetchForms(); }, [mode, fetchForms]);
  useEffect(() => { if (mode === 'editor') loadIntoEditor(); }, [mode, loadIntoEditor]);
  useEffect(() => { if (mode === 'submissions') fetchSubmissions(); }, [mode, fetchSubmissions]);
  useEffect(() => { if (mode === 'submissionDetail') fetchSubmissionDetail(); }, [mode, fetchSubmissionDetail]);
  useEffect(() => { if (mode === 'formDetail') fetchFormDetail(); }, [mode, fetchFormDetail]);

  const handleDeleteForm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/ihthisabi/dynamic-reports/${deleteTarget._id}`);
      toast.success('Report deleted');
      setDeleteTarget(null);
      fetchForms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // ── Builder actions ─────────────────────────────────────────────────────────
  const handleAddField = (type) => {
    setPages((prev) => prev.map((p, pi) =>
      pi !== activePage ? p : { ...p, fields: [...(p.fields || []), makeNewField(type)] }));
  };

  const cloneField = (field) => ({ ...JSON.parse(JSON.stringify(field)), id: nextId() });

  const insertField = (pageIdx, insertIndex, field) => {
    setPages((prev) => prev.map((p, pi) => {
      if (pi !== pageIdx) return p;
      const fields = [...(p.fields || [])];
      fields.splice(insertIndex, 0, field);
      return { ...p, fields };
    }));
  };

  const handleCopyField = (field) => {
    setClipboard(JSON.parse(JSON.stringify(field)));
    setCopiedFieldId(field.id);
  };

  const handleDuplicateField = (fieldIndex) => {
    const source = (pages[activePage]?.fields || [])[fieldIndex];
    if (!source) return;
    insertField(activePage, fieldIndex + 1, cloneField(source));
  };

  const handlePasteField = (insertIndex) => {
    if (!clipboard) return;
    insertField(activePage, insertIndex, cloneField(clipboard));
  };

  const handleAddPage = () => {
    setPages((prev) => [...prev, makeNewPage(prev.length)]);
    setActivePage(pages.length);
  };

  const handleRemovePage = (i) => {
    if (pages.length <= 1) return;
    const np = pages.filter((_, pi) => pi !== i);
    setPages(np);
    setActivePage(Math.min(activePage, np.length - 1));
  };

  const handleSave = async (publish) => {
    if (!reportMeta.title.trim()) { toast.error('Report title is required'); return; }
    if (reportMeta.targetRoles.length === 0) { toast.error('Select at least one target user'); return; }

    setSavingForm(true);
    try {
      const body = {
        title: reportMeta.title.trim(),
        description: reportMeta.description.trim(),
        targetRoles: reportMeta.targetRoles,
        isActive: reportMeta.isActive,
        isPublished: publish
      };
      if (!lockedStructure) body.pages = pages;

      if (isEdit) await api.put(`/ihthisabi/dynamic-reports/${formId}`, body);
      else await api.post('/ihthisabi/dynamic-reports', body);

      toast.success(publish ? 'Report published — target users can see it now' : 'Draft saved');
      navigate('/ihthisabi/admin/dynamic-forms');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSavingForm(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) { toast.error('Reply message is required'); return; }
    setDetailSaving(true);
    try {
      const hasReply = Boolean(submission?.reply?.message);
      const url = `/ihthisabi/dynamic-reports/submissions/${submissionId}/reply`;
      if (hasReply) await api.put(url, { message: replyMessage });
      else await api.post(url, { message: replyMessage });
      toast.success(hasReply ? 'Reply updated' : 'Reply sent');
      fetchSubmissionDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save reply');
    } finally {
      setDetailSaving(false);
    }
  };

  const handleDeleteReply = async () => {
    setDetailSaving(true);
    try {
      await api.delete(`/ihthisabi/dynamic-reports/submissions/${submissionId}/reply`);
      toast.success('Reply deleted');
      setConfirmDeleteReply(false);
      setReplyMessage('');
      fetchSubmissionDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDetailSaving(false);
    }
  };

  const Loader = () => (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  // ── Editor ──────────────────────────────────────────────────────────────────
  if (mode === 'editor') {
    if (loading) return <div className="min-h-screen bg-gray-50"><Loader /></div>;

    const ConfigContent = () => (
      <div className="p-4 space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Target Users</p>
          <div className="space-y-1.5">
            {TARGET_ROLES.map((role) => {
              const Icon = role.icon;
              const checked = reportMeta.targetRoles.includes(role.value);
              return (
                <button key={role.value} type="button"
                  onClick={() => setReportMeta((m) => ({
                    ...m,
                    targetRoles: checked
                      ? m.targetRoles.filter((r) => r !== role.value)
                      : [...m.targetRoles, role.value]
                  }))}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left flex items-center gap-2 transition-all ${
                    checked
                      ? 'border-[#161F2F] bg-[#161F2F] text-white shadow-sm'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  }`}>
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1">{role.label}</span>
                  {checked && <CheckCircle2 size={15} />}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">Only the selected roles see and submit this report.</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Description</p>
          <textarea value={reportMeta.description} rows={2} placeholder="Optional description..."
            onChange={(e) => setReportMeta((m) => ({ ...m, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Settings</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle value={reportMeta.isActive} onChange={(v) => setReportMeta((m) => ({ ...m, isActive: v }))} />
            <span className="text-sm text-gray-700">Active (visible to users)</span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Pages</p>
            {!lockedStructure && (
              <button type="button" onClick={handleAddPage}
                className="text-xs text-[#161F2F] hover:text-primary font-semibold flex items-center gap-0.5">
                <Plus size={12} /> Add Page
              </button>
            )}
          </div>
          <div className="space-y-1">
            {pages.map((p, pi) => (
              <div key={p.id ?? pi}
                onClick={() => { setActivePage(pi); setShowConfigPanel(false); }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                  pi === activePage ? 'bg-[#161F2F] text-white' : 'text-gray-700 hover:bg-gray-100 border border-gray-100'
                }`}>
                <span className="truncate flex-1">{p.title || `Page ${pi + 1}`}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className={`text-xs ${pi === activePage ? 'text-white/60' : 'text-gray-400'}`}>
                    {(p.fields || []).length} field{(p.fields || []).length !== 1 ? 's' : ''}
                  </span>
                  {pages.length > 1 && !lockedStructure && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemovePage(pi); }}
                      className={`p-0.5 rounded ${pi === activePage ? 'text-red-300 hover:text-red-100' : 'text-gray-300 hover:text-red-400'}`}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Builder header */}
        <header className="bg-white border-b px-3 sm:px-4 py-2.5 flex items-center gap-2 shadow-sm flex-shrink-0">
          <button onClick={() => navigate('/ihthisabi/admin/dynamic-forms')}
            className="text-gray-500 hover:text-gray-800 transition-colors p-1 flex-shrink-0">
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <input type="text" value={reportMeta.title} placeholder="Enter report title..."
              onChange={(e) => setReportMeta((m) => ({ ...m, title: e.target.value }))}
              className="w-full text-sm sm:text-base font-bold text-[#161F2F] border-0 border-b-2 border-transparent focus:border-primary outline-none bg-transparent placeholder:text-gray-300" />
          </div>

          <button onClick={() => setShowConfigPanel(true)}
            className="lg:hidden p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex-shrink-0">
            <Settings size={15} />
          </button>

          <div className="flex items-stretch rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
            <button onClick={() => { setPreviewScope('page'); setShowPreview(true); }}
              title={`Preview this page only (${pages[activePage]?.title || `Page ${activePage + 1}`})`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Eye size={14} /><span className="hidden sm:inline">Preview Page</span>
            </button>
            <span className="w-px bg-gray-300" />
            <button onClick={() => { setPreviewScope('all'); setShowPreview(true); }}
              title={`Preview the full report (${pages.length} page${pages.length !== 1 ? 's' : ''})`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <FileStack size={14} /><span className="hidden sm:inline">Preview All</span>
            </button>
          </div>

          <button onClick={() => handleSave(false)} disabled={savingForm}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors flex-shrink-0">
            <Save size={14} /><span className="hidden sm:inline">{savingForm ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button onClick={() => handleSave(true)} disabled={savingForm}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-colors flex-shrink-0 ${
              isPublished ? 'bg-green-600 hover:bg-green-700' : 'bg-[#161F2F] hover:bg-[#1a2538]'
            }`}>
            <Globe size={14} /><span className="hidden sm:inline">{isPublished ? 'Published' : 'Publish'}</span>
          </button>
        </header>

        {lockedStructure && (
          <div className="px-4 py-2 text-sm bg-amber-50 text-amber-700 border-b border-amber-200 flex-shrink-0">
            This report already has submissions or saved drafts. Title, description, target users and
            active state can still be changed, but the fields are locked.
          </div>
        )}

        <div className="flex flex-1 relative min-w-0">
          {/* Mobile config overlay */}
          {showConfigPanel && (
            <div className="lg:hidden absolute inset-0 z-30 bg-white flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 sticky top-0">
                <span className="text-sm font-semibold text-gray-800">Report Configuration</span>
                <button onClick={() => setShowConfigPanel(false)} className="text-gray-400 hover:text-gray-700 p-1 rounded">
                  <X size={18} />
                </button>
              </div>
              {ConfigContent()}
            </div>
          )}

          {/* Desktop config panel */}
          <aside className="hidden lg:flex lg:flex-col w-72 border-r bg-white flex-shrink-0">
            <div className="px-4 pt-4 pb-2 border-b">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Configuration</h2>
            </div>
            {ConfigContent()}
          </aside>

          {/* Canvas */}
          <main className={`flex-1 flex flex-col min-w-0 ${lockedStructure ? 'pointer-events-none opacity-60' : ''}`}>
            <div className="bg-white border-b flex-shrink-0 px-4 pt-3 min-w-0">
              <div className="flex items-end gap-0 overflow-x-auto pb-1">
                {pages.map((p, pi) => (
                  <button key={p.id ?? pi} onClick={() => setActivePage(pi)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      pi === activePage
                        ? 'border-[#161F2F] text-[#161F2F] bg-gray-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}>
                    {p.title || `Page ${pi + 1}`}
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                      pi === activePage ? 'bg-[#161F2F]/10 text-[#161F2F]' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {(p.fields || []).length}
                    </span>
                    {pages.length > 1 && (
                      <span role="button" onClick={(e) => { e.stopPropagation(); handleRemovePage(pi); }}
                        className={`ml-0.5 rounded hover:text-red-400 ${pi === activePage ? 'text-gray-400' : 'text-gray-300'}`}>
                        <X size={12} />
                      </span>
                    )}
                  </button>
                ))}
                <button onClick={handleAddPage}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-[#161F2F] hover:bg-gray-50 rounded-t transition-colors">
                  <Plus size={13} /> Page
                </button>
              </div>
            </div>

            <FieldCanvas
              pages={pages}
              pageIndex={activePage}
              allFields={allFields}
              onPagesChange={setPages}
              onAddField={() => setShowFieldSelector(true)}
              clipboard={clipboard}
              copiedFieldId={copiedFieldId}
              onCopyField={handleCopyField}
              onDuplicateField={handleDuplicateField}
              onPasteField={handlePasteField}
              onClearClipboard={() => { setClipboard(null); setCopiedFieldId(null); }}
            />
          </main>
        </div>

        {showFieldSelector && (
          <FieldTypeSelector
            onSelect={(type) => { handleAddField(type); setShowFieldSelector(false); }}
            onClose={() => setShowFieldSelector(false)}
          />
        )}

        {showPreview && (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
            <div className="bg-white border-b px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 shadow-sm flex-shrink-0">
              <button onClick={() => setShowPreview(false)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
                <X size={18} /><span className="text-sm font-medium hidden sm:inline">Close Preview</span>
              </button>
              <div className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 p-0.5 flex-shrink-0">
                {[['page', 'This Page'], ['all', `Full Report (${pages.length})`]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setPreviewScope(val)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      previewScope === val ? 'bg-white text-[#161F2F] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {val === 'page' ? <Eye size={13} /> : <FileStack size={13} />}
                    <span className="hidden sm:inline">{lbl}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-0" />
              <span className="hidden lg:inline text-xs text-gray-400 border border-dashed border-gray-300 px-2 py-1 rounded-lg flex-shrink-0">
                Preview only — not submitted
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto py-8 px-4">
                {previewScope === 'page' && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Page {activePage + 1} of {pages.length}
                    {pages[activePage]?.title ? ` — ${pages[activePage].title}` : ''}
                  </p>
                )}
                <div className="ih-surface">
                  <DynamicFormRenderer
                    key={previewScope === 'page' ? `page-${activePage}` : 'all'}
                    report={{ ...reportMeta, pages: previewScope === 'page' ? [pages[activePage]].filter(Boolean) : pages }}
                    onSaveDraft={() => {}}
                    onSubmit={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Preview (read-only, rendered as the submitter sees it) ──────────────────
  if (mode === 'formDetail') {
    const previewPages = formDetail?.pages?.length
      ? formDetail.pages
      : formDetail?.parts?.length ? partsToPages(formDetail.parts) : [];

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button onClick={() => navigate('/ihthisabi/admin/dynamic-forms')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Reports
            </button>
            {formDetail && (
              <div className="flex gap-2">
                <button onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${formId}/edit`)}
                  className="flex items-center px-3 py-2 text-sm border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                </button>
                <button onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${formId}/submissions`)}
                  className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-primary/90 transition-colors">
                  <Inbox className="w-4 h-4 mr-2" /> Submissions
                </button>
              </div>
            )}
          </div>

          {loading ? <Loader /> : !formDetail ? (
            <div className="ih-surface px-4 py-12 text-center">
              <p className="text-sm text-gray-500">Report not found</p>
            </div>
          ) : (
            <>
              <div className="ih-surface p-5 sm:p-6 mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-gray-900">{formDetail.title}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{formDetail.description || 'No description provided'}</p>
                  </div>
                  <span className={`ih-chip ih-chip-dot ${
                    formDetail.isPublished ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {formDetail.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Target Users</p>
                    <div className="mt-1"><TargetChips form={formDetail} /></div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Pages</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {previewPages.length} · {previewPages.reduce((n, p) => n + (p.fields?.length || 0), 0)} fields
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Created</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formDetail.createdAt ? new Date(formDetail.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {previewPages.length === 0 ? (
                <div className="ih-surface px-4 py-8 text-center">
                  <p className="text-sm text-gray-400">This report has no fields yet.</p>
                </div>
              ) : (
                <div className="ih-surface">
                  <DynamicFormRenderer report={{ ...formDetail, pages: previewPages }} disabled onSubmit={() => {}} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Submissions list ────────────────────────────────────────────────────────
  if (mode === 'submissions') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="ih-page-shell max-w-5xl">
          <button onClick={() => navigate('/ihthisabi/admin/dynamic-forms')}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 sm:text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>

          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="hidden min-w-0 sm:block">
              <h1 className="ih-page-title">Submissions</h1>
              <p className="ih-page-subtitle">{submissions.length} submitted</p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Users className="ih-filter-icon" />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="ih-filter-select">
                <option value="">All roles</option>
                {TARGET_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <Loader /> : submissions.length === 0 ? (
            <div className="ih-surface px-4 py-8 text-center sm:py-12">
              <Inbox className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No submissions yet</h3>
              <p className="text-xs text-gray-500">Submissions appear here once the target users send them in.</p>
            </div>
          ) : (
            <div className="ih-section-card ih-list overflow-hidden">
              {submissions.map((s) => {
                const scope = s.submittedBy?.mekhala || s.submittedBy?.unit;
                return (
                  <button key={s._id}
                    onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/submissions/${s._id}`)}
                    className="ih-list-row w-full text-left">
                    <span className="ih-avatar bg-primary/10 text-primary">
                      {(s.submittedBy?.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="ih-list-title">{s.submittedBy?.name || s.submittedBy?.ruknId || 'Unknown'}</span>
                        <span className="ih-chip bg-gray-100 text-gray-600">{ROLE_LABEL[s.submittedRole] || s.submittedRole}</span>
                      </span>
                      <span className="ih-list-meta mt-1 block">
                        {s.submittedBy?.ruknId ? `${s.submittedBy.ruknId}${scope ? ` · ${scope}` : ''}` : scope || '—'}
                      </span>
                      <span className="ih-list-meta mt-0.5 block">
                        {s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}
                      </span>
                    </span>
                    {s.reply?.message && (
                      <span className="ih-chip bg-green-50 text-green-700"><MessageSquare className="w-3 h-3" /> Replied</span>
                    )}
                    <Eye className="w-4 h-4 shrink-0 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Submission detail ───────────────────────────────────────────────────────
  if (mode === 'submissionDetail') {
    const answers = submission?.answers || [];
    const reportPages = submission?.report?.pages || [];
    const usesFormData = reportPages.length > 0 && submission?.formData && Object.keys(submission.formData).length > 0;
    const scope = submission?.submittedBy?.mekhala || submission?.submittedBy?.unit;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="ih-page-shell max-w-3xl">
          <button onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 sm:text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {loading ? <Loader /> : !submission ? (
            <div className="ih-surface px-4 py-12 text-center">
              <p className="text-sm text-gray-500">Submission not found</p>
            </div>
          ) : (
            <>
              <div className="ih-surface p-4 sm:p-6 mb-3">
                <div className="flex items-start gap-3">
                  <span className="ih-avatar bg-primary/10 text-primary">
                    {(submission.submittedBy?.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-sm font-bold text-gray-900 sm:text-base">
                      {submission.submittedBy?.name || submission.submittedBy?.ruknId || 'Unknown'}
                    </h1>
                    <p className="ih-list-meta mt-0.5">
                      {submission.submittedBy?.ruknId}{scope ? ` · ${scope}` : ''}
                    </p>
                    <p className="ih-list-meta mt-0.5">
                      {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <span className="ih-chip bg-gray-100 text-gray-600">
                    {ROLE_LABEL[submission.submittedRole] || submission.submittedRole}
                  </span>
                </div>
              </div>

              <div className="ih-surface mb-3">
                <div className="px-4 pt-4 sm:px-6 sm:pt-6">
                  <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Answers</h2>
                </div>
                {usesFormData ? (
                  <DynamicFormRenderer
                    report={{ ...submission.report, pages: reportPages }}
                    initialData={submission.formData}
                    disabled
                    onSubmit={() => {}}
                  />
                ) : (
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                    {answers.length === 0 ? (
                      <p className="text-sm text-gray-400">No answers recorded.</p>
                    ) : (
                      <div className="ih-list">
                        {answers.map((a, idx) => (
                          <div key={idx} className="py-3 first:pt-0 last:pb-0">
                            {a.partName && <p className="ih-list-meta">{a.partName}</p>}
                            <p className="text-[13px] font-medium text-gray-900 sm:text-sm">{a.questionText}</p>
                            <p className="mt-0.5 text-[13px] text-gray-600 sm:text-sm">
                              {Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '') || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="ih-surface p-4 sm:p-6">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-3 sm:text-base">
                  <MessageSquare className="w-4 h-4 text-primary" /> Admin Reply
                </h2>
                <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={4}
                  placeholder="Write a reply to this submission…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {submission.reply?.repliedAt && (
                  <p className="ih-list-meta mt-1.5">
                    Last replied {new Date(submission.reply.repliedAt).toLocaleString()}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {submission.reply?.message && (
                    <button onClick={() => setConfirmDeleteReply(true)} disabled={detailSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" /> Delete Reply
                    </button>
                  )}
                  <button onClick={handleReply} disabled={detailSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
                    <Send className="w-4 h-4" />
                    {detailSaving ? 'Saving…' : submission.reply?.message ? 'Update Reply' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <ConfirmationModal
          isOpen={confirmDeleteReply}
          onClose={() => setConfirmDeleteReply(false)}
          onConfirm={handleDeleteReply}
          title="Delete Reply"
          message="This removes your reply from the submission. The submitter will be able to edit their report again."
          confirmText="Delete"
          variant="danger"
          isLoading={detailSaving}
        />
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ih-page-shell max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <div className="hidden min-w-0 sm:block">
            <h1 className="ih-page-title">Report Management</h1>
            <p className="ih-page-subtitle">Build reports and assign them to a role</p>
          </div>
          <button onClick={() => navigate('/ihthisabi/admin/dynamic-forms/create')}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#161F2F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1a2538] sm:px-4 sm:py-2.5 sm:text-sm">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">New report</span>
            <span className="hidden sm:inline">Create New Report</span>
          </button>
        </div>

        {loading ? <Loader /> : forms.length === 0 ? (
          <div className="ih-surface px-4 py-8 text-center sm:py-12">
            <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No reports created yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create your first report to get started</p>
            <button onClick={() => navigate('/ihthisabi/admin/dynamic-forms/create')}
              className="inline-flex items-center rounded-full bg-[#161F2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a2538]">
              <Plus className="w-4 h-4 mr-2" /> Create Report
            </button>
          </div>
        ) : (
          <div className="ih-section-card ih-list overflow-hidden">
            {forms.map((f) => {
              const published = f.isPublished === true;
              return (
                <div key={f._id} className="ih-list-row">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    published ? 'bg-[#161F2F] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="ih-list-title">{f.title}</h3>
                      <span className={`ih-chip ih-chip-dot ${
                        published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {published ? 'Published' : 'Draft'}
                      </span>
                      {!f.isActive && <span className="ih-chip bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                    <div className="mt-1"><TargetChips form={f} /></div>
                    <p className="ih-list-meta mt-1">
                      Created {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-gray-50 p-0.5">
                    <button onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${f._id}/edit`)} title="Edit"
                      className="ih-icon-btn hover:bg-blue-50 hover:text-blue-600">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${f._id}`)} title="Preview"
                      className="ih-icon-btn hover:bg-gray-200 hover:text-gray-700">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate(`/ihthisabi/admin/dynamic-forms/${f._id}/submissions`)} title="Submissions"
                      className="ih-icon-btn hover:bg-purple-50 hover:text-purple-600">
                      <Inbox className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(f)} title="Delete"
                      className="ih-icon-btn hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteForm}
        title="Delete Report"
        message={`Delete "${deleteTarget?.title || ''}"? This cannot be undone. Reports that already have submissions cannot be deleted.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
};

export default DynamicFormsAdmin;
