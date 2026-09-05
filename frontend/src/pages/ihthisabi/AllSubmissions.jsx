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
  UserX,
  BarChart3,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Q3_DISABLED } from '../../utils/ihthisabi/quarterHelper'
import AbroadSubmissions from './AbroadSubmissions'
import Pagination from '../../components/ihthisabi/Pagination'

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
  // Filters stay collapsed on mobile so the list is visible without scrolling past
  // a screenful of dropdowns. Always expanded from sm: up.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const itemsPerPage = 10

  // Drawer state for professional inline details view
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [drawerFormSchema, setDrawerFormSchema] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [nsExporting, setNsExporting] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [showAlternativeSubmissions, setShowAlternativeSubmissions] = useState(false)
  const [showAbroadSubmissions, setShowAbroadSubmissions] = useState(false)
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [alternativeSubmissionsLoading, setAlternativeSubmissionsLoading] = useState(false)
  const [alternativePagination, setAlternativePagination] = useState({ current: 1, pages: 1, total: 0 })
  const alternativeItemsPerPage = 10

  // Alternative submissions filter state (mirrors the regular submissions filters)
  const [altSearchTerm, setAltSearchTerm] = useState('')
  const [altStatusFilter, setAltStatusFilter] = useState('all')
  const [altDistrictFilter, setAltDistrictFilter] = useState('all')
  const [altAreaFilter, setAltAreaFilter] = useState('all')
  const [altUnitFilter, setAltUnitFilter] = useState('all')
  const [altYearFilter, setAltYearFilter] = useState('all')
  const [altQuarterFilter, setAltQuarterFilter] = useState('all')
  const [altFiltersOpen, setAltFiltersOpen] = useState(false)
  const [altUniqueAreas, setAltUniqueAreas] = useState([])
  const [altUniqueUnits, setAltUniqueUnits] = useState([])

  // Non-submitted view state
  const [showNonSubmitted, setShowNonSubmitted] = useState(false)
  const [nsQuarter, setNsQuarter] = useState('')
  const [nsYear, setNsYear] = useState('')
  const [nsDistrict, setNsDistrict] = useState('all')
  const [nsArea, setNsArea] = useState('all')
  const [nsUnit, setNsUnit] = useState('all')
  const [nsSearch, setNsSearch] = useState('')
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

  const [debouncedAltSearchTerm, setDebouncedAltSearchTerm] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAltSearchTerm(altSearchTerm), 400)
    return () => clearTimeout(t)
  }, [altSearchTerm])

  // Cascading area/unit options for the alternative submissions filter
  useEffect(() => {
    if (altDistrictFilter === 'all') {
      setAltUniqueAreas([])
      setAltAreaFilter('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/areas', { params: { district: altDistrictFilter } })
      .then(res => setAltUniqueAreas((res.data.data || []).map(a => a.name).sort()))
      .catch(() => {})
  }, [altDistrictFilter])

  useEffect(() => {
    if (altDistrictFilter === 'all' || altAreaFilter === 'all') {
      setAltUniqueUnits([])
      setAltUnitFilter('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/units', { params: { district: altDistrictFilter, area: altAreaFilter } })
      .then(res => setAltUniqueUnits((res.data.data || []).map(u => u.name).sort()))
      .catch(() => {})
  }, [altDistrictFilter, altAreaFilter])

  // Refetch alternative submissions from page 1 whenever the tab opens or a filter changes
  useEffect(() => {
    if (!showAlternativeSubmissions || !user || user.role !== 'admin') return
    fetchAlternativeSubmissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlternativeSubmissions, altStatusFilter, altDistrictFilter, altAreaFilter, altUnitFilter, altQuarterFilter, altYearFilter, debouncedAltSearchTerm])

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
      if (nsSearch.trim()) params.search = nsSearch.trim()
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
    if (nsSearch.trim()) params.search = nsSearch.trim()
    const response = await api.get('/ihthisabi/admin/non-submitted', { params })
    return response.data?.data?.nonSubmitted || []
  }

  const handleNonSubmittedExportCSV = async () => {
    if (nsExporting) return
    setNsExporting(true)
    try {
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
    } finally {
      setNsExporting(false)
    }
  }

  const handleNonSubmittedExportPDF = async () => {
    if (nsExporting) return
    setNsExporting(true)
    try {
    const nonSubmittedList = await fetchAllNonSubmittedForExport().catch(() => {
      toast.error('Failed to export')
      return null
    })
    if (!nonSubmittedList) return
    if (nonSubmittedList.length === 0) {
      toast.error('No records to export')
      return
    }
    // jspdf + autotable are ~350KB and only this one button needs them, so they are
    // pulled in on click instead of shipping with the page's initial bundle.
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ])

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
    } finally {
      setNsExporting(false)
    }
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

  // Drives the badge on the mobile "Filters" toggle so narrowed results are never
  // silently hidden behind a collapsed panel.
  const activeFilterCount = [
    statusFilter, districtFilter, areaFilter, unitFilter, quarterFilter, yearFilter,
  ].filter(v => v !== 'all').length

  const altActiveFilterCount = [
    altStatusFilter, altDistrictFilter, altAreaFilter, altUnitFilter, altQuarterFilter, altYearFilter,
  ].filter(v => v !== 'all').length

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
      const params = { page: page, limit: alternativeItemsPerPage }
      if (altStatusFilter !== 'all') params.status = altStatusFilter
      if (altDistrictFilter !== 'all') params.district = altDistrictFilter
      if (altAreaFilter !== 'all') params.area = altAreaFilter
      if (altUnitFilter !== 'all') params.unit = altUnitFilter
      if (altQuarterFilter !== 'all') params.quarter = altQuarterFilter
      if (altYearFilter !== 'all') params.year = altYearFilter
      if (debouncedAltSearchTerm) params.search = debouncedAltSearchTerm
      const response = await api.get('/alternative-submissions/all', { params })
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
    if (exporting) return
    setExporting(true)
    try {
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
    } finally {
      setExporting(false)
    }
  }

  // Show loading while authentication is being checked
  if (authLoading || loading) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
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
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
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
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell">
        {/* Header — desktop only. On mobile the app bar already names the page and
            Export moves into the search row, so no row is spent on a title. */}
        <div className="mb-2 hidden items-center justify-between gap-2 lg:flex">
          <h1 className="ih-page-title">All Submissions</h1>
          {!showAlternativeSubmissions && !showAbroadSubmissions && !showNonSubmitted && (
            <button onClick={handleExport} disabled={exporting} className="btn-primary shrink-0 gap-1.5">
              {exporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          )}
        </div>

        {/* View switcher — one compact row instead of four stacked full-width buttons */}
        <div className="ih-segment mb-3">
          <button
            onClick={() => {
              setShowAlternativeSubmissions(false)
              setShowAbroadSubmissions(false)
              setShowNonSubmitted(false)
            }}
            className={`ih-segment-btn py-2.5 sm:py-1.5 ${
              !showAlternativeSubmissions && !showAbroadSubmissions && !showNonSubmitted
                ? 'ih-segment-btn-active' : ''
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Regular</span>
          </button>
          <button
            onClick={() => {
              setShowAlternativeSubmissions(true)
              setShowAbroadSubmissions(false)
              setShowNonSubmitted(false)
            }}
            className={`ih-segment-btn py-2.5 sm:py-1.5 ${showAlternativeSubmissions ? 'ih-segment-btn-active text-orange-700' : ''}`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Alt</span>
          </button>
          <button
            onClick={() => {
              setShowAbroadSubmissions(true)
              setShowAlternativeSubmissions(false)
              setShowNonSubmitted(false)
            }}
            className={`ih-segment-btn py-2.5 sm:py-1.5 ${showAbroadSubmissions ? 'ih-segment-btn-active text-blue-700' : ''}`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Abroad</span>
          </button>
          <button
            onClick={() => {
              setShowNonSubmitted(true)
              setShowAlternativeSubmissions(false)
              setShowAbroadSubmissions(false)
            }}
            className={`ih-segment-btn py-2.5 sm:py-1.5 ${showNonSubmitted ? 'ih-segment-btn-active text-red-700' : ''}`}
          >
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span>Pending</span>
          </button>
        </div>

        {/* Filters — only shown in regular submissions mode (not non-submitted) */}
        {!showAlternativeSubmissions && !showAbroadSubmissions && !showNonSubmitted && (
        <div className="ih-surface mb-3 p-2.5 sm:p-3">
          {/* Search + filter toggle share one row */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="ih-filter-icon" />
              <input
                type="text"
                placeholder="Search name or Rukn ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ih-field h-[44px] pr-3 text-base sm:h-9 sm:text-sm"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className={`inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:hidden ${
                activeFilterCount > 0
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500'
              }`}
              style={activeFilterCount > 0 ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Export"
              className="btn-primary h-[44px] w-[44px] min-h-0 shrink-0 p-0 sm:h-9 sm:w-9 lg:hidden"
            >
              {exporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Filter controls — collapsed on mobile until toggled, always shown from sm: */}
          <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-2 grid-cols-2 gap-2 sm:mt-2 sm:!grid sm:grid-cols-3 lg:grid-cols-6`}>
            <div className="relative">
              <Filter className="ih-filter-icon" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select
                value={districtFilter}
                onChange={(e) => { setDistrictFilter(e.target.value); setAreaFilter('all'); setUnitFilter('all') }}
                className="ih-filter-select truncate text-[13px] sm:text-sm"
              >
                <option value="all">All Districts</option>
                {uniqueDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select
                value={areaFilter}
                onChange={(e) => { setAreaFilter(e.target.value); setUnitFilter('all') }}
                className="ih-filter-select truncate text-[13px] sm:text-sm"
              >
                <option value="all">All Areas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Units</option>
                {uniqueUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="ih-filter-icon" />
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Years</option>
                {submissionYears.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="ih-filter-icon" />
              <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Quarters</option>
                <option value="1">Q1 (Jan–Mar)</option>
                <option value="2">Q2 (Apr–Jun)</option>
                <option value="3">Q3 (Jul–Sep)</option>
                <option value="4">Q4 (Oct–Dec)</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all'); setDistrictFilter('all'); setAreaFilter('all')
                  setUnitFilter('all'); setQuarterFilter('all'); setYearFilter('all')
                }}
                className="col-span-2 inline-flex items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800 sm:col-span-1"
                style={{ backgroundColor: 'rgba(16,24,40,0.04)' }}
              >
                <CloseIcon className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
        )}

        {/* Alternative submissions filters — same controls as the regular view */}
        {showAlternativeSubmissions && (
        <div className="ih-surface mb-3 p-2.5 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="ih-filter-icon" />
              <input
                type="text"
                placeholder="Search name or Rukn ID..."
                value={altSearchTerm}
                onChange={(e) => setAltSearchTerm(e.target.value)}
                className="ih-field h-[44px] pr-3 text-base sm:h-9 sm:text-sm"
              />
            </div>
            <button
              onClick={() => setAltFiltersOpen(o => !o)}
              className={`inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:hidden ${
                altActiveFilterCount > 0
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500'
              }`}
              style={altActiveFilterCount > 0 ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
              aria-expanded={altFiltersOpen}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {altActiveFilterCount > 0 && <span>{altActiveFilterCount}</span>}
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${altFiltersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className={`${altFiltersOpen ? 'grid' : 'hidden'} mt-2 grid-cols-2 gap-2 sm:mt-2 sm:!grid sm:grid-cols-3 lg:grid-cols-6`}>
            <div className="relative">
              <Filter className="ih-filter-icon" />
              <select value={altStatusFilter} onChange={(e) => setAltStatusFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="replied">Replied</option>
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select
                value={altDistrictFilter}
                onChange={(e) => { setAltDistrictFilter(e.target.value); setAltAreaFilter('all'); setAltUnitFilter('all') }}
                className="ih-filter-select truncate text-[13px] sm:text-sm"
              >
                <option value="all">All Districts</option>
                {uniqueDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select
                value={altAreaFilter}
                onChange={(e) => { setAltAreaFilter(e.target.value); setAltUnitFilter('all') }}
                className="ih-filter-select truncate text-[13px] sm:text-sm"
              >
                <option value="all">All Areas</option>
                {altUniqueAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select value={altUnitFilter} onChange={(e) => setAltUnitFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Units</option>
                {altUniqueUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="ih-filter-icon" />
              <select value={altYearFilter} onChange={(e) => setAltYearFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Years</option>
                {submissionYears.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="ih-filter-icon" />
              <select value={altQuarterFilter} onChange={(e) => setAltQuarterFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Quarters</option>
                <option value="1">Q1 (Jan–Mar)</option>
                <option value="2">Q2 (Apr–Jun)</option>
                <option value="3">Q3 (Jul–Sep)</option>
                <option value="4">Q4 (Oct–Dec)</option>
              </select>
            </div>

            {altActiveFilterCount > 0 && (
              <button
                onClick={() => {
                  setAltStatusFilter('all'); setAltDistrictFilter('all'); setAltAreaFilter('all')
                  setAltUnitFilter('all'); setAltQuarterFilter('all'); setAltYearFilter('all')
                }}
                className="col-span-2 inline-flex items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800 sm:col-span-1"
                style={{ backgroundColor: 'rgba(16,24,40,0.04)' }}
              >
                <CloseIcon className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
        )}

        {/* Non-Submitted Filter Panel */}
        {showNonSubmitted && !showAlternativeSubmissions && !showAbroadSubmissions && (
          <div className="ih-surface p-2 sm:p-3 mb-2">
            <div className="relative mb-2">
              <Search className="ih-filter-icon" />
              <input
                type="text"
                placeholder="Search name or Rukn ID..."
                value={nsSearch}
                onChange={(e) => setNsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nsQuarter && nsYear && !nonSubmittedLoading) fetchNonSubmitted(1)
                }}
                className="ih-field pr-3 text-base sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="relative">
                <Calendar className="ih-filter-icon" />
                <select value={nsYear} onChange={e => setNsYear(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                  <option value="">Year *</option>
                  {nsYearOptions.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="ih-filter-icon" />
                <select value={nsQuarter} onChange={e => setNsQuarter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                  <option value="">Quarter *</option>
                  <option value="1">Q1 (Jan–Mar)</option>
                  <option value="2">Q2 (Apr–Jun)</option>
                  {!Q3_DISABLED && <option value="3">Q3 (Jul–Sep)</option>}
                  <option value="4">Q4 (Oct–Dec)</option>
                </select>
              </div>

              <div className="relative">
                <MapPin className="ih-filter-icon" />
                <select
                  value={nsDistrict}
                  onChange={e => { setNsDistrict(e.target.value); setNsArea('all'); setNsUnit('all') }}
                  className="ih-filter-select truncate text-[13px] sm:text-sm"
                >
                  <option value="all">All Districts</option>
                  {uniqueDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <MapPin className="ih-filter-icon" />
                <select
                  value={nsArea}
                  onChange={e => { setNsArea(e.target.value); setNsUnit('all') }}
                  className="ih-filter-select truncate text-[13px] sm:text-sm"
                >
                  <option value="all">All Areas</option>
                  {nsUniqueAreas.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <MapPin className="ih-filter-icon" />
                <select value={nsUnit} onChange={e => setNsUnit(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                  <option value="all">All Units</option>
                  {nsUniqueUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchNonSubmitted(1)}
                  disabled={!nsQuarter || !nsYear || nonSubmittedLoading}
                  className="btn-primary flex-1 gap-1 px-2 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {nonSubmittedLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Search
                </button>

                {nonSubmittedFetched && nonSubmittedList.length > 0 && (
                  <>
                    <button
                      onClick={handleNonSubmittedExportCSV}
                      disabled={nsExporting}
                      title="Export CSV"
                      className="ih-icon-btn border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                    >
                      {nsExporting ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleNonSubmittedExportPDF}
                      disabled={nsExporting}
                      title="Export PDF"
                      className="ih-icon-btn border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {nsExporting ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Non-Submitted Results */}
        {showNonSubmitted && !showAlternativeSubmissions && !showAbroadSubmissions && (
          <div className="ih-surface overflow-hidden mb-3">
            {nonSubmittedLoading ? (
              <div className="px-4 py-8 text-center sm:py-12">
                <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-xs text-gray-500">Searching non-submitted members...</p>
              </div>
            ) : !nonSubmittedFetched ? (
              <div className="px-4 py-8 text-center sm:py-12">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                  <UserX className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="mb-1 text-sm font-medium text-gray-900">Select filters and search</h3>
                <p className="text-xs text-gray-500">Choose a quarter and year, then tap Search.</p>
              </div>
            ) : nonSubmittedList.length === 0 ? (
              <div className="px-4 py-8 text-center sm:py-12">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="mb-1 text-sm font-medium text-gray-900">All members submitted</h3>
                <p className="text-xs text-gray-500">
                  Everyone in the selected filters has submitted for {nonSubmittedPeriodDisplay}.
                </p>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="flex items-center gap-1.5 border-b border-red-100 bg-red-50 px-3 py-1.5 text-[11px] leading-tight text-red-800 sm:text-xs">
                  <UserX className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">{nonSubmittedPagination.total}</span> of {nonSubmittedTotalRukns} pending for{' '}
                    <span className="font-semibold">{nonSubmittedPeriodDisplay}</span>
                  </span>
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
                <div className="lg:hidden ih-list">
                  {nonSubmittedList.map((member, index) => {
                    const serial = (nonSubmittedPagination.current - 1) * 10 + index + 1
                    return (
                      <div key={String(member.id)} className="ih-list-row ih-list-row-roomy">
                        <div className="ih-avatar h-9 w-9 bg-red-100 text-red-600">{serial}</div>
                        <div className="min-w-0 flex-1">
                          <div className="ih-list-title">{member.name}</div>
                          <div className="ih-list-meta mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {[member.district, member.area, member.unit].filter(Boolean).join(' - ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                        {member.ruknId && (
                          <span className="ih-list-meta shrink-0">{member.ruknId}</span>
                        )}
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
          <div className="ih-surface overflow-hidden">
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
                <p className="text-gray-600">
                  {altSearchTerm || altActiveFilterCount > 0
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No alternative submissions have been submitted yet.'}
                </p>
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(`/ihthisabi/alternative-submissions/${submission._id || submission.id}`)
                            }
                          }}
                          role="button"
                          tabIndex={0}
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
                <div className="lg:hidden ih-list">
                  {alternativeSubmissions.map((submission) => (
                    <div
                      key={submission._id || submission.id}
                      className="ih-list-row ih-list-row-roomy cursor-pointer"
                      onClick={() => navigate(`/ihthisabi/alternative-submissions/${submission._id || submission.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/ihthisabi/alternative-submissions/${submission._id || submission.id}`)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ih-avatar h-9 w-9 bg-orange-100 text-orange-600">
                        {(submission.ruknName || submission.userId?.name || 'U').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="ih-list-title">
                          {submission.ruknName || submission.userId?.name || 'Unknown User'}
                        </div>
                        <div className="ih-list-meta mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {[submission.district, submission.area, submission.unit].filter(Boolean).join(' - ') || 'N/A'}
                          </span>
                        </div>
                        <div className="ih-list-meta mt-1">
                          {submission.type} · {submission.periodDisplay || 'N/A'} · {formatDate(submission.submittedAt || submission.createdAt)}
                        </div>
                      </div>

                      <span className={`ih-chip ${
                        submission.adminReply?.message
                          ? 'border-blue-200 bg-blue-100 text-blue-800'
                          : 'border-orange-200 bg-orange-100 text-orange-800'
                      }`}>
                        {submission.adminReply?.message ? 'Replied' : 'Submitted'}
                      </span>
                    </div>
                  ))}
                </div>

                <Pagination pagination={alternativePagination} onPageChange={fetchAlternativeSubmissions} loading={alternativeSubmissionsLoading} itemLabel="results" />
              </>
            )}
          </div>
        ) : (
        !showNonSubmitted ? (
        <>
        {/* Submissions Table */}
        <div className="ih-surface overflow-hidden">
          {paginatedSubmissions.length === 0 ? (
            <div className="px-4 py-8 text-center sm:py-12">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="mb-1 text-sm font-medium text-gray-900">No submissions found</h3>
              <p className="text-xs text-gray-500">
                {searchTerm || activeFilterCount > 0
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleViewSubmission(submission.id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
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
                            <span className={`ih-chip ih-chip-dot ${getStatusColor(submission.status)}`}>
                              <span className="capitalize">{submission.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button
                              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-70 ${
                                hasReply ? 'text-blue-500' : 'text-amber-600'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSubmission(submission.id);
                              }}
                            >
                              {hasReply ? <MessageSquare className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                              {hasReply ? 'Replied' : 'Reply'}
                            </button>
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

              {/* Mobile Cards — two lines per row. Every child is min-w-0 or shrink-0
                  so the status/reply chips can never be pushed off the card edge. */}
              <div className="lg:hidden ih-list">
                {paginatedSubmissions.map((submission, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const hasReply = submission.adminReply?.message;
                  return (
                    <div
                      key={submission.id}
                      className="ih-list-row ih-list-row-roomy cursor-pointer"
                      onClick={() => handleViewSubmission(submission.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleViewSubmission(submission.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="w-4 shrink-0 text-[11px] font-medium text-gray-300">{serialNumber}</span>
                      <div className="ih-avatar h-9 w-9 bg-gradient-to-br from-primary to-primary-700 text-white shadow-sm">
                        {(submission.ruknName || 'U').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="ih-list-title">{submission.ruknName || 'Unknown User'}</div>
                        <div className="ih-list-meta mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0 opacity-60" />
                          <span className="truncate" title={buildLocationDisplay(submission)}>
                            {buildLocationDisplay(submission)}
                          </span>
                        </div>
                        <div className="ih-list-meta mt-1">
                          {submission.periodDisplay || 'N/A'} · {formatDate(submission.submittedAt || submission.createdAt)}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`ih-chip ih-chip-dot ${getStatusColor(submission.status)}`}>
                          <span className="capitalize">{submission.status}</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSubmission(submission.id);
                          }}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium leading-none transition-opacity hover:opacity-70 ${
                            hasReply ? 'text-blue-500' : 'text-amber-600'
                          }`}
                        >
                          {hasReply ? <MessageSquare className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                          {hasReply ? 'Replied' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              <button onClick={closeDrawer} className="p-2 -m-2 rounded-md hover:bg-gray-100 text-gray-500" aria-label="Close">
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
              <div
                className="border-t border-gray-200 bg-white p-5 flex-shrink-0"
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
              >
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
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReply}
                      disabled={!replyMessage.trim() || replyLoading}
                      className="btn-primary"
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
