import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target as TargetIcon,
  Plus,
  ChevronRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  TrendingUp,
  Menu,
  X,
  Trash2,
  RefreshCw,
  Users,
  Sliders,
  LayoutList,
  Building2
} from 'lucide-react';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import {
  createTarget,
  bulkCreateTargets,
  listTargets,
  getTarget,
  allocateToAreas,
  allocateToUnits,
  submitCount,
  deleteTarget
} from '../services/targetService';
import jihLogo from '../assets/LogoColor.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

function authH() {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || '';
  return { headers: { Authorization: `Bearer ${token}` } };
}

function distributeEqually(total, n) {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base));
}

const RollupBadge = ({ status, diff }) => {
  if (status === 'exceeded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <TrendingUp size={11} /> +{diff} exceeded
      </span>
    );
  }
  if (status === 'exact') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <Check size={11} /> Exact
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <AlertTriangle size={11} /> {Math.abs(diff)} below
    </span>
  );
};

// ─── Create Target Modal (admin only) ─────────────────────────────────────────

function CreateTargetModal({ districts, onClose, onCreated }) {
  // mode: 'single' | 'bulk'
  const [mode, setMode] = useState('single');
  const [form, setForm] = useState({ title: '', description: '', targetCount: '', districtId: '' });
  // bulk: per-district counts keyed by districtId
  const [bulkCounts, setBulkCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Computed total for bulk mode
  const bulkTotal = useMemo(
    () => Object.values(bulkCounts).reduce((s, v) => s + (Number(v) || 0), 0),
    [bulkCounts]
  );
  const bulkFilledCount = useMemo(
    () => Object.values(bulkCounts).filter(v => Number(v) >= 1).length,
    [bulkCounts]
  );

  const handleSingle = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.targetCount || !form.districtId) {
      setError('Title, target count, and district are required');
      return;
    }
    setSaving(true); setError('');
    try {
      await createTarget({
        title: form.title.trim(),
        description: form.description,
        targetCount: Number(form.targetCount),
        districtId: form.districtId
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error creating target');
    } finally { setSaving(false); }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (bulkFilledCount === 0) { setError('Enter a target count for at least one district'); return; }
    setSaving(true); setError('');
    try {
      const districtRows = districts
        .filter(d => Number(bulkCounts[d._id]) >= 1)
        .map(d => ({ districtId: d._id, targetCount: Number(bulkCounts[d._id]) }));
      await bulkCreateTargets({ title: form.title.trim(), description: form.description, districts: districtRows });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error creating targets');
    } finally { setSaving(false); }
  };

  // Equal-distribute helper for bulk mode
  const handleEqualFill = () => {
    if (!form.targetCount || Number(form.targetCount) < 1) {
      setError('Enter a total count first to distribute equally');
      return;
    }
    setError('');
    const counts = distributeEqually(Number(form.targetCount), districts.length);
    const next = {};
    districts.forEach((d, i) => { next[d._id] = counts[i]; });
    setBulkCounts(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="text-base font-bold text-[#002349]">Create New Target</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>

        <form onSubmit={mode === 'single' ? handleSingle : handleBulk} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Membership Drive 2026"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#002349]/30"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Optional..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#002349]/30 resize-none"
              />
            </div>

            {/* Distribution mode toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Distribution Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    mode === 'single'
                      ? 'bg-[#002349] text-white border-[#002349]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#002349]/40'
                  }`}
                >
                  <Building2 size={13} /> Single District
                </button>
                <button
                  type="button"
                  onClick={() => setMode('bulk')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    mode === 'bulk'
                      ? 'bg-[#002349] text-white border-[#002349]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#002349]/40'
                  }`}
                >
                  <LayoutList size={13} /> All Districts
                </button>
              </div>
            </div>

            {/* ── Single mode ── */}
            {mode === 'single' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Count *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.targetCount}
                    onChange={e => setForm(f => ({ ...f, targetCount: e.target.value }))}
                    placeholder="e.g. 5000"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#002349]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to District *</label>
                  <select
                    value={form.districtId}
                    onChange={e => setForm(f => ({ ...f, districtId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#002349]/30"
                  >
                    <option value="">Select district...</option>
                    {districts.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* ── Bulk mode ── */}
            {mode === 'bulk' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Target Count per District</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={form.targetCount}
                      onChange={e => setForm(f => ({ ...f, targetCount: e.target.value }))}
                      placeholder="Total to split"
                      className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#002349]/30 text-right"
                    />
                    <button
                      type="button"
                      onClick={handleEqualFill}
                      className="flex items-center gap-1 text-xs text-[#002349] font-semibold border border-[#002349]/30 rounded-lg px-2 py-1 hover:bg-[#002349]/5"
                    >
                      <Users size={11} /> Equal split
                    </button>
                  </div>
                </div>

                {/* District table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] bg-gray-50 border-b text-xs font-semibold text-gray-500 px-3 py-2">
                    <span>District</span>
                    <span className="w-28 text-right">Target Count</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {districts.map(d => (
                      <div key={d._id} className="grid grid-cols-[1fr_auto] items-center px-3 py-1.5 hover:bg-gray-50">
                        <span className="text-sm text-gray-800 truncate pr-2">{d.name}</span>
                        <input
                          type="number"
                          min={0}
                          value={bulkCounts[d._id] ?? ''}
                          onChange={e => setBulkCounts(c => ({ ...c, [d._id]: e.target.value }))}
                          placeholder="0"
                          className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-[#002349]/30"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{bulkFilledCount} of {districts.length} districts assigned</span>
                  <span>Total: <strong className="text-[#002349]">{bulkTotal.toLocaleString()}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#002349] text-white rounded-xl py-2 text-sm font-semibold hover:bg-[#1a3a5c] disabled:opacity-60"
            >
              {saving
                ? 'Creating...'
                : mode === 'bulk'
                  ? `Create ${bulkFilledCount > 0 ? bulkFilledCount : ''} Target${bulkFilledCount !== 1 ? 's' : ''}`
                  : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Allocate to Areas Panel (district role) ──────────────────────────────────

function AllocateAreasPanel({ target, districtAlloc, onDone }) {
  const [mode, setMode] = useState('equal');
  const [areas, setAreas] = useState([]);
  const [custom, setCustom] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/targets/locations/areas/${userData.districtId}`, authH());
        const list = r.data.data || r.data || [];
        setAreas(list);
        // Default custom = equal distribution
        const counts = distributeEqually(districtAlloc.allocatedCount, list.length);
        const init = {};
        list.forEach((a, i) => { init[a._id] = counts[i]; });
        setCustom(init);
      } catch { setError('Failed to load areas'); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalCustom = Object.values(custom).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      if (mode === 'equal') {
        await allocateToAreas(target._id, 'equal');
      } else {
        const customAllocations = areas
          .filter(a => Number(custom[a._id]) > 0)
          .map(a => ({ areaId: a._id, allocatedCount: Number(custom[a._id]) }));
        await allocateToAreas(target._id, 'custom', customAllocations);
      }
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error allocating');
    } finally {
      setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Loading areas...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['equal', 'custom'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              mode === m ? 'bg-[#002349] text-white border-[#002349]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#002349]/40'
            }`}
          >
            {m === 'equal' ? <><Users size={13} /> Equal split</> : <><Sliders size={13} /> Custom</>}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="text-xs text-gray-500">
        District allocation: <strong className="text-[#002349]">{districtAlloc.allocatedCount.toLocaleString()}</strong>
        {mode === 'custom' && (
          <span className={`ml-2 ${totalCustom > districtAlloc.allocatedCount ? 'text-red-600' : totalCustom === districtAlloc.allocatedCount ? 'text-green-600' : 'text-amber-600'}`}>
            (Total: {totalCustom.toLocaleString()})
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {areas.map((a, i) => {
          const equalVal = distributeEqually(districtAlloc.allocatedCount, areas.length)[i];
          return (
            <div key={a._id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{a.name}</span>
              {mode === 'equal' ? (
                <span className="text-sm font-semibold text-[#002349] w-20 text-right">{equalVal.toLocaleString()}</span>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={custom[a._id] ?? 0}
                  onChange={e => setCustom(c => ({ ...c, [a._id]: e.target.value }))}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-[#002349]/30"
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || (mode === 'custom' && totalCustom > districtAlloc.allocatedCount)}
        className="w-full bg-[#002349] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a5c] disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save Area Allocations'}
      </button>
    </div>
  );
}

// ─── Allocate to Units Panel (area role) ──────────────────────────────────────

function AllocateUnitsPanel({ target, areaAlloc, onDone }) {
  const [mode, setMode] = useState('equal');
  const [units, setUnits] = useState([]);
  const [custom, setCustom] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/targets/locations/units/${userData.areaId}`, authH());
        const list = r.data.data || r.data || [];
        setUnits(list);
        const counts = distributeEqually(areaAlloc.allocatedCount, list.length);
        const init = {};
        list.forEach((u, i) => { init[u._id] = counts[i]; });
        setCustom(init);
      } catch { setError('Failed to load units'); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalCustom = Object.values(custom).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      if (mode === 'equal') {
        await allocateToUnits(target._id, 'equal');
      } else {
        const customAllocations = units
          .filter(u => Number(custom[u._id]) > 0)
          .map(u => ({ unitId: u._id, allocatedCount: Number(custom[u._id]) }));
        await allocateToUnits(target._id, 'custom', customAllocations);
      }
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error allocating');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Loading units...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['equal', 'custom'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              mode === m ? 'bg-[#002349] text-white border-[#002349]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#002349]/40'
            }`}
          >
            {m === 'equal' ? <><Users size={13} /> Equal split</> : <><Sliders size={13} /> Custom</>}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="text-xs text-gray-500">
        Area allocation: <strong className="text-[#002349]">{areaAlloc.allocatedCount.toLocaleString()}</strong>
        {mode === 'custom' && (
          <span className={`ml-2 ${totalCustom > areaAlloc.allocatedCount ? 'text-red-600' : totalCustom === areaAlloc.allocatedCount ? 'text-green-600' : 'text-amber-600'}`}>
            (Total: {totalCustom.toLocaleString()})
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {units.map((u, i) => {
          const equalVal = distributeEqually(areaAlloc.allocatedCount, units.length)[i];
          return (
            <div key={u._id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{u.name}</span>
              {mode === 'equal' ? (
                <span className="text-sm font-semibold text-[#002349] w-20 text-right">{equalVal.toLocaleString()}</span>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={custom[u._id] ?? 0}
                  onChange={e => setCustom(c => ({ ...c, [u._id]: e.target.value }))}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-[#002349]/30"
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || (mode === 'custom' && totalCustom > areaAlloc.allocatedCount)}
        className="w-full bg-[#002349] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a5c] disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save Unit Allocations'}
      </button>
    </div>
  );
}

// ─── Unit Submit Panel ────────────────────────────────────────────────────────

function UnitSubmitPanel({ target, unitAlloc, onDone }) {
  const [count, setCount] = useState(unitAlloc?.submittedCount ?? unitAlloc?.allocatedCount ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (count === '' || Number(count) < 0) { setError('Enter a valid count (0 or more)'); return; }
    setSaving(true); setError('');
    try {
      await submitCount(target._id, Number(count));
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error submitting');
    } finally { setSaving(false); }
  };

  if (!unitAlloc) {
    return (
      <div className="py-6 text-center text-gray-400 text-sm">
        No target allocated to your unit yet. Please wait for area admin to distribute.
      </div>
    );
  }

  const diff = Number(count) - unitAlloc.allocatedCount;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
        <p className="text-gray-500 text-xs">Allocated to your unit</p>
        <p className="text-2xl font-bold text-[#002349]">{unitAlloc.allocatedCount.toLocaleString()}</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Your actual count</label>
        <input
          type="number"
          min={0}
          value={count}
          onChange={e => setCount(e.target.value)}
          className="w-full border-2 border-[#002349]/30 rounded-xl px-4 py-3 text-xl font-bold text-[#002349] outline-none focus:border-[#002349] text-center"
        />
        {count !== '' && (
          <p className={`text-xs mt-1 text-center font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-amber-600' : 'text-blue-600'}`}>
            {diff > 0 ? `+${diff} above target` : diff < 0 ? `${Math.abs(diff)} below target` : 'Exactly on target'}
          </p>
        )}
      </div>

      {unitAlloc.submittedCount !== null && unitAlloc.submittedCount !== undefined && (
        <p className="text-xs text-gray-400 text-center">
          Previously submitted: <strong>{unitAlloc.submittedCount.toLocaleString()}</strong>
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-[#002349] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a5c] disabled:opacity-60"
      >
        {saving ? 'Submitting...' : 'Submit Count'}
      </button>
    </div>
  );
}

// ─── Target Detail View ───────────────────────────────────────────────────────

function TargetDetailView({ targetId, role, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState(null); // 'allocate-areas' | 'allocate-units' | 'submit'

  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getTarget(targetId);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load target');
    } finally { setLoading(false); }
  }, [targetId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>;
  if (!data) return null;

  const { target, allocations, rollup } = data;

  const districtAlloc = allocations.find(a => a.level === 'district');
  const myAreaAlloc = role === 'area'
    ? allocations.find(a => a.level === 'area' && a.areaId?.toString() === userData.areaId)
    : null;
  const myUnitAlloc = role === 'unit'
    ? allocations.find(a => a.level === 'unit' && a.unitId?.toString() === userData.unitId)
    : null;

  const areaRows = allocations.filter(a => a.level === 'area');
  const unitRows = allocations.filter(a => a.level === 'unit');

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#002349]">
        <ArrowLeft size={15} /> Back to targets
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-[#002349]">{target.title}</h2>
            {target.description && <p className="text-sm text-gray-500 mt-0.5">{target.description}</p>}
            <p className="text-xs text-gray-400 mt-1">District: {target.districtId?.name || '—'}</p>
            {role === 'unit' && (myUnitAlloc?.unitName || userData.unitName) && (
              <p className="text-xs text-gray-400 mt-0.5">Unit: {myUnitAlloc?.unitName || userData.unitName}</p>
            )}
            {role === 'area' && (myAreaAlloc?.areaName || userData.areaName) && (
              <p className="text-xs text-gray-400 mt-0.5">Area: {myAreaAlloc?.areaName || userData.areaName}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Target</p>
            <p className="text-3xl font-bold text-[#002349]">{target.targetCount.toLocaleString()}</p>
          </div>
        </div>
        {/* Rollup summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-xs text-gray-400">Submitted</p>
            <p className="text-lg font-bold text-[#002349]">{rollup.totalSubmitted.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-xs text-gray-400">Allocated to Units</p>
            <p className="text-lg font-bold text-gray-700">{rollup.totalAllocatedToUnits.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-xs text-gray-400">Status</p>
            <div className="flex justify-center mt-0.5">
              <RollupBadge status={rollup.status} diff={rollup.difference} />
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific action panel */}
      {role === 'district' && districtAlloc && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#002349] text-sm">Allocate to Areas</h3>
            <button
              onClick={() => setActivePanel(activePanel === 'allocate-areas' ? null : 'allocate-areas')}
              className="text-xs text-[#002349] hover:underline font-medium"
            >
              {activePanel === 'allocate-areas' ? 'Hide' : 'Open allocation panel'}
            </button>
          </div>
          {activePanel === 'allocate-areas' && (
            <AllocateAreasPanel
              target={target}
              districtAlloc={districtAlloc}
              onDone={() => { setActivePanel(null); load(); }}
            />
          )}
          {/* Show existing area allocations */}
          {areaRows.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Area Allocations</p>
              {areaRows.map(a => (
                <div key={a._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">{a.areaName || a.areaId}</span>
                  <span className="text-sm font-semibold text-[#002349]">{a.allocatedCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {role === 'area' && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          {myAreaAlloc ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#002349] text-sm">Allocate to Units</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your allocation: <strong>{myAreaAlloc.allocatedCount.toLocaleString()}</strong></p>
                </div>
                <button
                  onClick={() => setActivePanel(activePanel === 'allocate-units' ? null : 'allocate-units')}
                  className="text-xs text-[#002349] hover:underline font-medium"
                >
                  {activePanel === 'allocate-units' ? 'Hide' : 'Open allocation panel'}
                </button>
              </div>
              {activePanel === 'allocate-units' && (
                <AllocateUnitsPanel
                  target={target}
                  areaAlloc={myAreaAlloc}
                  onDone={() => { setActivePanel(null); load(); }}
                />
              )}
              {unitRows.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Unit Allocations</p>
                  {unitRows.map(u => (
                    <div key={u._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-gray-800">{u.unitName || u.unitId}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">Allocated: {u.allocatedCount.toLocaleString()}</span>
                        {u.submittedCount !== null && u.submittedCount !== undefined && (
                          <span className="text-xs font-semibold text-green-700">Submitted: {u.submittedCount.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No allocation received yet. Waiting for district admin.</p>
          )}
        </div>
      )}

      {role === 'unit' && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-bold text-[#002349] text-sm mb-4">Submit Your Count</h3>
          <UnitSubmitPanel
            target={target}
            unitAlloc={myUnitAlloc}
            onDone={() => load()}
          />
        </div>
      )}

      {/* Admin / all levels: show full allocation breakdown */}
      {(role === 'admin' || role === 'district') && unitRows.length > 0 && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-bold text-[#002349] text-sm mb-4">Unit Submissions</h3>
          <div className="space-y-1.5">
            {unitRows.map(u => (
              <div key={u._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-gray-800">{u.unitName || u.unitId}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Target: {u.allocatedCount.toLocaleString()}</span>
                  {u.submittedCount !== null && u.submittedCount !== undefined ? (
                    <span className={`text-xs font-semibold ${u.submittedCount >= u.allocatedCount ? 'text-green-700' : 'text-amber-600'}`}>
                      Submitted: {u.submittedCount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Not submitted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main TargetsPage ─────────────────────────────────────────────────────────

const TargetsPage = ({ onLogout }) => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; }
  }, []);
  const storedAdmin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('adminData') || 'null'); } catch { return null; }
  }, []);

  const role = storedAdmin ? 'admin' : (userData.role || '');

  useEffect(() => {
    const d = localStorage.getItem('adminData');
    if (d) setAdminData(JSON.parse(d));
  }, []);

  const loadTargets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await listTargets({ limit: 50 });
      setTargets(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load targets');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTargets(); }, [loadTargets]);

  // Load districts for admin create modal
  useEffect(() => {
    if (role !== 'admin') return;
    axios.get(`${API_BASE}/api/master/districts`, authH())
      .then(r => setDistricts(r.data.data || r.data || []))
      .catch(() => {});
  }, [role]);

  const handleDelete = async () => {
    try {
      await deleteTarget(targetToDelete._id);
      setShowDeleteModal(false);
      setTargetToDelete(null);
      loadTargets();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const sidebarProps = {
    isMobileOpen: isSidebarOpen,
    onMobileToggle: () => setIsSidebarOpen((prev) => !prev),
    onNavigateToMembership: () => navigate('/membership'),
    onLogout: () => setShowLogoutModal(true)
  };

  const SidebarComponent = role === 'admin'
    ? <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen((prev) => !prev)} onLogout={() => setShowLogoutModal(true)} adminData={adminData} />
    : role === 'district'
      ? <DistrictAdminSidebar {...sidebarProps} districtName={userData.district || '—'} />
      : role === 'area'
        ? <AreaAdminSidebar {...sidebarProps} areaName={userData.area || userData.areaName || '—'} districtName={userData.district || ''} />
        : <UnitAdminSidebar {...sidebarProps} unitName={userData.unitName || '—'} areaName={userData.areaName || userData.area || ''} districtName={userData.district || ''} />;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {SidebarComponent}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 z-10 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 lg:hidden"><Menu size={22} /></button>
          <img src={jihLogo} alt="JIH" className="h-8 w-auto" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <TargetIcon size={18} className="text-[#002349]" />
            <span className="font-bold text-[#002349] text-sm hidden sm:block">Targets</span>
          </div>
          {role === 'admin' && !selectedTargetId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-[#002349] text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a5c]"
            >
              <Plus size={15} /> New Target
            </button>
          )}
          <button onClick={() => loadTargets()} className="p-1.5 text-gray-400 hover:text-[#002349] rounded-lg" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6 max-w-4xl mx-auto w-full">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {selectedTargetId ? (
            <TargetDetailView
              targetId={selectedTargetId}
              role={role}
              onBack={() => { setSelectedTargetId(null); loadTargets(); }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-bold text-[#002349]">Targets</h1>
                <span className="text-xs text-gray-400">{targets.length} total</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-7 h-7 border-2 border-[#002349] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : targets.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <TargetIcon size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No targets yet</p>
                  {role === 'admin' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 text-sm text-[#002349] hover:underline font-medium"
                    >
                      Create the first target
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {targets.map(t => (
                    <div
                      key={t._id}
                      className="bg-white rounded-2xl border border-gray-200 hover:border-[#002349]/30 hover:shadow-md transition-all p-4 cursor-pointer"
                      onClick={() => setSelectedTargetId(t._id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{t.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.districtId?.name || '—'}</p>
                          {t.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Target</p>
                            <p className="text-lg font-bold text-[#002349]">{t.targetCount.toLocaleString()}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300" />
                        </div>
                      </div>
                      {role === 'admin' && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={e => { e.stopPropagation(); setTargetToDelete(t); setShowDeleteModal(true); }}
                            className="p-1 text-gray-300 hover:text-red-400 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateTargetModal
          districts={districts}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadTargets(); }}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setTargetToDelete(null); }}
        onConfirm={handleDelete}
        title="Delete Target"
        message={`Delete "${targetToDelete?.title}"? All allocations will also be removed. This cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); onLogout && onLogout(); }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        type="logout"
      />
    </div>
  );
};

export default TargetsPage;
