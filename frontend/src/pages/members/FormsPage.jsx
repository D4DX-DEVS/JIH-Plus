import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Copy, Eye, EyeOff, FileSearch, FileText, Globe, Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import FormPreview from '../../components/members/FormPreview'
import {
  Button, Card, EmptyState, ErrorState, FilterBar, IconButton, IconTile, ListSkeleton, Modal,
  PageHeader, Pagination, SearchInput, Select, TableWrap, Th, TypeBadge, PAGE_SIZE
} from '../../components/members/ui'
import { TYPE_TONE, cx, shortDate } from '../../utils/members/format'

/** Dot + label pill for a template's publish state. */
function PublishState({ published }) {
  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
      published ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-slate-100 text-slate-600 ring-slate-500/15'
    )}>
      <span className={cx('h-1.5 w-1.5 rounded-full', published ? 'bg-emerald-500' : 'bg-slate-400')} aria-hidden="true" />
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

/**
 * One published form per application type. A form stays editable after
 * publishing; only once applications are submitted against it does its
 * structure freeze (clone it to a draft to restructure).
 */
export default function FormsPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchBox, setSearchBox] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ formType: '', state: '' })
  // { template, loading, mode } while the read-only preview overlay is open.
  const [preview, setPreview] = useState(null)

  const openPreview = (template) => {
    setPreview({ template, loading: true, mode: 'applicant' })
    // The list payload may omit pages, so fetch the full template.
    api.get(`/forms/${template._id}`)
      .then(({ data }) => setPreview(prev => (
        prev?.template._id === template._id ? { ...prev, template: data.template, loading: false } : prev
      )))
      .catch(err => {
        toast.error(apiError(err, 'Failed to load the form'))
        setPreview(prev => (prev?.template._id === template._id ? null : prev))
      })
  }

  const load = () => {
    setLoading(true)
    api.get('/forms', { params: { search, ...filters, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setTemplates(data.templates || [])
        setTotal(data.pagination?.total || 0)
        setError('')
      })
      .catch(err => {
        const message = apiError(err, 'Failed to load forms')
        toast.error(message)
        setError(message)
      })
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

  // The same six actions serve the phone rows and the desktop table.
  const renderActions = (template) => (
    <>
      <IconButton icon={Eye} label="Preview form" onClick={() => openPreview(template)} />
      <IconButton
        icon={Inbox}
        label="View submissions"
        onClick={() => navigate(`/members/applications?formType=${template.formType}`)}
      />
      <IconButton icon={Pencil} label="Edit" tone="royal" onClick={() => navigate(`/members/forms/${template._id}`)} />
      <IconButton icon={Copy} label="Clone to a new draft" onClick={() => act(template, 'clone')} />
      <IconButton
        icon={template.isPublished ? EyeOff : Globe}
        label={template.isPublished ? 'Unpublish' : 'Publish'}
        tone={template.isPublished ? 'default' : 'success'}
        onClick={() => act(template, template.isPublished ? 'unpublish' : 'publish')}
      />
      <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setToDelete(template)} />
    </>
  )

  return (
    <div>
      <PageHeader
        title="Form Builder"
        subtitle="Configure the Rukn and Karkun application forms, including each role's comment sections."
        hideTitleOnMobile
        primaryAction={{
          label: 'New form',
          icon: Plus,
          onClick: () => navigate('/members/forms/new')
        }}
      />

      <FilterBar
        search={
          <SearchInput
            placeholder="Search forms by title"
            value={searchBox}
            onChange={e => setSearchBox(e.target.value)}
          />
        }
        active={filtersActive}
        activeCount={(filters.formType ? 1 : 0) + (filters.state ? 1 : 0)}
        onClear={clearFilters}
      >
        <Select className="sm:w-40" value={filters.formType} onChange={e => setFilter('formType', e.target.value)} aria-label="Application type">
          <option value="">All types</option>
          <option value="rukn">Rukn</option>
          <option value="karkoon">Karkun</option>
        </Select>
        <Select className="sm:w-40" value={filters.state} onChange={e => setFilter('state', e.target.value)} aria-label="Form state">
          <option value="">All states</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </FilterBar>

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={5} /> : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={filtersActive ? FileSearch : FileText}
            title={filtersActive ? 'No forms match these filters' : 'No forms yet'}
            message={filtersActive
              ? 'Try widening or clearing the filters.'
              : 'Build a form for each application type, then publish it so unit admins can issue access links.'}
            action={filtersActive
              ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
              : <Button onClick={() => navigate('/members/forms/new')}><Plus size={16} /> New form</Button>}
          />
        ) : (
          <>
            {/* Phones and tablets: one compact card per form, actions on their own line */}
            <div className="divide-y divide-line lg:hidden">
              {templates.map(template => (
                <div key={template._id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start gap-3">
                    <IconTile icon={FileText} tone={TYPE_TONE[template.formType] || 'slate'} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/members/forms/${template._id}`}
                        className="block text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere] hover:text-royal-700"
                      >
                        {template.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        v{template.version} · Updated {shortDate(template.updatedAt)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TypeBadge type={template.formType} />
                        <PublishState published={template.isPublished} />
                        {template.isLegacyImport && (
                          <span className="text-xs text-slate-500">Imported from the old portal</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-1.5">
                    {renderActions(template)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr>
                      <Th>Title</Th>
                      <Th>Type</Th>
                      <Th>Version</Th>
                      <Th>State</Th>
                      <Th>Updated</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {templates.map(template => (
                      <tr key={template._id} className="group transition-colors hover:bg-mist/70">
                        <td className="px-4 py-3 pl-5">
                          <Link to={`/members/forms/${template._id}`} className="font-semibold text-ink group-hover:text-royal-700">
                            {template.title}
                          </Link>
                          {template.isLegacyImport && (
                            <span className="block text-xs text-slate-500">Imported from the old portal</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={template.formType} /></td>
                        <td className="px-4 py-3 text-slate-600">v{template.version}</td>
                        <td className="px-4 py-3"><PublishState published={template.isPublished} /></td>
                        <td className="px-4 py-3 text-slate-500">{shortDate(template.updatedAt)}</td>
                        <td className="px-4 py-3 pr-4">
                          <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                            {renderActions(template)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </TableWrap>
            </div>
          </>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />

      {preview && (
        <FormPreview
          template={preview.template}
          mode={preview.mode}
          loading={preview.loading}
          onModeChange={mode => setPreview(prev => ({ ...prev, mode }))}
          onClose={() => setPreview(null)}
        />
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this form?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              {busy ? 'Deleting...' : 'Delete form'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="font-semibold text-ink">{toDelete?.title}</strong> will be removed permanently.
          {toDelete?.isPublished && ' It is currently published — applicants will no longer be able to open it.'}
          {' '}A form that already has submitted applications cannot be deleted.
        </p>
      </Modal>
    </div>
  )
}
