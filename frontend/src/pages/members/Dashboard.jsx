import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Bell, CheckCircle2, FileText, Inbox, Link2, Plus, Settings2,
  Sparkles, Users, Workflow as WorkflowIcon
} from 'lucide-react'
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import {
  Avatar, Card, CardHeader, ErrorState, IconTile, ListRow, Skeleton, StatusBadge
} from '../../components/members/ui'
import { TYPE_TONE, cx, timeAgo } from '../../utils/members/format'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

/** Sums an aggregate result of { _id: {...}, count } down to a flat map. */
function tally(rows, key) {
  const out = {}
  for (const row of rows || []) {
    const k = row._id?.[key]
    if (!k) continue
    out[k] = (out[k] || 0) + row.count
  }
  return out
}

// Series colours (validated for colour-vision deficiency): Rukn royal, Karkoon gold.
const RUKN_COLOR = '#2a4bd6'
const KARKOON_COLOR = '#e0a21b'

const STATUS_META = [
  { key: 'submitted', label: 'Submitted', color: '#0ea5e9' },
  { key: 'in_review', label: 'In review', color: '#f59e0b' },
  { key: 'approved', label: 'Approved', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#f43f5e' },
  { key: 'hold', label: 'On hold', color: '#94a3b8' }
]

const LINK_META = [
  { key: 'active', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'used', label: 'Used', dot: 'bg-royal-500' },
  { key: 'blocked', label: 'Blocked', dot: 'bg-rose-500' },
  { key: 'expired', label: 'Expired', dot: 'bg-slate-400' }
]

/** Last six months as [{ month: '2026-03', label: 'Mar' }, ...] ending this month. */
function lastSixMonths() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en', { month: 'short' })
    })
  }
  return out
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** The four shortcuts each kind of account reaches for most. */
function quickActions({ isSuperAdmin, canCreateAccessLinks }) {
  const newLink = { to: '/members/access-links?new=1', label: 'New link', hint: 'Issue an applicant link', icon: Plus, tone: 'royal' }
  const waiting = { to: '/members/applications?mine=1', label: 'Waiting on me', hint: 'Your review queue', icon: Inbox, tone: 'gold' }
  const all = { to: '/members/applications', label: 'Applications', hint: 'Everything in scope', icon: FileText, tone: 'sky' }
  if (isSuperAdmin) {
    return [
      newLink,
      { to: '/members/accounts', label: 'Accounts', hint: 'Reviewer logins', icon: Users, tone: 'green' },
      { to: '/members/forms', label: 'Forms', hint: 'Build the forms', icon: Settings2, tone: 'violet' },
      { to: '/members/workflows', label: 'Workflows', hint: 'Review stages', icon: WorkflowIcon, tone: 'gold' }
    ]
  }
  if (canCreateAccessLinks) {
    return [newLink, waiting, all, { to: '/members/access-links', label: 'My links', hint: 'Issued links', icon: Link2, tone: 'green' }]
  }
  return [
    waiting,
    all,
    { to: '/members/applications?status=approved', label: 'Approved', hint: 'Completed approvals', icon: CheckCircle2, tone: 'green' },
    { to: '/members/notifications', label: 'Alerts', hint: 'Updates for you', icon: Bell, tone: 'violet' }
  ]
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-[#fff] px-3 py-2 text-xs shadow-[0_8px_24px_rgba(11,20,48,0.12)]">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}
          <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

function SeriesLegend({ rukn, karkoon }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: RUKN_COLOR }} />Rukn{rukn !== undefined && <b className="font-semibold text-ink">{rukn}</b>}</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: KARKOON_COLOR }} />Karkoon{karkoon !== undefined && <b className="font-semibold text-ink">{karkoon}</b>}</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-[188px] rounded-[1.5rem]" />
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-[1.125rem]" />
    </div>
  )
}

