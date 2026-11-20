import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, Ban, Copy, FileText, Link2, MessageCircle, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import {
  Avatar, Button, Card, ChipGroup, EmptyState, Field, IconButton, Input, ListSkeleton, Modal,
  Notice, PageHeader, Pagination, StatusBadge, TableWrap, Tabs, Th, TypeBadge, PAGE_SIZE
} from '../../components/members/ui'
import { TYPE_TONE, shortDate } from '../../utils/members/format'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'
import LocationCascade from '../../components/members/LocationCascade'

const BLANK_FORM = {
  formType: 'rukn', applicantName: '', applicantMobile: '', expiryDays: 7, district: '', area: '', unit: ''
}

const TYPE_TABS = [
  { value: '', label: 'All types' },
  { value: 'rukn', label: 'Rukn' },
  { value: 'karkoon', label: 'Karkun' }
]

const STATUS_CHIPS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active', dot: 'bg-emerald-500' },
  { value: 'used', label: 'Used', dot: 'bg-royal-500' },
  { value: 'blocked', label: 'Blocked', dot: 'bg-rose-500' },
  { value: 'expired', label: 'Expired', dot: 'bg-slate-400' }
]

const EXPIRY_PRESETS = [3, 7, 14, 30]

/** "Expires in 3 days" / "Expires today" / "Expired 12 Nov 2026". */
function expiryLabel(value) {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return ''
  const days = Math.ceil((at.getTime() - Date.now()) / 86400000)
  if (days < 0) return `Expired ${shortDate(value)}`
  if (days === 0) return 'Expires today'
  return `Expires in ${days} day${days === 1 ? '' : 's'}`
}

/**
 * Unit-level admins issue one link per applicant per form type here, hand the
 * credential over outside the system, then block the link once the application
 * is in. The password is shown exactly once, right after creation.
 */
