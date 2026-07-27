import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
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
  Printer,
  X as CloseIcon,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import Pagination from '../../components/ihthisabi/Pagination'

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'submissions', label: 'Submissions', icon: FileText },
  { key: 'replies', label: 'District Replies', icon: MessageSquare },
  { key: 'alternative', label: 'Alternative Submissions', icon: Repeat }
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
  const [activeTab, setActiveTab] = useState('overview')
  const [areas, setAreas] = useState([])

  // Overview
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [district, setDistrict] = useState('')
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSubmissions: 0,
    submittedCount: 0,
    reviewedCount: 0,
    approvedCount: 0,
    completionRate: 0
  })
  const [areaBreakdown, setAreaBreakdown] = useState([])
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
  const [submissionsStatus, setSubmissionsStatus] = useState('')
  const [submissionsSort, setSubmissionsSort] = useState({ by: 'createdAt', dir: 'desc' })
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null)
  const [submissionDetails, setSubmissionDetails] = useState(null)
  const [submissionDetailsLoading, setSubmissionDetailsLoading] = useState(false)

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
  }, [submissionsArea, submissionsStatus, submissionsSort])

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

  const fetchDashboard = async () => {
    try {
      setDashboardLoading(true)
      const response = await api.get('/districtadmin/dashboard')
      if (response.data?.success) {
        const data = response.data.data
        setDistrict(data.district || '')
        setStats(data.stats || {})
        setAreaBreakdown(data.areaBreakdown || [])
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
          status: submissionsStatus || undefined,
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
    try {
      const response = await api.get(`/districtadmin/submissions/${submissionId}`)
      if (response.data?.success) setSubmissionDetails(response.data.data.submission)
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
        status: submissionsStatus || undefined,
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

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">District Admin Dashboard</h1>
        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
          <MapPin className="w-4 h-4 text-[#7B4FF2]" />
          {district || 'Loading district…'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#7B4FF2] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
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
            <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
              {[
                { label: 'Total Members', shortLabel: 'Members', value: stats.totalMembers, icon: Users },
                { label: 'Total Submissions', shortLabel: 'Submissions', value: stats.totalSubmissions, icon: FileText },
                { label: 'Completion Rate', shortLabel: 'Completion', value: `${stats.completionRate}%`, icon: BarChart3 },
                { label: 'Submitted', shortLabel: 'Submitted', value: stats.submittedCount, icon: FileText }
              ].map((card) => (
                <div key={card.label} className="min-w-0 bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm p-1.5 sm:p-4">
                  <div className="flex items-center gap-0.5 sm:gap-2 text-gray-500 mb-0.5 sm:mb-2">
                    <card.icon className="w-2.5 h-2.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="text-[7px] sm:text-xs font-semibold uppercase tracking-wide leading-tight">
                      <span className="sm:hidden">{card.shortLabel}</span>
                      <span className="hidden sm:inline">{card.label}</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-5">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Area Breakdown</h2>
              <table className="w-full table-fixed text-[11px] sm:text-sm">
                <thead>
                  <tr className="text-left text-[9px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-1 sm:pr-4 w-[34%]">Area</th>
                    <th className="py-2 pr-1 sm:pr-4 w-[22%]">Members</th>
                    <th className="py-2 pr-1 sm:pr-4 w-[22%]"><span className="sm:hidden">Subs</span><span className="hidden sm:inline">Submissions</span></th>
                    <th className="py-2 pr-1 sm:pr-4 w-[22%]"><span className="sm:hidden">Compl.</span><span className="hidden sm:inline">Completion</span></th>
                  </tr>
                </thead>
                <tbody>
                  {areaBreakdown.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-400">No data available</td></tr>
                  ) : areaBreakdown.map((row) => (
                    <tr key={row.area} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-1 sm:pr-4 font-medium text-gray-900 break-words">{row.area || 'Unspecified'}</td>
                      <td className="py-2 pr-1 sm:pr-4">{row.memberCount}</td>
                      <td className="py-2 pr-1 sm:pr-4">{row.submissionCount}</td>
                      <td className="py-2 pr-1 sm:pr-4">{row.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Submissions</h2>
              <div className="space-y-2">
                {recentSubmissions.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No recent submissions</p>
                ) : recentSubmissions.map((s) => (
                  <div key={s._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.ruknName}</p>
                      <p className="text-xs text-gray-500">{s.area} · {s.unit} · {s.periodDisplay}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-800'}`}>
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
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              />
            </div>
            <select
              value={membersArea}
              onChange={(e) => setMembersArea(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            >
              <option value="">All Areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={() => fetchMembers(1)}
              className="px-4 py-2 bg-[#7B4FF2] text-white rounded-lg text-sm font-medium hover:bg-[#6a3dd9]"
            >
              Apply
            </button>
            <button
              onClick={handlePrintMembers}
              disabled={printLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printLoading ? 'Preparing…' : 'Print'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
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
                        <button onClick={() => openMemberDetails(m)} className="text-[#7B4FF2] hover:underline inline-flex items-center gap-1 text-xs font-medium">
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
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
              />
            </div>
            <select
              value={submissionsArea}
              onChange={(e) => setSubmissionsArea(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            >
              <option value="">All Areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={submissionsStatus}
              onChange={(e) => setSubmissionsStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
            <button
              onClick={() => fetchSubmissions(1)}
              className="px-4 py-2 bg-[#7B4FF2] text-white rounded-lg text-sm font-medium hover:bg-[#6a3dd9]"
            >
              Apply
            </button>
            <button
              onClick={handlePrintSubmissions}
              disabled={printLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printLoading ? 'Preparing…' : 'Print'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
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
                        <button onClick={() => openSubmissionDetails(s.submissionId)} className="text-[#7B4FF2] hover:underline inline-flex items-center gap-1 text-xs font-medium">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{reply.unit}</p>
                    <span className="text-xs text-gray-400">{formatDate(reply.repliedAt)}</span>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {altLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mr-2" /> Loading alternative submissions…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#7B4FF2]/40 hover:text-[#7B4FF2] hover:bg-[#7B4FF2]/5 transition-colors text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <button onClick={() => { setSelectedMember(null); setMemberDetails(null) }} className="text-gray-400 hover:text-gray-600">
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
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {memberDetails.emailId || 'N/A'}</div>
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
              <button onClick={() => { setSelectedSubmissionId(null); setSubmissionDetails(null) }} className="text-gray-400 hover:text-gray-600">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {submissionDetailsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin mr-2" /> Loading…
                </div>
              ) : submissionDetails ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900">{submissionDetails.ruknName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[submissionDetails.status] || 'bg-gray-100 text-gray-800'}`}>
                      {submissionDetails.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-gray-400">District:</span> <span className="font-medium">{submissionDetails.district}</span></div>
                    <div><span className="text-gray-400">Area:</span> <span className="font-medium">{submissionDetails.area}</span></div>
                    <div><span className="text-gray-400">Unit:</span> <span className="font-medium">{submissionDetails.unit}</span></div>
                    <div><span className="text-gray-400">Period:</span> <span className="font-medium">{submissionDetails.periodDisplay}</span></div>
                  </div>
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{selectedReply.unit}</h3>
              <button onClick={() => setSelectedReply(null)} className="text-gray-400 hover:text-gray-600">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedAltSubmission.ruknName || selectedAltSubmission.userId?.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAltSubmission.type}</p>
              </div>
              <button onClick={() => setSelectedAltSubmission(null)} className="text-gray-400 hover:text-gray-600">
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
