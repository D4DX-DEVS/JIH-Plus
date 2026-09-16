import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import { AlertCircle, Users, RefreshCcw, Trophy, X, FileText, SlidersHorizontal, ChevronDown, MapPin } from 'lucide-react'
import { getAvailableQuarters, getQuarterName } from '../../utils/ihthisabi/quarterHelper'

// Consolidation: pick a year + quarter, the published dynamic form for that
// period is loaded, and every question is summarized (option counts for
// radio/dropdown/checkbox/star, sums for number fields, a totals table for
// grouped/tabular fields) with district/area/unit filters (default: all).
const Consolidation = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Step 1 — period selection. Starts on the quarter currently open for
  // submission (the previous calendar quarter) so the page shows numbers on
  // first paint instead of an empty prompt.
  const _currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
  const _defaultQuarter = _currentQuarter === 1 ? 4 : _currentQuarter - 1
  const _defaultYear = _currentQuarter === 1 ? new Date().getFullYear() - 1 : new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(String(_defaultYear))
  const [selectedQuarter, setSelectedQuarter] = useState(
    String(getAvailableQuarters().includes(_defaultQuarter) ? _defaultQuarter : 2)
  )
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Step 2 — location filters (default all)
  const [district, setDistrict] = useState('all')
  const [area, setArea] = useState('all')
  const [unit, setUnit] = useState('all')
  const [districts, setDistricts] = useState([])
  const [areas, setAreas] = useState([])
  const [units, setUnits] = useState([])

  // Result
  const [data, setData] = useState(null)
  const [formMissing, setFormMissing] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)

  // "Who reported the highest?" modal (number questions)
  const [topView, setTopView] = useState(null) // the question being inspected
  const [topRows, setTopRows] = useState([])
  const [topLoading, setTopLoading] = useState(false)
  const [topError, setTopError] = useState(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => currentYear - i)
  const quarters = getAvailableQuarters()
  const isAdmin = user?.role === 'admin'
  const activeFilterCount = [district, area, unit].filter(v => v !== 'all').length

  // Filter dropdown options come from the master-data endpoints (cascading)
  useEffect(() => {
    if (!isAdmin) return
    api.get('/ihthisabi/admin/master-data/districts')
      .then(res => setDistricts((res.data.data || []).map(d => d.name).sort()))
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (district === 'all') {
      setAreas([])
      setArea('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/areas', { params: { district } })
      .then(res => setAreas((res.data.data || []).map(a => a.name).sort()))
      .catch(() => {})
  }, [district])

  useEffect(() => {
    if (district === 'all' || area === 'all') {
      setUnits([])
      setUnit('all')
      return
    }
    api.get('/ihthisabi/admin/master-data/units', { params: { district, area } })
      .then(res => setUnits((res.data.data || []).map(u => u.name).sort()))
      .catch(() => {})
  }, [district, area])

  // Fetch consolidation whenever period or a location filter changes.
  // The endpoint returns the published form itself, so a 404 means no
  // dynamic form is published for the chosen quarter.
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    const fetchConsolidation = async () => {
      setFetching(true)
      setError(null)
      setFormMissing(false)
      try {
        const params = { quarter: selectedQuarter, year: selectedYear }
        if (district !== 'all') params.district = district
        if (area !== 'all') params.area = area
        if (unit !== 'all') params.unit = unit

        const res = await api.get('/ihthisabi/admin/consolidation/dynamic', { params })
        if (cancelled) return
        setData(res.data.data)
      } catch (err) {
        if (cancelled) return
        setData(null)
        if (err.response?.status === 404) {
          setFormMissing(true)
        } else {
          setError(err.response?.data?.message || 'Failed to load consolidation data')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    fetchConsolidation()
    return () => { cancelled = true }
  }, [isAdmin, selectedYear, selectedQuarter, district, area, unit])

  const form = data?.form || null
  const breakdowns = data?.breakdowns || {}
  const totalSubmissions = data?.total || 0

  const sortedQuestions = useMemo(
    () => (form?.questions ? [...form.questions].sort((a, b) => (a.order || 0) - (b.order || 0)) : []),
    [form]
  )

  const scopeLabel = district === 'all'
    ? 'All Districts'
    : [district, area !== 'all' ? area : null, unit !== 'all' ? unit : null].filter(Boolean).join(' › ')

  // Open the "top values" modal for a number question and load who reported them
  const openTopView = async (question) => {
    setTopView(question)
    setTopRows([])
    setTopError(null)
    setTopLoading(true)
    try {
      const params = { quarter: selectedQuarter, year: selectedYear, questionId: question.questionId, limit: 5 }
      if (district !== 'all') params.district = district
      if (area !== 'all') params.area = area
      if (unit !== 'all') params.unit = unit
      const res = await api.get('/ihthisabi/admin/consolidation/dynamic/top', { params })
      setTopRows(res.data.data.top || [])
    } catch (err) {
      setTopError(err.response?.data?.message || 'Failed to load top values')
    } finally {
      setTopLoading(false)
    }
  }

  const closeTopView = () => {
    setTopView(null)
    setTopRows([])
    setTopError(null)
  }

  if (authLoading) {
    return (
      <div className="ih-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          ലോഡ് ചെയ്യുന്നു…
        </div>
      </div>
    )
  }
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="ih-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-10 h-10 text-gray-300" />
        <div className="text-gray-600 text-sm">Access denied</div>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          Go Back
        </button>
      </div>
    )
  }

  const percentOf = (count) => (totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0)

  // Option-count breakdown for radio / dropdown / checkbox / star questions
  const renderChoiceBreakdown = (question) => {
    const counts = breakdowns[question.questionId] || {}
    let rows

    if (question.answerType === 'star') {
      const maxStars = question.max || 5
      rows = Array.from({ length: maxStars }, (_, i) => {
        const value = String(i + 1)
        return { key: value, label: `${value} ★`, count: counts[value] || 0 }
      }).reverse()
    } else {
      rows = (question.options || []).map(opt => ({
        key: opt.value,
        label: opt.label,
        labelMl: opt.labelMl,
        count: counts[opt.value] || 0
      }))
    }

    // Answers recorded in data that don't match a defined option
    const knownKeys = new Set(rows.map(r => r.key))
    Object.entries(counts).forEach(([key, count]) => {
      if (!knownKeys.has(key) && key !== 'notSet') {
        rows.push({ key, label: key, count })
      }
    })

    const notAnswered = question.answerType === 'checkbox' ? 0 : (counts.notSet || 0)

    return (
      <div className="space-y-2.5">
        {rows.map(row => {
          const pct = percentOf(row.count)
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0 text-sm text-gray-700">
                  <span className="font-medium">{row.label}</span>
                  {row.labelMl && row.labelMl !== row.label && (
                    <span className="text-gray-500"> · {row.labelMl}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-900">{row.count}</span>
                  <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#7B4FF2] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        {notAnswered > 0 && (
          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span>Not answered</span>
            <span>{notAnswered}</span>
          </div>
        )}
        {rows.length === 0 && (
          <div className="text-xs text-gray-500">ഡാറ്റ ഇല്ല</div>
        )}
      </div>
    )
  }

  // Sum / average tiles for standalone number questions
  const renderNumberBreakdown = (question) => {
    const stats = breakdowns[question.questionId] || {}
    const tiles = [
      { label: 'Total', value: stats.sum ?? 0 },
      { label: 'Average', value: stats.avg != null ? Math.round(stats.avg * 100) / 100 : 0 },
      { label: 'Lowest', value: stats.min ?? 0 }
    ]
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {tiles.map(tile => (
            <div key={tile.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[11px] text-gray-500 mb-1">{tile.label}</div>
              <div className="text-lg font-semibold text-gray-900">{tile.value}</div>
            </div>
          ))}
          {/* Highest is clickable: shows who reported the top values */}
          <button
            type="button"
            onClick={() => openTopView(question)}
            className="p-3 rounded-lg bg-[#7B4FF2]/5 border border-[#7B4FF2]/30 text-left hover:bg-[#7B4FF2]/10 hover:border-[#7B4FF2] transition-all duration-200 cursor-pointer group"
            title="See who reported the highest values"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-500">Highest</span>
              <Trophy className="w-3.5 h-3.5 text-[#7B4FF2] opacity-60 group-hover:opacity-100" />
            </div>
            <div className="text-lg font-semibold text-gray-900">{stats.max ?? 0}</div>
            <div className="text-[10px] text-[#7B4FF2] mt-0.5">Tap to see who ›</div>
          </button>
        </div>
        {(stats.invalid || 0) > 0 && (
          <p className="mt-2 text-[11px] text-amber-600">
            {stats.invalid} invalid {stats.invalid === 1 ? 'answer' : 'answers'} (out-of-range values) ignored.
          </p>
        )}
      </div>
    )
  }

  // Single totals table for grouped/tabular (row-column) questions
  const renderGroupBreakdown = (question) => {
    const sums = breakdowns[question.questionId] || {}
    const numericFields = (question.subFields || []).filter(sf => sf.type !== 'text')

    if (numericFields.length === 0) {
      return <div className="text-xs text-gray-500">This table has no countable fields.</div>
    }

    const invalidTotal = numericFields.reduce((s, sf) => s + (sums[`${sf.fieldId}_invalid`] || 0), 0)

    return (
      <div>
        {/* Mobile: roomy rows — one full-width row per field */}
        <div className="lg:hidden divide-y divide-gray-100">
          {numericFields.map(sf => (
            <div key={sf.fieldId} className="min-h-[44px] flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 text-[13px] text-gray-700">
                <span className="font-medium">{sf.label}</span>
                {sf.labelMl && sf.labelMl !== sf.label && (
                  <span className="text-gray-500"> · {sf.labelMl}</span>
                )}
              </div>
              <span className="shrink-0 font-bold text-gray-900">{sums[`${sf.fieldId}_sum`] ?? 0}</span>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <ResponsiveTable className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Field</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {numericFields.map(sf => (
                <tr key={sf.fieldId} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 pr-4 text-gray-700">
                    <span className="font-medium">{sf.label}</span>
                    {sf.labelMl && sf.labelMl !== sf.label && (
                      <span className="text-gray-500"> · {sf.labelMl}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-bold text-gray-900">
                    {sums[`${sf.fieldId}_sum`] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        </div>
        {invalidTotal > 0 && (
          <p className="mt-2 text-[11px] text-amber-600">
            {invalidTotal} invalid {invalidTotal === 1 ? 'entry' : 'entries'} (out-of-range values) ignored.
          </p>
        )}
      </div>
    )
  }

  const renderQuestionCard = (question) => {
    const isChoice = ['radio', 'dropdown', 'checkbox', 'star'].includes(question.answerType)
    const isNumber = question.answerType === 'number'
    const isGroup = question.answerType === 'group'
    const isText = question.answerType === 'text' || question.answerType === 'textarea'

    const typeBadge = {
      radio: 'Single choice',
      dropdown: 'Single choice',
      checkbox: 'Multiple choice',
      star: 'Rating',
      number: 'Number',
      group: 'Table totals',
      text: 'Text',
      textarea: 'Text'
    }[question.answerType] || question.answerType

    return (
      <div key={question.questionId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{question.questionText}</h3>
            {question.questionTextMl && question.questionTextMl !== question.questionText && (
              <p className="text-xs text-gray-500 mt-0.5">{question.questionTextMl}</p>
            )}
          </div>
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-[#7B4FF2]/10 text-[#7B4FF2] text-[10px] font-semibold uppercase tracking-wide">
            {typeBadge}
          </span>
        </div>

        {isChoice && renderChoiceBreakdown(question)}
        {isNumber && renderNumberBreakdown(question)}
        {isGroup && renderGroupBreakdown(question)}
        {isText && (
          <div className="text-xs text-gray-500">
            Written answers are not consolidated — read them in All Submissions.
          </div>
        )}
      </div>
    )
  }

  // Insert a section heading whenever the section changes (questions are in order)
  const questionBlocks = []
  let lastSection = null
  sortedQuestions.forEach(question => {
    const section = question.section || ''
    if (section && section !== lastSection) {
      questionBlocks.push(
        <div key={`section-${section}`} className="pt-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {section}
            {question.sectionMl && question.sectionMl !== section && (
              <span className="font-medium normal-case tracking-normal"> · {question.sectionMl}</span>
            )}
          </h2>
        </div>
      )
    }
    lastSection = section || lastSection
    questionBlocks.push(renderQuestionCard(question))
  })

  const selectClass = 'form-select min-h-[44px] w-full truncate text-[13px] sm:min-h-0 sm:text-sm'

  return (
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell">
        {/* Desktop-only heading — the app bar names the screen on phones. */}
        <div className="mb-4 hidden lg:block">
          <h1 className="ih-page-title">Consolidation</h1>
          <p className="ih-page-subtitle">Pick a quarter to see the combined results of every answer</p>
        </div>

        {/* Period + scope in one compact strip. Location filters are folded
            away on phones (toggle on the right) and always open from sm:. */}
        <div className="ih-surface mb-3 p-2.5 sm:mb-4 sm:p-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Year"
              className={`${selectClass} sm:w-32`}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              aria-label="Quarter"
              className={`${selectClass} sm:w-40`}
            >
              {quarters.map(q => (
                <option key={q} value={q}>{getQuarterName(q)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              aria-label="Filter by location"
              title="Filter by location"
              className={`inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:hidden ${
                activeFilterCount > 0 ? 'bg-primary/10 text-primary' : 'text-gray-500'
              }`}
              style={activeFilterCount > 0 ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-2 grid-cols-2 gap-2 sm:!grid sm:grid-cols-3 sm:gap-3`}>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" className={selectClass}>
              <option value="all">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="Area"
              className={selectClass}
              disabled={district === 'all'}
            >
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              aria-label="Unit"
              className={`${selectClass} col-span-2 sm:col-span-1`}
              disabled={district === 'all' || area === 'all'}
            >
              <option value="all">All Units</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setDistrict('all'); setArea('all'); setUnit('all') }}
                className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-800 sm:col-span-3 sm:min-h-0 sm:justify-start"
              >
                <X className="h-3.5 w-3.5" /> Clear location filters
              </button>
            )}
          </div>
        </div>

        {/* No published form for the chosen quarter */}
        {!fetching && formMissing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                No published form for {getQuarterName(Number(selectedQuarter))} {selectedYear}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Publish a dynamic form for this quarter in Form Management, then its submissions can be consolidated here.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {!fetching && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {fetching && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 flex items-center justify-center gap-2 text-sm text-gray-600">
            <RefreshCcw className="w-4 h-4 animate-spin" />
            ലോഡ് ചെയ്യുന്നു…
          </div>
        )}

        {/* Results */}
        {!fetching && !formMissing && !error && data && (
          <>
            {/* Summary card — the count is the headline. (No bg-white/… tints
                in here: the global surface rule turns those solid white.) */}
            <div className="mb-3 rounded-2xl bg-gradient-to-br from-[#1E1040] to-[#2D1B69] p-4 text-white sm:mb-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-purple-300">{form?.title}</p>
                  <p className="mt-0.5 text-lg font-bold leading-tight sm:text-xl">
                    {getQuarterName(Number(selectedQuarter))} {selectedYear}
                  </p>
                  <p className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-[#7B4FF2]/25 px-2 py-0.5 text-[11px] font-medium text-purple-100">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 break-words">{scopeLabel}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-extrabold leading-none sm:text-4xl">{totalSubmissions}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-purple-300">
                    <Users className="h-3 w-3" /> submissions
                  </p>
                </div>
              </div>
            </div>

            {totalSubmissions === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-8 sm:p-10 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No submissions found</p>
                <p className="text-xs text-gray-500 mt-1">No one in {scopeLabel} has submitted this quarter's form yet.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {questionBlocks}
              </div>
            )}
          </>
        )}
      </div>

      {/* Top-values modal: who reported the highest, with link to their full report */}
      {topView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeTopView} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
              <div className="flex items-start gap-2 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7B4FF2]/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#7B4FF2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">Highest reported values</h3>
                  <p className="text-xs text-gray-500 truncate">{topView.questionTextMl || topView.questionText}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{scopeLabel}</p>
                </div>
              </div>
              <button
                onClick={closeTopView}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {topLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-600">
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  ലോഡ് ചെയ്യുന്നു…
                </div>
              )}

              {!topLoading && topError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{topError}</div>
              )}

              {!topLoading && !topError && topRows.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">No valid answers found for this question.</div>
              )}

              {!topLoading && !topError && topRows.length > 0 && (
                <div className="space-y-2">
                  {topRows.map((row, index) => (
                    <div
                      key={row._id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        index === 0 ? 'border-[#7B4FF2]/40 bg-[#7B4FF2]/5' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-[#7B4FF2] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {row.ruknName || 'Unknown'}
                          {row.ruknId && <span className="font-normal text-gray-500"> · {row.ruknId}</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {[row.district, row.area, row.unit].filter(Boolean).join(' › ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-lg font-bold text-gray-900">{row.value}</div>
                      <button
                        onClick={() => navigate(`/ihthisabi/submissions/${row._id}`)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7B4FF2] text-white text-xs font-semibold hover:bg-[#6a3dd9] transition-colors"
                        title="View this rukn's complete submitted report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Consolidation
