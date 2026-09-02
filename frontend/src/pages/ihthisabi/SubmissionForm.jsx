import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { useForm, Controller } from 'react-hook-form'
import { api } from '../../utils/ihthisabi/api'
import locationService from '../../services/locationService'
import QuarterlySelection from '../../components/ihthisabi/QuarterlySelection'
import { 
  FORM_OPTIONS, 
  GRIHA_MEETINGS_OPTIONS,
  THAHREEKI_MEETINGS_OPTIONS
} from '../../utils/ihthisabi/constants'
import { 
  ArrowLeft, 
  Save, 
  Send, 
  AlertCircle,
  CheckCircle,
  Calendar,
  X,
  Star,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Q3_DISABLED, isQ3Disabled } from '../../utils/ihthisabi/quarterHelper'

const SubmissionForm = ({ userRole }) => {
  const { user: authUser, loading: authLoading, updateProfile } = useAuth()
  const normalizedRole = useMemo(() => (userRole || authUser?.role || 'rukn').toLowerCase(), [userRole, authUser?.role])
  const isUnitAdmin = normalizedRole === 'unitadmin' || normalizedRole === 'unit_admin' || normalizedRole === 'unit-admin'

  const dashboardPath = isUnitAdmin ? '/ihthisabi/unitadmin' : '/ihthisabi/dashboard'
  const userEndpoint = isUnitAdmin ? '/unitadmin/me' : '/auth/me'
  const submissionsListEndpoint = isUnitAdmin ? '/unitadmin/my-submissions' : '/submissions/my-submissions'
  const submissionDetailEndpoint = (id) => (isUnitAdmin ? `/unitadmin/my-submissions/${id}` : `/submissions/${id}`)
  const submissionCreateEndpoint = isUnitAdmin ? '/unitadmin/submit-form' : '/submissions'
  const submissionUpdateEndpoint = (id) => (isUnitAdmin ? `/unitadmin/my-submissions/${id}` : `/submissions/${id}`)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)
  const [districts, setDistricts] = useState([])
  const [areas, setAreas] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [showQuarterlySelection, setShowQuarterlySelection] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [alternativeSubmissions, setAlternativeSubmissions] = useState([])
  const [user, setUser] = useState(authUser)
  const isAbroadUser = !!user?.isAbroad
  const [jamaathInfluenceRating, setJamaathInfluenceRating] = useState(null)
  const [hoveredStar, setHoveredStar] = useState(null)
  const [dynamicForm, setDynamicForm] = useState(null)
  const [dynamicFormData, setDynamicFormData] = useState({})
  const [loadingDynamicForm, setLoadingDynamicForm] = useState(false)
  const savedDynamicDataRef = useRef(null)
  // Holds a user's area that isn't in the external API so it survives repeated loadAreas calls.
  const userFallbackAreaRef = useRef(null)

  // Use empty strings for district/area so the watcher doesn't fire with the raw
  // district name on mount (which would hit the area API with a name instead of an ObjectId).
  // populateUserData resolves the correct ObjectId and sets these properly.
  const { register, handleSubmit, formState: { errors }, watch, setValue, control, reset } = useForm({
    defaultValues: {
      district: '',
      area: '',
      unit: user?.unit || '',
      ruknName: user?.name || '',
      form: {
        quranStudy: {
          status: 'none',
          others: ''
        },
        hadithCount: '',
        bookReading: {
          islami: 'notread',
          atma: 'notread',
          others: ''
        },
        weeklyMeeting: {
          hadir: '',
          leave: '',
          absent: ''
        },
        jamaathMeeting: {
          hadir: '',
          leave: '',
          absent: ''
        },
        grihameetings: '',
        thahreekiMeetings: '',
        baithulmaal: 'incomplete',
        zakatPaid: 'no',
        recruitEffort: null,
        newMembers: '',
        muslimRelations: '',
        communityRelations: '',
        scoreCount: '',
        meqathService: 'no',
        skillUsage: 'no',
        jamaathAgenda: null,
        jamaathInfluence: 'no',
        suggestions: null
      }
    }
  })

  // Fetch fresh user data to ensure we have district/area
  useEffect(() => {
    const fetchFreshUserData = async () => {
      try {
        const response = await api.get(userEndpoint)
        if (response.data?.success && response.data?.data?.user) {
          const freshUser = response.data.data.user
          console.log('✅ Fetched fresh user data with district/area:', freshUser)
          console.log('   District:', freshUser.district, 'Area:', freshUser.area)
          setUser(freshUser)
          return freshUser
        }
      } catch (error) {
        console.error('❌ Failed to fetch fresh user data:', error)
        // Fallback to authUser if API fails
        if (authUser) {
          console.log('⚠️ Using authUser as fallback:', authUser)
          setUser(authUser)
          return authUser
        }
      }
      return null
    }
    
    // Always try to fetch fresh user data to ensure we have district/area
    if (authUser) {
      fetchFreshUserData()
    }
  }, [authUser, userEndpoint])

  useEffect(() => {
    // Load districts on component mount
    loadDistricts()
    loadSubmissions()
    loadAlternativeSubmissions()
    
    // Check URL parameters
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    const quarter = params.get('quarter')
    const year = params.get('year')
    
    if (editId) {
      setEditMode(true)
      setSubmissionId(editId)
      loadSubmissionData(editId)
    } else if (quarter && year) {
      // Direct quarter selection from URL
      setSelectedQuarter(parseInt(quarter))
      setSelectedYear(parseInt(year))
      setShowQuarterlySelection(false)
    } else {
      // Show quarterly selection by default
      setShowQuarterlySelection(true)
    }
  }, [])

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

  // Load districts from backend
  const loadDistricts = async () => {
    setLoadingDistricts(true)
    try {
      const districtsData = await locationService.getDistricts()
      console.log('Loaded districts:', districtsData)
      setDistricts(districtsData)
      return districtsData
    } catch (error) {
      console.error('Failed to load districts:', error)
      toast.error('Failed to load districts')
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Load areas for selected district.
  // Always re-merges the user's fallback area (if set) so it survives repeated calls.
  const loadAreas = async (districtId) => {
    setLoadingAreas(true)
    try {
      const areasData = await locationService.getAreas(districtId)
      if (userFallbackAreaRef.current) {
        const fallback = userFallbackAreaRef.current
        const exists = areasData.some(a => (a._id || a.id) === (fallback._id || fallback.id))
        setAreas(exists ? areasData : [...areasData, fallback])
      } else {
        setAreas(areasData)
      }
      return areasData
    } catch (error) {
      console.error('Failed to load areas:', error)
      toast.error('Failed to load areas')
    } finally {
      setLoadingAreas(false)
    }
  }

  // Update form values when user data is available
  useEffect(() => {
    const populateUserData = async () => {
      // In edit mode, loadSubmissionData already pre-fills the form with the saved
      // submission data via reset(). Running populateUserData afterwards would
      // overwrite those values with the user's current profile — skip it.
      if (editMode) return

      if (!user) {
        console.log('⏳ Waiting for user data...', { hasUser: !!user })
        return
      }

      // For abroad members: set district/area/unit directly as strings (no location service matching needed)
      if (user.isAbroad) {
        console.log('🌍 Abroad user detected — setting form values directly from profile')
        if (user.district) setValue('district', user.district, { shouldValidate: false, shouldDirty: false })
        if (user.area) setValue('area', user.area, { shouldValidate: false, shouldDirty: false })
        if (user.unit) setValue('unit', user.unit, { shouldValidate: false, shouldDirty: false })
        if (user.name) setValue('ruknName', user.name, { shouldValidate: false, shouldDirty: false })
        return
      }

      if (districts.length === 0) {
        console.log('⏳ Waiting for districts...', { districtsCount: districts.length })
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
      
      // Log all districts with normalized names for comparison
      const districtsWithNormalized = districts.map(d => ({
        original: d.title || d.name,
        normalized: normalizeString(d.title || d.name),
        id: d._id || d.id
      }))
      console.log('   Available districts (normalized):', districtsWithNormalized)
      
      const userDistrict = findDistrict(user.district)
      
      if (!userDistrict) {
        console.warn('❌ District not found!')
        console.warn('   User district (original):', user.district)
        console.warn('   User district (normalized):', `"${userDistrictName}"`)
        console.warn('   Available districts (original):', districts.map(d => d.title || d.name))
        console.warn('   Available districts (normalized):', districts.map(d => `"${normalizeString(d.title || d.name)}"`))
        
        // Try to find a partial match or similar name
        const similarDistricts = districts.filter(d => {
          const districtName = normalizeString(d.title || d.name)
          return districtName.includes(userDistrictName) || userDistrictName.includes(districtName)
        })
        if (similarDistricts.length > 0) {
          console.warn('   💡 Similar districts found:', similarDistricts.map(d => d.title || d.name))
        }
        return
      }

      console.log('✅ Found district:', userDistrict.title || userDistrict.name)
      
      const districtId = userDistrict._id || userDistrict.id
      console.log('   District ID:', districtId)
      
      // Load areas for the user's district
      let areaId = ''
      try {
        const loadedAreas = await loadAreas(districtId)
        console.log('✅ Loaded areas:', loadedAreas?.length || 0)
        
        // Find and set the correct area using the loaded areas data
        if (user.area && loadedAreas && Array.isArray(loadedAreas)) {
          const userAreaName = normalizeString(user.area)
          
          // More flexible area matching - try exact match first, then normalized, then partial, then fuzzy
          const findArea = (userAreaName) => {
            console.log('   🔎 findArea called with:', userAreaName)
            
            // First try exact match (case-insensitive)
            let found = loadedAreas.find(a => {
              if (!a) return false
              const areaName = (a.title || a.name || '').toString().trim()
              const matches = areaName.toLowerCase() === userAreaName.toLowerCase()
              if (matches) {
                console.log('   ✅ Exact match found:', areaName, '===', userAreaName)
              }
              return matches
            })
            
            if (found) {
              console.log('   ✅ Returning exact match:', found.title || found.name)
              return found
            }
            
            // Then try normalized match
            const normalizedUserArea = normalizeString(userAreaName)
            console.log('   🔎 Trying normalized match. Normalized user area:', `"${normalizedUserArea}"`)
            
            found = loadedAreas.find(a => {
              if (!a) return false
              const areaName = normalizeString(a.title || a.name)
              const matches = areaName === normalizedUserArea
              if (matches) {
                console.log('   ✅ Normalized match found:', a.title || a.name, '→', `"${areaName}"`, '===', `"${normalizedUserArea}"`)
              }
              return matches
            })
            
            if (found) {
              console.log('   ✅ Returning normalized match:', found.title || found.name)
              return found
            }
            
            // Try partial match
            console.log('   🔎 Trying partial match...')
            found = loadedAreas.find(a => {
              if (!a) return false
              const areaName = normalizeString(a.title || a.name)
              const matches = areaName.includes(normalizedUserArea) || normalizedUserArea.includes(areaName)
              if (matches) {
                console.log('   ✅ Partial match found:', a.title || a.name, '→', `"${areaName}"`, 'includes or is included in', `"${normalizedUserArea}"`)
              }
              return matches
            })
            
            if (found) {
              console.log('   ✅ Returning partial match:', found.title || found.name)
              return found
            }
            
            // Finally try fuzzy match for common spelling variations (like palode vs palod)
            console.log('   🔎 Trying fuzzy match for spelling variations...')
            found = loadedAreas.find(a => {
              if (!a) return false
              const areaName = normalizeString(a.title || a.name)
              
              // Handle common spelling variations
              // Remove duplicate consecutive letters and compare
              const removeDuplicates = (str) => str.replace(/(.)\1+/g, '$1')
              const userNormalized = removeDuplicates(normalizedUserArea)
              const areaNormalized = removeDuplicates(areaName)
              
              if (userNormalized === areaNormalized) {
                console.log('   ✅ Fuzzy match found (duplicate letters):', a.title || a.name, '→', `"${areaName}"`, '≈', `"${normalizedUserArea}"`)
                return true
              }
              
              // Check similarity score (if very similar, consider it a match)
              const similarity = stringSimilarity(normalizedUserArea, areaName)
              if (similarity > 0.85) { // 85% similarity threshold
                console.log('   ✅ Fuzzy match found (high similarity):', a.title || a.name, '→', `"${areaName}"`, '≈', `"${normalizedUserArea}"`, `(${(similarity * 100).toFixed(1)}% similar)`)
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
          
          const userArea = findArea(user.area)
          
          if (userArea) {
            areaId = userArea._id || userArea.id
            console.log('✅ Found area:', userArea.title || userArea.name, 'ID:', areaId)
          } else {
            console.warn('⚠️ Area not found. User area:', user.area)
            console.warn('   Available areas:', loadedAreas.map(a => a.title || a.name))
            // Area exists in the user profile but not in the external API for this district.
            // Create a synthetic option so the dropdown can display and submit it correctly.
            if (user.area) {
              const fallbackArea = { _id: user.area, id: user.area, title: user.area, name: user.area }
              userFallbackAreaRef.current = fallbackArea
              setAreas(prev => {
                const exists = prev.some(a => (a._id || a.id) === user.area)
                return exists ? prev : [...prev, fallbackArea]
              })
              areaId = user.area
              console.log('   ↩ Using stored area name as fallback option:', user.area)
            }
          }
        } else if (!user.area) {
          console.warn('⚠️ User does not have area property')
        }
      } catch (error) {
        console.error('❌ Failed to load areas for user district:', error)
      }
      
      // Update form values - use setValue with shouldTouch to ensure UI updates
      console.log('📝 Setting form values...')
      if (districtId) {
        setValue('district', districtId, { shouldValidate: false, shouldDirty: false, shouldTouch: true })
        console.log('   ✅ Set district:', districtId)
      }
      if (areaId) {
        // Small delay to ensure district is set first
        setTimeout(() => {
          setValue('area', areaId, { shouldValidate: false, shouldDirty: false, shouldTouch: true })
          console.log('   ✅ Set area:', areaId)
        }, 100)
      }
      if (user.unit) {
        setValue('unit', user.unit, { shouldValidate: false, shouldDirty: false })
        console.log('   ✅ Set unit:', user.unit)
      }
      if (user.name) {
        setValue('ruknName', user.name, { shouldValidate: false, shouldDirty: false })
        console.log('   ✅ Set ruknName:', user.name)
      }
      
      // Verify form values after a short delay
      setTimeout(() => {
        const currentDistrict = watch('district')
        const currentArea = watch('area')
        console.log('✅ Final form values - District:', currentDistrict, 'Area:', currentArea)
        if (!currentDistrict || !currentArea) {
          console.warn('⚠️ Form values not set correctly!')
        }
      }, 200)
    }
    
    populateUserData()
  }, [user, districts, setValue])

  const loadSubmissionData = async (id) => {
    // Show loading spinner while all edit data is being fetched.
    // This prevents the form from briefly rendering blank before data arrives.
    setLoadingDynamicForm(true)
    try {
      const response = await api.get(submissionDetailEndpoint(id))
      const submission = response.data.data.submission
      const f = submission.form
      
      // Resolve district/area IDs
      const availableDistricts = districts.length > 0 ? districts : (await loadDistricts()) || []
      let districtId = ''
      let areaId = ''
      if (submission.district) {
        const districtObj = availableDistricts.find(d =>
          d && (d.title || d.name) && (d.title || d.name).toLowerCase() === submission.district.toLowerCase()
        )
        if (districtObj) {
          districtId = districtObj._id || districtObj.id
          const loadedAreas = await loadAreas(districtId)
          if (submission.area) {
            const areaObj = (loadedAreas || areas).find(a =>
              a && (a.title || a.name) && (a.title || a.name).toLowerCase() === submission.area.toLowerCase()
            )
            if (areaObj) areaId = areaObj._id || areaObj.id
          }
        }
      }

      // Determine quarter/year from the submission
      const quarter = submission.quarter || submission.submissionPeriod?.quarter
      const year = submission.year || submission.submissionPeriod?.year

      // In edit mode, fetch the dynamic form schema here instead of relying on the
      // checkDynamicForm effect. This avoids an intermediate loadingDynamicForm cycle
      // that would unmount the form (showing a spinner) and lose the reset() data.
      let editDynamicForm = null
      let editDynamicFormData = {}
      if (quarter && year) {
        try {
          const dfRes = await api.get(`/ihthisabi/application-forms/public/by-quarter/${quarter}/${year}`)
          if (dfRes.data?.hasDynamicForm && dfRes.data?.data) {
            editDynamicForm = dfRes.data.data
            if (submission.dynamicFormId && submission.dynamicFormData) {
              editDynamicFormData = submission.dynamicFormData
            } else {
              // Build defaults for the dynamic form fields
              const defaults = {}
              dfRes.data.data.questions?.forEach(q => {
                if (q.answerType === 'group') {
                  const groupDefault = {}
                  q.subFields?.forEach((sf, sfIdx) => {
                    const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
                    groupDefault[effectiveFieldId] = sf.type === 'number' ? 0 : ''
                  })
                  defaults[q.questionId] = groupDefault
                } else if (q.answerType === 'number' || q.answerType === 'star') {
                  defaults[q.questionId] = 0
                } else if (q.answerType === 'checkbox') {
                  defaults[q.questionId] = []
                } else {
                  defaults[q.questionId] = ''
                }
              })
              editDynamicFormData = defaults
            }
          }
        } catch (e) {
          // No dynamic form for this quarter — hardcoded form will be used
        }
      }

      // Apply all values at once
      reset({
        district: districtId || '',
        area: areaId || '',
        unit: submission.unit || '',
        ruknName: submission.ruknName || '',
        form: {
          quranStudy: {
            status: f.quranStudy?.status ?? 'none',
            others: f.quranStudy?.others ?? ''
          },
          hadithCount: f.hadithCount ?? 0,
          bookReading: {
            islami: f.bookReading?.islami ?? 'notread',
            atma: f.bookReading?.atma ?? 'notread',
            others: f.bookReading?.others ?? ''
          },
          weeklyMeeting: {
            hadir: f.weeklyMeeting?.hadir ?? 0,
            leave: f.weeklyMeeting?.leave ?? 0,
            absent: f.weeklyMeeting?.absent ?? 0
          },
          jamaathMeeting: {
            hadir: f.jamaathMeeting?.hadir ?? 0,
            leave: f.jamaathMeeting?.leave ?? 0,
            absent: f.jamaathMeeting?.absent ?? 0
          },
          grihameetings: (f.grihameetings ?? '').toString(),
          thahreekiMeetings: (f.thahreekiMeetings ?? '').toString(),
          baithulmaal: f.baithulmaal ?? 'incomplete',
          zakatPaid: f.zakatPaid ?? 'no',
          recruitEffort: f.recruitEffort ?? null,
          newMembers: (f.newMembers !== undefined && f.newMembers !== null && [0, 1, 2, 3].includes(f.newMembers)) ? f.newMembers.toString() : '',
          muslimRelations: f.muslimRelations ?? 0,
          communityRelations: f.communityRelations ?? 0,
          scoreCount: f.scoreCount ?? 0,
          meqathService: f.meqathService ?? 'no',
          skillUsage: f.skillUsage ?? 'no',
          jamaathAgenda: f.jamaathAgenda ?? null,
          jamaathInfluence: f.jamaathInfluence ?? 'no',
          suggestions: f.suggestions ?? null
        }
      })
      
      // Set star rating state from loaded backend value
      const loadedBackendValue = f.jamaathInfluence ?? 'no'
      const starRating = mapBackendValueToStarRating(loadedBackendValue)
      setJamaathInfluenceRating(starRating)

      // Set dynamic form, its data, and quarter/year all at once so the correct
      // form type renders immediately with the saved data — no intermediate blank state.
      setDynamicForm(editDynamicForm)
      setDynamicFormData(editDynamicFormData)
      if (quarter && year) {
        setSelectedQuarter(quarter)
        setSelectedYear(year)
      }
    } catch (error) {
      console.error('Failed to load submission:', error)
      toast.error('Failed to load submission data')
      navigate(dashboardPath)
    } finally {
      setLoadingDynamicForm(false)
    }
  }

  const loadSubmissions = async () => {
    try {
      const response = await api.get(submissionsListEndpoint)
      setSubmissions(response.data.data.submissions || [])
    } catch (error) {
      console.error('Failed to load submissions:', error)
      setSubmissions([])
    }
  }

  const loadAlternativeSubmissions = async () => {
    try {
      const response = await api.get('/alternative-submissions/my-submissions')
      setAlternativeSubmissions(response.data.data.alternativeSubmissions || [])
    } catch (error) {
      console.error('Failed to load alternative submissions:', error)
      setAlternativeSubmissions([])
    }
  }

  const checkExistingSubmission = async () => {
    try {
      // Get all submissions to check the last one
      const response = await api.get(submissionsListEndpoint)
      const submissions = response.data.data.submissions || []
      
      if (submissions.length === 0) {
        setHasExistingSubmission(false)
        return
      }
      
      // Get the most recent submission
      const lastSubmission = submissions[0] // Already sorted by createdAt descending
      const lastSubmitDate = new Date(lastSubmission.createdAt)
      const currentDate = new Date()
      
      // Calculate months difference
      const monthsDiff = (currentDate.getFullYear() - lastSubmitDate.getFullYear()) * 12 + 
                        (currentDate.getMonth() - lastSubmitDate.getMonth())
      
      // Can submit if at least 3 months have passed
      if (monthsDiff < 3) {
        setHasExistingSubmission(true)
        // Calculate next available month
        const nextAvailableDate = new Date(lastSubmitDate)
        nextAvailableDate.setMonth(nextAvailableDate.getMonth() + 3)
        localStorage.setItem('nextSubmissionDate', nextAvailableDate.toISOString())
      } else {
        setHasExistingSubmission(false)
        localStorage.removeItem('nextSubmissionDate')
      }
    } catch (error) {
      console.error('Failed to check existing submission:', error)
    }
  }

  // Prevent negative numbers in input fields
  const handleNumberInput = (e) => {
    const value = e.target.value;
    if (value < 0) {
      e.target.value = 0;
    }
  }

  // Prevent negative numbers on paste
  const handleNumberPaste = (e) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData && (isNaN(pasteData) || parseInt(pasteData) < 0)) {
      e.preventDefault();
    }
  }

  // Map star rating (1-5) to backend value for jamaathInfluence
  const mapStarRatingToBackendValue = (rating) => {
    if (!rating || rating < 1 || rating > 5) return null
    if (rating === 1) return 'no' // ഇല്ല
    if (rating === 2 || rating === 3) return 'small' // ചെറിയ തോതിൽ
    if (rating === 4 || rating === 5) return 'yes' // അതെ
    return null
  }

  // Map backend value to star rating (1-5) for jamaathInfluence
  const mapBackendValueToStarRating = (backendValue) => {
    if (!backendValue) return null
    if (backendValue === 'no') return 1 // ഇല്ല → 1 star
    if (backendValue === 'small') return 2 // ചെറിയ തോതിൽ → 2 stars (default to 2, user can change to 3)
    if (backendValue === 'yes') return 4 // അതെ → 4 stars (default to 4, user can change to 5)
    return null
  }

  // Handle star rating change
  const handleStarRatingChange = (rating) => {
    setJamaathInfluenceRating(rating)
    // Store the mapped backend value in the form
    const backendValue = mapStarRatingToBackendValue(rating)
    setValue('form.jamaathInfluence', backendValue || '', { shouldValidate: true })
  }

  // Check for dynamic form when quarter is selected
  useEffect(() => {
    const checkDynamicForm = async () => {
      // In edit mode, loadSubmissionData already fetches the dynamic form schema
      // and sets all state at once. Skip here to avoid an intermediate loading
      // spinner that would unmount the form and lose the pre-filled data.
      if (editMode) return
      if (!selectedQuarter || !selectedYear) return
      setLoadingDynamicForm(true)
      try {
        const res = await api.get(`/ihthisabi/application-forms/public/by-quarter/${selectedQuarter}/${selectedYear}`)
        if (res.data?.hasDynamicForm && res.data?.data) {
          setDynamicForm(res.data.data)
          if (savedDynamicDataRef.current) {
            setDynamicFormData(savedDynamicDataRef.current)
            savedDynamicDataRef.current = null
          } else {
            const defaults = {}
            res.data.data.questions?.forEach(q => {
              if (q.answerType === 'group') {
                const groupDefault = {}
                q.subFields?.forEach((sf, sfIdx) => {
                  const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
                  groupDefault[effectiveFieldId] = sf.type === 'number' ? 0 : ''
                })
                defaults[q.questionId] = groupDefault
              } else if (q.answerType === 'number' || q.answerType === 'star') {
                defaults[q.questionId] = 0
              } else if (q.answerType === 'checkbox') {
                defaults[q.questionId] = []
              } else {
                defaults[q.questionId] = ''
              }
            })
            setDynamicFormData(defaults)
          }
        } else {
          setDynamicForm(null)
          setDynamicFormData({})
        }
      } catch (err) {
        console.log('No dynamic form for this quarter, using hardcoded form')
        setDynamicForm(null)
        setDynamicFormData({})
      } finally {
        setLoadingDynamicForm(false)
      }
    }
    checkDynamicForm()
  }, [selectedQuarter, selectedYear, editMode])

  // Handle quarter selection
  const handleQuarterSelect = (quarter, year) => {
    // Block Q3 selection if disabled
    if (Q3_DISABLED && quarter === 3) {
      toast.error('Q3 submissions are currently disabled.')
      return
    }
    setSelectedQuarter(quarter)
    setSelectedYear(year)
    setShowQuarterlySelection(false)
  }

  const onSubmit = async (data) => {
    // Block Q3 submission if disabled
    if (Q3_DISABLED && selectedQuarter === 3) {
      toast.error('Q3 submissions are currently disabled.')
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      console.log('Submitting form data:', data)
      
      // Convert district and area IDs to names
      const districtObj = districts.find(d => (d._id || d.id) === data.district)
      const areaObj = areas.find(a => (a._id || a.id) === data.area)
      
      // Ensure all meeting counts are numbers
      const transformedData = {
        ...data,
        district: districtObj ? (districtObj.title || districtObj.name) : data.district,
        area: areaObj ? (areaObj.title || areaObj.name) : data.area,
        quarter: selectedQuarter,
        year: selectedYear,
        form: {
          ...data.form,
          hadithCount: Number(data.form.hadithCount) || 0,
          weeklyMeeting: {
            hadir: Number(data.form.weeklyMeeting.hadir) || 0,
            leave: Number(data.form.weeklyMeeting.leave) || 0,
            absent: Number(data.form.weeklyMeeting.absent) || 0
          },
          jamaathMeeting: {
            hadir: Number(data.form.jamaathMeeting.hadir) || 0,
            leave: Number(data.form.jamaathMeeting.leave) || 0,
            absent: Number(data.form.jamaathMeeting.absent) || 0
          },
          grihameetings: Number(data.form.grihameetings) || 0,
          thahreekiMeetings: Number(data.form.thahreekiMeetings) || 0,
          newMembers: Number(data.form.newMembers) || 0,
          muslimRelations: Number(data.form.muslimRelations) || 0,
          communityRelations: Number(data.form.communityRelations) || 0,
          scoreCount: Number(data.form.scoreCount) || 0,
          recruitEffort: null,
          jamaathAgenda: null,
          // Ensure jamaathInfluence is properly mapped from star rating
          jamaathInfluence: data.form.jamaathInfluence || (jamaathInfluenceRating ? mapStarRatingToBackendValue(jamaathInfluenceRating) : null),
          suggestions: null
        }
      }
      
      console.log('Transformed data:', transformedData)
      
      if (editMode && submissionId) {
        // Update existing submission
        await api.put(submissionUpdateEndpoint(submissionId), transformedData)
        toast.success('Submission updated successfully!')
      } else {
        // Create new submission
        await api.post(submissionCreateEndpoint, transformedData)
      toast.success('Form submitted successfully!')
      }
      navigate(dashboardPath)
    } catch (error) {
      console.error('Submission error:', error)
      console.log('Error response:', error.response?.data)
      
      // Show detailed validation errors if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorFields = error.response.data.errors.map(err => `${err.field}: ${err.message}`).join(', ')
        toast.error(`Validation failed for: ${errorFields}`)
        console.log('Validation errors:', error.response.data.errors)
      } else {
      const message = error.response?.data?.message || 'Failed to submit form'
      toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Dynamic form field change handler
  const handleDynamicFieldChange = (questionId, value) => {
    setDynamicFormData(prev => ({ ...prev, [questionId]: value }))
  }

  const handleDynamicGroupFieldChange = (questionId, fieldId, value) => {
    setDynamicFormData(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [fieldId]: value }
    }))
  }

  const handleDynamicCheckboxChange = (questionId, optionValue, checked) => {
    setDynamicFormData(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : []
      return {
        ...prev,
        [questionId]: checked ? [...current, optionValue] : current.filter(v => v !== optionValue)
      }
    })
  }

  // Submit dynamic form
  const onDynamicSubmit = async (e) => {
    e.preventDefault()
    if (Q3_DISABLED && selectedQuarter === 3) { toast.error('Q3 submissions are currently disabled.'); return }

    // Validate required fields
    for (const question of dynamicForm.questions) {
      if (question.isRequired) {
        const val = dynamicFormData[question.questionId]
        if (question.answerType === 'group') {
          const groupVal = val || {}
          const subFields = question.subFields || []
          for (let sfIdx = 0; sfIdx < subFields.length; sfIdx++) {
            const sf = subFields[sfIdx]
            const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
            if (sf.type === 'number' && (groupVal[effectiveFieldId] === undefined || groupVal[effectiveFieldId] === '')) {
              toast.error(`Please fill in ${question.questionTextMl || question.questionText} - ${sf.labelMl || sf.label}`)
              return
            }
          }
        } else if (question.answerType === 'checkbox') {
          if (!val || val.length === 0) { toast.error(`Please select at least one option for: ${question.questionTextMl || question.questionText}`); return }
        } else if (val === undefined || val === '' || val === null) {
          toast.error(`Please fill in: ${question.questionTextMl || question.questionText}`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const districtVal = watch('district')
      const areaVal = watch('area')
      const unitVal = watch('unit')
      const ruknNameVal = watch('ruknName')

      if (!districtVal || !areaVal || !unitVal || !ruknNameVal) {
        toast.error('Please fill in all basic information fields')
        setLoading(false)
        return
      }

      const districtObj = isAbroadUser ? null : districts.find(d => (d._id || d.id) === districtVal)
      const areaObj = isAbroadUser ? null : areas.find(a => (a._id || a.id) === areaVal)

      // Reject out-of-range numbers before saving (mirrors consolidation bounds)
      // so garbage values (phone numbers, negatives) never reach the database
      const NUMBER_MAX_DEFAULT = 100000
      for (const q of dynamicForm.questions) {
        const qLabel = q.questionTextMl || q.questionText
        if (q.answerType === 'number') {
          const raw = dynamicFormData[q.questionId]
          if (raw !== undefined && raw !== null && raw !== '') {
            const num = Number(raw)
            const lo = typeof q.min === 'number' ? q.min : 0
            const hi = typeof q.max === 'number' ? q.max : NUMBER_MAX_DEFAULT
            if (Number.isNaN(num) || num < lo || num > hi) {
              toast.error(`"${qLabel}" — ${lo} നും ${hi} നും ഇടയിലുള്ള സംഖ്യ നൽകുക (enter a number between ${lo} and ${hi})`)
              setLoading(false)
              return
            }
          }
        } else if (q.answerType === 'group') {
          for (const [sfIdx, sf] of (q.subFields || []).entries()) {
            if (sf.type !== 'number') continue
            const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
            const raw = (dynamicFormData[q.questionId] || {})[effectiveFieldId]
            if (raw === undefined || raw === null || raw === '') continue
            const num = Number(raw)
            const lo = typeof sf.min === 'number' ? sf.min : 0
            const hi = typeof sf.max === 'number' ? sf.max : NUMBER_MAX_DEFAULT
            if (Number.isNaN(num) || num < lo || num > hi) {
              toast.error(`"${sf.labelMl || sf.label}" — ${lo} നും ${hi} നും ഇടയിലുള്ള സംഖ്യ നൽകുക (enter a number between ${lo} and ${hi})`)
              setLoading(false)
              return
            }
          }
        }
      }

      const processedData = {}
      dynamicForm.questions.forEach(q => {
        const val = dynamicFormData[q.questionId]
        if (q.answerType === 'number' || q.answerType === 'star') {
          processedData[q.questionId] = Number(val) || 0
        } else if (q.answerType === 'group') {
          const groupVal = {}
          q.subFields?.forEach((sf, sfIdx) => {
            const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
            groupVal[effectiveFieldId] = sf.type === 'number' ? (Number((val || {})[effectiveFieldId]) || 0) : ((val || {})[effectiveFieldId] || '')
          })
          processedData[q.questionId] = groupVal
        } else {
          processedData[q.questionId] = val
        }
      })

      const payload = {
        district: districtObj ? (districtObj.title || districtObj.name) : districtVal,
        area: areaObj ? (areaObj.title || areaObj.name) : areaVal,
        unit: unitVal,
        ruknName: ruknNameVal,
        quarter: selectedQuarter,
        year: selectedYear,
        dynamicFormId: dynamicForm._id,
        dynamicFormData: processedData
      }

      if (editMode && submissionId) {
        await api.put(submissionUpdateEndpoint(submissionId), payload)
        toast.success('Submission updated successfully!')
      } else {
        await api.post(submissionCreateEndpoint, payload)
        toast.success('Form submitted successfully!')
      }
      navigate(dashboardPath)
    } catch (error) {
      console.error('Dynamic submission error:', error)
      toast.error(error.response?.data?.message || 'Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  // Render a single dynamic form question
  const renderDynamicQuestion = (question, qIndex) => {
    const qId = question.questionId
    const value = dynamicFormData[qId]
    const label = question.questionTextMl || question.questionText

    return (
      <div key={qId} className="card bg-white border border-gray-200 rounded-3xl shadow-sm">
        <div className="card-header rounded-t-2xl bg-[#161F2F] px-3 py-2.5 sm:rounded-t-3xl sm:px-6 sm:py-4">
          <h3 className="text-[13px] font-semibold leading-snug text-white sm:text-lg">
            {qIndex + 1}. {label}
            {question.isRequired && <span className="text-red-400 ml-1">*</span>}
          </h3>
        </div>
        <div className="card-body p-3 sm:p-6">
          {question.answerType === 'text' && (
            <input type="text" value={value || ''} onChange={(e) => handleDynamicFieldChange(qId, e.target.value)}
              className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              placeholder={question.placeholder || ''} maxLength={question.maxLength || 500} />
          )}

          {question.answerType === 'textarea' && (
            <textarea value={value || ''} onChange={(e) => handleDynamicFieldChange(qId, e.target.value)}
              className="form-input min-h-[76px] w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-h-[100px] sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              placeholder={question.placeholder || ''} maxLength={question.maxLength || 1000} rows={4} />
          )}

          {question.answerType === 'number' && (
            <input type="number" value={value ?? ''} onChange={(e) => handleDynamicFieldChange(qId, e.target.value)}
              className="form-input w-full max-w-[9rem] rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-xs sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              placeholder={question.placeholder || '0'}
              min={question.min ?? 0} max={question.max ?? 100000} />
          )}

          {question.answerType === 'radio' && (
            <div className="space-y-2 sm:space-y-3">
              {question.options?.map(opt => (
                <label key={opt.value} className="group flex cursor-pointer items-center gap-2.5 py-1 sm:py-0">
                  <input type="radio" name={qId} value={opt.value} checked={value === opt.value}
                    onChange={() => handleDynamicFieldChange(qId, opt.value)}
                    className="h-4 w-4 shrink-0 border-gray-300 text-primary focus:ring-primary sm:h-5 sm:w-5" />
                  <span className="text-[13px] text-gray-700 group-hover:text-gray-900 sm:text-base">{opt.labelMl || opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {question.answerType === 'dropdown' && (
            <select value={value || ''} onChange={(e) => handleDynamicFieldChange(qId, e.target.value)}
              className="form-select w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-sm sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm">
              <option value="">Select...</option>
              {question.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.labelMl || opt.label}</option>
              ))}
            </select>
          )}

          {question.answerType === 'checkbox' && (
            <div className="space-y-2 sm:space-y-3">
              {question.options?.map(opt => (
                <label key={opt.value} className="group flex cursor-pointer items-center gap-2.5 py-1 sm:py-0">
                  <input type="checkbox" checked={Array.isArray(value) && value.includes(opt.value)}
                    onChange={(e) => handleDynamicCheckboxChange(qId, opt.value, e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary sm:h-5 sm:w-5" />
                  <span className="text-[13px] text-gray-700 group-hover:text-gray-900 sm:text-base">{opt.labelMl || opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {question.answerType === 'star' && (
            <div className="flex items-center gap-2 sm:gap-1">
              {Array.from({ length: question.max || 5 }, (_, i) => i + 1).map(star => (
                <button key={star} type="button" onClick={() => handleDynamicFieldChange(qId, star)}
                  className="p-2 sm:p-0 focus:outline-none transition-colors">
                  <Star className={`h-7 w-7 sm:h-8 sm:w-8 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
              {value > 0 && <span className="ml-2 text-sm text-gray-500">{value}/{question.max || 5}</span>}
            </div>
          )}

          {question.answerType === 'group' && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
              {question.subFields?.map((sf, sfIdx) => {
                const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
                return (
                  <div key={effectiveFieldId}>
                    <label className="mb-1 block text-[11px] font-medium text-gray-600 sm:text-sm">{sf.labelMl || sf.label}</label>
                    <input type={sf.type === 'number' ? 'number' : 'text'}
                      value={(value || {})[effectiveFieldId] ?? ''}
                      onChange={(e) => handleDynamicGroupFieldChange(qId, effectiveFieldId, e.target.value)}
                      className="form-input w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                      placeholder={sf.placeholder || (sf.type === 'number' ? '0' : '')}
                      min={sf.type === 'number' ? (sf.min ?? 0) : undefined}
                      max={sf.type === 'number' ? (sf.max ?? 100000) : undefined} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show quarterly selection if no specific quarter is selected
  if (showQuarterlySelection) {
    return <QuarterlySelection 
      submissions={submissions} 
      alternativeSubmissions={alternativeSubmissions}
      onQuarterSelect={handleQuarterSelect} 
    />
  }

  // Get quarter info for display
  const getQuarterInfo = (quarter) => {
    const quarterInfo = {
      1: { name: 'Q1', period: 'January – March' },
      2: { name: 'Q2', period: 'April – June' },
      3: { name: 'Q3', period: 'July – September' },
      4: { name: 'Q4', period: 'October – December' }
    }
    return quarterInfo[quarter]
  }

  // Sequential question numbering for visible questions only
  let questionNumber = 1
  const nextQuestionNumber = () => questionNumber++

  const quarterLabel = selectedQuarter && selectedYear
    ? `${getQuarterInfo(selectedQuarter).name} ${selectedYear}`
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
  const quarterDetail = selectedQuarter && selectedYear
    ? `${getQuarterInfo(selectedQuarter).name} ${selectedYear} - ${getQuarterInfo(selectedQuarter).period}`
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })

  // Show loading while user data is being fetched
  if (authLoading || loadingDynamicForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  // Render dynamic form if one exists for this quarter
  if (dynamicForm) {
    return (
      <>
        <button onClick={() => navigate(dashboardPath)}
          className="fixed top-14 right-2.5 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:h-10 sm:w-10 lg:top-4 lg:right-4"
          title="Close">
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto max-w-5xl space-y-3 px-2.5 py-3 sm:space-y-6 sm:px-4 sm:py-10">
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm sm:space-y-4 sm:rounded-3xl sm:px-8 sm:py-8 sm:shadow-lg">
            <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="hidden lg:block text-lg font-bold leading-snug text-gray-900 sm:text-3xl">
                  {dynamicForm.title || 'ത്രൈമാസ പ്രവർത്തന റിപ്പോർട്ട്'}
                </h1>
                <p className="mt-0.5 text-[11px] text-gray-500 sm:mt-1 sm:text-sm">{quarterDetail}</p>
              </div>
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:text-gray-600">
                <Calendar className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span>{quarterLabel}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onDynamicSubmit} className="space-y-3 pb-6 sm:space-y-8 sm:pb-12">
            {/* Basic Information */}
            <div className="card rounded-2xl border border-gray-200 bg-white shadow-sm sm:rounded-3xl">
              <div className="card-header rounded-t-2xl bg-[#161F2F] px-3 py-2.5 sm:rounded-t-3xl sm:px-6 sm:py-4">
                <h3 className="text-[13px] font-semibold leading-snug text-white sm:text-lg">Basic Information</h3>
              </div>
              <div className="card-body space-y-2.5 p-3 sm:space-y-4 sm:px-6 sm:py-4">
                {isAbroadUser ? (
                  /* Abroad member: show Name + Country only */
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2">
                    <div>
                      <label className="form-label">Name of Rukn</label>
                      <input {...register('ruknName', { required: 'Rukn name is required' })} type="text"
                        className="form-input text-base py-2 sm:text-sm" placeholder="Enter name in English" readOnly />
                      {errors.ruknName && <p className="form-error">{errors.ruknName.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-input bg-gray-50 text-base py-2 sm:text-sm"
                        value={user?.abroadCountry?.title || user?.country || ''}
                        readOnly
                      />
                    </div>
                    {/* Hidden fields to carry district/area/unit in form data */}
                    <input type="hidden" {...register('district')} />
                    <input type="hidden" {...register('area')} />
                    <input type="hidden" {...register('unit')} />
                  </div>
                ) : (
                  /* Domestic member: show Name + District + Area + Unit */
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2">
                    <div>
                      <label className="form-label">Name of Rukn</label>
                      <input {...register('ruknName', { required: 'Rukn name is required' })} type="text"
                        className="form-input text-base py-2 sm:text-sm" placeholder="Enter name in English" />
                      {errors.ruknName && <p className="form-error">{errors.ruknName.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">District</label>
                      <Controller name="district" control={control} rules={{ required: 'District is required' }}
                        render={({ field }) => (
                          <select {...field} value={field.value || ''} className="form-select text-base py-2 sm:text-sm" disabled={loadingDistricts}
                            onChange={(e) => { field.onChange(e); setValue('area', '') }}>
                            <option value="">Select District</option>
                            {districts.map(d => (
                              <option key={d._id || d.id} value={d._id || d.id}>{d.title || d.name}</option>
                            ))}
                          </select>
                        )} />
                      {errors.district && <p className="form-error">{errors.district.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Area</label>
                      <Controller name="area" control={control} rules={{ required: 'Area is required' }}
                        render={({ field }) => (
                          <select {...field} value={field.value || ''} className="form-select text-base py-2 sm:text-sm" disabled={loadingAreas || !watch('district')}>
                            <option value="">Select Area</option>
                            {areas.map(a => (
                              <option key={a._id || a.id} value={a._id || a.id}>{a.title || a.name}</option>
                            ))}
                          </select>
                        )} />
                      {errors.area && <p className="form-error">{errors.area.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Unit</label>
                      <input {...register('unit', { required: 'Unit is required' })} type="text"
                        className="form-input text-base py-2 sm:text-sm" placeholder="Enter unit name" />
                      {errors.unit && <p className="form-error">{errors.unit.message}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Questions */}
            {dynamicForm.questions?.sort((a, b) => a.order - b.order).map((question, qIndex) =>
              renderDynamicQuestion(question, qIndex)
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 sm:w-auto sm:rounded-2xl sm:px-12 sm:py-4 sm:text-lg">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {editMode ? 'Update Submission' : 'Submit Report'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Fixed Close Button - Top Right Corner */}
      <button
        onClick={() => navigate(dashboardPath)}
        className="fixed top-14 right-2.5 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:h-10 sm:w-10 lg:top-4 lg:right-4"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mx-auto max-w-5xl space-y-3 px-2.5 py-3 sm:space-y-6 sm:px-4 sm:py-10">
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm sm:space-y-4 sm:rounded-3xl sm:px-8 sm:py-8 sm:shadow-lg">
          <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="hidden lg:block text-lg font-bold leading-snug text-gray-900 sm:text-3xl">
                {editMode ? 'തിരുത്തുക' : 'ത്രൈമാസ പ്രവർത്തന റിപ്പോർട്ട്'}
              </h1>
              <p className="mt-0.5 text-[11px] text-gray-500 sm:mt-1 sm:text-sm">
                {quarterDetail}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:text-gray-600">
              <Calendar className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>{quarterLabel}</span>
            </div>
          </div>
        </div>

        <form
          id="submissionForm"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 pb-6 sm:space-y-8 sm:pb-12"
        >
        {/* Basic Information */}
        <div className="card rounded-2xl border border-gray-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="card-header rounded-t-2xl bg-[#161F2F] px-3 py-2.5 sm:rounded-t-3xl sm:px-6 sm:py-4">
            <h3 className="text-[13px] font-semibold leading-snug text-white sm:text-lg">
              Basic Information
            </h3>
          </div>
          <div className="card-body space-y-2.5 p-3 sm:space-y-4 sm:px-6 sm:py-4">
            {isAbroadUser ? (
              /* Abroad member: show Name + Country only */
              <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Name of Rukn</label>
                  <input
                    {...register('ruknName', {
                      required: 'Rukn name is required',
                      pattern: {
                        value: /^[a-zA-Z0-9\s._-]*$/,
                        message: 'Only English alphabets are allowed'
                      }
                    })}
                    type="text"
                    className="form-input text-base py-2 sm:text-sm"
                    placeholder="Enter name in English"
                    readOnly
                  />
                  {errors.ruknName && (
                    <p className="form-error">{errors.ruknName.message}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    className="form-input bg-gray-50 text-base py-2 sm:text-sm"
                    value={user?.abroadCountry?.title || user?.country || ''}
                    readOnly
                  />
                </div>
                {/* Hidden fields — district/area/unit are still submitted */}
                <input type="hidden" {...register('district')} />
                <input type="hidden" {...register('area')} />
                <input type="hidden" {...register('unit')} />
              </div>
            ) : (
              /* Domestic member: show Name + District + Area + Unit */
              <>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label">Name of Rukn </label>
                    <input
                      {...register('ruknName', { 
                        required: 'Rukn name is required',
                        pattern: {
                          value: /^[a-zA-Z0-9\s._-]*$/,
                          message: 'Only English alphabets are allowed'
                        }
                      })}
                      type="text"
                      className="form-input text-base py-2 sm:text-sm"
                      placeholder="Enter name in English"
                    />
                    {errors.ruknName && (
                      <p className="form-error">{errors.ruknName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">District</label>
                    <Controller
                      name="district"
                      control={control}
                      rules={{ required: 'District is required' }}
                      render={({ field }) => (
                        <select 
                          {...field}
                          value={field.value || ''}
                          className="form-select text-base py-2 sm:text-sm"
                          disabled={loadingDistricts}
                          onChange={(e) => {
                            console.log('District changed to:', e.target.value)
                            field.onChange(e)
                            setValue('area', '')
                          }}
                        >
                          <option value="">
                            {loadingDistricts ? 'Loading districts...' : 'Select District'}
                          </option>
                          {districts.map((district) => (
                            <option key={district._id || district.id} value={district._id || district.id}>
                              {district.title || district.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.district && (
                      <p className="form-error">{errors.district.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label">Area</label>
                    <Controller
                      name="area"
                      control={control}
                      rules={{ required: 'Area is required' }}
                      render={({ field }) => (
                        <select 
                          {...field}
                          value={field.value || ''}
                          className="form-select text-base py-2 sm:text-sm"
                          disabled={!selectedDistrict || loadingAreas}
                          onChange={(e) => {
                            console.log('Area changed to:', e.target.value)
                            field.onChange(e)
                          }}
                        >
                          <option value="">
                            {!selectedDistrict 
                              ? 'Select District first' 
                              : loadingAreas 
                                ? 'Loading areas...' 
                                : 'Select Area'
                            }
                          </option>
                          {areas.map((area) => (
                            <option key={area._id || area.id} value={area._id || area.id}>
                              {area.title || area.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.area && (
                      <p className="form-error">{errors.area.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Unit</label>
                    <input
                      {...register('unit', { required: 'Unit is required' })}
                      type="text"
                      className="form-input text-base py-2 sm:text-sm"
                      placeholder="Enter unit"
                    />
                    {errors.unit && (
                      <p className="form-error">{errors.unit.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Question: Quran Study */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. ഖുർആൻ പഠനം : സൂറ അന്നിസാഅ് (87 ആയഹ്)- തഫ്സീർ മുന്നിൽ വെച്ചുള്ള പഠനം :
            </h3>
            <div className="space-y-1.5 sm:space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value="complete"
                    {...register('form.quranStudy.status')}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">പൂർണം</span>
                </label>
                <label className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value="partial"
                    {...register('form.quranStudy.status')}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">ഭാഗികം</span>
                </label>
              </div>
              <div>
                <label className="form-label">മറ്റു ഭാഗങ്ങൾ : (സൂറത്ത്, ആയത്തുകൾ)</label>
                <textarea
                  {...register('form.quranStudy.others')}
                  className="form-textarea text-base py-2 sm:text-sm"
                  rows="2"
                  placeholder="Enter other chapters/verses studied"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question: Hadith Study */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. ഹദീസ് പഠനം : (എണ്ണം)
            </h3>
            <input
              {...register('form.hadithCount', { 
                required: 'Hadith count is required',
                min: { value: 0, message: 'Count cannot be negative' },
                
                valueAsNumber: true
              })}
              type="number"
              min="0"
             
                className="form-input w-32 text-base py-2 sm:text-sm"
                placeholder="0"
                onInput={handleNumberInput}
              onPaste={handleNumberPaste}
            />
            {errors.form?.hadithCount && (
              <p className="form-error">{errors.form.hadithCount.message}</p>
            )}
          </div>
        </div>

        {/* Question: Book Reading */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. പുസ്തക വായന
            </h3>
            <div className="space-y-2.5 sm:space-y-4">
              <div>
                <label className="form-label">A. മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {FORM_OPTIONS.bookReading.map((option) => (
                    <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                      <input
                        type="radio"
                        value={option.value}
                        {...register('form.bookReading.islami', { required: 'Selection is required' })}
                        className="form-radio"
                      />
                      <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.form?.bookReading?.islami && (
                  <p className="form-error">{errors.form.bookReading.islami.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">B. മദീനയിലെ ഏടുകളിൽ നിന്ന്</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {FORM_OPTIONS.bookReading.map((option) => (
                    <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                      <input
                        type="radio"
                        value={option.value}
                        {...register('form.bookReading.atma', { required: 'Selection is required' })}
                        className="form-radio"
                      />
                      <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.form?.bookReading?.atma && (
                  <p className="form-error">{errors.form.bookReading.atma.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">മറ്റു സാഹിത്യങ്ങൾ (പേരെഴുതുക)</label>
                <textarea
                  {...register('form.bookReading.others')}
                  className="form-textarea text-base py-2 sm:text-sm"
                  rows="2"
                  placeholder="Enter other literature read"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question: Weekly Meeting */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. പ്രതിവാരയോഗം :
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-3">
              <div>
                <label className="form-label">ഹാജർ : (എണ്ണം)</label>
                  <input
                  {...register('form.weeklyMeeting.hadir', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.weeklyMeeting?.hadir && (
                  <p className="form-error">{errors.form.weeklyMeeting.hadir.message}</p>
                )}
            </div>
              <div>
                <label className="form-label">ലീവ് : (എണ്ണം)</label>
                <input
                  {...register('form.weeklyMeeting.leave', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.weeklyMeeting?.leave && (
                  <p className="form-error">{errors.form.weeklyMeeting.leave.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">ആബ്സൻ്റ് : (എണ്ണം)</label>
                <input
                  {...register('form.weeklyMeeting.absent', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.weeklyMeeting?.absent && (
                  <p className="form-error">{errors.form.weeklyMeeting.absent.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question: Jamaath Meeting */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. പ്രാദേശിക ജമാഅത്തെ യോഗം:
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-3">
              <div>
                <label className="form-label">ഹാജർ : (എണ്ണം)</label>
                  <input
                  {...register('form.jamaathMeeting.hadir', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.jamaathMeeting?.hadir && (
                  <p className="form-error">{errors.form.jamaathMeeting.hadir.message}</p>
                )}
            </div>
              <div>
                <label className="form-label">ലീവ് : (എണ്ണം)</label>
                <input
                  {...register('form.jamaathMeeting.leave', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.jamaathMeeting?.leave && (
                  <p className="form-error">{errors.form.jamaathMeeting.leave.message}</p>
                )}
              </div>
              <div>
                <label className="form-label">ആബ്സൻ്റ് : (എണ്ണം)</label>
                <input
                  {...register('form.jamaathMeeting.absent', { 
                    required: 'Count is required',
                    min: { value: 0, message: 'Count cannot be negative' },
                    max: { value: 100, message: 'Count cannot exceed 100' },
                    valueAsNumber: true
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-base py-2 sm:text-sm"
                  placeholder="0"
                  onInput={handleNumberInput}
                  onPaste={handleNumberPaste}
                />
                {errors.form?.jamaathMeeting?.absent && (
                  <p className="form-error">{errors.form.jamaathMeeting.absent.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question: Griha Meetings */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. ഗൃഹയോഗങ്ങൾ :
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {GRIHA_MEETINGS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.grihameetings', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.grihameetings && (
              <p className="form-error">{errors.form.grihameetings.message}</p>
            )}
          </div>
        </div>

        {/* Question: Thahreeki Meetings */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. തഹ്‌രീകീ യോഗം - പങ്കാളിത്തം
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {THAHREEKI_MEETINGS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.thahreekiMeetings', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.thahreekiMeetings && (
              <p className="form-error">{errors.form.thahreekiMeetings.message}</p>
            )}
          </div>
        </div>

        {/* Question: Baithulmaal */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. ബൈതുല്‍മാല്‍ (2%) നല്‍കിയത്:
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FORM_OPTIONS.baithulmaal.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.baithulmaal', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.baithulmaal && (
              <p className="form-error">{errors.form.baithulmaal.message}</p>
            )}
          </div>
        </div>

        {/* Question: Zakat */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. സകാത്ത് ബൈതുല്‍മാലില്‍ അടച്ചോ?
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FORM_OPTIONS.zakatPaid.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.zakatPaid', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.zakatPaid && (
              <p className="form-error">{errors.form.zakatPaid.message}</p>
            )}
          </div>
        </div>

        {/* Question: New Members */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[0, 1, 2, 3].map((value) => (
                <label key={value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={value.toString()}
                    {...register('form.newMembers', { 
                      required: 'Selection is required'
                    })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{value}</span>
                </label>
              ))}
            </div>
            {errors.form?.newMembers && (
              <p className="form-error">{errors.form.newMembers.message}</p>
            )}
          </div>
        </div>

        {/* Question: Muslim Relations */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)
            </h3>
            <input
              {...register('form.muslimRelations', { 
                required: 'Number is required',
                min: { value: 0, message: 'Count cannot be negative' },
                max: { value: 100, message: 'Count cannot exceed 100' },
                valueAsNumber: true
              })}
              type="number"
              min="0"
              max="100"
              className="form-input w-32 text-base py-2 sm:text-sm"
              placeholder="0"
              onInput={handleNumberInput}
              onPaste={handleNumberPaste}
            />
            {errors.form?.muslimRelations && (
              <p className="form-error">{errors.form.muslimRelations.message}</p>
            )}
          </div>
        </div>

        {/* Question: Community Relations */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)
            </h3>
            <input
              {...register('form.communityRelations', { 
                required: 'Number is required',
                min: { value: 0, message: 'Count cannot be negative' },
                max: { value: 100, message: 'Count cannot exceed 100' },
                valueAsNumber: true
              })}
              type="number"
              min="0"
              max="100"
              className="form-input w-32 text-base py-2 sm:text-sm"
              placeholder="0"
              onInput={handleNumberInput}
              onPaste={handleNumberPaste}
            />
            {errors.form?.communityRelations && (
              <p className="form-error">{errors.form.communityRelations.message}</p>
            )}
          </div>
        </div>

        {/* Question: Score Count */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)
            </h3>
            <input
              {...register('form.scoreCount', { 
                required: 'Number is required',
                min: { value: 0, message: 'Count cannot be negative' },
                max: { value: 100, message: 'Count cannot exceed 100' },
                valueAsNumber: true
              })}
              type="number"
              min="0"
              max="100"
              className="form-input w-32 text-base py-2 sm:text-sm"
              placeholder="0"
              onInput={handleNumberInput}
              onPaste={handleNumberPaste}
            />
            {errors.form?.scoreCount && (
              <p className="form-error">{errors.form.scoreCount.message}</p>
            )}
          </div>
        </div>

        {/* Question: Meqath Service */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. 100പേര്‍ക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാര്‍ഗറ്റ് മുന്നില്‍ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവര്‍ത്തനം തൃപ്തികരമാണോ ?
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FORM_OPTIONS.meqathService.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.meqathService', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.meqathService && (
              <p className="form-error">{errors.form.meqathService.message}</p>
            )}
          </div>
        </div>

        {/* Question: Skill Usage */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകള്‍ ദീനീമാര്‍ഗത്തില്‍ സാധ്യമാകുന്ന അളവില്‍ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FORM_OPTIONS.skillUsage.map((option) => (
                <label key={option.value} className="flex items-center py-1.5 sm:py-0">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('form.skillUsage', { required: 'Selection is required' })}
                    className="form-radio"
                  />
                  <span className="ml-2 text-[13px] sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.form?.skillUsage && (
              <p className="form-error">{errors.form.skillUsage.message}</p>
            )}
          </div>
        </div>

        {/* Question: Jamaath Influence */}
        <div className="card">
          <div className="card-body p-3 sm:px-6 sm:py-4">
            <h3 className="mb-2.5 text-[13px] font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-lg">
              {nextQuestionNumber()}. പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?
            </h3>
            <div 
              className="flex items-center space-x-2"
              onMouseLeave={() => setHoveredStar(null)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = jamaathInfluenceRating && star <= jamaathInfluenceRating
                const isHovered = hoveredStar && star <= hoveredStar
                const shouldHighlight = isActive || isHovered
                
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarRatingChange(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded transition-all p-1.5"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-all duration-150 ${
                        shouldHighlight
                          ? 'text-yellow-400 fill-yellow-400 scale-110'
                          : 'text-gray-300 fill-gray-300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
            <input
              type="hidden"
              {...register('form.jamaathInfluence', { required: 'Rating is required' })}
            />
            {errors.form?.jamaathInfluence && (
              <p className="form-error mt-2">{errors.form.jamaathInfluence.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate('/ihthisabi/dashboard')}
            className="px-5 py-3 sm:py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="submissionForm"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 sm:py-2 text-sm font-semibold text-white bg-[#161F2F] rounded-lg shadow-lg hover:bg-[#1a2538] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                {editMode ? 'Update Report' : 'Submit Report'}
              </div>
            )}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

export default SubmissionForm