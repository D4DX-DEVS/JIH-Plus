import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, Plus, Save, Trash2, X } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import FieldCanvas from '../../components/reportBuilder/FieldCanvas'
import FieldTypeSelector from '../../components/reportBuilder/FieldTypeSelector'
import DynamicFormRenderer from '../../components/reportRenderer/DynamicFormRenderer'
import { Button, Card, Field, Input, Select, Spinner, Textarea } from '../../components/members/ui'

// Field ids must be unique across the whole form — the conditional-logic editor
// and the renderer both address fields by bare id.
let _nextId = 1
const nextId = () => _nextId++

const makeNewPage = (order = 0) => ({
  id: nextId(), title: '', description: '', order, fields: [],
  audience: 'applicant', audienceRole: ''
})

const OPTION_TYPES = ['select', 'dropdown', 'radio', 'checkbox', 'multiselect']

const makeNewField = (type) => ({
  id: nextId(), type, label: '', required: false, placeholder: '', helpText: '',
  audience: 'applicant', audienceRole: '', width: 'full',
  options: OPTION_TYPES.includes(type) ? ['Option 1', 'Option 2'] : [],
  validation: {}, conditionalLogic: null,
  rowTitles: type === 'row' ? ['Row 1'] : [],
  columnTitles: type === 'row' ? ['Col 1'] : [],
  rowMeta: type === 'row' ? [{ kind: 'input' }] : [],
  columnMeta: type === 'row' ? [{ kind: 'input', inputType: 'text' }] : [],
  staticCells: type === 'row' ? {} : undefined,
  sumRow: false, sumColumn: false, sumRowLabel: 'Total', sumColumnLabel: 'Total'
})

