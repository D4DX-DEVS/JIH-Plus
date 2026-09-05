import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal'
import {
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  Trash2,
  Edit,
  Star,
  X as CloseIcon,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const SubmissionDetails = ({ userRole }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dynamicFormSchema, setDynamicFormSchema] = useState(null)

  // Determine if user is unit admin
  const normalizedRole = useMemo(() => (userRole || user?.role || 'rukn').toLowerCase(), [userRole, user?.role])
  const isUnitAdmin = normalizedRole === 'unitadmin' || normalizedRole === 'unit_admin' || normalizedRole === 'unit-admin'

  // Role-aware endpoints
  const detailEndpoint = isUnitAdmin ? `/unitadmin/my-submissions/${id}` : `/submissions/${id}`
  const deleteEndpoint = isUnitAdmin ? `/unitadmin/my-submissions/${id}` : `/submissions/${id}`
  const backPath = isUnitAdmin
    ? '/ihthisabi/unitadmin'
    : (user?.role === 'admin' ? '/ihthisabi/admin/submissions' : '/ihthisabi/dashboard')
  const editPath = isUnitAdmin
    ? `/ihthisabi/unitadmin/submit-form?edit=${id}`
    : `/ihthisabi/submit?edit=${id}`

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/ihthisabi/login')
      return
    }

    if (id) {
      fetchSubmissionDetails()
    }
  }, [id, isAuthenticated, navigate])

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(detailEndpoint)
      const sub = response.data.data.submission
      setSubmission(sub)

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
    } catch (error) {
      console.error('Failed to fetch submission details:', error)
      toast.error('Failed to load submission')
      navigate(backPath)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      await api.delete(deleteEndpoint)
      toast.success('Submission deleted')
      navigate(backPath)
    } catch (error) {
      toast.error('Failed to delete submission')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200'
      case 'reviewed': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getValue = (val) => val || '-'
  const getLabel = (val) => {
    const labels = {
      'complete': 'പൂർണം', 'partial': 'ഭാഗികം', 'notread': 'വായിച്ചില്ല',
      'incomplete': 'അപൂർണം', 'yes': 'അതെ', 'no': 'ഇല്ല',
      'satisfactory': 'തൃപ്തികരം', 'unsatisfactory': 'തൃപ്തികരമല്ല',
      'notApplicable': 'ബാധകമല്ല', 'almost': 'ഏറെക്കുറെ', 'small': 'ചെറിയ തോതിൽ',
      'none': '-'
    }
    return labels[val] || val
  }

  if (loading) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Submission Not Found</h3>
          <p className="text-gray-600 mb-6">The submission you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(backPath)}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const form = submission.form || {}
  const isDynamicSubmission = !!(submission.dynamicFormId && submission.dynamicFormData)

  // Render dynamic form data with proper question labels from schema
  const renderDynamicFormDetails = () => {
    const data = submission.dynamicFormData || {}

    if (dynamicFormSchema) {
      const questions = [...(dynamicFormSchema.questions || [])].sort((a, b) => a.order - b.order)
      if (!questions.length) return <p className="text-gray-500 p-5">No form data available</p>

      return questions.map((question, index) => {
        const qId = question.questionId
        const value = data[qId]
        const label = question.questionTextMl || question.questionText

        let displayElement

        if (question.answerType === 'group') {
          displayElement = (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {question.subFields?.map((sf, sfIdx) => {
                const effectiveFieldId = sf.fieldId || `field_${sfIdx}`
                return (
                  <div key={effectiveFieldId} className="bg-gray-50 rounded-xl px-2 py-3 text-center sm:px-4">
                    <p className="text-xs text-gray-500 mb-1 break-words leading-relaxed">{sf.labelMl || sf.label}</p>
                    <p className="font-bold text-2xl text-gray-900">{(value || {})[effectiveFieldId] ?? 0}</p>
                  </div>
                )
              })}
            </div>
          )
        } else if (question.answerType === 'radio' || question.answerType === 'dropdown') {
          const opt = question.options?.find(o => o.value === value)
          const display = opt ? (opt.labelMl || opt.label) : (value || '-')
          displayElement = (
            <div className="bg-gray-50 rounded px-4 py-2.5">
              <span className="font-semibold text-gray-900">{display}</span>
            </div>
          )
        } else if (question.answerType === 'checkbox') {
          const selected = Array.isArray(value) ? value : []
          const display = selected.length
            ? selected.map(v => {
                const opt = question.options?.find(o => o.value === v)
                return opt ? (opt.labelMl || opt.label) : v
              }).join(', ')
            : '-'
          displayElement = (
            <div className="bg-gray-50 rounded px-4 py-2.5">
              <span className="font-semibold text-gray-900">{display}</span>
            </div>
          )
        } else if (question.answerType === 'star') {
          const starMax = question.max || 5
          displayElement = (
            <div className="flex items-center gap-1">
              {Array.from({ length: starMax }, (_, i) => i + 1).map(star => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
              {value > 0 && <span className="ml-2 text-sm text-gray-500">{value}/{starMax}</span>}
            </div>
          )
        } else if (question.answerType === 'number') {
          displayElement = <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        } else {
          displayElement = (
            <div className="bg-gray-50 rounded px-4 py-2.5">
              <span className="font-semibold text-gray-900">{String(value || '-')}</span>
            </div>
          )
        }

        return (
          <div key={qId} className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed">
              {index + 1}. {label}
            </h3>
            {displayElement}
          </div>
        )
      })
    }

    // Fallback: no schema available — show raw keys/values
    const entries = Object.entries(data)
    if (!entries.length) return <p className="text-gray-500 p-5">No form data available</p>
    return entries.map(([key, value], index) => {
      let displayValue = value
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        displayValue = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')
      } else if (Array.isArray(value)) {
        displayValue = value.join(', ')
      }
      return (
        <div key={key} className="p-5">
          <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">{index + 1}. {key}</h3>
          <div className="bg-gray-50 rounded px-4 py-2.5">
            <span className="font-semibold text-gray-900">{String(displayValue)}</span>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="ih-screen bg-gray-50 py-4 sm:py-6 px-4">
      <div className="max-w-5xl mx-auto relative">
        {/* Below the sticky mobile app bar (~56px) so it never overlaps the account button */}
        <button
          onClick={() => navigate(backPath)}
          className="fixed top-16 lg:top-4 right-4 z-50 flex items-center justify-center w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-white shadow-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        {/* Header Card */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-4 sm:p-6 mb-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* App bar already titles this screen on mobile */}
              <h1 className="hidden lg:block text-2xl font-semibold text-gray-900 brand-font">സമർപ്പണ വിവരങ്ങൾ</h1>
              <p className="text-sm text-gray-500 mt-1 break-words leading-relaxed">പ്രതിമാസ പ്രവർത്തന റിപ്പോർട്ട്: {submission.periodDisplay}</p>
            </div>
            <div className="flex items-center gap-2">

              <button
                onClick={() => navigate(editPath)}
                className="min-h-[44px] lg:min-h-0 flex-1 sm:flex-none px-4 py-2 bg-[#161F2F] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#1a2538]"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="min-h-[44px] lg:min-h-0 flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted By</p>
              <p className="font-semibold text-gray-900">{submission.ruknName || 'N/A'}</p>
              <p className="text-xs text-gray-500">{submission.role || (user?.role || 'rukn')}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted On</p>
              <p className="font-semibold text-gray-900">
                {new Date(submission.createdAt).toLocaleString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Q{submission.submissionPeriod?.quarter || 'N/A'} • {submission.submissionPeriod?.year || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Unit / Area</p>
              <p className="font-semibold text-gray-900">{submission.unit || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">{submission.area ? `${submission.area} • ` : ''}{submission.district || ''}</p>
            </div>
          </div>
        </div>

        {/* Form Details */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {isDynamicSubmission ? (
            <>
              <div className="p-5 bg-blue-50 rounded-t-3xl">
                <p className="text-sm text-blue-700 font-medium">Dynamic Form Submission</p>
              </div>
              {renderDynamicFormDetails()}
            </>
          ) : (
          <>
          {/* Question 1 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed">1. ഖുർആൻ പഠനം : സൂറ അന്നിസാഅ് (87 ആയഹ്)- തഫ്സീർ മുന്നിൽ വെച്ചുള്ള പഠനം :</h3>
            <div className="bg-gray-50 rounded px-4 py-2.5">
              <span className="font-semibold text-gray-900">{getLabel(form.quranStudy?.status)}</span>
            </div>
            {form.quranStudy?.others && (
              <div className="mt-3 text-sm bg-gray-50 rounded px-4 py-2.5">
                <span className="text-gray-600">മറ്റു ഭാഗങ്ങൾ : (സൂറത്ത്, ആയത്തുകൾ)</span>
                <span className="ml-2 font-medium text-gray-900">{form.quranStudy.others}</span>
              </div>
            )}
          </div>

          {/* Question 2 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed break-words">2. ഹദീസ് പഠനം : (എണ്ണം)</h3>
            <p className="text-4xl font-bold text-primary">{form.hadithCount || 0}</p>
          </div>

          {/* Question 3 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed break-words">3. പുസ്തക വായന</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 bg-gray-50 rounded px-4 py-2.5 text-sm">
                <span className="text-gray-700">A. മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും</span>
                <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.islami)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-gray-50 rounded px-4 py-2.5 text-sm">
                <span className="text-gray-700">B. മദീനയിലെ ഏടുകളിൽ നിന്ന്</span>
                <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.atma)}</span>
              </div>
              {form.bookReading?.others && (
                <div className="bg-gray-50 rounded px-4 py-2.5 text-sm">
                  <span className="text-gray-600">മറ്റു സാഹിത്യങ്ങൾ (പേരെഴുതുക)</span>
                  <span className="ml-2 font-medium text-gray-900">{form.bookReading.others}</span>
                </div>
              )}
            </div>
          </div>

          {/* Question 4 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed break-words">4. പ്രതിവാരയോഗം :</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ഹാജർ</p>
                <p className="font-bold text-2xl text-gray-900">{form.weeklyMeeting?.hadir || 0}</p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ലീവ്</p>
                <p className="font-bold text-2xl text-gray-900">{form.weeklyMeeting?.leave || 0}</p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ആബ്സന്റ്</p>
                <p className="font-bold text-2xl text-gray-900">{form.weeklyMeeting?.absent || 0}</p>
              </div>
            </div>
          </div>

          {/* Question 5 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3 leading-relaxed break-words">5. പ്രാദേശിക ജമാഅത്തെ യോഗം:</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ഹാജർ</p>
                <p className="font-bold text-2xl text-gray-900">{form.jamaathMeeting?.hadir || 0}</p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ലീവ്</p>
                <p className="font-bold text-2xl text-gray-900">{form.jamaathMeeting?.leave || 0}</p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-3 text-center sm:px-4">
                <p className="text-xs text-gray-600 mb-1 break-words">ആബ്സന്റ്</p>
                <p className="font-bold text-2xl text-gray-900">{form.jamaathMeeting?.absent || 0}</p>
              </div>
            </div>
          </div>

          {/* Question 6 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">6. ഗൃഹയോഗങ്ങൾ :</h3>
            <p className="text-2xl font-bold text-gray-900">{form.grihameetings || 0}</p>
          </div>

          {/* Question 7 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">7. തഹ്രീകീ യോഗം - പങ്കാളിത്തം</h3>
            <p className="text-2xl font-bold text-gray-900">{form.thahreekiMeetings || 0}</p>
          </div>

          {/* Question 8 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">8. ബൈതുല്മാല് (2%) നല്കിയത്:</h3>
            <p className="text-lg font-semibold text-gray-900">{getLabel(form.baithulmaal)}</p>
          </div>

          {/* Question 9 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">9. സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?</h3>
            <p className="text-lg font-semibold text-gray-900">{getLabel(form.zakatPaid)}</p>
          </div>


          {/* Question 10 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">10. പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)</h3>
            <p className="text-2xl font-bold text-gray-900">{form.newMembers || 0}</p>
          </div>

          {/* Question 11 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">11. മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)</h3>
            <p className="text-2xl font-bold text-gray-900">{form.muslimRelations || 0}</p>
          </div>

          {/* Question 12 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">12. സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)</h3>
            <p className="text-2xl font-bold text-gray-900">{form.communityRelations || 0}</p>
          </div>

          {/* Question 13 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">13. ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)</h3>
            <p className="text-2xl font-bold text-gray-900">{form.scoreCount || 0}</p>
          </div>

          {/* Question 14 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed">14. 100പേർക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാർഗറ്റ് മുന്നിൽ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവർത്തനം തൃപ്തികരമാണോ?</h3>
            <p className="text-lg font-semibold text-gray-900">{getLabel(form.meqathService)}</p>
          </div>

          {/* Question 15 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed">15. എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകൾ ദീനീമാർഗത്തിൽ സാധ്യമാകുന്ന അളവിൽ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?</h3>
            <p className="text-lg font-semibold text-gray-900">{getLabel(form.skillUsage)}</p>
          </div>

          {/* Question 16 */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-2 leading-relaxed break-words">16. പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?</h3>
            <div className="flex items-center space-x-2 mt-3">
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
                        className={`w-6 h-6 ${isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
                      />
                    )
                  })}
                  <span className="ml-3 text-gray-700 font-medium">{getLabel(form.jamaathInfluence)}</span>
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {/* Admin Feedback */}
        {submission.adminReply?.message && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Admin Reply</p>
                <p className="text-sm text-gray-800">
                  {submission.adminReply?.message}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-semibold text-gray-900">
                  {submission.adminReply?.repliedBy?.name || submission.adminReply?.repliedBy?.username || 'Admin'}
                </p>
                <p>
                  {submission.adminReply?.repliedAt ? new Date(submission.adminReply.repliedAt).toLocaleString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  }) : 'Date not available'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          Submitted on: {new Date(submission.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default SubmissionDetails
