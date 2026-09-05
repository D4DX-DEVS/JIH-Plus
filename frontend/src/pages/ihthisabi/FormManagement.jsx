import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import ConfirmationModal from '../../components/ihthisabi/ConfirmationModal'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Copy, Eye, ChevronDown, ChevronUp,
  GripVertical, X, Check, FileText, Save, ArrowLeft, Send
} from 'lucide-react'

const QUARTER_NAMES = { 1: 'Q1 (Jan-Mar)', 2: 'Q2 (Apr-Jun)', 3: 'Q3 (Jul-Sep)', 4: 'Q4 (Oct-Dec)' }
const QUARTER_PERIODS = { 1: 'Jan – Mar', 2: 'Apr – Jun', 3: 'Jul – Sep', 4: 'Oct – Dec' }

const ANSWER_TYPES = [
  { value: 'text', label: 'Text Field' },
  { value: 'number', label: 'Number Field' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'star', label: 'Star Rating' },
  { value: 'textarea', label: 'Description Box' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'group', label: 'Grouped Fields' }
]

const emptyQuestion = () => ({
  questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  questionText: '',
  answerType: 'text',
  options: [],
  isRequired: true,
  order: 0,
  section: '',
  sectionMl: '',
  placeholder: '',
  min: undefined,
  max: undefined,
  maxLength: undefined,
  subFields: []
})

