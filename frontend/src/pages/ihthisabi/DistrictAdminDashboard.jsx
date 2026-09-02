import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../utils/ihthisabi/api'
import {
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Repeat,
  MapPin,
  Search,
  ArrowUpDown,
  ArrowUpRight,
  Printer,
  X as CloseIcon,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import Pagination from '../../components/ihthisabi/Pagination'
import SubmissionReportView from '../../components/ihthisabi/SubmissionReportView'
import { getQuarterName, getAvailableQuarters } from '../../utils/ihthisabi/quarterHelper'

// Shared chart styling (same treatment as AdminDashboard)
const AXIS = { tick: { fontSize: 10, fill: '#98A2B3' }, axisLine: false, tickLine: false }
const GRID = { stroke: 'rgba(16,24,40,0.06)', vertical: false }
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: 'none',
    boxShadow: '0 4px 8px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.10)',
    fontSize: 11,
  },
  cursor: { fill: 'rgba(16,24,40,0.04)' },
}
const BRAND = '#7B4FF2'
const PENDING_GRAY = '#CBD5E1'

// shortLabel is what phones show — the full labels are far too wide for five
// pills at 390px. "District"/"Submissions" are implied by the screen itself.
const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'submissions', label: 'Submissions', icon: FileText },
  { key: 'replies', label: 'District Replies', shortLabel: 'Replies', icon: MessageSquare },
  { key: 'alternative', label: 'Alternative Submissions', shortLabel: 'Alt', icon: Repeat }
]

