import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { Plus, Pencil, Trash2, Check, X, Globe, MapPin, Building2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Pagination'

// ── Shared helpers ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'areas', label: 'Areas', icon: MapPin },
  { id: 'units', label: 'Units', icon: Building2 },
  { id: 'unitadmins', label: 'Unit Admins', short: 'Admins', icon: Users },
]

function InlineInput({ value, onChange, onConfirm, onCancel, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
        placeholder={placeholder}
        className="form-input h-[44px] min-w-0 flex-1 text-base sm:h-9 lg:max-w-xs lg:text-sm"
        autoFocus
      />
      <button onClick={onConfirm} className="inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full bg-green-600 px-3 text-[11px] font-medium text-white hover:bg-green-700 sm:h-9 sm:px-4 sm:text-sm">
        <Check className="h-4 w-4" /> Save
      </button>
      <button onClick={onCancel} className="inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full bg-gray-200 px-3 text-[11px] font-medium text-gray-700 hover:bg-gray-300 sm:h-9 sm:px-4 sm:text-sm">
        <X className="h-4 w-4" /> Cancel
      </button>
    </div>
  )
}

// ── Countries Tab ─────────────────────────────────────────────────────────────

function CountriesTab() {
  const [countries, setCountries] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-countries', { params: { page, limit: 10 } })
      setCountries(res.data.data.countries)
      setPagination(res.data.data.pagination || { current: 1, pages: 1, total: res.data.data.countries.length })
    } catch { toast.error('Failed to load countries') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Country title is required'); return }
    setAddLoading(true)
    try {
      await api.post('/ihthisabi/admin/abroad-countries', { title: newTitle.trim() })
      toast.success('Country added')
      setNewTitle(''); setShowAddRow(false); load(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add country') }
    finally { setAddLoading(false) }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Country title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-countries/${id}`, { title: editValue.trim() })
      toast.success('Country updated'); setEditingId(null); load(pagination.current)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update country') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-countries/${deleteModal.id}`)
      toast.success('Country deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); load(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete country') }
  }

  return (
    <div className="space-y-4">
      <div className="hidden items-center gap-2 sm:flex">
        <p className="text-sm text-gray-500">Manage abroad countries</p>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary hidden shrink-0 gap-1 sm:inline-flex sm:h-9 sm:px-4 sm:text-sm ml-auto" disabled={showAddRow}>
          <Plus className="h-4 w-4" /> Add Country
        </button>
      </div>
      <button onClick={() => { setShowAddRow(true); setNewTitle('') }} title="Add Country" aria-label="Add Country" className="ih-fab" disabled={showAddRow}>
        <Plus className="h-5 w-5" />
      </button>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Mobile: roomy tappable rows — one full-width target per record */}
        <div className="lg:hidden">
          {showAddRow && (
            <div className="border-b border-gray-100 bg-blue-50 px-3 py-2">
              <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter country name..." />
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...
            </div>
          ) : countries.length === 0 && !showAddRow ? (
            <div className="py-12 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No countries added yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {countries.map(c => (
                <div key={c._id} className="px-3">
                  {editingId === c._id ? (
                    <div className="py-2"><InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(c._id)} onCancel={() => setEditingId(null)} placeholder="Country name..." /></div>
                  ) : (
                    <div className="min-h-[56px] flex items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Globe className="w-4 h-4 text-blue-600" /></div>
                        <span className="text-[13px] font-semibold text-gray-900 truncate">{c.title}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => { setEditingId(c._id); setEditValue(c.title) }} aria-label="Edit" className="ih-icon-btn text-gray-700 hover:bg-gray-100">
                          <Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteModal({ isOpen: true, id: c._id, title: c.title })} aria-label="Delete" className="ih-icon-btn text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Desktop: table */}
        <table className="hidden lg:table w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Country Name</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {showAddRow && (
              <tr className="bg-blue-50">
                <td className="px-6 py-3" colSpan="2">
                  <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter country name..." />
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan="2" className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...</div></td></tr>
            ) : countries.length === 0 && !showAddRow ? (
              <tr><td colSpan="2" className="px-6 py-12 text-center"><Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No countries added yet</p></td></tr>
            ) : countries.map(c => (
              <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  {editingId === c._id ? (
                    <InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(c._id)} onCancel={() => setEditingId(null)} placeholder="Country name..." />
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Globe className="w-4 h-4 text-blue-600" /></div>
                      <span className="font-medium text-gray-900 truncate">{c.title}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId !== c._id && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingId(c._id); setEditValue(c.title) }} aria-label="Edit" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                        <Pencil className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => setDeleteModal({ isOpen: true, id: c._id, title: c.title })} aria-label="Delete" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={load} loading={loading} itemLabel="countries" />
      </div>
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Country"
        message={`Are you sure you want to delete "${deleteModal.title}"? All areas and units under it will also be deleted. Members must be reassigned first.`}
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
    </div>
  )
}