export default function FormBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [meta, setMeta] = useState({ formType: 'rukn', title: '', description: '' })
  const [pages, setPages] = useState([makeNewPage(0)])
  const [roles, setRoles] = useState([])
  const [activePage, setActivePage] = useState(0)
  const [clipboard, setClipboard] = useState(null)
  const [copiedFieldId, setCopiedFieldId] = useState(null)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [preview, setPreview] = useState(null) // 'applicant' | 'full' | null
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(false)
  const [usageCount, setUsageCount] = useState(0)

  // Once applications exist against this template its structure is frozen —
  // only the title and description can still change.
  const structureLocked = usageCount > 0

  useEffect(() => {
    api.get('/admin/roles')
      .then(({ data }) => setRoles((data.roles || []).filter(r => r.isActive)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) {
      _nextId = 1
      setPages([makeNewPage(0)])
      return
    }
    api.get(`/forms/${id}`)
      .then(({ data }) => {
        const template = data.template
        setMeta({ formType: template.formType, title: template.title, description: template.description || '' })
        setPublished(Boolean(template.isPublished))
        setUsageCount(data.usageCount || 0)
        const loaded = template.pages?.length ? template.pages : [makeNewPage(0)]
        setPages(loaded)
        // Continue ids above whatever the saved form already used.
        const maxId = Math.max(
          0,
          ...loaded.map(p => p.id || 0),
          ...loaded.flatMap(p => (p.fields || []).map(f => f.id || 0))
        )
        _nextId = maxId + 1
      })
      .catch(err => toast.error(apiError(err, 'Failed to load the form')))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const allFields = useMemo(() => pages.flatMap(p => p.fields || []), [pages])

  const addField = (type) => {
    setPages(prev => prev.map((p, pi) =>
      pi !== activePage ? p : { ...p, fields: [...(p.fields || []), makeNewField(type)] }))
  }

  const cloneField = (field) => ({ ...JSON.parse(JSON.stringify(field)), id: nextId() })

  const insertField = (pageIdx, index, field) => {
    setPages(prev => prev.map((p, pi) => {
      if (pi !== pageIdx) return p
      const fields = [...(p.fields || [])]
      fields.splice(index, 0, field)
      return { ...p, fields }
    }))
  }

  const addPage = () => {
    setPages(prev => [...prev, makeNewPage(prev.length)])
    setActivePage(pages.length)
  }

  const removePage = (i) => {
    if (pages.length <= 1) return
    setPages(prev => prev.filter((_, pi) => pi !== i))
    setActivePage(a => (a >= i && a > 0 ? a - 1 : a))
  }

  const payload = useCallback(() => {
    const body = { formType: meta.formType, title: meta.title, description: meta.description }
    // The server rejects structural edits once applications exist, so leave the
    // frozen pages out entirely and only send the still-editable metadata.
    if (!structureLocked) body.pages = pages.map((p, i) => ({ ...p, order: i }))
    return body
  }, [meta, pages, structureLocked])

  const save = async () => {
    if (!meta.title.trim()) return toast.error('Give the form a title first')
    setSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post('/forms', payload())
        toast.success('Draft saved')
        navigate(`/members/forms/${data.template._id}`, { replace: true })
      } else {
        await api.put(`/forms/${id}`, payload())
        toast.success(published ? 'Changes saved' : 'Draft saved')
      }
    } catch (err) {
      toast.error(apiError(err, 'Could not save the form'))
    } finally {
      setSaving(false)
    }
  }

  // One-click publish: saves (creating the template first if it is new) and
  // publishes in the same action, so no separate draft step is needed.
  const publish = async () => {
    if (!meta.title.trim()) return toast.error('Give the form a title first')
    setSaving(true)
    try {
      let formId = id
      if (isNew) {
        const { data } = await api.post('/forms', payload())
        formId = data.template._id
      } else {
        await api.put(`/forms/${id}`, payload())
      }
      await api.patch(`/forms/${formId}/publish`)
      toast.success('Form published')
      setPublished(true)
      if (isNew) navigate(`/members/forms/${formId}`, { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Could not publish the form'))
    } finally {
      setSaving(false)
    }
  }

  // What the applicant would actually receive — role pages and fields removed.
  const previewTemplate = useMemo(() => {
    if (preview === 'full') return { ...meta, pages }
    const filtered = pages
      .filter(p => p.audience !== 'role')
      .map(p => ({ ...p, fields: (p.fields || []).filter(f => f.audience !== 'role') }))
      .filter(p => (p.fields || []).length > 0)
    return { ...meta, pages: filtered }
  }, [preview, pages, meta])

  if (loading) return <Spinner />

  return (
    <div>
      <button
        onClick={() => navigate('/members/forms')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 -ml-2 p-2 mb-1"
      >
        <ArrowLeft size={16} /> Back to forms
      </button>

      {published && !structureLocked && (
        <Card className="p-3 mb-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-800">
            This form is live. Changes you save here update the published form immediately.
          </p>
        </Card>
      )}
      {structureLocked && (
        <Card className="p-3 mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            {usageCount} application{usageCount === 1 ? ' has' : 's have'} been submitted against this
            form, so its structure is locked — only the title and description can be changed. Clone it
            from the forms list to restructure.
          </p>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Application type" required>
            <Select
              value={meta.formType}
              onChange={e => setMeta({ ...meta, formType: e.target.value })}
              disabled={!isNew}
            >
              <option value="rukn">Rukn</option>
              <option value="karkoon">Karkoon</option>
            </Select>
          </Field>

          <Field label="Form title" required>
            <Input
              value={meta.title}
              onChange={e => setMeta({ ...meta, title: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <Input
              value={meta.description}
              onChange={e => setMeta({ ...meta, description: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
            {pages.map((page, i) => (
              <div key={i} className="flex-shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePage(i)}
                  className={`px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors ${
                    i === activePage
                      ? 'border-[#5b21b6] text-[#5b21b6] bg-[#faf5ff] font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page.title || `Page ${i + 1}`}
                  {page.audience === 'role' && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400">
                      {page.audienceRole}
                    </span>
                  )}
                </button>
                {pages.length > 1 && !structureLocked && (
                  <button type="button" onClick={() => removePage(i)} className="text-gray-300 hover:text-red-400 p-2">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {!structureLocked && (
              <button
                type="button"
                onClick={addPage}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-[#5b21b6] hover:bg-[#faf5ff] rounded"
              >
                <Plus size={14} /> Add Page
              </button>
            )}
          </div>
        </div>

        <div className={structureLocked ? 'pointer-events-none opacity-60' : ''}>
          <FieldCanvas
            pages={pages}
            pageIndex={activePage}
            allFields={allFields}
            onPagesChange={setPages}
            onAddField={() => setShowFieldSelector(true)}
            clipboard={clipboard}
            copiedFieldId={copiedFieldId}
            onCopyField={(field) => { setClipboard(JSON.parse(JSON.stringify(field))); setCopiedFieldId(field.id) }}
            onDuplicateField={(index) => {
              const source = (pages[activePage]?.fields || [])[index]
              if (source) insertField(activePage, index + 1, cloneField(source))
            }}
            onPasteField={(index) => { if (clipboard) insertField(activePage, index, cloneField(clipboard)) }}
            onClearClipboard={() => { setClipboard(null); setCopiedFieldId(null) }}
            roleOptions={roles}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setPreview('applicant')}>
          <Eye size={15} /> Preview as applicant
        </Button>
        <Button variant="secondary" onClick={() => setPreview('full')}>
          <Eye size={15} /> Preview full form
        </Button>
        <div className="flex-1" />
        {published ? (
          <Button onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save changes'}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={save} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save draft'}
            </Button>
            <Button onClick={publish} disabled={saving}>
              {saving ? 'Publishing...' : 'Save & publish'}
            </Button>
          </>
        )}
      </div>

      {showFieldSelector && (
        <FieldTypeSelector
          onSelect={(type) => { addField(type); setShowFieldSelector(false) }}
          onClose={() => setShowFieldSelector(false)}
        />
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
          <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 -ml-2 p-2 flex-shrink-0">
              <X size={18} /> <span className="text-sm font-medium">Close preview</span>
            </button>
            <span className="hidden sm:block text-sm text-gray-500 truncate">
              {preview === 'applicant'
                ? 'Exactly what the applicant sees — role comment sections removed.'
                : 'Full form including every role comment section.'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              {previewTemplate.pages.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing to preview yet.</p>
              ) : (
                <DynamicFormRenderer report={previewTemplate} onSubmit={() => {}} disabled />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
