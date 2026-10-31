import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Pencil,
  Phone,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
} from 'lucide-react'
import { api } from '../../utils/ihthisabi/api'
import { useError } from '../../contexts/ErrorContext'
import { downloadUnitReplyPDF } from '../../utils/unitReplyPdfGenerator'
import letterheadImage from '../../assets/LH.png'
import ConfirmationModal from './ConfirmationModal'
import ReplyTemplateBuilder from './ReplyTemplateBuilder'
import { QUARTER_LABELS, newId, periodLabel, renderReply } from '../../utils/ihthisabi/replyTemplateEngine'

// Units report for the quarter that just ended, so open on that one.
const defaultPeriod = () => {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return q === 1 ? { year: now.getFullYear() - 1, quarter: 4 } : { year: now.getFullYear(), quarter: q - 1 }
}

// Unsaved template edits are kept per quarter in this browser, so switching
// quarter or leaving the page never loses them.
const draftKey = (year, quarter) => `ihReplyTemplateDraft:${year}-${quarter}`
const readDraft = (year, quarter) => {
  try {
    const raw = localStorage.getItem(draftKey(year, quarter))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const writeDraft = (year, quarter, sections) => {
  try {
    localStorage.setItem(draftKey(year, quarter), JSON.stringify(sections))
  } catch {
    /* drafts are a convenience only */
  }
}
const clearDraft = (year, quarter) => {
  try {
    localStorage.removeItem(draftKey(year, quarter))
  } catch {
    /* drafts are a convenience only */
  }
}

// Order-insensitive comparison that ignores empty fields, so a template that
// round-trips through the server does not look edited.
const canonical = (value) =>
  JSON.stringify(value, (key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, x]) => x !== undefined && x !== null && x !== '')
            .sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  )

const withIds = (sections) => (sections || []).map((s) => (s.id ? s : { ...s, id: newId() }))

const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CHIPS = {
  form: { label: 'Submitted', className: 'bg-[#e3f4ea] text-[#1e8a4c]' },
  alternative: { label: 'Aged / Patient', className: 'bg-[#fdf1dc] text-[#a06a12]' },
  pending: { label: 'Not submitted', className: 'bg-[#fbe6ee] text-[#b8244f]' },
}

