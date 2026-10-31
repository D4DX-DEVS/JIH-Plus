/**
 * Unit reply template engine.
 *
 * A template belongs to one report quarter and is an ordered list of
 * paragraphs ("sections"):
 *   { kind: 'text', text }
 *       Fixed text. Placeholders: {unit} {district} {area} {quarter} {year}
 *       {total} {submitted} {pending}
 *   { kind: 'members', conditions, match, text, emptyMode, emptyText,
 *     listStyle, showValue, limit }
 *       Lists the unit members who match the conditions ('all' or 'any' of
 *       them). `text` adds {names} and {count}. When nobody matches, the
 *       paragraph is left out (emptyMode 'skip') or replaced by emptyText.
 *
 * A condition is either
 *   { type: 'status', status: 'reported'|'form'|'alternative'|'pending'|'all' }
 *   { type: 'question', questionId, subFieldId?, op, values?, value?, value2? }
 *
 * `data` comes from GET /ihthisabi/admin/unit-reply-data:
 *   { unit, district, area, year, quarter, form: { questions }, members:
 *     [{ name, status: 'form'|'alternative'|'pending', altType, answers }] }
 *
 * The backend validates saved templates with the same rules
 * (sanitizeReplySections in backend/routes/ihthisabi/admin.js).
 */

export const QUARTER_MONTHS = {
  1: 'ജനുവരി - മാർച്ച്',
  2: 'ഏപ്രിൽ - ജൂൺ',
  3: 'ജൂലൈ - സെപ്റ്റംബർ',
  4: 'ഒക്ടോബർ - ഡിസംബർ',
}

export const QUARTER_LABELS = {
  1: 'Q1 · Jan–Mar',
  2: 'Q2 · Apr–Jun',
  3: 'Q3 · Jul–Sep',
  4: 'Q4 · Oct–Dec',
}

export const periodLabel = (year, quarter) => `Q${quarter} ${year}`

export const STATUS_OPTIONS = [
  { value: 'reported', label: 'Submitted the report', hint: 'Form or Aged / Patient report' },
  { value: 'form', label: 'Filled the report form', hint: 'Leaves out Aged / Patient reports' },
  { value: 'alternative', label: 'Sent an Aged / Patient report' },
  { value: 'pending', label: 'Have NOT submitted' },
  { value: 'all', label: 'All members of the unit' },
]

export const COMMON_PLACEHOLDERS = [
  { token: '{unit}', label: 'Unit name' },
  { token: '{district}', label: 'District' },
  { token: '{area}', label: 'Area' },
  { token: '{quarter}', label: 'Quarter months' },
  { token: '{year}', label: 'Year' },
  { token: '{total}', label: 'Total members' },
  { token: '{submitted}', label: 'Submitted count' },
  { token: '{pending}', label: 'Not submitted count' },
]

export const MEMBER_PLACEHOLDERS = [
  { token: '{names}', label: 'Member names' },
  { token: '{count}', label: 'Number of members' },
]

export const LIST_STYLES = [
  { value: 'comma', label: 'A, B, C' },
  { value: 'lines', label: 'One per line' },
  { value: 'numbered', label: '1. 2. 3.' },
]

// Conditions offered for each kind of answer, in menu order.
export const OPS_BY_KIND = {
  choice: [
    { value: 'in', label: 'answered' },
    { value: 'notIn', label: 'did not answer' },
    { value: 'answered', label: 'answered anything' },
    { value: 'blank', label: 'left it blank' },
  ],
  multi: [
    { value: 'in', label: 'ticked any of' },
    { value: 'notIn', label: 'ticked none of' },
    { value: 'answered', label: 'ticked something' },
    { value: 'blank', label: 'left it blank' },
  ],
  number: [
    { value: 'eq', label: 'is equal to' },
    { value: 'ne', label: 'is not equal to' },
    { value: 'gt', label: 'is more than' },
    { value: 'gte', label: 'is at least' },
    { value: 'lt', label: 'is less than' },
    { value: 'lte', label: 'is at most' },
    { value: 'between', label: 'is between' },
    { value: 'answered', label: 'was filled in' },
    { value: 'blank', label: 'was left blank' },
  ],
  text: [
    { value: 'answered', label: 'was filled in' },
    { value: 'blank', label: 'was left blank' },
    { value: 'contains', label: 'contains the word' },
  ],
}

