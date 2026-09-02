import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { useError } from '../../contexts/ErrorContext'
import { useForm, Controller } from 'react-hook-form'
import { api } from '../../utils/ihthisabi/api'
import locationService from '../../services/locationService'
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal'
import { 
  Send, 
  AlertCircle,
  X,
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  MessageSquare,
  Edit,
  Trash2,
  Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'

const AlternativeSubmissionForm = () => {
  const { id } = useParams()
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth()
  const { showError } = useError()
  const navigate = useNavigate()
  
  // Get the correct dashboard path based on user role
  const getDashboardPath = () => {
    if (authUser?.role === 'unitAdmin') {
      return '/ihthisabi/unitadmin'
    }
    return '/ihthisabi/dashboard'
  }
  const [loading, setLoading] = useState(false)
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)
  const [districts, setDistricts] = useState([])
  const [areas, setAreas] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [user, setUser] = useState(authUser)
  const [districtName, setDistrictName] = useState('')
  const [areaName, setAreaName] = useState('')
  const [viewMode, setViewMode] = useState(false)
  const [submission, setSubmission] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false })
  const [replyMessage, setReplyMessage] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState(null)

  const { register, handleSubmit, formState: { errors }, watch, setValue, control, reset } = useForm({
    defaultValues: {
      type: '',
      district: user?.district || '',
      area: user?.area || '',
      unit: user?.unit || '',
      ruknName: user?.name || '',
      reason: ''
    }
  })

  // Fetch fresh user data
  useEffect(() => {
    const fetchFreshUserData = async () => {
      try {
        // For unitAdmin, use /unitadmin/me endpoint, otherwise use /auth/me
        const endpoint = authUser?.role === 'unitAdmin' ? '/unitadmin/me' : '/auth/me'
        const response = await api.get(endpoint)
        if (response.data?.success && response.data?.data?.user) {
          const freshUser = response.data.data.user
          setUser(freshUser)
          return freshUser
        }
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error)
        if (authUser) {
          setUser(authUser)
          return authUser
        }
      }
      return null
    }
    
    if (authUser) {
      fetchFreshUserData()
    }
  }, [authUser])

  useEffect(() => {
    // Check if we're in view mode (has id param but no edit query param)
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    
    if (id && !editId) {
      // View mode - show details
      setViewMode(true)
      fetchSubmission()
    } else {
      // Form mode - create or edit
      setViewMode(false)
      loadDistricts()
      loadSubmissions()
      loadRegularSubmissions()
      
      const quarter = params.get('quarter')
      const year = params.get('year')
      
      if (editId) {
        setEditMode(true)
        setSubmissionId(editId)
        loadSubmissionData(editId)
      } else if (quarter && year) {
        setSelectedQuarter(parseInt(quarter))
        setSelectedYear(parseInt(year))
      } else {
        // If no quarter/year provided, redirect to regular submission form
        navigate('/ihthisabi/submit')
      }
    }
  }, [id])

  // Watch district changes to load areas
  const selectedDistrict = watch('district')
  useEffect(() => {
    if (selectedDistrict) {
      loadAreas(selectedDistrict)
    } else {
      setAreas([])
      setValue('area', '')
    }
  }, [selectedDistrict, setValue])


  // Load districts
  const loadDistricts = async () => {
    setLoadingDistricts(true)
    try {
      const districtsData = await locationService.getDistricts()
      setDistricts(districtsData)
    } catch (error) {
      console.error('Failed to load districts:', error)
      toast.error('Failed to load districts')
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Load areas for selected district
  const loadAreas = async (districtId) => {
    setLoadingAreas(true)
    try {
      const areasData = await locationService.getAreas(districtId)
      setAreas(areasData)
    } catch (error) {
      console.error('Failed to load areas:', error)
      toast.error('Failed to load areas')
    } finally {
      setLoadingAreas(false)
    }
  }

  // Load alternative submissions to check for existing ones
  const loadSubmissions = async () => {
    try {
      const response = await api.get('/alternative-submissions/my-submissions')
      setAlternativeSubmissions(response.data.data.alternativeSubmissions || [])
    } catch (error) {
      console.error('Failed to load alternative submissions:', error)
      setAlternativeSubmissions([])
    }
  }

  // Load regular submissions to check for conflicts
  const loadRegularSubmissions = async () => {
    try {
      const response = await api.get('/submissions/my-submissions')
      setSubmissions(response.data.data.submissions || [])
    } catch (error) {
      console.error('Failed to load regular submissions:', error)
      setSubmissions([])
    }
  }

  // Fetch submission for view mode
  const fetchSubmission = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/alternative-submissions/${id}`)
      const submissionData = response.data.data.alternativeSubmission
      setSubmission(submissionData)
      // Set existing reply if available
      if (submissionData?.adminReply?.message) {
        setReplyMessage(submissionData.adminReply.message)
      } else {
        setReplyMessage('')
      }
      // Reset WhatsApp status when loading details
      setWhatsappStatus(null)
    } catch (error) {
      console.error('Failed to fetch submission:', error)
      toast.error('Failed to load alternative submission')
      navigate(getDashboardPath())
    } finally {
      setLoading(false)
    }
  }

  // Load submission data for editing
  const loadSubmissionData = async (submissionId) => {
    try {
      const response = await api.get(`/alternative-submissions/${submissionId}`)
      const submissionData = response.data.data.alternativeSubmission
      
      // Set display names
      setDistrictName(submissionData.district || '')
      setAreaName(submissionData.area || '')
      
      setValue('type', submissionData.type)
      setValue('district', submissionData.district || '')
      setValue('area', submissionData.area || '')
      setValue('unit', submissionData.unit || '')
      setValue('ruknName', submissionData.ruknName || '')
      setValue('reason', submissionData.reason || '')
      
      if (submissionData.submissionPeriod) {
        setSelectedQuarter(submissionData.submissionPeriod.quarter)
        setSelectedYear(submissionData.submissionPeriod.year)
      }
    } catch (error) {
      console.error('Failed to load submission data:', error)
      toast.error('Failed to load submission data')
      navigate(getDashboardPath())
    }
  }

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Handle delete
  const handleDelete = async () => {
    try {
      await api.delete(`/alternative-submissions/${id}`)
      toast.success('Alternative submission deleted successfully')
      // Navigate based on user role
      if (authUser?.role === 'admin') {
        navigate('/ihthisabi/admin/submissions')
      } else {
        navigate('/ihthisabi/submit')
      }
    } catch (error) {
      console.error('Failed to delete submission:', error)
      toast.error('Failed to delete alternative submission')
    }
  }

  // Handle admin reply submission
  const handleSubmitReply = async () => {
    if (!replyMessage.trim() || !id) return

    try {
      setReplyLoading(true)
      const response = await api.put(`/alternative-submissions/${id}/reply`, {
        message: replyMessage.trim()
      })

      if (response.data?.success) {
        const whatsappSent = response.data.data?.whatsappSent
        setWhatsappStatus(whatsappSent)
        
        if (whatsappSent !== undefined) {
          if (whatsappSent) {
            toast.success('Reply sent successfully and WhatsApp message delivered!')
          } else {
            toast.success('Reply sent successfully')
            showError({ type: 'whatsapp_failed' })
          }
        } else {
          toast.success('Reply sent successfully')
        }
        // Update submission with new reply
        if (submission && response.data.data?.alternativeSubmission) {
          setSubmission({
            ...submission,
            adminReply: response.data.data.alternativeSubmission.adminReply
          })
        }
      }
    } catch (error) {
      console.error('Failed to submit reply:', error)
      toast.error(error.response?.data?.message || 'Failed to send reply')
    } finally {
      setReplyLoading(false)
    }
  }


  // Update form values when user data is available
  useEffect(() => {
    const populateUserData = async () => {
      if (!user || districts.length === 0 || editMode) {
        console.log('⏳ Waiting for user data or districts, or in edit mode...', { hasUser: !!user, districtsCount: districts.length, editMode })
        return
      }

      console.log('🔄 Starting to populate form data...')
      console.log('   User:', user)
      console.log('   User district:', user.district, 'User area:', user.area)
      console.log('   Available districts:', districts.length)
      
      // Normalize string for comparison (trim, lowercase, remove special chars)
      const normalizeString = (str) => {
        if (!str) return ''
        return str.toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/[^\w\s]/g, '') // Remove special characters except word chars and spaces
      }
      
      // Calculate string similarity (Levenshtein-like, simple version)
      const stringSimilarity = (str1, str2) => {
        const longer = str1.length > str2.length ? str1 : str2
        const shorter = str1.length > str2.length ? str2 : str1
        if (longer.length === 0) return 1.0
        
        // Check if strings are very similar (allowing for 1-2 character differences)
        let matches = 0
        for (let i = 0; i < shorter.length; i++) {
          if (longer.includes(shorter[i])) matches++
        }
        return matches / longer.length
      }
      
      // More flexible matching - try exact match first, then normalized, then fuzzy
      const findDistrict = (userDistrictName) => {
        console.log('   🔎 findDistrict called with:', userDistrictName)
        
        // First try exact match (case-insensitive)
        let found = districts.find(d => {
          if (!d) return false
          const districtName = (d.title || d.name || '').toString().trim()
          const matches = districtName.toLowerCase() === userDistrictName.toLowerCase()
          if (matches) {
            console.log('   ✅ Exact match found:', districtName, '===', userDistrictName)
          }
          return matches
        })
        
        if (found) {
          console.log('   ✅ Returning exact match:', found.title || found.name)
          return found
        }
        
        // Then try normalized match
        const normalizedUserDistrict = normalizeString(userDistrictName)
        console.log('   🔎 Trying normalized match. Normalized user district:', `"${normalizedUserDistrict}"`)
        
        found = districts.find(d => {
          if (!d) return false
          const districtName = normalizeString(d.title || d.name)
          const matches = districtName === normalizedUserDistrict
          if (matches) {
            console.log('   ✅ Normalized match found:', d.title || d.name, '→', `"${districtName}"`, '===', `"${normalizedUserDistrict}"`)
          }
          return matches
        })
        
        if (found) {
          console.log('   ✅ Returning normalized match:', found.title || found.name)
          return found
        }
        
        // Try partial match
        console.log('   🔎 Trying partial match...')
        found = districts.find(d => {
          if (!d) return false
          const districtName = normalizeString(d.title || d.name)
          const matches = districtName.includes(normalizedUserDistrict) || normalizedUserDistrict.includes(districtName)
          if (matches) {
            console.log('   ✅ Partial match found:', d.title || d.name, '→', `"${districtName}"`, 'includes or is included in', `"${normalizedUserDistrict}"`)
          }
          return matches
        })
        
        if (found) {
          console.log('   ✅ Returning partial match:', found.title || found.name)
          return found
        }
        
        // Finally try fuzzy match for common spelling variations (like alappuzha vs alapuzha)
        console.log('   🔎 Trying fuzzy match for spelling variations...')
        found = districts.find(d => {
          if (!d) return false
          const districtName = normalizeString(d.title || d.name)
          
          // Handle common spelling variations
          // Remove duplicate consecutive letters and compare
          const removeDuplicates = (str) => str.replace(/(.)\1+/g, '$1')
          const userNormalized = removeDuplicates(normalizedUserDistrict)
          const districtNormalized = removeDuplicates(districtName)
          
          if (userNormalized === districtNormalized) {
            console.log('   ✅ Fuzzy match found (duplicate letters):', d.title || d.name, '→', `"${districtName}"`, '≈', `"${normalizedUserDistrict}"`)
            return true
          }
          
          // Check similarity score (if very similar, consider it a match)
          const similarity = stringSimilarity(normalizedUserDistrict, districtName)
          if (similarity > 0.85) { // 85% similarity threshold
            console.log('   ✅ Fuzzy match found (high similarity):', d.title || d.name, '→', `"${districtName}"`, '≈', `"${normalizedUserDistrict}"`, `(${(similarity * 100).toFixed(1)}% similar)`)
            return true
          }
          
          return false
        })
        
        if (found) {
          console.log('   ✅ Returning fuzzy match:', found.title || found.name)
        } else {
          console.log('   ❌ No match found after trying all methods')
        }
        
        return found
      }
      
      // Find the correct district by name
      if (!user.district) {
        console.warn('⚠️ User does not have district property')
        return
      }

      const userDistrictName = normalizeString(user.district)
      console.log('🔍 Searching for district...')
      console.log('   User district (original):', user.district)
      console.log('   User district (normalized):', `"${userDistrictName}"`)
      
      const userDistrict = findDistrict(user.district)
      
      if (!userDistrict) {
        console.warn('❌ District not found!')
        console.warn('   User district (original):', user.district)
        console.warn('   Available districts (original):', districts.map(d => d.title || d.name))
        return
      }

      console.log('✅ Found district:', userDistrict.title || userDistrict.name)
      
      const districtId = userDistrict._id || userDistrict.id
      console.log('   District ID:', districtId)
      
      // Set district name for display
      setDistrictName(userDistrict.title || userDistrict.name)
      
      // Load areas for the user's district
      let areaNameToSet = user.area || ''
      try {
        const loadedAreas = await loadAreas(districtId)
        console.log('✅ Loaded areas:', loadedAreas?.length || 0)
        
        // Ensure areas state is updated
        if (loadedAreas && Array.isArray(loadedAreas)) {
          setAreas(loadedAreas)
        }
        
        // Find and set the correct area using the loaded areas data
        if (user.area && loadedAreas && Array.isArray(loadedAreas)) {
          const userAreaName = normalizeString(user.area)
          
          // Try exact match first
          let userArea = loadedAreas.find(a => {
            if (!a) return false
            const areaName = normalizeString(a.title || a.name)
            return areaName === userAreaName
          })
          
          // Try partial match if exact match fails
          if (!userArea) {
            userArea = loadedAreas.find(a => {
              if (!a) return false
              const areaName = normalizeString(a.title || a.name)
              return areaName.includes(userAreaName) || userAreaName.includes(areaName)
            })
          }
          
          if (userArea) {
            areaNameToSet = userArea.title || userArea.name
            console.log('✅ Found area:', areaNameToSet)
          } else {
            console.warn('⚠️ Area not found. User area:', user.area)
            console.warn('   Available areas:', loadedAreas.map(a => a.title || a.name))
            // Use user.area as fallback
            areaNameToSet = user.area
          }
        } else if (!user.area) {
          console.warn('⚠️ User does not have area property')
        }
      } catch (error) {
        console.error('❌ Failed to load areas for user district:', error)
        // Use user.area as fallback
        if (user.area) {
          areaNameToSet = user.area
        }
      }
      
      // Set area name for display
      setAreaName(areaNameToSet)
      
      // Update form values - store names (not IDs) since these are read-only
      console.log('📝 Setting form values...')
      if (districtId) {
        // Store district name for submission
        setValue('district', userDistrict.title || userDistrict.name, { shouldValidate: false, shouldDirty: false, shouldTouch: true })
        console.log('   ✅ Set district:', userDistrict.title || userDistrict.name)
      }
      if (areaNameToSet) {
        // Store area name for submission
        setValue('area', areaNameToSet, { shouldValidate: false, shouldDirty: false, shouldTouch: true })
        console.log('   ✅ Set area:', areaNameToSet)
      }
      if (user.unit) {
        setValue('unit', user.unit, { shouldValidate: false, shouldDirty: false })
        console.log('   ✅ Set unit:', user.unit)
      }
      if (user.name) {
        setValue('ruknName', user.name, { shouldValidate: false, shouldDirty: false })
        console.log('   ✅ Set ruknName:', user.name)
      }
    }
    
    populateUserData()
  }, [user, districts, editMode, setValue, watch])

  // Submit form
  const onSubmit = async (data) => {
    if (!selectedQuarter || !selectedYear) {
      toast.error('Please select a quarter')
      return
    }

    // Check if regular submission exists for this quarter
    try {
      const checkResponse = await api.get('/submissions/my-submissions', {
        params: {
          year: selectedYear,
          month: selectedQuarter * 3 // Approximate month check
        }
      })
      
      const regularSubmissions = checkResponse.data.data.submissions || []
      const hasRegularSubmission = regularSubmissions.some(s => 
        s.submissionPeriod?.year === selectedYear && 
        s.submissionPeriod?.quarter === selectedQuarter
      )
      
      if (hasRegularSubmission) {
        toast.error('You have already submitted a regular submission for this quarter. Cannot submit alternative submission.')
        return
      }
    } catch (error) {
      // If check fails, continue with submission (backend will validate)
      console.error('Failed to check regular submissions:', error)
    }

    setLoading(true)
    try {
      // District, area, and unit are already stored as names (not IDs)
      const payload = {
        type: data.type,
        district: data.district,
        area: data.area,
        unit: data.unit,
        ruknName: data.ruknName,
        reason: data.reason,
        quarter: selectedQuarter,
        year: selectedYear
      }

      if (editMode && submissionId) {
        await api.put(`/alternative-submissions/${submissionId}`, payload)
        toast.success('Alternative submission updated successfully')
      } else {
        await api.post('/alternative-submissions', payload)
        toast.success('Alternative submission created successfully')
      }
      
      navigate(getDashboardPath())
    } catch (error) {
      console.error('Submission error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to submit alternative submission'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // View mode - show details
  if (viewMode) {
    if (authLoading || loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submission details...</p>
          </div>
        </div>
      )
    }

    if (!submission) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Submission Not Found</h3>
            <p className="text-gray-600 mb-6">The alternative submission you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate(getDashboardPath())}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )
    }

    // Backend already enforces that non-admin users can only view their own submissions.
    // Show edit/delete for rukn and unitAdmin (they are always the owner if they can view).
    const isOwner = authUser?.role === 'rukn' || authUser?.role === 'unitAdmin'

    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => {
                // Navigate based on user role
                if (authUser?.role === 'admin') {
                  navigate('/ihthisabi/admin/submissions')
                } else {
                  navigate('/ihthisabi/submit')
                }
              }}
              className="mb-6 flex items-center py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {authUser?.role === 'admin' ? 'Back to Submissions' : 'Back to Quarter Selection'}
            </button>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="hidden lg:block text-3xl font-bold text-gray-900 mb-2">Alternative Submission Details</h1>
                  <p className="text-gray-600">{submission.periodDisplay || 'N/A'}</p>
                </div>
                {isOwner && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/ihthisabi/alternative-submission?edit=${id}`)}
                      className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true })}
                      className="flex items-center px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Submission Period */}
                <div className="border-b pb-4">
                  <div className="flex items-center text-gray-700 mb-2">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Submission Period</span>
                  </div>
                  <p className="text-gray-900 ml-7">{submission.periodDisplay || 'N/A'}</p>
                </div>

                {/* Type */}
                <div className="border-b pb-4">
                  <div className="flex items-center text-gray-700 mb-2">
                    <FileText className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Type</span>
                  </div>
                  <p className="text-gray-900 ml-7">{submission.type}</p>
                </div>

                {/* Reason - Separate Section for Long Paragraphs */}
                {submission.reason && (
                  <div className="border-b pb-4">
                    <div className="flex items-center text-gray-700 mb-3">
                      <FileText className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Reason</span>
                    </div>
                    <div className="ml-7">
                      <p className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                        {submission.reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Information */}
                <div className="border-b pb-4">
                  <div className="flex items-center text-gray-700 mb-3">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="font-semibold">User Information</span>
                  </div>
                  <div className="ml-7 space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Rukn Name:</span>
                      <span className="ml-2 text-gray-900">{submission.ruknName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">District:</span>
                      <span className="ml-2 text-gray-900">{submission.district}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Area:</span>
                      <span className="ml-2 text-gray-900">{submission.area}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Unit:</span>
                      <span className="ml-2 text-gray-900">{submission.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Reply - Display */}
                {submission.adminReply?.message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center text-blue-800 mb-2">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Admin Reply</span>
                    </div>
                    <p className="text-blue-900 ml-7 whitespace-pre-wrap break-words mb-3">
                      {submission.adminReply.message}
                    </p>
                    {submission.adminReply.repliedBy && (
                      <div className="ml-7 text-sm text-blue-700">
                        <p>
                          Replied by: {submission.adminReply.repliedBy.name || submission.adminReply.repliedBy.username || 'Admin'}
                        </p>
                        {submission.adminReply.repliedAt && (
                          <p className="text-blue-600">
                            On: {formatDate(submission.adminReply.repliedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Reply Form - Only show for admin users */}
                {authUser?.role === 'admin' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {submission.adminReply?.message ? 'Update Admin Reply' : 'Admin Reply'}
                    </h4>
                    
                    {/* Show existing reply if available */}
                    {submission.adminReply?.message && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs text-blue-800 mb-2 font-medium">Previous Reply:</div>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap break-words">{submission.adminReply.message}</p>
                        {submission.adminReply.repliedAt && (
                          <div className="text-xs text-blue-700 mt-2">
                            Replied on: {formatDate(submission.adminReply.repliedAt)}
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
                        className="w-full px-3 py-2 text-[16px] sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
                          onClick={handleSubmitReply}
                          disabled={!replyMessage.trim() || replyLoading}
                          className="px-4 py-2.5 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center font-medium shadow-sm"
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
                              {submission.adminReply?.message ? 'Update Reply' : 'Send Reply'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Created: {formatDate(submission.createdAt)}</p>
                  {submission.updatedAt && submission.updatedAt !== submission.createdAt && (
                    <p>Last Updated: {formatDate(submission.updatedAt)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false })}
          onConfirm={handleDelete}
          title="Delete Alternative Submission"
          message="Are you sure you want to delete this alternative submission? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      </>
    )
  }

  // Form mode - show form
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }


  return (
    <>
      {/* Fixed Close Button - Top Right Corner */}
      <button
        onClick={() => navigate('/ihthisabi/dashboard')}
        className="fixed top-16 right-4 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-white shadow-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors lg:top-4"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col pt-2">
        <div className="max-w-2xl mx-auto px-4 w-full flex-1 overflow-y-auto ih-mobile-bottom-safe lg:pb-0">
          {/* Heading outside container */}
          <div className="mb-4 mt-2">
            <h1 className="hidden lg:block text-3xl font-bold text-gray-900 mb-2">
              {editMode ? 'Akternate Submission Edit' : 'Alternate Submission'}
            </h1>
            <p className="text-gray-600">
              {selectedQuarter && selectedYear 
                ? `Quarter ${selectedQuarter}, ${selectedYear}`
                : 'Select quarter to continue'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">

            {hasExistingSubmission && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">Warning</p>
                  <p>You have already submitted an alternative submission for this quarter.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Type Selection - Radio Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                തരം <span className="text-red-500">*</span>
              </label>
              <Controller
                name="type"
                control={control}
                rules={{ required: 'Type is required' }}
                render={({ field }) => (
                  <div className="flex space-x-6">
                    <label className="flex items-center min-h-[44px]">
                      <input
                        type="radio"
                        value="Aged"
                        checked={field.value === 'Aged'}
                        onChange={() => field.onChange('Aged')}
                        className="form-radio h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">വാർദ്ധക്യം</span>
                    </label>
                    <label className="flex items-center min-h-[44px]">
                      <input
                        type="radio"
                        value="Patient"
                        checked={field.value === 'Patient'}
                        onChange={() => field.onChange('Patient')}
                        className="form-radio h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">രോഗി</span>
                    </label>
                  </div>
                )}
              />
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* District and Area - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* District - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ജില്ല <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('district', { required: 'District is required' })}
                  type="text"
                  readOnly
                  value={districtName || user?.district || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed text-[16px] sm:text-base"
                />
                {errors.district && (
                  <p className="mt-1 text-sm text-red-600">{errors.district.message}</p>
                )}
              </div>

              {/* Area - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                ഏരിയ  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('area', { required: 'Area is required' })}
                  type="text"
                  readOnly
                  value={areaName || user?.area || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed text-[16px] sm:text-base"
                />
                {errors.area && (
                  <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
                )}
              </div>
            </div>

            {/* Unit and Rukn Name - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unit - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  യൂണിറ്റ് <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('unit', { required: 'Unit is required' })}
                  type="text"
                  readOnly
                  value={user?.unit || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed text-[16px] sm:text-base"
                />
                {errors.unit && (
                  <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
                )}
              </div>

              {/* Rukn Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  റുക്ന് പേര് <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('ruknName', { required: 'Rukn name is required', maxLength: { value: 100, message: 'Rukn name cannot exceed 100 characters' } })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-[16px] sm:text-base"
                  placeholder="റുഖ്ൻ പേര് നൽകുക"
                />
                {errors.ruknName && (
                  <p className="mt-1 text-sm text-red-600">{errors.ruknName.message}</p>
                )}
              </div>
            </div>

            {/* Reason - Textarea (Full Width) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                {...register('reason', { maxLength: { value: 1000, message: 'Reason cannot exceed 1000 characters' } })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-[16px] sm:text-base"
                placeholder="Enter remarks"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedQuarter || !selectedYear}
                className="w-full sm:w-auto justify-center px-6 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:opacity-90"
                style={{ backgroundColor: '#101828' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {editMode ? 'പുതുക്കുന്നു...' : 'സമർപ്പിക്കുന്നു...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {editMode ? 'പുതുക്കുക' : 'സമർപ്പിക്കുക'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  )
}

export default AlternativeSubmissionForm



