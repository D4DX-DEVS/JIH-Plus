import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Copy, Eye, EyeOff, Globe, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, FilterBar, Modal, PageHeader, Pagination,
  SearchInput, Select, Spinner, TableWrap, Th, PAGE_SIZE
} from '../../components/members/ui'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

/**
 * One published form per application type. A form stays editable after
 * publishing; only once applications are submitted against it does its
 * structure freeze (clone it to a draft to restructure).
 */
export default function FormsPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchBox, setSearchBox] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ formType: '', state: '' })

  const load = () => {
    setLoading(true)
    api.get('/forms', { params: { search, ...filters, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setTemplates(data.templates || [])
        setTotal(data.pagination?.total || 0)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load forms')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [search, filters, page])

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchBox.trim()); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [searchBox])

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const filtersActive = Boolean(searchBox || filters.formType || filters.state)
  const clearFilters = () => {
    setFilters({ formType: '', state: '' })
    setSearchBox('')
    setSearch('')
    setPage(1)
  }

  const act = async (template, verb) => {
    try {
      if (verb === 'clone') {
        const { data } = await api.post(`/forms/${template._id}/clone`)
        toast.success('Draft created')
        navigate(`/members/forms/${data.template._id}`)
        return
      }
      await api.patch(`/forms/${template._id}/${verb}`)
      toast.success(verb === 'publish' ? 'Form published' : 'Form unpublished')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not update the form'))
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await api.delete(`/forms/${toDelete._id}`)
      toast.success('Form deleted')
      setToDelete(null)
      if (templates.length === 1 && page > 1) setPage(p => p - 1)
      else load()
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the form'))
    } finally {
      setBusy(false)
    }
  }

  const iconBtn = 'p-2 text-gray-400 rounded-lg transition-colors'
  // Mobile action bar: equal-width, thumb-sized targets across the row.
  const mobileIconBtn = 'flex h-11 flex-1 items-center justify-center text-gray-400 rounded-lg transition-colors'

  return (
    <div>
      <PageHeader
        title="Form Builder"
        subtitle="Configure the Rukn and Karkoon application forms, including each role's comment sections."
        actions={
          <Button onClick={() => navigate('/members/forms/new')}>
            <Plus size={16} /> New form
          </Button>
        }
      />

      <FilterBar active={filtersActive} onClear={clearFilters}>
        <SearchInput
          className="flex-1 min-w-[200px]"
          placeholder="Search forms by title"
          value={searchBox}
          onChange={e => setSearchBox(e.target.value)}
        />
        <Select className="sm:w-40" value={filters.formType} onChange={e => setFilter('formType', e.target.value)}>
          <option value="">All types</option>
          <option value="rukn">Rukn</option>
          <option value="karkoon">Karkoon</option>
        </Select>
        <Select className="sm:w-40" value={filters.state} onChange={e => setFilter('state', e.target.value)}>
          <option value="">All states</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </FilterBar>

      <Card>
        {loading ? <Spinner /> : templates.length === 0 ? (
          <EmptyState
            title={filtersActive ? 'No forms match these filters' : 'No forms yet'}
            message={filtersActive
              ? 'Try widening or clearing the filters.'
              : 'Build a form for each application type, then publish it so unit admins can issue access links.'}
            action={filtersActive
              ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
              : <Button onClick={() => navigate('/members/forms/new')}><Plus size={16} /> New form</Button>}
          />
        ) : (
          <>
            {/* Mobile: roomy tappable rows — one full-width target per record */}
            <div className="lg:hidden divide-y divide-gray-100">
              {templates.map(template => (
                <div key={template._id} className="min-h-[56px] px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/members/forms/${template._id}`}
                      className="block text-[13px] font-semibold text-gray-900 hover:text-[#5b21b6] break-words leading-snug"
                    >
                      {template.title}
                    </Link>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {FORM_TYPE_LABEL[template.formType]} · v{template.version} ·{' '}
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        template.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {template.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {template.isLegacyImport && (
                        <span className="text-[11px] text-gray-500">Imported from the old portal</span>
                      )}
                    </div>
                  </div>
                  {/* Actions get their own full-width line so five targets stay
                      thumb-sized instead of squeezing beside the title. */}
                  <div className="mt-2.5 flex items-center gap-1 border-t border-gray-100 pt-2">
                    <button
                      title="View submissions"
                      onClick={() => navigate(`/members/applications?formType=${template.formType}`)}
                      className={`${mobileIconBtn} active:text-blue-600 active:bg-blue-50`}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      title="Edit"
                      onClick={() => navigate(`/members/forms/${template._id}`)}
                      className={`${mobileIconBtn} active:text-green-600 active:bg-green-50`}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      title="Clone to a new draft"
                      onClick={() => act(template, 'clone')}
                      className={`${mobileIconBtn} active:text-indigo-600 active:bg-indigo-50`}
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      title={template.isPublished ? 'Unpublish' : 'Publish'}
                      onClick={() => act(template, template.isPublished ? 'unpublish' : 'publish')}
                      className={`${mobileIconBtn} active:text-[#5b21b6] active:bg-violet-50`}
                    >
                      {template.isPublished ? <EyeOff size={18} /> : <Globe size={18} />}
                    </button>
                    <button
                      title="Delete"
                      onClick={() => setToDelete(template)}
                      className={`${mobileIconBtn} active:text-red-600 active:bg-red-50`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <TableWrap>
            <table className="hidden lg:table w-full text-sm min-w-[680px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Version</Th>
                  <Th>State</Th>
                  <Th>Updated</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map(template => (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/members/forms/${template._id}`} className="font-medium text-gray-900 hover:text-[#5b21b6]">
                        {template.title}
                      </Link>
                      {template.isLegacyImport && (
                        <span className="block text-xs text-gray-500">Imported from the old portal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{FORM_TYPE_LABEL[template.formType]}</td>
                    <td className="px-4 py-3 text-gray-600">v{template.version}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        template.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {template.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          title="View submissions"
                          onClick={() => navigate(`/members/applications?formType=${template.formType}`)}
                          className={`${iconBtn} hover:text-blue-600 hover:bg-blue-50`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => navigate(`/members/forms/${template._id}`)}
                          className={`${iconBtn} hover:text-green-600 hover:bg-green-50`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          title="Clone to a new draft"
                          onClick={() => act(template, 'clone')}
                          className={`${iconBtn} hover:text-indigo-600 hover:bg-indigo-50`}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          title={template.isPublished ? 'Unpublish' : 'Publish'}
                          onClick={() => act(template, template.isPublished ? 'unpublish' : 'publish')}
                          className={`${iconBtn} hover:text-[#5b21b6] hover:bg-violet-50`}
                        >
                          {template.isPublished ? <EyeOff size={16} /> : <Globe size={16} />}
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setToDelete(template)}
                          className={`${iconBtn} hover:text-red-600 hover:bg-red-50`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </TableWrap>
          </>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this form?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting...' : 'Delete form'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <strong>{toDelete?.title}</strong> will be removed permanently.
          {toDelete?.isPublished && ' It is currently published — applicants will no longer be able to open it.'}
          {' '}A form that already has submitted applications cannot be deleted.
        </p>
      </Modal>
    </div>
  )
}