export default function Dashboard() {
  const { user, isSuperAdmin, canCreateAccessLinks } = useAuth()
  const [stats, setStats] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [waiting, setWaiting] = useState([])
  const [waitingTotal, setWaitingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/stats'),
      api.get('/applications', { params: { mine: 1, limit: 5 } }),
      api.get('/workflows').catch(() => ({ data: { workflows: [] } }))
    ])
      .then(([statsRes, mineRes, wfRes]) => {
        setStats(statsRes.data.stats)
        setWaiting(mineRes.data.applications || [])
        setWaitingTotal(mineRes.data.pagination?.total ?? (mineRes.data.applications || []).length)
        setWorkflows(wfRes.data.workflows || [])
        setError('')
      })
      .catch(err => setError(apiError(err, 'Failed to load the dashboard')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const byStatus = useMemo(() => tally(stats?.byStatus, 'status'), [stats])
  const byType = useMemo(() => tally(stats?.byStatus, 'formType'), [stats])
  const linkStatus = useMemo(() => tally(stats?.links, 'status'), [stats])

  // Applications sitting at each workflow stage, split by type, in stage order.
  // Applications that have left the workflow are grouped as "Completed".
  const stageData = useMemo(() => {
    if (!stats?.byStage) return []
    const lookup = (formType, key) => {
      const wf = workflows.find(w => w.formType === formType)
      const stage = wf?.stages?.find(s => s.key === key)
      return { name: stage?.name || key, order: stage?.order ?? 999 }
    }
    const map = new Map()
    for (const row of stats.byStage) {
      const { formType, stage } = row._id || {}
      const { name, order } = stage ? lookup(formType, stage) : { name: 'Completed', order: 10000 }
      const entry = map.get(name) || { name, order, rukn: 0, karkoon: 0 }
      entry.order = Math.min(entry.order, order)
      entry[formType === 'karkoon' ? 'karkoon' : 'rukn'] += row.count
      map.set(name, entry)
    }
    return [...map.values()].sort((a, b) => a.order - b.order)
  }, [stats, workflows])
  const stageMax = Math.max(1, ...stageData.map(s => s.rukn + s.karkoon))

  const monthlyData = useMemo(() => {
    const months = lastSixMonths()
    const map = Object.fromEntries(months.map(m => [m.month, { label: m.label, rukn: 0, karkoon: 0 }]))
    for (const row of stats?.monthly || []) {
      const { month, formType } = row._id || {}
      if (!map[month]) continue
      map[month][formType === 'karkoon' ? 'karkoon' : 'rukn'] += row.count
    }
    return months.map(m => map[m.month])
  }, [stats])
  const monthlyTotals = monthlyData.reduce((acc, m) => ({ rukn: acc.rukn + m.rukn, karkoon: acc.karkoon + m.karkoon }), { rukn: 0, karkoon: 0 })

  if (loading) return <DashboardSkeleton />
  if (error) return <Card><ErrorState message={error} onRetry={load} /></Card>

  const totalApplications = (byType.rukn || 0) + (byType.karkoon || 0)
  const inReview = (byStatus.submitted || 0) + (byStatus.in_review || 0)
  const statusTotal = STATUS_META.reduce((sum, s) => sum + (byStatus[s.key] || 0), 0)
  const linksTotal = LINK_META.reduce((sum, l) => sum + (linkStatus[l.key] || 0), 0)
  const firstName = String(user?.name || '').trim().split(/\s+/)[0] || 'there'
  const scopeLabel = user?.scope?.unit || user?.scope?.area || user?.scope?.district || user?.scope?.mekhala || (isSuperAdmin ? 'State' : '')
  const actions = quickActions({ isSuperAdmin, canCreateAccessLinks })

  const heroStats = [
    { label: 'Total', value: totalApplications, to: '/members/applications' },
    { label: 'Rukn', value: byType.rukn || 0, to: '/members/applications?formType=rukn' },
    { label: 'Karkoon', value: byType.karkoon || 0, to: '/members/applications?formType=karkoon' }
  ]
  // The headline is the reviewer's own queue; once that is empty it becomes
  // what is still in review across their scope.
  const headline = waitingTotal > 0
    ? { value: waitingTotal, label: `application${waitingTotal === 1 ? '' : 's'} waiting on you`, to: '/members/applications?mine=1', cta: 'Review' }
    : { value: inReview, label: 'in progress across your scope', to: '/members/applications', cta: inReview > 0 ? 'View' : '', caughtUp: true }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mbr-hero rounded-[1.5rem] p-4 sm:p-6 lg:p-7">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.12] px-2.5 py-1 text-xs font-medium text-royal-50 ring-1 ring-inset ring-white/15">
                <Sparkles size={12} />
                {[user?.role?.name || (isSuperAdmin ? 'Super admin' : ''), scopeLabel].filter(Boolean).join(' · ')}
              </span>
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {greeting()}, {firstName}
            </h1>

            <div className="mt-4 flex items-end justify-between gap-4 lg:justify-start lg:gap-6">
              <div>
                <p className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-white">{headline.value}</p>
                <p className="mt-1.5 text-sm text-royal-100/85">{headline.label}</p>
                {headline.caughtUp && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200">
                    <CheckCircle2 size={13} /> Nothing waiting on you
                  </p>
                )}
              </div>
              {headline.cta && (
                <Link
                  to={headline.to}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#fff] px-4 text-sm font-semibold text-royal-800 shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition hover:bg-royal-50"
                >
                  {headline.cta} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/[0.08] py-3 ring-1 ring-inset ring-white/10 lg:mt-0 lg:w-[380px] lg:shrink-0">
            {heroStats.map(stat => (
              <Link key={stat.label} to={stat.to} className="px-3 text-center transition hover:opacity-80">
                <p className="text-xl font-bold tabular-nums text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-royal-100/75">{stat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2 sm:gap-3">
        {actions.map(action => (
          <Link
            key={action.label}
            to={action.to}
            className="mbr-card flex min-h-[80px] flex-col items-center justify-center gap-1.5 px-1 py-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] active:scale-[0.98] lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3.5 lg:text-left"
          >
            <IconTile icon={action.icon} tone={action.tone} size="sm" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-ink lg:text-sm">{action.label}</span>
              <span className="mt-0.5 hidden text-xs text-slate-500 lg:block">{action.hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* Phones: one column in reading order (order-*). Desktop: two
          independent stacks, so a short card never leaves a hole beside a
          tall one. The column wrappers are display:contents below lg. */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-4">
        {/* ── Waiting on you ─────────────────────────────────────────── */}
        <Card className="order-1">
          <CardHeader
            title="Waiting on you"
            subtitle="Applications ready for your action"
            action={
              <Link to="/members/applications?mine=1" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-royal-700 hover:bg-royal-50">
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          {waiting.length === 0 ? (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 sm:mx-5">
              <CheckCircle2 size={18} className="shrink-0" />
              Nothing is waiting for your action.
            </div>
          ) : (
            <div className="divide-y divide-line border-t border-line">
              {waiting.map(app => (
                <ListRow
                  key={app._id}
                  to={`/members/applications/${app._id}`}
                  leading={<Avatar name={app.applicantName} tone={TYPE_TONE[app.formType]} />}
                  title={app.applicantName || 'Unnamed applicant'}
                  meta={[FORM_TYPE_LABEL[app.formType], app.scope?.unit || app.scope?.area || app.scope?.district, timeAgo(app.submittedAt)].filter(Boolean).join(' · ')}
                  trailing={<StatusBadge status={app.status} />}
                />
              ))}
            </div>
          )}
        </Card>

        {/* ── Pipeline by stage ──────────────────────────────────────── */}
        <Card className="order-3">
          <CardHeader title="Pipeline" subtitle="By current stage" action={<SeriesLegend />} />
          <div className="px-4 pb-4 sm:px-5">
            {stageData.length === 0 ? (
              <p className="rounded-xl bg-mist px-3.5 py-6 text-center text-sm text-slate-500">No applications in progress.</p>
            ) : (
              <ul className="space-y-3">
                {stageData.map(stage => {
                  const total = stage.rukn + stage.karkoon
                  return (
                    <li key={stage.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 font-medium text-slate-700 [overflow-wrap:anywhere]">{stage.name}</span>
                        <span className="flex shrink-0 items-center gap-2.5 text-xs tabular-nums text-slate-500">
                          {stage.rukn > 0 && <span className="inline-flex items-center gap-1" title="Rukn"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RUKN_COLOR }} />{stage.rukn}</span>}
                          {stage.karkoon > 0 && <span className="inline-flex items-center gap-1" title="Karkoon"><span className="h-1.5 w-1.5 rounded-full" style={{ background: KARKOON_COLOR }} />{stage.karkoon}</span>}
                          <b className="min-w-5 text-right font-semibold text-ink">{total}</b>
                        </span>
                      </div>
                      <div className="flex h-2 gap-0.5 rounded-full bg-mist" title={`Rukn ${stage.rukn} · Karkoon ${stage.karkoon}`}>
                        {stage.rukn > 0 && <span className="h-full rounded-full" style={{ width: `${(stage.rukn / stageMax) * 100}%`, background: RUKN_COLOR }} />}
                        {stage.karkoon > 0 && <span className="h-full rounded-full" style={{ width: `${(stage.karkoon / stageMax) * 100}%`, background: KARKOON_COLOR }} />}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* ── Submissions trend ──────────────────────────────────────── */}
        <Card className="order-5">
          <CardHeader
            title="Submissions"
            subtitle="Last 6 months"
            action={<SeriesLegend rukn={monthlyTotals.rukn} karkoon={monthlyTotals.karkoon} />}
          />
          <div className="h-[170px] pb-3 pr-3 sm:h-[220px] sm:pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="mbrRuknFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={RUKN_COLOR} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={RUKN_COLOR} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mbrKarkoonFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={KARKOON_COLOR} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={KARKOON_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e5e9f2" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#c8d5fd', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="rukn" name="Rukn" stroke={RUKN_COLOR} strokeWidth={2} fill="url(#mbrRuknFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="karkoon" name="Karkoon" stroke={KARKOON_COLOR} strokeWidth={2} fill="url(#mbrKarkoonFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
        {/* ── Status breakdown ───────────────────────────────────────── */}
        <Card className="order-2">
          <CardHeader title="Status" subtitle={`${statusTotal} application${statusTotal === 1 ? '' : 's'} in your scope`} />
          <div className="px-4 pb-4 sm:px-5">
            {statusTotal === 0 ? (
              <p className="rounded-xl bg-mist px-3.5 py-6 text-center text-sm text-slate-500">No applications yet.</p>
            ) : (
              <>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Applications by status">
                  {STATUS_META.filter(s => byStatus[s.key]).map(s => (
                    <span key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(byStatus[s.key] / statusTotal) * 100}%`, background: s.color }} />
                  ))}
                </div>
                <ul className="mt-3 -mx-2">
                  {STATUS_META.map(s => {
                    const value = byStatus[s.key] || 0
                    return (
                      <li key={s.key}>
                        <Link
                          to={`/members/applications?status=${s.key}`}
                          className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-mist"
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                          <span className="flex-1 text-slate-600">{s.label}</span>
                          <span className="font-semibold tabular-nums text-ink">{value}</span>
                          <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                            {Math.round((value / statusTotal) * 100)}%
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </Card>

        {/* ── Access links (roles that issue them) ───────────────────── */}
        {canCreateAccessLinks && (
          <Card className="order-4">
            <CardHeader
              title="Form access links"
              subtitle={`${linksTotal} issued`}
              action={
                <Link to="/members/access-links" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-royal-700 hover:bg-royal-50">
                  Manage <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-5">
              {LINK_META.map(l => (
                <div key={l.key} className="rounded-xl bg-mist px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={cx('h-1.5 w-1.5 rounded-full', l.dot)} />
                    {l.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{linkStatus[l.key] || 0}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        </div>
      </div>
    </div>
  )
}
