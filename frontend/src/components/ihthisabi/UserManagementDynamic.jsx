import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { useLocation as useHierarchyLocation } from '../../hooks/useLocation'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Pagination'
import MemberFormModal, { LocationSelects } from './MemberFormModal'
import { getId, getLabel } from '../../utils/ihthisabi/locationOptions'
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
  CheckCircle,
  MapPin,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

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
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 p-5 border-b">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Transfer Member</h3>
            <p className="truncate text-sm text-gray-500">{user.name} — Current unit: <strong>{user.unit}</strong></p>
          </div>
          <button onClick={onClose} className="shrink-0 p-2 -m-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
      <div className="bg-white rounded-lg w-full max-w-lg my-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">{editAdmin ? 'Edit Unit Admin' : 'Add Unit Admin'}</h3>
          <button onClick={onClose} className="shrink-0 p-2 -m-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rukn ID <span className="text-red-500">*</span></label>
              <input className="form-input text-base sm:text-sm" value={form.ruknId} onChange={e => set('ruknId', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input className="form-input text-base sm:text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact No</label>
              <input className="form-input text-base sm:text-sm" value={form.contactNo} onChange={e => set('contactNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="form-input text-base sm:text-sm" value={form.emailId} onChange={e => set('emailId', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{editAdmin ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="form-input text-base sm:text-sm" value={form.password} onChange={e => set('password', e.target.value)} placeholder={editAdmin ? 'Leave blank to keep current' : 'Min 6 characters'} />
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
      <div className="bg-white rounded-lg w-full max-w-lg my-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold">Assign Unit Admin from Member</h3>
            <p className="text-xs text-gray-500">Choose a member from any unit and assign them as unit admin</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-2 -m-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                    className={`w-full text-left px-3 py-3 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedUser?._id === m._id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
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
  const [filtersOpen,        setFiltersOpen]        = useState(false)
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
  const activeFilterCount = [searchTerm, districtFilter, areaFilter, unitFilter].filter(Boolean).length

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
        {/* Hidden on mobile — the app bar already names this screen there. */}
        <div className="hidden lg:block">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            User Management
          </h2>
          <p className="text-sm text-gray-500">Super admin — full control over members &amp; unit admins</p>
        </div>

        {/* Actions — one height, one shape; labels shorten on phones so the row
            never wraps, even in the three-button unit-admin view. */}
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <button
            onClick={() => { setView(view === 'members' ? 'unitadmins' : 'members'); resetFilters(); setFiltersOpen(false) }}
            className={`inline-flex h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:h-9 sm:flex-none sm:px-4 sm:text-sm ${
              view === 'unitadmins' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
            style={view === 'unitadmins' ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="truncate">{view === 'members' ? 'Unit Admins' : 'Members'}</span>
          </button>

          <button
            onClick={() => setFiltersOpen(o => !o)}
            title="Search and filter"
            aria-expanded={filtersOpen}
            className={`inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:hidden ${
              activeFilterCount > 0 ? 'bg-primary/10 text-primary' : 'text-gray-500'
            }`}
            style={activeFilterCount > 0 ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {view === 'members' && (
            <button onClick={() => { setEditingUser(null); setShowUserForm(true) }} className="btn-primary h-[44px] shrink-0 gap-1 px-3 text-[11px] sm:h-9 sm:px-4 sm:text-sm">
              <UserPlus className="h-4 w-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Member</span>
            </button>
          )}
          {view === 'unitadmins' && (
            <>
              <button onClick={() => { setEditingUA(null); setShowUAForm(true) }} className="btn-primary h-[44px] shrink-0 gap-1 px-3 text-[11px] sm:h-9 sm:px-4 sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Unit Admin</span>
              </button>
              <button onClick={() => setShowAssign(true)} className="btn-primary h-[44px] shrink-0 gap-1 bg-indigo-600 px-3 text-[11px] hover:bg-indigo-700 sm:h-9 sm:px-4 sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span className="sm:hidden">Assign</span>
                <span className="hidden sm:inline">Assign from Member</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats — three compact tiles on a single row at every width. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { Icon: Users, tone: 'text-blue-500', short: 'Total',
            label: view === 'members' ? 'Total Members' : 'Total Unit Admins',
            value: curPag.total || 0 },
          { Icon: CheckCircle, tone: 'text-green-500', short: 'Active', label: 'Active',
            value: (view === 'members' ? users : unitAdmins).filter(u => u.isActive).length },
          { Icon: AlertCircle, tone: 'text-amber-500', short: 'Inactive', label: 'Inactive',
            value: (view === 'members' ? users : unitAdmins).filter(u => !u.isActive).length },
        ].map(stat => (
          <div key={stat.label} className="flex min-w-0 items-center gap-2 rounded-xl border bg-white p-2 sm:gap-3 sm:p-3">
            <stat.Icon className={`h-4 w-4 shrink-0 sm:h-7 sm:w-7 ${stat.tone}`} />
            <div className="min-w-0">
              <p className="truncate text-[10px] text-gray-500 sm:text-xs">
                <span className="sm:hidden">{stat.short}</span>
                <span className="hidden sm:inline">{stat.label}</span>
              </p>
              <p className="text-base font-bold text-gray-900 sm:text-xl">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters — collapsed on phones behind the toggle above, always
          open from sm: where there is room for them. */}
      <div className={`${filtersOpen ? 'block' : 'hidden'} ih-surface p-2.5 sm:!block sm:p-3`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="ih-filter-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search name or Rukn ID…"
              className="ih-field h-[44px] pr-3 text-base sm:h-9 sm:text-sm"
            />
          </div>
          <div className="relative">
            <MapPin className="ih-filter-icon" />
            <select className="ih-filter-select h-[44px] truncate text-[13px] sm:h-9 sm:text-sm" value={selectedDistrictId} onChange={e => handleDistrictChange(e.target.value)}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
            </select>
          </div>
          <div className="relative">
            <MapPin className="ih-filter-icon" />
            <select className="ih-filter-select h-[44px] truncate text-[13px] sm:h-9 sm:text-sm" value={selectedAreaId} onChange={e => handleAreaChange(e.target.value)} disabled={!selectedDistrictId || locLoading.areas}>
              <option value="">All Areas</option>
              {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
            </select>
          </div>
          <div className="relative">
            <MapPin className="ih-filter-icon" />
            <select className="ih-filter-select h-[44px] truncate text-[13px] sm:h-9 sm:text-sm" value={unitFilter ? getId(units.find(u => getLabel(u) === unitFilter)) || '' : ''} onChange={e => handleUnitChange(e.target.value)} disabled={!selectedAreaId || locLoading.units}>
              <option value="">All Units</option>
              {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
            </select>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800"
            style={{ backgroundColor: 'rgba(16,24,40,0.04)' }}
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">
            {view === 'members' ? 'Members' : 'Unit Admins'} — {loading ? '…' : `${curPag.total || 0} total`}
          </span>
        </div>

        {/* Eight columns don't fit phone widths — mobile gets a card list below instead. */}
        <div className="hidden lg:block lg:overflow-x-auto">
          <table className="ih-table-compact w-full min-w-full divide-y divide-gray-200 text-sm">
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

        {/* Mobile list */}
        <div className="ih-list lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Loading…
            </div>
          ) : (view === 'members' ? users : unitAdmins).length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No {view === 'members' ? 'members' : 'unit admins'} found
            </div>
          ) : (
            (view === 'members' ? users : unitAdmins).map((row) => (
              <div key={row._id} className="ih-list-row">
                <div className="min-w-0 flex-1">
                  <div className="ih-list-title">{row.name}</div>
                  <div className="ih-list-meta">
                    {row.ruknId}
                    {view === 'members' && row.gender ? ` · ${row.gender}` : ''}
                    {row.contactNo ? ` · ${row.contactNo}` : ''}
                  </div>
                  <div className="ih-list-meta">
                    {[row.district, row.unit].filter(Boolean).join(' - ') || '—'}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className={`ih-chip ${row.isActive ? 'border-green-200 bg-green-100 text-green-800' : 'border-red-200 bg-red-100 text-red-800'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (view === 'members') { setEditingUser(row); setShowUserForm(true) }
                        else { setEditingUA(row); setShowUAForm(true) }
                      }}
                      title="Edit"
                      className="ih-icon-btn text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {view === 'members' && (
                      <button onClick={() => setTransferUser(row)} title="Transfer" className="ih-icon-btn text-indigo-600 hover:bg-indigo-50">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, id: row._id, name: row.name, type: view === 'members' ? 'user' : 'ua' })}
                      title="Delete"
                      className="ih-icon-btn text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination pagination={curPag} onPageChange={curFetch} itemLabel={view === 'members' ? 'members' : 'unit admins'} />
      </div>

      {/* Modals */}
      <MemberFormModal
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
