import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../utils/ihthisabi/api'
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Phone,
  Loader2,
  Eye,
  X as CloseIcon
} from 'lucide-react'
import SubmissionReportView from '../../components/ihthisabi/SubmissionReportView'
import Pagination from '../../components/ihthisabi/Pagination'
import { getQuarterName, getAvailableQuarters } from '../../utils/ihthisabi/quarterHelper'

const STATUS_COLORS = {
  submitted: 'bg-green-100 text-green-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  alternative: 'bg-amber-100 text-amber-800'
}

const SECTIONS = [
  { key: 'all', label: 'All Members', icon: Users },
  { key: 'submitted', label: 'Submitted', icon: CheckCircle2 },
  { key: 'pending', label: 'Pending', icon: Clock }
]

const DistrictAreaDetails = () => {
  const { area } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [initialLoading, setInitialLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [data, setData] = useState(null)
  const [section, setSection] = useState('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Submission report modal
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [formSchema, setFormSchema] = useState(null)

  const quarter = searchParams.get('quarter')
  const year = searchParams.get('year')

  // Debounce the search box, resetting to page 1 once the debounced value lands
  // (bundled into one state update so it doesn't trigger an extra fetch)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, quarter, year, section, page, debouncedSearch])

  const fetchDetails = async () => {
    try {
      setListLoading(true)
      const response = await api.get(`/districtadmin/areas/${encodeURIComponent(area)}/details`, {
        params: {
          quarter: quarter || undefined,
          year: year || undefined,
          section,
          page,
          limit: 10,
          search: debouncedSearch || undefined
        }
      })
      if (response.data?.success) setData(response.data.data)
    } catch (error) {
      console.error('Error fetching area details:', error)
    } finally {
      setInitialLoading(false)
      setListLoading(false)
    }
  }

  const changePeriod = (nextQuarter, nextYear) => {
    setSearchParams({ quarter: String(nextQuarter), year: String(nextYear) })
    setPage(1)
  }

  const changeSection = (key) => {
    setSection(key)
    setPage(1)
  }

  const openSubmission = async (member) => {
    if (member.submission?.type === 'alternative') return
    setSubmissionLoading(true)
    setSelectedSubmission({})
    setFormSchema(null)
    try {
      const response = await api.get(`/districtadmin/submissions/${member.submission.submissionId}`)
      if (response.data?.success) {
        const sub = response.data.data.submission
        setSelectedSubmission(sub)
        if (sub?.dynamicFormId && sub?.submissionPeriod?.quarter && sub?.submissionPeriod?.year) {
          try {
            const formRes = await api.get(
              `/ihthisabi/application-forms/public/by-quarter/${sub.submissionPeriod.quarter}/${sub.submissionPeriod.year}`
            )
            if (formRes.data?.hasDynamicForm && formRes.data?.data) setFormSchema(formRes.data.data)
          } catch {
            // fallback rendering without schema
          }
        }
      }
    } catch (error) {
      console.error('Error fetching submission:', error)
      setSelectedSubmission(null)
    } finally {
      setSubmissionLoading(false)
    }
  }

  const period = data?.period
  const sectionCounts = {
    all: data?.totalMembers || 0,
    submitted: data?.submittedCount || 0,
    pending: data?.pendingCount || 0
  }
  const items = data?.items || []

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-start gap-2 mb-3 sm:mb-4">
        <button
          onClick={() => navigate('/ihthisabi/districtadmin')}
          className="mt-0.5 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="ih-page-title truncate">{area}</h1>
          <p className="ih-page-subtitle flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0 text-[#7B4FF2]" />
            <span className="truncate">
              {data?.district || '…'}{period ? ` · ${getQuarterName(period.quarter)} ${period.year}` : ''}
            </span>
          </p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-3">
        <select
          value={period?.quarter || ''}
          onChange={(e) => changePeriod(Number(e.target.value), period?.year)}
          disabled={initialLoading}
          className="flex-1 sm:flex-none px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
        >
          {getAvailableQuarters().map((q) => (
            <option key={q} value={q}>{getQuarterName(q)}</option>
          ))}
        </select>
        <select
          value={period?.year || ''}
          onChange={(e) => changePeriod(period?.quarter, Number(e.target.value))}
          disabled={initialLoading}
          className="flex-1 sm:flex-none px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
        >
          {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mr-2" /> Loading area details…
        </div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-16">Unable to load area details</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            {[
              { label: 'Members', value: data.totalMembers, icon: Users, color: 'text-[#7B4FF2]', bg: 'bg-[#7B4FF2]/10' },
              { label: 'Submitted', value: data.submittedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending', value: data.pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
            ].map((card) => (
              <div key={card.label} className="ih-stat-card min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ih-stat-label truncate">{card.label}</p>
                    <p className="ih-stat-value mt-1">{card.value}</p>
                  </div>
                  <div className={`ih-stat-icon ${card.bg}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section tabs */}
          <div className="ih-segment mb-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  onClick={() => changeSection(s.key)}
                  className={`ih-segment-btn ${section === s.key ? 'bg-[#7B4FF2] text-white shadow-sm' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{s.label}</span>
                  <span className={`text-[10px] font-semibold ${section === s.key ? 'text-white/80' : 'text-gray-400'}`}>{sectionCounts[s.key]}</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, RUKN ID, unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2]"
            />
          </div>

          {/* Member list */}
          <div className="ih-surface overflow-hidden relative">
            {listLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin" />
              </div>
            )}
            {items.length === 0 ? (
              <p className="text-center text-gray-400 py-10">
                {debouncedSearch ? 'No members match your search' : 'No members in this section'}
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((member) => {
                  const submission = member.submission
                  return (
                    <div key={member._id} className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          {section === 'all' && (
                            submission ? (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_COLORS[submission.status] || 'bg-gray-100 text-gray-800'}`}>
                                {submission.type === 'alternative' ? 'alternative' : submission.status}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-gray-100 text-gray-500">pending</span>
                            )
                          )}
                          {section === 'submitted' && submission && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_COLORS[submission.status] || 'bg-gray-100 text-gray-800'}`}>
                              {submission.type === 'alternative' ? 'alternative' : submission.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          <span className="font-mono">{member.ruknId}</span> · {member.unit}
                        </p>
                        {section === 'pending' && member.contactNo && (
                          <a href={`tel:${member.contactNo}`} className="inline-flex items-center gap-1 text-[11px] text-[#7B4FF2] mt-0.5">
                            <Phone className="w-3 h-3" /> {member.contactNo}
                          </a>
                        )}
                      </div>
                      {submission && submission.type === 'regular' && (
                        <button
                          onClick={() => openSubmission(member)}
                          className="text-[#7B4FF2] hover:underline inline-flex items-center gap-1 text-xs font-medium shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" /> Report
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <Pagination
              pagination={data?.pagination}
              onPageChange={setPage}
              loading={listLoading}
              itemLabel="members"
            />
          </div>
        </>
      )}

      {/* Submission Report Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Submission Report</h3>
              <button
                onClick={() => { setSelectedSubmission(null); setFormSchema(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {submissionLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin mr-2" /> Loading…
                </div>
              ) : selectedSubmission?._id ? (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900">{selectedSubmission.ruknName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedSubmission.status] || 'bg-gray-100 text-gray-800'}`}>
                      {selectedSubmission.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 pb-3 border-b border-gray-100">
                    {selectedSubmission.unit} · {selectedSubmission.periodDisplay}
                  </p>
                  <SubmissionReportView submission={selectedSubmission} formSchema={formSchema} />
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">Unable to load submission</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DistrictAreaDetails
