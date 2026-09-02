import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../utils/ihthisabi/api'
import { 
  Users,
  FileText,
  Clock,
  Settings,
  Eye,
  Calendar,
  MapPin,
  ArrowUpRight,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  X as CloseIcon,
  Star,
  AlertCircle
} from 'lucide-react'
import { Q3_DISABLED } from '../../utils/ihthisabi/quarterHelper'
import Pagination from '../../components/ihthisabi/Pagination'

const UnitAdminDashboard = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [unit, setUnit] = useState('')
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
  const [members, setMembers] = useState([])
  const [membersPagination, setMembersPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [membersLoading, setMembersLoading] = useState(false)
  const [submissions, setSubmissions] = useState([])
  const [submissionsPagination, setSubmissionsPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberDetails, setMemberDetails] = useState(null)
  const [memberDetailsLoading, setMemberDetailsLoading] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [submissionDetails, setSubmissionDetails] = useState(null)
  const [submissionDetailsLoading, setSubmissionDetailsLoading] = useState(false)
  const [mySubmissions, setMySubmissions] = useState([])
  const [mySubmissionsPagination, setMySubmissionsPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(false)
  const [unitReplies, setUnitReplies] = useState([])
  const [unitRepliesPagination, setUnitRepliesPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [unitRepliesLoading, setUnitRepliesLoading] = useState(false)
  const [selectedReply, setSelectedReply] = useState(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [alternativeSubmissionsPagination, setAlternativeSubmissionsPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [alternativeSubmissionsLoading, setAlternativeSubmissionsLoading] = useState(false)
  const [selectedAlternativeSubmission, setSelectedAlternativeSubmission] = useState(null)
  const [showAlternativeSubmissionModal, setShowAlternativeSubmissionModal] = useState(false)
  const [alternativeSubmissionDetails, setAlternativeSubmissionDetails] = useState(null)
  const [alternativeSubmissionDetailsLoading, setAlternativeSubmissionDetailsLoading] = useState(false)
  const [dynamicFormSchema, setDynamicFormSchema] = useState(null)
  const [submissionsQuarterFilter, setSubmissionsQuarterFilter] = useState('all')
  const [submissionsYearFilter, setSubmissionsYearFilter] = useState('all')
  const [mySubmissionsQuarterFilter, setMySubmissionsQuarterFilter] = useState('all')
  const [mySubmissionsYearFilter, setMySubmissionsYearFilter] = useState('all')

  useEffect(() => {
    fetchDashboardData()
    fetchMembers(1)
    fetchUnitReplies(1)
    fetchAlternativeSubmissions(1)
    // fetchMySubmissions(1) is triggered by the filter-effect below, which also runs on mount
  }, [])

  useEffect(() => {
    // Set active tab based on URL
    const path = location.pathname
    if (path.includes('/submissions')) {
      setActiveTab('submissions')
    } else if (path.includes('/members')) {
      setActiveTab('members')
    } else {
      setActiveTab('overview')
    }
  }, [location.pathname])

  // Fetch (from page 1) on mount and when the filters change. The overview tab's
  // "Recent Submissions" reads this same list, so it must not wait for the
  // submissions tab to be opened.
  useEffect(() => {
    fetchSubmissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionsQuarterFilter, submissionsYearFilter])

  // Refetch my-submissions (from page 1) when its filters change
  useEffect(() => {
    fetchMySubmissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySubmissionsQuarterFilter, mySubmissionsYearFilter])

  const fetchMembers = async (page = 1) => {
    try {
      setMembersLoading(true)
      const response = await api.get('/unitadmin/members', { params: { page, limit: 10 } })
      if (response.data?.success) {
        setMembers(response.data.data.members || [])
        setMembersPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchSubmissions = async (page = submissionsPagination.current) => {
    try {
      setSubmissionsLoading(true)
      const params = { page, limit: 10 }
      if (submissionsQuarterFilter !== 'all') params.quarter = submissionsQuarterFilter
      if (submissionsYearFilter !== 'all') params.year = submissionsYearFilter

      const response = await api.get('/unitadmin/submissions', { params })

      if (response.data?.success) {
        const submissionsData = response.data.data
        setSubmissions(submissionsData.submissions || [])
        setSubmissionsPagination(submissionsData.pagination || { current: 1, pages: 1, total: 0 })
      } else {
        console.error('Failed to fetch submissions:', response.status)
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No token found')
        return
      }
      
      // Set authorization header for all requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      const dashboardResponse = await api.get('/unitadmin/dashboard')

      if (dashboardResponse.data?.success) {
        const dashboardData = dashboardResponse.data
        const dashboardStats = dashboardData.data?.stats
        setUnit(dashboardData.data?.unit || '')
        if (dashboardStats) {
          setStats({
            totalMembers: dashboardStats.totalMembers || 0,
            currentQuarterSubmissions: dashboardStats.currentQuarterSubmissions || 0,
            previousQuarterSubmissions: dashboardStats.previousQuarterSubmissions || 0,
            quarterChangePercent: dashboardStats.quarterChangePercent ?? 0,
            submittedCount: dashboardStats.submittedCount || 0,
            reviewedCount: dashboardStats.reviewedCount || 0,
            approvedCount: dashboardStats.approvedCount || 0,
            completionRate: dashboardStats.completionRate || 0,
            currentQuarter: dashboardStats.currentQuarter || null,
            currentYear: dashboardStats.currentYear || null,
            prevQuarter: dashboardStats.prevQuarter || null,
            prevYear: dashboardStats.prevYear || null
          })
        }
      } else {
        console.error('Failed to fetch dashboard stats:', dashboardResponse.status)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const handleMemberClick = async (member) => {
    // Use member data from the list directly (already available)
    console.log('Member from list:', member)
    setSelectedMember(member)
    setMemberDetails(member)
    
    // Optionally try to fetch additional details if needed
    // But use the list data immediately so user sees info right away
    try {
      setMemberDetailsLoading(true)
      const response = await api.get(`/unitadmin/members/${member._id}`)
      console.log('Member details API response:', response.data)

      if (response.data?.success) {
        // Handle different possible response structures
        const memberData = response.data.data?.member || response.data.data || response.data
        console.log('Extracted member data from API:', memberData)
        // Merge with existing member data, prioritizing API response
        setMemberDetails({ ...member, ...memberData })
      }
    } catch (error) {
      console.error('Error fetching member details (using list data):', error)
      console.log('Using member data from list:', member)
      // Already using member data from list, so no need to set again
    } finally {
      setMemberDetailsLoading(false)
    }
  }

  const closeMemberModal = () => {
    setShowMemberModal(false)
    setSelectedMember(null)
    setMemberDetails(null)
  }

  const handleSubmissionClick = async (submission) => {
    try {
      setSubmissionDetailsLoading(true)
      setDynamicFormSchema(null)
      setSelectedSubmission(submission)
      setShowSubmissionModal(true)

      // Use submissionId if available, otherwise fall back to _id
      const submissionId = submission.submissionId || submission._id
      if (!submissionId) {
        console.error('No submission ID found:', submission)
        return
      }

      const response = await api.get(`/unitadmin/submissions/${submissionId}`)

      if (response.data?.success) {
        const details = response.data.data
        setSubmissionDetails(details)

        // Fetch dynamic form schema for the quarter
        const sub = details?.submission
        if (sub?.submissionPeriod?.quarter && sub?.submissionPeriod?.year) {
          try {
            const formRes = await api.get(
              `/ihthisabi/application-forms/public/by-quarter/${sub.submissionPeriod.quarter}/${sub.submissionPeriod.year}`
            )
            if (formRes.data?.hasDynamicForm && formRes.data?.data) {
              setDynamicFormSchema(formRes.data.data)
            }
          } catch {
            // schema unavailable — fallback rendering will be used
          }
        }
      } else {
        console.error('Failed to fetch submission details:', response.status)
      }
    } catch (error) {
      console.error('Error fetching submission details:', error)
    } finally {
      setSubmissionDetailsLoading(false)
    }
  }

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false)
    setSelectedSubmission(null)
    setSubmissionDetails(null)
    setDynamicFormSchema(null)
  }

  const fetchMySubmissions = async (page = mySubmissionsPagination.current) => {
    try {
      setMySubmissionsLoading(true)
      const params = { page, limit: 10 }
      if (mySubmissionsQuarterFilter !== 'all') params.quarter = mySubmissionsQuarterFilter
      if (mySubmissionsYearFilter !== 'all') params.year = mySubmissionsYearFilter
      const response = await api.get('/unitadmin/my-submissions', { params })
      if (response.data?.success) {
        setMySubmissions(response.data.data.submissions || [])
        setMySubmissionsPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch my submissions:', error)
    } finally {
      setMySubmissionsLoading(false)
    }
  }

  const handleNewSubmission = () => {
    navigate('/ihthisabi/unitadmin/submit-form')
  }

  const fetchUnitReplies = async (page = 1) => {
    try {
      setUnitRepliesLoading(true)
      const response = await api.get('/unitadmin/replies', { params: { page, limit: 10 } })
      if (response.data?.success) {
        setUnitReplies(response.data.data.replies || [])
        setUnitRepliesPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch unit replies:', error)
    } finally {
      setUnitRepliesLoading(false)
    }
  }

  const handleReplyClick = (reply) => {
    setSelectedReply(reply)
    setShowReplyModal(true)
  }

  const closeReplyModal = () => {
    setShowReplyModal(false)
    setSelectedReply(null)
  }

  const fetchAlternativeSubmissions = async (page = 1) => {
    try {
      setAlternativeSubmissionsLoading(true)
      const response = await api.get('/unitadmin/alternative-submissions', { params: { page, limit: 10 } })
      if (response.data?.success) {
        setAlternativeSubmissions(response.data.data.alternativeSubmissions || [])
        setAlternativeSubmissionsPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch alternative submissions:', error)
    } finally {
      setAlternativeSubmissionsLoading(false)
    }
  }

  const handleAlternativeSubmissionClick = async (submission) => {
    try {
      setAlternativeSubmissionDetailsLoading(true)
      setSelectedAlternativeSubmission(submission)
      setShowAlternativeSubmissionModal(true)

      const response = await api.get(`/alternative-submissions/${submission._id}`)

      if (response.data?.success) {
        setAlternativeSubmissionDetails(response.data.data)
      } else {
        console.error('Failed to fetch alternative submission details:', response.status)
      }
    } catch (error) {
      console.error('Error fetching alternative submission details:', error)
    } finally {
      setAlternativeSubmissionDetailsLoading(false)
    }
  }

  const closeAlternativeSubmissionModal = () => {
    setShowAlternativeSubmissionModal(false)
    setSelectedAlternativeSubmission(null)
    setAlternativeSubmissionDetails(null)
  }

  // Extract quarter number and year from a submission, with fallback to parsing the quarter string
  const getSubmissionPeriod = (s) => {
    if (s.submissionPeriod?.quarter && s.submissionPeriod?.year) {
      return { quarter: String(s.submissionPeriod.quarter), year: String(s.submissionPeriod.year) }
    }
    // Fallback: parse strings like "Q1 (Jan-Mar) 2026" or "Q2 (Apr-Jun) 2025"
    const str = s.periodDisplay || s.quarter || ''
    const qMatch = str.match(/Q(\d)/)
    const yMatch = str.match(/\b(20\d{2})\b/)
    return {
      quarter: qMatch ? qMatch[1] : null,
      year: yMatch ? yMatch[1] : null
    }
  }

  // Static year range — submissions/mySubmissions now hold only the current server
  // page, filtered by quarter/year on the backend, so these are used as-is below.
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [])
  const submissionYears = yearOptions
  const mySubmissionYears = yearOptions
  const filteredUnitSubmissions = submissions
  const filteredMySubmissions = mySubmissions
  const paginatedMembers = members
  const paginatedUnitSubmissions = submissions

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ih-page-shell">
        {/* Header */}
        <div className="mb-2 sm:mb-4 hidden lg:block">
          {/* The mobile app bar already names the page and shows the unit, so this header is desktop-only. */}
          <h1 className="ih-page-title">Unit Admin Dashboard</h1>
          <p className="ih-page-subtitle">
            Welcome back, <span className="font-medium text-gray-900">{user?.name || 'Unit Admin'}</span>
          </p>
          <p className="ih-page-subtitle flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0 text-[#7B4FF2]" />
            <span className="truncate">{unit || 'Loading unit…'}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div
            onClick={() => navigate('/ihthisabi/unitadmin/details?section=all')}
            className="ih-stat-card cursor-pointer hover:shadow-md active:scale-[0.99] transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="ih-stat-label truncate">
                  <span className="sm:hidden">Members</span>
                  <span className="hidden sm:inline">Total Members</span>
                </p>
                <p className="ih-stat-value mt-1">{stats.totalMembers}</p>
              </div>
              <div className="ih-stat-icon bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/ihthisabi/unitadmin/details?section=submitted')}
            className="ih-stat-card cursor-pointer hover:shadow-md active:scale-[0.99] transition"
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
              <div className="ih-stat-icon bg-green-50 text-green-600">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="ih-stat-card">
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
              <div className="ih-stat-icon bg-orange-50 text-orange-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="ih-stat-card">
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
                  className={`h-4 w-4 ${(stats.quarterChangePercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500 rotate-90'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-transparent bg-gradient-to-r from-[#1A2434] to-[#101828] rounded-t-3xl shadow-sm">
            <nav className="ih-mobile-tabs -mb-px px-3 sm:px-6 text-white/80">
              <button
                onClick={() => setActiveTab('overview')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'overview'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('my-submissions')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'my-submissions'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">My Submissions ({mySubmissionsPagination.total})</span>
                <span className="sm:hidden">My Forms</span>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'members'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">Members ({membersPagination.total})</span>
                <span className="sm:hidden">Members</span>
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'submissions'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">Unit Submissions ({submissionsPagination.total})</span>
                <span className="sm:hidden">Unit Forms</span>
              </button>
              <button
                onClick={() => setActiveTab('admin-replies')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'admin-replies'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">
                  Submission Replies ({submissions.filter(s => s.adminReply?.message).length})
                </span>
                <span className="sm:hidden">S. Replies</span>
              </button>
              <button
                onClick={() => setActiveTab('unit-replies')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'unit-replies'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">
                  Unit Replies ({unitRepliesPagination.total})
                </span>
                <span className="sm:hidden">U. Replies</span>
              </button>
              <button
                onClick={() => setActiveTab('alternative-submissions')}
                className={`shrink-0 min-h-[44px] py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition ${
                  activeTab === 'alternative-submissions'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="hidden sm:inline">
                  Alternate Submissions ({alternativeSubmissionsPagination.total})
                </span>
                <span className="sm:hidden">Alt. Forms</span>
              </button>
            </nav>
          </div>

          <div className="p-3 sm:p-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Submissions</h3>
                  {submissions.slice(0, 5).length > 0 ? (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map((submission) => {
                        const submissionId = submission.submissionId || submission._id
                        return (
                          <div key={submissionId} className="flex flex-col items-start justify-between gap-3 p-4 bg-gray-50 rounded-lg sm:flex-row sm:items-center">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <FileText className="h-5 w-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {submission.ruknName || submission.submittedBy?.name || 'Unknown Member'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {submission.quarter || submission.periodDisplay || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:space-x-4">
                              {submission.status && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                                  {submission.status}
                                </span>
                              )}
                              {submission.createdAt && (
                                <span className="text-sm text-gray-500">
                                  {formatDate(submission.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No submissions yet</p>
                  )}
                </div>
              </div>
            )}

            {/* My Submissions Tab */}
            {activeTab === 'my-submissions' && (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    My Submissions
                    {(mySubmissionsQuarterFilter !== 'all' || mySubmissionsYearFilter !== 'all') && (
                      <span className="ml-2 text-sm font-normal text-blue-600">
                        ({mySubmissionsPagination.total} matching)
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <select
                      value={mySubmissionsYearFilter}
                      onChange={(e) => setMySubmissionsYearFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-2.5 lg:py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Years</option>
                      {mySubmissionYears.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={mySubmissionsQuarterFilter}
                      onChange={(e) => setMySubmissionsQuarterFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-2.5 lg:py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Quarters</option>
                      <option value="1">Q1 (Jan–Mar)</option>
                      <option value="2">Q2 (Apr–Jun)</option>
                      {!Q3_DISABLED && <option value="3">Q3 (Jul–Sep)</option>}
                      <option value="4">Q4 (Oct–Dec)</option>
                    </select>
                    {(mySubmissionsQuarterFilter !== 'all' || mySubmissionsYearFilter !== 'all') && (
                      <button
                        onClick={() => { setMySubmissionsQuarterFilter('all'); setMySubmissionsYearFilter('all') }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2.5 lg:py-1.5 border border-gray-200 rounded-lg flex items-center gap-1"
                      >
                        <CloseIcon className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleNewSubmission}
                      className="px-4 py-2.5 lg:py-2 text-sm font-semibold text-white bg-[#161F2F] hover:bg-[#1a2538] rounded-lg transition-colors duration-200 flex items-center w-full justify-center sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Submission
                    </button>
                  </div>
                </div>
                
                {mySubmissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your submissions...</p>
                  </div>
                ) : filteredMySubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredMySubmissions.map((submission) => (
                      <div key={submission._id} className="flex flex-col items-start justify-between gap-3 p-4 bg-gray-50 rounded-lg sm:flex-row sm:items-center">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {submission.periodDisplay || 'Quarterly Report'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(submission.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:space-x-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                            {submission.status}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/ihthisabi/unitadmin/submission-details/${submission._id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/ihthisabi/unitadmin/submit-form?edit=${submission._id}`)}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                              title="Edit Submission"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (mySubmissionsQuarterFilter !== 'all' || mySubmissionsYearFilter !== 'all') ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No submissions match the selected period.</p>
                    <button
                      onClick={() => { setMySubmissionsQuarterFilter('all'); setMySubmissionsYearFilter('all') }}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first quarterly report.</p>
                    <div className="mt-6">
                      <button
                        onClick={handleNewSubmission}
                        className="btn-primary"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Submission
                      </button>
                    </div>
                  </div>
                )}
                <Pagination pagination={mySubmissionsPagination} onPageChange={fetchMySubmissions} loading={mySubmissionsLoading} itemLabel="submissions" />
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-2.5 md:space-y-4 md:rounded-3xl md:border md:border-gray-200 md:bg-white md:p-5 md:shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 sm:text-lg">Unit Members</h3>
                      <p className="text-[11px] text-gray-500 sm:text-sm">{membersPagination.total} members</p>
                    </div>
                  </div>

                  <div className="ih-list md:hidden">
                    {paginatedMembers.map((member) => {
                      const isSelected = selectedMember?._id === member._id

                      return (
                        <div key={member._id} className={isSelected ? 'bg-blue-50/50' : ''}>
                          <div className="ih-list-row">
                            <div className="ih-avatar bg-[#161F2F]/10 text-[#161F2F]">
                              {(member.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="ih-list-title">{member.name}</div>
                              <div className="ih-list-meta">
                                {member.ruknId || 'N/A'} · {member.role || member.position || 'Member'}
                              </div>
                            </div>
                            <span className={`ih-chip ${member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {member.status || 'Active'}
                            </span>
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedMember(null)
                                  setMemberDetails(null)
                                } else {
                                  handleMemberClick(member)
                                }
                              }}
                              title={isSelected ? 'Hide details' : 'View details'}
                              className={`ih-icon-btn ${isSelected ? 'bg-blue-100 text-blue-600' : 'hover:bg-blue-50 hover:text-blue-600'}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                          {isSelected && (
                            <div className="bg-blue-50/50 px-3 pb-3 text-[11px] text-gray-700 break-words">
                              {memberDetailsLoading ? (
                                <p className="text-[11px] text-gray-500">Loading details…</p>
                              ) : memberDetails ? (
                                <div className="grid gap-1">
                                  <p><span className="font-semibold text-gray-900">Email:</span> {memberDetails?.emailId || memberDetails?.email || memberDetails?.emailAddress || '-'}</p>
                                  <p><span className="font-semibold text-gray-900">Phone:</span> {memberDetails?.contactNo || memberDetails?.mobile || memberDetails?.phone || memberDetails?.phoneNumber || '-'}</p>
                                  <p><span className="font-semibold text-gray-900">Unit:</span> {memberDetails?.unit || memberDetails?.unitName || '-'}</p>
                                  <p><span className="font-semibold text-gray-900">District:</span> {memberDetails?.district || memberDetails?.districtName || '-'}</p>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedMembers.map((member) => (
                      <React.Fragment key={member._id}>
                        <tr
                          className={`transition-colors duration-200 ${
                            selectedMember?._id === member._id ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                            <td className="px-3 py-4 text-sm text-gray-900">
                              <div className="font-semibold">{member.name}</div>
                            </td>
                          <td className="px-3 py-4 text-sm text-gray-900">{member.ruknId}</td>
                          <td className="px-3 py-4 text-sm text-gray-900">{member.role || member.position || 'Member'}</td>
                          <td className="px-3 py-4 text-sm text-gray-900">{member.unit}</td>
                          <td className="px-3 py-4 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {member.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <button
                              onClick={() => handleMemberClick(member)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#161F2F] text-white rounded-full text-xs font-semibold hover:bg-[#1a2538]"
                            >
                              <Eye className="w-3 h-3" />
                              View Details
                            </button>
                          </td>
                        </tr>
                        {selectedMember?._id === member._id && memberDetails && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4">
                              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-gray-700 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-gray-900">Detailed Information</h4>
                                  <button
                                    onClick={() => {
                                      setSelectedMember(null)
                                      setMemberDetails(null)
                                    }}
                                    className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                                  >
                                    Close
                                  </button>
                                </div>
                                {memberDetailsLoading ? (
                                  <p className="text-xs text-gray-500">Loading member details…</p>
                                ) : (
                                  <div className="grid gap-1 sm:grid-cols-2">
                                    <p className="text-xs"><span className="font-semibold text-gray-900">Email:</span> {memberDetails?.emailId || memberDetails?.email || memberDetails?.emailAddress || '-'}</p>
                                    <p className="text-xs"><span className="font-semibold text-gray-900">Phone:</span> {memberDetails?.contactNo || memberDetails?.mobile || memberDetails?.phone || memberDetails?.phoneNumber || '-'}</p>
                                    <p className="text-xs"><span className="font-semibold text-gray-900">Role:</span> {memberDetails?.role || memberDetails?.position || '-'}</p>
                                    <p className="text-xs"><span className="font-semibold text-gray-900">Status:</span> {memberDetails?.status || 'Active'}</p>
                                    <p className="text-xs"><span className="font-semibold text-gray-900">Unit:</span> {memberDetails?.unit || memberDetails?.unitName || '-'}</p>
                                    <p className="text-xs"><span className="font-semibold text-gray-900">District:</span> {memberDetails?.district || memberDetails?.districtName || '-'}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination pagination={membersPagination} onPageChange={fetchMembers} loading={membersLoading} itemLabel="members" />
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                {/* Header + Filters */}
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    All Submissions
                    {(submissionsQuarterFilter !== 'all' || submissionsYearFilter !== 'all') && (
                      <span className="ml-2 text-sm font-normal text-blue-600">
                        ({filteredUnitSubmissions.length} of {submissions.length})
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <select
                      value={submissionsYearFilter}
                      onChange={(e) => setSubmissionsYearFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-2.5 lg:py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Years</option>
                      {submissionYears.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={submissionsQuarterFilter}
                      onChange={(e) => setSubmissionsQuarterFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-2.5 lg:py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Quarters</option>
                      <option value="1">Q1 (Jan–Mar)</option>
                      <option value="2">Q2 (Apr–Jun)</option>
                      {!Q3_DISABLED && <option value="3">Q3 (Jul–Sep)</option>}
                      <option value="4">Q4 (Oct–Dec)</option>
                    </select>
                    {(submissionsQuarterFilter !== 'all' || submissionsYearFilter !== 'all') && (
                      <button
                        onClick={() => { setSubmissionsQuarterFilter('all'); setSubmissionsYearFilter('all') }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2.5 lg:py-1.5 border border-gray-200 rounded-lg flex items-center gap-1"
                      >
                        <CloseIcon className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading submissions...</p>
                  </div>
                ) : filteredUnitSubmissions.length > 0 ? (
                  <>
                    <div className="ih-list md:hidden">
                      {paginatedUnitSubmissions.map((submission) => {
                        const submissionId = submission.submissionId || submission._id
                        const period = getSubmissionPeriod(submission)

                        return (
                          <div key={submissionId} className="ih-list-row">
                            <div className="ih-avatar bg-[#161F2F]/10 text-[#161F2F]">
                              {(submission.ruknName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="ih-list-title">
                                {submission.ruknName || 'Unknown Member'}
                              </div>
                              <div className="ih-list-meta">
                                {submission.ruknId || 'N/A'} · {submission.quarter || submission.periodDisplay || 'N/A'}
                              </div>
                            </div>
                            <span className="ih-chip bg-blue-50 font-semibold text-blue-700">
                              {period.quarter ? `Q${period.quarter}` : 'Form'}
                            </span>
                            <button
                              onClick={() => handleSubmissionClick(submission)}
                              title="View details"
                              className="ih-icon-btn hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rukn Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rukn ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quarter</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {paginatedUnitSubmissions.map((submission) => {
                            const submissionId = submission.submissionId || submission._id
                            return (
                              <tr key={submissionId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                  {submission.ruknName || 'Unknown Member'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {submission.ruknId || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {submission.quarter || submission.periodDisplay || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleSubmissionClick(submission)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#161F2F] hover:bg-[#1a2538] rounded-lg transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Pagination pagination={submissionsPagination} onPageChange={fetchSubmissions} loading={submissionsLoading} itemLabel="submissions" />
                  </>
                ) : (submissionsQuarterFilter !== 'all' || submissionsYearFilter !== 'all') ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No submissions match the selected period.</p>
                    <button
                      onClick={() => { setSubmissionsQuarterFilter('all'); setSubmissionsYearFilter('all') }}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No submissions found</p>
                )}
              </div>
            )}

            {/* Unit Replies Tab - Structured replies from admin */}
            {activeTab === 'unit-replies' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Unit Replies</h3>
                </div>
                {unitRepliesLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading unit replies...</p>
                  </div>
                ) : unitReplies.length > 0 ? (
                  <div className="space-y-4">
                    {unitReplies.map((reply) => (
                      <div 
                        key={reply.id} 
                        className="border-2 border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors duration-200 bg-gradient-to-r from-blue-50 to-indigo-50"
                        onClick={() => handleReplyClick(reply)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Quarterly Reply - {reply.periodDisplay}
                                </h4>
                                <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                <div>
                                  <span className="font-medium">Unit:</span> {reply.unit || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">District:</span> {reply.district || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Period:</span> {reply.periodDisplay || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Replied:</span> {formatDate(reply.repliedAt)}
                                </div>
                              </div>
                              {reply.formattedMessage && (
                                <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-blue-900">
                                      Reply from Admin
                                      {reply.repliedBy && (
                                        <span className="text-blue-700 ml-1">
                                          ({reply.repliedBy.name || reply.repliedBy.username})
                                        </span>
                                      )}
                                    </span>
                                    {reply.whatsappSent && (
                                      <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                        WhatsApp Sent
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">
                                    {reply.formattedMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplyClick(reply);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              View Full Reply
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Unit Replies Yet</h3>
                    <p className="text-gray-600 text-sm">
                      Structured quarterly replies from admin will appear here once they are sent for your unit.
                    </p>
                  </div>
                )}
                <Pagination pagination={unitRepliesPagination} onPageChange={fetchUnitReplies} loading={unitRepliesLoading} itemLabel="replies" />
              </div>
            )}

            {/* Admin Replies Tab - Individual submission replies */}
            {activeTab === 'admin-replies' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Admin Replies</h3>
                </div>
                {submissions.filter(s => s.adminReply?.message).length > 0 ? (
                  <div className="space-y-4">
                    {submissions
                      .filter((s) => s.adminReply?.message)
                      .map((submission) => {
                        const submissionId = submission.submissionId || submission._id
                        return (
                          <div
                            key={submissionId}
                            className="border-2 border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors duration-200 bg-gradient-to-r from-blue-50 to-indigo-50"
                            onClick={() => handleSubmissionClick(submission)}
                          >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {(submission.ruknName || submission.submittedBy?.name)?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    {submission.ruknName || submission.submittedBy?.name || 'Unknown Member'}
                                  </h4>
                                  <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                  <div>
                                    <span className="font-medium">RUKN ID:</span> {submission.ruknId || submission.submittedBy?.ruknId || submission.userId?.ruknId || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Unit:</span> {submission.unit || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Period:</span> {submission.periodDisplay || submission.quarter || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Submitted:</span> {submission.createdAt ? formatDate(submission.createdAt) : 'N/A'}
                                  </div>
                                </div>
                                {submission.adminReply?.message && (
                                  <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-blue-900">
                                        Reply from Admin
                                        {submission.adminReply.repliedBy && (
                                          <span className="text-blue-700 ml-1">
                                            ({submission.adminReply.repliedBy.name || submission.adminReply.repliedBy.username})
                                          </span>
                                        )}
                                      </span>
                                      {submission.adminReply.repliedAt && (
                                        <span className="text-[10px] text-gray-500">
                                          {formatDate(submission.adminReply.repliedAt)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                                      {submission.adminReply.message}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-3">
                              {submission.status && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                                  {submission.status}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmissionClick(submission);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              >
                                View Details
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Admin Replies Yet</h3>
                    <p className="text-gray-600 text-sm">
                      Admin replies will appear here once the admin provides feedback on submissions.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Alternative Submissions Tab */}
            {activeTab === 'alternative-submissions' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Alternative Submissions</h3>
                </div>
                {alternativeSubmissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading alternative submissions...</p>
                  </div>
                ) : alternativeSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {alternativeSubmissions.map((submission) => (
                      <div 
                        key={submission._id} 
                        className="border border-purple-200 rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition-colors duration-200 bg-purple-50/30"
                        onClick={() => handleAlternativeSubmissionClick(submission)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-purple-600">
                                  {(submission.ruknName || submission.userId?.name)?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {submission.ruknName || submission.userId?.name || 'Unknown Member'}
                              </h4>
                              <p className="text-xs text-gray-500">
                                RUKN ID: {submission.userId?.ruknId || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {submission.type || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(submission.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Period:</span> {submission.periodDisplay || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Unit:</span> {submission.unit || 'N/A'}
                          </div>
                          {submission.reason && (
                            <div className="col-span-2">
                              <span className="font-medium">Reason:</span> 
                              <span className="ml-1 text-gray-700 line-clamp-1">{submission.reason}</span>
                            </div>
                          )}
                        </div>
                        {submission.adminReply?.message && (
                          <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-900">
                                Admin Reply
                                {submission.adminReply.repliedBy && (
                                  <span className="text-blue-700 ml-1">
                                    ({submission.adminReply.repliedBy.name || submission.adminReply.repliedBy.username})
                                  </span>
                                )}
                              </span>
                              {submission.adminReply.repliedAt && (
                                <span className="text-[10px] text-gray-500">
                                  {formatDate(submission.adminReply.repliedAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                              {submission.adminReply.message}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlternativeSubmissionClick(submission);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                          >
                            View Details
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Alternative Submissions</h3>
                    <p className="text-gray-600 text-sm">
                      Alternative submissions from your unit members will appear here.
                    </p>
                  </div>
                )}
                <Pagination pagination={alternativeSubmissionsPagination} onPageChange={fetchAlternativeSubmissions} loading={alternativeSubmissionsLoading} itemLabel="submissions" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission Details Drawer */}
      {showSubmissionModal && (
        <div className="fixed inset-0 z-40">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeSubmissionModal}></div>
          {/* panel */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-[560px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Submission Details</h3>
                {submissionDetails?.submission?.periodDisplay && (
                  <p className="text-xs text-gray-500">{submissionDetails.submission.periodDisplay}</p>
                )}
              </div>
              <button onClick={closeSubmissionModal} className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Q3 Disabled Warning */}
            {Q3_DISABLED && submissionDetails?.submission?.submissionPeriod?.quarter === 3 && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Q3 submissions are currently disabled and hidden from public view.</span>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">

              {submissionDetailsLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading…</div>
              ) : !submissionDetails ? (
                <div className="text-center text-gray-500 text-sm">No data</div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const sub = submissionDetails.submission || {};
                    const form = sub.form || {};
                    const isDynamicSubmission = !!(sub.dynamicFormId && sub.dynamicFormData);

                    const getLabel = (val) => {
                      const labels = {
                        'complete': 'പൂർണം', 'partial': 'ഭാഗികം', 'notread': 'വായിച്ചില്ല',
                        'incomplete': 'അപൂർണം', 'yes': 'അതെ', 'no': 'ഇല്ല',
                        'satisfactory': 'തൃപ്തികരം', 'unsatisfactory': 'തൃപ്തികരമല്ല',
                        'notApplicable': 'ബാധകമല്ല', 'almost': 'ഏറെക്കുറെ', 'small': 'ചെറിയ തോതിൽ',
                        'none': '-'
                      };
                      return labels[val] || val;
                    };

                    const renderDynamicFields = () => {
                      const data = sub.dynamicFormData || {};
                      if (dynamicFormSchema) {
                        const questions = [...(dynamicFormSchema.questions || [])].sort((a, b) => a.order - b.order);
                        if (!questions.length) return <p className="text-xs text-gray-500">No form data available</p>;
                        return questions.map((question, index) => {
                          const qId = question.questionId;
                          const value = data[qId];
                          const label = question.questionTextMl || question.questionText;
                          let displayElement;
                          if (question.answerType === 'group') {
                            displayElement = (
                              <div className="grid grid-cols-3 gap-2">
                                {question.subFields?.map((sf, sfIdx) => {
                                  const fId = sf.fieldId || `field_${sfIdx}`;
                                  return (
                                    <div key={fId} className="bg-gray-50 rounded px-2 py-2 text-center">
                                      <p className="text-[10px] text-gray-600 mb-0.5">{sf.labelMl || sf.label}</p>
                                      <p className="font-bold text-lg text-gray-900">{(value || {})[fId] ?? 0}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else if (question.answerType === 'radio' || question.answerType === 'dropdown') {
                            const opt = question.options?.find(o => o.value === value);
                            displayElement = (
                              <div className="bg-gray-50 rounded px-3 py-2">
                                <span className="text-xs font-semibold text-gray-900">{opt ? (opt.labelMl || opt.label) : (value || '-')}</span>
                              </div>
                            );
                          } else if (question.answerType === 'checkbox') {
                            const selected = Array.isArray(value) ? value : [];
                            const display = selected.length
                              ? selected.map(v => { const o = question.options?.find(opt => opt.value === v); return o ? (o.labelMl || o.label) : v; }).join(', ')
                              : '-';
                            displayElement = (
                              <div className="bg-gray-50 rounded px-3 py-2">
                                <span className="text-xs font-semibold text-gray-900">{display}</span>
                              </div>
                            );
                          } else if (question.answerType === 'star') {
                            const starMax = question.max || 5;
                            displayElement = (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: starMax }, (_, i) => i + 1).map(star => (
                                  <Star key={star} className={`w-4 h-4 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                ))}
                                {value > 0 && <span className="ml-1 text-xs text-gray-500">{value}/{starMax}</span>}
                              </div>
                            );
                          } else if (question.answerType === 'number') {
                            displayElement = <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>;
                          } else {
                            displayElement = (
                              <div className="bg-gray-50 rounded px-3 py-2">
                                <span className="text-xs font-semibold text-gray-900">{String(value || '-')}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={qId} className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">{index + 1}. {label}</h4>
                              {displayElement}
                            </div>
                          );
                        });
                      }
                      // Fallback: no schema — show raw key/value pairs
                      const entries = Object.entries(data);
                      if (!entries.length) return <p className="text-xs text-gray-500">No form data available</p>;
                      return entries.map(([key, value], index) => {
                        let display = value;
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                          display = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
                        } else if (Array.isArray(value)) {
                          display = value.join(', ');
                        }
                        return (
                          <div key={key} className="pb-3 border-b border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">{index + 1}. {key}</h4>
                            <div className="bg-gray-50 rounded px-3 py-2">
                              <span className="text-xs font-semibold text-gray-900">{String(display)}</span>
                            </div>
                          </div>
                        );
                      });
                    };

                    return (
                      <>
                        {/* Member */}
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                            {(sub.ruknName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 break-words">{sub.ruknName || 'Unknown Member'}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                              <span className="min-w-0 break-words">{sub.district} - {sub.area} - {sub.unit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status + Submitted */}
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                          <div>
                            <div className="text-[10px] text-gray-500 mb-1">Status</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-1">Submitted</div>
                            <div className="text-xs text-gray-900">{formatDate(sub.createdAt)}</div>
                          </div>
                        </div>

                        {/* Form Fields */}
                        {isDynamicSubmission ? (
                          renderDynamicFields()
                        ) : (
                          <>
                            {/* Question 1: Quran Study */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">ഖുർആൻ പഠനം : സൂറ അന്നിസാഅ് (87 ആയഹ്)- തഫ്സീർ മുന്നിൽ വെച്ചുള്ള പഠനം :</h4>
                              <div className="bg-gray-50 rounded px-3 py-2">
                                <span className="text-xs font-medium text-gray-900">{getLabel(form.quranStudy?.status)}</span>
                              </div>
                              {form.quranStudy?.others && (
                                <div className="mt-2 text-xs bg-blue-50 rounded px-3 py-2">
                                  <span className="text-gray-700">മറ്റു ഭാഗങ്ങൾ : (സൂറത്ത്, ആയത്തുകൾ)</span>
                                  <span className="ml-1 font-medium text-gray-900">{form.quranStudy.others}</span>
                                </div>
                              )}
                            </div>

                            {/* Question 2: Hadith Count */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">ഹദീസ് പഠനം</h4>
                              <p className="text-2xl font-bold text-primary">{form.hadithCount || 0}</p>
                            </div>

                            {/* Question 3: Book Reading */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">പുസ്തക വായന</h4>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2 bg-gray-50 rounded px-3 py-1.5 text-xs">
                                  <span className="text-gray-700">A. മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും</span>
                                  <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.islami)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 bg-gray-50 rounded px-3 py-1.5 text-xs">
                                  <span className="text-gray-700">B. മദീനയിലെ ഏടുകളിൽ നിന്ന്</span>
                                  <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.atma)}</span>
                                </div>
                                {form.bookReading?.others && (
                                  <div className="bg-blue-50 rounded px-3 py-1.5 text-xs">
                                    <span className="text-gray-700">മറ്റു സാഹിത്യങ്ങൾ (പേരെഴുതുക)</span>
                                    <span className="ml-1 font-medium text-gray-900">{form.bookReading.others}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Question 4: Weekly Meeting */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">പ്രതിവാര യോഗം</h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ഹാജർ</p>
                                  <p className="font-bold text-lg text-gray-900">{form.weeklyMeeting?.hadir || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ലീവ്</p>
                                  <p className="font-bold text-lg text-gray-900">{form.weeklyMeeting?.leave || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ആബ്സന്റ്</p>
                                  <p className="font-bold text-lg text-gray-900">{form.weeklyMeeting?.absent || 0}</p>
                                </div>
                              </div>
                            </div>

                            {/* Question 5: Jamaath Meeting */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">പ്രാദേശിക ജമാഅത്തെ യോഗം</h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ഹാജർ</p>
                                  <p className="font-bold text-lg text-gray-900">{form.jamaathMeeting?.hadir || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ലീവ്</p>
                                  <p className="font-bold text-lg text-gray-900">{form.jamaathMeeting?.leave || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded px-2 py-2 text-center">
                                  <p className="text-[10px] text-gray-600 mb-0.5">ആബ്സന്റ്</p>
                                  <p className="font-bold text-lg text-gray-900">{form.jamaathMeeting?.absent || 0}</p>
                                </div>
                              </div>
                            </div>

                            {/* Question 6: Griha Meetings */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">ഗൃഹയോഗങ്ങൾ</h4>
                              <p className="text-xl font-bold text-gray-900">{form.grihameetings || 0}</p>
                            </div>

                            {/* Question 7: Thahreeki Meetings */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">തഹ്രീകീ യോഗം - പങ്കാളിത്തം</h4>
                              <p className="text-xl font-bold text-gray-900">{form.thahreekiMeetings || 0}</p>
                            </div>

                            {/* Question 8: Baithulmaal */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">ബൈതുല്മാല് (2%)</h4>
                              <p className="text-sm font-semibold text-gray-900">{getLabel(form.baithulmaal)}</p>
                            </div>

                            {/* Question 9: Zakat */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?</h4>
                              <p className="text-sm font-semibold text-gray-900">{getLabel(form.zakatPaid)}</p>
                            </div>

                            {/* Question 10: New Members */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)</h4>
                              <p className="text-xl font-bold text-gray-900">{form.newMembers || 0}</p>
                            </div>

                            {/* Question 11: Muslim Relations */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)</h4>
                              <p className="text-xl font-bold text-gray-900">{form.muslimRelations || 0}</p>
                            </div>

                            {/* Question 12: Community Relations */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)</h4>
                              <p className="text-xl font-bold text-gray-900">{form.communityRelations || 0}</p>
                            </div>

                            {/* Question 13: Score Count */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)</h4>
                              <p className="text-xl font-bold text-gray-900">{form.scoreCount || 0}</p>
                            </div>

                            {/* Question 14: Meqath Service */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">100പേർക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാർഗറ്റ് മുന്നിൽ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവർത്തനം തൃപ്തികരമാണോ?</h4>
                              <p className="text-sm font-semibold text-gray-900">{getLabel(form.meqathService)}</p>
                            </div>

                            {/* Question 15: Skill Usage */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകൾ ദീനീമാർഗത്തിൽ സാധ്യമാകുന്ന അളവിൽ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?</h4>
                              <p className="text-sm font-semibold text-gray-900">{getLabel(form.skillUsage)}</p>
                            </div>

                            {/* Question 16: Jamaath Influence */}
                            <div className="pb-3 border-b border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-900 mb-2 break-words leading-relaxed">പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?</h4>
                              <div className="flex items-center space-x-2 mt-2">
                                {form.jamaathInfluence && (
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => {
                                      const backendValue = form.jamaathInfluence;
                                      let isActive = false;
                                      if (backendValue === 'no' && star <= 1) isActive = true;
                                      if (backendValue === 'small' && star <= 3) isActive = true;
                                      if (backendValue === 'yes' && star <= 5) isActive = true;
                                      return (
                                        <Star key={star} className={`w-4 h-4 ${isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} />
                                      );
                                    })}
                                    <span className="ml-2 text-xs text-gray-700 font-medium">{getLabel(form.jamaathInfluence)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unit Reply Modal */}
      {showReplyModal && selectedReply && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 border-b border-gray-200 pb-2 sm:pb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                      Unit Reply - {selectedReply.periodDisplay}
                    </h2>
                    {selectedReply.whatsappSent && (
                      <span className="text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                        WhatsApp Sent
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Unit:</span> {selectedReply.unit || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">District:</span> {selectedReply.district || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Replied By:</span> {selectedReply.repliedBy?.name || selectedReply.repliedBy?.username || 'Admin'}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(selectedReply.repliedAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeReplyModal}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 flex-shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 sm:p-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">Admin's Message</h3>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                        <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-900 leading-relaxed font-sans">
                          {selectedReply.formattedMessage}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Submission Modal */}
      {showAlternativeSubmissionModal && selectedAlternativeSubmission && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-2 sm:p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 border-b border-gray-200 pb-2 sm:pb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                      Alternative Submission - {selectedAlternativeSubmission.periodDisplay || 'N/A'}
                    </h2>
                    <span className="text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800 whitespace-nowrap">
                      {selectedAlternativeSubmission.type || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Member:</span> {selectedAlternativeSubmission.ruknName || selectedAlternativeSubmission.userId?.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">RUKN ID:</span> {selectedAlternativeSubmission.userId?.ruknId || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Unit:</span> {selectedAlternativeSubmission.unit || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Submitted:</span> {formatDate(selectedAlternativeSubmission.createdAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeAlternativeSubmissionModal}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 flex-shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {alternativeSubmissionDetailsLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading details...</p>
                  </div>
                ) : (
                  <>
                    {/* Reason Section - Show from selectedAlternativeSubmission or from details */}
                    {(selectedAlternativeSubmission.reason || alternativeSubmissionDetails?.alternativeSubmission?.reason) && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4 sm:p-6">
                        <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                          <div className="mb-4">
                            <h3 className="text-sm sm:text-base font-semibold text-purple-900 mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Reason for Alternative Submission
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                              <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-900 leading-relaxed break-words">
                                {alternativeSubmissionDetails?.alternativeSubmission?.reason || selectedAlternativeSubmission.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        User Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Rukn Name:</span>
                          <span className="ml-2 text-gray-900">
                            {alternativeSubmissionDetails?.alternativeSubmission?.ruknName || selectedAlternativeSubmission.ruknName || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">District:</span>
                          <span className="ml-2 text-gray-900">
                            {alternativeSubmissionDetails?.alternativeSubmission?.district || selectedAlternativeSubmission.district || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Area:</span>
                          <span className="ml-2 text-gray-900">
                            {alternativeSubmissionDetails?.alternativeSubmission?.area || selectedAlternativeSubmission.area || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Unit:</span>
                          <span className="ml-2 text-gray-900">
                            {alternativeSubmissionDetails?.alternativeSubmission?.unit || selectedAlternativeSubmission.unit || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Reply */}
                    {(alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.message || selectedAlternativeSubmission.adminReply?.message) && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 sm:p-6">
                        <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                          <div className="mb-4">
                            <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Admin Reply
                              {(alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.repliedBy || selectedAlternativeSubmission.adminReply?.repliedBy) && (
                                <span className="text-blue-700 text-xs font-normal">
                                  ({(alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.repliedBy || selectedAlternativeSubmission.adminReply?.repliedBy)?.name || 
                                    (alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.repliedBy || selectedAlternativeSubmission.adminReply?.repliedBy)?.username})
                                </span>
                              )}
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                              <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-900 leading-relaxed">
                                {alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.message || selectedAlternativeSubmission.adminReply?.message}
                              </p>
                            </div>
                            {(alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.repliedAt || selectedAlternativeSubmission.adminReply?.repliedAt) && (
                              <div className="mt-2 text-xs text-gray-500">
                                Replied on: {formatDate(alternativeSubmissionDetails?.alternativeSubmission?.adminReply?.repliedAt || selectedAlternativeSubmission.adminReply?.repliedAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnitAdminDashboard
