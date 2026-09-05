import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, RefreshCw, Copy, Check, MapPin, Building2, Home, Layers, X, Eye, EyeOff, Download, ChevronLeft, ChevronRight, Scissors, GitMerge, ArrowRightLeft, Search, ChevronDown } from 'lucide-react';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import * as svc from '../services/locationMasterService';
import MobileTopBar from '../components/sidebars/MobileTopBar';
import { JihFilterBar, JihFilterSelect, JihFab, JihAddButton, JihToolbarAction } from '../components/JihToolbar';

const PAGE_SIZE = 20;

// ── Pagination Bar ────────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, total, onPrev, onNext, loading }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-500">
        Page {page} of {totalPages}
        {total != null && <span className="ml-1">(ആകെ {total})</span>}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1 || loading}
          className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 text-xs border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages || loading}
          className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 text-xs border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'states',    label: 'സ്റ്റേറ്റ്',    icon: Layers },
  { id: 'districts', label: 'ഡിസ്ട്രിക്റ്റ്', icon: MapPin },
  { id: 'areas',     label: 'ഏരിയ',          icon: Building2 },
  { id: 'units',     label: 'യൂണിറ്റ്',       icon: Home },
];

// ── Small helpers ────────────────────────────────────────────────────────────

// Escape a value for CSV: wrap in quotes and double any inner quote.
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

// rows: array of objects in `columns` order. columns: [{key, label}]
const downloadCsv = (filename, columns, rows) => {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvCell(row[c.key])).join(','))
    .join('\n');
  // BOM so Excel opens it in UTF-8 (preserves Malayalam characters).
  const csv = '﻿' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `${filename}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Inline password cell: shows dots, reveals on eye-click, copy button
function PasswordCell({ password }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs tracking-widest text-gray-700 min-w-[60px]">
        {visible ? password : '•'.repeat(password.length)}
      </span>
      <button
        title={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
        className="p-2 text-gray-400 hover:text-gray-700 rounded"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        title="Copy password"
        onClick={copy}
        className="p-2 text-gray-400 hover:text-gray-700 rounded"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function CredentialBox({ code, password }) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const copy = async (text, setter) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2 text-sm">
      <p className="text-green-700 font-semibold">✓ ക്രിയേറ്റ് ആയി — credentials save ചെയ്യുക</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-500 w-24 shrink-0">Username:</span>
        <span className="font-mono bg-white border rounded px-2 py-0.5 flex-1">{code}</span>
        <button onClick={() => copy(code, setCodeCopied)} className="p-2 -m-2 text-gray-500 hover:text-gray-700 rounded">
          {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      {/* gap-4: the two p-2/-m-2 hit-area-expanded buttons would overlap across a smaller gap */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-500 w-24 shrink-0">Password:</span>
        <span className="font-mono bg-white border rounded px-2 py-0.5 flex-1">
          {showPass ? password : '•'.repeat(password.length)}
        </span>
        <button onClick={() => setShowPass((p) => !p)} className="p-2 -m-2 text-gray-500 hover:text-gray-700 rounded">
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={() => copy(password, setPassCopied)} className="p-2 -m-2 text-gray-500 hover:text-gray-700 rounded">
          {passCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[#002349]">{title}</h2>
          <button onClick={onClose} className="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <Modal title="സ്ഥിരീകരിക്കുക" onClose={onCancel}>
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

// Mobile-only detail view: the full row data (parent hierarchy, credentials)
// that the compact mobile list hides behind a tap, shown here instead.
function DetailModal({ title, rows, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-gray-500 shrink-0">{r.label}</span>
            <span className="text-gray-800 text-right min-w-0">{r.value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── States Tab ────────────────────────────────────────────────────────────────
function StatesTab() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await svc.getStatesPaginated({ page: p, limit: PAGE_SIZE, search: debouncedSearch || undefined });
      setStates(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch { setError('Failed to load states'); }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required');
    setSaving(true); setError('');
    try {
      if (editItem) await svc.updateState(editItem._id, name);
      else await svc.createState(name);
      setShowAdd(false); setEditItem(null); setName('');
      await load(page);
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving state');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await svc.deleteState(deleteItem._id);
      setDeleteItem(null);
      // If last item on page and not page 1, go back one
      const newPage = states.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      await load(newPage);
    }
    catch { setError('Error deleting state'); }
    setDeleting(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-700">States ({total})</h3>
        <JihAddButton onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setError(''); }}>Add State</JihAddButton>
      </div>
      <JihFab onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setError(''); }} label="Add State" />
      <JihFilterBar className="mb-4 !p-0 !shadow-none !bg-transparent" search={search} onSearchChange={setSearch} placeholder="Search states…" />

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : (
        <>
        {/* Desktop: full table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s, i) => (
                <tr key={s._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditItem(s); setName(s.name); setShowAdd(true); setError(''); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    ><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => setDeleteItem(s)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {states.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400">No states yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list with full-size tap targets */}
        <div className="lg:hidden border rounded-lg divide-y divide-gray-100 overflow-hidden">
          {states.map((s) => (
            <div key={s._id} className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="font-medium text-gray-800 truncate min-w-0 flex-1">{s.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditItem(s); setName(s.name); setShowAdd(true); setError(''); }}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-blue-600 hover:bg-blue-50 rounded"
                ><Pencil className="w-4 h-4" /></button>
                <button
                  onClick={() => setDeleteItem(s)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 rounded"
                ><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {states.length === 0 && (
            <p className="text-center py-8 text-gray-400">No states yet</p>
          )}
        </div>
        </>
      )}

      <PaginationBar
        page={page} totalPages={totalPages} total={total} loading={loading}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {(showAdd) && (
        <Modal
          title={editItem ? 'Edit State' : 'Add State'}
          onClose={() => { setShowAdd(false); setEditItem(null); setError(''); }}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
            placeholder="e.g. Kerala"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowAdd(false); setEditItem(null); }} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg hover:bg-[#1a3a5c] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <ConfirmModal
          message={`Delete state "${deleteItem.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// ── Districts Tab ─────────────────────────────────────────────────────────────