export const TYPE_LABELS = {
  radio: 'Single choice',
  dropdown: 'Dropdown',
  checkbox: 'Tick boxes',
  number: 'Number',
  star: 'Star rating',
  text: 'Short text',
  textarea: 'Long text',
  group: 'Several numbers',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0
export const newId = () => `s${Date.now().toString(36)}${(idCounter++).toString(36)}`

// Answers and option values are compared loosely: the form builder leaves
// invisible joiners and stray spaces in Malayalam text.
export const normalizeValue = (value) =>
  String(value ?? '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0)

export function questionKind(question, subFieldId) {
  if (!question) return null
  switch (question.type) {
    case 'radio':
    case 'dropdown':
      return 'choice'
    case 'checkbox':
      return 'multi'
    case 'number':
    case 'star':
      return 'number'
    case 'text':
    case 'textarea':
      return 'text'
    case 'group': {
      const sub = (question.subFields || []).find((s) => s.fieldId === subFieldId)
      if (!sub) return null
      return sub.type === 'text' ? 'text' : 'number'
    }
    default:
      return null
  }
}

export const indexQuestions = (questions = []) => new Map(questions.map((q) => [q.questionId, q]))

function answerFor(member, condition) {
  const raw = member.answers ? member.answers[condition.questionId] : undefined
  if (!condition.subFieldId) return raw
  return raw && typeof raw === 'object' ? raw[condition.subFieldId] : undefined
}

function toNumber(value) {
  const v = Array.isArray(value) ? value[0] : value
  if (isBlank(v)) return NaN
  return Number(v)
}

export function matchesCondition(member, condition, questionsById) {
  if (condition.type === 'status') {
    switch (condition.status) {
      case 'reported':
        return member.status === 'form' || member.status === 'alternative'
      case 'form':
        return member.status === 'form'
      case 'alternative':
        return member.status === 'alternative'
      case 'pending':
        return member.status === 'pending'
      case 'all':
        return true
      default:
        return false
    }
  }

  // Answer conditions only look at members who filled the form.
  if (member.status !== 'form') return false
  const question = questionsById.get(condition.questionId)
  const kind = questionKind(question, condition.subFieldId)
  if (!kind) return false
  const value = answerFor(member, condition)

  if (condition.op === 'answered') return !isBlank(value)
  if (condition.op === 'blank') return isBlank(value)

  if (kind === 'choice' || kind === 'multi') {
    const wanted = new Set((condition.values || []).map(normalizeValue))
    const given = (Array.isArray(value) ? value : isBlank(value) ? [] : [value]).map(normalizeValue)
    const hit = given.some((v) => wanted.has(v))
    if (condition.op === 'in') return hit
    if (condition.op === 'notIn') return !hit
    return false
  }

  if (kind === 'number') {
    const n = toNumber(value)
    if (Number.isNaN(n)) return false
    const a = Number(condition.value)
    const b = Number(condition.value2)
    switch (condition.op) {
      case 'eq': return n === a
      case 'ne': return n !== a
      case 'gt': return n > a
      case 'gte': return n >= a
      case 'lt': return n < a
      case 'lte': return n <= a
      case 'between': return n >= Math.min(a, b) && n <= Math.max(a, b)
      default: return false
    }
  }

  if (kind === 'text' && condition.op === 'contains') {
    const word = normalizeValue((condition.values || [])[0])
    return word !== '' && normalizeValue(value).includes(word)
  }
  return false
}

export function matchMembers(section, data, questionsById = indexQuestions(data?.form?.questions)) {
  const conditions = section.conditions || []
  if (!data || conditions.length === 0) return []
  const matches = (m) => (c) => matchesCondition(m, c, questionsById)
  return (data.members || []).filter((m) =>
    section.match === 'any' ? conditions.some(matches(m)) : conditions.every(matches(m)),
  )
}

// Readable form of a member's answer, for "show their answer next to the name".
function answerLabel(member, condition, question) {
  const value = answerFor(member, condition)
  if (isBlank(value)) return ''
  const optionLabel = (v) => {
    const opt = (question.options || []).find((o) => normalizeValue(o.value) === normalizeValue(v))
    return opt ? opt.label : String(v)
  }
  if (Array.isArray(value)) return value.map(optionLabel).join(', ')
  if (question.type === 'radio' || question.type === 'dropdown') return optionLabel(value)
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}

function formatNames(members, section, questionsById) {
  const valueCondition = section.showValue
    ? (section.conditions || []).find((c) => c.type === 'question' && questionsById.get(c.questionId))
    : null
  let names = members.map((m) => {
    if (!valueCondition) return m.name
    const label = answerLabel(m, valueCondition, questionsById.get(valueCondition.questionId))
    return label ? `${m.name} (${label})` : m.name
  })
  if (section.limit && names.length > section.limit) names = names.slice(0, section.limit)
  if (section.listStyle === 'lines') return names.join('\n')
  if (section.listStyle === 'numbered') return names.map((n, i) => `${i + 1}. ${n}`).join('\n')
  return names.join(', ')
}

export function contextValues(data) {
  const members = data?.members || []
  const reported = members.filter((m) => m.status === 'form' || m.status === 'alternative').length
  return {
    unit: data?.unit || '',
    district: data?.district || '',
    area: data?.area || '',
    quarter: QUARTER_MONTHS[data?.quarter] || '',
    year: data?.year ? String(data.year) : '',
    total: String(members.length),
    submitted: String(reported),
    pending: String(members.length - reported),
  }
}

// Replaces known {placeholders}; unknown ones are left as typed so a typo
// stays visible in the preview instead of silently disappearing.
export function fillPlaceholders(text, values) {
  return String(text || '').replace(/\{(\w+)\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole,
  )
}

/**
 * Renders one paragraph. Returns { text, matched } where text is null when
 * the paragraph is left out of the reply.
 */
export function renderSection(section, data, questionsById = indexQuestions(data?.form?.questions)) {
  const values = contextValues(data)
  if (section.kind === 'text') {
    const text = fillPlaceholders(section.text, values).trim()
    return { text: text || null, matched: null }
  }
  const matched = matchMembers(section, data, questionsById)
  if (matched.length === 0) {
    const fallback = section.emptyMode === 'text' ? fillPlaceholders(section.emptyText, values).trim() : ''
    return { text: fallback || null, matched }
  }
  const text = fillPlaceholders(section.text, {
    ...values,
    names: formatNames(matched, section, questionsById),
    count: String(matched.length),
  }).trim()
  return { text: text || null, matched }
}

export function renderReply(sections, data) {
  const questionsById = indexQuestions(data?.form?.questions)
  return (sections || [])
    .map((s) => renderSection(s, data, questionsById).text)
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
}

// ── Building and checking templates ─────────────────────────────────────────

export function newSection(kind) {
  if (kind === 'text') return { id: newId(), kind: 'text', text: '' }
  return {
    id: newId(),
    kind: 'members',
    text: '{names}',
    match: 'all',
    conditions: [{ type: 'status', status: 'reported' }],
    emptyMode: 'skip',
    emptyText: '',
    listStyle: 'comma',
    showValue: false,
    limit: null,
  }
}

// A sensible first condition for a question: the last answer option (forms
// list the weakest answer last — തൃപ്തികരമല്ല, വായിച്ചില്ല, 0), or "0" for numbers.
export function defaultQuestionCondition(question) {
  const base = { type: 'question', questionId: question.questionId }
  if (question.type === 'group') {
    const sub = (question.subFields || [])[0]
    return { ...base, subFieldId: sub?.fieldId, op: sub?.type === 'text' ? 'answered' : 'gt', value: 0 }
  }
  const kind = questionKind(question)
  if (kind === 'choice' || kind === 'multi') {
    const last = (question.options || [])[question.options.length - 1]
    return { ...base, op: 'in', values: last ? [last.value] : [] }
  }
  if (kind === 'number') return { ...base, op: 'eq', value: 0 }
  return { ...base, op: 'answered' }
}

/** Problems that stop a template from being saved, as plain sentences. */
export function sectionProblems(section, questionsById) {
  if (section.kind === 'text') {
    return section.text && section.text.trim() ? [] : ['Write some text, or remove this paragraph.']
  }
  const problems = []
  const conditions = section.conditions || []
  if (conditions.length === 0) problems.push('Choose which members to list.')
  conditions.forEach((c) => {
    if (c.type !== 'question') return
    const question = questionsById.get(c.questionId)
    if (!question) {
      problems.push("This question is not in this quarter's form. Pick a question again.")
      return
    }
    const kind = questionKind(question, c.subFieldId)
    if (!kind) {
      problems.push(`Choose which part of "${question.text}" to check.`)
      return
    }
    if (!OPS_BY_KIND[kind].some((o) => o.value === c.op)) {
      problems.push(`Choose a condition for "${question.text}".`)
    } else if ((c.op === 'in' || c.op === 'notIn') && !(c.values || []).length) {
      problems.push(`Pick at least one answer for "${question.text}".`)
    } else if (c.op === 'contains' && !String((c.values || [])[0] || '').trim()) {
      problems.push(`Type the word to look for in "${question.text}".`)
    } else if (kind === 'number' && !['answered', 'blank'].includes(c.op)) {
      const bad = (v) => v === '' || v === null || v === undefined || !Number.isFinite(Number(v))
      if (bad(c.value) || (c.op === 'between' && bad(c.value2))) {
        problems.push(`Enter ${c.op === 'between' ? 'both numbers' : 'a number'} for "${question.text}".`)
      }
    }
  })
  if (!section.text || !section.text.trim()) problems.push('Write the sentence that lists the members.')
  return problems
}

const MONTH_NAMES = /ജനുവരി|ഫെബ്രുവരി|മാർച്ച്|ഏപ്രിൽ|മെയ്|ജൂൺ|ജൂലൈ|ഓഗസ്റ്റ്|ആഗസ്റ്റ്|സെപ്റ്റംബർ|ഒക്ടോബർ|നവംബർ|ഡിസംബർ/

/** Advice that does not block saving. */
export function sectionHints(section) {
  const hints = []
  const texts = [section.text, section.emptyMode === 'text' ? section.emptyText : ''].join(' ')
  if (MONTH_NAMES.test(texts) && !texts.includes('{quarter}')) {
    hints.push('This text names fixed months. Use {quarter} so it is right for every quarter.')
  }
  if (section.kind === 'members' && section.text && !/\{names\}|\{count\}/.test(section.text)) {
    hints.push('This sentence does not show who matched. Add {names} to list them.')
  }
  return hints
}

const STATUS_PHRASES = {
  reported: 'submitted the report',
  form: 'filled the report form',
  alternative: 'sent an Aged / Patient report',
  pending: 'have not submitted',
  all: 'are in the unit',
}

/** One-line plain-language summary of who a member paragraph lists. */
export function describeConditions(section, questionsById) {
  const parts = (section.conditions || []).map((c) => {
    if (c.type === 'status') return STATUS_PHRASES[c.status] || 'chosen members'
    const q = questionsById.get(c.questionId)
    if (!q) return 'a question that is missing'
    const kind = questionKind(q, c.subFieldId)
    const sub = c.subFieldId ? (q.subFields || []).find((s) => s.fieldId === c.subFieldId) : null
    const subject = `"${q.text}${sub ? ` › ${sub.label}` : ''}"`
    const op = (OPS_BY_KIND[kind] || []).find((o) => o.value === c.op)
    if (!op) return subject
    if (c.op === 'in' || c.op === 'notIn') {
      const labels = (c.values || []).map((v) => (q.options || []).find((o) => o.value === v)?.label || v)
      return `${op.label} ${labels.join(' / ') || '…'} for ${subject}`
    }
    if (c.op === 'answered' || c.op === 'blank') return `${op.label} for ${subject}`
    if (c.op === 'contains') return `wrote "${(c.values || [])[0] || '…'}" in ${subject}`
    if (c.op === 'between') return `${subject} between ${c.value ?? '…'} and ${c.value2 ?? '…'}`
    return `${subject} ${op.label} ${c.value ?? '…'}`
  })
  if (parts.length === 0) return 'No members chosen yet'
  return `Members who ${parts.join(section.match === 'any' ? ', or ' : ', and ')}`
}

// ── Starting points ─────────────────────────────────────────────────────────

/** A ready-made draft built from the quarter's own questions. */
export function starterSections(questions = []) {
  const sections = [
    { ...newSection('text'), text: 'അംഗങ്ങളുടെ ത്രൈമാസ ഇഹ്തിസാബീ റിപ്പോർട്ട്: പ്രതികരണം\n\nപ്രിയ സഹോദരാ, അസ്സലാമു അലൈക്കും' },
    {
      ...newSection('text'),
      text: '{unit} പ്രാദേശിക ജമാഅത്തിലെ അംഗങ്ങളുടെ {quarter} കാലയളവിലെ ത്രൈമാസ ഇഹ്തിസാബീ റിപ്പോർട്ട് ഹൽഖാ കേന്ദ്രത്തിൽ ലഭിച്ചു. താഴെ പറയുന്ന കാര്യങ്ങൾ ശ്രദ്ധിക്കുമല്ലോ...',
    },
    { ...newSection('members'), text: '{names} എന്നിവരാണ് റിപ്പോർട്ട് അയച്ചത്.' },
    {
      ...newSection('members'),
      conditions: [{ type: 'status', status: 'pending' }],
      text: '{names} എന്നിവർ റിപ്പോർട്ട് അയച്ചിട്ടില്ല. അതിന്റെ കാരണം അറിയിക്കാൻ ആവശ്യപ്പെടുമല്ലോ.',
    },
  ]
  questions.forEach((q) => {
    if (!['radio', 'dropdown', 'checkbox', 'number', 'star'].includes(q.type)) return
    const condition = defaultQuestionCondition(q)
    const answer =
      condition.op === 'in'
        ? (q.options || []).find((o) => o.value === condition.values[0])?.label || ''
        : String(condition.value)
    sections.push({
      ...newSection('members'),
      conditions: [condition],
      text: `${q.text} (${answer}): {names}`,
    })
  })
  sections.push({
    ...newSection('text'),
    text: 'നമ്മുടെ മുഴുവൻ പ്രവർത്തനങ്ങളും അല്ലാഹു സ്വീകരിക്കുമാറാകട്ടെ. ആമീൻ\n\nഅസിസ്റ്റൻറ് സെക്രട്ടറി,\nജമാഅത്തെ ഇസ്‌ലാമി - ഹിന്ദ്,\nകേരള ഹൽഖ',
  })
  return sections
}

/**
 * Copies another quarter's template onto this quarter's form. Each question
 * is matched by its wording, and each chosen answer by its value or label;
 * anything that cannot be matched is left for the admin to pick again.
 */
export function copySections(sections, fromQuestions = [], toQuestions = []) {
  const from = indexQuestions(fromQuestions)
  const toByText = new Map(toQuestions.map((q) => [normalizeValue(q.text), q]))
  let unmatched = 0
  const copied = (sections || []).map((s) => {
    const section = { ...JSON.parse(JSON.stringify(s)), id: newId() }
    if (section.kind !== 'members') return section
    section.conditions = (section.conditions || []).map((c) => {
      if (c.type !== 'question') return c
      const source = from.get(c.questionId)
      const target = source && toByText.get(normalizeValue(source.text))
      if (!target || target.type !== source.type) {
        unmatched += 1
        return { ...c, questionId: `missing:${c.questionId}` }
      }
      const next = { ...c, questionId: target.questionId }
      if (c.subFieldId) {
        const sub = (source.subFields || []).find((f) => f.fieldId === c.subFieldId)
        const match = sub && (target.subFields || []).find((f) => normalizeValue(f.label) === normalizeValue(sub.label))
        next.subFieldId = match?.fieldId
        if (!match) unmatched += 1
      }
      if (c.op === 'in' || c.op === 'notIn') {
        next.values = (c.values || [])
          .map((v) => {
            const label = (source.options || []).find((o) => o.value === v)?.label
            const hit = (target.options || []).find(
              (o) => normalizeValue(o.value) === normalizeValue(v) || (label && normalizeValue(o.label) === normalizeValue(label)),
            )
            return hit?.value
          })
          .filter(Boolean)
        if (next.values.length < (c.values || []).length) unmatched += 1
      }
      return next
    })
    return section
  })
  return { sections: copied, unmatched }
}

const LEGACY_CONTEXT = { _ctx_unit: '{unit}', _ctx_quarter: '{quarter}', _ctx_district: '{district}', _ctx_year: '{year}' }

/**
 * Imports the wording of the old single template (before templates were per
 * quarter). Its data blocks pointed at fixed field names that no longer
 * exist, so each becomes a member paragraph with its sentence kept and the
 * members left for the admin to choose.
 */
export function convertLegacyBlocks(blocks = []) {
  let needsMembers = 0
  const sections = blocks
    .map((b) => {
      if (b.type === 'static') return { ...newSection('text'), text: (b.text || '').trim() }
      if (LEGACY_CONTEXT[b.fieldKey]) {
        return { ...newSection('text'), text: (b.textTemplate || '').replace(/\{names\}/g, LEGACY_CONTEXT[b.fieldKey]).trim() }
      }
      const section = {
        ...newSection('members'),
        text: (b.textTemplate || '').trim() || '{names}',
        emptyMode: b.elseText && b.elseText.trim() ? 'text' : 'skip',
        emptyText: (b.elseText || '').trim(),
        listStyle: 'comma',
        limit: b.limit || null,
      }
      if (b.fieldKey !== 'submittedMembers') {
        section.conditions = []
        needsMembers += 1
      }
      return section
    })
    .filter((s) => s.kind === 'members' || s.text)
  return { sections, needsMembers }
}
