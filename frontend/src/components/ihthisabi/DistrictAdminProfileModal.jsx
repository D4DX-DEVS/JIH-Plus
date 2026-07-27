import React, { useState, useEffect } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { X, User, Phone, Mail, MapPin, Calendar, CheckCircle2, XCircle, Loader2, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { ruknId: '', name: '', district: '', contactNo: '', emailId: '', password: '', isActive: true }

const DistrictAdminProfileModal = ({ districtAdminId, isOpen, onClose, onSaved, onDeleted }) => {
  const isCreate = !districtAdminId
  const [districtAdmin, setDistrictAdmin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(isCreate)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!isOpen) return
    if (isCreate) {
      setForm(emptyForm)
      setEditing(true)
      setDistrictAdmin(null)
    } else {
      fetchDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, districtAdminId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const response = await api.get(`ihthisabi/admin/district-admins/${districtAdminId}`)
      const admin = response.data.data.districtAdmin
      setDistrictAdmin(admin)
      setForm({
        ruknId: admin.ruknId || '',
        name: admin.name || '',
        district: admin.district || '',
        contactNo: admin.contactNo || '',
        emailId: admin.emailId || '',
        password: '',
        isActive: admin.isActive
      })
      setEditing(false)
    } catch (error) {
      console.error('Error fetching district admin details:', error)
      toast.error('Failed to load district admin details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.ruknId.trim() || !form.name.trim() || !form.district.trim()) {
      toast.error('RUKN ID, name, and district are required')
      return
    }
    if (isCreate && (!form.password || form.password.length < 6)) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    try {
      if (isCreate) {
        await api.post('ihthisabi/admin/district-admins', form)
        toast.success('District admin created successfully')
      } else {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.put(`ihthisabi/admin/district-admins/${districtAdminId}/profile`, payload)
        toast.success('District admin updated successfully')
      }
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Error saving district admin:', error)
      toast.error(error.response?.data?.message || 'Failed to save district admin')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    setSaving(true)
    try {
      await api.put(`ihthisabi/admin/district-admins/${districtAdminId}/profile`, { isActive: !districtAdmin.isActive })
      toast.success(districtAdmin.isActive ? 'District admin deactivated' : 'District admin activated')
      onSaved?.()
      fetchDetails()
    } catch (error) {
      console.error('Error toggling district admin status:', error)
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete district admin "${districtAdmin?.name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.delete(`ihthisabi/admin/district-admins/${districtAdminId}`)
      toast.success('District admin deleted')
      onDeleted?.()
      onClose()
    } catch (error) {
      console.error('Error deleting district admin:', error)
      toast.error('Failed to delete district admin')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {isCreate ? 'Add District Admin' : editing ? 'Edit District Admin' : 'District Admin Profile'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="ml-2 text-gray-600 text-sm">Loading profile...</span>
            </div>
          ) : editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">RUKN ID</label>
                <input
                  type="text"
                  value={form.ruknId}
                  onChange={(e) => setForm((f) => ({ ...f, ruknId: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. 109518"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Contact No</label>
                  <input
                    type="text"
                    value={form.contactNo}
                    onChange={(e) => setForm((f) => ({ ...f, contactNo: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.emailId}
                    onChange={(e) => setForm((f) => ({ ...f, emailId: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {isCreate ? 'Password' : 'New Password (leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="form-input"
                  placeholder="Min 6 characters"
                />
              </div>
              {!isCreate && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              )}
            </div>
          ) : districtAdmin ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 -mx-4 -mt-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white">
                      {districtAdmin.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                      districtAdmin.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{districtAdmin.name}</h3>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        districtAdmin.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {districtAdmin.isActive ? <><CheckCircle2 className="w-3 h-3 mr-1" />Active</> : <><XCircle className="w-3 h-3 mr-1" />Inactive</>}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        District Admin
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                    <label className="text-xs font-semibold text-gray-500">RUKN ID</label>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{districtAdmin.ruknId}</p>
                </div>
                <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                    <label className="text-xs font-semibold text-gray-500">District</label>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{districtAdmin.district}</p>
                </div>
                {districtAdmin.contactNo && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Contact</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{districtAdmin.contactNo}</p>
                  </div>
                )}
                {districtAdmin.emailId && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Mail className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Email</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 break-all">{districtAdmin.emailId}</p>
                  </div>
                )}
                {districtAdmin.lastLogin && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Last Login</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{new Date(districtAdmin.lastLogin).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No profile data available</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
          {!isCreate && !editing && (
            <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {!isCreate && !editing && (
              <>
                <button onClick={handleToggleActive} disabled={saving} className="btn-ghost text-sm disabled:opacity-50">
                  {districtAdmin?.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </>
            )}
            {editing && (
              <>
                {!isCreate && (
                  <button onClick={() => setEditing(false)} className="btn-ghost text-sm" disabled={saving}>
                    Cancel
                  </button>
                )}
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            {!editing && (
              <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DistrictAdminProfileModal
