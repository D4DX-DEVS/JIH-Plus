import React, { useState, useEffect } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { useLocation as useHierarchyLocation } from '../../hooks/useLocation'
import { getId, getLabel } from '../../utils/ihthisabi/locationOptions'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── LocationSelects sub-component ────────────────────────────────────────────
export const LocationSelects = ({ value, onChange, required = false }) => {
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
        <select className="form-select text-[13px] sm:text-sm" value={selDistrictId} onChange={e => handleDistrict(e.target.value)}>
          <option value="">Select District</option>
          {districts.map(d => <option key={getId(d)} value={getId(d)}>{getLabel(d)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Area {required && <span className="text-red-500">*</span>}</label>
        <select className="form-select text-[13px] sm:text-sm" value={selAreaId} onChange={e => handleArea(e.target.value)} disabled={!selDistrictId || locLoading.areas}>
          <option value="">{!selDistrictId ? 'Select district first' : locLoading.areas ? 'Loading…' : 'Select Area'}</option>
          {areas.map(a => <option key={getId(a)} value={getId(a)}>{getLabel(a)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Unit {required && <span className="text-red-500">*</span>}</label>
        <select className="form-select text-[13px] sm:text-sm" value={value.unit ? getId(units.find(u => getLabel(u) === value.unit)) || '' : ''} onChange={e => handleUnit(e.target.value)} disabled={!selAreaId || locLoading.units}>
          <option value="">{!selAreaId ? 'Select area first' : locLoading.units ? 'Loading…' : 'Select Unit'}</option>
          {units.map(u => <option key={getId(u)} value={getId(u)}>{getLabel(u)}</option>)}
        </select>
        {value.unit && (
          <p className="mt-0.5 text-xs text-gray-500">Current: {value.unit}</p>
        )}
      </div>
    </div>
  )
}

// ─── MemberFormModal ──────────────────────────────────────────────────────────
const emptyUser = { ruknId: '', name: '', gender: 'Male', district: '', area: '', unit: '', contactNo: '', emailId: '', country: '', isAbroad: false, abroadCountry: '', isActive: true }

const MemberFormModal = ({ isOpen, onClose, editUser, onSaved }) => {
  const [form, setForm]       = useState(emptyUser)
  const [saving, setSaving]   = useState(false)
  const [abroadCountries, setAbroadCountries] = useState([])

  useEffect(() => {
    if (!isOpen) return
    api.get('/ihthisabi/admin/abroad-countries').then(r => setAbroadCountries(r.data.data?.countries || [])).catch(() => {})
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
    if (!form.ruknId.trim() || !form.name.trim()) {
      toast.error('Rukn ID and Name are required')
      return
    }
    if (!/^\d+$/.test(form.ruknId.trim())) {
      toast.error('Rukn ID must contain digits only')
      return
    }
    if (!form.gender) {
      toast.error('Gender is required')
      return
    }
    // Abroad members live outside the district hierarchy, so only they may skip it
    if (!form.isAbroad && (!form.district.trim() || !form.area.trim() || !form.unit.trim())) {
      toast.error('District, Area and Unit are required')
      return
    }
    if (form.isAbroad && !form.abroadCountry) {
      toast.error('Please select the abroad country')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, ruknId: form.ruknId.trim(), abroadCountry: form.isAbroad ? (form.abroadCountry || null) : null }
      if (editUser) {
        await api.put(`/ihthisabi/admin/users/${editUser._id}/profile`, payload)
        toast.success('Member updated successfully')
      } else {
        await api.post('/ihthisabi/admin/users', payload)
        toast.success('Member created successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save member')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg w-full max-w-2xl my-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{editUser ? 'Edit Member' : 'Add New Member'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rukn ID <span className="text-red-500">*</span></label>
              <input className="form-input text-base sm:text-sm" value={form.ruknId} onChange={e => set('ruknId', e.target.value)} inputMode="numeric" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input className="form-input text-base sm:text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
              <select className="form-select text-[13px] sm:text-sm" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <input className="form-input text-base sm:text-sm" value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. IN" />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Location {!form.isAbroad && <span className="text-red-500">*</span>}
            </p>
            <LocationSelects
              value={{ district: form.district, area: form.area, unit: form.unit }}
              onChange={({ district, area, unit }) => setForm(f => ({ ...f, district, area, unit }))}
              required={!form.isAbroad}
            />
          </div>

          <div className="flex flex-wrap gap-4 border-t pt-4">
            <label className="flex items-center gap-2 py-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isAbroad} onChange={e => set('isAbroad', e.target.checked)} className="rounded" />
              Is Abroad Member
            </label>
            <label className="flex items-center gap-2 py-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
              Active Account
            </label>
          </div>

          {form.isAbroad && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Abroad Country <span className="text-red-500">*</span></label>
              <select className="form-select text-[13px] sm:text-sm" value={form.abroadCountry} onChange={e => set('abroadCountry', e.target.value)}>
                <option value="">Select Country</option>
                {abroadCountries.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create Member'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MemberFormModal
