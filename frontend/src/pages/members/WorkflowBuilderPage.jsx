import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2, Workflow } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, ErrorState, Field, IconButton, Input, Modal, PageHeader, Select,
  Spinner, Tabs, ToggleRow
} from '../../components/members/ui'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

const STAGE_KINDS = [
  { value: 'verify', label: 'Verify — review, comment and forward' },
  { value: 'marker', label: 'Marker — record an external event (Party School, Ameer Mulakath…)' },
  { value: 'decision', label: 'Decision — approve, reject or hold' },
  { value: 'finalize', label: 'Finalize — assign the member ID and dates' }
]

const CAPTURE_TYPES = ['text', 'number', 'date', 'yesno', 'textarea']

const blankStage = (order) => ({
  key: '', name: '', nameMl: '', order,
  actorRoleKey: '', kind: 'verify',
  nextStageKey: '', allowedNextStageKeys: [],
  skipWhen: '', skipToStageKey: '', skipFillsRoleKeys: [],
  captureFields: [], isTerminal: false
})

/**
 * Both application types have their own pipeline. Stages, the role that acts at
 * each, and where each one forwards to are all data — the seeded Rukn and Karkun
 * flows can be reshaped here without a code change.
 */
export default function WorkflowBuilderPage() {
  const [formType, setFormType] = useState('rukn')
  const [stages, setStages] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [removeIndex, setRemoveIndex] = useState(null)

  const load = (type) => {
    setLoading(true)
    Promise.all([api.get(`/workflows/${type}`), api.get('/admin/roles')])
      .then(([wfRes, roleRes]) => {
        setStages(wfRes.data.workflow?.stages || [])
        setRoles((roleRes.data.roles || []).filter(r => r.isActive))
        setDirty(false)
        setError('')
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setStages([])
          setError('')
        } else {
          const message = apiError(err, 'Failed to load the workflow')
          toast.error(message)
          setError(message)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => load(formType), [formType])

  // Warn on tab close/refresh while edits haven't been saved yet — the page
  // itself has no "back" control, only nav-away, so this is the one point we
  // can reliably intercept without a data-router navigation blocker.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const updateStages = (updater) => { setDirty(true); setStages(updater) }

  const stageOptions = useMemo(
    () => stages.filter(s => s.key).map(s => ({ key: s.key, name: s.name || s.key })),
    [stages]
  )

  const update = (index, patch) =>
    updateStages(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= stages.length) return
    const next = [...stages]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateStages(next.map((s, i) => ({ ...s, order: i + 1 })))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/workflows/${formType}`, { stages })
      toast.success('Workflow saved')
      load(formType)
    } catch (err) {
      toast.error(apiError(err, 'Could not save the workflow'))
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const { data } = await api.post(`/workflows/${formType}/reset`)
      setStages(data.workflow.stages || [])
      setDirty(false)
      toast.success('Restored the default pipeline')
    } catch (err) {
      toast.error(apiError(err, 'Could not reset the workflow'))
    } finally {
      setSaving(false)
      setConfirmReset(false)
    }
  }

  // Capture-field edits all rewrite one entry of the stage's captureFields array.
  const updateCapture = (stageIndex, captureIndex, patch) => update(stageIndex, {
    captureFields: stages[stageIndex].captureFields.map((c, x) => (x === captureIndex ? { ...c, ...patch } : c))
  })

  return (
    <div>
      <PageHeader
        title="Workflows"
        subtitle="The stages each application passes through, and which role acts at each one."
        hideTitleOnMobile
      />

      <Tabs
        className="mb-3 sm:mb-4"
        tabs={['rukn', 'karkoon'].map(type => ({ value: type, label: FORM_TYPE_LABEL[type] }))}
        value={formType}
        onChange={setFormType}
      />

      {loading ? <Spinner label="Loading workflow..." /> : error ? (
        <Card>
          <ErrorState message={error} onRetry={() => load(formType)} />
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {stages.length === 0 && (
            <Card>
              <EmptyState
                icon={Workflow}
                title="No stages yet"
                message="Add the first stage below, or reset to the default pipeline."
              />
            </Card>
          )}

          {stages.map((stage, i) => (
            <Card key={i} as="section" className="overflow-hidden">
              {/* Header strip: position, name and reorder / remove actions */}
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-xs font-bold text-royal-700">
                    {i + 1}
                  </span>
                  <h2 className="min-w-0 text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                    {stage.name || 'Untitled stage'}
                  </h2>
                </div>
                <div className="-mr-2 flex shrink-0 items-center sm:-mr-1">
                  <IconButton icon={ArrowUp} label="Move stage up" onClick={() => move(i, -1)} disabled={i === 0} />
                  <IconButton icon={ArrowDown} label="Move stage down" onClick={() => move(i, 1)} disabled={i === stages.length - 1} />
                  <IconButton icon={Trash2} label="Remove stage" tone="danger" onClick={() => setRemoveIndex(i)} />
                </div>
              </div>

              <div className="space-y-4 px-4 py-4 sm:px-5">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label="Stage key" required hint="Referenced by other stages. Avoid changing it once applications exist.">
                    <Input value={stage.key} onChange={e => update(i, { key: e.target.value })} />
                  </Field>

                  <Field label="Stage name" required>
                    <Input value={stage.name} onChange={e => update(i, { name: e.target.value })} />
                  </Field>

                  <Field label="Acting role" required>
                    <Select value={stage.actorRoleKey || ''} onChange={e => update(i, { actorRoleKey: e.target.value })}>
                      <option value="">Select a role</option>
                      {roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                    </Select>
                  </Field>

                  <Field label="Stage type">
                    <Select value={stage.kind || 'verify'} onChange={e => update(i, { kind: e.target.value })}>
                      {STAGE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </Select>
                  </Field>

                  <Field label="Forwards to" hint="Where it goes when the actor completes this stage.">
                    <Select
                      value={stage.nextStageKey || ''}
                      onChange={e => update(i, { nextStageKey: e.target.value })}
                      disabled={stage.isTerminal}
                    >
                      <option value="">— end of workflow —</option>
                      {stageOptions.filter(s => s.key !== stage.key).map(s => (
                        <option key={s.key} value={s.key}>{s.name}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Can also send to" hint="Comma-separated stage keys, for send-backs and branches.">
                    <Input
                      value={(stage.allowedNextStageKeys || []).join(', ')}
                      onChange={e => update(i, {
                        allowedNextStageKeys: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                      })}
                    />
                  </Field>
                </div>

                <ToggleRow
                  checked={Boolean(stage.isTerminal)}
                  onChange={checked => update(i, { isTerminal: checked, nextStageKey: checked ? '' : stage.nextStageKey })}
                  label="This is the last stage"
                  description="Nothing forwards out of it."
                />

                <div className="border-t border-line pt-4">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Conditional skip</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Condition">
                      <Select value={stage.skipWhen || ''} onChange={e => update(i, { skipWhen: e.target.value })}>
                        <option value="">None</option>
                        <option value="actorIsRukn">Actor is a Rukn</option>
                      </Select>
                    </Field>

                    <Field label="Skips to">
                      <Select
                        value={stage.skipToStageKey || ''}
                        onChange={e => update(i, { skipToStageKey: e.target.value })}
                        disabled={!stage.skipWhen}
                      >
                        <option value="">—</option>
                        {stageOptions.filter(s => s.key !== stage.key).map(s => (
                          <option key={s.key} value={s.key}>{s.name}</option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Also fills comments for" hint="Comma-separated role keys.">
                      <Input
                        value={(stage.skipFillsRoleKeys || []).join(', ')}
                        onChange={e => update(i, {
                          skipFillsRoleKeys: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                        })}
                        disabled={!stage.skipWhen}
                      />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Values collected at this stage
                    </p>
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => update(i, {
                        captureFields: [...(stage.captureFields || []), { key: '', label: '', type: 'text', required: false }]
                      })}
                      className="shrink-0"
                    >
                      <Plus size={14} /> Add value
                    </Button>
                  </div>

                  {(stage.captureFields || []).length === 0 ? (
                    <p className="rounded-xl bg-mist px-3.5 py-3 text-xs leading-relaxed text-slate-500">
                      None. Use these for things like the Rukn ID, attendance flags or a Thajdeed date.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {stage.captureFields.map((cf, ci) => (
                        <div key={ci} className="rounded-xl border border-line bg-[#fff] p-2.5 sm:p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="pl-0.5 text-xs font-semibold text-slate-500">Value {ci + 1}</span>
                            <IconButton
                              icon={Trash2}
                              label={`Remove value ${ci + 1}`}
                              tone="danger"
                              size={16}
                              className="-my-1.5 -mr-1.5"
                              onClick={() => update(i, { captureFields: stage.captureFields.filter((_, x) => x !== ci) })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_8rem_auto] lg:items-center">
                            <Input
                              aria-label="Value key"
                              placeholder="key"
                              value={cf.key}
                              onChange={e => updateCapture(i, ci, { key: e.target.value })}
                            />
                            <Input
                              aria-label="Value label"
                              placeholder="Label"
                              value={cf.label}
                              onChange={e => updateCapture(i, ci, { label: e.target.value })}
                            />
                            <Select
                              aria-label="Value type"
                              value={cf.type}
                              onChange={e => updateCapture(i, ci, { type: e.target.value })}
                            >
                              {CAPTURE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-medium text-slate-700 lg:min-h-10">
                              <input
                                type="checkbox"
                                checked={Boolean(cf.required)}
                                onChange={e => updateCapture(i, ci, { required: e.target.checked })}
                                className="h-[18px] w-[18px] shrink-0 accent-royal-600"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="soft"
            onClick={() => updateStages(prev => [...prev, blankStage(prev.length + 1)])}
            className="w-full"
          >
            <Plus size={16} /> Add stage
          </Button>
        </div>
      )}

      {/* Save bar: floats above the phone bottom nav, stays in view while editing */}
      <div className="mbr-sticky-action mt-4">
        <div className="mbr-card flex items-center justify-between gap-2 p-2.5 shadow-[0_8px_28px_rgba(11,20,48,0.16)]">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setConfirmReset(true)} disabled={saving}>
            <RotateCcw size={15} />
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset to default</span>
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={save} loading={saving}>
            {!saving && <Save size={15} />} {saving ? 'Saving...' : 'Save workflow'}
          </Button>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset to default pipeline?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={reset} loading={saving}>
              {saving ? 'Resetting...' : 'Reset pipeline'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          This immediately overwrites the current {FORM_TYPE_LABEL[formType]} pipeline with the default
          stages. This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        title="Remove this stage?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveIndex(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => { updateStages(prev => prev.filter((_, si) => si !== removeIndex)); setRemoveIndex(null) }}
            >
              Remove stage
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          "{stages[removeIndex]?.name || 'This stage'}" and its captured values will be removed from the
          pipeline. This isn't saved until you press "Save workflow".
        </p>
      </Modal>
    </div>
  )
}
