import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, Field, Input, PageHeader, Select, Spinner, Tabs, Textarea
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
 * each, and where each one forwards to are all data — the seeded Rukn and Karkoon
 * flows can be reshaped here without a code change.
 */
export default function WorkflowBuilderPage() {
  const [formType, setFormType] = useState('rukn')
  const [stages, setStages] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = (type) => {
    setLoading(true)
    Promise.all([api.get(`/workflows/${type}`), api.get('/admin/roles')])
      .then(([wfRes, roleRes]) => {
        setStages(wfRes.data.workflow?.stages || [])
        setRoles((roleRes.data.roles || []).filter(r => r.isActive))
      })
      .catch(err => {
        if (err.response?.status === 404) setStages([])
        else toast.error(apiError(err, 'Failed to load the workflow'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => load(formType), [formType])

  const stageOptions = useMemo(
    () => stages.filter(s => s.key).map(s => ({ key: s.key, name: s.name || s.key })),
    [stages]
  )

  const update = (index, patch) =>
    setStages(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= stages.length) return
    const next = [...stages]
    ;[next[index], next[target]] = [next[target], next[index]]
    setStages(next.map((s, i) => ({ ...s, order: i + 1 })))
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
      toast.success('Restored the default pipeline')
    } catch (err) {
      toast.error(apiError(err, 'Could not reset the workflow'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        subtitle="The stages each application passes through, and which role acts at each one."
        actions={
          <>
            <Button variant="secondary" onClick={reset} disabled={saving}>
              <RotateCcw size={15} /> Reset to default
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save workflow'}
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        tabs={['rukn', 'karkoon'].map(type => ({ value: type, label: FORM_TYPE_LABEL[type] }))}
        value={formType}
        onChange={setFormType}
      />

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <Card key={i} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 flex-shrink-0 rounded-full bg-[#ede9fe] text-[#5b21b6] text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-900 truncate">{stage.name || 'Untitled stage'}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                    <ArrowUp size={15} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                    <ArrowDown size={15} />
                  </button>
                  <button onClick={() => setStages(prev => prev.filter((_, si) => si !== i))} className="p-2 text-gray-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
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

              <label className="flex items-start gap-2 mt-4 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(stage.isTerminal)}
                  onChange={e => update(i, { isTerminal: e.target.checked, nextStageKey: e.target.checked ? '' : stage.nextStageKey })}
                  className="mt-0.5"
                />
                <span>This is the last stage — nothing forwards out of it.</span>
              </label>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Conditional skip</p>
                <div className="grid sm:grid-cols-3 gap-3">
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

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">
                    Values collected at this stage
                  </p>
                  <button
                    onClick={() => update(i, {
                      captureFields: [...(stage.captureFields || []), { key: '', label: '', type: 'text', required: false }]
                    })}
                    className="text-xs text-[#5b21b6] hover:underline py-1.5 px-1 -mr-1"
                  >
                    + Add value
                  </button>
                </div>

                {(stage.captureFields || []).length === 0 ? (
                  <p className="text-xs text-gray-400">
                    None. Use these for things like the Rukn ID, attendance flags or a Thajdeed date.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stage.captureFields.map((cf, ci) => (
                      <div key={ci} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-2 sm:col-span-3"
                          placeholder="key"
                          value={cf.key}
                          onChange={e => update(i, {
                            captureFields: stage.captureFields.map((c, x) => x === ci ? { ...c, key: e.target.value } : c)
                          })}
                        />
                        <Input
                          className="col-span-2 sm:col-span-4"
                          placeholder="Label"
                          value={cf.label}
                          onChange={e => update(i, {
                            captureFields: stage.captureFields.map((c, x) => x === ci ? { ...c, label: e.target.value } : c)
                          })}
                        />
                        <Select
                          className="col-span-1 sm:col-span-2"
                          value={cf.type}
                          onChange={e => update(i, {
                            captureFields: stage.captureFields.map((c, x) => x === ci ? { ...c, type: e.target.value } : c)
                          })}
                        >
                          {CAPTURE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                        <label className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-xs text-gray-600 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(cf.required)}
                            onChange={e => update(i, {
                              captureFields: stage.captureFields.map((c, x) => x === ci ? { ...c, required: e.target.checked } : c)
                            })}
                          />
                          Required
                        </label>
                        <button
                          onClick={() => update(i, { captureFields: stage.captureFields.filter((_, x) => x !== ci) })}
                          className="col-span-2 sm:col-span-1 text-gray-400 hover:text-red-600 justify-self-end p-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}

          <Button
            variant="secondary"
            onClick={() => setStages(prev => [...prev, blankStage(prev.length + 1)])}
            className="w-full"
          >
            <Plus size={16} /> Add stage
          </Button>
        </div>
      )}
    </div>
  )
}