const emptyOption = () => ({ value: '', label: '', labelMl: '' })
const emptySubField = () => ({ fieldId: `sf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: '', labelMl: '', type: 'number', min: undefined, max: undefined, placeholder: '' })

const FormManagement = () => {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [editingForm, setEditingForm] = useState(null)
  const [nextQuarterInfo, setNextQuarterInfo] = useState(null)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneSource, setCloneSource] = useState(null)
  const [cloneTarget, setCloneTarget] = useState({ quarter: 1, year: 2026 })
  const [savingForm, setSavingForm] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'delete' | 'publish', formId }
  const [confirmLoading, setConfirmLoading] = useState(false)

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/ihthisabi/application-forms')
      setForms(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load forms')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchNextQuarter = useCallback(async () => {
    try {
      const res = await api.get('/ihthisabi/application-forms/next-quarter')
      setNextQuarterInfo(res.data.data)
    } catch (err) {
      console.error('Failed to fetch next quarter info:', err)
    }
  }, [])

  useEffect(() => {
    fetchForms()
    fetchNextQuarter()
  }, [fetchForms, fetchNextQuarter])

  // Close clone modal on Escape
  useEffect(() => {
    if (!showCloneModal) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowCloneModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCloneModal])

  const handleCreateNew = () => {
    const defaultQ = nextQuarterInfo?.nextQuarter?.quarter || 1
    const defaultY = nextQuarterInfo?.nextQuarter?.year || new Date().getFullYear()
    setEditingForm({
      title: `${QUARTER_NAMES[defaultQ]?.split(' ')[0] || 'Q1'} ${defaultY} Form`,
      quarter: defaultQ,
      year: defaultY,
      status: 'draft',
      questions: [emptyQuestion()]
    })
    setView('editor')
    setExpandedQuestion(0)
  }

  const handleEdit = async (formId) => {
    try {
      const res = await api.get(`/ihthisabi/application-forms/${formId}`)
      setEditingForm(res.data.data)
      setView('editor')
      setExpandedQuestion(0)
    } catch (err) {
      toast.error('Failed to load form')
    }
  }

  const handleDelete = async (formId) => {
    setConfirmLoading(true)
    try {
      await api.delete(`/ihthisabi/application-forms/${formId}`)
      toast.success('Form deleted')
      fetchForms()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete form')
    } finally {
      setConfirmLoading(false)
      setConfirmAction(null)
    }
  }

  const handleClone = (form) => {
    setCloneSource(form)
    const nq = nextQuarterInfo?.nextQuarter
    setCloneTarget({ quarter: nq?.quarter || 1, year: nq?.year || new Date().getFullYear() })
    setShowCloneModal(true)
  }

  const confirmClone = async () => {
    try {
      await api.post(`/ihthisabi/application-forms/${cloneSource._id}/clone`, {
        quarter: cloneTarget.quarter,
        year: cloneTarget.year,
        title: `${QUARTER_NAMES[cloneTarget.quarter]?.split(' ')[0] || 'Q' + cloneTarget.quarter} ${cloneTarget.year} Form`
      })
      toast.success('Form cloned successfully')
      setShowCloneModal(false)
      fetchForms()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clone form')
    }
  }

  const handlePublish = async (formId) => {
    setConfirmLoading(true)
    try {
      await api.put(`/ihthisabi/application-forms/${formId}/publish`)
      toast.success('Form published successfully')
      fetchForms()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish form')
    } finally {
      setConfirmLoading(false)
      setConfirmAction(null)
    }
  }

  const handleSave = async () => {
    if (!editingForm) return
    if (!editingForm.title?.trim()) { toast.error('Title is required'); return }
    if (!editingForm.questions?.length) { toast.error('Add at least one question'); return }

    for (let i = 0; i < editingForm.questions.length; i++) {
      const q = editingForm.questions[i]
      if (!q.questionText?.trim()) { toast.error(`Question ${i + 1}: text is required`); setExpandedQuestion(i); return }
      if (['radio', 'dropdown', 'checkbox'].includes(q.answerType) && (!q.options || q.options.length < 1)) {
        toast.error(`Question ${i + 1}: at least one option is required for ${q.answerType}`)
        setExpandedQuestion(i)
        return
      }
      if (q.answerType === 'group' && (!q.subFields || q.subFields.length < 1)) {
        toast.error(`Question ${i + 1}: at least one sub-field is required for grouped fields`)
        setExpandedQuestion(i)
        return
      }
      if (['radio', 'dropdown', 'checkbox'].includes(q.answerType)) {
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].value?.trim() || !q.options[j].label?.trim()) {
            toast.error(`Question ${i + 1}, Option ${j + 1}: value and label are required`)
            setExpandedQuestion(i)
            return
          }
        }
      }
      if (q.answerType === 'group') {
        for (let j = 0; j < q.subFields.length; j++) {
          if (!q.subFields[j].fieldId?.trim() || !q.subFields[j].label?.trim()) {
            toast.error(`Question ${i + 1}, Sub-field ${j + 1}: ID and label are required`)
            setExpandedQuestion(i)
            return
          }
        }
      }
    }

    setSavingForm(true)
    try {
      const payload = {
        ...editingForm,
        questions: editingForm.questions.map((q, i) => ({
          ...q,
          order: i + 1,
          options: ['radio', 'dropdown', 'checkbox'].includes(q.answerType) ? q.options : [],
          subFields: q.answerType === 'group' ? q.subFields : [],
          min: q.answerType === 'number' ? q.min : undefined,
          max: q.answerType === 'number' ? q.max : undefined,
          maxLength: ['text', 'textarea'].includes(q.answerType) ? q.maxLength : undefined
        }))
      }

      if (editingForm._id) {
        await api.put(`/ihthisabi/application-forms/${editingForm._id}`, payload)
        toast.success('Form updated successfully')
      } else {
        const res = await api.post('/ihthisabi/application-forms', payload)
        setEditingForm(res.data.data)
        toast.success('Form created successfully')
      }
      fetchForms()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save form')
    } finally {
      setSavingForm(false)
    }
  }

  const updateQuestion = (index, field, value) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions[index] = { ...questions[index], [field]: value }
      return { ...prev, questions }
    })
  }

  const addQuestion = () => {
    setEditingForm(prev => ({
      ...prev,
      questions: [...prev.questions, emptyQuestion()]
    }))
    setExpandedQuestion(editingForm.questions.length)
  }

  const removeQuestion = (index) => {
    if (editingForm.questions.length <= 1) { toast.error('Form must have at least one question'); return }
    setEditingForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
    if (expandedQuestion === index) setExpandedQuestion(null)
    else if (expandedQuestion > index) setExpandedQuestion(expandedQuestion - 1)
  }

  const duplicateQuestion = (index) => {
    const original = editingForm.questions[index]
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      questionText: original.questionText + ' (Copy)'
    }
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions.splice(index + 1, 0, copy)
      return { ...prev, questions }
    })
    setExpandedQuestion(index + 1)
  }

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= editingForm.questions.length) return
    setEditingForm(prev => {
      const questions = [...prev.questions]
      const temp = questions[index]
      questions[index] = questions[newIndex]
      questions[newIndex] = temp
      return { ...prev, questions }
    })
    setExpandedQuestion(newIndex)
  }

  const addOption = (qIndex) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions[qIndex] = {
        ...questions[qIndex],
        options: [...(questions[qIndex].options || []), emptyOption()]
      }
      return { ...prev, questions }
    })
  }

  const updateOption = (qIndex, oIndex, field, value) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      const options = [...questions[qIndex].options]
      options[oIndex] = { ...options[oIndex], [field]: value }
      if (field === 'label' && !options[oIndex].value) {
        options[oIndex].value = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      }
      questions[qIndex] = { ...questions[qIndex], options }
      return { ...prev, questions }
    })
  }

  const removeOption = (qIndex, oIndex) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions[qIndex] = {
        ...questions[qIndex],
        options: questions[qIndex].options.filter((_, i) => i !== oIndex)
      }
      return { ...prev, questions }
    })
  }

  const addSubField = (qIndex) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions[qIndex] = {
        ...questions[qIndex],
        subFields: [...(questions[qIndex].subFields || []), emptySubField()]
      }
      return { ...prev, questions }
    })
  }

  const updateSubField = (qIndex, sfIndex, field, value) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      const subFields = [...questions[qIndex].subFields]
      subFields[sfIndex] = { ...subFields[sfIndex], [field]: value }
      if (field === 'label') {
        const generated = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        if (generated) {
          const currentId = subFields[sfIndex].fieldId
          if (!currentId || currentId.startsWith('sf_')) {
            subFields[sfIndex].fieldId = generated
          }
        }
      }
      questions[qIndex] = { ...questions[qIndex], subFields }
      return { ...prev, questions }
    })
  }

  const removeSubField = (qIndex, sfIndex) => {
    setEditingForm(prev => {
      const questions = [...prev.questions]
      questions[qIndex] = {
        ...questions[qIndex],
        subFields: questions[qIndex].subFields.filter((_, i) => i !== sfIndex)
      }
      return { ...prev, questions }
    })
  }

  if (view === 'editor' && editingForm) {
    return (
      <div className="ih-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setView('list'); setEditingForm(null) }}
              className="flex items-center py-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Forms
            </button>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={savingForm} title="Save Form"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{savingForm ? 'Saving...' : 'Save Form'}</span>
              </button>
              {editingForm._id && editingForm.status === 'draft' && (
                <button onClick={() => setConfirmAction({ type: 'publish', formId: editingForm._id })} title="Publish"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Publish</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Settings */}
          <div className="ih-surface p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                <input type="text" value={editingForm.title || ''} onChange={(e) => setEditingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter form title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                <select value={editingForm.quarter} onChange={(e) => setEditingForm(prev => ({ ...prev, quarter: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{QUARTER_NAMES[q]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input type="number" value={editingForm.year} onChange={(e) => setEditingForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  min="2020" max="2050" />
              </div>
            </div>
            {editingForm.status === 'published' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                This form is published and active. Structure changes may be restricted if submissions exist.
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Questions ({editingForm.questions?.length || 0})</h2>
              <button onClick={addQuestion}
                className="flex items-center px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Question
              </button>
            </div>

            {editingForm.questions?.map((question, qIndex) => (
              <div key={question.questionId || qIndex} className="ih-surface overflow-hidden">
                {/* Question Header */}
                <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
                  onClick={() => setExpandedQuestion(expandedQuestion === qIndex ? null : qIndex)}>
                  <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-500 mr-3 flex-shrink-0">#{qIndex + 1}</span>
                  <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
                    {question.questionText || 'Untitled Question'}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mr-2 flex-shrink-0">
                    {ANSWER_TYPES.find(t => t.value === question.answerType)?.label || question.answerType}
                  </span>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); moveQuestion(qIndex, -1) }} disabled={qIndex === 0}
                      className="p-2 -m-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveQuestion(qIndex, 1) }} disabled={qIndex === editingForm.questions.length - 1}
                      className="p-2 -m-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateQuestion(qIndex) }}
                      className="p-2 -m-2 text-gray-400 hover:text-blue-600"><Copy className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex) }}
                      className="p-2 -m-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    {expandedQuestion === qIndex ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Question Body */}
                {expandedQuestion === qIndex && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                      <input type="text" value={question.questionText} onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Enter question text" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Answer Type</label>
                        <select value={question.answerType} onChange={(e) => updateQuestion(qIndex, 'answerType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          {ANSWER_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <input type="text" value={question.section || ''} onChange={(e) => updateQuestion(qIndex, 'section', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Section name (optional)" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={question.isRequired} onChange={(e) => updateQuestion(qIndex, 'isRequired', e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                          <span className="text-sm font-medium text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {question.answerType === 'number' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                          <input type="number" value={question.min ?? ''} onChange={(e) => updateQuestion(qIndex, 'min', e.target.value === '' ? undefined : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                          <input type="number" value={question.max ?? ''} onChange={(e) => updateQuestion(qIndex, 'max', e.target.value === '' ? undefined : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                          <input type="text" value={question.placeholder || ''} onChange={(e) => updateQuestion(qIndex, 'placeholder', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Enter placeholder" />
                        </div>
                      </div>
                    )}

                    {['text', 'textarea'].includes(question.answerType) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Length</label>
                          <input type="number" value={question.maxLength ?? ''} onChange={(e) => updateQuestion(qIndex, 'maxLength', e.target.value === '' ? undefined : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                          <input type="text" value={question.placeholder || ''} onChange={(e) => updateQuestion(qIndex, 'placeholder', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Enter placeholder" />
                        </div>
                      </div>
                    )}

                    {/* Options for radio/dropdown/checkbox */}
                    {['radio', 'dropdown', 'checkbox'].includes(question.answerType) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Options</label>
                          <button onClick={() => addOption(qIndex)} className="flex items-center py-1.5 text-sm text-primary hover:text-primary/80">
                            <Plus className="w-3 h-3 mr-1" /> Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {question.options?.map((opt, oIndex) => (
                            <div key={oIndex} className="flex flex-wrap items-center gap-2">
                              <input type="text" value={opt.label} onChange={(e) => updateOption(qIndex, oIndex, 'label', e.target.value)}
                                className="w-full sm:flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Option label" />
                              <input type="text" value={opt.value} onChange={(e) => updateOption(qIndex, oIndex, 'value', e.target.value)}
                                className="w-24 sm:w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Value" />
                              <input type="text" value={opt.labelMl || ''} onChange={(e) => updateOption(qIndex, oIndex, 'labelMl', e.target.value)}
                                className="w-32 sm:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Malayalam" />
                              <button onClick={() => removeOption(qIndex, oIndex)} className="shrink-0 p-1.5 text-gray-400 hover:text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(!question.options || question.options.length === 0) && (
                            <p className="text-sm text-gray-400 italic">No options added. Click "Add Option" above.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sub-fields for group type */}
                    {question.answerType === 'group' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Sub-Fields</label>
                          <button onClick={() => addSubField(qIndex)} className="flex items-center py-1.5 text-sm text-primary hover:text-primary/80">
                            <Plus className="w-3 h-3 mr-1" /> Add Sub-Field
                          </button>
                        </div>
                        <div className="space-y-2">
                          {question.subFields?.map((sf, sfIndex) => (
                            <div key={sfIndex} className="flex flex-wrap items-center gap-2">
                              <input type="text" value={sf.label} onChange={(e) => updateSubField(qIndex, sfIndex, 'label', e.target.value)}
                                className="w-full sm:flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Field label" />
                              <input type="text" value={sf.fieldId} onChange={(e) => updateSubField(qIndex, sfIndex, 'fieldId', e.target.value)}
                                className="w-full sm:w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Field ID" />
                              <select value={sf.type} onChange={(e) => updateSubField(qIndex, sfIndex, 'type', e.target.value)}
                                className="w-full sm:w-24 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                <option value="number">Number</option>
                                <option value="text">Text</option>
                              </select>
                              <input type="text" value={sf.labelMl || ''} onChange={(e) => updateSubField(qIndex, sfIndex, 'labelMl', e.target.value)}
                                className="flex-1 sm:w-32 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Malayalam" />
                              <button onClick={() => removeSubField(qIndex, sfIndex)} className="shrink-0 p-1.5 text-gray-400 hover:text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(!question.subFields || question.subFields.length === 0) && (
                            <p className="text-sm text-gray-400 italic">No sub-fields added. Click "Add Sub-Field" above.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {question.answerType === 'star' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Stars</label>
                          <input type="number" value={question.max ?? 5} onChange={(e) => updateQuestion(qIndex, 'max', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" min="1" max="10" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Another Question
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ih-screen bg-gray-50">
      <div className="ih-page-shell max-w-5xl">
        {/* Header */}
        {/* Title is hidden on mobile — the sticky app bar already names the page. */}
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <div className="hidden min-w-0 lg:block">
            <h1 className="ih-page-title">Form Management</h1>
            <p className="ih-page-subtitle">Create and manage quarterly submission forms</p>
          </div>
          <button onClick={handleCreateNew}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[#161F2F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1a2538] sm:min-h-0 sm:px-4 sm:py-2.5 sm:text-sm">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">New form</span>
            <span className="hidden sm:inline">Create New Form</span>
          </button>
        </div>

        {nextQuarterInfo && (
          <div className="ih-surface mb-3 grid grid-cols-2 divide-x divide-gray-100 overflow-hidden">
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Open for submission</p>
              <p className="mt-0.5 text-[13px] font-bold text-gray-900 sm:text-sm">
                Q{nextQuarterInfo.currentSubmissionQuarter?.quarter} {nextQuarterInfo.currentSubmissionQuarter?.year}
              </p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Next to assign</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-bold text-gray-900 sm:text-sm">
                Q{nextQuarterInfo.nextQuarter?.quarter} {nextQuarterInfo.nextQuarter?.year}
                {nextQuarterInfo.formExists && (
                  <span className="ih-chip bg-green-50 font-semibold text-green-700">Ready</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Forms List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : forms.length === 0 ? (
          <div className="ih-surface px-4 py-8 text-center sm:py-12">
            <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No forms created yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create your first dynamic form to get started</p>
            <button onClick={handleCreateNew}
              className="inline-flex min-h-[44px] sm:min-h-0 items-center rounded-full bg-[#161F2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a2538]">
              <Plus className="w-4 h-4 mr-2" /> Create Form
            </button>
          </div>
        ) : (
          <div className="ih-section-card ih-list overflow-hidden">
            {forms.map(form => {
              const published = form.status === 'published'
              return (
              <div key={form._id} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:px-4 sm:py-3.5">
                <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl ${
                  published ? 'bg-[#161F2F] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className="text-[11px] font-bold leading-none">Q{form.quarter}</span>
                  <span className="mt-0.5 text-[9px] font-medium leading-none opacity-70">{form.year}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="min-w-0 truncate text-[13px] font-semibold text-gray-900 sm:text-sm">{form.title}</h3>
                    <span className={`ih-chip ih-chip-dot ${
                      published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="ih-list-meta mt-1">
                    {QUARTER_PERIODS[form.quarter]} · {form.questions?.length || 0} questions
                    {form.clonedFrom && ' · Cloned'}
                  </p>
                  <p className="ih-list-meta mt-0.5">
                    Updated {new Date(form.updatedAt || form.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-gray-50 p-0.5">
                  <button onClick={() => handleEdit(form._id)} title="Edit"
                    className="ih-icon-btn hover:bg-blue-50 hover:text-blue-600">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleClone(form)} title="Clone to another quarter"
                    className="ih-icon-btn hover:bg-purple-50 hover:text-purple-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!published && (
                    <button onClick={() => setConfirmAction({ type: 'publish', formId: form._id })} title="Publish"
                      className="ih-icon-btn hover:bg-green-50 hover:text-green-600">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setConfirmAction({ type: 'delete', formId: form._id })} title="Delete"
                    className="ih-icon-btn hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && cloneSource && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCloneModal(false)}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone Form</h3>
            <p className="text-sm text-gray-500 mb-4">
              Clone "{cloneSource.title}" to a new quarter
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Quarter</label>
                <select value={cloneTarget.quarter} onChange={(e) => setCloneTarget(prev => ({ ...prev, quarter: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{QUARTER_NAMES[q]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input type="number" value={cloneTarget.year} onChange={(e) => setCloneTarget(prev => ({ ...prev, year: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  min="2020" max="2050" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCloneModal(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={confirmClone} className="btn-secondary">
                Clone Form
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === 'delete') handleDelete(confirmAction.formId)
          else if (confirmAction?.type === 'publish') handlePublish(confirmAction.formId)
        }}
        title={confirmAction?.type === 'delete' ? 'Delete Form' : 'Publish Form'}
        message={
          confirmAction?.type === 'delete'
            ? 'Are you sure you want to delete this form? This action cannot be undone.'
            : 'Publish this form? Once published, users can submit for this quarter.'
        }
        confirmText={confirmAction?.type === 'delete' ? 'Delete' : 'Publish'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'info'}
        isLoading={confirmLoading}
      />
    </div>
  )
}

export default FormManagement
