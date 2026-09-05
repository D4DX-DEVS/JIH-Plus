import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, Plus, Ban, RotateCcw, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import {
  Button, Card, EmptyState, Field, FilterBar, Input, Modal, PageHeader,
  Pagination, Select, Spinner, StatusBadge, TableWrap, Th, PAGE_SIZE
} from '../../components/members/ui'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

/**
 * Unit-level admins issue one link per applicant per form type here, hand the
 * credential over outside the system, then block the link once the application
 * is in. The password is shown exactly once, right after creation.
 */
export default function AccessLinksPage() {
  const { isSuperAdmin } = useAuth()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState(null)
  const [units, setUnits] = useState([])
  const [form, setForm] = useState({
    formType: 'rukn', applicantName: '', applicantMobile: '', expiryDays: 7, unit: ''
  })
  const [filter, setFilter] = useState({ formType: '', status: '' })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/access-links', { params: { ...filter, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setLinks(data.links || [])
        setTotal(data.pagination?.total || 0)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load access links')))
      .finally(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { load() }, [load])

  // Only the super admin has to say which unit an applicant belongs to; a scoped
  // creator's own posting is used automatically.
  useEffect(() => {
    if (!isSuperAdmin) return
    api.get('/admin/master-data', { params: { type: 'unit' } })
      .then(({ data }) => setUnits(data.locations || []))
      .catch(() => {})
  }, [isSuperAdmin])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = {
        formType: form.formType,
        applicantName: form.applicantName,
        applicantMobile: form.applicantMobile,
        expiryDays: Number(form.expiryDays) || 7
      }
      if (isSuperAdmin) {
        const unit = units.find(u => u.name === form.unit)
        if (!unit) throw new Error('Choose a unit for this applicant')
        body.scope = { unit: unit.name, area: unit.area, district: unit.district, mekhala: unit.mekhala }
      }
      const { data } = await api.post('/access-links', body)
      setIssued(data.credentials)
      setCreating(false)
      setForm({ formType: 'rukn', applicantName: '', applicantMobile: '', expiryDays: 7, unit: '' })
      load()
    } catch (err) {
      toast.error(err.response ? apiError(err) : err.message)
    } finally {
      setBusy(false)
    }
  }

  const act = async (id, verb) => {
    try {
      await api.patch(`/access-links/${id}/${verb}`)
      toast.success('Access link updated')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not update the access link'))
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/access-links/${toDelete._id}`)
      toast.success('Access link deleted')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the access link'))
    } finally {
      setDeleting(false)
    }
  }

  const fullUrl = (path) => `${window.location.origin}${path}`

  // Mobile action bar: equal-width, thumb-sized targets across the row —
  // matches the pattern already used in FormsPage.jsx.
  const mobileIconBtn = 'flex h-11 flex-1 items-center justify-center text-gray-500 rounded-lg transition-colors'

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy — select the text manually')
    }
  }

  return (
    <div>
      <PageHeader
        title="Form Access"
        subtitle="Create a personal link and credential for each applicant, then block it once they have submitted."
        hideTitleOnMobile
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> New access link</Button>}
      />

      <FilterBar
        active={Boolean(filter.formType || filter.status)}
        onClear={() => { setFilter({ formType: '', status: '' }); setPage(1) }}
      >
          <Select
            className="sm:w-44"
            value={filter.formType}
            onChange={e => { setFilter({ ...filter, formType: e.target.value }); setPage(1) }}
          >
            <option value="">All types</option>
            <option value="rukn">Rukn</option>
            <option value="karkoon">Karkoon</option>
          </Select>
          <Select
            className="sm:w-44"
            value={filter.status}
            onChange={e => { setFilter({ ...filter, status: e.target.value }); setPage(1) }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="blocked">Blocked</option>
            <option value="expired">Expired</option>
          </Select>
      </FilterBar>

      <Card>
        {loading ? <Spinner /> : links.length === 0 ? (
          <EmptyState
            title="No access links yet"
            message="An applicant can only open the form through a link you create here."
            action={<Button onClick={() => setCreating(true)}><Plus size={16} /> New access link</Button>}
          />
        ) : (
          <>
            {/* Mobile: roomy tappable rows — one full-width target per record */}
            <div className="lg:hidden divide-y divide-gray-100">
              {links.map(link => (
                <div key={link._id} className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 break-words leading-snug">
                      {link.applicantName || '—'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {FORM_TYPE_LABEL[link.formType]} · {link.username}
                      {link.applicantMobile ? ` · ${link.applicantMobile}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={link.status} />
                      <span className="text-[11px] text-gray-500">
                        Expires {new Date(link.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {/* Actions get their own full-width line so targets stay thumb-sized. */}
                  <div className="mt-2.5 flex items-center gap-1 border-t border-gray-100 pt-2">
                    <button
                      title="Copy link"
                      aria-label="Copy link"
                      onClick={() => copy(fullUrl(`/members/apply/${link.token}`))}
                      className={`${mobileIconBtn} active:text-gray-700 active:bg-gray-100`}
                    >
                      <Copy size={16} />
                    </button>
                    {link.status === 'blocked' ? (
                      <button
                        title="Reopen"
                        aria-label="Reopen"
                        onClick={() => act(link._id, 'reopen')}
                        className={`${mobileIconBtn} active:text-green-600 active:bg-green-50`}
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button
                        title="Block"
                        aria-label="Block"
                        onClick={() => act(link._id, 'block')}
                        className={`${mobileIconBtn} active:text-red-600 active:bg-red-50`}
                      >
                        <Ban size={16} />
                      </button>
                    )}
                    {!link.applicationId && (
                      <button
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => setToDelete(link)}
                        className={`${mobileIconBtn} active:text-red-600 active:bg-red-50`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <TableWrap>
            <table className="hidden lg:table w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <Th>Applicant</Th>
                  <Th>Type</Th>
                  <Th>Username</Th>
                  <Th>Status</Th>
                  <Th>Expires</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map(link => (
                  <tr key={link._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{link.applicantName || '—'}</span>
                      {link.applicantMobile && (
                        <span className="block text-xs text-gray-500">{link.applicantMobile}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{FORM_TYPE_LABEL[link.formType]}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{link.username}</td>
                    <td className="px-4 py-3"><StatusBadge status={link.status} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(link.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Copy link"
                          aria-label="Copy link"
                          onClick={() => copy(fullUrl(`/members/apply/${link.token}`))}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded"
                        >
                          <Copy size={15} />
                        </button>
                        {link.status === 'blocked' ? (
                          <button
                            title="Reopen"
                            aria-label="Reopen"
                            onClick={() => act(link._id, 'reopen')}
                            className="p-2 text-gray-500 hover:text-green-600 rounded"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <button
                            title="Block"
                            aria-label="Block"
                            onClick={() => act(link._id, 'block')}
                            className="p-2 text-gray-500 hover:text-red-600 rounded"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                        {!link.applicationId && (
                          <button
                            title="Delete"
                            aria-label="Delete"
                            onClick={() => setToDelete(link)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
        open={creating}
        onClose={() => setCreating(false)}
        title="New access link"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button form="access-link-form" type="submit" disabled={busy}>
              {busy ? 'Creating...' : 'Create link'}
            </Button>
          </>
        }
      >
        <form id="access-link-form" onSubmit={create} className="space-y-4">
          <Field label="Application type" required>
            <Select value={form.formType} onChange={e => setForm({ ...form, formType: e.target.value })}>
              <option value="rukn">Rukn</option>
              <option value="karkoon">Karkoon</option>
            </Select>
          </Field>

          {isSuperAdmin && (
            <Field label="Unit" required hint="The unit this applicant belongs to.">
              <Select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required>
                <option value="">Select a unit</option>
                {units.map(u => (
                  <option key={u._id} value={u.name}>{u.name} — {u.area}, {u.district}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Applicant name" hint="Only a label, so you can tell your links apart.">
            <Input value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} />
          </Field>

          <Field label="Applicant mobile" hint="Used to WhatsApp them the final decision.">
            <Input value={form.applicantMobile} onChange={e => setForm({ ...form, applicantMobile: e.target.value })} />
          </Field>

          <Field label="Valid for (days)">
            <Input
              type="number"
              min="1"
              max="90"
              value={form.expiryDays}
              onChange={e => setForm({ ...form, expiryDays: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(issued)}
        onClose={() => setIssued(null)}
        title="Share these with the applicant"
        footer={<Button onClick={() => setIssued(null)}>Done</Button>}
      >
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          The password is shown only now. Copy it before closing — it cannot be recovered later.
        </p>

        {issued && (
          <div className="space-y-3">
            {[
              { label: 'Link', value: fullUrl(issued.path) },
              { label: 'Username', value: issued.username },
              { label: 'Password', value: issued.password }
            ].map(row => (
              <div key={row.label}>
                <p className="text-xs font-medium text-gray-500 mb-1">{row.label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs break-all">
                    {row.value}
                  </code>
                  <Button variant="secondary" onClick={() => copy(row.value)}>
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this access link?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete link'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          The link and credential for <strong>{toDelete?.applicantName || toDelete?.username}</strong> will
          be removed permanently. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
