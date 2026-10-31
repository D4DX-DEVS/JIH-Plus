import React, { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  Eye,
  FileText,
  Info,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { api } from '../../utils/ihthisabi/api'
import ConfirmationModal from './ConfirmationModal'
import {
  COMMON_PLACEHOLDERS,
  LIST_STYLES,
  MEMBER_PLACEHOLDERS,
  OPS_BY_KIND,
  STATUS_OPTIONS,
  TYPE_LABELS,
  convertLegacyBlocks,
  copySections,
  defaultQuestionCondition,
  describeConditions,
  indexQuestions,
  newId,
  newSection,
  periodLabel,
  questionKind,
  renderReply,
  renderSection,
  sectionHints,
  sectionProblems,
  starterSections,
} from '../../utils/ihthisabi/replyTemplateEngine'

const HELP_KEY = 'ihReplyTemplateHelpHidden'
const readHelpHidden = () => {
  try {
    return localStorage.getItem(HELP_KEY) === '1'
  } catch {
    return false
  }
}

const formatDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Textarea with "insert" chips that drop a {placeholder} at the cursor.
function TokenTextarea({ value, onChange, tokens, placeholder, minRows = 3, label }) {
  const ref = useRef(null)
  const rows = Math.min(14, Math.max(minRows, String(value || '').split('\n').length + 1))

  const insert = (token) => {
    const el = ref.current
    const text = value || ''
    const start = el ? el.selectionStart ?? text.length : text.length
    const end = el ? el.selectionEnd ?? start : start
    onChange(text.slice(0, start) + token + text.slice(end))
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-gray-600">{label}</p>}
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {tokens.map((t) => (
          <button
            key={t.token}
            type="button"
            onClick={() => insert(t.token)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 sm:min-h-0 sm:py-1"
            title={`Insert ${t.token}`}
          >
            <Plus className="h-3 w-3" />
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="form-textarea malayalam-text text-base leading-relaxed sm:text-sm"
      />
    </div>
  )
}

function ConditionEditor({ condition, questions, questionsById, periodName, onChange, onRemove }) {
  const question = condition.type === 'question' ? questionsById.get(condition.questionId) : null
  const missing = condition.type === 'question' && !question
  const kind = questionKind(question, condition.subFieldId)
  const whoValue =
    condition.type === 'status' ? `status:${condition.status}` : missing ? 'missing' : `q:${condition.questionId}`

  const pickWho = (value) => {
    if (value.startsWith('status:')) onChange({ type: 'status', status: value.slice(7) })
    else if (value.startsWith('q:')) {
      const q = questionsById.get(value.slice(2))
      if (q) onChange(defaultQuestionCondition(q))
    }
  }

  const pickSubField = (fieldId) => {
    const sub = (question.subFields || []).find((s) => s.fieldId === fieldId)
    const nextKind = sub?.type === 'text' ? 'text' : 'number'
    const keepOp = OPS_BY_KIND[nextKind].some((o) => o.value === condition.op)
    onChange({ ...condition, subFieldId: fieldId, op: keepOp ? condition.op : OPS_BY_KIND[nextKind][0].value })
  }

  const toggleValue = (value) => {
    const chosen = new Set(condition.values || [])
    if (chosen.has(value)) chosen.delete(value)
    else chosen.add(value)
    onChange({ ...condition, values: question.options.map((o) => o.value).filter((v) => chosen.has(v)) })
  }

  const numberInput = (key, label) => (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={condition[key] ?? ''}
      onChange={(e) => onChange({ ...condition, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
      className="form-input w-24 text-base sm:text-sm"
    />
  )

  const showChips = question && (kind === 'choice' || kind === 'multi') && (condition.op === 'in' || condition.op === 'notIn')
  const showNumber = kind === 'number' && !['answered', 'blank'].includes(condition.op)

  return (
    <div className="space-y-2 rounded-xl bg-[#f5f7fa] p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <select
          value={whoValue}
          onChange={(e) => pickWho(e.target.value)}
          className="form-select min-w-0 flex-1 bg-white text-base sm:text-sm"
          aria-label="Which members"
        >
          {missing && <option value="missing">⚠ Question not in this form. Pick again</option>}
          <optgroup label="By report status">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={`status:${o.value}`}>
                {o.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={`By answer in the ${periodName} form`}>
            {questions.length === 0 && <option disabled>No form for this quarter</option>}
            {questions.map((q, i) => (
              <option key={q.questionId} value={`q:${q.questionId}`}>
                {`${i + 1}. ${q.text}`}
              </option>
            ))}
          </optgroup>
        </select>
        {onRemove && (
          <button type="button" onClick={onRemove} className="ih-action ih-action-delete" aria-label="Remove condition">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {condition.type === 'status' && (
        <p className="px-1 text-xs text-gray-500">
          {STATUS_OPTIONS.find((o) => o.value === condition.status)?.hint || 'Based on who sent their report this quarter.'}
        </p>
      )}

      {question && (
        <>
          <p className="px-1 text-[11px] text-gray-500">
            {TYPE_LABELS[question.type] || question.type} question · only members who filled the form are checked
          </p>

          {question.type === 'group' && (
            <select
              value={condition.subFieldId || ''}
              onChange={(e) => pickSubField(e.target.value)}
              className="form-select bg-white text-base sm:text-sm"
              aria-label="Which part of the question"
            >
              {!condition.subFieldId && <option value="">Choose which part…</option>}
              {(question.subFields || []).map((s) => (
                <option key={s.fieldId} value={s.fieldId}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          {kind && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={condition.op}
                onChange={(e) => onChange({ ...condition, op: e.target.value })}
                className="form-select w-auto min-w-[10rem] bg-white text-base sm:text-sm"
                aria-label="Condition"
              >
                {OPS_BY_KIND[kind].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {showNumber && numberInput('value', 'Number')}
              {showNumber && condition.op === 'between' && (
                <>
                  <span className="text-sm text-gray-500">and</span>
                  {numberInput('value2', 'Second number')}
                </>
              )}
              {condition.op === 'contains' && (
                <input
                  type="text"
                  value={(condition.values || [])[0] || ''}
                  onChange={(e) => onChange({ ...condition, values: [e.target.value] })}
                  placeholder="Word to look for"
                  className="form-input min-w-0 flex-1 bg-white text-base sm:text-sm"
                />
              )}
            </div>
          )}

          {showChips && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Answers">
              {question.options.map((o) => {
                const on = (condition.values || []).includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleValue(o.value)}
                    className={`malayalam-text inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3 text-sm transition-colors sm:min-h-0 sm:py-1.5 ${
                      on ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-primary/50'
                    }`}
                  >
                    {on && <span aria-hidden>✓</span>}
                    {o.label}
                  </button>
                )
              })}
            </div>
          )}
          {showChips && (condition.values || []).length > 1 && (
            <p className="px-1 text-[11px] text-gray-500">Members who gave any one of the ticked answers are listed.</p>
          )}
        </>
      )}
    </div>
  )
}

function SectionCard({
  section,
  index,
  total,
  open,
  problems,
  hints,
  questions,
  questionsById,
  periodName,
  previewData,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  onInsertBelow,
}) {
  const isMembers = section.kind === 'members'
  const rendered = previewData ? renderSection(section, previewData, questionsById) : null
  const matched = rendered?.matched || []
  const unitName = previewData?.unit
  const conditions = section.conditions || []
  const hasQuestionCondition = conditions.some((c) => c.type === 'question')

  const setCondition = (i, next) => onChange({ ...section, conditions: conditions.map((c, j) => (j === i ? next : c)) })
  const removeCondition = (i) => onChange({ ...section, conditions: conditions.filter((_, j) => j !== i) })
  const addCondition = () =>
    onChange({
      ...section,
      conditions: [...conditions, questions[0] ? defaultQuestionCondition(questions[0]) : { type: 'status', status: 'reported' }],
    })

  const summary = isMembers
    ? describeConditions(section, questionsById)
    : (rendered?.text || section.text || 'Empty paragraph').split('\n').find((l) => l.trim()) || 'Empty paragraph'

  return (
    <li
      id={`reply-section-${section.id}`}
      className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
        problems.length ? 'border-red-300' : open ? 'border-primary/40 shadow-sm' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-start gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isMembers ? 'bg-[#e4edfb] text-[#1d4fa8]' : 'bg-[#f1f3f6] text-gray-600'
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {isMembers ? <ListChecks className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
              {isMembers ? 'Member list' : 'Text'}
            </span>
            {isMembers && previewData && (
              <span className={`ih-chip ${matched.length ? 'bg-[#e3f4ea] text-[#1e8a4c]' : 'bg-gray-100 text-gray-500'}`}>
                {matched.length} in {unitName}
              </span>
            )}
            {isMembers && previewData && !rendered?.text && <span className="ih-chip bg-gray-100 text-gray-500">left out</span>}
          </span>
          <span className={`mt-0.5 block text-sm text-gray-900 ${open ? '' : 'line-clamp-2'} ${isMembers ? '' : 'malayalam-text'}`}>
            {summary}
          </span>
          {problems.length > 0 && (
            <span className="mt-1 flex items-start gap-1 text-xs font-medium text-red-600">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              {problems[0]}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-100 px-3 pb-3 pt-4 sm:px-4">
          {isMembers ? (
            <>
              <section className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900">1. Who should be listed?</h5>
                {conditions.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>List members who match</span>
                    <select
                      value={section.match || 'all'}
                      onChange={(e) => onChange({ ...section, match: e.target.value })}
                      className="form-select w-auto text-base sm:text-sm"
                      aria-label="How conditions combine"
                    >
                      <option value="all">all of these</option>
                      <option value="any">any of these</option>
                    </select>
                  </div>
                )}
                {conditions.map((c, i) => (
                  <ConditionEditor
                    key={i}
                    condition={c}
                    questions={questions}
                    questionsById={questionsById}
                    periodName={periodName}
                    onChange={(next) => setCondition(i, next)}
                    onRemove={conditions.length > 1 ? () => removeCondition(i) : null}
                  />
                ))}
                {conditions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...section, conditions: [{ type: 'status', status: 'reported' }] })}
                    className="btn-outline w-full gap-1.5 sm:w-auto"
                  >
                    <Plus className="h-4 w-4" /> Choose members
                  </button>
                )}
                {conditions.length > 0 && conditions.length < 10 && (
                  <button
                    type="button"
                    onClick={addCondition}
                    className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-primary hover:underline sm:min-h-0"
                  >
                    <Plus className="h-4 w-4" /> Add another condition
                  </button>
                )}
                {previewData && conditions.length > 0 && (
                  <div className="rounded-xl bg-[#f0f9f8] px-3 py-2 text-xs text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {matched.length} member{matched.length === 1 ? '' : 's'} in {unitName}
                    </span>
                    {matched.length > 0 && (
                      <span className="malayalam-text">
                        {': '}
                        {matched
                          .slice(0, 8)
                          .map((m) => m.name)
                          .join(', ')}
                        {matched.length > 8 ? ` and ${matched.length - 8} more` : ''}
                      </span>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900">2. Write the sentence</h5>
                <TokenTextarea
                  value={section.text}
                  onChange={(text) => onChange({ ...section, text })}
                  tokens={[...MEMBER_PLACEHOLDERS, ...COMMON_PLACEHOLDERS.slice(0, 5)]}
                  placeholder="e.g. {names} എന്നിവർ ഖുർആൻ പഠനം പൂർത്തിയാക്കിയിട്ടില്ല."
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Names as</span>
                    <div className="flex items-center gap-0.5 rounded-full bg-black/[0.045] p-1">
                      {LIST_STYLES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => onChange({ ...section, listStyle: s.value })}
                          className={`ih-segment-btn ${section.listStyle === s.value ? 'ih-segment-btn-active' : ''}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex min-h-[40px] items-center gap-2 text-sm text-gray-700 sm:min-h-0">
                    <span className="text-xs font-medium text-gray-600">At most</span>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="All"
                      value={section.limit ?? ''}
                      onChange={(e) => onChange({ ...section, limit: e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : null })}
                      className="form-input w-20 text-base sm:text-sm"
                    />
                    <span className="text-xs text-gray-600">names</span>
                  </label>
                  {hasQuestionCondition && (
                    <label className="flex min-h-[40px] items-center gap-2 text-sm text-gray-700 sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={!!section.showValue}
                        onChange={(e) => onChange({ ...section, showValue: e.target.checked })}
                        className="form-checkbox"
                      />
                      Show each member's answer, e.g. NAME (3)
                    </label>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900">3. If nobody matches</h5>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-5">
                  {[
                    { value: 'skip', label: 'Leave this paragraph out' },
                    { value: 'text', label: 'Show this text instead' },
                  ].map((o) => (
                    <label key={o.value} className="flex min-h-[40px] items-center gap-2 text-sm text-gray-700 sm:min-h-0">
                      <input
                        type="radio"
                        name={`empty-${section.id}`}
                        checked={(section.emptyMode || 'skip') === o.value}
                        onChange={() => onChange({ ...section, emptyMode: o.value })}
                        className="form-radio"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                {section.emptyMode === 'text' && (
                  <TokenTextarea
                    value={section.emptyText}
                    onChange={(emptyText) => onChange({ ...section, emptyText })}
                    tokens={COMMON_PLACEHOLDERS.slice(0, 5)}
                    minRows={2}
                    placeholder="e.g. എല്ലാ അംഗങ്ങളും ഇക്കാര്യത്തിൽ നല്ല ശ്രദ്ധ പുലർത്തിയിട്ടുണ്ട്."
                  />
                )}
              </section>
            </>
          ) : (
            <TokenTextarea
              label="Paragraph text"
              value={section.text}
              onChange={(text) => onChange({ ...section, text })}
              tokens={COMMON_PLACEHOLDERS}
              minRows={4}
              placeholder="Type the text exactly as it should appear in the reply."
            />
          )}

          {(problems.length > 0 || hints.length > 0) && (
            <ul className="space-y-1">
              {problems.map((p) => (
                <li key={p} className="flex items-start gap-1.5 text-xs font-medium text-red-600">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {p}
                </li>
              ))}
              {hints.map((h) => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-[#a06a12]">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {h}
                </li>
              ))}
            </ul>
          )}

          {previewData && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">How it reads for {unitName}</p>
              <div className="malayalam-text whitespace-pre-wrap rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm leading-relaxed text-gray-900">
                {rendered?.text || <span className="italic text-gray-400">Left out of the reply (nobody matches)</span>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="ih-action ih-action-neutral" aria-label="Move up" title="Move up">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              className="ih-action ih-action-neutral"
              aria-label="Move down"
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDuplicate} className="ih-action ih-action-view" aria-label="Duplicate" title="Duplicate">
              <CopyPlus className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDelete} className="ih-action ih-action-delete" aria-label="Delete paragraph" title="Delete paragraph">
              <Trash2 className="h-4 w-4" />
            </button>
            <span className="ml-auto flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onInsertBelow('text')}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:min-h-0 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Text below
              </button>
              <button
                type="button"
                onClick={() => onInsertBelow('members')}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:min-h-0 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Member list below
              </button>
            </span>
          </div>
        </div>
      )}
    </li>
  )
}

function StartChooser({ periodName, questionCount, savedTemplates, legacyBlocks, onStarter, onCopy, onBlank, onCancel }) {
  const sources = [
    ...savedTemplates.map((t) => ({ key: `${t.year}-${t.quarter}`, label: `${periodLabel(t.year, t.quarter)} template` })),
    ...(legacyBlocks?.length ? [{ key: 'legacy', label: 'Old template (before quarterly templates)' }] : []),
  ]
  const [source, setSource] = useState(sources[0]?.key || '')
  const [copying, setCopying] = useState(false)

  const copy = async () => {
    setCopying(true)
    try {
      await onCopy(source)
    } finally {
      setCopying(false)
    }
  }

  const row = 'flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left sm:p-4'
  const icon = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full'
  return (
    <div className="ih-surface p-3 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-gray-900">How do you want to start the {periodName} reply?</h4>
          <p className="mt-0.5 text-sm text-gray-500">You can change every paragraph afterwards. Nothing is saved until you press Save.</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="ih-action ih-action-neutral" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        <button type="button" onClick={onStarter} className={`${row} transition-colors hover:border-primary`}>
          <span className={`${icon} bg-primary/10 text-primary`}>
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Ready-made draft (recommended)</span>
            <span className="block text-xs text-gray-500">
              Greeting, who sent and who did not, then one paragraph for each of the {questionCount} questions in this quarter&apos;s form.
            </span>
          </span>
        </button>
        <div className={`${row} flex-wrap`}>
          <span className={`${icon} bg-[#e4edfb] text-[#1d4fa8]`}>
            <Copy className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Copy a saved template</span>
            <span className="block text-xs text-gray-500">Reuse earlier wording. Questions are matched to this quarter&apos;s form by their text.</span>
          </span>
          {sources.length ? (
            <div className="flex w-full gap-2 sm:w-auto sm:min-w-[18rem]">
              <select value={source} onChange={(e) => setSource(e.target.value)} className="form-select min-w-0 flex-1 text-base sm:text-sm" aria-label="Template to copy">
                {sources.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={copy} disabled={!source || copying} className="btn-primary shrink-0 px-4">
                {copying ? 'Copying…' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="w-full text-xs italic text-gray-400 sm:w-auto">No other templates saved yet.</span>
          )}
        </div>
        <button type="button" onClick={onBlank} className={`${row} transition-colors hover:border-primary`}>
          <span className={`${icon} bg-gray-100 text-gray-500`}>
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Start blank</span>
            <span className="block text-xs text-gray-500">Begin with one empty paragraph and build the reply yourself.</span>
          </span>
        </button>
      </div>
    </div>
  )
}

function PreviewPanel({ units, unit, onUnitChange, data, loading, sections, onClose }) {
  const byDistrict = useMemo(() => {
    const groups = new Map()
    units.forEach((u) => {
      const key = u.district || 'Other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(u)
    })
    return [...groups.entries()]
  }, [units])
  const text = data ? renderReply(sections, data) : ''
  const reported = data ? data.counts.form + data.counts.alternative : 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-2 border-b border-gray-100 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Eye className="h-4 w-4 text-primary" /> Live preview
          </h4>
          {onClose && (
            <button type="button" onClick={onClose} className="ih-action ih-action-neutral" aria-label="Close preview">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select value={unit} onChange={(e) => onUnitChange(e.target.value)} className="form-select text-base sm:text-sm" aria-label="Unit to preview with">
          {!unit && <option value="">Choose a unit…</option>}
          {byDistrict.map(([district, list]) => (
            <optgroup key={district} label={district}>
              {list.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.unit}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {data && (
          <p className="text-xs text-gray-500">
            {reported} of {data.counts.total} members submitted
            {data.counts.alternative ? ` (${data.counts.alternative} Aged / Patient)` : ''} · {data.counts.pending} not submitted
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-gray-100" style={{ width: `${90 - i * 9}%` }} />
            ))}
          </div>
        ) : !data ? (
          <p className="text-sm text-gray-500">Pick a unit to see the reply with its real answers.</p>
        ) : text ? (
          <div className="malayalam-text whitespace-pre-wrap text-[13px] leading-[1.8] text-gray-900">{text}</div>
        ) : (
          <p className="text-sm italic text-gray-400">Nothing to show yet. Add a paragraph.</p>
        )}
      </div>
    </div>
  )
}

/**
 * Editor for one quarter's reply template. The draft lives in the parent
 * (UnitReplyPanel) so switching to "Send replies" and back keeps it.
 */
export default function ReplyTemplateBuilder({
  year,
  quarter,
  info,
  sections,
  onChange,
  dirty,
  saving,
  savedAt,
  onSave,
  onDiscard,
  preferredUnit,
}) {
  const questions = useMemo(() => info?.form?.questions || [], [info])
  const questionsById = useMemo(() => indexQuestions(questions), [questions])
  const periodName = periodLabel(year, quarter)
  const [openId, setOpenId] = useState(null)
  const [choosing, setChoosing] = useState(false)
  const [pendingReplace, setPendingReplace] = useState(null)
  const [previewUnit, setPreviewUnit] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSheet, setPreviewSheet] = useState(false)
  const [helpHidden, setHelpHidden] = useState(readHelpHidden)

  useEffect(() => {
    setPreviewUnit(preferredUnit || info?.sampleUnit || '')
    setOpenId(null)
    setChoosing(false)
    // Re-pick the preview unit only when the quarter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter, info?.sampleUnit])

  useEffect(() => {
    if (!previewUnit) {
      setPreviewData(null)
      return undefined
    }
    let cancelled = false
    setPreviewLoading(true)
    api
      .get('/ihthisabi/admin/unit-reply-data', { params: { unit: previewUnit, year, quarter } })
      .then((r) => !cancelled && setPreviewData(r.data.data))
      .catch(() => {
        if (cancelled) return
        setPreviewData(null)
        toast.error('Could not load preview data for this unit')
      })
      .finally(() => !cancelled && setPreviewLoading(false))
    return () => {
      cancelled = true
    }
  }, [previewUnit, year, quarter])

  const problemsById = useMemo(() => {
    const map = {}
    sections.forEach((s) => {
      map[s.id] = sectionProblems(s, questionsById)
    })
    return map
  }, [sections, questionsById])
  const problemCount = sections.filter((s) => problemsById[s.id]?.length).length

  const focusSection = (id) => {
    setOpenId(id)
    requestAnimationFrame(() => document.getElementById(`reply-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const apply = (next, note) => {
    const run = () => {
      onChange(next)
      setChoosing(false)
      setPendingReplace(null)
      const firstProblem = next.find((s) => sectionProblems(s, questionsById).length)
      setOpenId(firstProblem ? firstProblem.id : null)
      if (note) toast(note, { icon: '⚠️', duration: 6000 })
    }
    if (sections.length > 0) setPendingReplace(() => run)
    else run()
  }

  const copyFrom = async (key) => {
    if (key === 'legacy') {
      const { sections: next, needsMembers } = convertLegacyBlocks(info.legacyBlocks)
      apply(next, needsMembers ? `Wording imported. ${needsMembers} member paragraphs need you to choose who to list.` : null)
      return
    }
    const [y, q] = key.split('-').map(Number)
    try {
      const r = await api.get('/ihthisabi/admin/reply-template', { params: { year: y, quarter: q } })
      const src = r.data.data
      const { sections: next, unmatched } = copySections(src.template?.sections || [], src.form?.questions || [], questions)
      apply(next, unmatched ? `Copied. ${unmatched} question or answer choices did not match the ${periodName} form. Check the paragraphs marked in red.` : null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not copy that template')
    }
  }

  const update = (id, next) => onChange(sections.map((s) => (s.id === id ? next : s)))
  const move = (index, dir) => {
    const next = [...sections]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  const insertAt = (index, kind) => {
    const section = newSection(kind)
    const next = [...sections]
    next.splice(index, 0, section)
    onChange(next)
    focusSection(section.id)
  }
  const duplicate = (index) => {
    const copy = { ...JSON.parse(JSON.stringify(sections[index])), id: newId() }
    const next = [...sections]
    next.splice(index + 1, 0, copy)
    onChange(next)
    focusSection(copy.id)
  }
  const remove = (index) => {
    const before = sections
    onChange(sections.filter((_, i) => i !== index))
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          Paragraph {index + 1} removed
          <button
            type="button"
            className="font-semibold text-primary"
            onClick={() => {
              onChange(before)
              toast.dismiss(t.id)
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 6000 },
    )
  }

  const save = () => {
    const first = sections.find((s) => problemsById[s.id]?.length)
    if (first) {
      toast.error(`${problemCount} paragraph${problemCount === 1 ? ' needs' : 's need'} attention before saving`)
      focusSection(first.id)
      return
    }
    onSave(sections)
  }

  const hideHelp = () => {
    setHelpHidden(true)
    try {
      localStorage.setItem(HELP_KEY, '1')
    } catch {
      /* preference only */
    }
  }

  const showChooser = choosing || sections.length === 0
  const previewProps = {
    units: info?.units || [],
    unit: previewUnit,
    onUnitChange: setPreviewUnit,
    data: previewData,
    loading: previewLoading,
    sections,
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-5">
      <div className="space-y-3 sm:space-y-4">
        <div className="ih-surface p-3 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">Reply template · {periodName}</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {info?.form
                  ? `${info.form.title} · ${questions.length} questions · ${info.submissionCount.toLocaleString('en-IN')} reports`
                  : `No report form for ${periodName}`}
              </p>
            </div>
            {sections.length > 0 && !choosing && (
              <button type="button" onClick={() => setChoosing(true)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-700 hover:bg-gray-200 sm:min-h-0 sm:py-2">
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            )}
          </div>

          {!info?.form && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdf1dc] px-3 py-2 text-xs text-[#a06a12]">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              There is no report form for {periodName}, so paragraphs can only list members by report status (submitted / not submitted).
            </p>
          )}
          {info?.form?.status === 'draft' && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdf1dc] px-3 py-2 text-xs text-[#a06a12]">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              The {periodName} form is still a draft. Members cannot submit until it is published.
            </p>
          )}

          {!helpHidden && (
            <div className="mt-3 rounded-xl bg-[#f0f9f8] p-3 text-xs leading-relaxed text-gray-700">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">How a template works</p>
                <button type="button" onClick={hideHelp} className="-m-2 p-2 text-gray-400 hover:text-gray-600" aria-label="Hide help">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>
                  The reply is built from paragraphs, top to bottom. <strong>Text</strong> paragraphs appear as you type them.
                </li>
                <li>
                  <strong>Member list</strong> paragraphs pick members by report status or by their answer to a question, then put their names where you
                  place <code className="rounded bg-white px-1">{'{names}'}</code>.
                </li>
                <li>If nobody matches, that paragraph is left out (or replaced by text you choose).</li>
                <li>The preview shows the reply for a real unit, so you can check it before saving.</li>
              </ul>
            </div>
          )}
        </div>

        {showChooser ? (
          <StartChooser
            periodName={periodName}
            questionCount={questions.length}
            savedTemplates={info?.savedTemplates || []}
            legacyBlocks={info?.legacyBlocks}
            onStarter={() => apply(starterSections(questions))}
            onCopy={copyFrom}
            onBlank={() => apply([newSection('text')])}
            onCancel={sections.length > 0 ? () => setChoosing(false) : null}
          />
        ) : (
          <>
            <ol className="space-y-2">
              {sections.map((s, i) => (
                <SectionCard
                  key={s.id}
                  section={s}
                  index={i}
                  total={sections.length}
                  open={openId === s.id}
                  problems={problemsById[s.id] || []}
                  hints={sectionHints(s)}
                  questions={questions}
                  questionsById={questionsById}
                  periodName={periodName}
                  previewData={previewData}
                  onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                  onChange={(next) => update(s.id, next)}
                  onMove={(dir) => move(i, dir)}
                  onDuplicate={() => duplicate(i)}
                  onDelete={() => remove(i)}
                  onInsertBelow={(kind) => insertAt(i + 1, kind)}
                />
              ))}
            </ol>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => insertAt(sections.length, 'text')} className="btn-outline gap-1.5 rounded-full bg-white">
                <Type className="h-4 w-4" /> Add text
              </button>
              <button type="button" onClick={() => insertAt(sections.length, 'members')} className="btn-outline gap-1.5 rounded-full bg-white">
                <ListChecks className="h-4 w-4" /> Add member list
              </button>
            </div>
          </>
        )}

        {sections.length > 0 && (
          <div className="sticky bottom-3 z-20 lg:bottom-4">
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur">
              <p className="min-w-0 flex-1 px-1 text-xs leading-tight text-gray-600">
                <span className={`block truncate font-medium ${dirty ? 'text-[#a06a12]' : 'text-gray-900'}`}>
                  {dirty ? 'Unsaved changes' : savedAt ? 'All changes saved' : 'Not saved yet'}
                </span>
                <span className="block truncate">
                  {problemCount > 0
                    ? `${problemCount} paragraph${problemCount === 1 ? ' needs' : 's need'} attention`
                    : savedAt && !dirty
                      ? formatDateTime(savedAt)
                      : `${sections.length} paragraphs`}
                </span>
              </p>
              <button type="button" onClick={() => setPreviewSheet(true)} className="ih-action ih-action-view lg:hidden" aria-label="Preview reply">
                <Eye className="h-4 w-4" />
              </button>
              {dirty && onDiscard && (
                <button type="button" onClick={onDiscard} className="btn-ghost px-3 text-xs sm:text-sm">
                  Discard
                </button>
              )}
              <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary shrink-0 gap-1.5 px-4">
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden lg:sticky lg:top-4 lg:block">
        <div className="ih-surface h-[calc(100vh-7rem)] overflow-hidden">
          <PreviewPanel {...previewProps} />
        </div>
      </aside>

      {previewSheet && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Reply preview">
          <PreviewPanel {...previewProps} onClose={() => setPreviewSheet(false)} />
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingReplace}
        onClose={() => setPendingReplace(null)}
        onConfirm={() => pendingReplace && pendingReplace()}
        title="Replace the current paragraphs?"
        message={`The ${sections.length} paragraphs you have now will be replaced. You can still press Discard afterwards to go back to the last saved template.`}
        confirmText="Replace"
        variant="warning"
      />
    </div>
  )
}
