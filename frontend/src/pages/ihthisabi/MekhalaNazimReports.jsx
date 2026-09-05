import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../utils/ihthisabi/api'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import DynamicFormRenderer from '../../components/reportRenderer/DynamicFormRenderer'
import toast from 'react-hot-toast'
import { FileText, ArrowLeft, Eye, Pencil, MessageSquare } from 'lucide-react'

const BASE = '/ihthisabi/dynamic-reports'

// A populated reportId comes back as an object; an unpopulated one as a raw id.
const reportIdOf = (submission) => String(submission?.reportId?._id || submission?.reportId || '')

// Reports authored before the form builder stored parts/questions. Read them into
// the pages shape so the shared renderer can display them unchanged.
const partsToPages = (parts = []) => {
  let id = 1
  return parts
    .slice()
    .sort((a, b) => (a.partOrder ?? 0) - (b.partOrder ?? 0))
    .map((part, pi) => ({
      id: id++,
      title: part.partName || `Part ${pi + 1}`,
      description: '',
      order: pi,
      fields: (part.questions || [])
        .slice()
        .sort((a, b) => (a.questionOrder ?? 0) - (b.questionOrder ?? 0))
        .map((q) => ({
          id: id++,
          type: q.answerType || 'text',
          label: q.questionText || '',
          required: Boolean(q.isRequired),
          placeholder: q.placeholder || '',
          helpText: '',
          options: q.options || [],
          validation: {},
          conditionalLogic: null
        }))
    }))
}

const pagesOf = (report) =>
  report?.pages?.length ? report.pages : partsToPages(report?.parts)

