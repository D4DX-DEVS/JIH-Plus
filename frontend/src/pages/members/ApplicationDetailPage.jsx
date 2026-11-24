import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3, EyeOff, FileText,
  Image as ImageIcon, Lock, MapPin, Paperclip, Pause, Pencil, PencilLine, RotateCcw, Save, Send, Trash2, Undo2, X, XCircle
} from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import FieldRenderer from '../../components/reportRenderer/FieldRenderer'
import { fieldWidthClass } from '../../utils/fieldWidth'
import { isLayoutField } from '../../utils/formFieldTypes'
import {
  Avatar, Badge, Button, Card, ErrorState, Field, IconButton, Input, Modal, Notice, Select, Skeleton, StatusBadge, Textarea, ToggleRow, TypeBadge
} from '../../components/members/ui'
import { TYPE_TONE, cx, shortDate, timeAgo } from '../../utils/members/format'
import { originLabel } from '../../utils/members/constants'

// Comment attachments: what the server accepts, and the API's 10 MB body limit.
const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 7 * 1024 * 1024

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const fileSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

/** Attached files as tappable chips; `onRemove` adds a remove button to each. */
function AttachmentList({ items, onRemove, className = '' }) {
  if (!items?.length) return null
  return (
    <ul className={cx('flex flex-wrap gap-1.5', className)}>
      {items.map((item, i) => {
        const Icon = item.type === 'application/pdf' ? FileText : ImageIcon
        const body = (
          <>
            <Icon size={14} className="shrink-0 text-royal-600" />
            <span className="min-w-0 truncate">{item.name || 'Attachment'}</span>
            {item.size > 0 && <span className="shrink-0 text-slate-400">{fileSize(item.size)}</span>}
          </>
        )
        return (
          <li key={item.url || `${item.name}-${i}`} className="flex max-w-full items-center rounded-lg bg-[#fff] text-xs font-medium text-slate-700 ring-1 ring-inset ring-line">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="flex min-h-9 min-w-0 items-center gap-1.5 px-2.5 hover:text-royal-700">{body}</a>
            ) : (
              <span className="flex min-h-9 min-w-0 items-center gap-1.5 px-2.5">{body}</span>
            )}
            {onRemove && (
              <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${item.name || 'attachment'}`} className="mobile-compact-control -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600">
                <X size={14} />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const DECISION_ACTIONS = [
  { value: 'approved', label: 'Approve', icon: CheckCircle2, on: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500', iconOn: 'text-emerald-600' },
  { value: 'rejected', label: 'Reject', icon: XCircle, on: 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500', iconOn: 'text-rose-600' },
  { value: 'hold', label: 'Hold', icon: Pause, on: 'border-slate-500 bg-slate-100 text-slate-800 ring-1 ring-slate-500', iconOn: 'text-slate-600' }
]

// Simple answers read better as text than as greyed-out inputs. Tables,
// uploads and layout fields keep the shared renderer.
const TEXT_VIEW_TYPES = new Set([
  'text', 'number', 'phone', 'email', 'url', 'textarea', 'select', 'dropdown',
  'radio', 'yesno', 'date', 'time', 'datetime', 'checkbox', 'multiselect', 'accept', 'masterdata'
])

const HISTORY_LOOK = {
  approved: { label: 'Approved', icon: Check, tint: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', icon: X, tint: 'bg-rose-100 text-rose-700' },
  hold: { label: 'Put on hold', icon: Pause, tint: 'bg-slate-200 text-slate-700' },
  returned: { label: 'Sent back', icon: Undo2, tint: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', icon: Send, tint: 'bg-sky-100 text-sky-700' },
  forwarded: { label: 'Forwarded', icon: ArrowRight, tint: 'bg-royal-100 text-royal-700' },
  verified: { label: 'Verified', icon: Check, tint: 'bg-royal-100 text-royal-700' },
  marked: { label: 'Marked', icon: Check, tint: 'bg-royal-100 text-royal-700' },
  finalized: { label: 'Finalized', icon: CheckCircle2, tint: 'bg-emerald-100 text-emerald-700' },
  reopened: { label: 'Reopened for the applicant', icon: RotateCcw, tint: 'bg-amber-100 text-amber-700' },
  reopen_withdrawn: { label: 'Reopen withdrawn', icon: Undo2, tint: 'bg-slate-200 text-slate-700' },
  resubmitted: { label: 'Corrected by the applicant', icon: Send, tint: 'bg-sky-100 text-sky-700' },
  revision_requested: { label: 'Asked to revise', icon: Undo2, tint: 'bg-amber-100 text-amber-700' },
  revised: { label: 'Comment revised', icon: PencilLine, tint: 'bg-royal-100 text-royal-700' }
}

function displayValue(field, value) {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value)) return value.length ? value : null
  if (typeof value === 'object') return null
  if (field.type === 'date' || field.type === 'datetime') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) {
      return field.type === 'date'
        ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }
  return String(value)
}

/**
 * Read view of a checkbox / multi-select answer: every option with a ticked or
 * empty box, as the applicant saw it. Picked values no longer in the options
 * (an option renamed after submitting) are still listed, ticked.
 */
function OptionTicks({ field, value }) {
  const picked = Array.isArray(value) ? value : (value ? [value] : [])
  const options = field.options || []
  const items = [...options, ...picked.filter(v => !options.includes(v))]
  if (items.length === 0) return <span className="text-slate-300">—</span>
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-4 gap-y-1.5 pt-1">
      {items.map(opt => {
        const on = picked.includes(opt)
        return (
          <li key={opt} className="flex items-start gap-2">
            <span
              className={cx(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]',
                on ? 'bg-royal-600 text-white' : 'border border-slate-300 bg-[#fff]'
              )}
              aria-hidden="true"
            >
              {on && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={on ? 'font-medium text-ink' : 'text-slate-500'}>
              {opt}
              <span className="sr-only">{on ? ' (selected)' : ' (not selected)'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Read view of one answer: small label over the value. */
function AnswerView({ field, value }) {
  if (field.type === 'checkbox' || field.type === 'multiselect') {
    return (
      <div className={cx(fieldWidthClass(field), 'min-w-0')}>
        <dt className="text-xs font-medium leading-snug text-slate-500">{field.label}</dt>
        <dd className="mt-0.5 text-sm leading-relaxed [overflow-wrap:anywhere]">
          <OptionTicks field={field} value={value} />
        </dd>
      </div>
    )
  }
  const shown = displayValue(field, value)
  return (
    <div className={cx(fieldWidthClass(field), 'min-w-0')}>
      <dt className="text-xs font-medium leading-snug text-slate-500">{field.label}</dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
        {shown === null ? (
          <span className="text-slate-300">—</span>
        ) : Array.isArray(shown) ? (
          <span className="flex flex-wrap gap-1 pt-0.5">
            {shown.map(item => (
              <span key={item} className="rounded-md bg-royal-50 px-2 py-0.5 text-xs font-medium text-royal-800">{item}</span>
            ))}
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{shown}</span>
        )}
      </dd>
    </div>
  )
}

/** Horizontal workflow stepper; scrolls the current stage into view on phones. */
function StageStepper({ stages, currentKey, history }) {
  const scrollerRef = useRef(null)
  const ordered = useMemo(() => [...(stages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [stages])
  const current = ordered.find(s => s.key === currentKey)
  const visited = new Set((history || []).map(h => h.stageKey))

  useEffect(() => {
    const el = scrollerRef.current?.querySelector('[data-current]')
    if (!el || !scrollerRef.current) return
    const box = scrollerRef.current
    box.scrollLeft = Math.max(0, el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2)
  }, [currentKey])

  if (ordered.length === 0) return null
  return (
    <div ref={scrollerRef} className="mbr-scroll-x -mx-4 px-4 py-1 sm:-mx-5 sm:px-5">
      <ol className="flex min-w-full items-start">
        {ordered.map((stage, i) => {
          const isCurrent = stage.key === currentKey
          const done = current ? (stage.order ?? 0) < (current.order ?? 0) : visited.has(stage.key)
          return (
            <li key={stage.key} className="relative flex w-[86px] shrink-0 grow flex-col items-center text-center" data-current={isCurrent || undefined}>
              {i > 0 && (
                <span className={cx('absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2', done || isCurrent ? 'bg-royal-500' : 'bg-slate-200')} style={{ marginRight: 14 }} aria-hidden="true" />
              )}
              <span
                className={cx(
                  'relative z-[1] flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                  done && 'bg-royal-600 text-white',
                  isCurrent && 'bg-[#fff] text-royal-700 ring-2 ring-royal-500 ring-offset-2 ring-offset-mist',
                  !done && !isCurrent && 'bg-[#fff] text-slate-400 ring-1 ring-slate-300'
                )}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cx('mt-1.5 px-1 text-xs leading-tight', isCurrent ? 'font-semibold text-royal-800' : done ? 'text-slate-600' : 'text-slate-400')}>
                {stage.name}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading application">
      <Skeleton className="h-48 rounded-[1.125rem]" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-72 rounded-[1.125rem]" />
    </div>
  )
}

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Values the current reviewer is entering, kept apart from what is already saved.
  const [roleDraft, setRoleDraft] = useState({})
  const [captured, setCaptured] = useState({})
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  // { name, type, size, url } already stored, or { name, type, size, file } picked now.
  const [attachments, setAttachments] = useState([])
  const [useSkip, setUseSkip] = useState(false)
  const [decision, setDecision] = useState('approved')
  const [revisionTarget, setRevisionTarget] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [newMemberId, setNewMemberId] = useState('')
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [formDraft, setFormDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionInView, setActionInView] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/applications/${id}`)
      .then(({ data: payload }) => {
        setData(payload)
        setRoleDraft(payload.application.roleData || {})
        setFormDraft(payload.application.formData || {})
        setCaptured({})
        // Asked to revise: start from what this reviewer wrote last time.
        const previous = payload.permissions?.myComment
        setComment(previous?.text || '')
        setAttachments(previous?.attachments || [])
        setCommentError('')
        setUseSkip(false)
        setDecision('approved')
        setRevisionTarget('')
        setRevisionReason('')
        setReopenReason('')
        setNewMemberId('')
        setError('')
      })
      .catch(err => setError(apiError(err, 'Failed to load the application')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  const stage = data?.permissions?.stage
  const myTurn = Boolean(data?.permissions?.myTurn)
  // Owning the stage is not enough while the applicant is correcting the form.
  const canAct = Boolean(data?.permissions?.canAct)
  const canSkip = Boolean(data?.permissions?.canSkip)
  const revision = data?.permissions?.revision || null
  const revisionTargets = data?.permissions?.revisionTargets || []

  // Hide the phone "go to review" bar while the review panel itself is on screen.
  useEffect(() => {
    if (!canAct) return undefined
    const target = document.getElementById('your-action')
    if (!target || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setActionInView(entry.isIntersecting),
      { root: document.querySelector('[data-app-scroll]'), threshold: 0.05 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [canAct, data])

  const stageName = useCallback((key) => {
    const found = data?.workflow?.stages?.find(s => s.key === key)
    return found?.name || key
  }, [data])

  // Another role's comment fields that this actor may fill only by taking the
  // Rukn skip; they stay hidden until the skip box is ticked.
  const isSkipOnlyField = (field) => Boolean(
    canSkip && field.ownerRoleKey && !field.readOnly &&
    field.ownerRoleKey !== stage?.actorRoleKey &&
    (stage?.skipFillsRoleKeys || []).includes(field.ownerRoleKey)
  )

  // Reviewers land at the top of a long application; take them to their part.
  const jumpToMyPart = () => {
    const target = document.querySelector('[data-my-field]') || document.getElementById('your-action')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // History stores captured values by key; show the stage's own field label.
  const captureLabel = (stageKey, key) => {
    const found = data?.workflow?.stages?.find(s => s.key === stageKey)
    return found?.captureFields?.find(f => f.key === key)?.label || key
  }

  // The workflow's own name for the ID (Rukn ID / Karkun ID).
  const idLabel = useMemo(() => (data?.workflow?.stages || [])
    .flatMap(s => s.captureFields || [])
    .find(f => f.key === 'memberId')?.label || 'Member ID', [data])

  const nextStageLabel = useMemo(() => {
    if (!stage) return ''
    if (useSkip && stage.skipToStageKey) return stageName(stage.skipToStageKey)
    return stage.nextStageKey ? stageName(stage.nextStageKey) : 'Complete'
  }, [stage, useSkip, stageName])

  const addFiles = (fileList) => {
    const picked = [...(fileList || [])]
    if (fileInputRef.current) fileInputRef.current.value = ''
    const next = [...attachments]
    for (const file of picked) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`At most ${MAX_ATTACHMENTS} files can be attached`)
        break
      }
      if (!ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not an image or PDF`)
        continue
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`"${file.name}" is larger than 5 MB`)
        continue
      }
      const newBytes = next.filter(a => a.file).reduce((sum, a) => sum + a.size, 0)
      if (newBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        toast.error('New files together must be under 7 MB')
        continue
      }
      next.push({ name: file.name, type: file.type, size: file.size, file })
    }
    setAttachments(next)
  }

  const submitStage = async (action) => {
    // Every admin action needs a comment.
    if (!comment.trim()) {
      setCommentError('Add your comment before you continue')
      document.getElementById('review-comment')?.focus()
      return
    }
    setBusy(true)
    try {
      // Send only the comment fields this reviewer may write; earlier roles'
      // answers are loaded for display and would otherwise come back "ignored".
      const editableKeys = new Set(data.template.pages.flatMap(p =>
        p.fields.filter(f => f.ownerRoleKey && !f.readOnly && (useSkip || !isSkipOnlyField(f))).map(f => `field_${f.id}`)))
      const roleData = Object.fromEntries(Object.entries(roleDraft).filter(([key]) => editableKeys.has(key)))
      const files = await Promise.all(attachments.map(async a => (
        a.file ? { name: a.name, data: await readAsDataUrl(a.file) } : { url: a.url }
      )))
      const body = { action, comment, attachments: files, roleData, captured, useSkip }
      const { data: result } = await api.put(`/applications/${id}/stage`, body)
      if (result.ignoredFields?.length) {
        toast('Some fields were not yours to edit and were ignored.', { icon: 'ℹ️' })
      }
      toast.success('Application updated')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not update the application'))
    } finally {
      setBusy(false)
    }
  }

  // For an application approved without reaching the ID stage.
  const assignMemberId = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.put(`/applications/${id}/member-id`, { memberId: newMemberId })
      toast.success(`${idLabel} assigned`)
      load()
    } catch (err) {
      toast.error(apiError(err, `Could not assign the ${idLabel}`))
    } finally {
      setBusy(false)
    }
  }

  // Ask an earlier admin to rewrite their comment; it comes straight back here.
  const requestRevision = async () => {
    setBusy(true)
    try {
      await api.put(`/applications/${id}/request-revision`, { targetStageKey: revisionTarget, reason: revisionReason })
      toast.success(`Sent to ${stageName(revisionTarget)} for a revised comment`)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not request the revision'))
    } finally {
      setBusy(false)
    }
  }

  // Hand the form back to the applicant to correct through their own link.
  const reopenForApplicant = async () => {
    setBusy(true)
    try {
      await api.put(`/applications/${id}/reopen`, { reason: reopenReason })
      toast.success('Reopened. The applicant can sign in with the same link and credentials.')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not reopen the form'))
    } finally {
      setBusy(false)
    }
  }

  const withdrawReopen = async () => {
    setBusy(true)
    try {
      await api.delete(`/applications/${id}/reopen`)
      toast.success('Reopen withdrawn')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not withdraw the reopen'))
    } finally {
      setBusy(false)
    }
  }

  const saveFormData = async () => {
    setBusy(true)
    try {
      await api.put(`/applications/${id}/form-data`, { formData: formDraft })
      toast.success('Applicant answers updated')
      setEditing(false)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not save the changes'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api.delete(`/applications/${id}`)
      toast.success('Application deleted')
      navigate('/members/applications', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the application'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !data) return <DetailSkeleton />
  if (error) return <Card><ErrorState message={error} onRetry={load} /></Card>
  if (!data) return null

  const { application, template } = data
  const scopeLine = [application.scope?.unit, application.scope?.area, application.scope?.district].filter(Boolean).join(' · ')
  const facts = [
    { label: 'Submitted', value: shortDate(application.submittedAt) },
    { label: 'Current stage', value: stage ? stage.name : application.status === 'rejected' ? 'Closed' : 'Completed' },
    { label: idLabel, value: application.memberId || '—' },
    { label: 'Last update', value: timeAgo(application.updatedAt || application.submittedAt) || '—' }
  ]
  const correction = application.correction?.open ? application.correction : null
  const origin = originLabel(application.origin)
  const primaryAction = revision
    ? { label: busy ? 'Saving…' : `Resubmit to ${stageName(revision.fromStageKey)}`, variant: 'primary', run: () => submitStage('forwarded') }
    : stage?.kind === 'decision'
    ? { label: busy ? 'Saving…' : 'Record decision', variant: decision === 'approved' ? 'success' : decision === 'rejected' ? 'danger' : 'primary', run: () => submitStage(decision) }
    : {
        label: busy ? 'Saving…' : stage?.isTerminal ? 'Complete' : `${stage?.kind === 'verify' ? 'Verify' : 'Save'} & send to ${nextStageLabel}`,
        variant: 'primary',
        run: () => submitStage(stage?.kind === 'marker' ? 'marked' : stage?.kind === 'finalize' ? 'finalized' : 'forwarded')
      }

  return (
    <div className="pb-2">
      <Link to="/members/applications" className="mb-3 hidden items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink lg:inline-flex">
        <ArrowLeft size={16} /> Applications
      </Link>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <Card className="mb-3 overflow-hidden sm:mb-4">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar name={application.applicantName} tone={TYPE_TONE[application.formType]} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={application.formType} />
                <StatusBadge status={application.status} />
                {origin && <Badge tone="slate"><MapPin size={11} /> {origin}</Badge>}
              </div>
              <h1 className="mt-1.5 text-lg font-bold leading-snug tracking-tight text-ink [overflow-wrap:anywhere] sm:text-2xl">
                {application.applicantName || 'Unnamed applicant'}
              </h1>
              {scopeLine && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{scopeLine}</p>}
            </div>
            {isSuperAdmin && (
              <IconButton icon={Trash2} label="Delete application" tone="danger" onClick={() => setConfirmDelete(true)} className="-mr-2 -mt-1" />
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {facts.map(fact => (
              <div key={fact.label} className="rounded-xl bg-mist px-3 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{fact.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {(data.workflow?.stages || []).length > 0 && (
          <div className="border-t border-line bg-mist/60 px-4 py-3.5 sm:px-5">
            <StageStepper stages={data.workflow.stages} currentKey={application.currentStageKey} history={application.stageHistory} />
          </div>
        )}
      </Card>

      {correction && (
        <Notice tone="warning" icon={RotateCcw} title="Reopened for the applicant to correct" className="mb-3 sm:mb-4">
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{correction.reason}</p>
          <p className="mt-1 text-xs opacity-80">
            {correction.requestedByName}{correction.requestedAt && ` · ${timeAgo(correction.requestedAt)}`} · It comes back to {stage?.name || 'this stage'} when they resubmit.
          </p>
          {data.permissions?.canWithdrawReopen && (
            <Button variant="secondary" size="sm" className="mt-2.5" onClick={withdrawReopen} loading={busy}>
              <Undo2 size={14} /> Withdraw reopen
            </Button>
          )}
        </Notice>
      )}

      {stage && !correction && (
        myTurn ? (
          <Notice tone="info" icon={ClipboardCheck} className="mb-3 sm:mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <b className="font-semibold">Your turn.</b>{' '}
                {revision
                  ? <>{revision.fromName} asked you to revise your comment at <b className="font-semibold">{stage.name}</b>.</>
                  : <>This application is at <b className="font-semibold">{stage.name}</b>.</>}
              </span>
              <button type="button" onClick={jumpToMyPart} className="hidden items-center gap-1 font-semibold text-royal-700 hover:underline lg:inline-flex">
                Go to my review <ArrowDown size={14} />
              </button>
            </div>
          </Notice>
        ) : (
          <Notice tone="warning" icon={Clock3} className="mb-3 sm:mb-4">
            Waiting at <b className="font-semibold">{stage.name}</b> for another role.
          </Notice>
        )
      )}
      {!stage && (
        <Card className="mb-3 p-4 sm:mb-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', application.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>
              {application.status === 'rejected' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">This application has completed its workflow.</p>
              <p className="mt-0.5 text-xs text-slate-500">No further review is needed.</p>
            </div>
          </div>
          {isSuperAdmin && application.status === 'approved' && !application.memberId && (
            <form onSubmit={assignMemberId} className="mt-4 border-t border-line pt-4">
              <p className="mb-3 text-sm text-slate-600">It was approved without a {idLabel}. Assign it here.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="sm:flex-1">
                  <Field label={idLabel} required>
                    <Input value={newMemberId} onChange={e => setNewMemberId(e.target.value)} required />
                  </Field>
                </div>
                <Button type="submit" loading={busy}>{busy ? 'Saving…' : `Assign ${idLabel}`}</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
        {/* ── Form content ───────────────────────────────────────────── */}
        <div className="mbr-form min-w-0 space-y-3 sm:space-y-4">
          {template.pages.map((page, index) => {
            const editable = page.hasEditableFields
            const fields = page.fields.filter(f => useSkip || !isSkipOnlyField(f))
            if (!fields.length) return null
            const isRolePage = page.audience === 'role'
            return (
              <Card key={page.id} as="section" className="overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-xs font-bold text-royal-700">{index + 1}</span>
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{page.title || 'Section'}</h2>
                      {page.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{page.description}</p>}
                    </div>
                  </div>
                  {isRolePage && !editable && (
                    <Badge tone="slate" className="mt-0.5 shrink-0"><Lock size={11} /> Read only</Badge>
                  )}
                  {isRolePage && editable && (
                    <Badge tone="royal" className="mt-0.5 shrink-0">Your input</Badge>
                  )}
                  {!isRolePage && canAct && !editing && (
                    <Button variant="soft" size="sm" onClick={() => setEditing(true)} className="-my-1 shrink-0">
                      <Pencil size={13} /> Edit
                    </Button>
                  )}
                </div>

                <dl className="grid grid-cols-12 gap-x-4 gap-y-3.5 px-4 py-4 sm:px-5">
                  {fields.map(field => {
                    const key = `field_${field.id}`
                    const controlId = `application-${key}`
                    const isRoleField = Boolean(field.ownerRoleKey)
                    // Uploads can't be replaced from here: the edit endpoint stores
                    // JSON only, so a newly picked file would overwrite the photo.
                    const readOnly = field.readOnly || (!isRoleField && !editing) || field.type === 'file'
                    const value = isRoleField
                      ? roleDraft[key]
                      : (editing ? formDraft[key] : application.formData?.[key])

                    const onChange = (val) => {
                      if (isRoleField) setRoleDraft(prev => ({ ...prev, [key]: val }))
                      else setFormDraft(prev => ({ ...prev, [key]: val }))
                    }

                    if (readOnly && TEXT_VIEW_TYPES.has(field.type)) {
                      return <AnswerView key={field.id} field={field} value={value} />
                    }

                    return (
                      <div key={field.id} className={`${fieldWidthClass(field)} min-w-0 scroll-mt-4`} data-my-field={isRoleField && !readOnly ? true : undefined}>
                        {!isLayoutField(field) && field.type !== 'accept' && (
                          <label id={`${controlId}-label`} htmlFor={controlId} className={cx('mb-1 block', readOnly ? 'text-xs font-medium text-slate-500' : 'text-[13px] font-semibold text-slate-700')}>
                            {field.label}
                            {field.required && !readOnly && <span className="text-rose-500"> *</span>}
                          </label>
                        )}
                        <FieldRenderer
                          field={field}
                          value={value ?? ''}
                          onChange={onChange}
                          disabled={readOnly}
                          controlId={controlId}
                          labelledBy={`${controlId}-label`}
                        />
                        {field.helpText && !['title', 'subtitle'].includes(field.type) && !readOnly && (
                          <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>
                        )}
                      </div>
                    )
                  })}
                </dl>
              </Card>
            )
          })}

          {editing && (
            <div className="mbr-sticky-action">
              <div className="mbr-card flex items-center justify-between gap-2 p-2.5 shadow-[0_8px_28px_rgba(11,20,48,0.16)]">
                <p className="hidden pl-2 text-sm font-medium text-slate-600 sm:block">Editing the applicant's answers</p>
                <div className="flex flex-1 gap-2 sm:flex-none">
                  <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => { setEditing(false); setFormDraft(application.formData || {}) }}>
                    <X size={15} /> Cancel
                  </Button>
                  <Button className="flex-1 sm:flex-none" onClick={saveFormData} loading={busy}>
                    {!busy && <Save size={15} />} Save answers
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="mt-3 space-y-3 sm:mt-4 sm:space-y-4 lg:sticky lg:top-0 lg:mt-0 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:pb-2">
          {/* ── Reviewer action ──────────────────────────────────────── */}
          {canAct && stage && (
            <Card id="your-action" className="scroll-mt-4 overflow-hidden border-royal-200 shadow-[0_8px_28px_rgba(42,75,214,0.1)]">
              <div className="flex items-center gap-3 border-b border-royal-100 bg-royal-50/70 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-royal-600 text-white">
                  <ClipboardCheck size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-ink">{revision ? 'Revise your comment' : 'Your review'}</h2>
                  <p className="text-xs text-royal-800/70">{stage.name}</p>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {revision && (
                  <Notice tone="warning" icon={Undo2} title={`${revision.fromName} asked for a revised comment`}>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{revision.reason}</p>
                    <p className="mt-1 text-xs opacity-80">
                      {stageName(revision.fromStageKey)}{revision.at && ` · ${timeAgo(revision.at)}`}
                    </p>
                  </Notice>
                )}

                {(stage.captureFields || []).length > 0 && (
                  <div className="grid gap-3">
                    {stage.captureFields.map(cf => (
                      <Field key={cf.key} label={cf.label} required={cf.required}>
                        {cf.type === 'yesno' ? (
                          <Select
                            value={captured[cf.key] ?? ''}
                            onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                          >
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </Select>
                        ) : cf.type === 'textarea' ? (
                          <Textarea
                            rows={3}
                            value={captured[cf.key] ?? ''}
                            onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                          />
                        ) : (
                          <Input
                            type={cf.type === 'date' ? 'date' : cf.type === 'number' ? 'number' : 'text'}
                            value={captured[cf.key] ?? ''}
                            onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                )}

                {stage.kind === 'decision' && !revision && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-slate-700">Decision</p>
                    <div role="radiogroup" aria-label="Decision" className="grid grid-cols-3 gap-2">
                      {DECISION_ACTIONS.map(d => {
                        const active = decision === d.value
                        const Icon = d.icon
                        return (
                          <button
                            key={d.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setDecision(d.value)}
                            className={cx(
                              'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border text-[13px] font-semibold transition-colors',
                              active ? d.on : 'border-line bg-[#fff] text-slate-600 hover:border-slate-300'
                            )}
                          >
                            <Icon size={20} className={active ? d.iconOn : 'text-slate-400'} />
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <Field label="Comment" required hint={commentError ? undefined : 'Required. You and the admins above you can read it.'}>
                    <Textarea
                      id="review-comment"
                      rows={3}
                      value={comment}
                      onChange={e => { setComment(e.target.value); if (commentError) setCommentError('') }}
                      placeholder={revision ? 'Rewrite your comment' : 'Your comment on this application'}
                      aria-invalid={Boolean(commentError)}
                      className={commentError ? '!border-rose-400' : ''}
                    />
                  </Field>
                  {commentError && <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">{commentError}</p>}

                  <AttachmentList
                    items={attachments}
                    onRemove={i => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="mt-2.5"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ATTACHMENT_TYPES.join(',')}
                    className="hidden"
                    onChange={e => addFiles(e.target.files)}
                  />
                  {attachments.length < MAX_ATTACHMENTS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-[13px] font-semibold text-royal-700 hover:underline lg:min-h-9"
                    >
                      <Paperclip size={15} /> Attach files
                      <span className="font-normal text-slate-400">· images or PDF, 5 MB each</span>
                    </button>
                  )}
                </div>

                {canSkip && (
                  <ToggleRow
                    checked={useSkip}
                    onChange={setUseSkip}
                    label="I am a Rukn"
                    description={`Fill the ${(stage.skipFillsRoleKeys || []).join(', ')} comments myself and send straight to ${stageName(stage.skipToStageKey)}.`}
                  />
                )}

                <Button size="lg" variant={primaryAction.variant} className="w-full whitespace-normal text-center" onClick={primaryAction.run} loading={busy}>
                  {primaryAction.label}
                </Button>

                {revisionTargets.length > 0 && (
                  <details className="group rounded-xl border border-line">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-[13px] font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2"><Undo2 size={15} /> Ask an earlier admin to revise</span>
                      <ArrowDown size={14} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-2.5 border-t border-line p-3">
                      <Select value={revisionTarget} onChange={e => setRevisionTarget(e.target.value)} aria-label="Admin to ask">
                        <option value="">Choose whose comment…</option>
                        {revisionTargets.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                      </Select>
                      <Textarea
                        rows={2}
                        value={revisionReason}
                        onChange={e => setRevisionReason(e.target.value)}
                        placeholder="What needs to change (required)"
                        aria-label="What needs to change"
                      />
                      <p className="text-xs leading-relaxed text-slate-500">It goes to them with their earlier comment, and comes straight back to you when they resubmit.</p>
                      <Button variant="secondary" className="w-full" disabled={!revisionTarget || !revisionReason.trim() || busy} onClick={requestRevision}>
                        Ask to revise
                      </Button>
                    </div>
                  </details>
                )}

                {data.permissions?.canReopen && (
                  <details className="group rounded-xl border border-line">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-[13px] font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2"><RotateCcw size={15} /> Reopen the form for the applicant</span>
                      <ArrowDown size={14} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-2.5 border-t border-line p-3">
                      <Textarea
                        rows={2}
                        value={reopenReason}
                        onChange={e => setReopenReason(e.target.value)}
                        placeholder="What the applicant should correct (required)"
                        aria-label="What the applicant should correct"
                      />
                      <p className="text-xs leading-relaxed text-slate-500">
                        They sign in with the same link, username and password, find their answers filled in, and resubmit. It then comes back to you.
                      </p>
                      <Button variant="secondary" className="w-full" disabled={!reopenReason.trim() || busy} onClick={reopenForApplicant}>
                        Reopen for correction
                      </Button>
                    </div>
                  </details>
                )}
              </div>
            </Card>
          )}

          {/* ── Trail ────────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between px-4 pt-4 pb-1 sm:px-5">
              <h2 className="text-[15px] font-semibold text-ink">History</h2>
              <span className="text-xs text-slate-400">{(application.stageHistory || []).length} event{(application.stageHistory || []).length === 1 ? '' : 's'}</span>
            </div>
            <div className="px-4 pb-4 pt-3 sm:px-5">
              {(application.stageHistory || []).length === 0 ? (
                <p className="rounded-xl bg-mist px-3.5 py-4 text-center text-sm text-slate-500">Nothing recorded yet.</p>
              ) : (
                <ol>
                  {application.stageHistory.map((entry, i) => {
                    const look = HISTORY_LOOK[entry.action] || { label: String(entry.action || 'Updated'), icon: ArrowRight, tint: 'bg-slate-100 text-slate-600' }
                    const Icon = look.icon
                    const last = i === application.stageHistory.length - 1
                    return (
                      <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-line" aria-hidden="true" />}
                        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', look.tint)}>
                          <Icon size={15} strokeWidth={2.4} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-snug text-ink">
                            <span className="font-semibold">{look.label}</span>
                            <span className="text-slate-500">
                              {' · '}
                              {entry.action === 'revision_requested'
                                ? stageName(entry.toStageKey)
                                : entry.stageName || stageName(entry.stageKey)}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {entry.actorName || 'System'}
                            {entry.at && <span title={new Date(entry.at).toLocaleString()}> · {timeAgo(entry.at)}</span>}
                          </p>
                          {entry.comment && (
                            <p className="mt-2 whitespace-pre-wrap rounded-xl rounded-tl-sm bg-mist px-3 py-2 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{entry.comment}</p>
                          )}
                          <AttachmentList items={entry.attachments} className="mt-1.5" />
                          {entry.commentHidden && (
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <EyeOff size={13} /> Comment visible to higher admins only
                            </p>
                          )}
                          {entry.data && Object.keys(entry.data).length > 0 && (
                            <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                              {Object.entries(entry.data).map(([k, v]) => (
                                <li key={k}><span className="text-slate-400">{captureLabel(entry.stageKey, k)}:</span> {String(v)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Phones: keep the way to the review one tap away while reading. */}
      {canAct && stage && !editing && !actionInView && (
        <div className="mbr-sticky-action mt-3 lg:hidden">
          <div className="flex items-center gap-3 rounded-2xl bg-ink px-3 py-2.5 pl-4 text-white shadow-[0_10px_30px_rgba(11,20,48,0.3)]">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Your review is needed</p>
              <p className="truncate text-xs text-white/60">{stage.name}</p>
            </div>
            <button
              type="button"
              onClick={jumpToMyPart}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-royal-500 px-3.5 text-sm font-semibold text-white active:bg-royal-600"
            >
              Review <ArrowDown size={15} />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this application?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          This removes the application and its history. The access link it came from will be
          blocked rather than reopened. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
