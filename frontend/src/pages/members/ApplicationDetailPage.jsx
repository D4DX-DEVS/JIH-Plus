import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Lock, Pencil, Save, X } from 'lucide-react'
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

  const nextStageLabel = useMemo(() => {
    if (!stage) return ''
    if (useSkip && stage.skipToStageKey) return stageName(stage.skipToStageKey)
    return stage.nextStageKey ? stageName(stage.nextStageKey) : 'Complete'
  }, [stage, useSkip, stageName])

  const submitStage = async (action) => {
    setBusy(true)
    try {
      const body = { action, comment, roleData: roleDraft, captured, useSkip }
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
    try {
      await api.delete(`/applications/${id}`)
      toast.success('Application deleted')
      navigate('/members/applications', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the application'))
    }
  }

  if (loading) return <Spinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  const { application, template } = data

  return (
    <div>
      <button
        onClick={() => navigate('/members/applications')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 pt-2 pb-2 -mt-2 mb-1"
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
        <Card className="p-4 mb-4 bg-[#faf5ff] border-[#ddd6fe]">
          <p className="text-sm text-gray-700">
            Currently at <strong>{stage.name}</strong>
            {myTurn ? ' — waiting on you.' : ' — waiting on another role.'}
          </p>
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
              {page.fields.map(field => {
                const key = `field_${field.id}`
                const isRoleField = Boolean(field.ownerRoleKey)
                const readOnly = field.readOnly || (!isRoleField && !editing)
                const value = isRoleField
                  ? roleDraft[key]
                  : (editing ? formDraft[key] : application.formData?.[key])

                const onChange = (val) => {
                  if (isRoleField) setRoleDraft(prev => ({ ...prev, [key]: val }))
                  else setFormDraft(prev => ({ ...prev, [key]: val }))
                }

                return (
                  <div key={field.id} className={fieldWidthClass(field)}>
                    {!['title', 'html'].includes(field.type) && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && !readOnly && <span className="text-red-500"> *</span>}
                      </label>
                    )}
                    <FieldRenderer
                      field={field}
                      value={value ?? ''}
                      onChange={onChange}
                      disabled={readOnly}
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
        <Card className="p-4 sm:p-5 mb-4">
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
                {busy ? 'Saving...' : stage.isTerminal ? 'Complete' : `Verify & send to ${nextStageLabel}`}
              </Button>
            )}

            {(stage.allowedNextStageKeys || []).length > 0 && !stage.isTerminal && (
              <div className="flex items-center gap-2">
                <Select value={sendBackTo} onChange={e => setSendBackTo(e.target.value)} className="sm:w-56">
                  <option value="">Send back to...</option>
                  {stage.allowedNextStageKeys
                    .filter(k => k !== stage.nextStageKey)
                    .map(k => <option key={k} value={k}>{stageName(k)}</option>)}
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
                        <li key={k}><span className="text-gray-400">{k}:</span> {String(v)}</li>
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
            <Button variant="danger" onClick={remove}>Delete permanently</Button>
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
