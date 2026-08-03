import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, Edit, Trash2, Eye, Plus, Save, Menu,
  FileText, Globe, EyeOff, X, Settings, CheckCircle2, Copy,
} from 'lucide-react';
import axios from 'axios';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import FieldCanvas from '../components/reportBuilder/FieldCanvas';
import FieldTypeSelector from '../components/reportBuilder/FieldTypeSelector';
import DynamicFormRenderer from '../components/reportRenderer/DynamicFormRenderer';
import jihLogo from '../assets/LogoColor.png';

const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
const TYPE_LABELS = { monthly: 'Monthly', special: 'Special', yearly: 'Yearly', quarterly: 'Quarterly' };

let _nextFieldId = 1;
function nextId() { return _nextFieldId++; }
function makeNewPage(order = 0) { return { id: nextId(), title: '', description: '', order, fields: [] }; }
function makeNewField(type) {
  return {
    id: nextId(), type, label: '', required: false, placeholder: '', helpText: '',
    options: ['select', 'dropdown', 'radio', 'checkbox', 'multiselect'].includes(type) ? ['Option 1', 'Option 2'] : [],
    validation: {}, conditionalLogic: null,
    rowTitles: type === 'row' ? ['Row 1'] : [],
    columnTitles: type === 'row' ? ['Col 1'] : [],
    rowMeta: type === 'row' ? [{ kind: 'input' }] : [],
    columnMeta: type === 'row' ? [{ kind: 'input', inputType: 'text' }] : [],
    staticCells: type === 'row' ? {} : undefined,
    sumRow: false,
    sumColumn: false,
    sumRowLabel: 'Total',
    sumColumnLabel: 'Total',
  };
}

// ─── List View ────────────────────────────────────────────────────────────────
function ReportListView({ onLogout }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reportForFilter, setReportForFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    const d = localStorage.getItem('adminData');
    if (d) setAdminData(JSON.parse(d));
  }, []);

  const loadReports = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (typeFilter) params.append('type', typeFilter);
      if (reportForFilter) params.append('reportFor', reportForFilter);
      if (statusFilter === 'active') params.append('isActive', 'true');
      else if (statusFilter === 'inactive') params.append('isActive', 'false');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reports?${params}`, authHeader());
      if (res.data.success) {
        setReports(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch { setError('Failed to load reports'); }
    finally { setLoading(false); }
  }, [typeFilter, reportForFilter, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, reportForFilter, statusFilter]);
  useEffect(() => { loadReports(currentPage); }, [loadReports, currentPage]);

  const handleDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/reports/${reportToDelete._id}`, authHeader());
      setSuccess('Report deleted'); setShowDeleteModal(false); setReportToDelete(null);
      loadReports(currentPage); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete'); }
  };

  const togglePublish = async (report) => {
    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/reports/${report._id}/publish`,
        { isPublished: !report.isPublished }, authHeader()
      );
      if (res.data.success) setReports(prev => prev.map(r => r._id === report._id ? { ...r, isPublished: !r.isPublished } : r));
    } catch { setError('Failed to update publish status'); }
  };

  const handleClone = async (report) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/reports/${report._id}/clone`,
        {}, authHeader()
      );
      if (res.data.success) {
        setSuccess('Report cloned successfully');
        setTimeout(() => setSuccess(''), 3000);
        navigate(`/edit-report/${res.data.data._id}`);
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to clone report'); }
  };

  const filtered = search ? reports.filter(r => r.title?.toLowerCase().includes(search.toLowerCase())) : reports;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen((prev) => !prev)} onLogout={() => setShowLogoutModal(true)} adminData={adminData} />

      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 lg:hidden"><Menu size={22} /></button>
          <img src={jihLogo} alt="JIH" className="h-8 w-auto" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#002349] truncate">Reports</h1>
          </div>
          <button
            onClick={() => navigate('/create-report')}
            className="flex items-center gap-1.5 bg-[#002349] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#1a3a5c] transition-colors">
            <Plus size={16} /> New Report
          </button>
        </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden">
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>}

        <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none">
            <option value="">All Types</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="special">Special</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={reportForFilter} onChange={e => setReportForFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none">
            <option value="">All Levels</option>
            <option value="district">District</option>
            <option value="area">Area</option>
            <option value="unit">Unit</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>No reports found</p>
              <button onClick={() => navigate('/create-report')} className="mt-3 text-sm text-blue-600 hover:underline">Create your first report</button>
            </div>
          ) : (
            <>
            {/* Mobile view: compact cards with a single-line title + all actions */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map(r => (
                <div key={r._id} className="px-3 py-3">
                  <p className="font-medium text-gray-800 truncate">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${r.type === 'monthly' ? 'bg-blue-100 text-blue-700' : r.type === 'special' ? 'bg-purple-100 text-purple-700' : r.type === 'quarterly' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {TYPE_LABELS[r.type] || r.type}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{r.reportFor}</span>
                    <span className={`text-[11px] ${r.isActive ? 'text-green-600' : 'text-gray-400'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                    <span className={`text-[11px] ${r.isPublished ? 'text-blue-600' : 'text-gray-400'}`}>{r.isPublished ? 'Published' : 'Draft'}</span>
                    {r.legacy && <span className="text-[11px] text-orange-500">legacy</span>}
                    {r.recurringMonthly && <span className="text-[11px] text-blue-500">template</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <button onClick={() => navigate(`/view-report/${r._id}`)} className="p-1.5 text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg" title="View"><Eye size={16} /></button>
                    <button onClick={() => navigate(`/edit-report/${r._id}`)} className="p-1.5 text-gray-500 hover:text-green-600 border border-gray-200 rounded-lg" title="Edit"><Edit size={16} /></button>
                    <button onClick={() => handleClone(r)} className="p-1.5 text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-lg" title="Clone"><Copy size={16} /></button>
                    <button onClick={() => togglePublish(r)} className="p-1.5 text-gray-500 hover:text-purple-600 border border-gray-200 rounded-lg" title={r.isPublished ? 'Unpublish' : 'Publish'}>
                      {r.isPublished ? <EyeOff size={16} /> : <Globe size={16} />}
                    </button>
                    <button onClick={() => { setReportToDelete(r); setShowDeleteModal(true); }} className="p-1.5 text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view: full table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">For</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Fields</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{r.title}</p>
                        <div className="flex gap-1 mt-0.5">
                          {r.legacy && <span className="text-xs text-orange-500">legacy</span>}
                          {r.recurringMonthly && <span className="text-xs text-blue-500">template</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.type === 'monthly' ? 'bg-blue-100 text-blue-700' : r.type === 'special' ? 'bg-purple-100 text-purple-700' : r.type === 'quarterly' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{r.reportFor}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {r.legacy ? `${r.pageCount ?? 0}p` : `${r.pageCount ?? 0}p / ${r.fieldCount ?? 0}f`}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs ${r.isActive ? 'text-green-600' : 'text-gray-400'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                          <span className={`text-xs ${r.isPublished ? 'text-blue-600' : 'text-gray-400'}`}>{r.isPublished ? 'Published' : 'Draft'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => navigate(`/view-report/${r._id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="View"><Eye size={15} /></button>
                          <button onClick={() => navigate(`/edit-report/${r._id}`)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Edit"><Edit size={15} /></button>
                          <button onClick={() => handleClone(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded" title="Clone"><Copy size={15} /></button>
                          <button onClick={() => togglePublish(r)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded" title={r.isPublished ? 'Unpublish' : 'Publish'}>
                            {r.isPublished ? <EyeOff size={15} /> : <Globe size={15} />}
                          </button>
                          <button onClick={() => { setReportToDelete(r); setShowDeleteModal(true); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{totalCount} total</span>
            <div className="flex gap-2">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="px-3 py-1">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
      </div>

      <ConfirmationModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setReportToDelete(null); }} onConfirm={handleDelete} title="Delete Report" message={`Delete "${reportToDelete?.title}"? This cannot be undone.`} confirmText="Delete" type="danger" />
      <ConfirmationModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={() => { setShowLogoutModal(false); onLogout && onLogout(); }} title="Logout" message="Are you sure you want to logout?" confirmText="Logout" type="logout" />
    </div>
  );
}

// ─── Builder View ─────────────────────────────────────────────────────────────
function ReportBuilderView({ reportId, onLogout }) {
  const navigate = useNavigate();
  const isEdit = Boolean(reportId);
  // setupStep: 0=choose type, 1=choose audience, 2=builder. Edit skips to 2.
  const [setupStep, setSetupStep] = useState(isEdit ? 2 : 0);
  const [pages, setPages] = useState([makeNewPage(0)]);
  const [activePage, setActivePage] = useState(0);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [reportMeta, setReportMeta] = useState({
    type: '',
    reportFor: '',
    title: '',
    description: '',
    isActive: true,
    recurringMonthly: false,
    recurringQuarterly: false,
    startDate: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('adminData');
    if (d) setAdminData(JSON.parse(d));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reports/${reportId}`, authHeader());
        if (res.data.success) {
          const r = res.data.data;
          setReportMeta({
            type: r.type || 'monthly',
            reportFor: r.reportFor || 'unit',
            title: r.title || '',
            description: r.description || '',
            isActive: r.isActive !== false,
            recurringMonthly: r.recurringMonthly || false,
            recurringQuarterly: r.recurringQuarterly || false,
            startDate: r.quarterStartDate ? r.quarterStartDate.slice(0, 10) : '',
          });
          setIsPublished(r.isPublished || false);
          if (r.pages && r.pages.length > 0) {
            const maxId = Math.max(0, ...r.pages.flatMap(p => [p.id || 0, ...(p.fields || []).map(f => f.id || 0)]));
            _nextFieldId = maxId + 1;
            setPages(r.pages);
          } else if (r.parts && r.parts.length > 0) {
            const converted = r.parts.map((part, pi) => ({
              id: nextId(), title: part.partName || `Part ${pi + 1}`, description: '', order: pi,
              fields: (part.questions || []).map(q => ({
                id: nextId(),
                type: q.answerType === 'multiple_choice' ? 'radio' : q.answerType || 'text',
                label: q.questionText || '',
                required: q.isRequired || false,
                placeholder: q.placeholder || '',
                helpText: '',
                options: q.options || [],
                validation: {},
                conditionalLogic: null,
                rowTitles: [],
                columnTitles: [],
              }))
            }));
            setPages(converted);
          }
        }
      } catch { setError('Failed to load report'); }
      finally { setLoading(false); }
    })();
  }, [reportId, isEdit]);

  const allFields = pages.flatMap(p => p.fields || []);

  const handleAddField = (type) => {
    const newField = makeNewField(type);
    setPages(prev => prev.map((p, pi) => pi !== activePage ? p : { ...p, fields: [...(p.fields || []), newField] }));
  };

  const handleAddPage = () => {
    const newLen = pages.length;
    setPages(prev => [...prev, makeNewPage(prev.length)]);
    setActivePage(newLen);
  };

  const handleRemovePage = (i) => {
    if (pages.length <= 1) return;
    const np = pages.filter((_, pi) => pi !== i);
    setPages(np);
    setActivePage(Math.min(activePage, np.length - 1));
  };

  const handleSave = async (publish = false) => {
    if (!reportMeta.title.trim()) { setError('Report title is required'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...reportMeta, pages, isPublished: publish };
      const res = isEdit
        ? await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/reports/${reportId}`, body, authHeader())
        : await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/reports`, body, authHeader());
      if (res.data.success) {
        setIsPublished(publish);
        setSuccess(publish ? 'Report published! Users can now see it.' : isEdit ? 'Draft saved.' : 'Draft saved.');
        setTimeout(() => navigate('/view-reports'), 1500);
      } else setError(res.data.message || 'Save failed');
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-[#002349] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Step 0: Choose Report Type ──────────────────────────────────────────────
  if (setupStep === 0) {
    const types = [
      {
        val: 'monthly',
        label: 'Monthly Report',
        desc: 'Recurring every month. Can be set as a template.',
        icon: '📅',
        color: 'border-blue-400 bg-blue-50 text-blue-700',
        pill: 'bg-blue-100 text-blue-700',
      },
      {
        val: 'quarterly',
        label: 'Quarterly Report',
        desc: 'Recurring every 3 months from the start date you choose.',
        icon: '📊',
        color: 'border-green-400 bg-green-50 text-green-700',
        pill: 'bg-green-100 text-green-700',
      },
      {
        val: 'yearly',
        label: 'Yearly Report',
        desc: 'Annual report submitted once per year.',
        icon: '📆',
        color: 'border-amber-400 bg-amber-50 text-amber-700',
        pill: 'bg-amber-100 text-amber-700',
      },
      {
        val: 'special',
        label: 'Special Report',
        desc: 'One-off report for a specific event or purpose.',
        icon: '⭐',
        color: 'border-purple-400 bg-purple-50 text-purple-700',
        pill: 'bg-purple-100 text-purple-700',
      },
    ];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => navigate('/view-reports')} className="text-gray-400 hover:text-gray-700 p-1">
            <ArrowLeft size={20} />
          </button>
          <img src={jihLogo} alt="JIH" className="h-7 w-auto hidden sm:block" />
          <div className="flex-1" />
          <span className="text-xs text-gray-400 font-medium">Step 1 of 2</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex-1 h-1.5 rounded-full bg-[#002349]" />
              <div className="flex-1 h-1.5 rounded-full bg-gray-200" />
            </div>

            <h1 className="text-2xl font-bold text-[#002349] mb-1">What type of report?</h1>
            <p className="text-sm text-gray-500 mb-8">Choose the report type before configuring the form.</p>

            <div className="space-y-3">
              {types.map(t => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => {
                    setReportMeta(m => ({ ...m, type: t.val }));
                    setSetupStep(1);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${t.color}`}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{t.label}</p>
                    <p className="text-sm opacity-70 mt-0.5">{t.desc}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${t.pill}`}>
                    {t.val}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Choose Target Users ─────────────────────────────────────────────
  if (setupStep === 1) {
    const TYPE_COLOR = {
      monthly: 'bg-blue-100 text-blue-700',
      quarterly: 'bg-green-100 text-green-700',
      yearly: 'bg-amber-100 text-amber-700',
      special: 'bg-purple-100 text-purple-700',
    };
    const audiences = [
      {
        val: 'district',
        label: 'District Admins',
        desc: 'Report submitted by district-level administrators.',
        icon: '🏛️',
        color: 'border-indigo-400 bg-indigo-50 text-indigo-700',
      },
      {
        val: 'area',
        label: 'Area Admins',
        desc: 'Report submitted by area-level administrators.',
        icon: '📍',
        color: 'border-teal-400 bg-teal-50 text-teal-700',
      },
      {
        val: 'unit',
        label: 'Unit Admins',
        desc: 'Report submitted by unit-level administrators.',
        icon: '👥',
        color: 'border-green-400 bg-green-50 text-green-700',
      },
    ];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSetupStep(0)} className="text-gray-400 hover:text-gray-700 p-1">
            <ArrowLeft size={20} />
          </button>
          <img src={jihLogo} alt="JIH" className="h-7 w-auto hidden sm:block" />
          <div className="flex-1" />
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_COLOR[reportMeta.type] || 'bg-gray-100 text-gray-500'}`}>
            {TYPE_LABELS[reportMeta.type]}
          </span>
          <span className="text-xs text-gray-400 font-medium">Step 2 of 2</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex-1 h-1.5 rounded-full bg-[#002349]" />
              <div className="flex-1 h-1.5 rounded-full bg-[#002349]" />
            </div>

            <h1 className="text-2xl font-bold text-[#002349] mb-1">Who are the target users?</h1>
            <p className="text-sm text-gray-500 mb-8">Select who will submit this report.</p>

            <div className="space-y-3">
              {audiences.map(a => (
                <button
                  key={a.val}
                  type="button"
                  onClick={() => {
                    setReportMeta(m => ({ ...m, reportFor: a.val }));
                    setSetupStep(2);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${a.color}`}
                >
                  <span className="text-3xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{a.label}</p>
                    <p className="text-sm opacity-70 mt-0.5">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Full Builder ────────────────────────────────────────────────────

  const Toggle = ({ value, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${value ? 'bg-[#002349]' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );

  // Left config panel (shared between mobile overlay and desktop sidebar)
  const ConfigContent = () => (
    <div className="p-4 space-y-6">
      {/* Target Users */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Target Users</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[['district', 'District'], ['area', 'Area'], ['unit', 'Unit']].map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setReportMeta(m => ({ ...m, reportFor: val }))}
              className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                reportMeta.reportFor === val
                  ? 'border-[#002349] bg-[#002349] text-white shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:border-[#002349]/40 bg-white'
              }`}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Report Type */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Report Type</p>
        <div className="space-y-1.5">
          {
            [
              ['monthly', 'Monthly', 'bg-blue-50 border-blue-400 text-blue-700'],
              ['quarterly', 'Quarterly', 'bg-green-50 border-green-400 text-green-700'],
              ['yearly', 'Yearly', 'bg-amber-50 border-amber-400 text-amber-700'],
              ['special', 'Special', 'bg-purple-50 border-purple-400 text-purple-700'],
            ].map(([val, lbl, cls]) => (
            <button
              key={val}
              type="button"
              onClick={() => setReportMeta(m => ({ ...m, type: val }))}
              className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left flex items-center justify-between transition-all ${
                reportMeta.type === val ? cls : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span>{lbl}</span>
              {reportMeta.type === val && <CheckCircle2 size={15} />}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Description</p>
        <textarea
          value={reportMeta.description}
          onChange={e => setReportMeta(m => ({ ...m, description: e.target.value }))}
          rows={2}
          placeholder="Optional description..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      {/* Settings */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Settings</p>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle value={reportMeta.isActive} onChange={v => setReportMeta(m => ({ ...m, isActive: v }))} />
            <span className="text-sm text-gray-700">Active (visible to users)</span>
          </label>
          {reportMeta.type === 'monthly' && (
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle value={reportMeta.recurringMonthly} onChange={v => setReportMeta(m => ({ ...m, recurringMonthly: v }))} />
              <span className="text-sm text-gray-700">Recurring monthly template</span>
            </label>
          )}
          {reportMeta.type === 'quarterly' && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <Toggle value={reportMeta.recurringQuarterly} onChange={v => setReportMeta(m => ({ ...m, recurringQuarterly: v }))} />
                <span className="text-sm text-gray-700">Recurring quarterly template</span>
              </label>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start date (first period begins here)</label>
                <input
                  type="date"
                  value={reportMeta.startDate || ''}
                  onChange={e => setReportMeta(m => ({ ...m, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pages */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Pages</p>
          <button
            type="button"
            onClick={handleAddPage}
            className="text-xs text-[#002349] hover:text-blue-800 font-semibold flex items-center gap-0.5"
          >
            <Plus size={12} /> Add Page
          </button>
        </div>
        <div className="space-y-1">
          {pages.map((p, pi) => (
            <div
              key={pi}
              onClick={() => { setActivePage(pi); setShowConfigPanel(false); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                pi === activePage
                  ? 'bg-[#002349] text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              <span className="truncate flex-1">{p.title || `Page ${pi + 1}`}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span className={`text-xs ${pi === activePage ? 'text-blue-200' : 'text-gray-400'}`}>
                  {(p.fields || []).length} field{(p.fields || []).length !== 1 ? 's' : ''}
                </span>
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemovePage(pi); }}
                    className={`p-0.5 rounded ${pi === activePage ? 'text-red-300 hover:text-red-100' : 'text-gray-300 hover:text-red-400'}`}
                  >
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
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={() => onLogout && onLogout()}
        adminData={adminData}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* ── Header ── */}
      <header className="bg-white border-b px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 z-20 shadow-sm flex-shrink-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-500 hover:text-gray-700 lg:hidden p-1"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={() => navigate('/view-reports')}
          className="text-gray-500 hover:text-gray-800 transition-colors p-1 flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <img src={jihLogo} alt="JIH" className="h-7 w-auto hidden sm:block flex-shrink-0" />

        <div className="flex-1 min-w-0 mx-1">
          <input
            type="text"
            value={reportMeta.title}
            onChange={e => setReportMeta(m => ({ ...m, title: e.target.value }))}
            placeholder="Enter report title..."
            className="w-full text-sm sm:text-base font-bold text-[#002349] border-0 border-b-2 border-transparent focus:border-blue-400 outline-none bg-transparent placeholder:text-gray-300"
          />
        </div>

        {/* Mobile: config summary + config toggle */}
        <div className="lg:hidden flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
            reportMeta.type === 'monthly' ? 'bg-blue-100 text-blue-700' :
            reportMeta.type === 'yearly' ? 'bg-amber-100 text-amber-700' :
            'bg-purple-100 text-purple-700'
          }`}>{TYPE_LABELS[reportMeta.type]}</span>
          <button
            onClick={() => setShowConfigPanel(true)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Preview */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          <Eye size={14} />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Save Draft */}
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors flex-shrink-0"
        >
          <Save size={14} />
          <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        {/* Publish */}
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex-shrink-0 ${
            isPublished
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-[#002349] hover:bg-[#1a3a5c] text-white'
          }`}
        >
          <Globe size={14} />
          <span className="hidden sm:inline">{isPublished ? 'Published' : 'Publish'}</span>
        </button>
      </header>

      {error && <div className="px-4 py-2 text-sm bg-red-50 text-red-700 border-b border-red-200 flex-shrink-0">{error}</div>}
      {success && <div className="px-4 py-2 text-sm bg-green-50 text-green-700 border-b border-green-200 flex-shrink-0">{success}</div>}

      {/* ── Body: two-panel layout ── */}
      <div className="flex flex-1 overflow-hidden overflow-x-hidden relative min-w-0">

        {/* Mobile config overlay */}
        {showConfigPanel && (
          <div className="lg:hidden absolute inset-0 z-30 bg-white flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 sticky top-0">
              <span className="text-sm font-semibold text-gray-800">Report Configuration</span>
              <button
                onClick={() => setShowConfigPanel(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>
            {ConfigContent()}
          </div>
        )}

        {/* Desktop left config panel */}
        <aside className="hidden lg:flex lg:flex-col w-72 border-r bg-white flex-shrink-0 overflow-y-auto">
          <div className="px-4 pt-4 pb-2 border-b">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Configuration</h2>
          </div>
          {ConfigContent()}
        </aside>

        {/* Right: canvas */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Page tabs */}
          <div className="bg-white border-b flex-shrink-0 px-4 pt-3 min-w-0">
            <div className="flex items-end gap-0 overflow-x-auto pb-1">
              {pages.map((p, pi) => (
                <button
                  key={pi}
                  onClick={() => setActivePage(pi)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    pi === activePage
                      ? 'border-[#002349] text-[#002349] bg-blue-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p.title || `Page ${pi + 1}`}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${pi === activePage ? 'bg-[#002349]/10 text-[#002349]' : 'bg-gray-100 text-gray-400'}`}>
                    {(p.fields || []).length}
                  </span>
                  {pages.length > 1 && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); handleRemovePage(pi); }}
                      className={`ml-0.5 rounded hover:text-red-400 ${pi === activePage ? 'text-gray-400' : 'text-gray-300'}`}
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={handleAddPage}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-[#002349] hover:bg-blue-50 rounded-t transition-colors"
              >
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
          />
        </main>
      </div>
      </div>

      {showFieldSelector && (
        <FieldTypeSelector
          onSelect={type => { handleAddField(type); setShowFieldSelector(false); }}
          onClose={() => setShowFieldSelector(false)}
        />
      )}

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
          {/* Preview header */}
          <div className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X size={18} /> <span className="text-sm font-medium">Close Preview</span>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                reportMeta.type === 'monthly' ? 'bg-blue-100 text-blue-700' :
                reportMeta.type === 'quarterly' ? 'bg-green-100 text-green-700' :
                reportMeta.type === 'yearly' ? 'bg-amber-100 text-amber-700' :
                'bg-purple-100 text-purple-700'
              }`}>{TYPE_LABELS[reportMeta.type] || reportMeta.type}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                {reportMeta.reportFor} view
              </span>
            </div>
            <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-2 py-1 rounded-lg">Preview only — not submitted</span>
          </div>
          {/* Render exactly as user would see it */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-8 px-4">
              <DynamicFormRenderer
                report={{ ...reportMeta, pages, _id: reportId || 'preview' }}
                existingSubmission={null}
                isReadOnly={false}
                onSaveDraft={() => {}}
                onSubmit={() => {}}
                previewMode={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single View ──────────────────────────────────────────────────────────────
function ReportSingleView({ reportId, onLogout }) {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => { const d = localStorage.getItem('adminData'); if (d) setAdminData(JSON.parse(d)); }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reports/${reportId}`, authHeader());
        if (res.data.success) setReport(res.data.data);
      } catch { setError('Failed to load report'); }
      finally { setLoading(false); }
    })();
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen((prev) => !prev)} onLogout={() => onLogout && onLogout()} adminData={adminData} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 lg:hidden"><Menu size={22} /></button>
          <button onClick={() => navigate('/view-reports')} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></button>
          <img src={jihLogo} alt="JIH" className="h-8 w-auto" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-[#002349] truncate">{report?.title || 'Report'}</h1>
          </div>
          {report && (
            <button onClick={() => navigate(`/edit-report/${reportId}`)} className="flex items-center gap-1 bg-[#002349] text-white px-3 py-1.5 rounded-lg text-sm">
              <Edit size={14} /> Edit
            </button>
          )}
        </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg mb-4">{error}</div>}
        {report && (
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.type === 'monthly' ? 'bg-blue-100 text-blue-700' : report.type === 'special' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{TYPE_LABELS[report.type]}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{report.reportFor}</span>
              {report.isPublished && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Published</span>}
              {!report.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Inactive</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{report.title}</h2>
              {report.description && <p className="text-sm text-gray-600 mt-1">{report.description}</p>}
            </div>
            {(report.pages || []).length > 0 ? (
              <div className="border border-gray-100 rounded-lg">
                <DynamicFormRenderer report={report} disabled={true} />
              </div>
            ) : (report.parts || []).length > 0 ? (
              <div>
                <p className="text-sm text-orange-600 mb-2">Legacy report (parts-based)</p>
                {report.parts.map((part, pi) => (
                  <div key={pi} className="border border-gray-100 rounded-lg p-3 mb-2">
                    <p className="font-medium">{part.partName || `Part ${pi + 1}`}</p>
                    <p className="text-xs text-gray-400">{(part.questions || []).length} questions</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No pages configured</p>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
const ReportsPage = ({ onLogout }) => {
  const { id } = useParams();
  const location = useLocation();
  const pathname = location.pathname;
  if (pathname === '/view-reports') return <ReportListView onLogout={onLogout} />;
  if (pathname === '/create-report') return <ReportBuilderView reportId={null} onLogout={onLogout} />;
  if (pathname.startsWith('/edit-report/') && id) return <ReportBuilderView reportId={id} onLogout={onLogout} />;
  if (pathname.startsWith('/view-report/') && id) return <ReportSingleView reportId={id} onLogout={onLogout} />;
  return null;
};
export default ReportsPage;