function DistrictsTab() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [stateId, setStateId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCred, setNewCred] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  // Transform state
  const [splitItem, setSplitItem] = useState(null);
  const [splitChildren, setSplitChildren] = useState([]);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [splitSelected, setSplitSelected] = useState([]);
  const [splitCred, setSplitCred] = useState(null);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivorId, setMergeSurvivorId] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { svc.getStates().then(setStates).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await svc.getDistrictsPaginated({
        stateId: selectedState || undefined, page: p, limit: PAGE_SIZE, search: debouncedSearch || undefined
      });
      setDistricts(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch { setError('Failed to load districts'); }
    setLoading(false);
  }, [selectedState, debouncedSearch]);

  // Reset page to 1 when filter changes, then reload
  useEffect(() => {
    setPage(1);
    load(1);
  }, [selectedState, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required');
    if (!editItem && !stateId) return setError('Please select a state');
    setSaving(true); setError('');
    try {
      if (editItem) {
        await svc.updateDistrict(editItem._id, name);
        setShowAdd(false); setEditItem(null); setName('');
        await load(page);
      } else {
        const result = await svc.createDistrict(name, stateId);
        setNewCred({ code: result.data.uniqueCode, password: result.data.plainPassword });
        setShowAdd(false); setName(''); setStateId('');
        await load(page);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving district');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await svc.deleteDistrict(deleteItem._id);
      setDeleteItem(null);
      const newPage = districts.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      await load(newPage);
    } catch { setError('Error deleting district'); }
    setDeleting(false);
  };

  const handleResetPassword = async (id) => {
    try {
      const res = await svc.resetDistrictPassword(id);
      setResetResult({ id, password: res.newPassword });
    } catch { setError('Error resetting password'); }
  };

  const handleSplitOpen = async (d) => {
    setTxError(''); setSplitCred(null);
    setSplitItem(d); setSplitSideA(d.name); setSplitSideB(''); setSplitSelected([]);
    try {
      const children = await svc.getAreas(d._id);
      setSplitChildren(children);
    } catch { setSplitChildren([]); }
  };

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      const res = await svc.splitDistrict(splitItem._id, splitSideA.trim(), splitSideB.trim(), splitSelected);
      setSplitCred(res.data?.sideB);
      setSplitItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeOpen = (d) => {
    setTxError(''); setMergeItem(d); setMergeSurvivorId('');
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivorId) return setTxError('Please select a survivor district');
    setTxWorking(true); setTxError('');
    try {
      await svc.mergeDistricts(mergeSurvivorId, mergeItem._id);
      setMergeItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const allDistricts = await svc.getDistricts(selectedState || undefined);
      const stateName = states.find((s) => s._id === selectedState)?.name;
      const filename = stateName ? `${stateName} districts` : 'districts';
      downloadCsv(
        filename,
        [
          { key: '_index', label: '#' },
          { key: 'name', label: 'District' },
          { key: 'state', label: 'State' },
          { key: 'uniqueCode', label: 'Username' },
          { key: 'password', label: 'Password' }
        ],
        allDistricts.map((d, i) => ({
          _index: i + 1,
          name: d.name,
          state: d.stateId?.name || '',
          uniqueCode: d.uniqueCode,
          password: d.password
        }))
      );
    } catch { setError('Failed to export CSV'); }
    setExporting(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-700">Districts ({total})</h3>
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting || total === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#002349] px-4 text-sm font-semibold text-[#002349] hover:bg-[#002349] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <JihAddButton onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setStateId(''); setError(''); setNewCred(null); }}>Add District</JihAddButton>
        </div>
      </div>
      <JihFab onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setStateId(''); setError(''); setNewCred(null); }} label="Add District" />
      <JihFilterBar
        className="mb-4 !p-0 !shadow-none !bg-transparent"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search districts…"
        activeFilterCount={selectedState ? 1 : 0}
        gridClass="sm:grid-cols-3 lg:grid-cols-4"
        actions={<JihToolbarAction icon={Download} label={exporting ? 'Exporting…' : 'Export CSV'} onClick={handleExportCsv} disabled={exporting || total === 0} className="lg:hidden" />}
      >
        <JihFilterSelect icon={MapPin} value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </JihFilterSelect>
      </JihFilterBar>

      {newCred && (
        <div className="mb-4">
          <CredentialBox code={newCred.code} password={newCred.password} />
        </div>
      )}

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : (
        <>
        {/* Desktop: full table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">State</th>
                <th className="text-left px-4 py-2 font-medium">Username (Code)</th>
                <th className="text-left px-4 py-2 font-medium">Password</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d, i) => (
                <tr key={d._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.stateId?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{d.uniqueCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PasswordCell password={d.password} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button title="Reset password" onClick={() => handleResetPassword(d._id)}
                      className="inline-flex items-center px-2 py-1 text-amber-600 hover:bg-amber-50 rounded">
                      <RefreshCw className="w-3.5 h-3.5" /></button>
                    <button title="Split district" onClick={() => handleSplitOpen(d)}
                      className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                      <Scissors className="w-3.5 h-3.5" /></button>
                    <button title="Merge into another district" onClick={() => handleMergeOpen(d)}
                      className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                      <GitMerge className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditItem(d); setName(d.name); setShowAdd(true); setError(''); }}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteItem(d)}
                      className="inline-flex items-center px-2 py-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {districts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No districts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: name + actions only; tap name for state/username/password */}
        <div className="lg:hidden border rounded-lg divide-y divide-gray-100 overflow-hidden">
          {districts.map((d) => (
            <div key={d._id}>
              <button
                onClick={() => setDetailItem(d)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800 truncate">{d.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
              <div className="flex items-center gap-2 flex-wrap px-4 pb-2.5">
                <button title="Reset password" onClick={() => handleResetPassword(d._id)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-amber-600 hover:bg-amber-50 rounded">
                  <RefreshCw className="w-4 h-4" /></button>
                <button title="Split district" onClick={() => handleSplitOpen(d)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-purple-600 hover:bg-purple-50 rounded">
                  <Scissors className="w-4 h-4" /></button>
                <button title="Merge into another district" onClick={() => handleMergeOpen(d)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-indigo-600 hover:bg-indigo-50 rounded">
                  <GitMerge className="w-4 h-4" /></button>
                <button title="Edit" onClick={() => { setEditItem(d); setName(d.name); setShowAdd(true); setError(''); }}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" /></button>
                <button title="Delete" onClick={() => setDeleteItem(d)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {districts.length === 0 && (
            <p className="text-center py-8 text-gray-400">No districts yet</p>
          )}
        </div>
        </>
      )}

      {detailItem && (
        <DetailModal
          title={detailItem.name}
          onClose={() => setDetailItem(null)}
          rows={[
            { label: 'State', value: detailItem.stateId?.name || '—' },
            { label: 'Username', value: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{detailItem.uniqueCode}</span> },
            { label: 'Password', value: <PasswordCell password={detailItem.password} /> },
          ]}
        />
      )}

      <PaginationBar
        page={page} totalPages={totalPages} total={total} loading={loading}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {resetResult && (
        <Modal title="Password Reset" onClose={() => setResetResult(null)}>
          <p className="text-sm text-gray-600 mb-3">New password generated. Save it now — it won't be shown again.</p>
          <CredentialBox
            code={districts.find((d) => d._id === resetResult.id)?.uniqueCode || ''}
            password={resetResult.password}
          />
          <div className="flex justify-end mt-4">
            <button onClick={() => setResetResult(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal
          title={editItem ? 'Edit District' : 'Add District'}
          onClose={() => { setShowAdd(false); setEditItem(null); setError(''); }}
        >
          {!editItem && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">Select state…</option>
                {states.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-1">District Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
            placeholder="e.g. Malappuram"
          />
          {!editItem && (
            <p className="text-xs text-gray-400 mt-1">
              Username auto-generated: <span className="font-mono">[first word][01/02…]</span> &nbsp;·&nbsp;
              Password: <span className="font-mono">26XXXXX</span>
            </p>
          )}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowAdd(false); setEditItem(null); }} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg hover:bg-[#1a3a5c] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <ConfirmModal
          message={`Delete district "${deleteItem.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}

      {/* Split District Modal */}
      {splitItem && (
        <Modal title={`Split District: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name (original keeps this)</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (new district)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            {splitChildren.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas to move to Side B ({splitSelected.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
                  {splitChildren.map((a) => (
                    <label key={a._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={splitSelected.includes(a._id)}
                        onChange={(e) => setSplitSelected((prev) =>
                          e.target.checked ? [...prev, a._id] : prev.filter((id) => id !== a._id)
                        )} />
                      {a.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Unselected areas remain in Side A (original).</p>
              </div>
            )}
            {splitChildren.length === 0 && (
              <p className="text-sm text-gray-400">No areas found under this district.</p>
            )}
            {txError && <p className="text-red-500 text-sm">{txError}</p>}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="px-4 py-2 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {txWorking ? 'Splitting…' : 'Split'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Split result credentials */}
      {splitCred && (
        <Modal title="Split Complete — Save Side B Credentials" onClose={() => setSplitCred(null)}>
          <p className="text-sm text-gray-600 mb-3">New district "{splitCred.name}" created.</p>
          <CredentialBox code={splitCred.uniqueCode} password={splitCred.plainPassword} />
          <div className="flex justify-end mt-4">
            <button onClick={() => setSplitCred(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {/* Merge District Modal */}
      {mergeItem && (
        <Modal title={`Merge District: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">
            "{mergeItem.name}" will be <strong>deactivated</strong>. All its areas and units will move to the survivor.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivorId} onChange={(e) => setMergeSurvivorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor district…</option>
            {districts.filter((d) => d._id !== mergeItem._id).map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          {txError && <p className="text-red-500 text-sm mt-2">{txError}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivorId}
              className="px-4 py-2 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {txWorking ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Areas Tab ─────────────────────────────────────────────────────────────────
function AreasTab() {
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCred, setNewCred] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  // Transform state
  const [splitItem, setSplitItem] = useState(null);
  const [splitChildren, setSplitChildren] = useState([]);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [splitSelected, setSplitSelected] = useState([]);
  const [splitCred, setSplitCred] = useState(null);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivorId, setMergeSurvivorId] = useState('');
  const [transferItem, setTransferItem] = useState(null);
  const [transferDistrictId, setTransferDistrictId] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { svc.getDistricts().then(setDistricts).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await svc.getAreasPaginated({
        districtId: selectedDistrict || undefined, page: p, limit: PAGE_SIZE, search: debouncedSearch || undefined
      });
      setAreas(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch { setError('Failed to load areas'); }
    setLoading(false);
  }, [selectedDistrict, debouncedSearch]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [selectedDistrict, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required');
    if (!editItem && !districtId) return setError('Please select a district');
    setSaving(true); setError('');
    try {
      if (editItem) {
        await svc.updateArea(editItem._id, name);
        setShowAdd(false); setEditItem(null); setName('');
        await load(page);
      } else {
        const result = await svc.createArea(name, districtId);
        setNewCred({ code: result.data.uniqueCode, password: result.data.plainPassword });
        setShowAdd(false); setName(''); setDistrictId('');
        await load(page);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving area');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await svc.deleteArea(deleteItem._id);
      setDeleteItem(null);
      const newPage = areas.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      await load(newPage);
    } catch { setError('Error deleting area'); }
    setDeleting(false);
  };

  const handleResetPassword = async (id) => {
    try {
      const res = await svc.resetAreaPassword(id);
      setResetResult({ id, password: res.newPassword });
    } catch { setError('Error resetting password'); }
  };

  const handleSplitOpen = async (a) => {
    setTxError(''); setSplitCred(null);
    setSplitItem(a); setSplitSideA(a.name); setSplitSideB(''); setSplitSelected([]);
    try {
      const children = await svc.getUnits({ areaId: a._id });
      setSplitChildren(children);
    } catch { setSplitChildren([]); }
  };

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      const res = await svc.splitArea(splitItem._id, splitSideA.trim(), splitSideB.trim(), splitSelected);
      setSplitCred(res.data?.sideB);
      setSplitItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeOpen = (a) => {
    setTxError(''); setMergeItem(a); setMergeSurvivorId('');
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivorId) return setTxError('Please select a survivor area');
    setTxWorking(true); setTxError('');
    try {
      await svc.mergeAreas(mergeSurvivorId, mergeItem._id);
      setMergeItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleTransferOpen = (a) => {
    setTxError(''); setTransferItem(a); setTransferDistrictId('');
  };

  const handleTransferConfirm = async () => {
    if (!transferDistrictId) return setTxError('Please select a target district');
    setTxWorking(true); setTxError('');
    try {
      await svc.transferArea(transferItem._id, transferDistrictId);
      setTransferItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Transfer failed'); }
    setTxWorking(false);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const allAreas = await svc.getAreas(selectedDistrict || undefined);
      let rows;
      let filename;
      if (selectedDistrict) {
        const d = districts.find((x) => x._id === selectedDistrict);
        filename = d ? `${d.name} areas` : 'areas';
        rows = [...allAreas].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        filename = 'areas';
        rows = [...allAreas].sort((a, b) => {
          const dCompare = (a.districtId?.name || '').localeCompare(b.districtId?.name || '');
          return dCompare !== 0 ? dCompare : a.name.localeCompare(b.name);
        });
      }
      downloadCsv(
        filename,
        [
          { key: '_index', label: '#' },
          { key: 'name', label: 'Area' },
          { key: 'district', label: 'District' },
          { key: 'uniqueCode', label: 'Username' },
          { key: 'password', label: 'Password' }
        ],
        rows.map((a, i) => ({
          _index: i + 1,
          name: a.name,
          district: a.districtId?.name || '',
          uniqueCode: a.uniqueCode,
          password: a.password
        }))
      );
    } catch { setError('Failed to export CSV'); }
    setExporting(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-700">Areas ({total})</h3>
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting || total === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#002349] px-4 text-sm font-semibold text-[#002349] hover:bg-[#002349] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <JihAddButton onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setDistrictId(''); setError(''); setNewCred(null); }}>Add Area</JihAddButton>
        </div>
      </div>
      <JihFab onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setDistrictId(''); setError(''); setNewCred(null); }} label="Add Area" />
      <JihFilterBar
        className="mb-4 !p-0 !shadow-none !bg-transparent"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search areas…"
        activeFilterCount={selectedDistrict ? 1 : 0}
        gridClass="sm:grid-cols-3 lg:grid-cols-4"
        actions={<JihToolbarAction icon={Download} label={exporting ? 'Exporting…' : 'Export CSV'} onClick={handleExportCsv} disabled={exporting || total === 0} className="lg:hidden" />}
      >
        <JihFilterSelect icon={MapPin} value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </JihFilterSelect>
      </JihFilterBar>

      {newCred && (
        <div className="mb-4">
          <CredentialBox code={newCred.code} password={newCred.password} />
        </div>
      )}

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : (
        <>
        {/* Desktop: full table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">District</th>
                <th className="text-left px-4 py-2 font-medium">Username (Code)</th>
                <th className="text-left px-4 py-2 font-medium">Password</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a, i) => (
                <tr key={a._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.districtId?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{a.uniqueCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PasswordCell password={a.password} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button title="Reset password" onClick={() => handleResetPassword(a._id)}
                      className="inline-flex items-center px-2 py-1 text-amber-600 hover:bg-amber-50 rounded">
                      <RefreshCw className="w-3.5 h-3.5" /></button>
                    <button title="Split area" onClick={() => handleSplitOpen(a)}
                      className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                      <Scissors className="w-3.5 h-3.5" /></button>
                    <button title="Merge into another area" onClick={() => handleMergeOpen(a)}
                      className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                      <GitMerge className="w-3.5 h-3.5" /></button>
                    <button title="Transfer to another district" onClick={() => handleTransferOpen(a)}
                      className="inline-flex items-center px-2 py-1 text-teal-600 hover:bg-teal-50 rounded">
                      <ArrowRightLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditItem(a); setName(a.name); setShowAdd(true); setError(''); }}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteItem(a)}
                      className="inline-flex items-center px-2 py-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No areas yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: name + actions only; tap name for district/username/password */}
        <div className="lg:hidden border rounded-lg divide-y divide-gray-100 overflow-hidden">
          {areas.map((a) => (
            <div key={a._id}>
              <button
                onClick={() => setDetailItem(a)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800 truncate">{a.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
              <div className="flex items-center gap-2 flex-wrap px-4 pb-2.5">
                <button title="Reset password" onClick={() => handleResetPassword(a._id)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-amber-600 hover:bg-amber-50 rounded">
                  <RefreshCw className="w-4 h-4" /></button>
                <button title="Split area" onClick={() => handleSplitOpen(a)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-purple-600 hover:bg-purple-50 rounded">
                  <Scissors className="w-4 h-4" /></button>
                <button title="Merge into another area" onClick={() => handleMergeOpen(a)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-indigo-600 hover:bg-indigo-50 rounded">
                  <GitMerge className="w-4 h-4" /></button>
                <button title="Transfer to another district" onClick={() => handleTransferOpen(a)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-teal-600 hover:bg-teal-50 rounded">
                  <ArrowRightLeft className="w-4 h-4" /></button>
                <button title="Edit" onClick={() => { setEditItem(a); setName(a.name); setShowAdd(true); setError(''); }}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" /></button>
                <button title="Delete" onClick={() => setDeleteItem(a)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {areas.length === 0 && (
            <p className="text-center py-8 text-gray-400">No areas yet</p>
          )}
        </div>
        </>
      )}

      {detailItem && (
        <DetailModal
          title={detailItem.name}
          onClose={() => setDetailItem(null)}
          rows={[
            { label: 'District', value: detailItem.districtId?.name || '—' },
            { label: 'Username', value: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{detailItem.uniqueCode}</span> },
            { label: 'Password', value: <PasswordCell password={detailItem.password} /> },
          ]}
        />
      )}

      <PaginationBar
        page={page} totalPages={totalPages} total={total} loading={loading}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {resetResult && (
        <Modal title="Password Reset" onClose={() => setResetResult(null)}>
          <p className="text-sm text-gray-600 mb-3">New password generated.</p>
          <CredentialBox
            code={areas.find((a) => a._id === resetResult.id)?.uniqueCode || ''}
            password={resetResult.password}
          />
          <div className="flex justify-end mt-4">
            <button onClick={() => setResetResult(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal
          title={editItem ? 'Edit Area' : 'Add Area'}
          onClose={() => { setShowAdd(false); setEditItem(null); setError(''); }}
        >
          {!editItem && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">Select district…</option>
                {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
            placeholder="e.g. Kazhakannu"
          />
          {!editItem && (
            <p className="text-xs text-gray-400 mt-1">
              Username: <span className="font-mono">[4 letters][distCode][3-digit random]</span> &nbsp;·&nbsp;
              Password: <span className="font-mono">26XXXX</span>
            </p>
          )}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowAdd(false); setEditItem(null); }} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg hover:bg-[#1a3a5c] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <ConfirmModal
          message={`Delete area "${deleteItem.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}

      {/* Split Area Modal */}
      {splitItem && (
        <Modal title={`Split Area: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name (original keeps this)</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (new area)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            {splitChildren.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units to move to Side B ({splitSelected.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
                  {splitChildren.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={splitSelected.includes(u._id)}
                        onChange={(e) => setSplitSelected((prev) =>
                          e.target.checked ? [...prev, u._id] : prev.filter((id) => id !== u._id)
                        )} />
                      {u.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Unselected units remain in Side A (original).</p>
              </div>
            )}
            {txError && <p className="text-red-500 text-sm">{txError}</p>}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="px-4 py-2 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {txWorking ? 'Splitting…' : 'Split'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {splitCred && (
        <Modal title="Split Complete — Save Side B Credentials" onClose={() => setSplitCred(null)}>
          <p className="text-sm text-gray-600 mb-3">New area "{splitCred.name}" created.</p>
          <CredentialBox code={splitCred.uniqueCode} password={splitCred.plainPassword} />
          <div className="flex justify-end mt-4">
            <button onClick={() => setSplitCred(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {/* Merge Area Modal */}
      {mergeItem && (
        <Modal title={`Merge Area: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">
            "{mergeItem.name}" will be <strong>deactivated</strong>. All its units move to the survivor.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivorId} onChange={(e) => setMergeSurvivorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor area…</option>
            {areas.filter((a) => a._id !== mergeItem._id).map((a) => (
              <option key={a._id} value={a._id}>{a.name} ({a.districtId?.name})</option>
            ))}
          </select>
          {txError && <p className="text-red-500 text-sm mt-2">{txError}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivorId}
              className="px-4 py-2 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {txWorking ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </Modal>
      )}

      {/* Transfer Area Modal */}
      {transferItem && (
        <Modal title={`Transfer Area: "${transferItem.name}"`} onClose={() => setTransferItem(null)}>
          <p className="text-sm text-gray-600 mb-3">
            Move "{transferItem.name}" and all its units to a different district.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target district</label>
          <select value={transferDistrictId} onChange={(e) => setTransferDistrictId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select district…</option>
            {districts.filter((d) => d._id !== (transferItem.districtId?._id || transferItem.districtId)).map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          {txError && <p className="text-red-500 text-sm mt-2">{txError}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setTransferItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleTransferConfirm} disabled={txWorking || !transferDistrictId}
              className="px-4 py-2 min-h-[44px] bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {txWorking ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Units Tab ─────────────────────────────────────────────────────────────────
function UnitsTab() {
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filteredAreas, setFilteredAreas] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCred, setNewCred] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  // Transform state
  const [splitItem, setSplitItem] = useState(null);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [splitCred, setSplitCred] = useState(null);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivorId, setMergeSurvivorId] = useState('');
  const [transferItem, setTransferItem] = useState(null);
  const [transferAreaId, setTransferAreaId] = useState('');
  const [transferAreaDistrict, setTransferAreaDistrict] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { svc.getDistricts().then(setDistricts).catch(() => {}); }, []);
  useEffect(() => { svc.getAreas().then(setAreas).catch(() => {}); }, []);

  useEffect(() => {
    if (districtId) setFilteredAreas(areas.filter((a) => a.districtId?._id === districtId || a.districtId === districtId));
    else setFilteredAreas(areas);
  }, [districtId, areas]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await svc.getUnitsPaginated({
        areaId: selectedArea || undefined,
        districtId: selectedDistrict || undefined,
        page: p,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
      });
      setUnits(res.data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data.length);
    } catch { setError('Failed to load units'); }
    setLoading(false);
  }, [selectedArea, selectedDistrict, debouncedSearch]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [selectedArea, selectedDistrict, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required');
    if (!editItem) {
      if (!districtId) return setError('Please select a district');
      if (!areaId) return setError('Please select an area');
    }
    setSaving(true); setError('');
    try {
      if (editItem) {
        await svc.updateUnit(editItem._id, name);
        setShowAdd(false); setEditItem(null); setName('');
        await load(page);
      } else {
        const result = await svc.createUnit(name, areaId, districtId);
        setNewCred({ code: result.data.uniqueCode, password: result.data.plainPassword });
        setShowAdd(false); setName(''); setDistrictId(''); setAreaId('');
        await load(page);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Error saving unit');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await svc.deleteUnit(deleteItem._id);
      setDeleteItem(null);
      const newPage = units.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      await load(newPage);
    } catch { setError('Error deleting unit'); }
    setDeleting(false);
  };

  const handleResetPassword = async (id) => {
    try {
      const res = await svc.resetUnitPassword(id);
      setResetResult({ id, password: res.newPassword });
    } catch { setError('Error resetting password'); }
  };

  const handleSplitOpen = (u) => {
    setTxError(''); setSplitCred(null);
    setSplitItem(u); setSplitSideA(u.name); setSplitSideB('');
  };

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      const res = await svc.splitUnit(splitItem._id, splitSideA.trim(), splitSideB.trim());
      setSplitCred(res.data?.sideB);
      setSplitItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeOpen = (u) => {
    setTxError(''); setMergeItem(u); setMergeSurvivorId('');
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivorId) return setTxError('Please select a survivor unit');
    setTxWorking(true); setTxError('');
    try {
      await svc.mergeUnits(mergeSurvivorId, mergeItem._id);
      setMergeItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleTransferOpen = (u) => {
    setTxError(''); setTransferItem(u); setTransferAreaId(''); setTransferAreaDistrict('');
  };

  const handleTransferConfirm = async () => {
    if (!transferAreaId) return setTxError('Please select a target area');
    setTxWorking(true); setTxError('');
    try {
      await svc.transferUnit(transferItem._id, transferAreaId);
      setTransferItem(null); await load(page);
    } catch (e) { setTxError(e.response?.data?.message || 'Transfer failed'); }
    setTxWorking(false);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const allUnits = await svc.getUnits({
        areaId: selectedArea || undefined,
        districtId: selectedDistrict || undefined
      });
      let rows = [...allUnits];
      let filename;
      if (selectedArea) {
        const a = areas.find((x) => x._id === selectedArea);
        filename = a ? `${a.name} units` : 'units';
        rows.sort((x, y) => x.name.localeCompare(y.name));
      } else if (selectedDistrict) {
        const d = districts.find((x) => x._id === selectedDistrict);
        filename = d ? `${d.name} units` : 'units';
        rows.sort((x, y) => {
          const aCompare = (x.areaId?.name || '').localeCompare(y.areaId?.name || '');
          return aCompare !== 0 ? aCompare : x.name.localeCompare(y.name);
        });
      } else {
        filename = 'units';
        rows.sort((x, y) => {
          const dCompare = (x.districtId?.name || '').localeCompare(y.districtId?.name || '');
          if (dCompare !== 0) return dCompare;
          const aCompare = (x.areaId?.name || '').localeCompare(y.areaId?.name || '');
          return aCompare !== 0 ? aCompare : x.name.localeCompare(y.name);
        });
      }
      downloadCsv(
        filename,
        [
          { key: '_index', label: '#' },
          { key: 'name', label: 'Unit' },
          { key: 'area', label: 'Area' },
          { key: 'district', label: 'District' },
          { key: 'uniqueCode', label: 'Username' },
          { key: 'password', label: 'Password' }
        ],
        rows.map((u, i) => ({
          _index: i + 1,
          name: u.name,
          area: u.areaId?.name || '',
          district: u.districtId?.name || '',
          uniqueCode: u.uniqueCode,
          password: u.password
        }))
      );
    } catch { setError('Failed to export CSV'); }
    setExporting(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-700">Units ({total})</h3>
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting || total === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#002349] px-4 text-sm font-semibold text-[#002349] hover:bg-[#002349] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <JihAddButton onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setDistrictId(''); setAreaId(''); setError(''); setNewCred(null); }}>Add Unit</JihAddButton>
        </div>
      </div>
      <JihFab onClick={() => { setShowAdd(true); setEditItem(null); setName(''); setDistrictId(''); setAreaId(''); setError(''); setNewCred(null); }} label="Add Unit" />
      <JihFilterBar
        className="mb-4 !p-0 !shadow-none !bg-transparent"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search units…"
        activeFilterCount={[selectedDistrict, selectedArea].filter(Boolean).length}
        gridClass="sm:grid-cols-3 lg:grid-cols-4"
        actions={<JihToolbarAction icon={Download} label={exporting ? 'Exporting…' : 'Export CSV'} onClick={handleExportCsv} disabled={exporting || total === 0} className="lg:hidden" />}
      >
        <JihFilterSelect icon={MapPin} value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedArea(''); }}>
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </JihFilterSelect>
        <JihFilterSelect icon={Building2} value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
          <option value="">All Areas</option>
          {areas
            .filter((a) => !selectedDistrict || a.districtId?._id === selectedDistrict || a.districtId === selectedDistrict)
            .map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </JihFilterSelect>
      </JihFilterBar>

      {newCred && (
        <div className="mb-4">
          <CredentialBox code={newCred.code} password={newCred.password} />
        </div>
      )}

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : (
        <>
        {/* Desktop: full table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Area</th>
                <th className="text-left px-4 py-2 font-medium">District</th>
                <th className="text-left px-4 py-2 font-medium">Username (Code)</th>
                <th className="text-left px-4 py-2 font-medium">Password</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.areaId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.districtId?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{u.uniqueCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PasswordCell password={u.password} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button title="Reset password" onClick={() => handleResetPassword(u._id)}
                      className="inline-flex items-center px-2 py-1 text-amber-600 hover:bg-amber-50 rounded">
                      <RefreshCw className="w-3.5 h-3.5" /></button>
                    <button title="Split unit" onClick={() => handleSplitOpen(u)}
                      className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                      <Scissors className="w-3.5 h-3.5" /></button>
                    <button title="Merge into another unit" onClick={() => handleMergeOpen(u)}
                      className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                      <GitMerge className="w-3.5 h-3.5" /></button>
                    <button title="Transfer to another area" onClick={() => handleTransferOpen(u)}
                      className="inline-flex items-center px-2 py-1 text-teal-600 hover:bg-teal-50 rounded">
                      <ArrowRightLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditItem(u); setName(u.name); setShowAdd(true); setError(''); }}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteItem(u)}
                      className="inline-flex items-center px-2 py-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No units yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: name + actions only; tap name for area/district/username/password */}
        <div className="lg:hidden border rounded-lg divide-y divide-gray-100 overflow-hidden">
          {units.map((u) => (
            <div key={u._id}>
              <button
                onClick={() => setDetailItem(u)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800 truncate">{u.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
              <div className="flex items-center gap-2 flex-wrap px-4 pb-2.5">
                <button title="Reset password" onClick={() => handleResetPassword(u._id)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-amber-600 hover:bg-amber-50 rounded">
                  <RefreshCw className="w-4 h-4" /></button>
                <button title="Split unit" onClick={() => handleSplitOpen(u)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-purple-600 hover:bg-purple-50 rounded">
                  <Scissors className="w-4 h-4" /></button>
                <button title="Merge into another unit" onClick={() => handleMergeOpen(u)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-indigo-600 hover:bg-indigo-50 rounded">
                  <GitMerge className="w-4 h-4" /></button>
                <button title="Transfer to another area" onClick={() => handleTransferOpen(u)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-teal-600 hover:bg-teal-50 rounded">
                  <ArrowRightLeft className="w-4 h-4" /></button>
                <button title="Edit" onClick={() => { setEditItem(u); setName(u.name); setShowAdd(true); setError(''); }}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-blue-600 hover:bg-blue-50 rounded">
                  <Pencil className="w-4 h-4" /></button>
                <button title="Delete" onClick={() => setDeleteItem(u)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {units.length === 0 && (
            <p className="text-center py-8 text-gray-400">No units yet</p>
          )}
        </div>
        </>
      )}

      {detailItem && (
        <DetailModal
          title={detailItem.name}
          onClose={() => setDetailItem(null)}
          rows={[
            { label: 'Area', value: detailItem.areaId?.name || '—' },
            { label: 'District', value: detailItem.districtId?.name || '—' },
            { label: 'Username', value: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[#002349]">{detailItem.uniqueCode}</span> },
            { label: 'Password', value: <PasswordCell password={detailItem.password} /> },
          ]}
        />
      )}

      <PaginationBar
        page={page} totalPages={totalPages} total={total} loading={loading}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      {resetResult && (
        <Modal title="Password Reset" onClose={() => setResetResult(null)}>
          <p className="text-sm text-gray-600 mb-3">New password generated.</p>
          <CredentialBox
            code={units.find((u) => u._id === resetResult.id)?.uniqueCode || ''}
            password={resetResult.password}
          />
          <div className="flex justify-end mt-4">
            <button onClick={() => setResetResult(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal
          title={editItem ? 'Edit Unit' : 'Add Unit'}
          onClose={() => { setShowAdd(false); setEditItem(null); setError(''); }}
        >
          {!editItem && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={districtId}
                onChange={(e) => { setDistrictId(e.target.value); setAreaId(''); }}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">Select district…</option>
                {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">Select area…</option>
                {filteredAreas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
            placeholder="e.g. Mundal"
          />
          {!editItem && (
            <p className="text-xs text-gray-400 mt-1">
              Username: <span className="font-mono">[4 letters][distCode][areaCode]</span> &nbsp;·&nbsp;
              Password: <span className="font-mono">2XXXX</span>
            </p>
          )}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => { setShowAdd(false); setEditItem(null); }} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg hover:bg-[#1a3a5c] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <ConfirmModal
          message={`Delete unit "${deleteItem.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}

      {/* Split Unit Modal */}
      {splitItem && (
        <Modal title={`Split Unit: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name (original keeps this)</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (new unit)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <p className="text-xs text-gray-400">
              Original unit's login user stays with Side A. Side B gets a fresh login.
            </p>
            {txError && <p className="text-red-500 text-sm">{txError}</p>}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="px-4 py-2 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {txWorking ? 'Splitting…' : 'Split'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {splitCred && (
        <Modal title="Split Complete — Save Side B Credentials" onClose={() => setSplitCred(null)}>
          <p className="text-sm text-gray-600 mb-3">New unit "{splitCred.name}" created.</p>
          <CredentialBox code={splitCred.uniqueCode} password={splitCred.plainPassword} />
          <div className="flex justify-end mt-4">
            <button onClick={() => setSplitCred(null)} className="px-4 py-2 min-h-[44px] bg-[#002349] text-white rounded-lg">Done</button>
          </div>
        </Modal>
      )}

      {/* Merge Unit Modal */}
      {mergeItem && (
        <Modal title={`Merge Unit: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">
            "{mergeItem.name}" will be <strong>deactivated</strong>. Its login users move to the survivor.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivorId} onChange={(e) => setMergeSurvivorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor unit…</option>
            {units.filter((u) => u._id !== mergeItem._id).map((u) => (
              <option key={u._id} value={u._id}>{u.name} ({u.areaId?.name})</option>
            ))}
          </select>
          {txError && <p className="text-red-500 text-sm mt-2">{txError}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivorId}
              className="px-4 py-2 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {txWorking ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </Modal>
      )}

      {/* Transfer Unit Modal */}
      {transferItem && (
        <Modal title={`Transfer Unit: "${transferItem.name}"`} onClose={() => setTransferItem(null)}>
          <p className="text-sm text-gray-600 mb-3">Move this unit to a different area.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by district (optional)</label>
          <select value={transferAreaDistrict} onChange={(e) => { setTransferAreaDistrict(e.target.value); setTransferAreaId(''); }}
            className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">All districts</option>
            {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target area</label>
          <select value={transferAreaId} onChange={(e) => setTransferAreaId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select area…</option>
            {areas
              .filter((a) => a._id !== (transferItem.areaId?._id || transferItem.areaId))
              .filter((a) => !transferAreaDistrict || (a.districtId?._id || a.districtId) === transferAreaDistrict)
              .map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.districtId?.name || ''})</option>
              ))}
          </select>
          {txError && <p className="text-red-500 text-sm mt-2">{txError}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setTransferItem(null)} className="px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleTransferConfirm} disabled={txWorking || !transferAreaId}
              className="px-4 py-2 min-h-[44px] bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {txWorking ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LocationMasterPage({ onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('states');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminData = (() => {
    try { return JSON.parse(localStorage.getItem('adminData') || '{}'); } catch { return {}; }
  })();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar
        activeTab="master-data"
        onTabChange={(tab) => {
          if (tab !== 'master-data') navigate('/admin-dashboard', { state: { tab } });
        }}
        onNavigateToReports={() => navigate('/view-reports')}
        onNavigateToNotifications={() => navigate('/notifications')}
        onLogout={onLogout}
        adminEmail={adminData?.email || ''}
        totalForms={0}
        totalSurveys={0}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((p) => !p)}
      />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <MobileTopBar
          title="മാസ്റ്റർ ഡാറ്റ"
        />

        <div className="p-4 pb-24 lg:p-6 lg:pb-6">
          {/* Page header — mobile already gets the title from MobileTopBar above */}
          <div className="hidden lg:block mb-4 lg:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-[#002349]">ലൊക്കേഷൻ മാസ്റ്റർ ഡാറ്റ</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage States, Districts, Areas and Units</p>
          </div>

          {/* Tab bar */}
          <div className="grid grid-cols-4 gap-1 bg-white border rounded-xl p-1 mb-4 lg:mb-6 shadow-sm lg:flex lg:w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-2 px-1 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-sm font-medium transition-all min-w-0 ${
                  activeTab === id
                    ? 'bg-[#002349] text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-full">{label}</span>
              </button>
            ))}
          </div>

          {/* Content card */}
          <div className="bg-white rounded-2xl shadow-sm border p-3 sm:p-6">
            {activeTab === 'states'    && <StatesTab />}
            {activeTab === 'districts' && <DistrictsTab />}
            {activeTab === 'areas'     && <AreasTab />}
            {activeTab === 'units'     && <UnitsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
