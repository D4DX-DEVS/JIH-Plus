import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { useLocation as useHierarchyLocation } from '../../hooks/useLocation'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Pagination'
import {
  Users,
  Search,
  Trash2,
  Edit,
  ArrowRightLeft,
  UserPlus,
  Settings,
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── helpers ─────────────────────────────────────────────────────────────────
const getId  = (o) => o?.id  || o?._id  || o?.code || o?.name  || o?.title || ''
const getLabel = (o) => o?.name || o?.title || o?.label || o?.id || o?.code || ''

// ─── LocationSelects sub-component ────────────────────────────────────────────
const LocationSelects = ({ value, onChange, required = false }) => {
  const { districts, areas, units, loading: locLoading, onDistrictChange, onAreaChange } = useHierarchyLocation()

  const [selDistrictId, setSelDistrictId] = useState('')
  const [selAreaId,     setSelAreaId]     = useState('')

  // sync initial values from outside (edit mode)
  const [initialised, setInitialised] = useState(false)
  useEffect(() => {
    if (!initialised && value.district && districts.length) {
      const d = districts.find(d => getLabel(d) === value.district)
      if (d) {
        const dId = getId(d)
        setSelDistrictId(dId)
        onDistrictChange(dId)
        setInitialised(true)
      }
    }
  }, [districts, value.district, initialised, onDistrictChange])

  useEffect(() => {
    if (initialised && value.area && areas.length && !selAreaId) {
      const a = areas.find(a => getLabel(a) === value.area)
      if (a) {
        const aId = getId(a)
        setSelAreaId(aId)
        onAreaChange(aId)
      }
    }
  }, [areas, value.area, selAreaId, initialised, onAreaChange])

  const handleDistrict = (dId) => {
    setSelDistrictId(dId)
    setSelAreaId('')
    onDistrictChange(dId)
    const label = dId ? getLabel(districts.find(d => getId(d) === dId)) : ''
    onChange({ ...value, district: label, area: '', unit: '' })
  }

  const handleArea = (aId) => {
    setSelAreaId(aId)
    onAreaChange(aId)
    const label = aId ? getLabel(areas.find(a => getId(a) === aId)) : ''
    onChange({ ...value, area: label, unit: '' })
  }

  const handleUnit = (uId) => {
    const label = uId ? getLabel(units.find(u => getId(u) === uId)) : ''
    onChange({ ...value, unit: label })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">District {required && <span className="text-red-500">*</span>}</label>
        <select className="form-select text-sm" value={selDistrictId} onChange={e => handleDistrict(e.target.value)}>
          <option value="">Select District</option>
          {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
        <select className="form-select text-sm" value={selAreaId} onChange={e => handleArea(e.target.value)} disabled={!selDistrictId || locLoading.areas}>
          <option value="">Select Area</option>
          {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Unit {required && <span className="text-red-500">*</span>}</label>
        <select className="form-select text-sm" value={value.unit ? getId(units.find(u => getLabel(u) === value.unit)) || '' : ''} onChange={e => handleUnit(e.target.value)} disabled={!selAreaId || locLoading.units}>
          <option value="">Select Unit</option>
          {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
        </select>
        {value.unit && (
          <p className="mt-0.5 text-xs text-gray-500">Current: {value.unit}</p>
        )}
      </div>
    </div>
  )
}

// ─── UserFormModal ─────────────────────────────────────────────────────────────
const emptyUser = { ruknId: '', name: '', gender: 'Male', district: '', area: '', unit: '', contactNo: '', emailId: '', country: '', isAbroad: false, abroadCountry: '', isActive: true }

const UserFormModal = ({ isOpen, onClose, editUser, onSaved }) => {
  const [form, setForm]       = useState(emptyUser)
  const [saving, setSaving]   = useState(false)
  const [abroadCountries, setAbroadCountries] = useState([])

  useEffect(() => {
    if (!isOpen) return
    api.get('/ihthisabi/admin/abroad-countries').then(r => setAbroadCountries(r.data.data.countries || [])).catch(() => {})
    if (editUser) {
      setForm({
        ruknId:       editUser.ruknId       || '',
        name:         editUser.name         || '',
        gender:       editUser.gender       || 'Male',
        district:     editUser.district     || '',
        area:         editUser.area         || '',
        unit:         editUser.unit         || '',
        contactNo:    editUser.contactNo    || '',
        emailId:      editUser.emailId      || '',
        country:      editUser.country      || '',
        isAbroad:     editUser.isAbroad     || false,
        abroadCountry: editUser.abroadCountry?._id || editUser.abroadCountry || '',
        isActive:     editUser.isActive !== false
      })
    } else {
      setForm(emptyUser)
    }
  }, [isOpen, editUser])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.ruknId.trim() || !form.name.trim() || !form.unit.trim()) {
      toast.error('Rukn ID, Name, and Unit are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, abroadCountry: form.isAbroad ? (form.abroadCountry || null) : null }
      if (editUser) {
        await api.put(`/ihthisabi/admin/users/${editUser._id}/profile`, payload)
        toast.success('User updated successfully')
      } else {
        await api.post('/ihthisabi/admin/users', payload)
        toast.success('User created successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{editUser ? 'Edit Member' : 'Add New Member'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rukn ID <span className="text-red-500">*</span></label>
              <input className="form-input text-sm" value={form.ruknId} onChange={e => set('ruknId', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input className="form-input text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
              <select className="form-select text-sm" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact No</label>
              <input className="form-input text-sm" value={form.contactNo} onChange={e => set('contactNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="form-input text-sm" value={form.emailId} onChange={e => set('emailId', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <input className="form-input text-sm" value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. IN" />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Location <span className="text-red-500">*</span></p>
            <LocationSelects value={{ district: form.district, area: form.area, unit: form.unit }} onChange={({ district, area, unit }) => setForm(f => ({ ...f, district, area, unit }))} required />
          </div>

          <div className="flex flex-wrap gap-4 border-t pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isAbroad} onChange={e => set('isAbroad', e.target.checked)} className="rounded" />
              Is Abroad Member
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
              Active Account
            </label>
          </div>

          {form.isAbroad && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Abroad Country</label>
              <select className="form-select text-sm" value={form.abroadCountry} onChange={e => set('abroadCountry', e.target.value)}>
                <option value="">Select Country</option>
                {abroadCountries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create Member'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── TransferModal ────────────────────────────────────────────────────────────
const TransferModal = ({ isOpen, onClose, user, onTransferred }) => {
  const [loc,    setLoc]    = useState({ district: '', area: '', unit: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && user) setLoc({ district: user.district || '', area: user.area || '', unit: user.unit || '' })
  }, [isOpen, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loc.unit.trim()) { toast.error('Target unit is required'); return }
    setSaving(true)
    try {
      await api.put(`/ihthisabi/admin/users/${user._id}/transfer`, loc)
      toast.success(`Transferred to ${loc.unit}`)
      onTransferred()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !user) return null
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transfer Member</h3>
            <p className="text-sm text-gray-500">{user.name} — Current unit: <strong>{user.unit}</strong></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Select the new location for this member:</p>
          <LocationSelects value={loc} onChange={setLoc} required />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Transferring…' : 'Confirm Transfer'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── UnitAdminFormModal ───────────────────────────────────────────────────────
const emptyAdmin = { ruknId: '', name: '', unit: '', district: '', area: '', contactNo: '', emailId: '', password: '', isActive: true }

const UnitAdminFormModal = ({ isOpen, onClose, editAdmin, onSaved }) => {
  const [form, setForm]     = useState(emptyAdmin)
  const [saving, setSaving] = useState(false)
  const { districts, areas, units, loading: locLoading, onDistrictChange, onAreaChange } = useHierarchyLocation()
  const [selDistrictId, setSelDistrictId] = useState('')
  const [selAreaId,     setSelAreaId]     = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (editAdmin) {
      setForm({ ruknId: editAdmin.ruknId || '', name: editAdmin.name || '', unit: editAdmin.unit || '', district: editAdmin.district || '', area: editAdmin.area || '', contactNo: editAdmin.contactNo || '', emailId: editAdmin.emailId || '', password: '', isActive: editAdmin.isActive !== false })
    } else {
      setForm(emptyAdmin)
      setSelDistrictId('')
      setSelAreaId('')
    }
  }, [isOpen, editAdmin])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.ruknId.trim() || !form.name.trim() || !form.unit.trim()) { toast.error('Rukn ID, Name, and Unit are required'); return }
    if (!editAdmin && (!form.password || form.password.length < 6)) { toast.error('Password (min 6 chars) is required for new unit admin'); return }
    setSaving(true)
    try {
      if (editAdmin) {
        await api.put(`/ihthisabi/admin/unitadmins/${editAdmin._id}/profile`, form)
        toast.success('Unit admin updated')
      } else {
        await api.post('/ihthisabi/admin/unitadmins', form)
        toast.success('Unit admin created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save unit admin')
    } finally {
      setSaving(false)
    }
  }

  const handleDistrict = (dId) => {
    setSelDistrictId(dId)
    setSelAreaId('')
    onDistrictChange(dId)
    set('district', dId ? getLabel(districts.find(d => getId(d) === dId)) : '')
    set('area', '')
  }
  const handleArea = (aId) => {
    setSelAreaId(aId)
    onAreaChange(aId)
    set('area', aId ? getLabel(areas.find(a => getId(a) === aId)) : '')
    set('unit', '')
  }
  const handleUnit = (uId) => set('unit', uId ? getLabel(units.find(u => getId(u) === uId)) : '')

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">{editAdmin ? 'Edit Unit Admin' : 'Add Unit Admin'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rukn ID <span className="text-red-500">*</span></label>
              <input className="form-input text-sm" value={form.ruknId} onChange={e => set('ruknId', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input className="form-input text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact No</label>
              <input className="form-input text-sm" value={form.contactNo} onChange={e => set('contactNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="form-input text-sm" value={form.emailId} onChange={e => set('emailId', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{editAdmin ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="form-input text-sm" value={form.password} onChange={e => set('password', e.target.value)} placeholder={editAdmin ? 'Leave blank to keep current' : 'Min 6 characters'} />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Location <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                <select className="form-select text-sm" value={selDistrictId} onChange={e => handleDistrict(e.target.value)}>
                  <option value="">Select District</option>
                  {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
                <select className="form-select text-sm" value={selAreaId} onChange={e => handleArea(e.target.value)} disabled={!selDistrictId || locLoading.areas}>
                  <option value="">Select Area</option>
                  {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                <select className="form-select text-sm" value={form.unit ? getId(units.find(u => getLabel(u) === form.unit)) || '' : ''} onChange={e => handleUnit(e.target.value)} disabled={!selAreaId || locLoading.units}>
                  <option value="">Select Unit</option>
                  {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
                </select>
                {form.unit && <p className="mt-0.5 text-xs text-gray-500">Current: {form.unit}</p>}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            Active Account
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editAdmin ? 'Save Changes' : 'Create Unit Admin'}</button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── AssignAdminModal ─────────────────────────────────────────────────────────
const AssignAdminModal = ({ isOpen, onClose, onAssigned }) => {
  const [unitName,      setUnitName]      = useState('')
  const [members,       setMembers]       = useState([])
  const [selectedUser,  setSelectedUser]  = useState(null)
  const [deactivatePrev, setDeactivatePrev] = useState(true)
  const [fetching,      setFetching]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const { districts, areas, units, loading: locLoading, onDistrictChange, onAreaChange } = useHierarchyLocation()
  const [selDistrictId, setSelDistrictId] = useState('')
  const [selAreaId,     setSelAreaId]     = useState('')

  const handleUnit = (uId) => {
    const label = uId ? getLabel(units.find(u => getId(u) === uId)) : ''
    setUnitName(label)
    setSelectedUser(null)
    setMembers([])
  }

  const fetchMembers = async () => {
    if (!unitName) { toast.error('Please select a unit first'); return }
    setFetching(true)
    try {
      const res = await api.get(`/ihthisabi/admin/units/${encodeURIComponent(unitName)}/members`)
      setMembers(res.data.data.members || [])
      if (res.data.data.members?.length === 0) toast('No active members found in this unit', { icon: 'ℹ️' })
    } catch {
      toast.error('Failed to load members')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) { toast.error('Please select a member'); return }
    setSaving(true)
    try {
      await api.post('/ihthisabi/admin/unitadmins/assign-from-member', {
        userId: selectedUser._id,
        deactivatePrevious: deactivatePrev
      })
      toast.success(`${selectedUser.name} assigned as unit admin`)
      onAssigned()
      onClose()
      setUnitName(''); setMembers([]); setSelectedUser(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign unit admin')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold">Assign Unit Admin from Member</h3>
            <p className="text-xs text-gray-500">Choose a member from any unit and assign them as unit admin</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Unit selection */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Step 1 — Select Unit</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                <select className="form-select text-sm" value={selDistrictId} onChange={e => { setSelDistrictId(e.target.value); setSelAreaId(''); onDistrictChange(e.target.value) }}>
                  <option value="">Select</option>
                  {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
                <select className="form-select text-sm" value={selAreaId} onChange={e => { setSelAreaId(e.target.value); onAreaChange(e.target.value) }} disabled={!selDistrictId || locLoading.areas}>
                  <option value="">Select</option>
                  {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <select className="form-select text-sm" value={unitName ? getId(units.find(u => getLabel(u) === unitName)) || '' : ''} onChange={e => handleUnit(e.target.value)} disabled={!selAreaId || locLoading.units}>
                  <option value="">Select</option>
                  {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
                </select>
              </div>
            </div>
            <button type="button" onClick={fetchMembers} disabled={!unitName || fetching} className="mt-2 btn-ghost text-sm">
              {fetching ? 'Loading…' : 'Load Members of this Unit'}
            </button>
          </div>

          {/* Member selection */}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Step 2 — Select Member</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {members.map(m => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => setSelectedUser(m)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedUser?._id === m._id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                  >
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-400 ml-2 text-xs">{m.ruknId}</span>
                    </div>
                    {selectedUser?._id === m._id && <CheckCircle className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm + options */}
          {selectedUser && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Step 3 — Confirm</p>
              <p className="text-sm text-gray-700">Assigning <strong>{selectedUser.name}</strong> ({selectedUser.ruknId}) as unit admin for <strong>{unitName}</strong></p>
              <p className="text-xs text-gray-500">Their Rukn ID (<strong>{selectedUser.ruknId}</strong>) will be used as their login password.</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={deactivatePrev} onChange={e => setDeactivatePrev(e.target.checked)} className="rounded" />
                Deactivate previous unit admins of this unit
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Assigning…' : 'Assign as Unit Admin'}</button>
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagementDynamic = () => {
  const [view, setView]           = useState('members') // 'members' | 'unitadmins'
  const [users, setUsers]         = useState([])
  const [unitAdmins, setUnitAdmins] = useState([])
  const [loading, setLoading]     = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [areaFilter,     setAreaFilter]     = useState('')
  const [unitFilter,     setUnitFilter]     = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [selectedAreaId,     setSelectedAreaId]     = useState('')
  const [pagination,     setPagination]     = useState({ current: 1, pages: 1, total: 0 })
  const [uaPagination,   setUaPagination]   = useState({ current: 1, pages: 1, total: 0 })

  // modals
  const [showUserForm,   setShowUserForm]   = useState(false)
  const [editingUser,    setEditingUser]    = useState(null)
  const [transferUser,   setTransferUser]   = useState(null)
  const [showUAForm,     setShowUAForm]     = useState(false)
  const [editingUA,      setEditingUA]      = useState(null)
  const [showAssign,     setShowAssign]     = useState(false)
  const [deleteModal,    setDeleteModal]    = useState({ isOpen: false, id: null, name: null, type: null })

  const { districts, areas, units, loading: locLoading, onDistrictChange, onAreaChange } = useHierarchyLocation()

  // ── filter helpers ──────────────────────────────────────────────────────────
  const appendLocFilter = useCallback((params) => {
    if (unitFilter)    { params.append('unit',     unitFilter);    return }
    if (areaFilter)    { params.append('area',     areaFilter);    return }
    if (districtFilter){ params.append('district', districtFilter) }
  }, [unitFilter, areaFilter, districtFilter])

  // ── fetch members ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: '10' })
      if (searchTerm) params.append('search', searchTerm)
      appendLocFilter(params)
      const res = await api.get(`/ihthisabi/admin/users?${params}`)
      setUsers(res.data.data.users)
      setPagination(res.data.data.pagination)
    } catch {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, appendLocFilter])

  // ── fetch unit admins ───────────────────────────────────────────────────────
  const fetchUAs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: '10' })
      if (searchTerm) params.append('search', searchTerm)
      appendLocFilter(params)
      const res = await api.get(`/ihthisabi/admin/unitadmins?${params}`)
      setUnitAdmins(res.data.data.unitAdmins || [])
      setUaPagination(res.data.data.pagination || { current: 1, pages: 1, total: 0 })
    } catch {
      toast.error('Failed to load unit admins')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, appendLocFilter])

  useEffect(() => {
    if (view === 'members')    fetchUsers()
    else                       fetchUAs()
  }, [view, fetchUsers, fetchUAs])

  // ── delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    const { id, type } = deleteModal
    try {
      if (type === 'user')      await api.delete(`/ihthisabi/admin/users/${id}`)
      else if (type === 'ua')   await api.delete(`/ihthisabi/admin/unitadmins/${id}`)
      toast.success('Deleted successfully')
      type === 'user' ? fetchUsers(pagination.current) : fetchUAs(uaPagination.current)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: null, type: null })
    }
  }

  // ── filter controls ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchTerm(''); setDistrictFilter(''); setAreaFilter(''); setUnitFilter('')
    setSelectedDistrictId(''); setSelectedAreaId('')
    onDistrictChange('')
  }

  const handleDistrictChange = (dId) => {
    setSelectedDistrictId(dId)
    setDistrictFilter(dId ? getLabel(districts.find(d => getId(d) === dId)) : '')
    setSelectedAreaId(''); setAreaFilter(''); setUnitFilter('')
    onDistrictChange(dId)
  }
  const handleAreaChange = (aId) => {
    setSelectedAreaId(aId)
    setAreaFilter(aId ? getLabel(areas.find(a => getId(a) === aId)) : '')
    setUnitFilter('')
    onAreaChange(aId)
  }
  const handleUnitChange = (uId) => {
    setUnitFilter(uId ? getLabel(units.find(u => getId(u) === uId)) : '')
  }

  // ── render ──────────────────────────────────────────────────────────────────
  const curPag  = view === 'members' ? pagination  : uaPagination
  const curFetch = view === 'members' ? fetchUsers  : fetchUAs

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            User Management
          </h2>
          <p className="text-sm text-gray-500">Super admin — full control over members &amp; unit admins</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setView(view === 'members' ? 'unitadmins' : 'members'); resetFilters() }}
            className="btn-ghost text-sm"
          >
            <Settings className="w-4 h-4 mr-1" />
            {view === 'members' ? 'View Unit Admins' : 'View Members'}
          </button>

          {view === 'members' && (
            <button onClick={() => { setEditingUser(null); setShowUserForm(true) }} className="btn-primary text-sm">
              <UserPlus className="w-4 h-4 mr-1" /> Add Member
            </button>
          )}
          {view === 'unitadmins' && (
            <>
              <button onClick={() => { setEditingUA(null); setShowUAForm(true) }} className="btn-primary text-sm">
                <UserPlus className="w-4 h-4 mr-1" /> Add Unit Admin
              </button>
              <button onClick={() => setShowAssign(true)} className="btn-primary text-sm bg-indigo-600 hover:bg-indigo-700">
                <ShieldCheck className="w-4 h-4 mr-1" /> Assign from Member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">{view === 'members' ? 'Total Members' : 'Total Unit Admins'}</p>
            <p className="text-xl font-bold text-gray-900">{curPag.total || 0}</p>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
          <CheckCircle className="w-7 h-7 text-green-500" />
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-bold text-gray-900">
              {view === 'members' ? users.filter(u => u.isActive).length : unitAdmins.filter(u => u.isActive).length}
            </p>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="w-7 h-7 text-amber-500" />
          <div>
            <p className="text-xs text-gray-500">Inactive</p>
            <p className="text-xl font-bold text-gray-900">
              {view === 'members' ? users.filter(u => !u.isActive).length : unitAdmins.filter(u => !u.isActive).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {(searchTerm || districtFilter || areaFilter || unitFilter) && (
            <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline">Reset</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search name or Rukn ID…"
              className="form-input pl-10 text-sm"
            />
          </div>
          <select className="form-select text-sm" value={selectedDistrictId} onChange={e => handleDistrictChange(e.target.value)}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
          </select>
          <select className="form-select text-sm" value={selectedAreaId} onChange={e => handleAreaChange(e.target.value)} disabled={!selectedDistrictId || locLoading.areas}>
            <option value="">All Areas</option>
            {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
          </select>
          <select className="form-select text-sm" value={unitFilter ? getId(units.find(u => getLabel(u) === unitFilter)) || '' : ''} onChange={e => handleUnitChange(e.target.value)} disabled={!selectedAreaId || locLoading.units}>
            <option value="">All Units</option>
            {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">
            {view === 'members' ? 'Members' : 'Unit Admins'} — {loading ? '…' : `${curPag.total || 0} total`}
          </span>
        </div>

        <div className="overflow-x-hidden sm:overflow-x-auto">
          <table className="ih-table-compact w-full table-fixed divide-y divide-gray-200 text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Rukn ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                {view === 'members' && <th className="px-4 py-3 text-left">Gender</th>}
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">District</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={view === 'members' ? 8 : 7} className="py-10 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading…
                  </div>
                </td></tr>
              ) : view === 'members' ? (
                users.length === 0 ? (
                  <tr><td colSpan="8" className="py-10 text-center text-gray-400">No members found</td></tr>
                ) : users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{u.ruknId}</td>
                    <td className="px-4 py-3 text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.gender}</td>
                    <td className="px-4 py-3 text-gray-700">{u.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{u.district || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.contactNo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                      <button title="Edit" onClick={() => { setEditingUser(u); setShowUserForm(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button title="Transfer" onClick={() => setTransferUser(u)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button title="Delete" onClick={() => setDeleteModal({ isOpen: true, id: u._id, name: u.name, type: 'user' })} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                unitAdmins.length === 0 ? (
                  <tr><td colSpan="7" className="py-10 text-center text-gray-400">No unit admins found</td></tr>
                ) : unitAdmins.map(ua => (
                  <tr key={ua._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{ua.ruknId}</td>
                    <td className="px-4 py-3 text-gray-900">{ua.name}</td>
                    <td className="px-4 py-3 text-gray-700">{ua.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{ua.district || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{ua.contactNo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ua.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ua.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                      <button title="Edit" onClick={() => { setEditingUA(ua); setShowUAForm(true) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button title="Delete" onClick={() => setDeleteModal({ isOpen: true, id: ua._id, name: ua.name, type: 'ua' })} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={curPag} onPageChange={curFetch} itemLabel={view === 'members' ? 'members' : 'unit admins'} />
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={showUserForm}
        onClose={() => { setShowUserForm(false); setEditingUser(null) }}
        editUser={editingUser}
        onSaved={() => fetchUsers(pagination.current)}
      />
      <TransferModal
        isOpen={!!transferUser}
        onClose={() => setTransferUser(null)}
        user={transferUser}
        onTransferred={() => fetchUsers(pagination.current)}
      />
      <UnitAdminFormModal
        isOpen={showUAForm}
        onClose={() => { setShowUAForm(false); setEditingUA(null) }}
        editAdmin={editingUA}
        onSaved={() => fetchUAs(uaPagination.current)}
      />
      <AssignAdminModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        onAssigned={() => fetchUAs(uaPagination.current)}
      />
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: null, type: null })}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

export default UserManagementDynamic
