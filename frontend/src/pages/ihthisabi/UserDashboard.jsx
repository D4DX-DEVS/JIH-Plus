import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal'
import Pagination from '../../components/ihthisabi/Pagination'
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  TrendingUp,
  Plus,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock3,
  Trash2,
  Edit,
  Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Q3_DISABLED, isQ3Disabled } from '../../utils/ihthisabi/quarterHelper'

const UserDashboard = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [submissionsPagination, setSubmissionsPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, submissionId: null, submissionName: null })

  useEffect(() => {
    if (isAuthenticated && !authLoading && user) {
      if (user.role !== 'rukn') {
        setLoading(false)
        return
      }
      
      const timer = setTimeout(() => {
        fetchSubmissions()
        fetchAlternativeSubmissions()
      }, 100)
      
      return () => clearTimeout(timer)
    } else if (!authLoading && !isAuthenticated) {
      navigate('/ihthisabi/login')
    }
  }, [isAuthenticated, authLoading, user])

  const fetchSubmissions = async (page = 1) => {
    try {
      const response = await api.get('/submissions/my-submissions', { params: { page, limit: 10 } })
      setSubmissions(response.data.data.submissions || [])
      setSubmissionsPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAlternativeSubmissions = async () => {
    try {
      const response = await api.get('/alternative-submissions/my-submissions')
      setAlternativeSubmissions(response.data.data.alternativeSubmissions || [])
    } catch (error) {
      console.error('Failed to fetch alternative submissions:', error)
      setAlternativeSubmissions([])
    }
  }

  const getCurrentMonth = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[new Date().getMonth()]
  }

  // Get currently OPEN quarter for submissions
  // Q4 (Oct-Dec) only opens after December 31st
  // Before Dec 31st, Q3 (July-Sep) remains open
  // Quarter helpers aligned with backend: available quarter = previous completed quarter
  const getCurrentQuarter = (date = new Date()) => {
    const month = date.getMonth() + 1
    if (month >= 1 && month <= 3) return 1
    if (month >= 4 && month <= 6) return 2
    if (month >= 7 && month <= 9) return 3
    return 4
  }

  const getAvailableSubmissionQuarter = (date = new Date()) => {
    const currentQuarter = getCurrentQuarter(date)
    const currentYear = date.getFullYear()

    if (currentQuarter === 1) return { quarter: 4, year: currentYear - 1 }
    if (currentQuarter === 2) return { quarter: 1, year: currentYear }
    if (currentQuarter === 3) return { quarter: 2, year: currentYear }
    return { quarter: 3, year: currentYear }
  }

  const getLastQuarter = () => getAvailableSubmissionQuarter()

  const getQuarterInfo = (quarter) => {
    const quarterInfo = {
      1: { name: 'Q1', period: 'January – March', startMonth: 1, endMonth: 3 },
      2: { name: 'Q2', period: 'April – June', startMonth: 4, endMonth: 6 },
      3: { name: 'Q3', period: 'July – September', startMonth: 7, endMonth: 9 },
      4: { name: 'Q4', period: 'October – December', startMonth: 10, endMonth: 12 }
    }
    return quarterInfo[quarter]
  }

  const hasSubmittedForAvailableQuarter = () => {
    if (submissions.length === 0) return false
    
    const currentDate = new Date()
    const available = getAvailableSubmissionQuarter(currentDate)
    
    // Check if user has submitted for currently open quarter and year
    // Use stored submissionPeriod.quarter if available, otherwise calculate from date
    return submissions.some(submission => {
      const submissionYear = submission.submissionPeriod?.year || new Date(submission.createdAt).getFullYear()
      const submissionQuarter = submission.submissionPeriod?.quarter || 
        (() => {
          const month = new Date(submission.createdAt).getMonth() + 1
          if (month >= 1 && month <= 3) return 1
          if (month >= 4 && month <= 6) return 2
          if (month >= 7 && month <= 9) return 3
          if (month >= 10 && month <= 12) return 4
          return 1
        })()
      
      return submissionYear === available.year && submissionQuarter === available.quarter
    })
  }

  const canSubmitNow = () => {
    return !hasSubmittedForAvailableQuarter()
  }
  
  const getNextSubmissionDate = () => {
    const currentDate = new Date()
    const { quarter, year } = getAvailableSubmissionQuarter(currentDate)

    // If they can submit now, return null (no next date needed)
    if (canSubmitNow()) return null

    // Next available quarter is simply current available + 1 (previous completed already)
    let nextQuarter = quarter + 1
    let nextYear = year
    if (nextQuarter > 4) {
      nextQuarter = 1
      nextYear = year + 1
    }

    const quarterInfo = getQuarterInfo(nextQuarter)
    const nextDate = new Date(nextYear, quarterInfo.startMonth - 1, 1)

    return nextDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCurrentQuarterDisplay = () => {
    // Show the available submission quarter (previous completed quarter)
    const { quarter, year } = getAvailableSubmissionQuarter()
    const quarterInfo = getQuarterInfo(quarter)
    return `${quarterInfo.name} ${year} (${quarterInfo.period})`
  }

  const getLastQuarterDisplay = () => {
    const { quarter, year } = getLastQuarter()
    const quarterInfo = getQuarterInfo(quarter)
    
    return `${quarterInfo.name} ${year} (${quarterInfo.period} - 3 months)`
  }

  const getCombinedSubmissions = () => ([
    ...submissions.map(s => ({ ...s, _type: 'regular' })),
    ...alternativeSubmissions.map(s => ({ ...s, _type: 'alternative' }))
  ])

  // Get the last submitted form (most recent) across regular and alternative
  const getLastSubmission = () => {
    const combined = getCombinedSubmissions()
    if (combined.length === 0) return null

    return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  }

  // Get current quarter submission (for available submission quarter)
  const getCurrentQuarterSubmission = () => {
    const combined = getCombinedSubmissions()
    if (combined.length === 0) return null

    const currentDate = new Date()
    const available = getAvailableSubmissionQuarter(currentDate)

    return combined.find(submission => {
      const submissionYear = submission.submissionPeriod?.year || new Date(submission.createdAt).getFullYear()
      const submissionQuarter = submission.submissionPeriod?.quarter || 
        (() => {
          const month = new Date(submission.createdAt).getMonth() + 1
          if (month >= 1 && month <= 3) return 1
          if (month >= 4 && month <= 6) return 2
          if (month >= 7 && month <= 9) return 3
          if (month >= 10 && month <= 12) return 4
          return 1
        })()
      
      return submissionYear === available.year && submissionQuarter === available.quarter
    }) || null
  }

  const getSubmissionQuarter = (submission) => {
    // Use stored submissionPeriod data if available, otherwise calculate from date
    const submissionYear = submission.submissionPeriod?.year || new Date(submission.createdAt || submission).getFullYear()
    const submissionQuarter = submission.submissionPeriod?.quarter || 
      (() => {
        const date = new Date(submission.createdAt || submission)
        const month = date.getMonth() + 1
        if (month >= 1 && month <= 3) return 1
        if (month >= 4 && month <= 6) return 2
        if (month >= 7 && month <= 9) return 3
        if (month >= 10 && month <= 12) return 4
        return 1
      })()
    
    const quarterInfo = getQuarterInfo(submissionQuarter)
    return `${quarterInfo.name} ${submissionYear}`
  }

  const getQuarterCompletionStatus = (year = new Date().getFullYear()) => {
    const completedQuarters = []
    const combined = getCombinedSubmissions()

    combined.forEach(submission => {
      const submissionYear = submission.submissionPeriod?.year || new Date(submission.createdAt).getFullYear()
      if (submissionYear === year) {
        const submissionQuarter = submission.submissionPeriod?.quarter || (() => {
          const month = new Date(submission.createdAt).getMonth() + 1
          if (month >= 1 && month <= 3) return 1
          if (month >= 4 && month <= 6) return 2
          if (month >= 7 && month <= 9) return 3
          if (month >= 10 && month <= 12) return 4
          return 1
        })()
        // Exclude Q3 if disabled
        if (Q3_DISABLED && submissionQuarter === 3) return
        if (!completedQuarters.includes(submissionQuarter)) {
          completedQuarters.push(submissionQuarter)
        }
      }
    })

    return completedQuarters
  }

  const getQuarterStatus = (year, quarter) => {
    // Check if Q3 is disabled
    if (Q3_DISABLED && quarter === 3) {
      return { status: 'locked', submission: null, icon: Lock, color: 'gray', text: 'Disabled' }
    }
    
    const combined = getCombinedSubmissions()
    const matching = combined
      .filter(sub => {
        const subYear = sub.submissionPeriod?.year || new Date(sub.createdAt).getFullYear()
        const subQuarter = sub.submissionPeriod?.quarter || (() => {
          const month = new Date(sub.createdAt).getMonth() + 1
          if (month >= 1 && month <= 3) return 1
          if (month >= 4 && month <= 6) return 2
          if (month >= 7 && month <= 9) return 3
          if (month >= 10 && month <= 12) return 4
          return 1
        })()
        return subYear === year && subQuarter === quarter
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    if (matching.length === 0) return { status: 'pending', submission: null }
    const regular = matching.find(m => m._type === 'regular')
    if (regular) return { status: 'completed', submission: regular }
    return { status: 'alternative', submission: matching[0] }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'reviewed': return 'bg-yellow-100 text-yellow-800'
      case 'submitted': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleDeleteSubmission = async (submissionId, event) => {
    event.stopPropagation() // Prevent navigation when clicking delete
    
    const submission = submissions.find(s => s._id === submissionId)
    const submissionName = submission?.periodDisplay || 'this submission'
    
    setDeleteModal({
      isOpen: true,
      submissionId,
      submissionName
    })
  }

  const confirmDeleteSubmission = async () => {
    try {
      await api.delete(`/submissions/${deleteModal.submissionId}`)
      toast.success('സമർപ്പണം വിജയകരമായി ഇല്ലാതാക്കി')
      // Refresh the submissions list
      fetchSubmissions()
      setDeleteModal({ isOpen: false, submissionId: null, submissionName: null })
    } catch (error) {
      console.error('Failed to delete submission:', error)
      toast.error('സമർപ്പണം ഇല്ലാതാക്കാൻ കഴിഞ്ഞില്ല')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard.</p>
          <button 
            onClick={() => navigate('/ihthisabi/login')}
            className="mt-4 bg-primary hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ih-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="ih-page-shell">
        {/* Welcome Header with CTA */}
        <div className="ih-page-header">
          <div className="min-w-0 flex-1">
            {/* App bar already greets the user on mobile — keep the big welcome for lg+ only */}
            <h1 className="ih-page-title brand-font hidden truncate lg:block">
              Welcome back, {user?.name || user?.username}
            </h1>
            <p className="ih-page-subtitle truncate">
              {/* Unit already shows in the mobile app bar context line */}
              <span className="hidden lg:inline">
                {user?.unit && user.unit !== '-' ? `${user.unit} · ` : ''}
              </span>
              RUKN ID <span className="font-semibold text-gray-900">{user?.ruknId || 'N/A'}</span>
            </p>
          </div>
          {/* Mobile relies on the contextual Submit Now CTA in the quarter status card */}
          <button
            onClick={() => navigate('/ihthisabi/submit')}
            className="hidden shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#161F2F] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#1a2538] sm:px-5 sm:py-2 sm:text-sm lg:inline-flex"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Submit Form
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-6">
          {[
            { label: 'Total Submissions', short: 'Total', value: submissions.length, Icon: FileText, tone: 'bg-blue-100 text-blue-600' },
            { label: 'Approved', short: 'Approved', value: submissions.filter(s => s.status === 'approved').length, Icon: CheckCircle2, tone: 'bg-green-100 text-green-600' },
            { label: 'In Review', short: 'In Review', value: submissions.filter(s => s.status === 'reviewed' || s.status === 'submitted').length, Icon: Clock3, tone: 'bg-amber-100 text-amber-600' },
            { label: 'Annual Progress', short: 'Progress', value: `${Math.round((getQuarterCompletionStatus().length / (Q3_DISABLED ? 3 : 4)) * 100)}%`, Icon: TrendingUp, tone: 'bg-purple-100 text-purple-600' },
          ].map(({ label, short, value, Icon, tone }) => (
            <div key={label} className="ih-stat-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="ih-stat-label truncate">
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </p>
                  <p className="ih-stat-value mt-1">{value}</p>
                </div>
                <div className={`ih-stat-icon ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="ih-surface overflow-hidden">
          <div className="border-b border-gray-200 bg-[#161F2F] px-3 py-2 sm:px-6 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="brand-font truncate text-[13px] font-bold text-white sm:text-lg">
                Quarterly Submissions Summary
              </h2>
              <span className="ih-chip shrink-0 border-white/20 bg-white/10 font-semibold text-white">
                {getCurrentQuarterDisplay()}
              </span>
            </div>
          </div>
          
          {/* Current Quarter Submission Status */}
            {(() => {
            const currentSubmission = getCurrentQuarterSubmission()
            const { quarter, year } = getAvailableSubmissionQuarter()
            const quarterInfo = getQuarterInfo(quarter)
            const isSubmitted = !!currentSubmission
            const isAlt = currentSubmission?._type === 'alternative'
            
              return (
              <div className="px-5 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSubmitted ? 'bg-green-100' : 'bg-amber-100'}`}>
                        {isSubmitted ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                            </div>
                            <div>
                        <h3 className="text-gray-900 font-semibold text-base">
                          {quarterInfo.name} {year} Submission Status
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {isSubmitted 
                            ? `Submitted on ${formatDate(currentSubmission.createdAt)}`
                            : 'Not yet submitted for this quarter'
                          }
                              </p>
                            </div>
                          </div>
                    {isSubmitted && (
                      <div className="ml-14 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          isAlt 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : getStatusColor(currentSubmission.status)
                        }`}>
                          {isAlt ? 'Alternative Submission' : currentSubmission.status || 'Submitted'}
                        </span>
                              </div>
                            )}
                          </div>
                  <div>
                    {isSubmitted ? (
                            <button
                        onClick={() => navigate(isAlt ? `/ihthisabi/alternative-submissions/${currentSubmission._id}` : `/ihthisabi/submissions/${currentSubmission._id}`)}
                        className="inline-flex w-full min-h-[44px] items-center justify-center px-4 py-2 bg-[#161F2F] hover:bg-[#1a2538] text-white text-sm font-semibold rounded-lg transition-all duration-200 sm:w-auto lg:min-h-0"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                        View Details
                              </button>
                    ) : (
                      <button
                        onClick={() => navigate('/ihthisabi/submit')}
                        className="inline-flex w-full min-h-[44px] items-center justify-center px-4 py-2 bg-[#161F2F] hover:bg-[#1a2538] text-white text-sm font-semibold rounded-lg transition-all duration-200 sm:w-auto lg:min-h-0"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Submit Now
                      </button>
                    )}
                    </div>
                </div>
                </div>
              )
            })()}

          <div className="p-3 sm:p-6">
            {/* Submissions List */}
            {submissions.length === 0 ? (
              <div className="py-6 text-center sm:py-10">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="brand-font mb-1 text-sm font-bold text-gray-900">No submissions yet</h3>
                <p className="mx-auto mb-3 max-w-md text-xs text-gray-500">
                  Start your quarterly reporting by submitting your first report for {getCurrentQuarterDisplay()}.
                </p>
                <div className="mx-auto mb-4 max-w-lg rounded-xl border border-blue-200 bg-blue-50 p-3 text-left sm:p-5">
                  <h4 className="mb-1.5 text-xs font-semibold text-blue-900 sm:text-sm">Quarterly Submission Schedule</h4>
                  <div className="space-y-0.5 text-[11px] text-blue-800 sm:text-sm">
                    <div className="flex items-center justify-between py-1">
                      <span>• January – March</span>
                      <span className="text-blue-600 font-medium">(3 months)</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>• April – June</span>
                      <span className="text-blue-600 font-medium">(3 months)</span>
                    </div>
                    <div className={`flex items-center justify-between py-1 ${Q3_DISABLED ? 'opacity-50 line-through' : ''}`}>
                      <span>• July – September</span>
                      <span className="text-blue-600 font-medium">(3 months) {Q3_DISABLED && '(Disabled)'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>• October – December</span>
                      <span className="text-blue-600 font-medium">(3 months)</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-blue-700 font-semibold">
                      Total: {Q3_DISABLED ? '3' : '4'} submissions per year ({Q3_DISABLED ? '9' : '12'} months)
                    </p>
                  </div>
                </div>
                {/* Mobile already has the Submit Now CTA in the quarter status card above */}
                <button
                  onClick={() => navigate('/ihthisabi/submit')}
                  className="hidden lg:inline-flex items-center px-6 py-3 bg-[#161F2F] hover:bg-[#1a2538] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Submit Your First Quarterly Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div 
                    key={submission._id} 
                    className="flex flex-col items-start justify-between gap-4 p-4 sm:p-5 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md border border-gray-200 transition-all duration-200 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center space-x-4 flex-1 w-full">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{getSubmissionQuarter(submission)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Submitted on {formatDate(submission.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:space-x-3">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/ihthisabi/submissions/${submission._id}`)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 lg:min-h-0 lg:min-w-0"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/ihthisabi/submit?edit=${submission._id}`)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 lg:min-h-0 lg:min-w-0"
                          title="Edit Submission"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteSubmission(submission._id, e)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 lg:min-h-0 lg:min-w-0"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination pagination={submissionsPagination} onPageChange={fetchSubmissions} loading={loading} itemLabel="submissions" />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, submissionId: null, submissionName: null })}
        onConfirm={confirmDeleteSubmission}
        title="Delete Submission"
        message={`ഈ സമർപ്പണം ഇല്ലാതാക്കണമെന്ന് ഉറപ്പാണോ? ഈ പ്രവർത്തനം പൂർവസ്ഥിതിയിലാക്കാൻ കഴിയില്ല.\n\nSubmission: ${deleteModal.submissionName || 'N/A'}`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default UserDashboard