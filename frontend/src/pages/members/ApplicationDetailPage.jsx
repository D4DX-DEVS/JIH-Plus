import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowLeft, Lock, Pencil, Save, X } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import { useAuth } from '../../contexts/members/AuthContext'
import FieldRenderer from '../../components/reportRenderer/FieldRenderer'
import { fieldWidthClass } from '../../utils/fieldWidth'
import {
  Button, Card, Field, Input, Modal, PageHeader, Select, Spinner,
  StatusBadge, Textarea
} from '../../components/members/ui'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

const DECISION_ACTIONS = [
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'hold', label: 'Put on hold' }
]

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Values the current reviewer is entering, kept apart from what is already saved.
  const [roleDraft, setRoleDraft] = useState({})
  const [captured, setCaptured] = useState({})
  const [comment, setComment] = useState('')
  const [useSkip, setUseSkip] = useState(false)
  const [decision, setDecision] = useState('approved')
  const [sendBackTo, setSendBackTo] = useState('')
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState(false)
  const [formDraft, setFormDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/applications/${id}`)
      .then(({ data: payload }) => {
        setData(payload)
        setRoleDraft(payload.application.roleData || {})
        setFormDraft(payload.application.formData || {})
        setCaptured({})
        setComment('')
        setUseSkip(false)
        setDecision('approved')
        setSendBackTo('')
        setError('')
      })
      .catch(err => setError(apiError(err, 'Failed to load the application')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  const stage = data?.permissions?.stage
  const myTurn = Boolean(data?.permissions?.myTurn)
  const canSkip = Boolean(data?.permissions?.canSkip)

  const stageName = useCallback((key) => {
    const found = data?.workflow?.stages?.find(s => s.key === key)
    return found?.name || key
  }, [data])

  // Another role's comment fields that this actor may fill only by taking the
  // Rukn skip; they stay hidden until the skip box is ticked.
  const isSkipOnlyField = (field) => Boolean(
    canSkip && field.ownerRoleKey && !field.readOnly &&
    field.ownerRoleKey !== stage?.actorRoleKey &&
    (stage?.skipFillsRoleKeys || []).includes(field.ownerRoleKey)
  )

  // Only earlier stages are real send-back targets (the server enforces this).
  const sendBackOptions = useMemo(() => {
    if (!stage) return []
    const orderOf = (key) => data?.workflow?.stages?.find(s => s.key === key)?.order ?? Infinity
    return (stage.allowedNextStageKeys || []).filter(k => k !== stage.nextStageKey && orderOf(k) < stage.order)
  }, [stage, data])

  // Reviewers land at the top of a long application; take them to their part.
  const jumpToMyPart = () => {
    const target = document.querySelector('[data-my-field]') || document.getElementById('your-action')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // History stores captured values by key; show the stage's own field label.
  const captureLabel = (stageKey, key) => {
    const found = data?.workflow?.stages?.find(s => s.key === stageKey)
    return found?.captureFields?.find(f => f.key === key)?.label || key
  }

  const nextStageLabel = useMemo(() => {
    if (!stage) return ''
    if (useSkip && stage.skipToStageKey) return stageName(stage.skipToStageKey)
    return stage.nextStageKey ? stageName(stage.nextStageKey) : 'Complete'
  }, [stage, useSkip, stageName])

  const submitStage = async (action) => {
    setBusy(true)
    try {
      // Send only the comment fields this reviewer may write; earlier roles'
      // answers are loaded for display and would otherwise come back "ignored".
      const editableKeys = new Set(data.template.pages.flatMap(p =>
        p.fields.filter(f => f.ownerRoleKey && !f.readOnly && (useSkip || !isSkipOnlyField(f))).map(f => `field_${f.id}`)))
      const roleData = Object.fromEntries(Object.entries(roleDraft).filter(([key]) => editableKeys.has(key)))
      const body = { action, comment, roleData, captured, useSkip }
      if (action === 'returned') body.nextStageKey = sendBackTo
      const { data: result } = await api.put(`/applications/${id}/stage`, body)
      if (result.ignoredFields?.length) {
        toast('Some fields were not yours to edit and were ignored.', { icon: 'ℹ️' })
      }
      toast.success('Application updated')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not update the application'))
    } finally {
      setBusy(false)
    }
  }

  const saveFormData = async () => {
    setBusy(true)
    try {
      await api.put(`/applications/${id}/form-data`, { formData: formDraft })
      toast.success('Applicant answers updated')
      setEditing(false)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not save the changes'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api.delete(`/applications/${id}`)
      toast.success('Application deleted')
      navigate('/members/applications', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the application'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-sm text-red-600 mb-3">{error}</p>
      <Button variant="secondary" onClick={load}>Retry</Button>
    </div>
  )
  if (!data) return null

  const { application, template } = data

  return (
    <div>
      <button
        onClick={() => navigate('/members/applications')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 pt-2 pb-2 -mt-2 mb-1 min-h-11"
      >
        <ArrowLeft size={16} /> Back to applications
      </button>

      <PageHeader
        title={application.applicantName || 'Unnamed applicant'}
        subtitle={[
          FORM_TYPE_LABEL[application.formType],
          application.scope?.unit,
          application.memberId && `ID: ${application.memberId}`
        ].filter(Boolean).join(' · ')}
        actions={
          <>
            <StatusBadge status={application.status} />
            {isSuperAdmin && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
            )}
          </>
        }
      />

      {stage && (
        <Card className="p-4 mb-4 bg-[#faf5ff] border-[#ddd6fe] flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Currently at <strong>{stage.name}</strong>
            {myTurn ? ' — waiting on you.' : ' — waiting on another role.'}
          </p>
          {myTurn && (
            <Button onClick={jumpToMyPart} className="w-full sm:w-auto">
              <ArrowDown size={15} /> Go to my review
            </Button>
          )}
        </Card>
      )}
      {!stage && (
        <Card className="p-4 mb-4">
          <p className="text-sm text-gray-700">This application has completed its workflow.</p>
        </Card>
      )}

      {/* ── Form content ─────────────────────────────────────────────────── */}
      {template.pages.map(page => {
        const editable = page.hasEditableFields
        const fields = page.fields.filter(f => useSkip || !isSkipOnlyField(f))
        if (!fields.length) return null
        return (
          <Card key={page.id} className="p-4 sm:p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{page.title || 'Section'}</h2>
                {page.description && <p className="text-sm text-gray-500 mt-0.5">{page.description}</p>}
              </div>
              {page.audience === 'role' && !editable && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <Lock size={13} /> Read only
                </span>
              )}
              {page.audience !== 'role' && myTurn && !editing && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit answers
                </Button>
              )}
            </div>

            <div className="grid grid-cols-12 gap-x-4 gap-y-4">
              {fields.map(field => {
                const key = `field_${field.id}`
                const controlId = `application-${key}`
                const isRoleField = Boolean(field.ownerRoleKey)
                // Uploads can't be replaced from here: the edit endpoint stores
                // JSON only, so a newly picked file would overwrite the photo.
                const readOnly = field.readOnly || (!isRoleField && !editing) || field.type === 'file'
                const value = isRoleField
                  ? roleDraft[key]
                  : (editing ? formDraft[key] : application.formData?.[key])

                const onChange = (val) => {
                  if (isRoleField) setRoleDraft(prev => ({ ...prev, [key]: val }))
                  else setFormDraft(prev => ({ ...prev, [key]: val }))
                }

                return (
                  <div key={field.id} className={`${fieldWidthClass(field)} scroll-mt-4`} data-my-field={isRoleField && !readOnly ? true : undefined}>
                    {!['title', 'html'].includes(field.type) && (
                      <label id={`${controlId}-label`} htmlFor={controlId} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && !readOnly && <span className="text-red-500"> *</span>}
                      </label>
                    )}
                    <FieldRenderer
                      field={field}
                      value={value ?? ''}
                      onChange={onChange}
                      disabled={readOnly}
                      controlId={controlId}
                      labelledBy={`${controlId}-label`}
                    />
                    {field.helpText && !['title'].includes(field.type) && (
                      <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {editing && (
        <Card className="p-4 mb-4 flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => { setEditing(false); setFormDraft(application.formData || {}) }}>
            <X size={14} /> Cancel
          </Button>
          <Button onClick={saveFormData} disabled={busy}>
            <Save size={14} /> Save applicant answers
          </Button>
        </Card>
      )}

      {/* ── Reviewer action ──────────────────────────────────────────────── */}
      {myTurn && stage && (
        <Card id="your-action" className="p-4 sm:p-5 mb-4 scroll-mt-4">
          <h2 className="font-semibold text-gray-900 mb-4">Your action</h2>

          {(stage.captureFields || []).length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {stage.captureFields.map(cf => (
                <Field key={cf.key} label={cf.label} required={cf.required}>
                  {cf.type === 'yesno' ? (
                    <Select
                      value={captured[cf.key] ?? ''}
                      onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                  ) : cf.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={captured[cf.key] ?? ''}
                      onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      type={cf.type === 'date' ? 'date' : cf.type === 'number' ? 'number' : 'text'}
                      value={captured[cf.key] ?? ''}
                      onChange={e => setCaptured({ ...captured, [cf.key]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}

          <Field label="Comment" hint="Saved against your role and visible to later reviewers.">
            <Textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} />
          </Field>

          {canSkip && (
            <label className="flex items-start gap-2 mt-4 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={useSkip}
                onChange={e => setUseSkip(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I am a Rukn — fill the {(stage.skipFillsRoleKeys || []).join(', ')} comments myself and send
                straight to {stageName(stage.skipToStageKey)}.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-gray-100">
            {stage.kind === 'decision' ? (
              <>
                <Select value={decision} onChange={e => setDecision(e.target.value)} className="sm:w-48">
                  {DECISION_ACTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Button onClick={() => submitStage(decision)} disabled={busy}>
                  {busy ? 'Saving...' : 'Record decision'}
                </Button>
              </>
            ) : (
              <Button onClick={() => submitStage(stage.kind === 'marker' ? 'marked' : stage.kind === 'finalize' ? 'finalized' : 'forwarded')} disabled={busy}>
                {busy ? 'Saving...' : stage.isTerminal ? 'Complete' : `${stage.kind === 'verify' ? 'Verify' : 'Save'} & send to ${nextStageLabel}`}
              </Button>
            )}

            {sendBackOptions.length > 0 && !stage.isTerminal && (
              <div className="flex items-center gap-2">
                <Select value={sendBackTo} onChange={e => setSendBackTo(e.target.value)} className="sm:w-56">
                  <option value="">Send back to...</option>
                  {sendBackOptions.map(k => <option key={k} value={k}>{stageName(k)}</option>)}
                </Select>
                <Button variant="secondary" disabled={!sendBackTo || busy} onClick={() => submitStage('returned')}>
                  Send back
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Trail ────────────────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold text-gray-900 mb-4">History</h2>
        {(application.stageHistory || []).length === 0 ? (
          <p className="text-sm text-gray-500">Nothing recorded yet.</p>
        ) : (
          <ol className="space-y-4">
            {application.stageHistory.map((entry, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#5b21b6] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">
                    <strong>{entry.stageName || stageName(entry.stageKey)}</strong>
                    <span className="text-gray-500"> — {entry.action}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.actorName || 'System'}
                    {entry.at && ` · ${new Date(entry.at).toLocaleString()}`}
                  </p>
                  {entry.comment && <p className="text-sm text-gray-700 mt-1">{entry.comment}</p>}
                  {entry.data && Object.keys(entry.data).length > 0 && (
                    <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                      {Object.entries(entry.data).map(([k, v]) => (
                        <li key={k}><span className="text-gray-400">{captureLabel(entry.stageKey, k)}:</span> {String(v)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this application?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This removes the application and its history. The access link it came from will be
          blocked rather than reopened. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
