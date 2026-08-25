import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import Pagination from '../../components/ihthisabi/Pagination'
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, X, UserCog, Check, Loader2, Landmark } from 'lucide-react'

const emptyForm = () => ({
  ruknId: '',
  name: '',
  mekhala: '',
  contactNo: '',
  emailId: '',
  isActive: true
})

function FormModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="ih-surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h2>
          <button onClick={onClose} className="ih-icon-btn hover:bg-gray-100 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  )
}

// A nazim is always an existing member, never a new one — so the Rukn ID and name
// are chosen by searching the member list rather than typed in by hand.
function RuknPicker({ selected, onSelect, onClear }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/ihthisabi/admin/users', { params: { search: q, limit: 8 } })
        if (!cancelled) setResults(res.data.data?.users || [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  if (selected) {
    const place = [selected.unit, selected.area, selected.district].filter(Boolean).join(' · ')
    return (
      <div className="flex items-start gap-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Check className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ih-list-title">{selected.name}</p>
          <p className="ih-list-meta mt-0.5">Rukn ID: {selected.ruknId}</p>
          {place && <p className="ih-list-meta">{place}</p>}
        </div>
        <button type="button" onClick={() => { setQuery(''); setResults([]); onClear() }}
          className="shrink-0 text-xs font-medium text-primary hover:underline">
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search className="ih-filter-icon" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
          placeholder="Search member by name or Rukn ID…" className="ih-field" />
        {searching && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>

      {query.trim().length >= 2 && (
        <div className="ih-section-card ih-list mt-2 max-h-52 overflow-y-auto">
          {results.map((u) => {
            const place = [u.unit, u.area, u.district].filter(Boolean).join(' · ')
            return (
              <button key={u._id} type="button" onClick={() => onSelect(u)} className="ih-list-row w-full text-left">
                <span className="ih-avatar bg-primary/10 text-primary">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="ih-list-title block">{u.name}</span>
                  <span className="ih-list-meta block">{u.ruknId}{place ? ` · ${place}` : ''}</span>
                </span>
              </button>
            )
          })}
          {!searching && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No matching member found</p>
          )}
        </div>
      )}
    </div>
  )
}

const MekhalaNazimManagement = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.isAdmin || user?.role === 'mainAdmin'

  const [nazims, setNazims] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0, limit: 10 })
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [mekhalaOptions, setMekhalaOptions] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [selectedRukn, setSelectedRukn] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (search) params.search = search
      const res = await api.get('/ihthisabi/admin/mekhala-nazims', { params })
      const payload = res.data.data
      setNazims(payload.mekhalaNazims || [])
      setPagination(payload.pagination || { current: page, pages: 1, total: 0, limit: 10 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load mekhala nazims')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load(1) }, [load])

  const openForm = async (item) => {
    setFormError('')
    setEditItem(item || null)
    setForm(item
      ? {
          ruknId: item.ruknId || '',
          name: item.name || '',
          mekhala: item.mekhala?._id || '',
          contactNo: item.contactNo || '',
          emailId: item.emailId || '',
          isActive: item.isActive !== false
        }
      : emptyForm()
    )
    setSelectedRukn(item ? { name: item.name, ruknId: item.ruknId } : null)
    setFormOpen(true)
    try {
      const res = await api.get('/ihthisabi/admin/mekhala-nazims/available-mekhalas', {
        params: item ? { includeId: item.mekhala?._id } : {}
      })
      setMekhalaOptions(res.data.data.mekhalas || [])
    } catch {
      setMekhalaOptions([])
    }
  }

  const handleSave = async () => {
    if (!form.ruknId.trim()) return setFormError('Search and select the member who will be nazim')
    if (!form.mekhala) return setFormError('Select a mekhala')

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ruknId: form.ruknId.trim(),
        name: form.name.trim(),
        mekhala: form.mekhala,
        contactNo: form.contactNo.trim(),
        emailId: form.emailId.trim()
      }
      if (editItem) {
        payload.isActive = form.isActive
        await api.put(`/ihthisabi/admin/mekhala-nazims/${editItem._id}/profile`, payload)
        toast.success('Mekhala nazim updated')
      } else {
        await api.post('/ihthisabi/admin/mekhala-nazims', payload)
        toast.success('Mekhala nazim created')
      }
      setFormOpen(false)
      setEditItem(null)
      load(pagination.current)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/ihthisabi/admin/mekhala-nazims/${deleteItem._id}`)
      toast.success('Mekhala nazim removed')
      setDeleteItem(null)
      load(pagination.current)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ih-page-shell max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <div className="hidden min-w-0 sm:block">
            <h1 className="ih-page-title">Mekhala Nazim</h1>
            <p className="ih-page-subtitle">One nazim per mekhala, promoted from an existing member</p>
          </div>
          {isSuperAdmin && (
            <button onClick={() => openForm(null)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#161F2F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1a2538] sm:px-4 sm:py-2.5 sm:text-sm">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Nazim</span>
            </button>
          )}
        </div>

        <div className="relative mb-3 sm:max-w-xs">
          <Search className="ih-filter-icon" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or Rukn ID…" className="ih-field" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : nazims.length === 0 ? (
          <div className="ih-surface px-4 py-8 text-center sm:py-12">
            <UserCog className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No mekhala nazims yet</h3>
            <p className="text-xs text-gray-500">Create a mekhala under Master Data first, then assign a nazim here.</p>
          </div>
        ) : (
          <div className="ih-section-card ih-list overflow-hidden">
            {nazims.map((n) => (
              <div key={n._id} className="ih-list-row">
                <span className="ih-avatar bg-primary/10 text-primary">
                  {(n.name || '?').charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="ih-list-title">{n.name}</h3>
                    <span className={`ih-chip ih-chip-dot ${
                      n.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {n.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="ih-list-meta mt-1 flex items-center gap-1">
                    <Landmark className="w-3 h-3 shrink-0" />
                    {n.mekhala?.name || '—'} · {n.mekhala?.districts?.length || 0} districts
                  </p>
                  <p className="ih-list-meta mt-0.5">
                    {n.ruknId}{n.contactNo ? ` · ${n.contactNo}` : ''}
                  </p>
                </div>

                {isSuperAdmin && (
                  <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-gray-50 p-0.5">
                    <button onClick={() => openForm(n)} title="Edit"
                      className="ih-icon-btn hover:bg-blue-50 hover:text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(n)} title="Remove nazim"
                      className="ih-icon-btn hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {nazims.length > 0 && (
          <Pagination pagination={pagination} onPageChange={load} loading={loading} itemLabel="nazims" />
        )}
      </div>

      {formOpen && (
        <FormModal title={editItem ? `Edit Nazim: ${editItem.name}` : 'Add Mekhala Nazim'} onClose={() => setFormOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mekhala</label>
              <select value={form.mekhala} onChange={(e) => setForm({ ...form, mekhala: e.target.value })}
                className={inputClass}>
                <option value="">Select mekhala…</option>
                {mekhalaOptions.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.districts?.length || 0} districts)</option>
                ))}
              </select>
              {mekhalaOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Every mekhala already has a nazim, or none exist yet. Add one under Master Data → മേഖല.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
              <RuknPicker
                selected={selectedRukn}
                onSelect={(u) => {
                  setSelectedRukn(u)
                  setForm((prev) => ({
                    ...prev,
                    ruknId: u.ruknId || '',
                    name: u.name || '',
                    contactNo: prev.contactNo || u.contactNo || '',
                    emailId: prev.emailId || u.emailId || ''
                  }))
                }}
                onClear={() => {
                  setSelectedRukn(null)
                  setForm((prev) => ({ ...prev, ruknId: '', name: '' }))
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <input value={form.contactNo} onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.emailId} onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                  className={inputClass} />
              </div>
            </div>

            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              No password needed — the nazim signs in with their RUKN ID, then picks
              <span className="font-medium"> Mekhala Nazim </span> or
              <span className="font-medium"> Member </span> on the role screen.
            </p>

            {editItem && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            )}

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setFormOpen(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-[#161F2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a2538] disabled:opacity-50">
                {saving ? 'Saving…' : editItem ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </FormModal>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Remove Mekhala Nazim"
        message={`Remove the nazim role from "${deleteItem?.name || ''}"? Their member account and any reports they already submitted are kept. "${deleteItem?.mekhala?.name || ''}" will have no nazim until a new one is assigned.`}
        confirmText="Remove"
        variant="danger"
        isLoading={saving}
      />
    </div>
  )
}

export default MekhalaNazimManagement