function SendReplies({ year, quarter, template, templateLoading, templateDirty, onOpenTemplate, onUnitChange }) {
  const { showError } = useError()
  const periodName = periodLabel(year, quarter)

  const [districts, setDistricts] = useState([])
  const [areas, setAreas] = useState([])
  const [units, setUnits] = useState([])
  const [district, setDistrict] = useState('')
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState('')
  const [areasLoading, setAreasLoading] = useState(false)
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [replied, setReplied] = useState({})

  const [data, setData] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [customText, setCustomText] = useState(null)
  const [editing, setEditing] = useState(false)
  const [showSent, setShowSent] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    api
      .get('/ihthisabi/admin/unitadmins/districts')
      .then((r) => setDistricts(r.data.data.districts || []))
      .catch(() => toast.error('Could not load districts'))
  }, [])

  const pickDistrict = async (value) => {
    setDistrict(value)
    setArea('')
    setUnit('')
    setAreas([])
    setUnits([])
    if (!value) return
    setAreasLoading(true)
    try {
      const r = await api.get('/ihthisabi/admin/unitadmins/areas', { params: { district: value } })
      setAreas(r.data.data.areas || [])
    } catch {
      toast.error('Could not load areas')
    } finally {
      setAreasLoading(false)
    }
  }

  const pickArea = async (value) => {
    setArea(value)
    setUnit('')
    setUnits([])
    if (!value) return
    setUnitsLoading(true)
    try {
      const r = await api.get('/ihthisabi/admin/unitadmins/units', { params: { district, area: value } })
      setUnits(r.data.data.units || [])
    } catch {
      toast.error('Could not load units')
    } finally {
      setUnitsLoading(false)
    }
  }

  // Which units of this area already have a reply for the quarter
  useEffect(() => {
    if (!district || !area) {
      setReplied({})
      return
    }
    api
      .get('/ihthisabi/admin/unit-reply-status', { params: { year, quarter, district, area } })
      .then((r) => setReplied(r.data.data.replied || {}))
      .catch(() => setReplied({}))
  }, [district, area, year, quarter])

  const loadData = useCallback(async () => {
    if (!unit) {
      setData(null)
      return
    }
    const request = ++requestRef.current
    setDataLoading(true)
    try {
      const r = await api.get('/ihthisabi/admin/unit-reply-data', { params: { unit, year, quarter } })
      if (request === requestRef.current) setData(r.data.data)
    } catch (error) {
      if (request === requestRef.current) {
        setData(null)
        toast.error(error.response?.data?.message || 'Could not load this unit')
      }
    } finally {
      if (request === requestRef.current) setDataLoading(false)
    }
  }, [unit, year, quarter])

  useEffect(() => {
    setCustomText(null)
    setEditing(false)
    setShowSent(false)
    setJustSent(false)
    loadData()
  }, [loadData])

  useEffect(() => {
    onUnitChange(unit)
  }, [unit, onUnitChange])

  const generated = useMemo(() => (data && template ? renderReply(template, data) : ''), [data, template])
  const message = customText ?? generated
  const edited = customText !== null && customText !== generated
  const repliedCount = units.filter((u) => replied[u]).length
  const nextUnit = useMemo(() => {
    const after = units.slice(units.indexOf(unit) + 1)
    return after.find((u) => !replied[u]) || after[0] || null
  }, [units, unit, replied])

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('Reply copied')
    } catch {
      toast.error('Could not copy. Select the text and copy it instead.')
    }
  }

  const downloadPdf = async () => {
    try {
      setPdfGenerating(true)
      await downloadUnitReplyPDF(message, unit, year, quarter)
      toast.success('PDF downloaded')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  const send = async () => {
    try {
      setSending(true)
      const r = await api.post('/ihthisabi/admin/unit-reply', { unit, year, quarter, formattedMessage: message })
      const whatsappSent = !!r.data.data?.whatsappSent
      const now = new Date().toISOString()
      if (whatsappSent) {
        toast.success(`Reply sent to ${unit} on WhatsApp`)
      } else {
        toast.success('Reply saved')
        showError({ type: 'whatsapp_failed' })
      }
      setReplied((prev) => ({ ...prev, [unit]: { repliedAt: now, whatsappSent } }))
      setData((prev) =>
        prev ? { ...prev, existingReply: { repliedAt: now, repliedBy: null, whatsappSent, formattedMessage: message.trim() } } : prev,
      )
      setJustSent(true)
      setEditing(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply')
    } finally {
      setSending(false)
      setConfirmOpen(false)
    }
  }

  const existing = data?.existingReply
  const contact = data?.unitAdmin?.contactNo
  const confirmMessage = [
    `This saves the ${periodName} reply for ${unit}`,
    contact ? ` and sends it on WhatsApp to ${data?.unitAdmin?.name} (${contact}).` : '. The unit admin has no WhatsApp number, so they will only see it in their portal.',
    existing ? `\n\nIt replaces the reply sent on ${formatDate(existing.repliedAt)}.` : '',
    edited ? '\n\nYou edited this reply by hand. Your edits are what will be sent.' : '',
  ].join('')

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="ih-surface p-3 sm:p-5">
        <h3 className="mb-3 hidden text-base font-semibold text-gray-900 lg:block">Choose a unit</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">District</label>
            <select value={district} onChange={(e) => pickDistrict(e.target.value)} className="form-select truncate text-base sm:text-sm">
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Area</label>
            <select
              value={area}
              onChange={(e) => pickArea(e.target.value)}
              disabled={!district || areasLoading}
              className="form-select truncate text-base sm:text-sm"
            >
              <option value="">{areasLoading ? 'Loading…' : district ? 'Select area' : 'Select district first'}</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={!area || unitsLoading}
              className="form-select truncate text-base sm:text-sm"
            >
              <option value="">{unitsLoading ? 'Loading…' : area ? 'Select unit' : 'Select area first'}</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {replied[u] ? `✓ ${u} (replied)` : u}
                </option>
              ))}
            </select>
          </div>
        </div>
        {area && units.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Replied to <strong className="text-gray-900">{repliedCount}</strong> of {units.length} units in {area} for {periodName}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(repliedCount / units.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {!templateLoading && !template && (
        <div className="ih-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fdf1dc] text-[#a06a12]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">No reply template for {periodName} yet</p>
              <p className="text-xs text-gray-500">Set it up once and every unit&apos;s reply is written for you from its members&apos; answers.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenTemplate} className="btn-primary shrink-0 gap-1.5">
            <Settings className="h-4 w-4" /> Set up template
          </button>
        </div>
      )}
      {template && templateDirty && (
        <p className="flex items-start gap-2 rounded-xl bg-[#fdf1dc] px-3 py-2 text-xs text-[#a06a12]">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>
            The template has unsaved changes. Replies use the last saved version.{' '}
            <button type="button" onClick={onOpenTemplate} className="font-semibold underline">
              Open template
            </button>
          </span>
        </p>
      )}

      {unit && dataLoading && !data && (
        <div className="ih-surface space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-gray-100" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="ih-surface overflow-hidden">
            <div className="flex items-start justify-between gap-2 px-3 py-3 sm:px-5">
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-gray-900">{data.unit}</h4>
                <p className="text-xs text-gray-500">
                  {[data.district, data.area, periodName].filter(Boolean).join(' · ')}
                </p>
                {data.unitAdmin && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {data.unitAdmin.name}
                      {contact ? ` · ${contact}` : ' · no WhatsApp number'}
                    </span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={dataLoading}
                className="ih-action ih-action-neutral"
                aria-label="Reload this unit"
                title="Reload this unit"
              >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="grid grid-cols-4 border-t border-gray-100 text-center">
              {[
                { label: 'Members', value: data.counts.total, color: 'text-gray-900' },
                { label: 'Submitted', value: data.counts.form, color: 'text-[#1e8a4c]' },
                { label: 'Aged / Patient', value: data.counts.alternative, color: 'text-[#a06a12]' },
                { label: 'Not submitted', value: data.counts.pending, color: data.counts.pending ? 'text-[#b8244f]' : 'text-gray-900' },
              ].map((s, i) => (
                <div key={s.label} className={`px-1 py-2.5 ${i ? 'border-l border-gray-100' : ''}`}>
                  <p className={`text-[18px] font-semibold leading-tight ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] leading-tight text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            {existing && (
              <div className="border-t border-gray-100 bg-[#e4edfb] px-3 py-2.5 text-xs text-[#1d4fa8] sm:px-5">
                <p className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
                  <span>
                    Replied on {formatDate(existing.repliedAt)}
                    {existing.repliedBy ? ` by ${existing.repliedBy}` : ''}. WhatsApp {existing.whatsappSent ? 'delivered' : 'not delivered'}.
                    Sending again replaces that reply.{' '}
                    <button type="button" onClick={() => setShowSent((v) => !v)} className="font-semibold underline">
                      {showSent ? 'Hide sent reply' : 'View sent reply'}
                    </button>
                  </span>
                </p>
                {showSent && (
                  <div className="malayalam-text mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[13px] leading-relaxed text-gray-900">
                    {existing.formattedMessage}
                  </div>
                )}
              </div>
            )}
            <details className="group border-t border-gray-100">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-gray-800 sm:px-5">
                See every member ({data.counts.total})
                <span className="text-xs text-primary group-open:hidden">Show</span>
                <span className="hidden text-xs text-primary group-open:inline">Hide</span>
              </summary>
              <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto border-t border-gray-100">
                {data.members.map((m) => (
                  <li key={m.id} className="flex min-h-[44px] items-center justify-between gap-2 px-3 py-2 sm:px-5">
                    <span className="min-w-0 truncate text-sm text-gray-800">{m.name}</span>
                    <span className={`ih-chip ${STATUS_CHIPS[m.status].className}`}>
                      {m.status === 'alternative' && m.altType ? m.altType : STATUS_CHIPS[m.status].label}
                    </span>
                  </li>
                ))}
                {data.members.length === 0 && <li className="px-3 py-3 text-sm text-gray-500 sm:px-5">No active members found for this unit.</li>}
              </ul>
            </details>
          </div>

          {(template || customText !== null) && (
            <div className="ih-surface overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-5 sm:py-3">
                <div className="min-w-0">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base">
                    Reply
                    {edited && <span className="ih-chip bg-[#ede6fb] text-[#6a3bd8]">Edited by hand</span>}
                  </h4>
                  <p className="text-[11px] text-gray-500 sm:text-xs">
                    {template ? `Written from the ${periodName} template` : 'Written by hand'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {edited && template && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomText(null)
                        setEditing(false)
                      }}
                      className="ih-action ih-action-view"
                      aria-label="Undo my edits"
                      title="Undo my edits"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!editing && customText === null) setCustomText(generated)
                      setEditing((v) => !v)
                    }}
                    className={`ih-action ${editing ? 'ih-action-edit ring-2 ring-blue-300' : 'ih-action-edit'}`}
                    aria-label={editing ? 'Finish editing' : 'Edit the reply'}
                    title={editing ? 'Finish editing' : 'Edit the reply'}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={copyText} disabled={!message} className="ih-action ih-action-neutral" aria-label="Copy reply text" title="Copy reply text">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={pdfGenerating || !message}
                    className="ih-action ih-action-neutral"
                    aria-label="Download PDF"
                    title="Download PDF"
                  >
                    {pdfGenerating ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="p-3 sm:p-5">
                  <textarea
                    value={message}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={Math.min(30, Math.max(10, message.split('\n').length + 2))}
                    placeholder="Type the reply…"
                    className="form-textarea malayalam-text text-base leading-relaxed sm:text-sm"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Changes here apply to {unit} only. To change every unit&apos;s reply, edit the template.
                  </p>
                </div>
              ) : (
                <div className="bg-[#f3f4f6] p-2 sm:p-4">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                    <div className="border-b-2 border-black px-3 pb-3 pt-4 text-center sm:px-[20mm] sm:pb-5 sm:pt-[15mm]">
                      <img src={letterheadImage} alt="Letterhead" className="mx-auto mb-2 h-auto max-w-full" style={{ maxHeight: '120px' }} />
                    </div>
                    <div
                      className="malayalam-text px-3 py-4 text-[13px] sm:px-[20mm] sm:pb-[15mm] sm:pt-[30px] sm:text-sm"
                      style={{ lineHeight: '1.8', color: '#000', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                    >
                      {message || <span className="italic text-gray-400">The template produced no text for this unit.</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={sending || !message.trim()}
                  className="btn-primary w-full gap-2 bg-green-600 hover:bg-green-700 sm:w-auto"
                >
                  <Send className="h-4 w-4" />
                  {existing ? 'Send again' : 'Send reply to unit admin'}
                </button>
                {justSent && nextUnit && (
                  <button type="button" onClick={() => setUnit(nextUnit)} className="btn-outline w-full gap-1.5 rounded-full sm:w-auto">
                    Next unit: {nextUnit} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {!template && customText === null && !templateLoading && (
            <button type="button" onClick={() => { setCustomText(''); setEditing(true) }} className="btn-outline w-full gap-1.5 rounded-full bg-white sm:w-auto">
              <Pencil className="h-4 w-4" /> Write this reply by hand instead
            </button>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        onConfirm={send}
        title={`Send reply to ${unit}?`}
        message={confirmMessage}
        confirmText={existing ? 'Send again' : 'Send'}
        variant="info"
        isLoading={sending}
      />
    </div>
  )
}

/** Admin › Unit Reply: send each unit its reply, and keep one template per quarter. */
export default function UnitReplyPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'template' ? 'template' : 'send'
  const setTab = (next) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'template') params.set('tab', 'template')
        else params.delete('tab')
        return params
      },
      { replace: true },
    )

  const [period, setPeriod] = useState(defaultPeriod)
  const { year, quarter } = period
  const periodName = periodLabel(year, quarter)
  const years = useMemo(() => {
    const list = []
    for (let y = new Date().getFullYear(); y >= 2025; y -= 1) list.push(y)
    if (!list.includes(year)) list.push(year)
    return list
  }, [year])

  const [info, setInfo] = useState(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState(false)
  const [saved, setSaved] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [draft, setDraft] = useState([])
  const [saving, setSaving] = useState(false)
  const [sendUnit, setSendUnit] = useState('')
  // The quarter whose template `draft` and `saved` currently hold. Right after
  // the quarter changes they still hold the previous quarter's, and that draft
  // must not be stored under the new quarter.
  const [loadedKey, setLoadedKey] = useState(null)
  const requestRef = useRef(0)

  const loadInfo = useCallback(async (y, q) => {
    const request = ++requestRef.current
    setInfoLoading(true)
    setInfoError(false)
    setLoadedKey(null)
    setSaved(null)
    setDraft([])
    try {
      const r = await api.get('/ihthisabi/admin/reply-template', { params: { year: y, quarter: q } })
      if (request !== requestRef.current) return
      const d = r.data.data
      const savedSections = d.template ? withIds(d.template.sections) : null
      setInfo(d)
      setSaved(savedSections)
      setSavedAt(d.template?.updatedAt || null)
      const stored = readDraft(y, q)
      if (stored && canonical(stored) !== canonical(savedSections || [])) {
        setDraft(withIds(stored))
        toast('Your unsaved template changes were brought back', { icon: '↩️' })
      } else {
        setDraft(savedSections || [])
      }
      setLoadedKey(`${y}-${q}`)
    } catch {
      if (request !== requestRef.current) return
      setInfo(null)
      setInfoError(true)
    } finally {
      if (request === requestRef.current) setInfoLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInfo(year, quarter)
  }, [year, quarter, loadInfo])

  const dirty = useMemo(() => canonical(draft) !== canonical(saved || []), [draft, saved])

  useEffect(() => {
    if (loadedKey !== `${year}-${quarter}`) return
    if (dirty) writeDraft(year, quarter, draft)
    else clearDraft(year, quarter)
  }, [draft, dirty, loadedKey, year, quarter])

  const saveTemplate = async (sections) => {
    try {
      setSaving(true)
      const r = await api.put('/ihthisabi/admin/reply-template', { year, quarter, sections })
      const t = r.data.data.template
      const savedSections = withIds(t.sections)
      setSaved(savedSections)
      setDraft(savedSections)
      setSavedAt(t.updatedAt)
      setInfo((prev) => (prev ? { ...prev, template: t } : prev))
      clearDraft(year, quarter)
      toast.success(`${periodName} template saved`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the template')
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    setDraft(saved || [])
    clearDraft(year, quarter)
    toast('Changes discarded')
  }

  const hasTemplate = !!saved?.length

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="ih-surface p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Report quarter</p>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                value={year}
                onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
                className="form-select w-[5.5rem] shrink-0 text-base sm:text-sm"
                aria-label="Year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full bg-black/[0.045] p-1" role="group" aria-label="Quarter">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={quarter === q}
                    title={QUARTER_LABELS[q]}
                    onClick={() => setPeriod((p) => ({ ...p, quarter: q }))}
                    className={`ih-segment-btn ${quarter === q ? 'ih-segment-btn-active' : ''}`}
                  >
                    <span className="sm:hidden">Q{q}</span>
                    <span className="hidden sm:inline">{QUARTER_LABELS[q]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs">
            {infoLoading ? (
              <span className="ih-chip bg-gray-100 text-gray-500">Checking template…</span>
            ) : infoError ? (
              <button type="button" onClick={() => loadInfo(year, quarter)} className="ih-chip bg-[#fbe6ee] text-[#b8244f]">
                Could not load template · Retry
              </button>
            ) : hasTemplate ? (
              <span className="ih-chip ih-chip-dot bg-[#e3f4ea] text-[#1e8a4c]">
                {periodName} template ready{savedAt ? ` · saved ${formatDate(savedAt)}` : ''}
              </span>
            ) : (
              <span className="ih-chip ih-chip-dot bg-[#fdf1dc] text-[#a06a12]">No {periodName} template yet</span>
            )}
          </div>
        </div>
        <div className="ih-segment mt-3" role="tablist" aria-label="Unit reply">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'send'}
            onClick={() => setTab('send')}
            className={`ih-segment-btn gap-1.5 ${tab === 'send' ? 'ih-segment-btn-active' : ''}`}
          >
            <Send className="h-3.5 w-3.5" /> Send replies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'template'}
            onClick={() => setTab('template')}
            className={`ih-segment-btn gap-1.5 ${tab === 'template' ? 'ih-segment-btn-active' : ''}`}
          >
            <Settings className="h-3.5 w-3.5" /> Reply template
            {!infoLoading && (dirty || !hasTemplate) && <span className="h-1.5 w-1.5 rounded-full bg-[#e0a030]" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Both tabs stay mounted so the chosen unit and template edits survive switching. */}
      <div hidden={tab !== 'send'}>
        <SendReplies
          year={year}
          quarter={quarter}
          template={saved}
          templateLoading={infoLoading}
          templateDirty={dirty}
          onOpenTemplate={() => setTab('template')}
          onUnitChange={setSendUnit}
        />
      </div>
      <div hidden={tab !== 'template'}>
        {infoLoading ? (
          <div className="ih-surface space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : infoError ? (
          <div className="ih-surface p-4 text-sm text-gray-600">
            Could not load the {periodName} template.{' '}
            <button type="button" onClick={() => loadInfo(year, quarter)} className="font-semibold text-primary underline">
              Try again
            </button>
          </div>
        ) : (
          <ReplyTemplateBuilder
            year={year}
            quarter={quarter}
            info={info}
            sections={draft}
            onChange={setDraft}
            dirty={dirty}
            saving={saving}
            savedAt={savedAt}
            onSave={saveTemplate}
            onDiscard={hasTemplate || dirty ? discard : null}
            preferredUnit={sendUnit}
          />
        )}
      </div>
    </div>
  )
}
