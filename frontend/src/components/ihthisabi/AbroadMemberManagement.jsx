import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, User, Globe, MapPin, Building2, Phone, Mail, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmationModal from './ConfirmationModal'

const EMPTY_FORM = {
  ruknId: '', name: '', gender: 'Male',
  contactNo: '', emailId: '',
  abroadCountry: '', abroadArea: '', abroadUnit: '',
  isActive: true
}

// ── Member Modal ──────────────────────────────────────────────────────────────

function MemberModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState(member ? {
    ruknId: member.ruknId || '',
    name: member.name || '',
    gender: member.gender || 'Male',
    contactNo: member.contactNo || '',
    emailId: member.emailId || '',
    abroadCountry: member.abroadCountry?._id || member.abroadCountry || '',
    abroadArea: member.abroadArea?._id || member.abroadArea || '',
    abroadUnit: member.abroadUnit?._id || member.abroadUnit || '',
    isActive: member.isActive !== false
  } : { ...EMPTY_FORM })

  const [countries, setCountries] = useState([])
  const [areas, setAreas] = useState([])
  const [units, setUnits] = useState([])
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load countries once
  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries')
      .then(res => setCountries(res.data.data.countries))
      .catch(() => toast.error('Failed to load countries'))
  }, [])

  // Load areas when country changes. Must NOT reset abroadArea/abroadUnit on the
  // initial mount — when editing, the member already has those set, and this
  // effect fires on mount too since form.abroadCountry starts non-empty.
  // Only reset on a genuine user-driven country change.
  //
  // A simple "first run" boolean ref doesn't survive React 18 Strict Mode: in
  // dev, Strict Mode deliberately mounts, cleans up, and re-mounts every
  // component once to surface missing-cleanup bugs, calling this effect twice
  // in a row for the SAME dependency value. A boolean flag flips to "not first
  // run" after call #1, so call #2 wrongly treats the unchanged value as a real
  // change and wipes the fields again. Comparing against the actual previous
  // value survives that, since the value is identical across both calls.
  const prevCountryRef = useRef(form.abroadCountry)
  useEffect(() => {
    const changed = prevCountryRef.current !== form.abroadCountry
    prevCountryRef.current = form.abroadCountry

    if (changed) {
      setForm(f => ({ ...f, abroadArea: '', abroadUnit: '' }))
      setAreas([]); setUnits([])
    }
    if (!form.abroadCountry) return
    api.get('/ihthisabi/admin/abroad-areas', { params: { country: form.abroadCountry } })
      .then(res => setAreas(res.data.data.areas))
      .catch(() => {})
  }, [form.abroadCountry])

  // Load units when area changes — same previous-value guard as above.
  const prevAreaRef = useRef(form.abroadArea)
  useEffect(() => {
    const changed = prevAreaRef.current !== form.abroadArea
    prevAreaRef.current = form.abroadArea

    if (changed) {
      setForm(f => ({ ...f, abroadUnit: '' }))
      setUnits([])
    }
    if (!form.abroadArea) return
    api.get('/ihthisabi/admin/abroad-units', { params: { area: form.abroadArea } })
      .then(res => setUnits(res.data.data.units))
      .catch(() => {})
  }, [form.abroadArea])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.ruknId.trim()) { toast.error('Rukn ID is required'); return }
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.abroadCountry) { toast.error('Country is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        isAbroad: true,
        unit: '-',
        abroadCountry: form.abroadCountry || null,
        abroadArea: form.abroadArea || null,
        abroadUnit: form.abroadUnit || null,
      }
      if (member) {
        await api.put(`/ihthisabi/admin/users/${member._id}/profile`, payload)
        toast.success('Member updated')
      } else {
        await api.post('/ihthisabi/admin/users', payload)
        toast.success('Member created')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{member ? 'Edit Abroad Member' : 'Add Abroad Member'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rukn ID <span className="text-red-500">*</span></label>
              <input className="form-input text-sm w-full" value={form.ruknId} onChange={e => set('ruknId', e.target.value)} placeholder="e.g. 109500" required disabled={!!member} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select className="form-input text-sm w-full" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input className="form-input text-sm w-full" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Member full name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact No.</label>
              <input className="form-input text-sm w-full" value={form.contactNo} onChange={e => set('contactNo', e.target.value)} placeholder="+966..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="form-input text-sm w-full" value={form.emailId} onChange={e => set('emailId', e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Abroad Location</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                <select className="form-input text-sm w-full" value={form.abroadCountry} onChange={e => set('abroadCountry', e.target.value)} required>
                  <option value="">Select Country...</option>
                  {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select className="form-input text-sm w-full" value={form.abroadArea} onChange={e => set('abroadArea', e.target.value)} disabled={!form.abroadCountry || areas.length === 0}>
                  <option value="">{!form.abroadCountry ? 'Select country first' : areas.length === 0 ? 'No areas available' : 'Select Area...'}</option>
                  {areas.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select className="form-input text-sm w-full" value={form.abroadUnit} onChange={e => set('abroadUnit', e.target.value)} disabled={!form.abroadArea || units.length === 0}>
                  <option value="">{!form.abroadArea ? 'Select area first' : units.length === 0 ? 'No units available' : 'Select Unit...'}</option>
                  {units.map(u => <option key={u._id} value={u._id}>{u.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active member</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {member ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AbroadMemberManagement = () => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' })
  const [expanded, setExpanded] = useState({})
  const [searchText, setSearchText] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [countries, setCountries] = useState([])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterCountry) params.country = filterCountry
      const res = await api.get('/ihthisabi/admin/abroad-members', { params })
      setMembers(res.data.data.members)
    } catch { toast.error('Failed to load abroad members') }
    finally { setLoading(false) }
  }, [filterCountry])

  useEffect(() => { loadMembers() }, [loadMembers])

  useEffect(() => {
    api.get('/ihthisabi/admin/abroad-countries').then(res => setCountries(res.data.data.countries)).catch(() => {})
  }, [])

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/ihthisabi/admin/users/${deleteModal.id}`)
      toast.success('Member deleted')
      setDeleteModal({ isOpen: false, id: null, name: '' })
      loadMembers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete member') }
  }

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  // Filter members by search text
  const filtered = members.filter(m => {
    if (!searchText) return true
    const q = searchText.toLowerCase()
    return (m.name || '').toLowerCase().includes(q) || (m.ruknId || '').toLowerCase().includes(q)
  })

  // Group by country → area → unit
  const grouped = {}
  filtered.forEach(m => {
    const cKey = m.abroadCountry?._id || 'unknown'
    const cTitle = m.abroadCountry?.title || 'Unassigned Country'
    const aKey = m.abroadArea?._id || 'no-area'
    const aTitle = m.abroadArea?.title || 'No Area'
    const uKey = m.abroadUnit?._id || 'no-unit'
    const uTitle = m.abroadUnit?.title || 'No Unit'

    if (!grouped[cKey]) grouped[cKey] = { title: cTitle, areas: {} }
    if (!grouped[cKey].areas[aKey]) grouped[cKey].areas[aKey] = { title: aTitle, units: {} }
    if (!grouped[cKey].areas[aKey].units[uKey]) grouped[cKey].areas[aKey].units[uKey] = { title: uTitle, members: [] }
    grouped[cKey].areas[aKey].units[uKey].members.push(m)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Abroad Members</h2>
          <p className="text-sm text-gray-500 mt-1">Members grouped by Country → Area → Unit</p>
        </div>
        <button onClick={() => { setEditMember(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or Rukn ID..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="form-input max-w-xs"
        />
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="form-input max-w-xs">
          <option value="">All Countries</option>
          {countries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
        {(searchText || filterCountry) && (
          <button onClick={() => { setSearchText(''); setFilterCountry('') }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear</button>
        )}
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grouped list */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading members...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No abroad members found</p>
          {!searchText && !filterCountry && <p className="text-sm text-gray-400 mt-1">Click "Add Member" to create the first abroad member</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cKey, country]) => {
            const cExpanded = expanded[cKey] !== false
            const totalMembers = Object.values(country.areas).flatMap(a => Object.values(a.units)).flatMap(u => u.members).length
            return (
              <div key={cKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Country header */}
                <button
                  onClick={() => toggleExpand(cKey)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Globe className="w-4 h-4 text-blue-600" /></div>
                    <span className="font-semibold text-gray-900">{country.title}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{totalMembers} member{totalMembers !== 1 ? 's' : ''}</span>
                  </div>
                  {cExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>

                {cExpanded && Object.entries(country.areas).map(([aKey, area]) => {
                  const aExpanded = expanded[`${cKey}-${aKey}`] !== false
                  const areaTotal = Object.values(area.units).flatMap(u => u.members).length
                  return (
                    <div key={aKey} className="border-t border-gray-100">
                      {/* Area header */}
                      <button
                        onClick={() => toggleExpand(`${cKey}-${aKey}`)}
                        className="w-full flex items-center justify-between px-5 py-2.5 pl-10 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-green-600" /></div>
                          <span className="font-medium text-gray-800 text-sm">{area.title}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{areaTotal}</span>
                        </div>
                        {aExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </button>

                      {aExpanded && Object.entries(area.units).map(([uKey, unit]) => {
                        const uExpanded = expanded[`${cKey}-${aKey}-${uKey}`] !== false
                        return (
                          <div key={uKey} className="border-t border-gray-100">
                            {/* Unit header */}
                            <button
                              onClick={() => toggleExpand(`${cKey}-${aKey}-${uKey}`)}
                              className="w-full flex items-center justify-between px-5 py-2 pl-16 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center"><Building2 className="w-3 h-3 text-purple-600" /></div>
                                <span className="text-sm font-medium text-gray-700">{unit.title}</span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{unit.members.length}</span>
                              </div>
                              {uExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                            </button>

                            {/* Members list */}
                            {uExpanded && (
                              <div className="border-t border-gray-100">
                                {unit.members.map(m => (
                                  <div key={m._id} className="flex items-center justify-between px-5 py-3 pl-20 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gray-500" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                                          {!m.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactive</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          <span className="text-xs text-gray-500">ID: {m.ruknId}</span>
                                          {m.contactNo && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{m.contactNo}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        onClick={() => { setEditMember(m); setShowModal(true) }}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs"
                                        title="Edit"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteModal({ isOpen: true, id: m._id, name: m.name })}
                                        className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-xs"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <MemberModal
          member={editMember}
          onClose={() => { setShowModal(false); setEditMember(null) }}
          onSaved={() => { setShowModal(false); setEditMember(null); loadMembers() }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Member"
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone and will also delete all their submissions.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default AbroadMemberManagement
