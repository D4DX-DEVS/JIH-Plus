import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { useError } from '../../contexts/ErrorContext'
import { api } from '../../utils/ihthisabi/api'
import { 
  FileText, 
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  User,
  MapPin,
  X as CloseIcon,
  MessageSquare,
  Send,
  Smartphone,
  Star,
  AlertCircle,
  Globe,
  UserX
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Q3_DISABLED } from '../../utils/ihthisabi/quarterHelper'
import AbroadSubmissions from './AbroadSubmissions'
import Pagination from '../../components/ihthisabi/Pagination'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AllSubmissions = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { showError } = useError()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quarterFilter, setQuarterFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Drawer state for professional inline details view
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [drawerFormSchema, setDrawerFormSchema] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [showAlternativeSubmissions, setShowAlternativeSubmissions] = useState(false)
  const [showAbroadSubmissions, setShowAbroadSubmissions] = useState(false)
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [alternativeSubmissionsLoading, setAlternativeSubmissionsLoading] = useState(false)
  const [alternativePagination, setAlternativePagination] = useState({ current: 1, pages: 1, total: 0 })
  const alternativeItemsPerPage = 10

  // Non-submitted view state
  const [showNonSubmitted, setShowNonSubmitted] = useState(false)
  const [nsQuarter, setNsQuarter] = useState('')
  const [nsYear, setNsYear] = useState('')
  const [nsDistrict, setNsDistrict] = useState('all')
  const [nsArea, setNsArea] = useState('all')
  const [nsUnit, setNsUnit] = useState('all')
  const [nonSubmittedList, setNonSubmittedList] = useState([])
  const [nonSubmittedLoading, setNonSubmittedLoading] = useState(false)
  const [nonSubmittedFetched, setNonSubmittedFetched] = useState(false)
  const [nonSubmittedPeriodDisplay, setNonSubmittedPeriodDisplay] = useState('')
  const [nonSubmittedTotalRukns, setNonSubmittedTotalRukns] = useState(0)
  const [nonSubmittedPagination, setNonSubmittedPagination] = useState({ current: 1, pages: 1, total: 0 })

  // Available years for non-submitted selector
  const nsYearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [])

  // Always use district/area/unit fields coming from API (authoritative)
  const getNormalizedLocation = (submission) => ({
    district: submission.district || '',
    area: submission.area || '',
    unit: submission.unit || submission.unitName || ''
  })

  const buildLocationDisplay = (submission) => {
    const { district, area, unit } = getNormalizedLocation(submission)
    const composed = [district, area, unit].filter(Boolean).join(' - ')
    return composed || 'N/A'
  }

  // Filter dropdown options come from the master-data endpoints (cascading by
  // district/area) rather than from the loaded page of submissions, since the
  // submissions list is now server-paginated and only holds the current page.
  const [uniqueDistricts, setUniqueDistricts] = useState([])
  const [uniqueAreas, setUniqueAreas] = useState([])
  const [uniqueUnits, setUniqueUnits] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })

  useEffect(() => {
    api.get('/ihthisabi/admin/master-data/districts')
      .then(res => setUniqueDistricts((res.data.data || []).map(d => d.name).sort()))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (districtFilter === 'all') {
      setUniqueAreas([])
      setAreaFilter('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/areas', { params: { district: districtFilter } })
      .then(res => setUniqueAreas((res.data.data || []).map(a => a.name).sort()))
      .catch(() => {})
  }, [districtFilter])

  useEffect(() => {
    if (districtFilter === 'all' || areaFilter === 'all') {
      setUniqueUnits([])
      setUnitFilter('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/units', { params: { district: districtFilter, area: areaFilter } })
      .then(res => setUniqueUnits((res.data.data || []).map(u => u.name).sort()))
      .catch(() => {})
  }, [districtFilter, areaFilter])

  // Debounce free-text search so typing doesn't fire a request per keystroke
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    // Only fetch data if user is authenticated and is admin
    if (user && user.role === 'admin') {
      fetchSubmissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, districtFilter, areaFilter, unitFilter, statusFilter, quarterFilter, yearFilter, debouncedSearchTerm])

  // Reset to page 1 whenever a filter/search actually changes (not on page navigation)
  useEffect(() => {
    setCurrentPage(1)
  }, [districtFilter, areaFilter, unitFilter, statusFilter, quarterFilter, yearFilter, debouncedSearchTerm])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)

      const params = { page: currentPage, limit: itemsPerPage }
      if (districtFilter !== 'all') params.district = districtFilter
      if (areaFilter !== 'all') params.area = areaFilter
      if (unitFilter !== 'all') params.unit = unitFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (quarterFilter !== 'all') params.quarter = quarterFilter
      if (yearFilter !== 'all') params.year = yearFilter
      if (debouncedSearchTerm) params.search = debouncedSearchTerm

      const response = await api.get('/ihthisabi/admin/submissions', { params })
      const data = response.data.data
      setSubmissions(data.submissions || [])
      setPagination(data.pagination || { current: 1, pages: 1, total: 0 })
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  // Cascading area/unit options for the non-submitted filter, from the master-data endpoints
  const [nsUniqueAreas, setNsUniqueAreas] = useState([])
  const [nsUniqueUnits, setNsUniqueUnits] = useState([])

  useEffect(() => {
    if (nsDistrict === 'all') { setNsUniqueAreas([]); return }
    api.get('/ihthisabi/admin/master-data/areas', { params: { district: nsDistrict } })
      .then(res => setNsUniqueAreas((res.data.data || []).map(a => a.name).sort()))
      .catch(() => {})
  }, [nsDistrict])

  useEffect(() => {
    if (nsDistrict === 'all' || nsArea === 'all') { setNsUniqueUnits([]); return }
    api.get('/ihthisabi/admin/master-data/units', { params: { district: nsDistrict, area: nsArea } })
      .then(res => setNsUniqueUnits((res.data.data || []).map(u => u.name).sort()))
      .catch(() => {})
  }, [nsDistrict, nsArea])

  const fetchNonSubmitted = async (page = 1) => {
    if (!nsQuarter || !nsYear) {
      toast.error('Please select both quarter and year')
      return
    }
    try {
      setNonSubmittedLoading(true)
      if (page === 1) setNonSubmittedFetched(false)
      const params = { quarter: nsQuarter, year: nsYear, page, limit: 10 }
      if (nsDistrict !== 'all') params.district = nsDistrict
      if (nsArea !== 'all') params.area = nsArea
      if (nsUnit !== 'all') params.unit = nsUnit
      const response = await api.get('/ihthisabi/admin/non-submitted', { params })
      if (response.data?.success) {
        setNonSubmittedList(response.data.data.nonSubmitted || [])
        setNonSubmittedPeriodDisplay(response.data.data.periodDisplay || '')
        setNonSubmittedTotalRukns(response.data.data.totalRukns || 0)
        setNonSubmittedPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
        setNonSubmittedFetched(true)
      }
    } catch (error) {
      console.error('Failed to fetch non-submitted:', error)
      toast.error(error.response?.data?.message || 'Failed to load non-submitted members')
    } finally {
      setNonSubmittedLoading(false)
    }
  }

  // Export needs the FULL non-submitted set, not just the visible page, so it
  // fetches once with a high limit rather than looping the display's 10/page requests.
  const fetchAllNonSubmittedForExport = async () => {
    const params = { quarter: nsQuarter, year: nsYear, page: 1, limit: 2000 }
    if (nsDistrict !== 'all') params.district = nsDistrict
    if (nsArea !== 'all') params.area = nsArea
    if (nsUnit !== 'all') params.unit = nsUnit
    const response = await api.get('/ihthisabi/admin/non-submitted', { params })
    return response.data?.data?.nonSubmitted || []
  }

  const handleNonSubmittedExportCSV = async () => {
    const rows = await fetchAllNonSubmittedForExport().catch(() => {
      toast.error('Failed to export')
      return null
    })
    if (!rows) return
    if (rows.length === 0) {
      toast.error('No records to export')
      return
    }
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value).replace(/"/g, '""')
      return /[",\n]/.test(str) ? `"${str}"` : str
    }
    const headers = ['#', 'Member Name', 'Rukn ID', 'District', 'Area', 'Unit']
    const lines = [headers.join(',')]
    rows.forEach((member, idx) => {
      lines.push([
        escapeCsv(idx + 1),
        escapeCsv(member.name),
        escapeCsv(member.ruknId || 'N/A'),
        escapeCsv(member.district),
        escapeCsv(member.area),
        escapeCsv(member.unit)
      ].join(','))
    })
    const csvContent = lines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `non-submitted-${nonSubmittedPeriodDisplay.replace(' ', '-')}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const handleNonSubmittedExportPDF = async () => {
    const nonSubmittedList = await fetchAllNonSubmittedForExport().catch(() => {
      toast.error('Failed to export')
      return null
    })
    if (!nonSubmittedList) return
    if (nonSubmittedList.length === 0) {
      toast.error('No records to export')
      return
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.setFontSize(14)
    doc.text('Non-Submitted Members', 14, 16)
    doc.setFontSize(10)
    doc.text(`Period: ${nonSubmittedPeriodDisplay}`, 14, 23)
    const locationParts = [
      nsDistrict !== 'all' ? `District: ${nsDistrict}` : null,
      nsArea !== 'all' ? `Area: ${nsArea}` : null,
      nsUnit !== 'all' ? `Unit: ${nsUnit}` : null
    ].filter(Boolean)
    if (locationParts.length > 0) doc.text(locationParts.join('  |  '), 14, 29)
    doc.text(`Total: ${nonSubmittedList.length} members not submitted (out of ${nonSubmittedTotalRukns})`, 14, locationParts.length > 0 ? 35 : 29)
    const startY = locationParts.length > 0 ? 40 : 34
    autoTable(doc, {
      startY,
      head: [['#', 'Member Name', 'Rukn ID', 'District', 'Area', 'Unit']],
      body: nonSubmittedList.map((member, idx) => [
        idx + 1,
        member.name,
        member.ruknId || 'N/A',
        member.district,
        member.area,
        member.unit
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [18, 26, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 } }
    })
    doc.save(`non-submitted-${nonSubmittedPeriodDisplay.replace(' ', '-')}-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF exported')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'reviewed':
        return <Clock className="w-4 h-4 text-amber-600" />
      case 'submitted':
        return <FileText className="w-4 h-4 text-blue-600" />
      default:
        return <XCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'reviewed': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Static range rather than derived from the (now paginated) submissions list,
  // matching the same approach already used for the non-submitted year selector.
  const submissionYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [])

  // submissions is already the current page of server-filtered results
  const paginatedSubmissions = submissions

  const handleViewSubmission = (submissionId) => {
    // Open inline drawer with details instead of navigating
    setSelectedId(submissionId)
    setDrawerOpen(true)
  }

  useEffect(() => {
    const fetchDetails = async () => {
      if (!drawerOpen || !selectedId) return
      try {
        setDetailsLoading(true)
        setDrawerFormSchema(null)
        const response = await api.get(`/ihthisabi/admin/submissions/${selectedId}`)
        const submission = response.data?.data?.submission || null
        setDetails(submission)
        if (submission?.adminReply?.message) {
          setReplyMessage(submission.adminReply.message)
        } else {
          setReplyMessage('')
        }
        setWhatsappStatus(null)

        if (submission?.dynamicFormId && submission?.submissionPeriod?.quarter && submission?.submissionPeriod?.year) {
          try {
            const formRes = await api.get(
              `/ihthisabi/application-forms/public/by-quarter/${submission.submissionPeriod.quarter}/${submission.submissionPeriod.year}`
            )
            if (formRes.data?.hasDynamicForm && formRes.data?.data) {
              setDrawerFormSchema(formRes.data.data)
            }
          } catch {
            // schema unavailable — fallback rendering will be used
          }
        }
      } catch (err) {
        toast.error('Failed to load submission details')
      } finally {
        setDetailsLoading(false)
      }
    }
    fetchDetails()
  }, [drawerOpen, selectedId])

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedId(null)
    setDetails(null)
    setDrawerFormSchema(null)
    setReplyMessage('')
    setWhatsappStatus(null)
  }

  const handleSubmitReply = async () => {
    if (!replyMessage.trim() || !selectedId) return

    try {
      setReplyLoading(true)
      const response = await api.post(`/ihthisabi/admin/submissions/${selectedId}/reply`, {
        message: replyMessage.trim()
      })

      if (response.data?.success) {
        const whatsappSent = response.data.data?.whatsappSent
        setWhatsappStatus(whatsappSent)
        
        if (whatsappSent) {
          toast.success('Reply sent successfully and WhatsApp message delivered!')
        } else {
          toast.success('Reply sent successfully')
          showError({ type: 'whatsapp_failed' })
        }
        // Update details with new reply
        if (details) {
          setDetails({
            ...details,
            adminReply: response.data.data.submission.adminReply
          })
        }
        // Refresh submissions list to show updated status
        fetchSubmissions()
      }
    } catch (error) {
      console.error('Failed to submit reply:', error)
      toast.error(error.response?.data?.message || 'Failed to send reply')
    } finally {
      setReplyLoading(false)
    }
  }

  const fetchAlternativeSubmissions = async (page = alternativePagination.current) => {
    try {
      setAlternativeSubmissionsLoading(true)
      const response = await api.get('/alternative-submissions/all', {
        params: {
          page: page,
          limit: alternativeItemsPerPage
        }
      })
      if (response.data?.success) {
        setAlternativeSubmissions(response.data.data.alternativeSubmissions || [])
        setAlternativePagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch alternative submissions:', error)
      toast.error('Failed to load alternative submissions')
    } finally {
      setAlternativeSubmissionsLoading(false)
    }
  }

  const handleExport = async () => {
    // Submissions are now server-paginated (10/page), so exporting the current filters
    // means fetching every matching page at export time rather than just the visible page.
    const params = { limit: 200 }
    if (districtFilter !== 'all') params.district = districtFilter
    if (areaFilter !== 'all') params.area = areaFilter
    if (unitFilter !== 'all') params.unit = unitFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (quarterFilter !== 'all') params.quarter = quarterFilter
    if (yearFilter !== 'all') params.year = yearFilter
    if (debouncedSearchTerm) params.search = debouncedSearchTerm

    let rows = []
    try {
      const firstPage = await api.get('/ihthisabi/admin/submissions', { params: { ...params, page: 1 } })
      const firstData = firstPage.data.data
      rows = firstData.submissions || []
      const totalPages = firstData.pagination?.pages || 1
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            api.get('/ihthisabi/admin/submissions', { params: { ...params, page: i + 2 } })
          )
        )
        rest.forEach(res => { rows = rows.concat(res.data.data.submissions || []) })
      }
    } catch (error) {
      console.error('Failed to fetch submissions for export:', error)
      toast.error('Failed to export submissions')
      return
    }

    if (!rows || rows.length === 0) {
      toast.error('No records to export for the current filters')
      return
    }

    const headers = ['#', 'Member', 'District', 'Area', 'Unit', 'Period', 'Location', 'Submitted']

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value).replace(/"/g, '""')
      return /[",\n]/.test(str) ? `"${str}"` : str
    }

    const csvLines = []
    csvLines.push(headers.join(','))

    rows.forEach((submission, idx) => {
      const { district, area, unit } = getNormalizedLocation(submission)
      const line = [
        escapeCsv(idx + 1),
        escapeCsv(submission.ruknName || 'Unknown User'),
        escapeCsv(district || ''),
        escapeCsv(area || ''),
        escapeCsv(unit || ''),
        escapeCsv(submission.periodDisplay || 'N/A'),
        escapeCsv(buildLocationDisplay(submission)),
        escapeCsv(formatDate(submission.submittedAt || submission.createdAt))
      ].join(',')
      csvLines.push(line)
    })

    const csvContent = csvLines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `submissions-${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Exported filtered submissions')
  }

  // Show loading while authentication is being checked
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading submissions...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error if not authenticated or not admin
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ih-page-shell">
        {/* Header */}
        <div className="mb-4">
          <div className="ih-page-header">
            <div>
              <h1 className="ih-page-title">All Submissions</h1>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
              {/* Alternative Submissions – hidden when abroad view is active */}
              {!showAbroadSubmissions && !showNonSubmitted && (
                <button
                  onClick={() => {
                    setShowAlternativeSubmissions(prev => !prev)
                    setShowAbroadSubmissions(false)
                    setShowNonSubmitted(false)
                    if (!showAlternativeSubmissions && alternativeSubmissions.length === 0) {
                      fetchAlternativeSubmissions(1)
                    }
                  }}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
                    showAlternativeSubmissions
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2 inline" />
                  {showAlternativeSubmissions ? 'Regular Submissions' : 'Alternative Submissions'}
                </button>
              )}

              {/* Abroad Submissions – hidden when alternative view is active */}
              {!showAlternativeSubmissions && (
                <button
                  onClick={() => {
                    setShowAbroadSubmissions(prev => !prev)
                    setShowAlternativeSubmissions(false)
                    setShowNonSubmitted(false)
                  }}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
                    showAbroadSubmissions
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2 inline" />
                  {showAbroadSubmissions ? 'Regular Submissions' : 'Abroad Submissions'}
                </button>
              )}

              {/* Non-Submitted – hidden when alternative or abroad view is active */}
              {!showAlternativeSubmissions && !showAbroadSubmissions && (
                <button
                  onClick={() => {
                    setShowNonSubmitted(prev => !prev)
                  }}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors w-full sm:w-auto ${
                    showNonSubmitted
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserX className="w-4 h-4 mr-2 inline" />
                  {showNonSubmitted ? 'All Submissions' : 'Non-Submitted'}
                </button>
              )}

              {/* Export only available in regular mode (not non-submitted) */}
              {!showAlternativeSubmissions && !showAbroadSubmissions && !showNonSubmitted && (
                <button
                  onClick={handleExport}
                  className="btn-primary text-sm w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters — only shown in regular submissions mode (not non-submitted) */}
        {!showAlternativeSubmissions && !showAbroadSubmissions && !showNonSubmitted && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <div className="flex flex-col gap-3">
            {/* First Row: Search and Status */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search by Name */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by member name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-select pl-10"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Second Row: Location Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* District Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={districtFilter}
                    onChange={(e) => {
                      const next = e.target.value
                      setDistrictFilter(next)
                      // reset dependent filters
                      setAreaFilter('all')
                      setUnitFilter('all')
                    }}
                    className="form-select pl-10"
                  >
                    <option value="all">All Districts</option>
                    {uniqueDistricts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={areaFilter}
                    onChange={(e) => {
                      const next = e.target.value
                      setAreaFilter(next)
                      // reset unit when area changes
                      setUnitFilter('all')
                    }}
                    className="form-select pl-10"
                  >
                    <option value="all">All Areas</option>
                    {uniqueAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="form-select pl-10"
                  >
                    <option value="all">All Units</option>
                    {uniqueUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Third Row: Quarter + Year Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Year Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="form-select pl-10"
                  >
                    <option value="all">All Years</option>
                    {submissionYears.map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quarter Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={quarterFilter}
                    onChange={(e) => setQuarterFilter(e.target.value)}
                    className="form-select pl-10"
                  >
                    <option value="all">All Quarters</option>
                    <option value="1">Q1 (Jan–Mar)</option>
                    <option value="2">Q2 (Apr–Jun)</option>
                    <option value="3">Q3 (Jul–Sep)</option>
                    <option value="4">Q4 (Oct–Dec)</option>
                  </select>
                </div>
              </div>

              {/* Clear period filters */}
              {(quarterFilter !== 'all' || yearFilter !== 'all') && (
                <div className="flex items-center">
                  <button
                    onClick={() => { setQuarterFilter('all'); setYearFilter('all') }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                    Clear Period
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Non-Submitted Filter Panel */}
        {showNonSubmitted && !showAlternativeSubmissions && !showAbroadSubmissions && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                Filter members who have not submitted
              </div>

              {/* Row 1: Year + Quarter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 sm:flex-initial sm:w-48">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={nsYear}
                      onChange={e => setNsYear(e.target.value)}
                      className="form-select pl-10"
                    >
                      <option value="">Select Year *</option>
                      {nsYearOptions.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 sm:flex-initial sm:w-48">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={nsQuarter}
                      onChange={e => setNsQuarter(e.target.value)}
                      className="form-select pl-10"
                    >
                      <option value="">Select Quarter *</option>
                      <option value="1">Q1 (Jan–Mar)</option>
                      <option value="2">Q2 (Apr–Jun)</option>
                      {!Q3_DISABLED && <option value="3">Q3 (Jul–Sep)</option>}
                      <option value="4">Q4 (Oct–Dec)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: District + Area + Unit */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 sm:flex-initial sm:w-48">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={nsDistrict}
                      onChange={e => { setNsDistrict(e.target.value); setNsArea('all'); setNsUnit('all') }}
                      className="form-select pl-10"
                    >
                      <option value="all">All Districts</option>
                      {uniqueDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 sm:flex-initial sm:w-48">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={nsArea}
                      onChange={e => { setNsArea(e.target.value); setNsUnit('all') }}
                      className="form-select pl-10"
                    >
                      <option value="all">All Areas</option>
                      {nsUniqueAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 sm:flex-initial sm:w-48">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={nsUnit}
                      onChange={e => setNsUnit(e.target.value)}
                      className="form-select pl-10"
                    >
                      <option value="all">All Units</option>
                      {nsUniqueUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => fetchNonSubmitted(1)}
                    disabled={!nsQuarter || !nsYear || nonSubmittedLoading}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {nonSubmittedLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </button>

                  {nonSubmittedFetched && nonSubmittedList.length > 0 && (
                    <>
                      <button
                        onClick={handleNonSubmittedExportCSV}
                        className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        CSV
                      </button>
                      <button
                        onClick={handleNonSubmittedExportPDF}
                        className="text-sm px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Non-Submitted Results */}
        {showNonSubmitted && !showAlternativeSubmissions && !showAbroadSubmissions && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-3">
            {nonSubmittedLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Searching non-submitted members...</p>
              </div>
            ) : !nonSubmittedFetched ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserX className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select filters and search</h3>
                <p className="text-gray-500 text-sm">Choose a quarter and year, then click Search to see who hasn't submitted.</p>
              </div>
            ) : nonSubmittedList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All members submitted!</h3>
                <p className="text-gray-500 text-sm">
                  Everyone in the selected filters has submitted for {nonSubmittedPeriodDisplay}.
                </p>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <UserX className="w-4 h-4" />
                    <span className="font-semibold">{nonSubmittedPagination.total}</span> members have not submitted for{' '}
                    <span className="font-semibold">{nonSubmittedPeriodDisplay}</span>
                    <span className="text-red-600 text-xs ml-1">(out of {nonSubmittedTotalRukns} total)</span>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Member Name</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-32">Rukn ID</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-44">District</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-44">Area</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-44">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nonSubmittedList.map((member, index) => {
                        const serial = (nonSubmittedPagination.current - 1) * 10 + index + 1
                        return (
                          <tr key={String(member.id)} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 font-medium">{serial}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                  <span className="text-xs font-medium text-red-600">
                                    {(member.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{member.ruknId || '—'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{member.district || '—'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{member.area || '—'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">{member.unit || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden p-4 space-y-3">
                  {nonSubmittedList.map((member, index) => {
                    const serial = (nonSubmittedPagination.current - 1) * 10 + index + 1
                    return (
                      <div key={String(member.id)} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-red-600">{serial}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            {member.ruknId && <div className="text-xs text-gray-500">ID: {member.ruknId}</div>}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                          <span>{[member.district, member.area, member.unit].filter(Boolean).join(' - ') || 'N/A'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Pagination pagination={nonSubmittedPagination} onPageChange={fetchNonSubmitted} loading={nonSubmittedLoading} itemLabel="members" />
              </>
            )}
          </div>
        )}

        {/* Abroad Submissions View */}
        {showAbroadSubmissions ? (
          <AbroadSubmissions />
        ) : showAlternativeSubmissions ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {alternativeSubmissionsLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading alternative submissions...</p>
              </div>
            ) : alternativeSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No alternative submissions found</h3>
                <p className="text-gray-600">No alternative submissions have been submitted yet.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-64">Member</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-32">Type</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-40">Period</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-40">Reason</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-28">Status</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-40">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alternativeSubmissions.map((submission, index) => {
                        const serialNumber = (alternativePagination.current - 1) * alternativeItemsPerPage + index + 1
                        return (
                        <tr 
                          key={submission._id || submission.id} 
                          onClick={() => navigate(`/ihthisabi/alternative-submissions/${submission._id || submission.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 font-medium">{serialNumber}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-orange-600">
                                  {(submission.ruknName || submission.userId?.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {submission.ruknName || submission.userId?.name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  RUKN ID: {submission.userId?.ruknId || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                {submission.district} - {submission.area} - {submission.unit}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              submission.type === 'Aged' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {submission.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900">
                            {submission.periodDisplay || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-gray-600 truncate block max-w-xs" title={submission.reason}>
                              {submission.reason?.substring(0, 50)}{submission.reason?.length > 50 ? '...' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              submission.adminReply?.message 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}>
                              {submission.adminReply?.message ? (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Replied
                                </>
                              ) : (
                                'Submitted'
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {formatDate(submission.submittedAt || submission.createdAt)}
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden p-4 space-y-4">
                  {alternativeSubmissions.map((submission) => {
                    return (
                    <div
                      key={submission._id || submission.id}
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/ihthisabi/alternative-submissions/${submission._id || submission.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-orange-600">
                              {(submission.ruknName || submission.userId?.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.ruknName || submission.userId?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              RUKN ID: {submission.userId?.ruknId || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.adminReply?.message 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {submission.adminReply?.message ? 'Replied' : 'Submitted'}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {submission.district} - {submission.area} - {submission.unit}
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Type: <span className="font-medium">{submission.type}</span></span>
                          <span>Period: <span className="font-medium">{submission.periodDisplay || 'N/A'}</span></span>
                        </div>
                        <div>
                          <span className="font-medium">Reason:</span> {submission.reason?.substring(0, 80)}{submission.reason?.length > 80 ? '...' : ''}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                              {formatDate(submission.submittedAt || submission.createdAt)}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>

                <Pagination pagination={alternativePagination} onPageChange={fetchAlternativeSubmissions} loading={alternativeSubmissionsLoading} itemLabel="results" />
              </>
            )}
          </div>
        ) : (
        !showNonSubmitted ? (
        <>
        {/* Submissions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {paginatedSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || districtFilter !== 'all' || areaFilter !== 'all' || unitFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Submissions will appear here once members start reporting.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-64">
                        Member
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-40">
                        Period
                      </th>
                     
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-28">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-32">
                        Reply
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-40">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSubmissions.map((submission, index) => {
                      const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      const hasReply = submission.adminReply?.message;
                      return (
                        <tr 
                          key={submission.id} 
                          onClick={() => handleViewSubmission(submission.id)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 font-medium">
                            {serialNumber}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-white">
                                  {(submission.ruknName || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {submission.ruknName || 'Unknown User'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[520px] md:max-w-[600px] lg:max-w-[700px]" title={buildLocationDisplay(submission)}>
                              {buildLocationDisplay(submission)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900">
                            {submission.periodDisplay || 'N/A'}
                          </td>
                       
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(submission.status)} truncate`}>
                              {getStatusIcon(submission.status)}
                              <span className="ml-1 capitalize">{submission.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                hasReply 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : 'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSubmission(submission.id);
                              }}
                            >
                              {hasReply ? (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Replied
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Reply
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {formatDate(submission.submittedAt || submission.createdAt)}
                            </div>
                          </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                <div className="p-4 space-y-4">
                  {paginatedSubmissions.map((submission, index) => {
                    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const hasReply = submission.adminReply?.message;
                    return (
                      <div 
                        key={submission.id} 
                        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleViewSubmission(submission.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-medium text-gray-600">
                                {serialNumber}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-medium text-white">
                                {(submission.ruknName || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.ruknName || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-600 flex items-center">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate max-w-[220px]" title={buildLocationDisplay(submission)}>
                                  {buildLocationDisplay(submission)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor(submission.status)}`}>
                              {getStatusIcon(submission.status)}
                              <span className="ml-1 capitalize">{submission.status}</span>
                            </span>
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                hasReply 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : 'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSubmission(submission.id);
                              }}
                            >
                              {hasReply ? (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Replied
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Reply
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-2 text-xs">
                        <div>
                          <span className="text-gray-500">Period:</span>
                          <div className="font-medium">{submission.periodDisplay || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <div className="font-medium capitalize">{submission.status || 'submitted'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Submitted:</span>
                          <div className="font-medium">{formatDate(submission.submittedAt || submission.createdAt)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Location:</span>
                          <div className="font-medium">{buildLocationDisplay(submission)}</div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <Pagination pagination={pagination} onPageChange={setCurrentPage} loading={loading} itemLabel="results" />
            </>
          )}
        </div>
        </>
        ) : null
        )}

      {/* Right-side details drawer */}
      {drawerOpen && !showAlternativeSubmissions && !showAbroadSubmissions && (
        <div className="fixed inset-0 z-40">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDrawer}></div>
          {/* panel */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-[560px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Submission Details</h3>
                {details?.periodDisplay && (
                  <p className="text-xs text-gray-500">{details.periodDisplay}</p>
                )}
              </div>
              <button onClick={closeDrawer} className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
                <CloseIcon className="w-4" />
              </button>
            </div>

            {/* Q3 Disabled Warning */}
            {Q3_DISABLED && details?.submissionPeriod?.quarter === 3 && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Q3 submissions are currently disabled and hidden from public view.</span>
              </div>
            )}

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5">
              {detailsLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading…</div>
              ) : !details ? (
                <div className="text-center text-gray-500 text-sm">No data</div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const form = details.form || {};
                    const isDynamic = !!(details.dynamicFormId && details.dynamicFormData);
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

                    if (isDynamic) {
                      const data = details.dynamicFormData || {};

                      const renderDynamicQuestions = () => {
                        if (drawerFormSchema) {
                          const questions = [...(drawerFormSchema.questions || [])].sort((a, b) => a.order - b.order);
                          return questions.map((question, index) => {
                            const qId = question.questionId;
                            const value = data[qId];
                            const label = question.questionTextMl || question.questionText;
                            let displayElement;

                            if (question.answerType === 'group') {
                              displayElement = (
                                <div className="grid grid-cols-3 gap-2">
                                  {question.subFields?.map((sf, sfIdx) => {
                                    const fid = sf.fieldId || `field_${sfIdx}`;
                                    return (
                                      <div key={fid} className="bg-gray-50 rounded px-2 py-2 text-center">
                                        <p className="text-[10px] text-gray-500 mb-0.5">{sf.labelMl || sf.label}</p>
                                        <p className="font-bold text-lg text-gray-900">{(value || {})[fid] ?? 0}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            } else if (question.answerType === 'radio' || question.answerType === 'dropdown') {
                              const opt = question.options?.find(o => o.value === value);
                              displayElement = (
                                <div className="bg-gray-50 rounded px-3 py-2">
                                  <span className="text-xs font-medium text-gray-900">{opt ? (opt.labelMl || opt.label) : (value || '-')}</span>
                                </div>
                              );
                            } else if (question.answerType === 'checkbox') {
                              const selected = Array.isArray(value) ? value : [];
                              const display = selected.length
                                ? selected.map(v => { const opt = question.options?.find(o => o.value === v); return opt ? (opt.labelMl || opt.label) : v; }).join(', ')
                                : '-';
                              displayElement = (
                                <div className="bg-gray-50 rounded px-3 py-2">
                                  <span className="text-xs font-medium text-gray-900">{display}</span>
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
                                  <span className="text-xs font-medium text-gray-900">{String(value || '-')}</span>
                                </div>
                              );
                            }

                            return (
                              <div key={qId} className="border-b border-gray-100 pb-3">
                                <h4 className="text-xs font-semibold text-gray-900 mb-2 leading-relaxed">{index + 1}. {label}</h4>
                                {displayElement}
                              </div>
                            );
                          });
                        }

                        // Fallback: no schema — show raw keys
                        return Object.entries(data).map(([key, value], index) => {
                          let displayVal = value;
                          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            displayVal = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
                          } else if (Array.isArray(value)) {
                            displayVal = value.join(', ');
                          }
                          return (
                            <div key={key} className="border-b border-gray-100 pb-3">
                              <h4 className="text-xs font-semibold text-gray-900 mb-1">{index + 1}. {key}</h4>
                              <div className="bg-gray-50 rounded px-3 py-2">
                                <span className="text-xs font-medium text-gray-900">{String(displayVal)}</span>
                              </div>
                            </div>
                          );
                        });
                      };

                      return (
                        <>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
                            Dynamic Form Submission
                          </div>
                          {renderDynamicQuestions()}
                        </>
                      );
                    }

                    return (
                      <>
                        {/* Member */}
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                            {(details.ruknName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{details.ruknName || 'Unknown Member'}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1" />
                              <span>{buildLocationDisplay(details)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status + Submitted */}
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                          <div>
                            <div className="text-[10px] text-gray-500 mb-1">Status</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(details.status)}`}>
                              {getStatusIcon(details.status)}
                              <span className="ml-1 capitalize">{details.status}</span>
                            </span>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-1">Submitted</div>
                            <div className="text-xs text-gray-900">{formatDate(details.createdAt)}</div>
                          </div>
                        </div>

                        {/* Question 1: Quran Study */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഖുർആൻ പഠനം : സൂറ അന്നിസാഅ് (87 ആയഹ്)- തഫ്സീർ മുന്നിൽ വെച്ചുള്ള പഠനം :</h4>
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
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഹദീസ് പഠനം</h4>
                          <p className="text-2xl font-bold text-primary">{form.hadithCount || 0}</p>
                        </div>

                        {/* Question 3: Book Reading */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">പുസ്തക വായന</h4>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
                              <span className="text-gray-700">A. മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും</span>
                              <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.islami)}</span>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
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
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">പ്രതിവാര യോഗം</h4>
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
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">പ്രാദേശിക ജമാഅത്തെ യോഗം</h4>
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
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഗൃഹയോഗങ്ങൾ</h4>
                          <p className="text-xl font-bold text-gray-900">{form.grihameetings || 0}</p>
                        </div>

                        {/* Question 7: Thahreeki Meetings */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">തഹ്രീകീ യോഗം - പങ്കാളിത്തം</h4>
                          <p className="text-xl font-bold text-gray-900">{form.thahreekiMeetings || 0}</p>
                        </div>

                        {/* Question 8: Baithulmaal */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">ബൈതുല്മാല് (2%)</h4>
                          <p className="text-sm font-semibold text-gray-900">{getLabel(form.baithulmaal)}</p>
                        </div>

                        {/* Question 9: Zakat */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?</h4>
                          <p className="text-sm font-semibold text-gray-900">{getLabel(form.zakatPaid)}</p>
                        </div>

                        {/* Question 10: New Members */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)</h4>
                          <p className="text-xl font-bold text-gray-900">{form.newMembers || 0}</p>
                        </div>

                        {/* Question 11: Muslim Relations */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)</h4>
                          <p className="text-xl font-bold text-gray-900">{form.muslimRelations || 0}</p>
                        </div>

                        {/* Question 12: Community Relations */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)</h4>
                          <p className="text-xl font-bold text-gray-900">{form.communityRelations || 0}</p>
                        </div>

                        {/* Question 13: Score Count */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)</h4>
                          <p className="text-xl font-bold text-gray-900">{form.scoreCount || 0}</p>
                        </div>

                        {/* Question 14: Meqath Service */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">100പേർക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാർഗറ്റ് മുന്നിൽ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവർത്തനം തൃപ്തികരമാണോ?</h4>
                          <p className="text-sm font-semibold text-gray-900">{getLabel(form.meqathService)}</p>
                        </div>

                        {/* Question 15: Skill Usage */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകൾ ദീനീമാർഗത്തിൽ സാധ്യമാകുന്ന അളവിൽ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?</h4>
                          <p className="text-sm font-semibold text-gray-900">{getLabel(form.skillUsage)}</p>
                        </div>

                        {/* Question 16: Jamaath Influence */}
                        <div className="pb-3 border-b border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?</h4>
                          <div className="flex items-center space-x-2 mt-2">
                            {form.jamaathInfluence && (
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const backendValue = form.jamaathInfluence
                                  let isActive = false
                                  if (backendValue === 'no' && star <= 1) isActive = true
                                  if (backendValue === 'small' && star <= 3) isActive = true
                                  if (backendValue === 'yes' && star <= 5) isActive = true
                                  
                                  return (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
                                    />
                                  )
                                })}
                                <span className="ml-2 text-xs text-gray-700 font-medium">{getLabel(form.jamaathInfluence)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                </div>
              )}
            </div>

            {/* Footer - Fixed Reply Section */}
            {details && !detailsLoading && (
              <div className="border-t border-gray-200 bg-white p-5 flex-shrink-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Admin Reply
                </h4>
                
                {/* Show existing reply if available */}
                {details?.adminReply?.message && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-800 mb-2 font-medium">Previous Reply:</div>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{details.adminReply.message}</p>
                    {details.adminReply.repliedAt && (
                      <div className="text-xs text-blue-700 mt-2">
                        Replied on: {formatDate(details.adminReply.repliedAt)}
                      </div>
                    )}
                  </div>
                )}

                {/* Reply Form */}
                <div className="space-y-3">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Enter your reply message..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                  
                  {whatsappStatus !== null && (
                    <div className={`text-xs flex items-center ${
                      whatsappStatus ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      <Smartphone className="w-3.5 h-3.5 mr-1" />
                      {whatsappStatus 
                        ? 'WhatsApp message sent successfully' 
                        : 'WhatsApp message could not be sent'}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={closeDrawer}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReply}
                      disabled={!replyMessage.trim() || replyLoading}
                      className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center font-medium shadow-sm"
                      style={{ backgroundColor: '#121A2A' }}
                    >
                      {replyLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default AllSubmissions