function StatusBadge({ status }) {
  const map = {
    submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700' },
    draft: { label: 'Draft', className: 'bg-amber-50 text-amber-700' },
    pending: { label: 'Not started', className: 'bg-gray-100 text-gray-500' }
  }
  const { label, className } = map[status] || map.pending
  return <span className={`ih-chip ih-chip-dot ${className}`}>{label}</span>
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

function BackLink({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="-ml-2 mb-1 inline-flex items-center gap-1.5 px-2 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 sm:text-sm">
      <ArrowLeft className="w-4 h-4" /> {children}
    </button>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ReportsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [mySubs, setMySubs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reportsRes, subsRes] = await Promise.all([
        api.get(BASE),
        api.get(`${BASE}/my/submissions`)
      ])
      setReports(reportsRes.data.data || [])
      setMySubs(subsRes.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const subByReport = useMemo(() => {
    const map = new Map()
    mySubs.forEach((s) => map.set(reportIdOf(s), s))
    return map
  }, [mySubs])

  return (
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell max-w-3xl">
        <div className="mb-2 hidden min-w-0 lg:mb-3 lg:block">
          <h1 className="ih-page-title">My Reports</h1>
          <p className="ih-page-subtitle">
            {user?.mekhalaName ? `${user.mekhalaName} — ` : ''}reports assigned to you by the admin
          </p>
        </div>

        {loading ? <Spinner /> : reports.length === 0 ? (
          <div className="ih-surface px-4 py-8 text-center sm:py-12">
            <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No reports assigned yet</h3>
            <p className="text-xs text-gray-500">The admin will assign reports here when they are ready.</p>
          </div>
        ) : (
          <div className="ih-section-card ih-list overflow-hidden">
            {reports.map((r) => {
              const sub = subByReport.get(String(r._id))
              const status = sub ? sub.status : 'pending'
              const locked = Boolean(sub?.reply?.message)
              return (
                <div key={r._id} className="ih-list-row ih-list-row-roomy flex-wrap">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    status === 'submitted' ? 'bg-[#161F2F] text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="ih-list-title">{r.title}</h3>
                      <StatusBadge status={status} />
                    </div>
                    {r.description && <p className="ih-list-meta mt-1">{r.description}</p>}
                    {locked && <p className="ih-list-meta mt-0.5">Locked — the admin has replied.</p>}
                  </div>

                  <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                    {status === 'submitted' ? (
                      <>
                        <button onClick={() => navigate(`/ihthisabi/mekhalanazim/submissions/${sub._id}`)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:flex-none sm:text-sm">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {!locked && (
                          <button onClick={() => navigate(`/ihthisabi/mekhalanazim/reports/${r._id}`)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:flex-none sm:text-sm">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => navigate(`/ihthisabi/mekhalanazim/reports/${r._id}`)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#161F2F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1a2538] sm:flex-none sm:text-sm">
                        <FileText className="w-3.5 h-3.5" />
                        {status === 'draft' ? 'Continue draft' : 'Fill report'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {mySubs.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">My Submissions</h2>
            <div className="ih-section-card ih-list overflow-hidden">
              {mySubs.map((s) => (
                <div key={s._id} className="ih-list-row">
                  <div className="min-w-0 flex-1">
                    <p className="ih-list-title">{s.reportId?.title || 'Report'}</p>
                    <p className="ih-list-meta mt-0.5">
                      {s.status === 'submitted' && s.submittedAt
                        ? `Submitted ${new Date(s.submittedAt).toLocaleDateString()}`
                        : `Last saved ${new Date(s.updatedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                  {s.status === 'submitted' && (
                    <button onClick={() => navigate(`/ihthisabi/mekhalanazim/submissions/${s._id}`)}
                      title="View" className="ih-icon-btn hover:bg-gray-200 hover:text-gray-700">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Fill / edit view ──────────────────────────────────────────────────────────

function ReportForm() {
  const { reportId } = useParams()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [reportRes, subsRes] = await Promise.all([
          api.get(`${BASE}/${reportId}`),
          api.get(`${BASE}/my/submissions`)
        ])
        if (cancelled) return

        const existing = (subsRes.data.data || []).find((s) => reportIdOf(s) === String(reportId))
        if (existing) {
          const full = await api.get(`${BASE}/my/submissions/${existing._id}`)
          if (cancelled) return
          setSubmission(full.data.data)
        }
        setReport(reportRes.data.data)
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [reportId])

  const save = async (formData, lastPage, status) => {
    setSaving(true)
    try {
      const payload = { formData, lastPage, status }
      // An already-submitted report is edited in place; anything else goes through
      // the submit endpoint, which also upserts the draft.
      if (submission && submission.status === 'submitted') {
        await api.put(`${BASE}/my/submissions/${submission._id}`, payload)
      } else {
        await api.post(`${BASE}/${reportId}/submit`, payload)
      }
      toast.success(status === 'draft' ? 'Draft saved' : 'Report submitted')
      if (status !== 'draft') navigate('/ihthisabi/mekhalanazim')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="ih-screen bg-gray-50"><Spinner /></div>
  if (!report) {
    return (
      <div className="ih-screen bg-gray-50">
        <div className="ih-page-shell max-w-3xl">
          <div className="ih-surface px-4 py-12 text-center">
            <p className="text-sm text-gray-500">Report not found</p>
          </div>
        </div>
      </div>
    )
  }

  const pages = pagesOf(report)
  const isEditingSubmitted = submission?.status === 'submitted'

  return (
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell max-w-3xl">
        <BackLink onClick={() => navigate('/ihthisabi/mekhalanazim')}>Back to Reports</BackLink>

        <div className="ih-surface p-4 sm:p-6 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 sm:text-base">{report.title}</h1>
              {report.description && <p className="ih-page-subtitle whitespace-normal">{report.description}</p>}
            </div>
            {submission && <StatusBadge status={submission.status} />}
          </div>
        </div>

        {pages.length === 0 ? (
          <div className="ih-surface px-4 py-8 text-center">
            <p className="text-sm text-gray-400">This report has no fields yet.</p>
          </div>
        ) : (
          <div className="ih-surface">
            <DynamicFormRenderer
              report={{ ...report, pages }}
              initialData={submission?.formData || {}}
              initialPage={submission?.lastPage || 0}
              submitting={saving}
              onSaveDraft={isEditingSubmitted ? undefined : (data, page) => save(data, page, 'draft')}
              onSubmit={(data, page) => save(data, page, 'submitted')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Own submission view ───────────────────────────────────────────────────────

function SubmissionView() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get(`${BASE}/my/submissions/${submissionId}`)
        setSubmission(res.data.data)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load submission')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [submissionId])

  if (loading) return <div className="ih-screen bg-gray-50"><Spinner /></div>
  if (!submission) {
    return (
      <div className="ih-screen bg-gray-50">
        <div className="ih-page-shell max-w-3xl">
          <div className="ih-surface px-4 py-12 text-center">
            <p className="text-sm text-gray-500">Submission not found</p>
          </div>
        </div>
      </div>
    )
  }

  const locked = Boolean(submission.reply?.message)
  const report = submission.reportId || {}
  const pages = pagesOf(report)
  const usesFormData = pages.length > 0 && submission.formData && Object.keys(submission.formData).length > 0

  return (
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell max-w-3xl">
        <BackLink onClick={() => navigate('/ihthisabi/mekhalanazim')}>Back to Reports</BackLink>

        <div className="ih-surface p-4 sm:p-6 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 sm:text-base">{report.title || 'Report'}</h1>
              <p className="ih-list-meta mt-0.5">
                {submission.submittedAt
                  ? `Submitted ${new Date(submission.submittedAt).toLocaleString()}`
                  : `Last saved ${new Date(submission.updatedAt).toLocaleString()}`}
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
          {!locked && submission.status === 'submitted' && (
            <button onClick={() => navigate(`/ihthisabi/mekhalanazim/reports/${reportIdOf(submission)}`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:text-sm">
              <Pencil className="w-3.5 h-3.5" /> Edit Submission
            </button>
          )}
        </div>

        {submission.reply?.message && (
          <div className="ih-surface border-l-4 border-primary p-4 sm:p-6 mb-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <MessageSquare className="w-4 h-4 text-primary" /> Admin Reply
            </p>
            <p className="whitespace-pre-wrap break-words text-[13px] text-gray-700 sm:text-sm">{submission.reply.message}</p>
            {submission.reply.repliedAt && (
              <p className="ih-list-meta mt-2">{new Date(submission.reply.repliedAt).toLocaleString()}</p>
            )}
          </div>
        )}

        {usesFormData ? (
          <div className="ih-surface">
            <DynamicFormRenderer
              report={{ ...report, pages }}
              initialData={submission.formData}
              disabled
              onSubmit={() => {}}
            />
          </div>
        ) : (
          <div className="ih-surface p-4 sm:p-6">
            <div className="ih-list">
              {(submission.answers || []).map((a, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0">
                  {a.partName && <p className="ih-list-meta">{a.partName}</p>}
                  <p className="break-words text-[13px] font-medium text-gray-900 sm:text-sm">{a.questionText}</p>
                  <p className="mt-0.5 break-words text-[13px] text-gray-600 sm:text-sm">
                    {Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '') || '—'}
                  </p>
                </div>
              ))}
            </div>
            {(submission.answers || []).length === 0 && (
              <p className="text-center text-sm text-gray-400">No answers recorded.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────

const MekhalaNazimReports = ({ view = 'list' }) => {
  if (view === 'form') return <ReportForm />
  if (view === 'submission') return <SubmissionView />
  return <ReportsList />
}

export default MekhalaNazimReports
