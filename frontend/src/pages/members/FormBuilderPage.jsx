import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, Globe, Lock, Plus, Save, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import FieldCanvas from '../../components/reportBuilder/FieldCanvas'
import FieldTypeSelector from '../../components/reportBuilder/FieldTypeSelector'
import FormPreview from '../../components/members/FormPreview'
import {
  Button, Card, Field, IconButton, Input, Modal, Notice, PageHeader, Select, Spinner
} from '../../components/members/ui'
import { cx } from '../../utils/members/format'

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
  const [dirty, setDirty] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const restoringHistory = useRef(false)

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
        setDirty(false)
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

  // BrowserRouter does not expose a data-router blocker. Keep the established
  // confirmation modal for this page's Back action, and guard the remaining
  // browser/route exits at the DOM and history boundaries.
  useEffect(() => {
    if (!dirty) return

    const message = 'You have unsaved form changes. Leave this page and discard them?'
    const currentHistoryIndex = window.history.state?.idx

    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const onDocumentClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return

      const destination = new URL(link.href, window.location.href)
      const current = new URL(window.location.href)
      if (destination.origin !== current.origin || `${destination.pathname}${destination.search}${destination.hash}` === `${current.pathname}${current.search}${current.hash}`) return

      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onPopState = (event) => {
      if (restoringHistory.current) {
        restoringHistory.current = false
        return
      }
      if (window.confirm(message)) return

      event.stopImmediatePropagation()
      const nextHistoryIndex = event.state?.idx
      const delta = Number.isInteger(currentHistoryIndex) && Number.isInteger(nextHistoryIndex)
        ? currentHistoryIndex - nextHistoryIndex
        : 1
      restoringHistory.current = true
      window.history.go(delta || 1)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onDocumentClick, true)
    window.addEventListener('popstate', onPopState, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onDocumentClick, true)
      window.removeEventListener('popstate', onPopState, true)
    }
  }, [dirty])

  const allFields = useMemo(() => pages.flatMap(p => p.fields || []), [pages])

  // Marks the form dirty on every structural or metadata edit, so leaving the
  // page mid-edit can be confirmed instead of silently discarding work.
  const updatePages = (updater) => { setDirty(true); setPages(updater) }
  const updateMeta = (patch) => { setDirty(true); setMeta(prev => ({ ...prev, ...patch })) }

  const addField = (type) => {
    updatePages(prev => prev.map((p, pi) =>
      pi !== activePage ? p : { ...p, fields: [...(p.fields || []), makeNewField(type)] }))
  }

  const cloneField = (field) => ({ ...JSON.parse(JSON.stringify(field)), id: nextId() })

  const insertField = (pageIdx, index, field) => {
    updatePages(prev => prev.map((p, pi) => {
      if (pi !== pageIdx) return p
      const fields = [...(p.fields || [])]
      fields.splice(index, 0, field)
      return { ...p, fields }
    }))
  }

  const addPage = () => {
    updatePages(prev => [...prev, makeNewPage(prev.length)])
    setActivePage(pages.length)
  }

  const removePage = (i) => {
    if (pages.length <= 1) return
    updatePages(prev => prev.filter((_, pi) => pi !== i))
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
        setDirty(false)
        navigate(`/members/forms/${data.template._id}`, { replace: true })
      } else {
        await api.put(`/forms/${id}`, payload())
        toast.success(published ? 'Changes saved' : 'Draft saved')
        setDirty(false)
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
        // It is a saved draft from here on. Move the editor onto it so a retry
        // after a refused publish updates this draft instead of creating another.
        setDirty(false)
        navigate(`/members/forms/${formId}`, { replace: true })
      } else {
        await api.put(`/forms/${id}`, payload())
      }
      await api.patch(`/forms/${formId}/publish`)
      toast.success('Form published')
      setPublished(true)
      setDirty(false)
    } catch (err) {
      toast.error(apiError(err, 'Could not publish the form'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Loading form..." />

  return (
    <div>
      {/* The phone app bar already carries a back arrow; this guarded one shows
          on desktop, and on phones once there are unsaved edits to confirm. */}
      <button
        onClick={() => (dirty ? setConfirmLeave(true) : navigate('/members/forms'))}
        className={cx(
          '-ml-2 mb-1 min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-500 hover:text-ink',
          dirty ? 'inline-flex' : 'hidden lg:inline-flex'
        )}
      >
        <ArrowLeft size={16} /> Back to forms
      </button>

      <PageHeader
        title={isNew ? 'New form' : 'Edit form'}
        hideTitleOnMobile
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPreview('applicant')}>
              <Eye size={15} />
              <span className="sm:hidden">Applicant view</span>
              <span className="hidden sm:inline">Preview as applicant</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPreview('full')}>
              <Eye size={15} />
              <span className="sm:hidden">Full form</span>
              <span className="hidden sm:inline">Preview full form</span>
            </Button>
          </>
        }
      />

      {published && !structureLocked && (
        <Notice tone="success" icon={Globe} className="mb-3 sm:mb-4">
          This form is live. Changes you save here update the published form immediately.
        </Notice>
      )}
      {structureLocked && (
        <Notice tone="warning" icon={Lock} className="mb-3 sm:mb-4">
          {usageCount} application{usageCount === 1 ? ' has' : 's have'} been submitted against this
          form, so its structure is locked — only the title and description can be changed. Clone it
          from the forms list to restructure.
        </Notice>
      )}

      <Card as="section" className="mb-3 overflow-hidden sm:mb-4">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 sm:px-5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-xs font-bold text-royal-700">1</span>
          <h2 className="text-[15px] font-semibold leading-snug text-ink">Form details</h2>
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-5">
          <Field label="Application type" required>
            <Select
              value={meta.formType}
              onChange={e => updateMeta({ formType: e.target.value })}
              disabled={!isNew}
            >
              <option value="rukn">Rukn</option>
              <option value="karkoon">Karkoon</option>
            </Select>
          </Field>

          <Field label="Form title" required>
            <Input
              value={meta.title}
              onChange={e => updateMeta({ title: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <Input
              value={meta.description}
              onChange={e => updateMeta({ description: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card as="section" className="mb-3 overflow-hidden sm:mb-4">
        {/* Page switcher: scrolls sideways on phones instead of wrapping */}
        <div className="border-b border-line bg-mist/60 px-3 py-2.5 sm:px-4">
          <div className="mbr-scroll-x items-center gap-2">
            {pages.map((page, i) => {
              const active = i === activePage
              return (
                <div
                  key={i}
                  className={cx(
                    'flex shrink-0 items-center rounded-xl ring-1 ring-inset transition-colors',
                    active ? 'bg-royal-50 ring-royal-300' : 'bg-[#fff] ring-slate-200'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActivePage(i)}
                    aria-current={active ? 'true' : undefined}
                    className={cx(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold lg:min-h-10',
                      active ? 'text-royal-800' : 'text-slate-600 hover:text-ink'
                    )}
                  >
                    {page.title || `Page ${i + 1}`}
                    {page.audience === 'role' && (
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {page.audienceRole}
                      </span>
                    )}
                  </button>
                  {pages.length > 1 && !structureLocked && (
                    <IconButton
                      icon={Trash2}
                      label={`Remove ${page.title || `page ${i + 1}`}`}
                      tone="danger"
                      size={15}
                      onClick={() => removePage(i)}
                      className="-ml-2"
                    />
                  )}
                </div>
              )
            })}
            {!structureLocked && (
              <Button variant="soft" size="sm" onClick={addPage} className="shrink-0">
                <Plus size={14} /> Add page
              </Button>
            )}
          </div>
        </div>

        <div className={structureLocked ? 'pointer-events-none opacity-60' : ''}>
          <FieldCanvas
            pages={pages}
            pageIndex={activePage}
            allFields={allFields}
            onPagesChange={updatePages}
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

      {/* Save bar: floats above the phone bottom nav, stays in view while editing */}
      <div className="mbr-sticky-action">
        <div className="mbr-card flex items-center justify-end gap-2 p-2.5 shadow-[0_8px_28px_rgba(11,20,48,0.16)]">
          {published ? (
            <Button className="flex-1 sm:flex-none" onClick={save} loading={saving}>
              {!saving && <Save size={15} />} {saving ? 'Saving...' : 'Save changes'}
            </Button>
          ) : (
            <>
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={save} disabled={saving}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save draft'}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={publish} disabled={saving}>
                {saving ? 'Publishing...' : 'Save & publish'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showFieldSelector && (
        <FieldTypeSelector
          onSelect={(type) => { addField(type); setShowFieldSelector(false) }}
          onClose={() => setShowFieldSelector(false)}
        />
      )}

      {preview && (
        <FormPreview template={{ ...meta, pages }} mode={preview} onClose={() => setPreview(null)} />
      )}

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Discard unsaved changes?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>Keep editing</Button>
            <Button variant="danger" onClick={() => { setDirty(false); setConfirmLeave(false); navigate('/members/forms') }}>Discard changes</Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          You have unsaved changes to this form. Leaving now will lose them.
        </p>
      </Modal>
    </div>
  )
}
