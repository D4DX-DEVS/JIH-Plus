import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import {
  Globe,
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  X as CloseIcon,
  Users as UsersIcon,
  AlertCircle,
  Star
} from 'lucide-react'
import toast from 'react-hot-toast'

const statusColor = (status) => {
  switch (status) {
    case 'approved': return 'text-green-700 bg-green-50 border-green-200'
    case 'reviewed': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'submitted': return 'text-blue-700 bg-blue-50 border-blue-200'
    default: return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

const statusIcon = (status) => {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-3.5 h-3.5" />
    case 'reviewed': return <Clock className="w-3.5 h-3.5" />
    case 'submitted': return <FileText className="w-3.5 h-3.5" />
    default: return <XCircle className="w-3.5 h-3.5" />
  }
}

const formatDate = (d) => {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Member Detail Drawer ─────────────────────────────────────────────────────
const MemberDetailDrawer = ({ memberId, submissions, onClose, onViewSubmission }) => {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/ihthisabi/admin/users/${memberId}`)
        setMember(res.data?.data?.user || null)
      } catch {
        toast.error('Failed to load member details')
      } finally {
        setLoading(false)
      }
    }
    fetchMember()
  }, [memberId])

  const sortedSubmissions = [...(submissions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Member Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-gray-600">Loading member details...</span>
            </div>
          ) : member ? (
            <>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(member.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{member.name || '—'}</div>
                    {member.ruknId && <div className="text-sm text-gray-500 font-mono truncate">{member.ruknId}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 min-w-0">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{[member.district, member.area, member.unit].filter(Boolean).join(' - ') || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 min-w-0">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{member.abroadCountry?.title || 'Unassigned Country'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Submissions</h4>
                {sortedSubmissions.length === 0 ? (
                  <div className="text-sm text-gray-500">No submissions available for this member.</div>
                ) : (
                  <div className="space-y-2">
                    {sortedSubmissions.map(sub => (
                      <button
                        key={sub._id}
                        onClick={() => onViewSubmission(sub._id)}
                        className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              {sub.submissionPeriod
                                ? `Q${sub.submissionPeriod.quarter} ${sub.submissionPeriod.year}`
                                : 'Submission'}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(sub.createdAt)}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(sub.status)}`}>
                            {statusIcon(sub.status)}
                            {sub.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">Failed to load member details</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Submission Detail Drawer ────────────────────────────────────────────────
const SubmissionDrawer = ({ submissionId, onClose, onRefresh }) => {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [drawerFormSchema, setDrawerFormSchema] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setDrawerFormSchema(null)
        const res = await api.get(`/ihthisabi/admin/submissions/${submissionId}`)
        const sub = res.data?.data?.submission || null
        setDetails(sub)
        setReplyMessage(sub?.adminReply?.message || '')

        // If this submission has a dynamic form, fetch the schema for rendering
        if (sub?.dynamicFormId && sub?.submissionPeriod?.quarter && sub?.submissionPeriod?.year) {
          try {
            const formRes = await api.get(
              `/ihthisabi/application-forms/public/by-quarter/${sub.submissionPeriod.quarter}/${sub.submissionPeriod.year}`
            )
            if (formRes.data?.hasDynamicForm && formRes.data?.data) {
              setDrawerFormSchema(formRes.data.data)
            }
          } catch {
            // schema unavailable — fallback rendering will be used
          }
        }
      } catch {
        toast.error('Failed to load submission details')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [submissionId])

  const handleReply = async () => {
    if (!replyMessage.trim()) return
    try {
      setReplyLoading(true)
      const res = await api.post(`/ihthisabi/admin/submissions/${submissionId}/reply`, {
        message: replyMessage.trim()
      })
      if (res.data?.success) {
        toast.success('Reply sent successfully')
        setDetails(prev => prev ? { ...prev, adminReply: res.data.data.submission.adminReply } : prev)
        onRefresh()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply')
    } finally {
      setReplyLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      setStatusUpdating(true)
      const res = await api.put(`/ihthisabi/admin/submissions/${submissionId}/status`, { status: newStatus })
      if (res.data?.success) {
        toast.success(`Status updated to ${newStatus}`)
        setDetails(prev => prev ? { ...prev, status: newStatus } : prev)
        onRefresh()
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

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

  const renderFullFormData = (details) => {
    const form = details.form || {}
    const isDynamic = !!(details.dynamicFormId && details.dynamicFormData)

    if (isDynamic) {
      const data = details.dynamicFormData || {}

      const renderDynamicQuestions = () => {
        if (drawerFormSchema) {
          const questions = [...(drawerFormSchema.questions || [])].sort((a, b) => a.order - b.order)
          return questions.map((question, index) => {
            const qId = question.questionId
            const value = data[qId]
            const label = question.questionTextMl || question.questionText
            let displayElement

            if (question.answerType === 'group') {
              displayElement = (
                <div className="grid grid-cols-3 gap-2">
                  {question.subFields?.map((sf, sfIdx) => {
                    const fid = sf.fieldId || `field_${sfIdx}`
                    return (
                      <div key={fid} className="bg-gray-50 rounded px-2 py-2 text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">{sf.labelMl || sf.label}</p>
                        <p className="font-bold text-lg text-gray-900">{(value || {})[fid] ?? 0}</p>
                      </div>
                    )
                  })}
                </div>
              )
            } else if (question.answerType === 'radio' || question.answerType === 'dropdown') {
              const opt = question.options?.find(o => o.value === value)
              displayElement = (
                <div className="bg-gray-50 rounded px-3 py-2">
                  <span className="text-xs font-medium text-gray-900">{opt ? (opt.labelMl || opt.label) : (value || '-')}</span>
                </div>
              )
            } else if (question.answerType === 'checkbox') {
              const selected = Array.isArray(value) ? value : []
              const display = selected.length
                ? selected.map(v => { const opt = question.options?.find(o => o.value === v); return opt ? (opt.labelMl || opt.label) : v }).join(', ')
                : '-'
              displayElement = (
                <div className="bg-gray-50 rounded px-3 py-2">
                  <span className="text-xs font-medium text-gray-900">{display}</span>
                </div>
              )
            } else if (question.answerType === 'star') {
              const starMax = question.max || 5
              displayElement = (
                <div className="flex items-center gap-1">
                  {Array.from({ length: starMax }, (_, i) => i + 1).map(star => (
                    <Star key={star} className={`w-4 h-4 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  {value > 0 && <span className="ml-1 text-xs text-gray-500">{value}/{starMax}</span>}
                </div>
              )
            } else if (question.answerType === 'number') {
              displayElement = <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
            } else {
              displayElement = (
                <div className="bg-gray-50 rounded px-3 py-2">
                  <span className="text-xs font-medium text-gray-900">{String(value || '-')}</span>
                </div>
              )
            }

            return (
              <div key={qId} className="border-b border-gray-100 pb-3">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 leading-relaxed">{index + 1}. {label}</h4>
                {displayElement}
              </div>
            )
          })
        }

        // Fallback: no schema — show raw keys
        return Object.entries(data).map(([key, value], index) => {
          let displayVal = value
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            displayVal = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')
          } else if (Array.isArray(value)) {
            displayVal = value.join(', ')
          }
          return (
            <div key={key} className="border-b border-gray-100 pb-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">{index + 1}. {key}</h4>
              <div className="bg-gray-50 rounded px-3 py-2">
                <span className="text-xs font-medium text-gray-900">{String(displayVal)}</span>
              </div>
            </div>
          )
        })
      }

      return (
        <>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
            Dynamic Form Submission
          </div>
          {renderDynamicQuestions()}
        </>
      )
    }

    // Static (legacy) form — all questions
    return (
      <>
        {/* Q1: Quran Study */}
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

        {/* Q2: Hadith Count */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഹദീസ് പഠനം</h4>
          <p className="text-2xl font-bold text-primary">{form.hadithCount || 0}</p>
        </div>

        {/* Q3: Book Reading */}
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

        {/* Q4: Weekly Meeting */}
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

        {/* Q5: Jamaath Meeting */}
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

        {/* Q6: Griha Meetings */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഗൃഹയോഗങ്ങൾ</h4>
          <p className="text-xl font-bold text-gray-900">{form.grihameetings || 0}</p>
        </div>

        {/* Q7: Thahreeki Meetings */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">തഹ്രീകീ യോഗം - പങ്കാളിത്തം</h4>
          <p className="text-xl font-bold text-gray-900">{form.thahreekiMeetings || 0}</p>
        </div>

        {/* Q8: Baithulmaal */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">ബൈതുല്മാല് (2%)</h4>
          <p className="text-sm font-semibold text-gray-900">{getLabel(form.baithulmaal)}</p>
        </div>

        {/* Q9: Zakat */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?</h4>
          <p className="text-sm font-semibold text-gray-900">{getLabel(form.zakatPaid)}</p>
        </div>

        {/* Q10: New Members */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)</h4>
          <p className="text-xl font-bold text-gray-900">{form.newMembers || 0}</p>
        </div>

        {/* Q11: Muslim Relations */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)</h4>
          <p className="text-xl font-bold text-gray-900">{form.muslimRelations || 0}</p>
        </div>

        {/* Q12: Community Relations */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)</h4>
          <p className="text-xl font-bold text-gray-900">{form.communityRelations || 0}</p>
        </div>

        {/* Q13: Score Count */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)</h4>
          <p className="text-xl font-bold text-gray-900">{form.scoreCount || 0}</p>
        </div>

        {/* Q14: Meqath Service */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">100പേർക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാർഗറ്റ് മുന്നിൽ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവർത്തനം തൃപ്തികരമാണോ?</h4>
          <p className="text-sm font-semibold text-gray-900">{getLabel(form.meqathService)}</p>
        </div>

        {/* Q15: Skill Usage */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകൾ ദീനീമാർഗത്തിൽ സാധ്യമാകുന്ന അളവിൽ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?</h4>
          <p className="text-sm font-semibold text-gray-900">{getLabel(form.skillUsage)}</p>
        </div>

        {/* Q16: Jamaath Influence */}
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?</h4>
          {form.jamaathInfluence && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => {
                  const bv = form.jamaathInfluence
                  let isActive = false
                  if (bv === 'no' && star <= 1) isActive = true
                  if (bv === 'small' && star <= 3) isActive = true
                  if (bv === 'yes' && star <= 5) isActive = true
                  return (
                    <Star key={star} className={`w-4 h-4 ${isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} />
                  )
                })}
                <span className="ml-2 text-xs text-gray-700 font-medium">{getLabel(form.jamaathInfluence)}</span>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Submission Details</h3>
            {details?.periodDisplay && (
              <p className="text-xs text-gray-500">{details.periodDisplay}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-gray-600">Loading details...</span>
            </div>
          ) : details ? (
            <div className="space-y-4">
              {/* Member info */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-lg shrink-0">
                  {(details.ruknName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{details.ruknName || 'Unknown Member'}</div>
                  {details.ruknId && <div className="text-xs text-gray-500 font-mono truncate">{details.ruknId}</div>}
                  <div className="text-xs text-gray-500 flex items-center mt-0.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                    <span className="truncate">{[details.district, details.area, details.unit].filter(Boolean).join(' - ') || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Status + Quarter */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">Status</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(details.status)}`}>
                    {statusIcon(details.status)}
                    <span className="capitalize">{details.status}</span>
                  </span>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">Period</div>
                  <div className="text-xs text-gray-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {details.submissionPeriod
                      ? `Q${details.submissionPeriod.quarter} ${details.submissionPeriod.year}`
                      : details.periodDisplay || '—'}
                  </div>
                </div>
              </div>

              {/* Status update buttons */}
              <div className="pb-3 border-b border-gray-200">
                <div className="text-[10px] text-gray-500 mb-2">Update Status</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {['submitted', 'reviewed', 'approved'].filter(s => s !== details.status).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusUpdate(s)}
                      disabled={statusUpdating}
                      className="px-3 py-2.5 text-xs border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 disabled:opacity-50 capitalize"
                    >
                      {statusUpdating ? '...' : `Mark ${s}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full form data */}
              {renderFullFormData(details)}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Failed to load submission details</div>
          )}
        </div>

        {/* Footer - Fixed Reply Section */}
        {details && !loading && (
          <div className="border-t border-gray-200 bg-white p-5 flex-shrink-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              {details.adminReply?.message ? 'Update Reply' : 'Send Reply'}
            </h4>

            {details.adminReply?.message && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-800 mb-2 font-medium">Previous Reply:</div>
                <p className="text-sm text-blue-900 whitespace-pre-wrap break-words">{details.adminReply.message}</p>
                {details.adminReply.repliedAt && (
                  <div className="text-xs text-blue-700 mt-2">Replied on: {formatDate(details.adminReply.repliedAt)}</div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <textarea
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                placeholder="Enter your reply message..."
                rows={3}
                className="w-full px-3 py-2 text-[16px] sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyMessage.trim() || replyLoading}
                  className="px-4 py-2.5 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center font-medium shadow-sm"
                  style={{ backgroundColor: '#121A2A' }}
                >
                  {replyLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AbroadSubmissions = () => {
  const [members, setMembers] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [selectedArea, setSelectedArea] = useState('all')
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quarterFilter, setQuarterFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedCountries, setExpandedCountries] = useState({})
  const [areaOptions, setAreaOptions] = useState([])
  const [unitOptions, setUnitOptions] = useState([])

  // Drawer
  const [drawerSubmissionId, setDrawerSubmissionId] = useState(null)
  const [drawerMember, setDrawerMember] = useState(null)

  // ── Fetch both members and their submissions in parallel ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // No page/limit sent: both endpoints return the full matching set when `page`
      // is absent, which this grouped country/area/unit tree view needs at once.
      const params = {}
      if (selectedCountry !== 'all') params.country = selectedCountry
      if (selectedArea !== 'all') params.area = selectedArea
      if (selectedUnit !== 'all') params.unit = selectedUnit
      const [membersRes, subsRes] = await Promise.all([
        api.get('/ihthisabi/admin/abroad-members', { params }),
        api.get('/ihthisabi/admin/abroad-submissions', { params })
      ])
      const fetchedMembers = membersRes.data.data.members || []
      const fetchedSubs = subsRes.data.data.submissions || []
      setMembers(fetchedMembers)
      setSubmissions(fetchedSubs)

      // Auto-expand all country groups on first load
      setExpandedCountries(prev => {
        if (Object.keys(prev).length > 0) return prev
        const expanded = {}
        fetchedMembers.forEach(m => {
          if (m.abroadCountry) expanded[String(m.abroadCountry._id)] = true
        })
        return expanded
      })
    } catch (err) {
      console.error('Failed to fetch abroad data:', err)
      toast.error('Failed to load abroad members')
    } finally {
      setLoading(false)
    }
  }, [selectedCountry, selectedArea, selectedUnit])

  useEffect(() => { fetchData() }, [fetchData])

  // Load area options when country changes
  useEffect(() => {
    setSelectedArea('all'); setSelectedUnit('all'); setAreaOptions([]); setUnitOptions([])
    if (selectedCountry === 'all') return
    api.get('/ihthisabi/admin/abroad-areas', { params: { country: selectedCountry } })
      .then(res => setAreaOptions(res.data.data.areas || []))
      .catch(() => {})
  }, [selectedCountry])

  // Load unit options when area changes
  useEffect(() => {
    setSelectedUnit('all'); setUnitOptions([])
    if (selectedArea === 'all') return
    api.get('/ihthisabi/admin/abroad-units', { params: { area: selectedArea } })
      .then(res => setUnitOptions(res.data.data.units || []))
      .catch(() => {})
  }, [selectedArea])

  // ── Build a map: userId → [submissions] (all submissions, unfiltered) ──
  const submissionsByUser = React.useMemo(() => {
    const map = {}
    submissions.forEach(sub => {
      const uid = String(sub.userId)
      if (!map[uid]) map[uid] = []
      map[uid].push(sub)
    })
    return map
  }, [submissions])

  // ── Derive available year options from actual submission data ──
  const yearOptions = React.useMemo(() => {
    const years = new Set()
    submissions.forEach(s => {
      if (s.submissionPeriod?.year) years.add(s.submissionPeriod.year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [submissions])

  // ── Apply quarter / year filter to the submissions map ──
  const filteredSubmissionsByUser = React.useMemo(() => {
    if (quarterFilter === 'all' && yearFilter === 'all') return submissionsByUser
    const result = {}
    Object.entries(submissionsByUser).forEach(([uid, subs]) => {
      result[uid] = subs.filter(s => {
        const matchQ = quarterFilter === 'all' || String(s.submissionPeriod?.quarter) === quarterFilter
        const matchY = yearFilter === 'all' || String(s.submissionPeriod?.year) === yearFilter
        return matchQ && matchY
      })
    })
    return result
  }, [submissionsByUser, quarterFilter, yearFilter])

  // ── Group members by country ──
  const countryGroups = React.useMemo(() => {
    const groups = {}
    members.forEach(member => {
      const key = member.abroadCountry ? String(member.abroadCountry._id) : 'unassigned'
      const title = member.abroadCountry?.title || 'Unassigned Country'
      if (!groups[key]) groups[key] = { key, title, countryId: member.abroadCountry?._id || null, members: [] }
      groups[key].members.push(member)
    })
    return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title))
  }, [members])

  // ── Apply all filters ──
  const filteredGroups = React.useMemo(() => {
    return countryGroups
      .filter(g => selectedCountry === 'all' || g.key === selectedCountry)
      .map(g => ({
        ...g,
        members: g.members.filter(member => {
          const term = searchTerm.toLowerCase()
          const nameMatch = !term || (member.name || '').toLowerCase().includes(term) || (member.ruknId || '').toLowerCase().includes(term)
          if (!nameMatch) return false

          // Status filter uses the quarter/year-filtered submissions
          if (statusFilter !== 'all') {
            const memberSubs = filteredSubmissionsByUser[String(member._id)] || []
            return memberSubs.some(s => s.status === statusFilter)
          }
          return true
        })
      }))
      .filter(g => g.members.length > 0)
  }, [countryGroups, selectedCountry, searchTerm, statusFilter, filteredSubmissionsByUser])

  const toggleCountry = (key) => setExpandedCountries(prev => ({ ...prev, [key]: !prev[key] }))

  const activeFilterCount = [selectedCountry, selectedArea, selectedUnit, statusFilter, quarterFilter, yearFilter].filter(v => v !== 'all').length
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCountry('all')
    setSelectedArea('all')
    setSelectedUnit('all')
    setStatusFilter('all')
    setQuarterFilter('all')
    setYearFilter('all')
  }

  // ── Totals (reflect current quarter/year filter) ──
  const totalMembers = members.length
  const totalSubs = React.useMemo(
    () => Object.values(filteredSubmissionsByUser).reduce((acc, s) => acc + s.length, 0),
    [filteredSubmissionsByUser]
  )
  const countryOptions = countryGroups.map(g => ({ value: g.key, label: `${g.title} (${g.members.length})` }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="hidden lg:block">
          <h2 className="text-xl font-bold text-gray-900">Abroad Members</h2>
          <p className="text-sm text-gray-500 mt-1">Members marked as abroad — grouped by country</p>
        </div>
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:gap-2 sm:px-0 [scrollbar-width:none]">
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
            {countryGroups.length} {countryGroups.length === 1 ? 'country' : 'countries'}
          </span>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UsersIcon className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
            {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
          </span>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm bg-gray-50 text-gray-700 border border-gray-200">
            <FileText className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
            {totalSubs} submissions
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="ih-surface p-2.5 sm:p-3">
        {/* Search + filter toggle share one row */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="ih-filter-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or RUKN ID..."
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
        </div>

        {/* Filter controls — collapsed on mobile until toggled, always shown from sm: */}
        <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-2 grid-cols-2 gap-2 sm:!grid sm:grid-cols-3 lg:grid-cols-6`}>
          <div className="relative">
            <Globe className="ih-filter-icon" />
            <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
              <option value="all">All Countries</option>
              {countryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {selectedCountry !== 'all' && (
            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Areas</option>
                {areaOptions.map(a => <option key={a._id} value={a._id}>{a.title}</option>)}
              </select>
            </div>
          )}

          {selectedArea !== 'all' && (
            <div className="relative">
              <MapPin className="ih-filter-icon" />
              <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
                <option value="all">All Units</option>
                {unitOptions.map(u => <option key={u._id} value={u._id}>{u.title}</option>)}
              </select>
            </div>
          )}

          <div className="relative">
            <Calendar className="ih-filter-icon" />
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
              <option value="all">All Years</option>
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="ih-filter-icon" />
            <select value={quarterFilter} onChange={e => setQuarterFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
              <option value="all">All Quarters</option>
              <option value="1">Q1 (Jan–Mar)</option>
              <option value="2">Q2 (Apr–Jun)</option>
              <option value="3">Q3 (Jul–Sep)</option>
              <option value="4">Q4 (Oct–Dec)</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="ih-filter-icon" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ih-filter-select truncate text-[13px] sm:text-sm">
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="col-span-2 inline-flex items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800 sm:col-span-1"
              style={{ backgroundColor: 'rgba(16,24,40,0.04)' }}
            >
              <CloseIcon className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Active period badge */}
        {(quarterFilter !== 'all' || yearFilter !== 'all') && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Showing submissions for:</span>
            {yearFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {yearFilter}
              </span>
            )}
            {quarterFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Q{quarterFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading abroad members...</span>
          </div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            {members.length === 0 ? 'No abroad members found' : 'No members match your filters'}
          </p>
          {members.length === 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Mark members as abroad from User Management → click a user → Abroad Status
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const isExpanded = expandedCountries[group.key]
            const groupSubCount = group.members.reduce((acc, m) => acc + (filteredSubmissionsByUser[String(m._id)]?.length || 0), 0)

            return (
              <div key={group.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Country header */}
                <button
                  onClick={() => toggleCountry(group.key)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors border-b border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 text-base">{group.title}</h3>
                      <p className="text-sm text-gray-500">
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                        {groupSubCount > 0 && ` · ${groupSubCount} submission${groupSubCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                </button>

                {/* Members list */}
                {isExpanded && (
                  <div className="divide-y divide-gray-50">
                    {group.members.map(member => {
                      const memberSubs = filteredSubmissionsByUser[String(member._id)] || []
                      return (
                        <MemberRow
                          key={member._id}
                          member={member}
                          submissions={memberSubs}
                          onOpenMemberDetails={(selectedMember, selectedSubs) => {
                            setDrawerMember({ memberId: selectedMember._id, submissions: selectedSubs })
                          }}
                          onViewSubmission={setDrawerSubmissionId}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submission Drawer */}
      {drawerSubmissionId && (
        <SubmissionDrawer
          submissionId={drawerSubmissionId}
          onClose={() => setDrawerSubmissionId(null)}
          onRefresh={fetchData}
        />
      )}

      {/* Member Drawer */}
      {drawerMember?.memberId && (
        <MemberDetailDrawer
          memberId={drawerMember.memberId}
          submissions={drawerMember.submissions}
          onClose={() => setDrawerMember(null)}
          onViewSubmission={(submissionId) => {
            setDrawerMember(null)
            setDrawerSubmissionId(submissionId)
          }}
        />
      )}
    </div>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────
const MemberRow = ({ member, submissions, onViewSubmission, onOpenMemberDetails }) => {
  const [expanded, setExpanded] = useState(false)

  const latestSub = submissions.length > 0
    ? submissions.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Member header row */}
      <div
        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => onOpenMemberDetails(member, submissions)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
            {(member.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{member.name || '—'}</div>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              {member.ruknId && (
                <span className="text-xs text-gray-500 font-mono shrink-0">{member.ruknId}</span>
              )}
              {member.unit && (
                <span className="text-xs text-gray-400 truncate">· {member.unit}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {submissions.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              No submissions
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </span>
          )}

          {latestSub && (
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(latestSub.status)}`}>
              {statusIcon(latestSub.status)}
              {latestSub.status}
            </span>
          )}

          {submissions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(prev => !prev)
              }}
              className="p-2.5 -m-1 rounded hover:bg-gray-100 shrink-0"
              aria-label={expanded ? 'Collapse submissions' : 'Expand submissions'}
            >
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Submissions sub-list */}
      {expanded && submissions.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100">
          {submissions.map(sub => (
            <div
              key={sub._id}
              onClick={() => onViewSubmission(sub._id)}
              className="flex items-center justify-between px-8 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {sub.submissionPeriod
                      ? `Q${sub.submissionPeriod.quarter} ${sub.submissionPeriod.year}`
                      : 'Submission'}
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(sub.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {sub.adminReply?.message && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <MessageSquare className="w-3 h-3" /> Replied
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(sub.status)}`}>
                  {statusIcon(sub.status)}
                  {sub.status}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onViewSubmission(sub._id) }}
                  className="text-xs font-medium text-primary border border-primary/30 px-2.5 py-1 rounded-lg hover:bg-primary/5"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AbroadSubmissions