// ── Areas Tab ─────────────────────────────────────────────────────────────────

function AreasTab() {
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [areas, setAreas] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })

  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries').then(res => setCountries(res.data.data.countries)).catch(() => toast.error('Failed to load countries'))
  }, [])

  const loadAreas = useCallback(async (countryId, page = 1) => {
    if (!countryId) { setAreas([]); return }
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-areas', { params: { country: countryId, page, limit: 10 } })
      setAreas(res.data.data.areas)
      setPagination(res.data.data.pagination || { current: 1, pages: 1, total: res.data.data.areas.length })
    } catch { toast.error('Failed to load areas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAreas(selectedCountry, 1) }, [selectedCountry, loadAreas])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Area title is required'); return }
    if (!selectedCountry) { toast.error('Select a country first'); return }
    try {
      await api.post('/ihthisabi/admin/abroad-areas', { title: newTitle.trim(), countryId: selectedCountry })
      toast.success('Area added'); setNewTitle(''); setShowAddRow(false); loadAreas(selectedCountry, 1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add area') }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Area title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-areas/${id}`, { title: editValue.trim() })
      toast.success('Area updated'); setEditingId(null); loadAreas(selectedCountry, pagination.current)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update area') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-areas/${deleteModal.id}`)
      toast.success('Area deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); loadAreas(selectedCountry, 1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete area') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setShowAddRow(false) }} className="form-input h-[44px] min-w-0 flex-1 sm:h-9 sm:max-w-xs">
          <option value="">Select Country...</option>
          {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} title="Add Area" aria-label="Add Area" className="ih-fab" disabled={!selectedCountry || showAddRow}>
          <Plus className="h-5 w-5" />
        </button>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary hidden shrink-0 gap-1 sm:inline-flex sm:h-9 sm:px-4 sm:text-sm sm:ml-auto" disabled={!selectedCountry || showAddRow}>
          <Plus className="h-4 w-4" /> Add Area
        </button>
      </div>
      {selectedCountry ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Mobile: roomy tappable rows — one full-width target per record */}
          <div className="lg:hidden">
            {showAddRow && (
              <div className="border-b border-gray-100 bg-blue-50 px-3 py-2">
                <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter area name..." />
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...
              </div>
            ) : areas.length === 0 && !showAddRow ? (
              <div className="py-12 text-center">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No areas yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {areas.map(a => (
                  <div key={a._id} className="px-3">
                    {editingId === a._id ? (
                      <div className="py-2"><InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(a._id)} onCancel={() => setEditingId(null)} placeholder="Area name..." /></div>
                    ) : (
                      <div className="min-h-[56px] flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-green-600" /></div>
                          <span className="text-[13px] font-semibold text-gray-900 truncate">{a.title}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button onClick={() => { setEditingId(a._id); setEditValue(a.title) }} aria-label="Edit" className="ih-icon-btn text-gray-700 hover:bg-gray-100">
                            <Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteModal({ isOpen: true, id: a._id, title: a.title })} aria-label="Delete" className="ih-icon-btn text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Desktop: table */}
          <table className="hidden lg:table w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Area Name</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {showAddRow && (
                <tr className="bg-blue-50"><td className="px-6 py-3" colSpan="2">
                  <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter area name..." />
                </td></tr>
              )}
              {loading ? (
                <tr><td colSpan="2" className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...</div></td></tr>
              ) : areas.length === 0 && !showAddRow ? (
                <tr><td colSpan="2" className="px-6 py-12 text-center"><MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No areas yet</p></td></tr>
              ) : areas.map(a => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editingId === a._id ? (
                      <InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(a._id)} onCancel={() => setEditingId(null)} placeholder="Area name..." />
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-green-600" /></div>
                        <span className="font-medium text-gray-900 truncate">{a.title}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId !== a._id && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingId(a._id); setEditValue(a.title) }} aria-label="Edit" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"><Pencil className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Edit</span></button>
                        <button onClick={() => setDeleteModal({ isOpen: true, id: a._id, title: a.title })} aria-label="Delete" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Delete</span></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={pagination} onPageChange={(page) => loadAreas(selectedCountry, page)} loading={loading} itemLabel="areas" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a country to manage its areas</p>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Area"
        message={`Are you sure you want to delete "${deleteModal.title}"? All units under it will also be deleted. Members must be reassigned first.`}
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
    </div>
  )
}

// ── Assign Unit Admin Modal ───────────────────────────────────────────────────

function AssignAdminModal({ unit, onClose, onChanged }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-unitadmins', { params: { unit: unit._id } })
      setAdmins(res.data.data.unitAdmins)
    } catch { toast.error('Failed to load unit admins') }
    finally { setLoading(false) }
  }, [unit._id])

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-members', { params: { unit: unit._id } })
      setMembers(res.data.data.members)
    } catch { toast.error('Failed to load unit members') }
    finally { setLoadingMembers(false) }
  }, [unit._id])

  useEffect(() => { load(); loadMembers() }, [load, loadMembers])

  const adminRuknIds = new Set(admins.map(a => a.ruknId))
  const filteredMembers = members.filter(m => {
    if (!memberSearch.trim()) return true
    const q = memberSearch.toLowerCase()
    return (m.name || '').toLowerCase().includes(q) || (m.ruknId || '').toLowerCase().includes(q)
  })

  const handleCreate = async () => {
    const member = members.find(m => m._id === selectedMemberId)
    if (!member) { toast.error('Select a member to assign as admin'); return }
    setSubmitting(true)
    try {
      await api.post('/ihthisabi/admin/abroad-unitadmins', {
        abroadUnitId: unit._id,
        ruknId: member.ruknId,
        name: member.name,
        contactNo: member.contactNo,
        emailId: member.emailId,
        password
      })
      toast.success('Unit admin assigned')
      setSelectedMemberId(''); setPassword('')
      load(); onChanged()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to assign unit admin') }
    finally { setSubmitting(false) }
  }

  const handleUpdate = async (id) => {
    try {
      await api.put(`/ihthisabi/admin/abroad-unitadmins/${id}`, editForm)
      toast.success('Unit admin updated'); setEditingId(null); load(); onChanged()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update unit admin') }
  }

  const handleRemove = async (id) => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-unitadmins/${id}`)
      toast.success('Unit admin removed'); load(); onChanged()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove unit admin') }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 truncate">Unit Admins — {unit.title}</h3>
          <button onClick={onClose} aria-label="Close" className="shrink-0 p-2 -m-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm text-gray-500">Loading...</div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No unit admin assigned yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {admins.map(a => (
              <div key={a._id} className="border border-gray-200 rounded-lg p-3">
                {editingId === a._id ? (
                  <div className="space-y-2">
                    <input className="form-input w-full text-base lg:text-sm" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                    <input className="form-input w-full text-base lg:text-sm" value={editForm.contactNo} onChange={e => setEditForm(f => ({ ...f, contactNo: e.target.value }))} placeholder="Contact No" />
                    <input className="form-input w-full text-base lg:text-sm" value={editForm.emailId} onChange={e => setEditForm(f => ({ ...f, emailId: e.target.value }))} placeholder="Email" />
                    <input className="form-input w-full text-base lg:text-sm" type="text" onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="New password (optional)" />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(a._id)} className="btn-primary text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">Rukn ID: {a.ruknId}{a.contactNo ? ` · ${a.contactNo}` : ''}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => { setEditingId(a._id); setEditForm({ name: a.name, contactNo: a.contactNo, emailId: a.emailId }) }} aria-label="Edit" className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleRemove(a._id)} aria-label="Remove" className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Assign a member as unit admin</p>
          <input
            type="text"
            className="form-input w-full mb-2 text-base lg:text-sm"
            placeholder="Search members by name or Rukn ID..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
          />
          {loadingMembers ? (
            <div className="text-center py-4 text-sm text-gray-500">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {members.length === 0 ? 'No members found in this unit.' : 'No members match your search.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-3">
              {filteredMembers.map(m => {
                const alreadyAdmin = adminRuknIds.has(m.ruknId)
                return (
                  <label
                    key={m._id}
                    className={`flex items-center gap-2 px-3 py-2 text-sm ${alreadyAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name="assignAdminMember"
                      disabled={alreadyAdmin}
                      checked={selectedMemberId === m._id}
                      onChange={() => setSelectedMemberId(m._id)}
                    />
                    <span className="flex-1 truncate">
                      {m.name} <span className="text-gray-400">· ID: {m.ruknId}</span>
                    </span>
                    {alreadyAdmin && <span className="text-xs text-gray-400 flex-shrink-0">Already admin</span>}
                  </label>
                )
              })}
            </div>
          )}
          <input
            className="form-input w-full mb-2 text-base lg:text-sm"
            type="text"
            placeholder="Password (default: unitadmin123)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button onClick={handleCreate} disabled={submitting || !selectedMemberId} className="btn-primary w-full disabled:opacity-50">
            {submitting ? 'Assigning...' : 'Assign as Admin'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Unit Admins Tab (abroad unit admins only) ────────────────────────────────

function AbroadUnitAdminsTab() {
  const [unitAdmins, setUnitAdmins] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async (page = 1, searchValue = search) => {
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-unitadmins', {
        params: { page, limit: 10, search: searchValue || undefined }
      })
      setUnitAdmins(res.data.data.unitAdmins)
      setPagination(res.data.data.pagination || { current: 1, pages: 1, total: res.data.data.unitAdmins.length })
    } catch { toast.error('Failed to load abroad unit admins') }
    finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce search so typing doesn't fire a request per keystroke (also covers initial load)
  useEffect(() => {
    const t = setTimeout(() => load(1, search), search ? 400 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const filtered = unitAdmins

  const handleToggleActive = async (a) => {
    try {
      await api.put(`/ihthisabi/admin/abroad-unitadmins/${a._id}`, { isActive: !a.isActive })
      load(pagination.current)
    } catch { toast.error('Failed to update status') }
  }

  const handleRemove = async (id) => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-unitadmins/${id}`)
      toast.success('Removed'); load(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-gray-500">All unit admins assigned to abroad units</p>
        <input className="form-input text-base sm:max-w-xs lg:text-sm" placeholder="Search name, Rukn ID, unit..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sm:overflow-x-auto">
        {/* Mobile: roomy tappable rows — one full-width target per record */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No abroad unit admins assigned yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(a => (
                <div key={a._id} className="flex min-h-[56px] items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 truncate leading-snug">{a.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      ID: {a.ruknId} · {a.abroadUnit?.title || '-'}, {a.abroadArea?.title || '-'}, {a.abroadCountry?.title || '-'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {a.contactNo || '-'}{a.emailId ? ` · ${a.emailId}` : ''}
                    </p>
                    <button onClick={() => handleToggleActive(a)} className={`mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${a.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => handleRemove(a._id)} aria-label="Remove" className="ih-icon-btn text-red-500 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Desktop: table */}
        <table className="hidden lg:table w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Admin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...</div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-12 text-center"><Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No abroad unit admins assigned yet</p></td></tr>
            ) : filtered.map(a => (
              <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 max-w-0">
                  <div className="font-medium text-gray-900 truncate">{a.name}</div>
                  <div className="text-xs text-gray-500 truncate">ID: {a.ruknId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{a.abroadUnit?.title || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{a.abroadArea?.title || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{a.abroadCountry?.title || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-0">
                  <div className="truncate">{a.contactNo || '-'}</div>
                  <div className="truncate">{a.emailId || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActive(a)} className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${a.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleRemove(a._id)} aria-label="Remove" className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={(page) => load(page)} loading={loading} itemLabel="abroad unit admins" />
      </div>
    </div>
  )
}

// ── Units Tab ─────────────────────────────────────────────────────────────────

function UnitsTab() {
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [areas, setAreas] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const [units, setUnits] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })
  const [adminsByUnit, setAdminsByUnit] = useState({})
  const [assignModalUnit, setAssignModalUnit] = useState(null)

  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries').then(res => setCountries(res.data.data.countries)).catch(() => toast.error('Failed to load countries'))
  }, [])

  useEffect(() => {
    setSelectedArea(''); setAreas([]); setUnits([])
    if (!selectedCountry) return
    api.get('/ihthisabi/admin/abroad-areas', { params: { country: selectedCountry } }).then(res => setAreas(res.data.data.areas)).catch(() => toast.error('Failed to load areas'))
  }, [selectedCountry])

  const loadUnits = useCallback(async (areaId, page = 1) => {
    if (!areaId) { setUnits([]); return }
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-units', { params: { area: areaId, page, limit: 10 } })
      setUnits(res.data.data.units)
      setPagination(res.data.data.pagination || { current: 1, pages: 1, total: res.data.data.units.length })
    } catch { toast.error('Failed to load units') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUnits(selectedArea, 1) }, [selectedArea, loadUnits])

  const loadAdminsForArea = useCallback(async (areaId) => {
    if (!areaId) { setAdminsByUnit({}); return }
    try {
      const res = await api.get('/ihthisabi/admin/abroad-unitadmins', { params: { area: areaId } })
      const map = {}
      res.data.data.unitAdmins.forEach(a => {
        const uid = a.abroadUnit?._id || a.abroadUnit
        if (!uid) return
        if (!map[uid]) map[uid] = []
        map[uid].push(a)
      })
      setAdminsByUnit(map)
    } catch { /* non-critical, badge just won't show counts */ }
  }, [])

  useEffect(() => { loadAdminsForArea(selectedArea) }, [selectedArea, loadAdminsForArea])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Unit title is required'); return }
    if (!selectedArea || !selectedCountry) { toast.error('Select country and area first'); return }
    try {
      await api.post('/ihthisabi/admin/abroad-units', { title: newTitle.trim(), areaId: selectedArea, countryId: selectedCountry })
      toast.success('Unit added'); setNewTitle(''); setShowAddRow(false); loadUnits(selectedArea, 1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add unit') }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Unit title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-units/${id}`, { title: editValue.trim() })
      toast.success('Unit updated'); setEditingId(null); loadUnits(selectedArea, pagination.current)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update unit') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-units/${deleteModal.id}`)
      toast.success('Unit deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); loadUnits(selectedArea, 1)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete unit') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:flex-wrap sm:justify-between sm:gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none sm:items-center sm:gap-3">
          <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setShowAddRow(false) }} className="form-input h-[44px] min-w-0 sm:h-9 sm:max-w-xs">
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setShowAddRow(false) }} className="form-input h-[44px] min-w-0 sm:h-9 sm:max-w-xs" disabled={!selectedCountry}>
            <option value="">Select Area...</option>
            {areas.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
          </select>
        </div>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary hidden shrink-0 gap-1 sm:inline-flex sm:h-9 sm:px-4 sm:text-sm" disabled={!selectedArea || showAddRow}>
          <Plus className="h-4 w-4" /> Add Unit
        </button>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} title="Add Unit" aria-label="Add Unit" className="ih-fab" disabled={!selectedArea || showAddRow}>
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {selectedArea ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Mobile: roomy tappable rows — one full-width target per record */}
          <div className="lg:hidden">
            {showAddRow && (
              <div className="border-b border-gray-100 bg-blue-50 px-3 py-2">
                <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter unit name..." />
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...
              </div>
            ) : units.length === 0 && !showAddRow ? (
              <div className="py-12 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No units yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {units.map(u => {
                  const unitAdminList = adminsByUnit[u._id] || []
                  return (
                    <div key={u._id} className="px-3">
                      {editingId === u._id ? (
                        <div className="py-2"><InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(u._id)} onCancel={() => setEditingId(null)} placeholder="Unit name..." /></div>
                      ) : (
                        <div className="flex min-h-[64px] items-center gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4 text-purple-600" /></div>
                              <span className="text-[13px] font-semibold text-gray-900 truncate">{u.title}</span>
                            </div>
                            <button
                              onClick={() => setAssignModalUnit(u)}
                              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Users className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {unitAdminList.length > 0
                                  ? unitAdminList.map(a => a.name).join(', ')
                                  : 'Assign Admin'}
                              </span>
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button onClick={() => { setEditingId(u._id); setEditValue(u.title) }} aria-label="Edit" className="ih-icon-btn text-gray-700 hover:bg-gray-100">
                              <Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteModal({ isOpen: true, id: u._id, title: u.title })} aria-label="Delete" className="ih-icon-btn text-red-600 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {/* Desktop: table */}
          <table className="hidden lg:table w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Admin</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {showAddRow && (
                <tr className="bg-blue-50"><td className="px-6 py-3" colSpan="3">
                  <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter unit name..." />
                </td></tr>
              )}
              {loading ? (
                <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...</div></td></tr>
              ) : units.length === 0 && !showAddRow ? (
                <tr><td colSpan="3" className="px-6 py-12 text-center"><Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No units yet</p></td></tr>
              ) : units.map(u => {
                const unitAdminList = adminsByUnit[u._id] || []
                return (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editingId === u._id ? (
                      <InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(u._id)} onCancel={() => setEditingId(null)} placeholder="Unit name..." />
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4 text-purple-600" /></div>
                        <span className="font-medium text-gray-900 truncate">{u.title}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setAssignModalUnit(u)}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {unitAdminList.length > 0
                          ? unitAdminList.map(a => a.name).join(', ')
                          : 'Assign Admin'}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId !== u._id && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingId(u._id); setEditValue(u.title) }} aria-label="Edit" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"><Pencil className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Edit</span></button>
                        <button onClick={() => setDeleteModal({ isOpen: true, id: u._id, title: u.title })} aria-label="Delete" className="inline-flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Delete</span></button>
                      </div>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination pagination={pagination} onPageChange={(page) => loadUnits(selectedArea, page)} loading={loading} itemLabel="units" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a country and area to manage units</p>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Delete Unit"
        message={`Are you sure you want to delete "${deleteModal.title}"? Members assigned to this unit must be reassigned first.`}
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
      {assignModalUnit && (
        <AssignAdminModal
          unit={assignModalUnit}
          onClose={() => setAssignModalUnit(null)}
          onChanged={() => loadAdminsForArea(selectedArea)}
        />
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AbroadCountryManagement = () => {
  const [activeTab, setActiveTab] = useState('countries')

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-gray-900">Abroad Countries</h2>
        <p className="text-sm text-gray-500 mt-1">Manage the Country → Area → Unit hierarchy for abroad members</p>
      </div>
      <div className="ih-segment lg:w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`ih-segment-btn py-2.5 sm:py-1.5 ${activeTab === tab.id ? 'ih-segment-btn-active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">{tab.short || tab.label}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>
      {activeTab === 'countries' && <CountriesTab />}
      {activeTab === 'areas' && <AreasTab />}
      {activeTab === 'units' && <UnitsTab />}
      {activeTab === 'unitadmins' && <AbroadUnitAdminsTab />}
    </div>
  )
}

export default AbroadCountryManagement
