import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import { Download, Filter, MapPin, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import NotoSansMalayalam from '../../assets/fonts/NotoSansMalayalam-Regular.ttf'

const Consolidation = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allSubmissions, setAllSubmissions] = useState([])
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [result, setResult] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [fontReady, setFontReady] = useState(false)

  // Load Malayalam font once and register with react-pdf
  useEffect(() => {
    let mounted = true
    const loadFont = async () => {
      try {
        const res = await fetch(NotoSansMalayalam)
        const buf = await res.arrayBuffer()
        // Convert to base64 data URL because react-pdf expects a string source
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buf))
        )
        const dataUrl = `data:font/ttf;base64,${base64}`
        Font.register({
          family: 'NotoSansMalayalam',
          src: dataUrl,
          format: 'truetype'
        })
        if (mounted) setFontReady(true)
      } catch (err) {
        console.error('Failed to load Malayalam font', err)
        if (mounted) toast.error('Failed to load Malayalam font for PDF')
      }
    }
    loadFont()
    return () => { mounted = false }
  }, [])

  // Location filters
  const [district, setDistrict] = useState('all')
  const [area, setArea] = useState('all')
  const [unit, setUnit] = useState('all')
  
  // Quarter/Year filters for dynamic form support
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [dynamicFormForQuarter, setDynamicFormForQuarter] = useState(null)
  const [dynamicResult, setDynamicResult] = useState(null)

  // Field selection and value
  const [selectedField, setSelectedField] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [fieldValueMin, setFieldValueMin] = useState('')
  const [fieldValueMax, setFieldValueMax] = useState('')

  // Translation helper function
  const translateValue = (val) => {
    const translations = {
      'complete': 'പൂർണം',
      'partial': 'ഭാഗികം',
      'notread': 'വായിച്ചില്ല',
      'incomplete': 'അപൂർണം',
      'yes': 'അതെ',
      'no': 'ഇല്ല',
      'satisfactory': 'തൃപ്തികരം',
      'unsatisfactory': 'തൃപ്തികരമല്ല',
      'notApplicable': 'ബാധകമല്ല',
      'almost': 'ഏറെക്കുറെ',
      'small': 'ചെറിയ തോതിൽ',
      'none': '-',
      'fullAttended': 'പൂർണമായി ഹാജരായി',
      'others': 'മറ്റുള്ളവർ',
      '3': '3 യോഗങ്ങൾ',
      '2': '2 യോഗങ്ങൾ',
      '1': '1 യോഗം',
      '0': '0 യോഗങ്ങൾ',
      // notSet appears when a field was absent in older submissions (no value recorded)
      'notSet': 'രേഖപ്പെടുത്തിയില്ല'
    };
    return translations[val] || val;
  };

  // Available filterable fields with their configurations (in Malayalam)
  const filterableFields = [
    {
      id: 'quranStatus',
      label: 'ഖുർആൻ പഠനം',
      type: 'select',
      options: [
        { value: 'complete', label: 'പൂർണം' },
        { value: 'partial', label: 'ഭാഗികം' },
        { value: 'none', label: '-' }
      ]
    },
    {
      id: 'islami',
      label: 'പുസ്തക വായന - മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും',
      type: 'select',
      options: [
        { value: 'complete', label: 'പൂർണം' },
        { value: 'partial', label: 'ഭാഗികം' },
        { value: 'notread', label: 'വായിച്ചില്ല' }
      ]
    },
    {
      id: 'atma',
      label: 'പുസ്തക വായന - മദീനയിലെ ഏടുകളിൽ നിന്ന്',
      type: 'select',
      options: [
        { value: 'complete', label: 'പൂർണം' },
        { value: 'partial', label: 'ഭാഗികം' },
        { value: 'notread', label: 'വായിച്ചില്ല' }
      ]
    },
    {
      id: 'baithulmaal',
      label: 'ബൈതുല്മാല് (2%)',
      type: 'select',
      options: [
        { value: 'complete', label: 'പൂർണം' },
        { value: 'partial', label: 'ഭാഗികം' },
        { value: 'incomplete', label: 'അപൂർണം' }
      ]
    },
    {
      id: 'zakatPaid',
      label: 'സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?',
      type: 'select',
      options: [
        { value: 'yes', label: 'അതെ' },
        { value: 'no', label: 'ഇല്ല' },
        { value: 'notApplicable', label: 'ബാധകമല്ല' }
      ]
    },
    {
      id: 'recruitEffort',
      label: 'മൂന്ന് പേരെ ചേർക്കാനുള്ള ശ്രമം',
      type: 'select',
      options: [
        { value: 'satisfactory', label: 'തൃപ്തികരം' },
        { value: 'unsatisfactory', label: 'തൃപ്തികരമല്ല' }
      ]
    },
    {
      id: 'meqathService',
      label: 'മീഖാത്തീ സേവന പ്രവർത്തനം',
      type: 'select',
      options: [
        { value: 'yes', label: 'അതെ' },
        { value: 'no', label: 'ഇല്ല' }
      ]
    },
    {
      id: 'skillUsage',
      label: 'വ്യക്തിഗത കഴിവുകൾ ഉപയോഗിച്ചോ?',
      type: 'select',
      options: [
        { value: 'yes', label: 'അതെ' },
        { value: 'no', label: 'ഇല്ല' }
      ]
    },
    {
      id: 'jamaathAgenda',
      label: 'ജമാഅത്തെ അജണ്ട നടപ്പാക്കുന്നുണ്ടോ?',
      type: 'select',
      options: [
        { value: 'yes', label: 'അതെ' },
        { value: 'no', label: 'ഇല്ല' },
        { value: 'almost', label: 'ഏറെക്കുറെ' }
      ]
    },
    {
      id: 'jamaathInfluence',
      label: 'ജമാഅത്തെ യോഗം സ്വാധീനം ചെലുത്തുന്നുണ്ടോ?',
      type: 'select',
      options: [
        { value: 'yes', label: 'അതെ' },
        { value: 'no', label: 'ഇല്ല' },
        { value: 'small', label: 'ചെറിയ തോതിൽ' }
      ]
    },
    {
      id: 'hadithCount',
      label: 'ഹദീസ് പഠനം',
      type: 'range'
    },
    {
      id: 'newMembers',
      label: 'പുതിയ വ്യക്തികൾ',
      type: 'range'
    },
    {
      id: 'muslimRelations',
      label: 'മുസ്ലിം വ്യക്തിബന്ധങ്ങൾ',
      type: 'range'
    },
    {
      id: 'communityRelations',
      label: 'സഹോദര സമുദായങ്ങളുമായുള്ള ബന്ധം',
      type: 'range'
    },
    {
      id: 'scoreCount',
      label: 'സ്‌ക്വാഡുകൾ ',
      type: 'range'
    },
    {
      id: 'weeklyMeeting',
      label: 'പ്രതിവാര യോഗം',
      type: 'select',
      options: [
        { value: 'fullAttended', label: 'പൂർണമായി ഹാജരായി' },
        { value: 'others', label: 'മറ്റുള്ളവർ' }
      ]
    },
    {
      id: 'jamaathMeeting',
      label: 'ജമാഅത്തെ യോഗം',
      type: 'select',
      options: [
        { value: 'fullAttended', label: 'പൂർണമായി ഹാജരായി' },
        { value: 'others', label: 'മറ്റുള്ളവർ' }
      ]
    },
    {
      id: 'grihameetings',
      label: 'ഗൃഹ യോഗങ്ങൾ',
      type: 'select',
      options: [
        { value: '3', label: '3 യോഗങ്ങൾ' },
        { value: '2', label: '2 യോഗങ്ങൾ' },
        { value: '1', label: '1 യോഗം' },
        { value: '0', label: '0 യോഗങ്ങൾ' }
      ]
    },
    {
      id: 'thahreekiMeetings',
      label: 'തഹ്രീക്കി യോഗങ്ങൾ',
      type: 'select',
      options: [
        { value: '3', label: '3 യോഗങ്ങൾ' },
        { value: '2', label: '2 യോഗങ്ങൾ' },
        { value: '1', label: '1 യോഗം' },
        { value: '0', label: '0 യോഗങ്ങൾ' }
      ]
    }
  ]

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true)
      setAllSubmissions([])
      
      // First, get page 1 to know total pages
      const firstPageResponse = await api.get('/ihthisabi/admin/submissions', {
        params: {
          page: 1,
          limit: 150
        }
      })

      const firstPageData = firstPageResponse.data.data
      const pagination = firstPageData.pagination || {}
      const totalPages = pagination.pages || 1
      const totalCount = pagination.total || 0
      
      setTotalSubmissions(totalCount)

      // If only one page, we're done
      if (totalPages === 1) {
        setAllSubmissions(firstPageData.submissions || [])
        setLoading(false)
        return
      }

      // Load all remaining pages in parallel
      const pagePromises = []
      for (let page = 2; page <= totalPages; page++) {
        pagePromises.push(
          api.get('/ihthisabi/admin/submissions', {
            params: {
              page: page,
              limit: 150
            }
          })
        )
      }

      // Execute all page requests in parallel
      const responses = await Promise.all(pagePromises)
      
      // Combine all submissions
      let allSubs = [...(firstPageData.submissions || [])]
      responses.forEach(response => {
        allSubs = [...allSubs, ...(response.data.data.submissions || [])]
      })

      setAllSubmissions(allSubs)
      console.log(`Loaded all ${totalPages} pages, total submissions: ${allSubs.length}`)
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      toast.error('ഫിൽട്ടറുകൾക്കായി സമർപ്പണങ്ങൾ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchAllSubmissions()
  }, [user])

  const getNormalizedLocation = (s) => {
    const parts = typeof s.locationDisplay === 'string' ? s.locationDisplay.split('-').map(p => p.trim()) : []
    return {
      district: s.district || parts[0] || '',
      area: s.area || parts[1] || '',
      unit: s.unit || s.unitName || parts[parts.length - 1] || ''
    }
  }

  const districts = useMemo(() => {
    const set = new Set()
    allSubmissions.forEach(s => { const { district } = getNormalizedLocation(s); if (district) set.add(district) })
    return Array.from(set).sort()
  }, [allSubmissions])

  const areas = useMemo(() => {
    const set = new Set()
    allSubmissions.forEach(s => {
      const { district: d, area: a } = getNormalizedLocation(s)
      if ((district === 'all' || d === district) && a) set.add(a)
    })
    return Array.from(set).sort()
  }, [allSubmissions, district])

  const units = useMemo(() => {
    const set = new Set()
    allSubmissions.forEach(s => {
      const { district: d, area: a, unit: u } = getNormalizedLocation(s)
      const okD = district === 'all' || d === district
      const okA = area === 'all' || a === area
      if (okD && okA && u) set.add(u)
    })
    return Array.from(set).sort()
  }, [allSubmissions, district, area])

  // Get selected field configuration
  const selectedFieldConfig = useMemo(() => {
    return filterableFields.find(f => f.id === selectedField) || null
  }, [selectedField])

  // Reset field value when field changes
  useEffect(() => {
    setFieldValue('')
    setFieldValueMin('')
    setFieldValueMax('')
  }, [selectedField])

  // Check for dynamic form when quarter/year changes
  useEffect(() => {
    const checkDynamic = async () => {
      if (!selectedQuarter || !selectedYear) {
        setDynamicFormForQuarter(null)
        setDynamicResult(null)
        return
      }
      try {
        const res = await api.get(`/ihthisabi/application-forms/public/by-quarter/${selectedQuarter}/${selectedYear}`)
        if (res.data?.hasDynamicForm && res.data?.data) {
          setDynamicFormForQuarter(res.data.data)
        } else {
          setDynamicFormForQuarter(null)
        }
      } catch {
        setDynamicFormForQuarter(null)
      }
    }
    checkDynamic()
  }, [selectedQuarter, selectedYear])

  const resetFilters = () => {
    setDistrict('all')
    setArea('all')
    setUnit('all')
    setSelectedQuarter('')
    setSelectedYear('')
    setSelectedField('')
    setFieldValue('')
    setFieldValueMin('')
    setFieldValueMax('')
    setResult(null)
    setDynamicResult(null)
    setDynamicFormForQuarter(null)
  }

  const applyFilters = async () => {
    try {
      setFetching(true)
      setDynamicResult(null)

      // If dynamic form quarter is selected, use dynamic endpoint
      if (dynamicFormForQuarter && selectedQuarter && selectedYear) {
        const params = { quarter: selectedQuarter, year: selectedYear }
        if (district !== 'all') params.district = district
        if (area !== 'all') params.area = area
        if (unit !== 'all') params.unit = unit
        if (selectedField) {
          const dynQ = dynamicFormForQuarter.questions?.find(q => q.questionId === selectedField)
          if (dynQ?.answerType === 'number') {
            params.questionId = selectedField
            if (fieldValueMin) params.questionValueMin = fieldValueMin
            if (fieldValueMax) params.questionValueMax = fieldValueMax
          } else if (fieldValue) {
            params.questionId = selectedField
            params.questionValue = fieldValue
          }
        }
        const res = await api.get('/ihthisabi/admin/consolidation/dynamic', { params })
        setDynamicResult(res.data?.data || null)
        setResult(null)
        return
      }

      const params = {}
      if (district !== 'all') params.district = district
      if (area !== 'all') params.area = area
      if (unit !== 'all') params.unit = unit
      if (selectedQuarter) params.quarter = selectedQuarter
      if (selectedYear) params.year = selectedYear
      
      if (selectedField && selectedFieldConfig) {
        if (selectedFieldConfig.type === 'range') {
          if (fieldValueMin) {
            if (selectedField === 'hadithCount') params.hadithMin = fieldValueMin
            else if (selectedField === 'newMembers') params.newMembersMin = fieldValueMin
            else if (selectedField === 'muslimRelations') params.muslimRelationsMin = fieldValueMin
            else if (selectedField === 'communityRelations') params.communityRelationsMin = fieldValueMin
            else if (selectedField === 'scoreCount') params.scoreCountMin = fieldValueMin
          }
          if (fieldValueMax) {
            if (selectedField === 'hadithCount') params.hadithMax = fieldValueMax
            else if (selectedField === 'newMembers') params.newMembersMax = fieldValueMax
            else if (selectedField === 'muslimRelations') params.muslimRelationsMax = fieldValueMax
            else if (selectedField === 'communityRelations') params.communityRelationsMax = fieldValueMax
            else if (selectedField === 'scoreCount') params.scoreCountMax = fieldValueMax
          }
        } else {
          if (fieldValue && fieldValue !== '') {
            params[selectedField] = String(fieldValue)
          }
        }
      }

      const res = await api.get('/ihthisabi/admin/consolidation', { params })
      setResult(res.data?.data || { total: 0, breakdown: {}, sums: {} })
    } catch (e) {
      setResult({ total: 0, breakdown: {}, sums: {} })
    } finally {
      setFetching(false)
    }
  }

  const handleExportPdf = async () => {
    if (!result) {
      toast.error('Apply filters before exporting PDF')
      return
    }
    if (!fontReady) {
      toast.error('Font not loaded yet. Please try again.')
      return
    }

    setPdfGenerating(true)

    const formatPercent = () => {
      const total = totalSubmissions || allSubmissions.length || 0
      if (!total) return '0.0%'
      return `${((result.total / total) * 100).toFixed(1)}%`
    }

    const fieldLabel = selectedFieldConfig?.label || 'None'
    const fieldValueLabel = selectedFieldConfig?.type === 'range'
      ? `${fieldValueMin || '-'} to ${fieldValueMax || '-'}`
      : (selectedField ? translateValue(fieldValue) || fieldValue : 'N/A')

    const sectionStyles = StyleSheet.create({
      page: {
        fontFamily: 'NotoSansMalayalam',
        padding: 24,
        fontSize: 10,
        color: '#1f2937'
      },
      title: {
        fontSize: 18,
        marginBottom: 6,
        color: '#0f172a'
      },
      meta: {
        fontSize: 9,
        color: '#475569',
        marginBottom: 2
      },
      section: {
        marginTop: 12
      },
      sectionTitle: {
        fontSize: 12,
        marginBottom: 6,
        color: '#0f172a'
      },
      table: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden'
      },
      row: {
        flexDirection: 'row'
      },
      cell: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 9
      },
      headerCell: {
        backgroundColor: '#0b63c5',
        color: '#ffffff',
      },
      lastCell: {
        borderRightWidth: 0
      },
      noData: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 6
      }
    })

    const renderTable = (headers, rows) => (
      <View style={sectionStyles.table}>
        <View style={sectionStyles.row}>
          {headers.map((h, idx) => (
            <Text
              key={h}
              style={[
                sectionStyles.cell,
                sectionStyles.headerCell,
                idx === headers.length - 1 && sectionStyles.lastCell
              ]}
            >
              {h}
            </Text>
          ))}
        </View>
        {rows.map((r, idx) => (
          <View key={idx} style={sectionStyles.row}>
            {r.map((c, ci) => (
              <Text
                key={ci}
                style={[
                  sectionStyles.cell,
                  ci === r.length - 1 && sectionStyles.lastCell
                ]}
              >
                {c}
              </Text>
            ))}
          </View>
        ))}
      </View>
    )

    const breakdowns = [
      { title: 'Zakat Paid', map: result.breakdown?.zakatPaid },
      { title: 'Baithulmaal (2%)', map: result.breakdown?.baithulmaal },
      { title: 'Quran Study', map: result.breakdown?.quranStatus },
      { title: 'Book Reading - Islami', map: result.breakdown?.bookReading?.islami },
      { title: 'Book Reading - Atma', map: result.breakdown?.bookReading?.atma },
      { title: 'Recruit Effort', map: result.breakdown?.recruitEffort },
      { title: 'Meqath Service', map: result.breakdown?.meqathService },
      { title: 'Skill Usage', map: result.breakdown?.skillUsage },
      { title: 'Jamaath Agenda', map: result.breakdown?.jamaathAgenda },
      { title: 'Jamaath Influence', map: result.breakdown?.jamaathInfluence }
    ]

    const doc = (
      <Document>
        <Page size="A4" style={sectionStyles.page}>
          <Text style={sectionStyles.title}>Consolidation Report</Text>
          <Text style={sectionStyles.meta}>Generated: {new Date().toLocaleString('en-IN')}</Text>
          <Text style={sectionStyles.meta}>
            Filters — District: {district === 'all' ? 'All' : district} | Area: {area === 'all' ? 'All' : area} | Unit: {unit === 'all' ? 'All' : unit}
          </Text>
          <Text style={sectionStyles.meta}>Field Filter: {fieldLabel} | Value: {fieldValueLabel}</Text>

          <View style={sectionStyles.section}>
            <Text style={sectionStyles.sectionTitle}>Summary</Text>
            {renderTable(
              ['Metric', 'Value'],
              [
                ['Matches', result.total ?? 0],
                ['Total submissions', totalSubmissions || allSubmissions.length || 0],
                ['Percentage', formatPercent()]
              ]
            )}
          </View>

          <View style={sectionStyles.section}>
            <Text style={sectionStyles.sectionTitle}>Totals</Text>
            {renderTable(
              ['Totals', 'Value'],
              [
                ['Hadith Count (sum)', result.sums?.hadithCount ?? 0],
                ['New Members (sum)', result.sums?.newMembers ?? 0],
                ['Muslim Relations (sum)', result.sums?.muslimRelations ?? 0],
                ['Community Relations (sum)', result.sums?.communityRelations ?? 0],
                ['Score Count (sum)', result.sums?.scoreCount ?? 0],
                ['Weekly Attendance', result.sums?.weekly_hadir ?? 0],
                ['Weekly Leave', result.sums?.weekly_leave ?? 0],
                ['Weekly Absent', result.sums?.weekly_absent ?? 0],
                ['Jamaath Attendance', result.sums?.jamaath_hadir ?? 0],
                ['Jamaath Leave', result.sums?.jamaath_leave ?? 0],
                ['Jamaath Absent', result.sums?.jamaath_absent ?? 0]
              ]
            )}
          </View>

          {breakdowns.map(({ title, map }) => {
            const entries = Object.entries(map || {})
            if (!entries.length) return null
            return (
              <View key={title} style={sectionStyles.section}>
                <Text style={sectionStyles.sectionTitle}>{title}</Text>
                {renderTable(
                  [title, 'Count'],
                  entries.map(([k, v]) => [translateValue(k) || 'N/A', v ?? 0])
                )}
              </View>
            )
          })}

          {!breakdowns.some(({ map }) => map && Object.keys(map).length) && (
            <Text style={sectionStyles.noData}>No breakdown data for current filters.</Text>
          )}
        </Page>
      </Document>
    )

    try {
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `consolidation-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF exported successfully')
    } catch (err) {
      console.error('PDF export failed', err)
      toast.error('Failed to export PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-sm">ലോഡ് ചെയ്യുന്നു…</div>
      </div>
    )
  }
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Access denied</div>
      </div>
    )
  }

  const Stat = ({ label, value }) => (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value ?? 0}</div>
    </div>
  )

  const renderBreakdown = (title, map) => (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold text-gray-900 mb-2">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Object.entries(map || {}).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-2 py-1.5 text-xs bg-white border border-gray-200 rounded">
            <span className="text-gray-700 truncate mr-2">{translateValue(k) || 'N/A'}</span>
            <span className="font-semibold text-gray-900">{v}</span>
          </div>
        ))}
        {(!map || Object.keys(map).length === 0) && (
          <div className="text-xs text-gray-500">ഡാറ്റ ഇല്ല</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="ih-page-shell">
        <div className="mb-4">
          <div className="ih-page-header">
            <div>
              <h1 className="ih-page-title">Consolidation</h1>
              <p className="ih-page-subtitle">Filter and summarize submissions by each question</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          {/* Quarter/Year Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quarter</label>
              <select value={selectedQuarter} onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedField(''); setFieldValue('') }}
                className="form-select text-sm">
                <option value="">All Quarters</option>
                <option value="1">Q1 (Jan-Mar)</option>
                <option value="2">Q2 (Apr-Jun)</option>
                <option value="4">Q4 (Oct-Dec)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
              <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedField(''); setFieldValue('') }}
                className="form-select text-sm">
                <option value="">All Years</option>
                {[2026, 2025, 2024, 2023].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {dynamicFormForQuarter && (
              <div className="col-span-2 flex items-end">
                <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  Dynamic form: <strong>{dynamicFormForQuarter.title}</strong> ({dynamicFormForQuarter.questions?.length} questions)
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* District */}
            <div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={district} 
                  onChange={(e) => { 
                    setDistrict(e.target.value)
                    setArea('all')
                    setUnit('all')
                  }}
                  className="form-select pl-10"
                >
                  <option value="all">All Districts</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Area */}
            <div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={area} 
                  onChange={(e) => { 
                    setArea(e.target.value)
                    setUnit('all')
                  }}
                  className="form-select pl-10"
                >
                  <option value="all">All Areas</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Unit */}
            <div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={unit} 
                  onChange={(e) => setUnit(e.target.value)}
                  className="form-select pl-10"
                >
                  <option value="all">All Units</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* Field Selection */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  value={selectedField} 
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="form-select pl-10"
                >
                  <option value="">ഫിൽട്ടർ ഫീൽഡ് തിരഞ്ഞെടുക്കുക</option>
                  {dynamicFormForQuarter
                    ? dynamicFormForQuarter.questions
                        ?.filter(q => ['radio', 'dropdown', 'checkbox', 'star', 'number'].includes(q.answerType))
                        .map(q => (
                          <option key={q.questionId} value={q.questionId}>{q.questionTextMl || q.questionText}</option>
                        ))
                    : filterableFields.map(field => (
                        <option key={field.id} value={field.id}>{field.label}</option>
                      ))
                  }
                </select>
              </div>
            </div>

            {/* Field Value - Dynamic based on selected field */}
            <div>
              {dynamicFormForQuarter && selectedField ? (() => {
                const dynQ = dynamicFormForQuarter.questions?.find(q => q.questionId === selectedField)
                if (!dynQ) return <input type="text" placeholder="Select a field first" disabled className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                if (dynQ.answerType === 'number') {
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="കുറഞ്ഞത്"
                        value={fieldValueMin}
                        onChange={(e) => setFieldValueMin(e.target.value)}
                        className="form-input"
                      />
                      <input
                        type="number"
                        placeholder="കൂടുതൽ"
                        value={fieldValueMax}
                        onChange={(e) => setFieldValueMax(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  )
                }
                return (
                  <select value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className="form-select">
                    <option value="">മൂല്യം തിരഞ്ഞെടുക്കുക</option>
                    {dynQ.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.labelMl || opt.label}</option>
                    ))}
                  </select>
                )
              })() : !selectedField || !selectedFieldConfig ? (
                <input
                  type="text"
                  placeholder="ആദ്യം ഒരു ഫീൽഡ് തിരഞ്ഞെടുക്കുക"
                  disabled
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              ) : selectedFieldConfig.type === 'range' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="കുറഞ്ഞത്"
                    value={fieldValueMin}
                    onChange={(e) => setFieldValueMin(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="കൂടുതൽ"
                    value={fieldValueMax}
                    onChange={(e) => setFieldValueMax(e.target.value)}
                    className="form-input"
                  />
                </div>
              ) : (
                <select
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="form-select"
                >
                  <option value="">മൂല്യം തിരഞ്ഞെടുക്കുക</option>
                  {selectedFieldConfig.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button 
              onClick={applyFilters} 
              disabled={fetching}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetching ? 'പ്രയോഗിക്കുന്നു…' : 'ഫിൽട്ടറുകൾ പ്രയോഗിക്കുക'}
            </button>
            <button 
              onClick={resetFilters} 
              className="btn-ghost text-sm"
            >
              <RefreshCcw className="w-4 h-4 mr-1" /> പുനഃക്രമീകരിക്കുക
            </button>
            {/* PDF export temporarily hidden; functionality retained for later use */}
            {false && (
              <button
                onClick={handleExportPdf}
                disabled={fetching || !result || pdfGenerating || !fontReady}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {pdfGenerating ? 'Generating…' : 'Export PDF'}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Dynamic Form Results */}
          {dynamicResult ? (
            dynamicResult.total === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching submissions</h3>
                <p className="text-sm text-gray-600">No submissions found for this dynamic form quarter.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Dynamic Form Results: {dynamicResult.form?.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Matching Submissions</div>
                      <div className="text-2xl font-bold text-primary">{dynamicResult.total}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total for Quarter</div>
                      <div className="text-2xl font-bold text-gray-900">{dynamicResult.totalForQuarter}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Percentage</div>
                      <div className="text-2xl font-bold text-green-600">
                        {dynamicResult.totalForQuarter > 0
                          ? ((dynamicResult.total / dynamicResult.totalForQuarter) * 100).toFixed(1)
                          : '0.0'}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dynamicResult.form?.questions?.map(q => {
                    const breakdown = dynamicResult.breakdowns?.[q.questionId]
                    if (!breakdown) return null
                    const label = q.questionTextMl || q.questionText

                    if (['radio', 'dropdown', 'checkbox', 'star'].includes(q.answerType)) {
                      return renderBreakdown(label, breakdown)
                    }
                    if (q.answerType === 'number') {
                      return (
                        <div key={q.questionId} className="border border-gray-200 rounded-lg p-3">
                          <div className="text-sm font-semibold text-gray-900 mb-2">{label}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded flex justify-between">
                              <span className="text-gray-500">Sum</span>
                              <span className="font-semibold">{breakdown.sum ?? 0}</span>
                            </div>
                            <div className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded flex justify-between">
                              <span className="text-gray-500">Avg</span>
                              <span className="font-semibold">{(breakdown.avg ?? 0).toFixed(1)}</span>
                            </div>
                            <div className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded flex justify-between">
                              <span className="text-gray-500">Min</span>
                              <span className="font-semibold">{breakdown.min ?? 0}</span>
                            </div>
                            <div className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded flex justify-between">
                              <span className="text-gray-500">Max</span>
                              <span className="font-semibold">{breakdown.max ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    if (q.answerType === 'group') {
                      return (
                        <div key={q.questionId} className="border border-gray-200 rounded-lg p-3">
                          <div className="text-sm font-semibold text-gray-900 mb-2">{label}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(breakdown).map(([k, v]) => (
                              <div key={k} className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded flex justify-between">
                                <span className="text-gray-500 truncate mr-2">{k.replace('_sum', '')}</span>
                                <span className="font-semibold">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </>
            )
          ) : result ? (
            result.total === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">തിരഞ്ഞെടുത്ത ഓപ്ഷനുകൾക്ക് മൂല്യങ്ങൾ ഇല്ല</h3>
                <p className="text-sm text-gray-600">
                  നിങ്ങളുടെ ഫിൽട്ടർ മാനദണ്ഡങ്ങൾക്ക് പൊരുത്തപ്പെടുന്ന സമർപ്പണങ്ങൾ ഒന്നുമില്ല. ദയവായി ഫിൽട്ടറുകൾ മാറ്റി വീണ്ടും ശ്രമിക്കുക.
                </p>
              </div>
            ) : (
              <>
                {/* Filter Summary Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">ഫിൽട്ടർ സംഗ്രഹം</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">പൊരുത്തപ്പെട്ട സമർപ്പണങ്ങൾ</div>
                          <div className="text-2xl font-bold text-primary">{result.total}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">ആകെ സമർപ്പണങ്ങൾ</div>
                          <div className="text-2xl font-bold text-gray-900">{totalSubmissions || allSubmissions.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">ശതമാനം</div>
                          <div className="text-2xl font-bold text-green-600">
                            {totalSubmissions > 0 
                              ? ((result.total / totalSubmissions) * 100).toFixed(1)
                              : allSubmissions.length > 0
                              ? ((result.total / allSubmissions.length) * 100).toFixed(1)
                              : '0.0'
                            }%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Stat label="ഹദീസ് എണ്ണം (സം)" value={result.sums?.hadithCount} />
                  <Stat label="പുതിയ വ്യക്തികൾ (സം)" value={result.sums?.newMembers} />
                  <Stat label="മുസ്ലിം വ്യക്തിബന്ധങ്ങൾ (സം)" value={result.sums?.muslimRelations} />
                  <Stat label="സഹോദര സമുദായങ്ങളുമായുള്ള ബന്ധം (സം)" value={result.sums?.communityRelations} />
                  <Stat label="സ്‌ക്വാഡുകൾ  (സം)" value={result.sums?.scoreCount} />
                  <Stat label="പൊരുത്തപ്പെട്ടവ" value={result.total} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {renderBreakdown('സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?', result.breakdown?.zakatPaid)}
                  {renderBreakdown('ബൈതുല്മാല് (2%)', result.breakdown?.baithulmaal)}
                  {renderBreakdown('ഖുർആൻ പഠനം', result.breakdown?.quranStatus)}
                  {renderBreakdown('പുസ്തക വായന - മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും', result.breakdown?.bookReading?.islami)}
                  {renderBreakdown('പുസ്തക വായന - മദീനയിലെ ഏടുകളിൽ നിന്ന്', result.breakdown?.bookReading?.atma)}
                  {renderBreakdown('മൂന്ന് പേരെ ചേർക്കാനുള്ള ശ്രമം', result.breakdown?.recruitEffort)}
                  {renderBreakdown('മീഖാത്തീ സേവന പ്രവർത്തനം', result.breakdown?.meqathService)}
                  {renderBreakdown('വ്യക്തിഗത കഴിവുകൾ ഉപയോഗിച്ചോ?', result.breakdown?.skillUsage)}
                  {renderBreakdown('ജമാഅത്തെ അജണ്ട നടപ്പാക്കുന്നുണ്ടോ?', result.breakdown?.jamaathAgenda)}
                  {renderBreakdown('ജമാഅത്തെ യോഗം സ്വാധീനം ചെലുത്തുന്നുണ്ടോ?', result.breakdown?.jamaathInfluence)}
                  {renderBreakdown('പ്രതിവാര യോഗം', result.breakdown?.weeklyMeeting)}
                  {renderBreakdown('ജമാഅത്തെ യോഗം', result.breakdown?.jamaathMeeting)}
                  {renderBreakdown('ഗൃഹ യോഗങ്ങൾ', result.breakdown?.grihameetings)}
                  {renderBreakdown('തഹ്രീകി യോഗങ്ങൾ', result.breakdown?.thahreekiMeetings)}
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-900 mb-2">യോഗങ്ങളുടെ ആകെത്തുക</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="പ്രതിവാര ഹാജർ" value={result.sums?.weekly_hadir} />
                    <Stat label="പ്രതിവാര ലീവ്" value={result.sums?.weekly_leave} />
                    <Stat label="പ്രതിവാര ആബ്സന്റ്" value={result.sums?.weekly_absent} />
                    <Stat label="ജമാഅത്തെ ഹാജർ" value={result.sums?.jamaath_hadir} />
                    <Stat label="ജമാഅത്തെ ലീവ്" value={result.sums?.jamaath_leave} />
                    <Stat label="ജമാഅത്തെ ആബ്സന്റ്" value={result.sums?.jamaath_absent} />
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">
                ലൊക്കേഷൻ ഫിൽട്ടറുകളും ഫിൽട്ടർ ചെയ്യാനുള്ള ഫീൽഡും തിരഞ്ഞെടുത്ത് "ഫിൽട്ടറുകൾ പ്രയോഗിക്കുക" ക്ലിക്ക് ചെയ്ത് കൂട്ടിച്ചേർക്കൽ ഫലങ്ങൾ കാണുക.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Consolidation


