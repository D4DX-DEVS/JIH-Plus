import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { useError } from '../../contexts/ErrorContext'
import { api } from '../../utils/ihthisabi/api'
import UserManagement from '../../components/ihthisabi/UserManagement'
import UserManagementDynamic from '../../components/ihthisabi/UserManagementDynamic'
import AbroadCountryManagement from '../../components/ihthisabi/AbroadCountryManagement'
import AbroadMemberManagement from '../../components/ihthisabi/AbroadMemberManagement'
import AbroadSubmissions from './AbroadSubmissions'
import UnitAdminProfileModal from '../../components/ihthisabi/UnitAdminProfileModal'
import letterheadImage from '../../assets/LH.png'
import { 
  Users, 
  FileText, 
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity,
  Eye,
  XCircle,
  Settings,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Download,
  Globe,
  Archive,
  Database,
  ChevronDown,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadUnitReplyPDF } from '../../utils/unitReplyPdfGenerator'
import { Q3_DISABLED } from '../../utils/ihthisabi/quarterHelper'
import { renderTemplate, getDefaultBlocks } from '../../utils/ihthisabi/replyTemplateEngine'
import ReplyTemplateBuilder from '../../components/ihthisabi/ReplyTemplateBuilder'
import ArchiveManagement from '../../components/ihthisabi/ArchiveManagement'
import MasterDataManagement from '../../components/ihthisabi/MasterDataManagement'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from 'recharts'
// Dynamic Forms temporarily hidden

const AdminDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { showError } = useError()
  const [dashboardData, setDashboardData] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const getTabFromPath = (pathname) => {
    if (pathname.endsWith('/members')) return 'users'
    if (pathname.endsWith('/unit-admins')) return 'unitadmins'
    if (pathname.endsWith('/unit-reply')) return 'unitreply'
    if (pathname.endsWith('/user-management')) return 'user-management'
    if (pathname.endsWith('/archive')) return 'archive'
    if (pathname.endsWith('/abroad-countries')) return 'abroad-countries'
    if (pathname.endsWith('/abroad-members')) return 'abroad-members'
    if (pathname.endsWith('/master-data')) return 'master-data'
    return 'dashboard'
  }

  const activeTab = getTabFromPath(location.pathname)

  const [unitAdmins, setUnitAdmins] = useState([])
  const [unitAdminLoading, setUnitAdminLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [districts, setDistricts] = useState([])
  const [unitAdminMessage, setUnitAdminMessage] = useState({ title: '', description: '' })
  const [unitAdminMessageSending, setUnitAdminMessageSending] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [selectedUnitAdminId, setSelectedUnitAdminId] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)

  // District-wise submission stats + chart district selection (Dashboard tab)
  const [districtStats, setDistrictStats] = useState([])
  const [districtStatsLoading, setDistrictStatsLoading] = useState(false)
  const [selectedChartDistricts, setSelectedChartDistricts] = useState([])
  const [chartDistrictsInitialized, setChartDistrictsInitialized] = useState(false)
  const [chartDistrictDropdownOpen, setChartDistrictDropdownOpen] = useState(false)
  const [chartDistrictSearch, setChartDistrictSearch] = useState('')
  const chartDistrictDropdownRef = useRef(null)

  // Submitted / Pending units (Dashboard tab)
  const [unitsStatus, setUnitsStatus] = useState(null)
  const [unitsStatusLoading, setUnitsStatusLoading] = useState(false)
  const [unitsStatusDistrict, setUnitsStatusDistrict] = useState('')
  const [unitsStatusArea, setUnitsStatusArea] = useState('')
  const [unitsStatusDistricts, setUnitsStatusDistricts] = useState([])
  const [unitsStatusAreas, setUnitsStatusAreas] = useState([])
  const [unitsListTab, setUnitsListTab] = useState('pending')

  // Unit Reply Form State
  // Submission quarter = previous quarter (units submit for the prior quarter)
  const _currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
  const _submissionQuarter = _currentQuarter === 1 ? 4 : _currentQuarter - 1
  const _submissionYear = _currentQuarter === 1 ? new Date().getFullYear() - 1 : new Date().getFullYear()

  const [replyFormData, setReplyFormData] = useState({
    unit: '',
    year: _submissionYear,
    quarter: _submissionQuarter,
    submittedMembers: [],
    quranStudyCompleted: [],
    quranStudyNotCompleted: [],
    hadithReadingCompleted: [],
    hadithReadingNotCompleted: [],
    bookReadingCompleted: [],
    bookReadingNotCompleted: [],
    weeklyMeetingAbsentees: [],
    weeklyMeetingPresent: [],
    jamaathMeetingAbsentees: [],
    jamaathMeetingPresent: [],
    grihaMeetingsThreeOrMore: [],
    grihaMeetingsLessThanThree: [],
    baitulmalDefaulters: [],
    baitulmalPaid: [],
    presentationSatisfactory: [],
    presentationUnsatisfactory: []
  })
  // Cascading unit selection for unit reply
  const [replyDistrict, setReplyDistrict] = useState('')
  const [replyArea, setReplyArea] = useState('')
  const [replyDistricts, setReplyDistricts] = useState([])
  const [replyAreas, setReplyAreas] = useState([])
  const [replyUnits, setReplyUnits] = useState([])
  const [replyAreasLoading, setReplyAreasLoading] = useState(false)
  const [replyUnitsLoading, setReplyUnitsLoading] = useState(false)
  const [replyDataLoading, setReplyDataLoading] = useState(false)
  const [replySending, setReplySending] = useState(false)
  const [formattedReply, setFormattedReply] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Reply template state
  const [replyTemplate, setReplyTemplate] = useState(getDefaultBlocks())
  const [templateEditing, setTemplateEditing] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [formFieldLabels, setFormFieldLabels] = useState({})
  const [templateQuarter, setTemplateQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3))

  const isSuperAdmin = user?.isAdmin || user?.role === 'mainAdmin'

  useEffect(() => {
    // Only fetch data if user is authenticated
    console.log('AdminDashboard useEffect - User:', user)
    console.log('User role:', user?.role)
    console.log('Is admin?', user?.role === 'admin' || user?.role === 'mainAdmin')
    
    if (user && (user.role === 'admin' || user.role === 'mainAdmin')) {
      fetchDashboardData()
      fetchSubmissions()
      fetchReplyDistricts()
      fetchReplyTemplate()
      fetchDistrictStats()
      fetchUnitsStatusDistrictOptions()
      fetchUnitsStatus()
    }
  }, [user])

  // Default to just the single most active district — the full list is too dense
  // to be useful as a default view. Districts are pre-sorted by current count desc.
  useEffect(() => {
    if (!chartDistrictsInitialized && districtStats.length > 0) {
      setSelectedChartDistricts([districtStats[0].district])
      setChartDistrictsInitialized(true)
    }
  }, [districtStats, chartDistrictsInitialized])

  // Close the district-picker dropdown when clicking outside of it
  useEffect(() => {
    if (!chartDistrictDropdownOpen) return
    const handleClickOutside = (e) => {
      if (chartDistrictDropdownRef.current && !chartDistrictDropdownRef.current.contains(e.target)) {
        setChartDistrictDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [chartDistrictDropdownOpen])

  const toggleChartDistrict = (district) => {
    setSelectedChartDistricts((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    )
  }

  // Lazy-load unit admins data when that tab is active
  useEffect(() => {
    if (activeTab === 'unitadmins' && user && (user.role === 'admin' || user.role === 'mainAdmin')) {
      if (unitAdmins.length === 0) fetchUnitAdmins()
      if (districts.length === 0) fetchDistricts()
    }
  }, [activeTab, user])

  // Add retry functionality for failed requests
  const retryFailedRequests = () => {
    if (user && user.role === 'admin') {
      setLoading(true)
      setHasError(false)
      fetchDashboardData()
      fetchSubmissions()
    }
  }

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/ihthisabi/admin/dashboard/stats')
      setDashboardData(response.data.data)
      console.log(response.data.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setHasError(true)
      
      // Don't show error toast for network issues or server errors
      // Only show for actual authentication issues
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.')
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.')
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error('Failed to load dashboard data')
      }
    }
  }

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/ihthisabi/admin/submissions')
      setSubmissions(response.data.data.submissions || [])
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      setHasError(true)
      
      // Don't show error toast for network issues or server errors
      // Only show for actual authentication issues
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.')
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.')
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error('Failed to load submissions')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchUnitAdmins = async (search = '', district = '', page = 1) => {
    try {
      setUnitAdminLoading(true)
      const params = {}
      if (search) params.search = search
      if (district) params.district = district
      params.page = page
      params.limit = 100 // Show 100 records per page
      
      const response = await api.get('/ihthisabi/admin/unitadmins', { params })
      console.log('Unit admins response:', response.data.data)
      setUnitAdmins(response.data.data.unitAdmins || [])
      setPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
    } catch (error) {
      console.error('Error fetching unit admins:', error)
      toast.error('Failed to fetch unit admins')
    } finally {
      setUnitAdminLoading(false)
    }
  }

  const fetchDistricts = async () => {
    try {
      const response = await api.get('/ihthisabi/admin/unitadmins/districts')
      setDistricts(response.data.data.districts || [])
    } catch (error) {
      console.error('Error fetching districts:', error)
    }
  }

  const fetchDistrictStats = async () => {
    try {
      setDistrictStatsLoading(true)
      const response = await api.get('/ihthisabi/admin/dashboard/district-stats')
      setDistrictStats(response.data.data.districts || [])
    } catch (error) {
      console.error('Error fetching district stats:', error)
    } finally {
      setDistrictStatsLoading(false)
    }
  }

  const fetchUnitsStatusDistrictOptions = async () => {
    try {
      const response = await api.get('/location/districts')
      setUnitsStatusDistricts((response.data.data || []).map(d => d.name || d.id))
    } catch (error) {
      console.error('Error fetching district options:', error)
    }
  }

  const fetchUnitsStatusAreaOptions = async (district) => {
    try {
      setUnitsStatusAreas([])
      if (!district) return
      const response = await api.get(`/location/areas/${encodeURIComponent(district)}`)
      setUnitsStatusAreas((response.data.data || []).map(a => a.name || a.id))
    } catch (error) {
      console.error('Error fetching area options:', error)
    }
  }

  const fetchUnitsStatus = async (district = '', area = '') => {
    try {
      setUnitsStatusLoading(true)
      const params = {}
      if (district) params.district = district
      if (area) params.area = area
      const response = await api.get('/ihthisabi/admin/dashboard/units-status', { params })
      setUnitsStatus(response.data.data)
    } catch (error) {
      console.error('Error fetching units status:', error)
      toast.error('Failed to load unit submission status')
    } finally {
      setUnitsStatusLoading(false)
    }
  }

  const handleUnitsStatusDistrictChange = (district) => {
    setUnitsStatusDistrict(district)
    setUnitsStatusArea('')
    fetchUnitsStatusAreaOptions(district)
    fetchUnitsStatus(district, '')
  }

  const handleUnitsStatusAreaChange = (area) => {
    setUnitsStatusArea(area)
    fetchUnitsStatus(unitsStatusDistrict, area)
  }

  const handleUnitAdminExcelUpload = async (file) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      setUploadResult(null)
      
      const formData = new FormData()
      formData.append('excelFile', file)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)
      
      const response = await api.post('/ihthisabi/admin/upload-unitadmin-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (response.data.success) {
        setUploadResult({
          success: true,
          totalProcessed: response.data.data.totalProcessed,
          created: response.data.data.created,
          updated: response.data.data.updated,
          errors: response.data.data.errors || []
        })
        
        toast.success(`Unit Admin Excel processed: ${response.data.data.created} created, ${response.data.data.updated} updated`)
        fetchUnitAdmins(searchTerm, selectedDistrict) // Refresh the list with current filters
        fetchDistricts() // Refresh districts list
        
        // Clear result after 5 seconds
        setTimeout(() => {
          setUploadResult(null)
        }, 5000)
      }
    } catch (error) {
      console.error('Error uploading unit admin Excel:', error)
      setUploadResult({
        success: false,
        error: error.response?.data?.message || 'Failed to upload unit admin Excel file'
      })
      toast.error('Failed to upload unit admin Excel file')
    } finally {
      setUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    }
  }

  const handleDeleteAllUnitAdmins = async () => {
    try {
      const response = await api.delete('/ihthisabi/admin/unitadmins/delete-all')
      
      if (response.data.success) {
        toast.success(`Successfully deleted ${response.data.data.deletedCount} unit admins`)
        setUnitAdmins([]) // Clear the list
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      console.error('Error deleting all unit admins:', error)
      toast.error(`Failed to delete all unit admins: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleSendUnitAdminMessage = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admin can send broadcast messages')
      return
    }

    if (!unitAdminMessage.title.trim() || !unitAdminMessage.description.trim()) {
      toast.error('Please provide both a title and description')
      return
    }

    try {
      setUnitAdminMessageSending(true)
      const response = await api.post('/ihthisabi/admin/unitadmins/whatsapp-broadcast', {
        title: unitAdminMessage.title,
        description: unitAdminMessage.description
      })

      if (response.data.success) {
        const { sentCount, failedCount, missingContactCount, totalRecipients } = response.data.data.broadcast
        toast.success(`Message sent to ${sentCount} of ${totalRecipients} unit admins`)

        if (failedCount > 0 || missingContactCount > 0) {
          toast(`Failed: ${failedCount}, Missing contact: ${missingContactCount}`, {
            duration: 5000,
            icon: '⚠️'
          })
        }

        setUnitAdminMessage({ title: '', description: '' })
      }
    } catch (error) {
      console.error('Error sending unit admin message:', error)
      toast.error(error.response?.data?.message || 'Failed to send message')
    } finally {
      setUnitAdminMessageSending(false)
    }
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    fetchUnitAdmins(value, selectedDistrict)
  }

  const handleDistrictFilter = (district) => {
    setSelectedDistrict(district)
    fetchUnitAdmins(searchTerm, district, 1) // Reset to page 1 when filtering
  }

  const handlePageChange = (newPage) => {
    fetchUnitAdmins(searchTerm, selectedDistrict, newPage)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedDistrict('')
    fetchUnitAdmins('', '')
  }

  const fetchReplyTemplate = async () => {
    try {
      const response = await api.get('/ihthisabi/admin/reply-template')
      if (response.data.data.template?.blocks?.length > 0) {
        setReplyTemplate(response.data.data.template.blocks)
      }
      // If null (never saved), keep the default blocks already in state
    } catch (error) {
      console.error('Error fetching reply template:', error)
      // Silent — default template will be used
    }
  }

  const fetchFormFields = async (quarter) => {
    try {
      const response = await api.get('/ihthisabi/admin/form-fields', {
        params: { quarter, year: new Date().getFullYear() },
      })
      if (response.data.success) setFormFieldLabels(response.data.data.fieldLabels || {})
    } catch (error) {
      console.error('Error fetching form fields:', error)
    }
  }

  const saveReplyTemplate = async (blocks) => {
    try {
      setTemplateSaving(true)
      const response = await api.put('/ihthisabi/admin/reply-template', { blocks })
      if (response.data.success) {
        setReplyTemplate(blocks)
        setTemplateEditing(false)
        toast.success('Reply template saved')
      }
    } catch (error) {
      console.error('Error saving reply template:', error)
      toast.error(error.response?.data?.message || 'Failed to save template')
    } finally {
      setTemplateSaving(false)
    }
  }

  const fetchReplyDistricts = async () => {
    try {
      const response = await api.get('/ihthisabi/admin/unitadmins/districts')
      setReplyDistricts(response.data.data.districts || [])
    } catch (error) {
      console.error('Error fetching reply districts:', error)
    }
  }

  const fetchReplyAreas = async (district) => {
    try {
      setReplyAreasLoading(true)
      setReplyAreas([])
      setReplyUnits([])
      setReplyArea('')
      setReplyFormData(prev => ({ ...prev, unit: '' }))
      const response = await api.get('/ihthisabi/admin/unitadmins/areas', { params: { district } })
      setReplyAreas(response.data.data.areas || [])
    } catch (error) {
      console.error('Error fetching reply areas:', error)
    } finally {
      setReplyAreasLoading(false)
    }
  }

  const fetchReplyUnits = async (district, area) => {
    try {
      setReplyUnitsLoading(true)
      setReplyUnits([])
      setReplyFormData(prev => ({ ...prev, unit: '' }))
      const response = await api.get('/ihthisabi/admin/unitadmins/units', { params: { district, area } })
      setReplyUnits(response.data.data.units || [])
    } catch (error) {
      console.error('Error fetching reply units:', error)
    } finally {
      setReplyUnitsLoading(false)
    }
  }

  const fetchReplyData = async () => {
    if (!replyFormData.unit || !replyFormData.year || !replyFormData.quarter) {
      toast.error('Please select unit, year, and quarter')
      return
    }

    try {
      setReplyDataLoading(true)
      const response = await api.get('/ihthisabi/admin/unit-reply-data', {
        params: {
          unit: replyFormData.unit,
          year: replyFormData.year,
          quarter: replyFormData.quarter
        }
      })

      if (response.data.success) {
        const data = response.data.data.aggregatedData
        setReplyFormData(prev => ({
          ...prev,
          submittedMembers: data.submittedMembers || [],
          quranStudyCompleted: data.quranStudyCompleted || [],
          quranStudyNotCompleted: data.quranStudyNotCompleted || [],
          hadithReadingCompleted: data.hadithReadingCompleted || [],
          hadithReadingNotCompleted: data.hadithReadingNotCompleted || [],
          bookReadingCompleted: data.bookReadingCompleted || [],
          bookReadingNotCompleted: data.bookReadingNotCompleted || [],
          weeklyMeetingAbsentees: data.weeklyMeetingAbsentees || [],
          weeklyMeetingPresent: data.weeklyMeetingPresent || [],
          jamaathMeetingAbsentees: data.jamaathMeetingAbsentees || [],
          jamaathMeetingPresent: data.jamaathMeetingPresent || [],
          grihaMeetingsThreeOrMore: data.grihaMeetingsThreeOrMore || [],
          grihaMeetingsLessThanThree: data.grihaMeetingsLessThanThree || [],
          baitulmalDefaulters: data.baitulmalDefaulters || [],
          baitulmalPaid: data.baitulmalPaid || [],
          presentationSatisfactory: data.presentationEffort?.satisfactory || [],
          presentationUnsatisfactory: data.presentationEffort?.unsatisfactory || []
        }))
        generateFormattedReply(response.data.data)
        toast.success('Data loaded successfully')
      }
    } catch (error) {
      console.error('Error fetching reply data:', error)
      toast.error(error.response?.data?.message || 'Failed to fetch reply data')
    } finally {
      setReplyDataLoading(false)
    }
  }

  const generateFormattedReply = (data) => {
    const { unit, district, year, quarter, aggregatedData } = data
    const message = renderTemplate(replyTemplate, aggregatedData, { unit, district: district || '', year, quarter })
    setFormattedReply(message)
  }

  const handleSendReply = async () => {
    if (!replyFormData.unit || !replyFormData.year || !replyFormData.quarter || !formattedReply) {
      toast.error('Please fill all required fields and generate reply')
      return
    }

    try {
      setReplySending(true)
      const response = await api.post('/ihthisabi/admin/unit-reply', {
        unit: replyFormData.unit,
        year: replyFormData.year,
        quarter: replyFormData.quarter,
        replyData: {
          submittedMembers: replyFormData.submittedMembers,
          quranStudyCompleted: replyFormData.quranStudyCompleted,
          quranStudyNotCompleted: replyFormData.quranStudyNotCompleted,
          hadithReadingCompleted: replyFormData.hadithReadingCompleted,
          hadithReadingNotCompleted: replyFormData.hadithReadingNotCompleted,
          bookReadingCompleted: replyFormData.bookReadingCompleted,
          bookReadingNotCompleted: replyFormData.bookReadingNotCompleted,
          weeklyMeetingAbsentees: replyFormData.weeklyMeetingAbsentees,
          jamaathMeetingAbsentees: replyFormData.jamaathMeetingAbsentees,
          grihaMeetingsThreeOrMore: replyFormData.grihaMeetingsThreeOrMore,
          grihaMeetingsLessThanThree: replyFormData.grihaMeetingsLessThanThree,
          baitulmalDefaulters: replyFormData.baitulmalDefaulters,
          presentationEffort: {
            satisfactory: replyFormData.presentationSatisfactory,
            unsatisfactory: replyFormData.presentationUnsatisfactory
          }
        },
        formattedMessage: formattedReply
      })

      if (response.data.success) {
        const whatsappSent = response.data.data?.whatsappSent
        if (whatsappSent) {
          toast.success('Reply sent successfully and WhatsApp message delivered!')
        } else {
          toast.success('Reply sent successfully')
          showError({ type: 'whatsapp_failed' })
        }
        // Preserve district/area/unit — only clear the loaded reply data
        setReplyFormData(prev => ({
          ...prev,
          submittedMembers: [],
          quranStudyCompleted: [],
          quranStudyNotCompleted: [],
          hadithReadingCompleted: [],
          hadithReadingNotCompleted: [],
          bookReadingCompleted: [],
          bookReadingNotCompleted: [],
          weeklyMeetingAbsentees: [],
          weeklyMeetingPresent: [],
          jamaathMeetingAbsentees: [],
          jamaathMeetingPresent: [],
          grihaMeetingsThreeOrMore: [],
          grihaMeetingsLessThanThree: [],
          baitulmalDefaulters: [],
          baitulmalPaid: [],
          presentationSatisfactory: [],
          presentationUnsatisfactory: []
        }))
        setFormattedReply('')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error(error.response?.data?.message || 'Failed to send reply')
    } finally {
      setReplySending(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!formattedReply) {
      toast.error('Please generate a reply first')
      return
    }

    try {
      setPdfGenerating(true)
      await downloadUnitReplyPDF(
        formattedReply,
        replyFormData.unit,
        replyFormData.year,
        replyFormData.quarter
      )
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  const _getStatusColor = (status) => {
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
      year: 'numeric'
    })
  }

  // Show loading while authentication is being checked
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading dashboard...'}
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
        <div className="mb-6 sm:mb-8">
          <div className="ih-page-header">
            <div>
              <h1 className="ih-page-title">Admin Dashboard</h1>
              <p className="ih-page-subtitle">
                Welcome back, <span className="font-medium text-gray-900">{user?.name || user?.email}</span>
              </p>
            </div>
            {hasError && (
              <button
                onClick={retryFailedRequests}
                className="mt-4 sm:mt-0 btn-primary"
              >
                <Activity className="w-4 h-4 mr-2" />
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'archive' ? (
          <ArchiveManagement />
        ) : activeTab === 'abroad-countries' ? (
          <AbroadCountryManagement />
        ) : activeTab === 'abroad-members' ? (
          <AbroadMemberManagement />
        ) : activeTab === 'master-data' ? (
          <MasterDataManagement />
        ) : activeTab === 'user-management' ? (
          <UserManagementDynamic />
        ) : activeTab === 'users' ? (
          <UserManagement />
        ) : activeTab === 'unitreply' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Send Reply to Unit Admin</h3>
                <button
                  type="button"
                  onClick={() => {
                    const next = !templateEditing
                    setTemplateEditing(next)
                    if (next) fetchFormFields(templateQuarter)
                  }}
                  className="text-sm px-3 py-1.5 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-50 flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  {templateEditing ? 'Hide Template Editor' : 'Edit Reply Template'}
                </button>
              </div>

              {/* Template Builder (collapsible) */}
              {templateEditing && (
                <div className="mb-6">
                  <ReplyTemplateBuilder
                    blocks={replyTemplate}
                    onChange={setReplyTemplate}
                    onSave={saveReplyTemplate}
                    onCancel={() => setTemplateEditing(false)}
                    onReset={() => {}}
                    saving={templateSaving}
                    fieldLabels={formFieldLabels}
                    selectedQuarter={templateQuarter}
                    onQuarterChange={(q) => { setTemplateQuarter(q); fetchFormFields(q) }}
                  />
                </div>
              )}
              
              {/* Cascading District → Area → Unit Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                  <select
                    value={replyDistrict}
                    onChange={(e) => {
                      setReplyDistrict(e.target.value)
                      if (e.target.value) fetchReplyAreas(e.target.value)
                      else { setReplyAreas([]); setReplyArea(''); setReplyUnits([]); setReplyFormData(prev => ({ ...prev, unit: '' })) }
                    }}
                    className="form-select"
                  >
                    <option value="">Select District</option>
                    {replyDistricts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
                  <select
                    value={replyArea}
                    onChange={(e) => {
                      setReplyArea(e.target.value)
                      if (e.target.value) fetchReplyUnits(replyDistrict, e.target.value)
                      else { setReplyUnits([]); setReplyFormData(prev => ({ ...prev, unit: '' })) }
                    }}
                    className="form-select"
                    disabled={!replyDistrict || replyAreasLoading}
                  >
                    <option value="">
                      {replyAreasLoading ? 'Loading...' : (!replyDistrict ? 'Select District first' : 'Select Area')}
                    </option>
                    {replyAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={replyFormData.unit}
                    onChange={(e) => setReplyFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="form-select"
                    disabled={!replyArea || replyUnitsLoading}
                  >
                    <option value="">
                      {replyUnitsLoading ? 'Loading...' : (!replyArea ? 'Select Area first' : 'Select Unit')}
                    </option>
                    {replyUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year & Quarter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={replyFormData.year}
                    onChange={(e) => setReplyFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="form-input"
                    min="2020"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
                  <select
                    value={replyFormData.quarter}
                    onChange={(e) => setReplyFormData(prev => ({ ...prev, quarter: parseInt(e.target.value) }))}
                    className="form-select"
                  >
                    <option value={1}>Q1 (Jan-Mar)</option>
                    <option value={2}>Q2 (Apr-Jun)</option>
                    <option value={3} disabled={Q3_DISABLED}>Q3 (Jul-Sep) {Q3_DISABLED && '(Disabled)'}</option>
                    <option value={4}>Q4 (Oct-Dec)</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={fetchReplyData}
                disabled={!replyFormData.unit || replyDataLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replyDataLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Load Data & Generate Reply</span>
                  </>
                )}
              </button>
              
              {/* Formatted Reply Preview */}
              {formattedReply && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Formatted Reply Preview</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(formattedReply)
                          toast.success('Reply copied to clipboard')
                        }}
                        className="btn-ghost text-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={pdfGenerating || !formattedReply}
                        className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pdfGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Styled Letter Preview */}
                  <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-white" style={{ minHeight: '600px' }}>
                      {/* Letterhead */}
                      <div 
                        className="border-b-2 border-black text-center"
                        style={{ 
                          paddingTop: '15mm',
                          paddingLeft: '20mm',
                          paddingRight: '20mm',
                          paddingBottom: '20px'
                        }}
                      >
                        <img 
                          src={letterheadImage} 
                          alt="Letterhead" 
                          className="max-w-full h-auto mx-auto mb-2"
                          style={{ maxHeight: '120px' }}
                        />
                      </div>
                      
                      {/* Letter Content */}
                      <div 
                        className="malayalam-text"
                        style={{ 
                          paddingTop: '30px',
                          paddingLeft: '20mm',
                          paddingRight: '20mm',
                          paddingBottom: '15mm',
                          lineHeight: '1.8',
                          fontSize: '14px',
                          color: '#000',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word'
                        }}
                      >
                        {formattedReply}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={handleSendReply}
                      disabled={replySending || !formattedReply}
                      className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replySending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'unitadmins' ? (
          <div className="space-y-6">
            

            {/* Unit Admin Excel Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Unit Admin Excel</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel file containing unit admin data. Expected format: Unit, District/City, Area (optional), Rukn ID, Rukn Name, Contact No, Email Id
              </p>
              
              {/* Upload Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        handleUnitAdminExcelUpload(file)
                      }
                    }}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-600 disabled:opacity-50"
                  />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Upload Results */}
                {uploadResult && (
                  <div className={`p-4 rounded-lg border ${
                    uploadResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {uploadResult.success ? (
                      <div>
                        <div className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <h4 className="text-sm font-semibold text-green-800">Upload Completed Successfully!</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{uploadResult.totalProcessed}</div>
                            <div className="text-green-700">Total Processed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{uploadResult.created}</div>
                            <div className="text-blue-700">New Created</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{uploadResult.updated}</div>
                            <div className="text-purple-700">Updated</div>
                          </div>
                        </div>
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-red-600 font-medium">Errors ({uploadResult.errors.length}):</p>
                            <div className="max-h-32 overflow-y-auto">
                              {uploadResult.errors.slice(0, 5).map((error, index) => (
                                <p key={index} className="text-xs text-red-600">
                                  {error.ruknId} - {error.name}: {error.error}
                                </p>
                              ))}
                              {uploadResult.errors.length > 5 && (
                                <p className="text-xs text-red-600">... and {uploadResult.errors.length - 5} more errors</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-semibold text-red-800">Upload Failed</h4>
                          <p className="text-sm text-red-600">{uploadResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Unit Admin WhatsApp Broadcast */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Send WhatsApp Message</h3>
                  <p className="text-sm text-gray-600">This message will be sent to all active unit admins.</p>
                </div>
                {!isSuperAdmin && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    Super admin only
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={unitAdminMessage.title}
                    onChange={(e) => setUnitAdminMessage(prev => ({ ...prev, title: e.target.value }))}
                    className="form-input"
                    placeholder="Enter message title"
                    disabled={!isSuperAdmin || unitAdminMessageSending}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={unitAdminMessage.description}
                    onChange={(e) => setUnitAdminMessage(prev => ({ ...prev, description: e.target.value }))}
                    className="form-textarea min-h-[120px]"
                    placeholder="Enter message description"
                    disabled={!isSuperAdmin || unitAdminMessageSending}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={handleSendUnitAdminMessage}
                  disabled={!isSuperAdmin || unitAdminMessageSending || !unitAdminMessage.title.trim() || !unitAdminMessage.description.trim()}
                  className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unitAdminMessageSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Unit Admins List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Unit Admins</h3>
                    <div className="text-sm text-gray-600">
                      <span>Total Count: <span className="font-semibold text-blue-600">{pagination.total || unitAdmins.length}</span></span>
                      {pagination.pages > 1 && (
                        <span className="ml-4">Page: <span className="font-semibold text-green-600">{pagination.current}</span> of <span className="font-semibold text-green-600">{pagination.pages}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search unit admins..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="form-input pl-10"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* District Filter */}
                    <select
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictFilter(e.target.value)}
                      className="form-select w-full sm:w-auto"
                    >
                      <option value="">All Districts</option>
                      {districts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>

                    {/* Clear Filters Button */}
                    {(searchTerm || selectedDistrict) && (
                      <button
                        onClick={clearFilters}
                        className="btn-ghost w-full sm:w-auto"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Clear</span>
                      </button>
                    )}
                    
                    {/* Delete All Button */}
                    {unitAdmins.length > 0 && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn-primary bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        <span>Delete All</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                {unitAdminLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading unit admins...</p>
                  </div>
                ) : unitAdmins.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Admin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            District
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Area
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {unitAdmins.map((admin) => (
                          <tr 
                            key={admin._id}
                            onClick={() => {
                              setSelectedUnitAdminId(admin._id)
                              setShowProfileModal(true)
                            }}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary-600">
                                      {admin.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                                  <div className="text-sm text-gray-500">ID: {admin.ruknId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {admin.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {admin.district}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {admin.area || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-1" />
                                  {admin.contactNo}
                                </div>
                                <div className="flex items-center mt-1">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {admin.emailId}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                admin.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {admin.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No unit admins found</p>
                    <p className="text-sm text-gray-400 mt-1">Upload an Excel file to add unit admins</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="px-3 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="text-sm text-gray-700 text-center sm:text-left">
                        Showing page {pagination.current} of {pagination.pages}
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.current - 1)}
                          disabled={pagination.current <= 1}
                          className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-md font-medium">
                          {pagination.current}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.current + 1)}
                          disabled={pagination.current >= pagination.pages}
                          className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            {dashboardData && (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-5 sm:mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {dashboardData.totalRuknUsers || 0}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  {dashboardData.maleUsers || 0} Male
                </span>
                <span className="flex items-center gap-1 text-pink-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                  {dashboardData.femaleUsers || 0} Female
                </span>
              </div>
            </div>

            {/* Quarter Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">Quarter Comparison</p>
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-end gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Q{dashboardData.prevQuarter} {dashboardData.prevYear}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-500">{dashboardData.previousQuarterSubmissions || 0}</p>
                </div>
                <div className="text-gray-300 text-xl sm:text-2xl mb-1">→</div>
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Q{dashboardData.currentQuarter} {dashboardData.currentYear}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{dashboardData.currentQuarterSubmissions || 0}</p>
                </div>
              </div>
            </div>

            {/* Current Period Submissions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">This Period</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {dashboardData.currentQuarterSubmissions || 0}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  {dashboardData.currentQuarterMale || 0} Male
                </span>
                <span className="flex items-center gap-1 text-pink-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                  {dashboardData.currentQuarterFemale || 0} Female
                </span>
              </div>
              <button
                onClick={() => navigate('submissions')}
                className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All Submissions →
              </button>
            </div>

            {/* Quarter Change */}
            {(() => {
              const pct = dashboardData.quarterChangePercent ?? 0;
              const isUp = pct >= 0;
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">vs Previous Quarter</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? '+' : ''}{pct}%
                      </p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-lg ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <ArrowUpRight className={`w-6 h-6 ${isUp ? 'text-emerald-600' : 'text-red-500'} ${isUp ? '' : 'rotate-90'}`} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Activity className="w-4 h-4 mr-1" />
                    Q{dashboardData.prevQuarter} → Q{dashboardData.currentQuarter}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Charts */}
        {dashboardData && (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Current quarter gender submissions chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Q{dashboardData.currentQuarter} {dashboardData.currentYear} — Submissions by Gender
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: 'Male', value: dashboardData.currentQuarterMale || 0, fill: '#3b82f6' },
                    { name: 'Female', value: dashboardData.currentQuarterFemale || 0, fill: '#ec4899' },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {[{ fill: '#3b82f6' }, { fill: '#ec4899' }].map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Members Status pie */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Members Status</h3>
              {(() => {
                const totalUsers = dashboardData.totalRuknUsers || 0;
                const submitted = dashboardData.currentQuarterSubmissions || 0;
                const notSubmitted = Math.max(0, totalUsers - submitted);
                const pieData = [
                  { name: 'Submitted', value: submitted },
                  { name: 'Pending', value: notSubmitted },
                ];
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        <Cell fill="#10b981" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>

          {/* Quarter comparison gauge */}
          {(() => {
            const prev = dashboardData.previousQuarterSubmissions || 0;
            const curr = dashboardData.currentQuarterSubmissions || 0;
            const maxVal = Math.max(prev, curr, 1);
            const gaugeData = [
              { name: `Q${dashboardData.prevQuarter} ${dashboardData.prevYear}`, value: Math.round((prev / maxVal) * 100), fill: '#94a3b8', rawCount: prev },
              { name: `Q${dashboardData.currentQuarter} ${dashboardData.currentYear}`, value: Math.round((curr / maxVal) * 100), fill: '#002349', rawCount: curr },
            ];
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Quarter vs Quarter Submissions</h3>
                <p className="text-xs text-gray-400 mb-4">Relative comparison of submissions between quarters</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    innerRadius="30%"
                    outerRadius="90%"
                    data={gaugeData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      minAngle={5}
                      dataKey="value"
                      cornerRadius={6}
                      label={false}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [`${props.payload.rawCount} submissions`, props.payload.name]}
                    />
                    <Legend
                      iconType="circle"
                      formatter={(value, entry) => `${entry.payload.name}: ${entry.payload.rawCount}`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
          </>
        )}

        {/* District-wise submissions & comparison with last period */}
        {dashboardData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">District-wise Submissions</h3>
                <p className="text-xs text-gray-400">
                  {districtStats.length > 0 &&
                    `Q${dashboardData.prevQuarter} ${dashboardData.prevYear} vs Q${dashboardData.currentQuarter} ${dashboardData.currentYear}, by district`}
                </p>
              </div>
              <div className="relative" ref={chartDistrictDropdownRef}>
                <button
                  type="button"
                  onClick={() => setChartDistrictDropdownOpen((v) => !v)}
                  className="form-select text-sm min-w-[220px] flex items-center justify-between gap-2 text-left"
                >
                  <span className="truncate">
                    {selectedChartDistricts.length === 0
                      ? 'Select districts...'
                      : selectedChartDistricts.length === 1
                        ? selectedChartDistricts[0]
                        : `${selectedChartDistricts.length} districts selected`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {chartDistrictDropdownOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={chartDistrictSearch}
                          onChange={(e) => setChartDistrictSearch(e.target.value)}
                          placeholder="Search districts..."
                          className="form-input text-sm pl-8 w-full"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setSelectedChartDistricts(districtStats.map((d) => d.district))}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedChartDistricts([])}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {districtStats
                        .filter((d) => d.district.toLowerCase().includes(chartDistrictSearch.toLowerCase()))
                        .map((d) => (
                          <label
                            key={d.district}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedChartDistricts.includes(d.district)}
                              onChange={() => toggleChartDistrict(d.district)}
                              className="rounded border-gray-300"
                            />
                            <span className="flex-1 truncate">{d.district}</span>
                            <span className="text-xs text-gray-400">{d.current}</span>
                          </label>
                        ))}
                      {districtStats.filter((d) => d.district.toLowerCase().includes(chartDistrictSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">No matching districts</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {districtStatsLoading ? (
              <div className="text-center py-8 text-sm text-gray-500">Loading district stats...</div>
            ) : districtStats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No district data available</p>
            ) : (
              (() => {
                const chartData = districtStats.filter((d) => selectedChartDistricts.includes(d.district))
                if (chartData.length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-6">Select at least one district to display the chart</p>
                }
                return (
                  <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 44)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="district" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="previous" name={`Q${dashboardData.prevQuarter} ${dashboardData.prevYear}`} fill="#94a3b8" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="current" name={`Q${dashboardData.currentQuarter} ${dashboardData.currentYear}`} fill="#002349" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              })()
            )}
          </div>
        )}

        {/* Submitted / Pending units */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Unit Submission Status</h3>
              <p className="text-xs text-gray-400">Units that have submitted this period, and units still pending</p>
            </div>
            <div className="flex gap-2">
              <select
                value={unitsStatusDistrict}
                onChange={(e) => handleUnitsStatusDistrictChange(e.target.value)}
                className="form-select text-sm"
              >
                <option value="">All Districts</option>
                {unitsStatusDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={unitsStatusArea}
                onChange={(e) => handleUnitsStatusAreaChange(e.target.value)}
                className="form-select text-sm"
                disabled={!unitsStatusDistrict}
              >
                <option value="">All Areas</option>
                {unitsStatusAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {unitsStatusLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading unit status...</div>
          ) : unitsStatus ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{unitsStatus.totalUnits}</p>
                  <p className="text-xs text-gray-500">Total Units</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{unitsStatus.submittedCount}</p>
                  <p className="text-xs text-gray-500">Submitted</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{unitsStatus.pendingCount}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setUnitsListTab('pending')}
                  className={`px-3 py-2 text-sm font-medium ${unitsListTab === 'pending' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500'}`}
                >
                  Pending ({unitsStatus.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setUnitsListTab('submitted')}
                  className={`px-3 py-2 text-sm font-medium ${unitsListTab === 'submitted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
                >
                  Submitted ({unitsStatus.submittedCount})
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {(unitsListTab === 'pending' ? unitsStatus.pendingUnits : unitsStatus.submittedUnits).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No units in this list</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="py-2 pr-4">Unit</th>
                        <th className="py-2 pr-4">Area</th>
                        <th className="py-2 pr-4">District</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(unitsListTab === 'pending' ? unitsStatus.pendingUnits : unitsStatus.submittedUnits).map((u, idx) => (
                        <tr key={`${u.district}-${u.area}-${u.unit}-${idx}`}>
                          <td className="py-2 pr-4 font-medium text-gray-900">{u.unit}</td>
                          <td className="py-2 pr-4 text-gray-600">{u.area}</td>
                          <td className="py-2 pr-4 text-gray-600">{u.district}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
                <p className="text-sm text-gray-500 mt-0.5">Latest activity from members</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No submissions yet</h3>
                <p className="text-xs text-gray-500">Submissions will appear here once members start reporting</p>
              </div>
            ) : (
              submissions.slice(0, 8).map((submission) => (
                <div key={submission.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {(submission.ruknName || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.ruknName || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {submission.unit || 'No location'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-gray-500">Period</p>
                        <p className="text-sm font-medium text-gray-900">
                          {submission.periodDisplay || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          submission.status === 'submitted' ? 'bg-blue-400' :
                          submission.status === 'reviewed' ? 'bg-yellow-400' :
                          submission.status === 'approved' ? 'bg-green-400' :
                          'bg-gray-400'
                        }`}></div>
                        <span className="text-xs font-medium text-gray-600 capitalize">
                          {submission.status}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(submission.submittedAt || submission.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {submissions.length > 8 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => {
                  navigate('submissions')
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
              >
                View all submissions →
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <XCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete All Unit Admins</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all {unitAdmins.length} unit admins? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllUnitAdmins}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Admin Profile Modal */}
      <UnitAdminProfileModal
        unitAdminId={selectedUnitAdminId}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          setSelectedUnitAdminId(null)
        }}
      />
    </div>
  )
}

export default AdminDashboard


