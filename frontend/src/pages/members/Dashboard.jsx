import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, UserCheck, Users, Clock, CheckCircle2, XCircle, Link2, ArrowRight
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import { Card, PageHeader, Spinner, StatusBadge } from '../../components/members/ui'
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

const RUKN_COLOR = '#7c3aed'
const KARKOON_COLOR = '#c4b5fd'

const STATUS_META = {
  submitted: { label: 'Submitted', color: '#3b82f6' },
  in_review: { label: 'In review', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#22c55e' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  hold: { label: 'On hold', color: '#9ca3af' }
}

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

function StatTile({ icon: Icon, label, value, tint, link }) {
  const body = (
    <Card className="p-4 h-full transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
        </div>
      </div>
    </Card>
  )
  return link ? <Link to={link}>{body}</Link> : body
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [waiting, setWaiting] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/applications', { params: { mine: 1, limit: 5 } }),
      api.get('/workflows').catch(() => ({ data: { workflows: [] } }))
    ])
      .then(([statsRes, mineRes, wfRes]) => {
        setStats(statsRes.data.stats)
        setWaiting(mineRes.data.applications || [])
        setWorkflows(wfRes.data.workflows || [])
      })
      .catch(err => setError(apiError(err, 'Failed to load the dashboard')))
      .finally(() => setLoading(false))
  }, [])

  const byStatus = useMemo(() => tally(stats?.byStatus, 'status'), [stats])
  const byType = useMemo(() => tally(stats?.byStatus, 'formType'), [stats])
  const linkStatus = useMemo(() => tally(stats?.links, 'status'), [stats])

  // Applications currently sitting at each workflow stage, split by type.
  const stageData = useMemo(() => {
    if (!stats?.byStage) return []
    const stageName = (formType, key) => {
      const wf = workflows.find(w => w.formType === formType)
      return wf?.stages?.find(s => s.key === key)?.name || key
    }
    const map = new Map()
    for (const row of stats.byStage) {
      const { formType, stage } = row._id || {}
      if (!stage) continue
      const name = stageName(formType, stage)
      const entry = map.get(name) || { name, rukn: 0, karkoon: 0 }
      entry[formType === 'karkoon' ? 'karkoon' : 'rukn'] += row.count
      map.set(name, entry)
    }
    return [...map.values()]
  }, [stats, workflows])

  const statusData = useMemo(
    () => Object.entries(STATUS_META)
      .map(([key, meta]) => ({ name: meta.label, value: byStatus[key] || 0, color: meta.color }))
      .filter(d => d.value > 0),
    [byStatus]
  )

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

  if (loading) return <Spinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const totalApplications = (byType.rukn || 0) + (byType.karkoon || 0)

  const tiles = [
    { label: 'Total applications', value: totalApplications, icon: FileText, tint: 'bg-violet-100 text-[#5b21b6]', link: '/members/applications' },
    { label: 'Rukn applications', value: byType.rukn || 0, icon: UserCheck, tint: 'bg-indigo-100 text-indigo-700', link: '/members/applications?formType=rukn' },
    { label: 'Karkoon applications', value: byType.karkoon || 0, icon: Users, tint: 'bg-sky-100 text-sky-700', link: '/members/applications?formType=karkoon' },
    { label: 'In review', value: (byStatus.submitted || 0) + (byStatus.in_review || 0), icon: Clock, tint: 'bg-amber-100 text-amber-700', link: '/members/applications?status=in_review' },
    { label: 'Approved', value: byStatus.approved || 0, icon: CheckCircle2, tint: 'bg-green-100 text-green-700', link: '/members/applications?status=approved' },
    { label: 'Open form links', value: linkStatus.active || 0, icon: Link2, tint: 'bg-rose-100 text-rose-700' }
  ]

  const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: 12
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name || 'there'}`}
        subtitle={user?.role?.name ? `Signed in as ${user.role.name}` : undefined}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {tiles.map(tile => <StatTile key={tile.label} {...tile} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-1">Submissions over time</h2>
          <p className="text-xs text-gray-500 mb-4">Applications submitted in the last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="ruknFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RUKN_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={RUKN_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="karkoonFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={KARKOON_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={KARKOON_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="rukn" name="Rukn" stroke={RUKN_COLOR} strokeWidth={2} fill="url(#ruknFill)" />
              <Area type="monotone" dataKey="karkoon" name="Karkoon" stroke={KARKOON_COLOR} strokeWidth={2} fill="url(#karkoonFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Status breakdown</h2>
          <p className="text-xs text-gray-500 mb-4">All applications in your scope</p>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-500 py-14 text-center">No applications yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-1.5">
                {statusData.map(d => (
                  <li key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600 flex-1">{d.name}</span>
                    <span className="font-medium text-gray-900">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Applications by stage</h2>
          <p className="text-xs text-gray-500 mb-4">Where the pipeline currently stands</p>
          {stageData.length === 0 ? (
            <p className="text-sm text-gray-500 py-14 text-center">No applications in progress.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, stageData.length * 44)}>
              <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f9fafb' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="rukn" name="Rukn" stackId="a" fill={RUKN_COLOR} radius={[0, 0, 0, 0]} barSize={18} />
                <Bar dataKey="karkoon" name="Karkoon" stackId="a" fill={KARKOON_COLOR} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Waiting on you</h2>
              <p className="text-xs text-gray-500 mt-1">Applications at your stage</p>
            </div>
            <Link
              to="/members/applications?mine=1"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#5b21b6] hover:underline py-2.5 -my-2.5"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {waiting.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">Nothing is waiting for your action.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {waiting.map(app => (
                <li key={app._id}>
                  <Link
                    to={`/members/applications/${app._id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {app.applicantName || 'Unnamed applicant'}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {FORM_TYPE_LABEL[app.formType]} · {app.scope?.unit || app.scope?.area || app.scope?.district}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
