import React, { useState, useEffect, useCallback } from 'react';
import { X, Scissors, GitMerge, ArrowRightLeft, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '../../utils/ihthisabi/api';
import Pagination from './Pagination';

const BASE = '/ihthisabi/admin/master-data';

function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm border rounded-lg pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-[#002349]"
      />
    </div>
  );
}

// ── Shared UI Primitives ──────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-[#002349]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block" />;
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-sm mt-2">{msg}</p>;
}

const TABS = [
  { id: 'districts', label: 'ഡിസ്ട്രിക്റ്റ്' },
  { id: 'areas', label: 'ഏരിയ' },
  { id: 'units', label: 'യൂണിറ്റ്' }
];

// ── Districts Tab ─────────────────────────────────────────────────────────────

function DistrictsTab() {
  const [districts, setDistricts] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput);

  // Transform state
  const [splitItem, setSplitItem] = useState(null);
  const [splitAreas, setSplitAreas] = useState([]);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [splitSelected, setSplitSelected] = useState([]);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivor, setMergeSurvivor] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addWorking, setAddWorking] = useState(false);
  const [addError, setAddError] = useState('');
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const res = await api.get(`${BASE}/districts`, { params });
      setDistricts(res.data.data);
      setPagination({
        current: res.data.page || 1,
        pages: res.data.totalPages || 1,
        total: res.data.total ?? res.data.data.length,
        limit: 10
      });
    } catch { setError('Failed to load districts'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const handleSplitOpen = async (d) => {
    setTxError(''); setSplitSideA(d.name); setSplitSideB(''); setSplitSelected([]);
    setSplitItem(d);
    try {
      const res = await api.get(`${BASE}/areas`, { params: { district: d.name } });
      setSplitAreas(res.data.data);
    } catch { setSplitAreas([]); }
  };

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/districts/split`, {
        district: splitItem.name, sideAName: splitSideA.trim(), sideBName: splitSideB.trim(), areas: splitSelected
      });
      setSplitItem(null); load();
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivor) return setTxError('Please select a survivor district');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/districts/merge`, { survivor: mergeSurvivor, absorbed: mergeItem.name });
      setMergeItem(null); load();
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleAddConfirm = async () => {
    const name = addName.trim();
    if (!name) return setAddError('Name is required');
    setAddWorking(true); setAddError('');
    try {
      await api.post(`${BASE}/districts`, { name });
      setAddOpen(false); setAddName(''); load();
    } catch (e) { setAddError(e.response?.data?.message || 'Add failed'); }
    setAddWorking(false);
  };

  const handleRenameConfirm = async () => {
    const newName = renameValue.trim();
    if (!newName) return setTxError('Name is required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/districts/rename`, { oldName: renameItem.name, newName });
      setRenameItem(null); load(pagination.current);
    } catch (e) { setTxError(e.response?.data?.message || 'Rename failed'); }
    setTxWorking(false);
  };

  const handleDeleteConfirm = async () => {
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/districts/delete`, { name: deleteItem.name });
      setDeleteItem(null); load(pagination.current);
    } catch (e) { setTxError(e.response?.data?.message || 'Delete failed'); }
    setTxWorking(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Search districts…" />
        <button
          onClick={() => { setAddOpen(true); setAddName(''); setAddError(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002349] text-white text-sm rounded-lg hover:bg-[#002349]/90">
          <Plus className="w-4 h-4" /> Add District
        </button>
      </div>
      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">District</th>
              <th className="text-left px-4 py-2 font-medium">Members</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d, i) => (
              <tr key={d.name} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                <td className="px-4 py-3 text-gray-600">{d.count}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button title="Rename district" onClick={() => { setTxError(''); setRenameItem(d); setRenameValue(d.name); }}
                    className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                    <Pencil className="w-3.5 h-3.5" /></button>
                  <button title="Split district" onClick={() => handleSplitOpen(d)}
                    className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                    <Scissors className="w-3.5 h-3.5" /></button>
                  <button title="Merge into another district" onClick={() => { setTxError(''); setMergeItem(d); setMergeSurvivor(''); }}
                    className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                    <GitMerge className="w-3.5 h-3.5" /></button>
                  <button
                    title={d.count > 0 ? `Cannot delete: ${d.count} member(s) assigned` : 'Delete district'}
                    onClick={() => { setTxError(''); setDeleteItem(d); }}
                    className="inline-flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {districts.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No districts found</td></tr>
            )}
          </tbody>
        </table>
      )}
      <Pagination pagination={pagination} onPageChange={load} loading={loading} itemLabel="districts" />

      {/* Split Modal */}
      {splitItem && (
        <Modal title={`Split District: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name (remaining users)</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (moved areas)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            {splitAreas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas to move to Side B ({splitSelected.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
                  {splitAreas.map((a) => (
                    <label key={a.name} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={splitSelected.includes(a.name)}
                        onChange={(e) => setSplitSelected((prev) =>
                          e.target.checked ? [...prev, a.name] : prev.filter((n) => n !== a.name)
                        )} />
                      {a.name} ({a.count} members)
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Unselected areas stay in Side A.</p>
              </div>
            )}
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Split
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Merge Modal */}
      {mergeItem && (
        <Modal title={`Merge District: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">
            All members of "{mergeItem.name}" will move to the survivor district.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivor} onChange={(e) => setMergeSurvivor(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor…</option>
            {districts.filter((d) => d.name !== mergeItem.name).map((d) => (
              <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
            ))}
          </select>
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivor}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Merge
            </button>
          </div>
        </Modal>
      )}
      {/* Add District Modal */}
      {addOpen && (
        <Modal title="Add District" onClose={() => setAddOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Thiruvananthapuram"
                autoFocus
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              />
            </div>
            <ErrorMsg msg={addError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddConfirm} disabled={addWorking}
                className="flex items-center gap-2 px-4 py-2 bg-[#002349] text-white rounded-lg hover:bg-[#002349]/90 disabled:opacity-50">
                {addWorking ? <Spinner /> : null} Add
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Rename District Modal */}
      {renameItem && (
        <Modal title={`Rename District: "${renameItem.name}"`} onClose={() => setRenameItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Name</label>
              <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setRenameItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleRenameConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Rename
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Delete District Modal */}
      {deleteItem && (
        <Modal title={`Delete District: "${deleteItem.name}"`} onClose={() => setDeleteItem(null)}>
          {deleteItem.count > 0 ? (
            <p className="text-sm text-red-600">
              Cannot delete — {deleteItem.count} member(s) are still assigned to this district. Transfer or merge them out first.
            </p>
          ) : (
            <p className="text-sm text-gray-600">This will permanently remove "{deleteItem.name}" from Master Data. This action cannot be undone.</p>
          )}
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setDeleteItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={txWorking || deleteItem.count > 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Delete
            </button>
          </div>
        </Modal>
      )}    </div>
  );
}

// ── Areas Tab ─────────────────────────────────────────────────────────────────

function AreasTab() {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput);

  // pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [splitItem, setSplitItem] = useState(null);
  const [splitUnits, setSplitUnits] = useState([]);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [splitSelected, setSplitSelected] = useState([]);
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivorKey, setMergeSurvivorKey] = useState('');
  const [transferItem, setTransferItem] = useState(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDistrict, setAddDistrict] = useState('');
  const [addWorking, setAddWorking] = useState(false);
  const [addError, setAddError] = useState('');
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);

  const loadDistricts = useCallback(async () => {
    try {
      const res = await api.get(`${BASE}/districts`);
      setDistricts(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const loadAreas = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: LIMIT };
      if (selectedDistrict) params.district = selectedDistrict;
      if (search) params.search = search;
      const res = await api.get(`${BASE}/areas`, { params });
      setAreas(res.data.data);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch { setError('Failed to load areas'); }
    setLoading(false);
  }, [selectedDistrict, search, page]);

  useEffect(() => { loadDistricts(); }, [loadDistricts]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { loadAreas(); }, [loadAreas]);

  const handleSplitOpen = async (a) => {
    setTxError(''); setSplitSideA(a.name); setSplitSideB(''); setSplitSelected([]);
    setSplitItem(a);
    try {
      const res = await api.get(`${BASE}/units`, { params: { district: a.district, area: a.name } });
      setSplitUnits(res.data.data);
    } catch { setSplitUnits([]); }
  };

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/areas/split`, {
        district: splitItem.district, area: splitItem.name,
        sideAName: splitSideA.trim(), sideBName: splitSideB.trim(), units: splitSelected
      });
      setSplitItem(null); setPage(1); loadAreas();
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivorKey) return setTxError('Please select a survivor area');
    const [sDistrict, sArea] = mergeSurvivorKey.split('|||');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/areas/merge`, {
        survivorDistrict: sDistrict, survivorArea: sArea,
        absorbedDistrict: mergeItem.district, absorbedArea: mergeItem.name
      });
      setMergeItem(null); setPage(1); loadAreas();
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleTransferConfirm = async () => {
    if (!transferTarget) return setTxError('Please select a target district');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/areas/transfer`, {
        district: transferItem.district, area: transferItem.name, newDistrict: transferTarget
      });
      setTransferItem(null); setPage(1); loadAreas();
    } catch (e) { setTxError(e.response?.data?.message || 'Transfer failed'); }
    setTxWorking(false);
  };

  const handleAddConfirm = async () => {
    const name = addName.trim();
    if (!name) return setAddError('Area name is required');
    if (!addDistrict) return setAddError('Please select a district');
    setAddWorking(true); setAddError('');
    try {
      await api.post(`${BASE}/areas`, { name, district: addDistrict });
      setAddOpen(false); setAddName(''); setAddDistrict(''); loadAreas();
    } catch (e) { setAddError(e.response?.data?.message || 'Add failed'); }
    setAddWorking(false);
  };

  const handleRenameConfirm = async () => {
    const newName = renameValue.trim();
    if (!newName) return setTxError('Name is required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/areas/rename`, { district: renameItem.district, oldName: renameItem.name, newName });
      setRenameItem(null); loadAreas();
    } catch (e) { setTxError(e.response?.data?.message || 'Rename failed'); }
    setTxWorking(false);
  };

  const handleDeleteConfirm = async () => {
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/areas/delete`, { district: deleteItem.district, name: deleteItem.name });
      setDeleteItem(null); loadAreas();
    } catch (e) { setTxError(e.response?.data?.message || 'Delete failed'); }
    setTxWorking(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter by district:</label>
        <select value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
          className="text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#002349]">
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Search areas…" />
        <div className="ml-auto">
          <button
            onClick={() => { setAddOpen(true); setAddName(''); setAddDistrict(''); setAddError(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002349] text-white text-sm rounded-lg hover:bg-[#002349]/90">
            <Plus className="w-4 h-4" /> Add Area
          </button>
        </div>
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Area</th>
                <th className="text-left px-4 py-2 font-medium">District</th>
                <th className="text-left px-4 py-2 font-medium">Members</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a, i) => (
                <tr key={`${a.district}-${a.name}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.district}</td>
                  <td className="px-4 py-3 text-gray-600">{a.count}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button title="Rename area" onClick={() => { setTxError(''); setRenameItem(a); setRenameValue(a.name); }}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-3.5 h-3.5" /></button>
                    <button title="Split area" onClick={() => handleSplitOpen(a)}
                      className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                      <Scissors className="w-3.5 h-3.5" /></button>
                    <button title="Merge into another area" onClick={() => { setTxError(''); setMergeItem(a); setMergeSurvivorKey(''); }}
                      className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                      <GitMerge className="w-3.5 h-3.5" /></button>
                    <button title="Transfer to another district" onClick={() => { setTxError(''); setTransferItem(a); setTransferTarget(''); }}
                      className="inline-flex items-center px-2 py-1 text-teal-600 hover:bg-teal-50 rounded">
                      <ArrowRightLeft className="w-3.5 h-3.5" /></button>
                    <button
                      title={a.count > 0 ? `Cannot delete: ${a.count} member(s) assigned` : 'Delete area'}
                      onClick={() => { setTxError(''); setDeleteItem(a); }}
                      className="inline-flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No areas found</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <p className="text-xs text-gray-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Split Area Modal */}
      {splitItem && (
        <Modal title={`Split Area: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (new area)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            {splitUnits.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units to move to Side B ({splitSelected.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
                  {splitUnits.map((u) => (
                    <label key={u.name} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={splitSelected.includes(u.name)}
                        onChange={(e) => setSplitSelected((prev) =>
                          e.target.checked ? [...prev, u.name] : prev.filter((n) => n !== u.name)
                        )} />
                      {u.name} ({u.count} members)
                    </label>
                  ))}
                </div>
              </div>
            )}
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Split
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Merge Area Modal */}
      {mergeItem && (
        <Modal title={`Merge Area: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">All members of "{mergeItem.name}" move to the survivor area.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivorKey} onChange={(e) => setMergeSurvivorKey(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor area…</option>
            {areas.filter((a) => !(a.name === mergeItem.name && a.district === mergeItem.district)).map((a) => (
              <option key={`${a.district}|||${a.name}`} value={`${a.district}|||${a.name}`}>
                {a.name} ({a.district}) — {a.count}
              </option>
            ))}
          </select>
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivorKey}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Merge
            </button>
          </div>
        </Modal>
      )}

      {/* Transfer Area Modal */}
      {transferItem && (
        <Modal title={`Transfer Area: "${transferItem.name}"`} onClose={() => setTransferItem(null)}>
          <p className="text-sm text-gray-600 mb-3">Move all members of "{transferItem.name}" to a different district.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target district</label>
          <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select district…</option>
            {districts.filter((d) => d.name !== transferItem.district).map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setTransferItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleTransferConfirm} disabled={txWorking || !transferTarget}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Transfer
            </button>
          </div>
        </Modal>
      )}
      {/* Add Area Modal */}
      {addOpen && (
        <Modal title="Add Area" onClose={() => setAddOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={addDistrict}
                onChange={(e) => setAddDistrict(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
                <option value="">Select district…</option>
                {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Kazhakoottam"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              />
            </div>
            <ErrorMsg msg={addError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddConfirm} disabled={addWorking}
                className="flex items-center gap-2 px-4 py-2 bg-[#002349] text-white rounded-lg hover:bg-[#002349]/90 disabled:opacity-50">
                {addWorking ? <Spinner /> : null} Add
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Rename Area Modal */}
      {renameItem && (
        <Modal title={`Rename Area: "${renameItem.name}"`} onClose={() => setRenameItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Name</label>
              <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setRenameItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleRenameConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Rename
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Delete Area Modal */}
      {deleteItem && (
        <Modal title={`Delete Area: "${deleteItem.name}"`} onClose={() => setDeleteItem(null)}>
          {deleteItem.count > 0 ? (
            <p className="text-sm text-red-600">
              Cannot delete — {deleteItem.count} member(s) are still assigned to this area. Transfer or merge them out first.
            </p>
          ) : (
            <p className="text-sm text-gray-600">This will permanently remove "{deleteItem.name}" from Master Data. This action cannot be undone.</p>
          )}
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setDeleteItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={txWorking || deleteItem.count > 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Delete
            </button>
          </div>
        </Modal>
      )}    </div>
  );
}

// ── Units Tab ─────────────────────────────────────────────────────────────────

function UnitsTab() {
  const [districts, setDistricts] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput);

  // pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [splitItem, setSplitItem] = useState(null);
  const [splitSideA, setSplitSideA] = useState('');
  const [splitSideB, setSplitSideB] = useState('');
  const [mergeItem, setMergeItem] = useState(null);
  const [mergeSurvivorKey, setMergeSurvivorKey] = useState('');
  const [transferItem, setTransferItem] = useState(null);
  const [transferDistrictFilter, setTransferDistrictFilter] = useState('');
  const [transferTargetKey, setTransferTargetKey] = useState('');
  const [txWorking, setTxWorking] = useState(false);
  const [txError, setTxError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDistrict, setAddDistrict] = useState('');
  const [addArea, setAddArea] = useState('');
  const [addAreas, setAddAreas] = useState([]);
  const [addWorking, setAddWorking] = useState(false);
  const [addError, setAddError] = useState('');
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);

  const loadDistricts = useCallback(async () => {
    try {
      const res = await api.get(`${BASE}/districts`);
      setDistricts(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const loadAllAreas = useCallback(async () => {
    try {
      const res = await api.get(`${BASE}/areas`);
      setAllAreas(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const loadUnits = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: LIMIT };
      if (selectedDistrict) params.district = selectedDistrict;
      if (selectedArea) params.area = selectedArea;
      if (search) params.search = search;
      const res = await api.get(`${BASE}/units`, { params });
      setUnits(res.data.data);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch { setError('Failed to load units'); }
    setLoading(false);
  }, [selectedDistrict, selectedArea, search, page]);

  useEffect(() => { loadDistricts(); loadAllAreas(); }, [loadDistricts, loadAllAreas]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { loadUnits(); }, [loadUnits]);

  const filteredAreas = allAreas.filter((a) => !selectedDistrict || a.district === selectedDistrict);
  const transferAreas = allAreas.filter((a) => {
    if (!transferItem) return true;
    const sameAsCurrentArea = a.district === transferItem.district && a.name === transferItem.area;
    if (sameAsCurrentArea) return false;
    if (transferDistrictFilter && a.district !== transferDistrictFilter) return false;
    return true;
  });

  const handleSplitConfirm = async () => {
    if (!splitSideA.trim() || !splitSideB.trim()) return setTxError('Both names are required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/units/split`, {
        district: splitItem.district, area: splitItem.area, unit: splitItem.name,
        sideAName: splitSideA.trim(), sideBName: splitSideB.trim()
      });
      setSplitItem(null); setPage(1); loadUnits();
    } catch (e) { setTxError(e.response?.data?.message || 'Split failed'); }
    setTxWorking(false);
  };

  const handleMergeConfirm = async () => {
    if (!mergeSurvivorKey) return setTxError('Please select a survivor unit');
    const [sDistrict, sArea, sUnit] = mergeSurvivorKey.split('|||');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/units/merge`, {
        survivorDistrict: sDistrict, survivorArea: sArea, survivorUnit: sUnit,
        absorbedDistrict: mergeItem.district, absorbedArea: mergeItem.area, absorbedUnit: mergeItem.name
      });
      setMergeItem(null); setPage(1); loadUnits();
    } catch (e) { setTxError(e.response?.data?.message || 'Merge failed'); }
    setTxWorking(false);
  };

  const handleTransferConfirm = async () => {
    if (!transferTargetKey) return setTxError('Please select a target area');
    const [newDistrict, newArea] = transferTargetKey.split('|||');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/units/transfer`, {
        district: transferItem.district, area: transferItem.area, unit: transferItem.name,
        newDistrict, newArea
      });
      setTransferItem(null); setPage(1); loadUnits();
    } catch (e) { setTxError(e.response?.data?.message || 'Transfer failed'); }
    setTxWorking(false);
  };

  const handleAddDistrictChange = async (d) => {
    setAddDistrict(d);
    setAddArea('');
    setAddAreas([]);
    if (d) {
      try {
        const res = await api.get(`${BASE}/areas`, { params: { district: d } });
        setAddAreas(res.data.data);
      } catch { /* ignore */ }
    }
  };

  const handleAddConfirm = async () => {
    const name = addName.trim();
    if (!name) return setAddError('Unit name is required');
    if (!addDistrict) return setAddError('Please select a district');
    if (!addArea) return setAddError('Please select an area');
    setAddWorking(true); setAddError('');
    try {
      await api.post(`${BASE}/units`, { name, district: addDistrict, area: addArea });
      setAddOpen(false); setAddName(''); setAddDistrict(''); setAddArea(''); setAddAreas([]); loadUnits();
    } catch (e) { setAddError(e.response?.data?.message || 'Add failed'); }
    setAddWorking(false);
  };

  const handleRenameConfirm = async () => {
    const newName = renameValue.trim();
    if (!newName) return setTxError('Name is required');
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/units/rename`, {
        district: renameItem.district, area: renameItem.area, oldName: renameItem.name, newName
      });
      setRenameItem(null); loadUnits();
    } catch (e) { setTxError(e.response?.data?.message || 'Rename failed'); }
    setTxWorking(false);
  };

  const handleDeleteConfirm = async () => {
    setTxWorking(true); setTxError('');
    try {
      await api.post(`${BASE}/units/delete`, {
        district: deleteItem.district, area: deleteItem.area, name: deleteItem.name
      });
      setDeleteItem(null); loadUnits();
    } catch (e) { setTxError(e.response?.data?.message || 'Delete failed'); }
    setTxWorking(false);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-600">District:</label>
        <select value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedArea(''); setPage(1); }}
          className="text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#002349]">
          <option value="">All</option>
          {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <label className="text-sm text-gray-600">Area:</label>
        <select value={selectedArea} onChange={(e) => { setSelectedArea(e.target.value); setPage(1); }}
          className="text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#002349]">
          <option value="">All</option>
          {filteredAreas.map((a) => <option key={`${a.district}-${a.name}`} value={a.name}>{a.name}</option>)}
        </select>
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Search units…" />
        <div className="ml-auto">
          <button
            onClick={() => { setAddOpen(true); setAddName(''); setAddDistrict(''); setAddArea(''); setAddAreas([]); setAddError(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002349] text-white text-sm rounded-lg hover:bg-[#002349]/90">
            <Plus className="w-4 h-4" /> Add Unit
          </button>
        </div>
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">Loading…</p> : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Unit</th>
                <th className="text-left px-4 py-2 font-medium">Area</th>
                <th className="text-left px-4 py-2 font-medium">District</th>
                <th className="text-left px-4 py-2 font-medium">Members</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={`${u.district}-${u.area}-${u.name}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.area}</td>
                  <td className="px-4 py-3 text-gray-600">{u.district}</td>
                  <td className="px-4 py-3 text-gray-600">{u.count}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button title="Rename unit" onClick={() => { setTxError(''); setRenameItem(u); setRenameValue(u.name); }}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil className="w-3.5 h-3.5" /></button>
                    <button title="Split unit" onClick={() => { setTxError(''); setSplitSideA(u.name); setSplitSideB(''); setSplitItem(u); }}
                      className="inline-flex items-center px-2 py-1 text-purple-600 hover:bg-purple-50 rounded">
                      <Scissors className="w-3.5 h-3.5" /></button>
                    <button title="Merge into another unit" onClick={() => { setTxError(''); setMergeItem(u); setMergeSurvivorKey(''); }}
                      className="inline-flex items-center px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded">
                      <GitMerge className="w-3.5 h-3.5" /></button>
                    <button title="Transfer to another area" onClick={() => { setTxError(''); setTransferItem(u); setTransferDistrictFilter(''); setTransferTargetKey(''); }}
                      className="inline-flex items-center px-2 py-1 text-teal-600 hover:bg-teal-50 rounded">
                      <ArrowRightLeft className="w-3.5 h-3.5" /></button>
                    <button
                      title={u.count > 0 ? `Cannot delete: ${u.count} member(s) assigned` : 'Delete unit'}
                      onClick={() => { setTxError(''); setDeleteItem(u); }}
                      className="inline-flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No units found</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <p className="text-xs text-gray-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Split Unit Modal */}
      {splitItem && (
        <Modal title={`Split Unit: ${splitItem.name}`} onClose={() => setSplitItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side A name (all current members stay)</label>
              <input value={splitSideA} onChange={(e) => setSplitSideA(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side B name (new empty unit)</label>
              <input value={splitSideB} onChange={(e) => setSplitSideB(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setSplitItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSplitConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Split
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Merge Unit Modal */}
      {mergeItem && (
        <Modal title={`Merge Unit: "${mergeItem.name}"`} onClose={() => setMergeItem(null)}>
          <p className="text-sm text-gray-600 mb-3">All members of "{mergeItem.name}" move to the survivor unit.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merge into (survivor)</label>
          <select value={mergeSurvivorKey} onChange={(e) => setMergeSurvivorKey(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select survivor unit…</option>
            {units.filter((u) => !(u.name === mergeItem.name && u.area === mergeItem.area && u.district === mergeItem.district)).map((u) => (
              <option key={`${u.district}|||${u.area}|||${u.name}`} value={`${u.district}|||${u.area}|||${u.name}`}>
                {u.name} ({u.area}, {u.district}) — {u.count}
              </option>
            ))}
          </select>
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setMergeItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleMergeConfirm} disabled={txWorking || !mergeSurvivorKey}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Merge
            </button>
          </div>
        </Modal>
      )}

      {/* Transfer Unit Modal */}
      {transferItem && (
        <Modal title={`Transfer Unit: "${transferItem.name}"`} onClose={() => setTransferItem(null)}>
          <p className="text-sm text-gray-600 mb-3">Move all members of "{transferItem.name}" to a different area.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by district (optional)</label>
          <select value={transferDistrictFilter} onChange={(e) => { setTransferDistrictFilter(e.target.value); setTransferTargetKey(''); }}
            className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">All districts</option>
            {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target area</label>
          <select value={transferTargetKey} onChange={(e) => setTransferTargetKey(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
            <option value="">Select area…</option>
            {transferAreas.map((a) => (
              <option key={`${a.district}|||${a.name}`} value={`${a.district}|||${a.name}`}>
                {a.name} ({a.district})
              </option>
            ))}
          </select>
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setTransferItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleTransferConfirm} disabled={txWorking || !transferTargetKey}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Transfer
            </button>
          </div>
        </Modal>
      )}
      {/* Add Unit Modal */}
      {addOpen && (
        <Modal title="Add Unit" onClose={() => setAddOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={addDistrict}
                onChange={(e) => handleAddDistrictChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]">
                <option value="">Select district…</option>
                {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <select
                value={addArea}
                onChange={(e) => setAddArea(e.target.value)}
                disabled={!addDistrict}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349] disabled:opacity-50">
                <option value="">Select area…</option>
                {addAreas.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Unit 1"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]"
              />
            </div>
            <ErrorMsg msg={addError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddConfirm} disabled={addWorking}
                className="flex items-center gap-2 px-4 py-2 bg-[#002349] text-white rounded-lg hover:bg-[#002349]/90 disabled:opacity-50">
                {addWorking ? <Spinner /> : null} Add
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Rename Unit Modal */}
      {renameItem && (
        <Modal title={`Rename Unit: "${renameItem.name}"`} onClose={() => setRenameItem(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Name</label>
              <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002349]" />
            </div>
            <ErrorMsg msg={txError} />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setRenameItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleRenameConfirm} disabled={txWorking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {txWorking ? <Spinner /> : null} Rename
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Delete Unit Modal */}
      {deleteItem && (
        <Modal title={`Delete Unit: "${deleteItem.name}"`} onClose={() => setDeleteItem(null)}>
          {deleteItem.count > 0 ? (
            <p className="text-sm text-red-600">
              Cannot delete — {deleteItem.count} member(s) are still assigned to this unit. Transfer or merge them out first.
            </p>
          ) : (
            <p className="text-sm text-gray-600">This will permanently remove "{deleteItem.name}" from Master Data. This action cannot be undone.</p>
          )}
          <ErrorMsg msg={txError} />
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setDeleteItem(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={txWorking || deleteItem.count > 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {txWorking ? <Spinner /> : null} Delete
            </button>
          </div>
        </Modal>
      )}    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MasterDataManagement() {
  const [activeTab, setActiveTab] = useState('districts');

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#002349]">മാസ്റ്റർ ഡാറ്റ — Locations</h2>
        <p className="text-sm text-gray-500">Derived from member data. Use Add, Split, Merge, Transfer to manage locations.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white text-[#002349] shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {activeTab === 'districts' && <DistrictsTab />}
        {activeTab === 'areas' && <AreasTab />}
        {activeTab === 'units' && <UnitsTab />}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500 border-t pt-4">
        <span className="flex items-center gap-1"><Plus className="w-3.5 h-3.5 text-[#002349]" /> Add</span>
        <span className="flex items-center gap-1"><Pencil className="w-3.5 h-3.5 text-blue-600" /> Rename</span>
        <span className="flex items-center gap-1"><Scissors className="w-3.5 h-3.5 text-purple-600" /> Split</span>
        <span className="flex items-center gap-1"><GitMerge className="w-3.5 h-3.5 text-indigo-600" /> Merge</span>
        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" /> Transfer</span>
        <span className="flex items-center gap-1"><Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete</span>
      </div>
    </div>
  );
}