const STATUS_COLORS = {
  submitted: 'bg-green-100 text-green-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const SortButton = ({ field, label, activeSort, onSort }) => {
  const isActive = activeSort.by === field
  return (
    <button
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
        isActive ? 'text-[#7B4FF2]' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {isActive ? (
        activeSort.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  )
}

const DistrictAdminDashboard = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [areas, setAreas] = useState([])

  // Overview
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [district, setDistrict] = useState('')
  const [stats, setStats] = useState({
    totalMembers: 0,
    currentQuarterSubmissions: 0,
    previousQuarterSubmissions: 0,
    quarterChangePercent: 0,
    submittedCount: 0,
    reviewedCount: 0,
    approvedCount: 0,
    completionRate: 0,
    currentQuarter: null,
    currentYear: null,
    prevQuarter: null,
    prevYear: null
  })
  const [areaBreakdown, setAreaBreakdown] = useState([])
  const [breakdownPeriod, setBreakdownPeriod] = useState(null) // { quarter, year } filter, null = current
  const [availableYears, setAvailableYears] = useState([])
  const [trend, setTrend] = useState([])
  const [recentSubmissions, setRecentSubmissions] = useState([])

  // Members
  const [members, setMembers] = useState([])
  const [membersPagination, setMembersPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [membersSearch, setMembersSearch] = useState('')
  const [membersArea, setMembersArea] = useState('')
  const [membersSort, setMembersSort] = useState({ by: 'createdAt', dir: 'desc' })
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberDetails, setMemberDetails] = useState(null)
  const [memberDetailsLoading, setMemberDetailsLoading] = useState(false)

  // Submissions
  const [submissions, setSubmissions] = useState([])
  const [submissionsPagination, setSubmissionsPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false)
  const [submissionsSearch, setSubmissionsSearch] = useState('')
  const [submissionsArea, setSubmissionsArea] = useState('')
  const [submissionsQuarter, setSubmissionsQuarter] = useState('')
  const [submissionsYear, setSubmissionsYear] = useState('')
  const [submissionsSort, setSubmissionsSort] = useState({ by: 'createdAt', dir: 'desc' })
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null)
  const [submissionDetails, setSubmissionDetails] = useState(null)
  const [submissionDetailsLoading, setSubmissionDetailsLoading] = useState(false)
  const [submissionFormSchema, setSubmissionFormSchema] = useState(null)

  // Replies
  const [replies, setReplies] = useState([])
  const [repliesPagination, setRepliesPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [repliesLoaded, setRepliesLoaded] = useState(false)
  const [selectedReply, setSelectedReply] = useState(null)

  // Alternative submissions
  const [altSubmissions, setAltSubmissions] = useState([])
  const [altPagination, setAltPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [altLoading, setAltLoading] = useState(false)
  const [altLoaded, setAltLoaded] = useState(false)
  const [selectedAltSubmission, setSelectedAltSubmission] = useState(null)

  // Print (full dataset, not just current page)
  const [printLoading, setPrintLoading] = useState(false)
  const [printMode, setPrintMode] = useState(null) // 'members' | 'submissions' | null
  const [printMembers, setPrintMembers] = useState([])
  const [printSubmissions, setPrintSubmissions] = useState([])

  useEffect(() => {
    fetchDashboard()
    fetchAreas()
  }, [])

  useEffect(() => {
    const path = location.pathname
    if (path.includes('/submissions')) setActiveTab('submissions')
    else if (path.includes('/members')) setActiveTab('members')
    else setActiveTab('overview')
  }, [location.pathname])

  useEffect(() => {
    if (activeTab === 'members' && !membersLoaded) fetchMembers(1)
    if (activeTab === 'submissions' && !submissionsLoaded) fetchSubmissions(1)
    if (activeTab === 'replies' && !repliesLoaded) fetchReplies(1)
    if (activeTab === 'alternative' && !altLoaded) fetchAlternativeSubmissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Refetch from page 1 when members filters/sort change (after first load)
  useEffect(() => {
    if (membersLoaded) fetchMembers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersArea, membersSort])

  useEffect(() => {
    if (submissionsLoaded) fetchSubmissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionsArea, submissionsQuarter, submissionsYear, submissionsSort])

  useEffect(() => {
    if (!printMode) return
    const handleAfterPrint = () => setPrintMode(null)
    window.addEventListener('afterprint', handleAfterPrint)
    window.print()
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [printMode])

  const fetchAreas = async () => {
    try {
      const response = await api.get('/districtadmin/areas')
      if (response.data?.success) setAreas(response.data.data.areas || [])
    } catch (error) {
      console.error('Error fetching district areas:', error)
    }
  }

  const fetchDashboard = async (period) => {
    try {
      setDashboardLoading(true)
      const response = await api.get('/districtadmin/dashboard', {
        params: period ? { quarter: period.quarter, year: period.year } : {}
      })
      if (response.data?.success) {
        const data = response.data.data
        setDistrict(data.district || '')
        setStats(data.stats || {})
        setAreaBreakdown(data.areaBreakdown || [])
        setBreakdownPeriod(data.breakdownPeriod || null)
        setAvailableYears(data.availableYears || [])
        setTrend(data.trend || [])
        setRecentSubmissions(data.recentSubmissions || [])
      }
    } catch (error) {
      console.error('Error fetching district dashboard:', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchMembers = async (page = membersPagination.current) => {
    try {
      setMembersLoading(true)
      const response = await api.get('/districtadmin/members', {
        params: {
          page,
          limit: 10,
          search: membersSearch || undefined,
          area: membersArea || undefined,
          sortBy: membersSort.by,
          sortDir: membersSort.dir
        }
      })
      if (response.data?.success) {
        setMembers(response.data.data.members || [])
        setMembersPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching district members:', error)
    } finally {
      setMembersLoading(false)
      setMembersLoaded(true)
    }
  }

  const fetchSubmissions = async (page = submissionsPagination.current) => {
    try {
      setSubmissionsLoading(true)
      const response = await api.get('/districtadmin/submissions', {
        params: {
          page,
          limit: 10,
          search: submissionsSearch || undefined,
          area: submissionsArea || undefined,
          quarter: submissionsQuarter || undefined,
          year: submissionsYear || undefined,
          sortBy: submissionsSort.by,
          sortDir: submissionsSort.dir
        }
      })
      if (response.data?.success) {
        setSubmissions(response.data.data.submissions || [])
        setSubmissionsPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching district submissions:', error)
    } finally {
      setSubmissionsLoading(false)
      setSubmissionsLoaded(true)
    }
  }

  const fetchReplies = async (page = 1) => {
    try {
      setRepliesLoading(true)
      const response = await api.get('/districtadmin/replies', { params: { page, limit: 10 } })
      if (response.data?.success) {
        setReplies(response.data.data.replies || [])
        setRepliesPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching district replies:', error)
    } finally {
      setRepliesLoading(false)
      setRepliesLoaded(true)
    }
  }

  const fetchAlternativeSubmissions = async (page = 1) => {
    try {
      setAltLoading(true)
      const response = await api.get('/districtadmin/alternative-submissions', { params: { page, limit: 10 } })
      if (response.data?.success) {
        setAltSubmissions(response.data.data.alternativeSubmissions || [])
        setAltPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching district alternative submissions:', error)
    } finally {
      setAltLoading(false)
      setAltLoaded(true)
    }
  }

  const openMemberDetails = async (member) => {
    setSelectedMember(member)
    setMemberDetailsLoading(true)
    try {
      const response = await api.get(`/districtadmin/members/${member._id}`)
      if (response.data?.success) setMemberDetails(response.data.data.member)
    } catch (error) {
      console.error('Error fetching member details:', error)
    } finally {
      setMemberDetailsLoading(false)
    }
  }

  const openSubmissionDetails = async (submissionId) => {
    setSelectedSubmissionId(submissionId)
    setSubmissionDetailsLoading(true)
    setSubmissionFormSchema(null)
    try {
      const response = await api.get(`/districtadmin/submissions/${submissionId}`)
      if (response.data?.success) {
        const sub = response.data.data.submission
        setSubmissionDetails(sub)
        // Dynamic submissions need the form schema for question labels
        if (sub?.dynamicFormId && sub?.submissionPeriod?.quarter && sub?.submissionPeriod?.year) {
          try {
            const formRes = await api.get(
              `/ihthisabi/application-forms/public/by-quarter/${sub.submissionPeriod.quarter}/${sub.submissionPeriod.year}`
            )
            if (formRes.data?.hasDynamicForm && formRes.data?.data) {
              setSubmissionFormSchema(formRes.data.data)
            }
          } catch {
            // schema unavailable — fallback rendering will be used
          }
        }
      }
    } catch (error) {
      console.error('Error fetching submission details:', error)
    } finally {
      setSubmissionDetailsLoading(false)
    }
  }

  const toggleMembersSort = (field) => {
    setMembersSort((prev) =>
      prev.by === field ? { by: field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { by: field, dir: 'asc' }
    )
  }

  const toggleSubmissionsSort = (field) => {
    setSubmissionsSort((prev) =>
      prev.by === field ? { by: field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { by: field, dir: 'asc' }
    )
  }

  const fetchAllPages = async (endpoint, dataKey, baseParams) => {
    const limit = 100
    let page = 1
    let totalPages = 1
    let all = []
    do {
      const response = await api.get(endpoint, { params: { ...baseParams, page, limit } })
      if (!response.data?.success) break
      all = all.concat(response.data.data[dataKey] || [])
      totalPages = response.data.data.pagination?.pages || 1
      page += 1
    } while (page <= totalPages)
    return all
  }

  const handlePrintMembers = async () => {
    setPrintLoading(true)
    try {
      const rows = await fetchAllPages('/districtadmin/members', 'members', {
        search: membersSearch || undefined,
        area: membersArea || undefined,
        sortBy: membersSort.by,
        sortDir: membersSort.dir
      })
      setPrintMembers(rows)
      setPrintMode('members')
    } catch (error) {
      console.error('Error preparing members for print:', error)
    } finally {
      setPrintLoading(false)
    }
  }

  const handlePrintSubmissions = async () => {
    setPrintLoading(true)
    try {
      const rows = await fetchAllPages('/districtadmin/submissions', 'submissions', {
        search: submissionsSearch || undefined,
        area: submissionsArea || undefined,
        quarter: submissionsQuarter || undefined,
        year: submissionsYear || undefined,
        sortBy: submissionsSort.by,
        sortDir: submissionsSort.dir
      })
      setPrintSubmissions(rows)
      setPrintMode('submissions')
    } catch (error) {
      console.error('Error preparing submissions for print:', error)
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ida-printable, #ida-printable * { visibility: visible; }
          #ida-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* Header — mobile app bar already shows "District Dashboard" + user, so the
          h1 is desktop-only; the district name stays as a compact line (the app
          bar doesn't show it). */}
      <div className="mb-2 sm:mb-4">
        <h1 className="ih-page-title hidden lg:block">District Admin Dashboard</h1>
        <p className="ih-page-subtitle flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0 text-[#7B4FF2]" />
          <span className="truncate">{district || 'Loading district…'}</span>
        </p>
      </div>

      {/* Tabs — on phones the icon sits above a short label so all five pills fit
          the screen whole; from sm: up they return to icon-beside-full-label. */}
      <div className="ih-segment mb-3 print:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`ih-segment-btn flex-col gap-0.5 px-2.5 py-1.5 sm:flex-row sm:gap-1 sm:px-3 ${active ? 'bg-[#7B4FF2] text-white shadow-sm' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        dashboardLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mr-2" /> Loading dashboard…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div
                onClick={() => navigate('/ihthisabi/districtadmin/members')}
                className="ih-stat-card min-w-0 cursor-pointer hover:shadow-md active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ih-stat-label truncate">
                      <span className="sm:hidden">Members</span>
                      <span className="hidden sm:inline">Total Members</span>
                    </p>
                    <p className="ih-stat-value mt-1">{stats.totalMembers}</p>
                  </div>
                  <div className="ih-stat-icon bg-[#7B4FF2]/10">
                    <Users className="w-4 h-4 text-[#7B4FF2]" />
                  </div>
                </div>
              </div>

              <div
                onClick={() => navigate('/ihthisabi/districtadmin/submissions')}
                className="ih-stat-card min-w-0 cursor-pointer hover:shadow-md active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ih-stat-label truncate">
                      <span className="sm:hidden">This Period</span>
                      <span className="hidden sm:inline">This Period Submissions</span>
                    </p>
                    <p className="ih-stat-value mt-1">{stats.currentQuarterSubmissions}</p>
                    {stats.currentQuarter && (
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                        Q{stats.currentQuarter} {stats.currentYear}
                      </p>
                    )}
                  </div>
                  <div className="ih-stat-icon bg-[#7B4FF2]/10">
                    <FileText className="w-4 h-4 text-[#7B4FF2]" />
                  </div>
                </div>
              </div>

              <div className="ih-stat-card min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ih-stat-label truncate">
                      <span className="sm:hidden">Completion</span>
                      <span className="hidden sm:inline">Completion Rate</span>
                    </p>
                    <p className="ih-stat-value mt-1">{stats.completionRate}%</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                      {stats.currentQuarterSubmissions} of {stats.totalMembers} members
                    </p>
                  </div>
                  <div className="ih-stat-icon bg-[#7B4FF2]/10">
                    <BarChart3 className="w-4 h-4 text-[#7B4FF2]" />
                  </div>
                </div>
              </div>

              <div className="ih-stat-card min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ih-stat-label truncate">
                      <span className="sm:hidden">vs Prev Qtr</span>
                      <span className="hidden sm:inline">vs Previous Quarter</span>
                    </p>
                    <p className={`ih-stat-value mt-1 ${(stats.quarterChangePercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {(stats.quarterChangePercent ?? 0) >= 0 ? '+' : ''}{stats.quarterChangePercent ?? 0}%
                    </p>
                    {stats.prevQuarter && (
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                        {stats.previousQuarterSubmissions} in Q{stats.prevQuarter} {stats.prevYear}
                      </p>
                    )}
                  </div>
                  <div className={`ih-stat-icon ${(stats.quarterChangePercent ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <ArrowUpRight
                      className={`w-4 h-4 ${(stats.quarterChangePercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500 rotate-90'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${trend.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {trend.length > 1 && (
                <div className="ih-surface p-3 sm:p-5">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Submissions by Quarter</h2>
                  <p className="text-[11px] sm:text-xs text-gray-400 mb-3">Regular + alternative submissions across recent quarters</p>
                  <div className="h-48 sm:h-56 lg:h-72!">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="label" {...AXIS} interval={0} />
                        <YAxis {...AXIS} allowDecimals={false} />
                        <Tooltip {...TOOLTIP} />
                        <Bar dataKey="count" name="Submissions" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="ih-surface p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Area Breakdown</h2>
                    {breakdownPeriod && (
                      <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                        {getQuarterName(breakdownPeriod.quarter)} {breakdownPeriod.year} · tap an area for details
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={breakdownPeriod?.quarter || ''}
                      onChange={(e) => fetchDashboard({ quarter: Number(e.target.value), year: breakdownPeriod?.year || stats.currentYear })}
                      className="flex-1 sm:flex-none px-2 py-1.5 border border-gray-200 rounded-lg text-[13px] sm:text-xs focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
                    >
                      {getAvailableQuarters().map((q) => (
                        <option key={q} value={q}>{getQuarterName(q)}</option>
                      ))}
                    </select>
                    <select
                      value={breakdownPeriod?.year || ''}
                      onChange={(e) => fetchDashboard({ quarter: breakdownPeriod?.quarter || stats.currentQuarter, year: Number(e.target.value) })}
                      className="flex-1 sm:flex-none px-2 py-1.5 border border-gray-200 rounded-lg text-[13px] sm:text-xs focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
                    >
                      {(availableYears.length ? availableYears : [stats.currentYear].filter(Boolean)).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {areaBreakdown.length > 0 && (
                  <div
                    className={trend.length > 1 ? 'lg:h-72! lg:overflow-y-auto lg:pr-1' : ''}
                    style={{ height: Math.max(160, areaBreakdown.length * 26 + 40) }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={areaBreakdown.map((row) => ({
                          area: row.area || 'Unspecified',
                          Submitted: row.submissionCount,
                          Pending: Math.max(0, row.memberCount - row.submissionCount)
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid stroke="rgba(16,24,40,0.06)" horizontal={false} />
                        <XAxis type="number" {...AXIS} allowDecimals={false} />
                        <YAxis type="category" dataKey="area" width={90} {...AXIS} interval={0} />
                        <Tooltip {...TOOLTIP} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Submitted" stackId="a" fill={BRAND} maxBarSize={14} />
                        <Bar dataKey="Pending" stackId="a" fill={PENDING_GRAY} radius={[0, 4, 4, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="ih-surface p-3 sm:p-5">
              {/* Mobile: roomy tappable rows — one full-width target per area */}
              <div className="lg:hidden">
                {areaBreakdown.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No data available</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {areaBreakdown.map((row) => (
                      <button
                        key={row.area}
                        onClick={() => navigate(`/ihthisabi/districtadmin/areas/${encodeURIComponent(row.area || 'Unspecified')}?quarter=${breakdownPeriod?.quarter || ''}&year=${breakdownPeriod?.year || ''}`)}
                        className="w-full min-h-[56px] flex items-center gap-3 px-1 py-3 text-left active:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#7B4FF2] break-words leading-snug">{row.area || 'Unspecified'}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {row.memberCount} members · {row.submissionCount} submitted · {row.completionRate}%
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Desktop: table */}
              <table className="hidden lg:table w-full table-fixed text-[11px] sm:text-sm">
                <thead>
                  <tr className="text-left text-[9px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-1 sm:pr-4 w-[32%]">Area</th>
                    <th className="py-2 pr-1 sm:pr-4 w-[20%]">Members</th>
                    <th className="py-2 pr-1 sm:pr-4 w-[20%]"><span className="sm:hidden">Subs</span><span className="hidden sm:inline">Submissions</span></th>
                    <th className="py-2 pr-1 sm:pr-4 w-[20%]"><span className="sm:hidden">Compl.</span><span className="hidden sm:inline">Completion</span></th>
                    <th className="py-2 w-[8%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {areaBreakdown.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No data available</td></tr>
                  ) : areaBreakdown.map((row) => (
                    <tr
                      key={row.area}
                      onClick={() => navigate(`/ihthisabi/districtadmin/areas/${encodeURIComponent(row.area || 'Unspecified')}?quarter=${breakdownPeriod?.quarter || ''}&year=${breakdownPeriod?.year || ''}`)}
                      className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <td className="py-2.5 pr-1 sm:pr-4 font-medium text-[#7B4FF2] break-words">{row.area || 'Unspecified'}</td>
                      <td className="py-2.5 pr-1 sm:pr-4">{row.memberCount}</td>
                      <td className="py-2.5 pr-1 sm:pr-4">{row.submissionCount}</td>
                      <td className="py-2.5 pr-1 sm:pr-4">{row.completionRate}%</td>
                      <td className="py-2.5 text-right"><ChevronRight className="w-3.5 h-3.5 text-gray-300 inline" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ih-surface p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Submissions</h2>
              <div className="space-y-2">
                {recentSubmissions.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No recent submissions</p>
                ) : recentSubmissions.map((s) => (
                  <div key={s._id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.ruknName}</p>
                      <p className="text-xs text-gray-500 truncate">{s.area} · {s.unit} · {s.periodDisplay}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-800'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, RUKN ID, unit, area…"
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMembers(1)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              />
            </div>
            <select
              value={membersArea}
              onChange={(e) => setMembersArea(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            >
              <option value="">All Areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-3 sm:contents">
              <button
                onClick={() => fetchMembers(1)}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-[#7B4FF2] text-white rounded-lg text-sm font-medium hover:bg-[#6a3dd9]"
              >
                Apply
              </button>
              <button
                onClick={handlePrintMembers}
                disabled={printLoading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {printLoading ? 'Preparing…' : 'Print'}
              </button>
            </div>
          </div>

          <div className="ih-surface overflow-hidden">
            {/* Mobile: roomy tappable rows — one full-width target per member */}
            <div className="lg:hidden">
              {membersLoading ? (
                <p className="py-8 text-center text-sm text-gray-400">Loading members…</p>
              ) : members.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No members found</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => openMemberDetails(m)}
                      className="w-full min-h-[56px] flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#7B4FF2] break-words leading-snug">{m.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {m.ruknId} · {m.area} · {m.unit} · {m.submissionCount} submissions
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Desktop: table */}
            <div className="hidden lg:block lg:overflow-x-auto">
              <table className="ih-table-compact w-full table-fixed text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-3"><SortButton field="name" label="Name" activeSort={membersSort} onSort={toggleMembersSort} /></th>
                    <th className="text-left px-3 sm:px-4 py-3">RUKN ID</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="area" label="Area" activeSort={membersSort} onSort={toggleMembersSort} /></th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="unit" label="Unit" activeSort={membersSort} onSort={toggleMembersSort} /></th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="submissionCount" label="Submissions" activeSort={membersSort} onSort={toggleMembersSort} /></th>
                    <th className="text-left px-3 sm:px-4 py-3 print:hidden">View</th>
                  </tr>
                </thead>
                <tbody>
                  {membersLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading members…</td></tr>
                  ) : members.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No members found</td></tr>
                  ) : members.map((m) => (
                    <tr key={m._id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-3 sm:px-4 py-3 font-mono text-gray-600">{m.ruknId}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{m.area}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{m.unit}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{m.submissionCount}</td>
                      <td className="px-3 sm:px-4 py-3 print:hidden">
                        <button onClick={() => openMemberDetails(m)} className="text-[#7B4FF2] hover:underline inline-flex items-center gap-1 text-xs font-medium p-2 -m-2">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={membersPagination} onPageChange={fetchMembers} loading={membersLoading} itemLabel="members" />
          </div>

          {printMode === 'members' && (
            <div id="ida-printable" className="hidden print:block">
              <h2 className="text-lg font-bold mb-3">District Members — {district}</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Name</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">RUKN ID</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Area</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Unit</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {printMembers.map((m) => (
                    <tr key={m._id}>
                      <td className="px-2 py-1.5 border-b border-gray-100 font-medium">{m.name}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100 font-mono">{m.ruknId}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{m.area}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{m.unit}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{m.submissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 print:hidden">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, RUKN ID, unit, area…"
                value={submissionsSearch}
                onChange={(e) => setSubmissionsSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSubmissions(1)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              />
            </div>
            <select
              value={submissionsArea}
              onChange={(e) => setSubmissionsArea(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            >
              <option value="">All Areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-3 sm:contents">
              <select
                value={submissionsQuarter}
                onChange={(e) => setSubmissionsQuarter(e.target.value)}
                className="flex-1 min-w-0 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg text-[13px] sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              >
                <option value="">All Quarters</option>
                {getAvailableQuarters().map((q) => (
                  <option key={q} value={q}>{getQuarterName(q)}</option>
                ))}
              </select>
              <select
                value={submissionsYear}
                onChange={(e) => setSubmissionsYear(e.target.value)}
                className="flex-1 min-w-0 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg text-[13px] sm:text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              >
                <option value="">All Years</option>
                {(availableYears.length ? availableYears : [stats.currentYear].filter(Boolean)).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 sm:contents">
              <button
                onClick={() => fetchSubmissions(1)}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-[#7B4FF2] text-white rounded-lg text-sm font-medium hover:bg-[#6a3dd9]"
              >
                Apply
              </button>
              <button
                onClick={handlePrintSubmissions}
                disabled={printLoading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {printLoading ? 'Preparing…' : 'Print'}
              </button>
            </div>
          </div>

          <div className="ih-surface overflow-hidden">
            {/* Mobile: roomy tappable rows — one full-width target per submission */}
            <div className="lg:hidden">
              {submissionsLoading ? (
                <p className="py-8 text-center text-sm text-gray-400">Loading submissions…</p>
              ) : submissions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No submissions found</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {submissions.map((s) => (
                    <button
                      key={s.submissionId}
                      onClick={() => openSubmissionDetails(s.submissionId)}
                      className="w-full min-h-[56px] flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#7B4FF2] break-words leading-snug">{s.ruknName}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {s.ruknId} · {s.area} · {s.unit} · {s.quarter} · {s.status}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Desktop: table */}
            <div className="hidden lg:block lg:overflow-x-auto">
              <table className="ih-table-compact w-full table-fixed text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-3"><SortButton field="ruknName" label="Name" activeSort={submissionsSort} onSort={toggleSubmissionsSort} /></th>
                    <th className="text-left px-3 sm:px-4 py-3">RUKN ID</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="area" label="Area" activeSort={submissionsSort} onSort={toggleSubmissionsSort} /></th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="unit" label="Unit" activeSort={submissionsSort} onSort={toggleSubmissionsSort} /></th>
                    <th className="hidden sm:table-cell text-left px-4 py-3">Quarter</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3"><SortButton field="status" label="Status" activeSort={submissionsSort} onSort={toggleSubmissionsSort} /></th>
                    <th className="text-left px-3 sm:px-4 py-3 print:hidden">View</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionsLoading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading submissions…</td></tr>
                  ) : submissions.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No submissions found</td></tr>
                  ) : submissions.map((s) => (
                    <tr key={s.submissionId} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3 font-medium text-gray-900">{s.ruknName}</td>
                      <td className="px-3 sm:px-4 py-3 font-mono text-gray-600">{s.ruknId}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.area}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.unit}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.quarter}</td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-800'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 print:hidden">
                        <button onClick={() => openSubmissionDetails(s.submissionId)} className="text-[#7B4FF2] hover:underline inline-flex items-center gap-1 text-xs font-medium p-2 -m-2">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={submissionsPagination} onPageChange={fetchSubmissions} loading={submissionsLoading} itemLabel="submissions" />
          </div>

          {printMode === 'submissions' && (
            <div id="ida-printable" className="hidden print:block">
              <h2 className="text-lg font-bold mb-3">District Submissions — {district}</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Name</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">RUKN ID</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Area</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Unit</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Quarter</th>
                    <th className="text-left px-2 py-2 border-b border-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {printSubmissions.map((s) => (
                    <tr key={s.submissionId}>
                      <td className="px-2 py-1.5 border-b border-gray-100 font-medium">{s.ruknName}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100 font-mono">{s.ruknId}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{s.area}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{s.unit}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{s.quarter}</td>
                      <td className="px-2 py-1.5 border-b border-gray-100">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* District Replies Tab */}
      {activeTab === 'replies' && (
        <div className="ih-surface p-4 sm:p-5">
          {repliesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mr-2" /> Loading replies…
            </div>
          ) : replies.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No admin replies yet for units in this district</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => setSelectedReply(reply)}
                  className="w-full text-left rounded-lg border border-gray-100 hover:border-[#7B4FF2]/40 hover:bg-gray-50 px-4 py-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate min-w-0">{reply.unit}</p>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{formatDate(reply.repliedAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{reply.periodDisplay}</p>
                </button>
              ))}
            </div>
          )}
          <Pagination pagination={repliesPagination} onPageChange={fetchReplies} loading={repliesLoading} itemLabel="replies" />
        </div>
      )}

      {/* Alternative Submissions Tab */}
      {activeTab === 'alternative' && (
        <div className="ih-surface overflow-hidden">
          {altLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mr-2" /> Loading alternative submissions…
            </div>
          ) : (
            <>
              {/* Mobile: roomy tappable rows — one full-width target per submission */}
              <div className="lg:hidden">
                {altSubmissions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No alternative submissions found</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {altSubmissions.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => setSelectedAltSubmission(s)}
                        className="w-full min-h-[56px] flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#7B4FF2] break-words leading-snug">{s.ruknName || s.userId?.name}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {s.type} · {s.area} · {s.unit} · {s.periodDisplay}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Desktop: table */}
              <div className="hidden lg:block lg:overflow-x-auto">
                <table className="ih-table-compact w-full table-fixed text-[11px] sm:min-w-full sm:table-auto sm:text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 sm:px-4 py-3">Name</th>
                      <th className="hidden sm:table-cell text-left px-4 py-3">Type</th>
                      <th className="hidden sm:table-cell text-left px-4 py-3">Area</th>
                      <th className="hidden sm:table-cell text-left px-4 py-3">Unit</th>
                      <th className="hidden sm:table-cell text-left px-4 py-3">Quarter</th>
                      <th className="text-right px-3 sm:px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {altSubmissions.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">No alternative submissions found</td></tr>
                    ) : altSubmissions.map((s) => (
                      <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 sm:px-4 py-3 font-medium text-gray-900">{s.ruknName || s.userId?.name}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.type}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.area}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.unit}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{s.periodDisplay}</td>
                        <td className="px-3 sm:px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedAltSubmission(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#7B4FF2]/40 hover:text-[#7B4FF2] hover:bg-[#7B4FF2]/5 transition-colors text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <Pagination pagination={altPagination} onPageChange={fetchAlternativeSubmissions} loading={altLoading} itemLabel="submissions" />
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Member Details</h3>
              <button onClick={() => { setSelectedMember(null); setMemberDetails(null) }} className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-full">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {memberDetailsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin mr-2" /> Loading…
                </div>
              ) : memberDetails ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{memberDetails.name}</h4>
                    <p className="text-sm text-gray-500 font-mono">{memberDetails.ruknId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Area:</span> <span className="font-medium">{memberDetails.area}</span></div>
                    <div><span className="text-gray-400">Unit:</span> <span className="font-medium">{memberDetails.unit}</span></div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {memberDetails.contactNo || 'N/A'}</div>
                    <div className="flex items-center gap-1.5 min-w-0"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{memberDetails.emailId || 'N/A'}</span></div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Last login: {formatDate(memberDetails.lastLogin)}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-gray-50 py-3">
                      <p className="text-lg font-bold text-gray-900">{memberDetails.totalSubmissions}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 py-3">
                      <p className="text-lg font-bold text-gray-900">{memberDetails.submittedCount}</p>
                      <p className="text-xs text-gray-500">Submitted</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 py-3">
                      <p className="text-lg font-bold text-gray-900">{memberDetails.approvedCount}</p>
                      <p className="text-xs text-gray-500">Approved</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">Unable to load member details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Submission Details</h3>
              <button onClick={() => { setSelectedSubmissionId(null); setSubmissionDetails(null); setSubmissionFormSchema(null) }} className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-full">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {submissionDetailsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin mr-2" /> Loading…
                </div>
              ) : submissionDetails ? (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-lg font-bold text-gray-900 min-w-0 break-words">{submissionDetails.ruknName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[submissionDetails.status] || 'bg-gray-100 text-gray-800'}`}>
                      {submissionDetails.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                    <div><span className="text-gray-400">District:</span> <span className="font-medium">{submissionDetails.district}</span></div>
                    <div><span className="text-gray-400">Area:</span> <span className="font-medium">{submissionDetails.area}</span></div>
                    <div><span className="text-gray-400">Unit:</span> <span className="font-medium">{submissionDetails.unit}</span></div>
                    <div><span className="text-gray-400">Period:</span> <span className="font-medium">{submissionDetails.periodDisplay}</span></div>
                  </div>
                  <SubmissionReportView submission={submissionDetails} formSchema={submissionFormSchema} />
                  {submissionDetails.adminReply?.message && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Admin Reply</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{submissionDetails.adminReply.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">Unable to load submission details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reply Details Modal */}
      {selectedReply && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 min-w-0 truncate">{selectedReply.unit}</h3>
              <button onClick={() => setSelectedReply(null)} className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-full">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p className="text-xs text-gray-500">{selectedReply.periodDisplay} · Replied {formatDate(selectedReply.repliedAt)}</p>
              <div className="rounded-lg bg-gray-50 p-3 whitespace-pre-wrap text-gray-700">{selectedReply.formattedMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Submission Details Modal */}
      {selectedAltSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{selectedAltSubmission.ruknName || selectedAltSubmission.userId?.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAltSubmission.type}</p>
              </div>
              <button onClick={() => setSelectedAltSubmission(null)} className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-full">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-400">Area:</span> <span className="font-medium">{selectedAltSubmission.area}</span></div>
                <div><span className="text-gray-400">Unit:</span> <span className="font-medium">{selectedAltSubmission.unit}</span></div>
                <div><span className="text-gray-400">Quarter:</span> <span className="font-medium">{selectedAltSubmission.periodDisplay}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Reason</p>
                <div className="rounded-lg bg-gray-50 p-3 whitespace-pre-wrap text-gray-700">
                  {selectedAltSubmission.reason || 'No reason provided'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DistrictAdminDashboard
