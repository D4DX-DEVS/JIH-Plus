import React, { useState, useEffect } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { Archive, Trash2, Plus, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Pagination'

const QUARTER_NAMES = {
  1: 'Q1 (Jan–Mar)',
  2: 'Q2 (Apr–Jun)',
  3: 'Q3 (Jul–Sep)',
  4: 'Q4 (Oct–Dec)',
}

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i)

const ArchiveManagement = () => {
  const [archivedList, setArchivedList] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ quarter: '', year: currentYear })
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, label: '' })

  const fetchArchivedQuarters = async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/ihthisabi/admin/archive-quarters', { params: { page, limit: 10 } })
      setArchivedList(res.data.data || [])
      setPagination(res.data.pagination || { current: 1, pages: 1, total: 0 })
    } catch (err) {
      toast.error('Failed to load archived quarters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArchivedQuarters(1) }, [])

  const handleArchive = async () => {
    const quarterNum = parseInt(formData.quarter, 10)
    if (!quarterNum || quarterNum < 1 || quarterNum > 4) {
      toast.error('Please select a quarter')
      return
    }
    setSaving(true)
    try {
      await api.post('/ihthisabi/admin/archive-quarters', {
        quarter: quarterNum,
        year: parseInt(formData.year, 10)
      })
      toast.success(`Q${quarterNum} ${formData.year} archived`)
      setShowForm(false)
      setFormData({ quarter: '', year: currentYear })
      fetchArchivedQuarters(1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive quarter')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (item) => {
    setDeleteModal({
      isOpen: true,
      id: item._id,
      label: `Q${item.quarter} ${item.year}`
    })
  }

  const handleUnarchive = async () => {
    try {
      await api.delete(`/ihthisabi/admin/archive-quarters/${deleteModal.id}`)
      toast.success(`${deleteModal.label} unarchived`)
      setDeleteModal({ isOpen: false, id: null, label: '' })
      fetchArchivedQuarters(pagination.current)
    } catch (err) {
      toast.error('Failed to unarchive quarter')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden lg:block">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-[#002349]" />
            Archive Quarters
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Archived quarters are hidden from unit admins and members. Data is preserved.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormData({ quarter: '', year: currentYear }) }}
          className="btn-primary flex items-center gap-2 ml-auto"
          disabled={showForm}
        >
          <Plus className="w-4 h-4" />
          Archive Quarter
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-blue-800">Archive a Quarter</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quarter</label>
              <select
                value={formData.quarter}
                onChange={e => setFormData(d => ({ ...d, quarter: e.target.value }))}
                className="form-input"
              >
                <option value="">Select quarter</option>
                {[1, 2, 3, 4].map(q => (
                  <option key={q} value={q}>{QUARTER_NAMES[q]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={e => setFormData(d => ({ ...d, year: parseInt(e.target.value, 10) }))}
                className="form-input"
              >
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleArchive}
                disabled={saving}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center px-4 py-2 rounded-lg bg-[#002349] text-white text-sm font-medium hover:bg-[#003070] disabled:opacity-50"
              >
                {saving ? 'Archiving...' : 'Confirm Archive'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-xs text-blue-700">
            Once archived, all submissions for this quarter will be hidden from unit admins and members. You can unarchive at any time.
          </p>
        </div>
      )}

      {/* Archived List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Mobile: roomy tappable rows — one full-width target per record */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <div className="w-5 h-5 border-2 border-[#002349] border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : archivedList.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No archived quarters</p>
              <p className="text-sm text-gray-400 mt-1">Archived quarters will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {archivedList.map(item => (
                <div key={item._id} className="min-h-[56px] flex items-center gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">Q{item.quarter} {item.year}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{QUARTER_NAMES[item.quarter]}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Archived {item.archivedAt
                          ? new Date(item.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                        {item.archivedBy ? ` · by ${item.archivedBy}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openDeleteModal(item)}
                    title="Unarchive"
                    className="shrink-0 inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Unarchive
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block ih-scroll-x">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quarter / Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Archived At
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Archived By
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#002349] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : archivedList.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No archived quarters</p>
                  <p className="text-sm text-gray-400 mt-1">Archived quarters will appear here</p>
                </td>
              </tr>
            ) : (
              archivedList.map(item => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Archive className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Q{item.quarter} {item.year}
                        </p>
                        <p className="text-xs text-gray-500">{QUARTER_NAMES[item.quarter]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.archivedAt
                      ? new Date(item.archivedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.archivedBy || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openDeleteModal(item)}
                      title="Unarchive"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Unarchive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination pagination={pagination} onPageChange={fetchArchivedQuarters} loading={loading} itemLabel="archived quarters" />
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, label: '' })}
        onConfirm={handleUnarchive}
        title="Unarchive Quarter"
        message={`Are you sure you want to unarchive ${deleteModal.label}? Submissions for this quarter will become visible to unit admins and members again.`}
        confirmText="Unarchive"
        variant="danger"
      />
    </div>
  )
}

export default ArchiveManagement