export default function AccessLinksPage() {
  const { isSuperAdmin } = useAuth()
  const [params, setParams] = useSearchParams()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState(null)
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(BLANK_FORM)
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

  // The dashboard's "New link" shortcut lands here with ?new=1.
  useEffect(() => {
    if (params.get('new') !== '1') return
    setCreating(true)
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('new')
      return next
    }, { replace: true })
  }, [params, setParams])

  // Only the super admin has to say which unit an applicant belongs to; a scoped
  // creator's own posting is used automatically.
  useEffect(() => {
    if (!isSuperAdmin) return
    api.get('/admin/master-data', { params: { types: 'district,area,unit' } })
      .then(({ data }) => setLocations(data.locations || []))
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
        // Unit names repeat across areas, so match the whole picked chain.
        const unit = locations.find(l => l.type === 'unit' && l.name === form.unit
          && l.area === form.area && l.district === form.district)
        if (!unit) throw new Error('Choose a unit for this applicant')
        body.scope = { unit: unit.name, area: unit.area, district: unit.district, mekhala: unit.mekhala }
      }
      const { data } = await api.post('/access-links', body)
      setIssued({ ...data.credentials, formType: form.formType, name: form.applicantName, mobile: form.applicantMobile })
      setCreating(false)
      setForm(BLANK_FORM)
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

  // One message carrying everything the applicant needs, ready to paste or send.
  const shareText = (cred) => [
    `${cred.name ? `${cred.name}, your` : 'Your'} ${FORM_TYPE_LABEL[cred.formType] || ''} application form:`.replace(/\s+/g, ' '),
    `Link: ${fullUrl(cred.path)}`,
    `Username: ${cred.username}`,
    `Password: ${cred.password}`,
    'Please keep these private.'
  ].join('\n')

  // wa.me needs the number in international form; a bare 10-digit number is Indian.
  const whatsappUrl = (cred) => {
    let digits = String(cred.mobile || '').replace(/\D/g, '')
    if (digits.length === 10) digits = `91${digits}`
    return `https://wa.me/${digits}?text=${encodeURIComponent(shareText(cred))}`
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy — select the text manually')
    }
  }

  const setFilterKey = (key, value) => { setFilter(prev => ({ ...prev, [key]: value })); setPage(1) }
  const filtering = Boolean(filter.formType || filter.status)

  // Copy / block-or-reopen / open application / delete — same set on every layout.
  const linkActions = (link) => (
    <>
      <IconButton icon={Copy} label="Copy link" tone="royal" onClick={() => copy(fullUrl(`/members/apply/${link.token}`))} />
      {link.status === 'blocked' ? (
        <IconButton icon={RotateCcw} label="Reopen" tone="success" onClick={() => act(link._id, 'reopen')} />
      ) : (
        <IconButton icon={Ban} label="Block" tone="danger" onClick={() => act(link._id, 'block')} />
      )}
      {link.applicationId ? (
        <Link
          to={`/members/applications/${link.applicationId}`}
          aria-label="Open application"
          title="Open application"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink lg:h-9 lg:w-9 lg:rounded-[10px]"
        >
          <FileText size={18} />
        </Link>
      ) : (
        <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setToDelete(link)} />
      )}
    </>
  )

  return (
    <div>
      <PageHeader
        title="Form Access"
        subtitle="Create a personal link and credential for each applicant, then block it once they have submitted."
        hideTitleOnMobile
        primaryAction={{ label: 'New access link', mobileLabel: 'New link', icon: Plus, onClick: () => setCreating(true) }}
      />

      <div className="mb-3 space-y-2 sm:mb-4 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
        <Tabs tabs={TYPE_TABS} value={filter.formType} onChange={value => setFilterKey('formType', value)} />
        <ChipGroup label="Status" options={STATUS_CHIPS} value={filter.status} onChange={value => setFilterKey('status', value)} />
      </div>

      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-medium text-slate-500">{loading ? 'Loading…' : `${total} link${total === 1 ? '' : 's'}`}</p>
        {filtering && (
          <button type="button" onClick={() => { setFilter({ formType: '', status: '' }); setPage(1) }} className="mobile-compact-control text-xs font-semibold text-royal-700 hover:underline">
            Reset
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={5} /> : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title={filtering ? 'No links match' : 'No access links yet'}
            message={filtering ? 'Try a different type or status.' : 'An applicant can only open the form through a link you create here.'}
            action={!filtering && <Button onClick={() => setCreating(true)}><Plus size={16} /> New access link</Button>}
          />
        ) : (
          <>
            {/* Phones and tablets: one card-row per link, actions on their own line */}
            <ul className="divide-y divide-line lg:hidden">
              {links.map(link => (
                <li key={link._id} className="px-4 pb-1.5 pt-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={link.applicantName || link.username} tone={TYPE_TONE[link.formType]} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{link.applicantName || 'Unnamed applicant'}</p>
                      <p className="mt-0.5 text-xs text-slate-500 [overflow-wrap:anywhere]">
                        {FORM_TYPE_LABEL[link.formType]} · <span className="font-mono text-slate-600">{link.username}</span>
                        {link.applicantMobile ? ` · ${link.applicantMobile}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={link.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 pl-[52px]">
                    <span className="text-xs text-slate-500">{expiryLabel(link.expiresAt)}</span>
                    <div className="-mr-2 flex items-center">{linkActions(link)}</div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr>
                      <Th>Applicant</Th>
                      <Th>Type</Th>
                      <Th>Username</Th>
                      <Th>Status</Th>
                      <Th>Expiry</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {links.map(link => (
                      <tr key={link._id} className="transition-colors hover:bg-mist/70">
                        <td className="px-4 py-2.5 pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={link.applicantName || link.username} tone={TYPE_TONE[link.formType]} size="sm" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{link.applicantName || '—'}</span>
                              {link.applicantMobile && <span className="block text-xs text-slate-500">{link.applicantMobile}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><TypeBadge type={link.formType} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{link.username}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={link.status} /></td>
                        <td className="px-4 py-2.5 text-slate-500">{expiryLabel(link.expiresAt)}</td>
                        <td className="px-4 py-2.5 pr-5">
                          <div className="flex items-center justify-end gap-0.5">{linkActions(link)}</div>
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

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New access link"
        subtitle="The applicant signs in with the credential shown after you create it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button form="access-link-form" type="submit" loading={busy}>
              {busy ? 'Creating…' : 'Create link'}
            </Button>
          </>
        }
      >
        <form id="access-link-form" onSubmit={create} className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">Application type <span className="text-rose-500">*</span></p>
            <Tabs
              fill
              tabs={[{ value: 'rukn', label: 'Rukn' }, { value: 'karkoon', label: 'Karkun' }]}
              value={form.formType}
              onChange={value => setForm({ ...form, formType: value })}
            />
          </div>

          {isSuperAdmin && (
            <LocationCascade
              locations={locations}
              levels={['district', 'area', 'unit']}
              value={form}
              onChange={next => setForm({ ...form, ...next })}
            />
          )}

          <Field label="Applicant name" hint="Only a label, so you can tell your links apart.">
            <Input value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} placeholder="Full name" />
          </Field>

          <Field label="Applicant mobile" hint="Used to WhatsApp them the final decision.">
            <Input type="tel" inputMode="tel" autoComplete="tel" value={form.applicantMobile} onChange={e => setForm({ ...form, applicantMobile: e.target.value })} placeholder="10-digit mobile number" />
          </Field>

          <div>
            <Field label="Valid for (days)">
              <Input
                type="number"
                min="1"
                max="90"
                value={form.expiryDays}
                onChange={e => setForm({ ...form, expiryDays: e.target.value })}
              />
            </Field>
            <div className="mt-2 flex gap-1.5">
              {EXPIRY_PRESETS.map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setForm({ ...form, expiryDays: days })}
                  className={`mobile-compact-control h-8 flex-1 rounded-lg text-xs font-semibold transition-colors ${
                    Number(form.expiryDays) === days ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(issued)}
        onClose={() => setIssued(null)}
        title="Link created"
        subtitle={issued ? `${FORM_TYPE_LABEL[issued.formType] || ''} application${issued.name ? ` for ${issued.name}` : ''}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => copy(shareText(issued))}>
              <Copy size={15} /> Copy all
            </Button>
            <Button onClick={() => setIssued(null)}>Done</Button>
          </>
        }
      >
        <Notice tone="warning" icon={AlertTriangle} className="mb-4">
          The password is shown only now. Copy or share it before closing — it cannot be recovered later.
        </Notice>

        {issued && (
          <>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {[
                { label: 'Link', value: fullUrl(issued.path) },
                { label: 'Username', value: issued.username },
                { label: 'Password', value: issued.password }
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 py-2 pl-3.5 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.label}</p>
                    <code className="block break-all text-[13px] font-medium text-ink">{row.value}</code>
                  </div>
                  <IconButton icon={Copy} label={`Copy ${row.label.toLowerCase()}`} tone="royal" onClick={() => copy(row.value)} />
                </div>
              ))}
            </div>

            <a
              href={whatsappUrl(issued)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(37,211,102,0.3)] transition-colors hover:bg-[#1ebe5b]"
            >
              <MessageCircle size={18} /> Share on WhatsApp
            </a>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this access link?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              {deleting ? 'Deleting…' : 'Delete link'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          The link and credential for <strong className="text-ink">{toDelete?.applicantName || toDelete?.username}</strong> will
          be removed permanently. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
