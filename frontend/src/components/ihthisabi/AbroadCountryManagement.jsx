import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { Plus, Pencil, Trash2, Check, X, Globe, MapPin, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmationModal from './ConfirmationModal'

// ── Shared helpers ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'areas', label: 'Areas', icon: MapPin },
  { id: 'units', label: 'Units', icon: Building2 },
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
        className="form-input flex-1 max-w-xs"
        autoFocus
      />
      <button onClick={onConfirm} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
        <Check className="w-3.5 h-3.5 mr-1" /> Save
      </button>
      <button onClick={onCancel} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300">
        <X className="w-3.5 h-3.5 mr-1" /> Cancel
      </button>
    </div>
  )
}

// ── Countries Tab ─────────────────────────────────────────────────────────────

function CountriesTab() {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-countries')
      setCountries(res.data.data.countries)
    } catch { toast.error('Failed to load countries') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Country title is required'); return }
    setAddLoading(true)
    try {
      await api.post('/ihthisabi/admin/abroad-countries', { title: newTitle.trim() })
      toast.success('Country added')
      setNewTitle(''); setShowAddRow(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add country') }
    finally { setAddLoading(false) }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Country title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-countries/${id}`, { title: editValue.trim() })
      toast.success('Country updated'); setEditingId(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update country') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-countries/${deleteModal.id}`)
      toast.success('Country deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete country') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Manage abroad countries</p>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary flex items-center gap-2" disabled={showAddRow}>
          <Plus className="w-4 h-4" /> Add Country
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Globe className="w-4 h-4 text-blue-600" /></div>
                      <span className="font-medium text-gray-900">{c.title}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId !== c._id && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingId(c._id); setEditValue(c.title) }} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
                      </button>
                      <button onClick={() => setDeleteModal({ isOpen: true, id: c._id, title: c.title })} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {countries.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'} total
          </div>
        )}
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
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })

  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries').then(res => setCountries(res.data.data.countries)).catch(() => toast.error('Failed to load countries'))
  }, [])

  const loadAreas = useCallback(async (countryId) => {
    if (!countryId) { setAreas([]); return }
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-areas', { params: { country: countryId } })
      setAreas(res.data.data.areas)
    } catch { toast.error('Failed to load areas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAreas(selectedCountry) }, [selectedCountry, loadAreas])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Area title is required'); return }
    if (!selectedCountry) { toast.error('Select a country first'); return }
    try {
      await api.post('/ihthisabi/admin/abroad-areas', { title: newTitle.trim(), countryId: selectedCountry })
      toast.success('Area added'); setNewTitle(''); setShowAddRow(false); loadAreas(selectedCountry)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add area') }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Area title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-areas/${id}`, { title: editValue.trim() })
      toast.success('Area updated'); setEditingId(null); loadAreas(selectedCountry)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update area') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-areas/${deleteModal.id}`)
      toast.success('Area deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); loadAreas(selectedCountry)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete area') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setShowAddRow(false) }} className="form-input max-w-xs">
          <option value="">Select Country...</option>
          {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary flex items-center gap-2" disabled={!selectedCountry || showAddRow}>
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>
      {selectedCountry ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-green-600" /></div>
                        <span className="font-medium text-gray-900">{a.title}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId !== a._id && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingId(a._id); setEditValue(a.title) }} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</button>
                        <button onClick={() => setDeleteModal({ isOpen: true, id: a._id, title: a.title })} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {areas.length > 0 && <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">{areas.length} {areas.length === 1 ? 'area' : 'areas'} in this country</div>}
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

// ── Units Tab ─────────────────────────────────────────────────────────────────

function UnitsTab() {
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [areas, setAreas] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' })

  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries').then(res => setCountries(res.data.data.countries)).catch(() => toast.error('Failed to load countries'))
  }, [])

  useEffect(() => {
    setSelectedArea(''); setAreas([]); setUnits([])
    if (!selectedCountry) return
    api.get('/ihthisabi/admin/abroad-areas', { params: { country: selectedCountry } }).then(res => setAreas(res.data.data.areas)).catch(() => toast.error('Failed to load areas'))
  }, [selectedCountry])

  const loadUnits = useCallback(async (areaId) => {
    if (!areaId) { setUnits([]); return }
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/abroad-units', { params: { area: areaId } })
      setUnits(res.data.data.units)
    } catch { toast.error('Failed to load units') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUnits(selectedArea) }, [selectedArea, loadUnits])

  const handleAdd = async () => {
    if (!newTitle.trim()) { toast.error('Unit title is required'); return }
    if (!selectedArea || !selectedCountry) { toast.error('Select country and area first'); return }
    try {
      await api.post('/ihthisabi/admin/abroad-units', { title: newTitle.trim(), areaId: selectedArea, countryId: selectedCountry })
      toast.success('Unit added'); setNewTitle(''); setShowAddRow(false); loadUnits(selectedArea)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add unit') }
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) { toast.error('Unit title is required'); return }
    try {
      await api.put(`/ihthisabi/admin/abroad-units/${id}`, { title: editValue.trim() })
      toast.success('Unit updated'); setEditingId(null); loadUnits(selectedArea)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update unit') }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ihthisabi/admin/abroad-units/${deleteModal.id}`)
      toast.success('Unit deleted')
      setDeleteModal({ isOpen: false, id: null, title: '' }); loadUnits(selectedArea)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete unit') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setShowAddRow(false) }} className="form-input max-w-xs">
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setShowAddRow(false) }} className="form-input max-w-xs" disabled={!selectedCountry}>
            <option value="">Select Area...</option>
            {areas.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
          </select>
        </div>
        <button onClick={() => { setShowAddRow(true); setNewTitle('') }} className="btn-primary flex items-center gap-2" disabled={!selectedArea || showAddRow}>
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>
      {selectedArea ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Name</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {showAddRow && (
                <tr className="bg-blue-50"><td className="px-6 py-3" colSpan="2">
                  <InlineInput value={newTitle} onChange={setNewTitle} onConfirm={handleAdd} onCancel={() => { setShowAddRow(false); setNewTitle('') }} placeholder="Enter unit name..." />
                </td></tr>
              )}
              {loading ? (
                <tr><td colSpan="2" className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading...</div></td></tr>
              ) : units.length === 0 && !showAddRow ? (
                <tr><td colSpan="2" className="px-6 py-12 text-center"><Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No units yet</p></td></tr>
              ) : units.map(u => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editingId === u._id ? (
                      <InlineInput value={editValue} onChange={setEditValue} onConfirm={() => handleEdit(u._id)} onCancel={() => setEditingId(null)} placeholder="Unit name..." />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-600" /></div>
                        <span className="font-medium text-gray-900">{u.title}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId !== u._id && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingId(u._id); setEditValue(u.title) }} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</button>
                        <button onClick={() => setDeleteModal({ isOpen: true, id: u._id, title: u.title })} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {units.length > 0 && <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">{units.length} {units.length === 1 ? 'unit' : 'units'} in this area</div>}
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
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AbroadCountryManagement = () => {
  const [activeTab, setActiveTab] = useState('countries')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Abroad Countries</h2>
        <p className="text-sm text-gray-500 mt-1">Manage the Country → Area → Unit hierarchy for abroad members</p>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
      {activeTab === 'countries' && <CountriesTab />}
      {activeTab === 'areas' && <AreasTab />}
      {activeTab === 'units' && <UnitsTab />}
    </div>
  )
}

export default AbroadCountryManagement
