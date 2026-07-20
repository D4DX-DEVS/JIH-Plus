/**
 * Dynamic Reply Template Engine
 *
 * Each block in a template is one of:
 *   { type: 'static', text: '...' }
 *   { type: 'data', fieldKey, nameProperty, limit, condition: { operator, value }, textTemplate, elseText }
 *
 * Available fieldKeys (all come from aggregatedData returned by /admin/unit-reply-data):
 *   submittedMembers, quranStudyCompleted, quranStudyNotCompleted,
 *   hadithReadingCompleted, hadithReadingNotCompleted,
 *   bookReadingCompleted, bookReadingNotCompleted,
 *   weeklyMeetingAbsentees (objects with .name), jamaathMeetingAbsentees,
 *   grihaMeetingsThreeOrMore, grihaMeetingsLessThanThree,
 *   baitulmalDefaulters,
 *   presentationSatisfactory (→ presentationEffort.satisfactory),
 *   presentationUnsatisfactory (→ presentationEffort.unsatisfactory)
 *
 * textTemplate placeholders: {names} {count} {unit} {quarter} {year}
 */

// Maps each fieldKey to a path resolver on aggregatedData
const FIELD_MAP = {
  submittedMembers:         (d) => d.submittedMembers || [],
  quranStudyCompleted:      (d) => d.quranStudyCompleted || [],
  quranStudyNotCompleted:   (d) => d.quranStudyNotCompleted || [],
  hadithReadingCompleted:   (d) => d.hadithReadingCompleted || [],
  hadithReadingNotCompleted:(d) => d.hadithReadingNotCompleted || [],
  bookReadingCompleted:     (d) => d.bookReadingCompleted || [],
  bookReadingNotCompleted:  (d) => d.bookReadingNotCompleted || [],
  weeklyMeetingAbsentees:   (d) => d.weeklyMeetingAbsentees || [],
  weeklyMeetingPresent:     (d) => d.weeklyMeetingPresent || [],
  jamaathMeetingAbsentees:  (d) => d.jamaathMeetingAbsentees || [],
  jamaathMeetingPresent:    (d) => d.jamaathMeetingPresent || [],
  grihaMeetingsThreeOrMore: (d) => d.grihaMeetingsThreeOrMore || [],
  grihaMeetingsLessThanThree:(d) => d.grihaMeetingsLessThanThree || [],
  baitulmalDefaulters:      (d) => d.baitulmalDefaulters || [],
  baitulmalPaid:            (d) => d.baitulmalPaid || [],
  presentationSatisfactory: (d) => d.presentationEffort?.satisfactory || [],
  presentationUnsatisfactory:(d) => d.presentationEffort?.unsatisfactory || [],
  newHalqaMembersOnePlus:    (d) => d.newHalqaMembersOnePlus || [],
  newHalqaMembersZero:       (d) => d.newHalqaMembersZero || [],
  muslimRelationsOnePlus:    (d) => d.muslimRelationsOnePlus || [],
  muslimRelationsZero:       (d) => d.muslimRelationsZero || [],
  communityRelationsOnePlus: (d) => d.communityRelationsOnePlus || [],
  communityRelationsZero:    (d) => d.communityRelationsZero || [],
  quarterlyVisitsOnePlus:    (d) => d.quarterlyVisitsOnePlus || [],
  quarterlyVisitsZero:       (d) => d.quarterlyVisitsZero || [],

  // Context variable fields — return single-element arrays from context
  _ctx_unit:     (d, ctx) => ctx && ctx.unit     ? [ctx.unit]                                              : [],
  _ctx_quarter:  (d, ctx) => ctx && ctx.quarter  ? [QUARTER_NAMES[ctx.quarter] || `Q${ctx.quarter}`]       : [],
  _ctx_district: (d, ctx) => ctx && ctx.district ? [ctx.district]                                          : [],
  _ctx_year:     (d, ctx) => ctx && ctx.year     ? [String(ctx.year)]                                      : [],
}

export const FIELD_LABELS = {
  submittedMembers:          'Report submitted members (submittedMembers)',
  quranStudyCompleted:       'Quran study – completed (quranStudyCompleted)',
  quranStudyNotCompleted:    'Quran study – not completed (quranStudyNotCompleted)',
  hadithReadingCompleted:    'Hadith reading – completed (hadithReadingCompleted)',
  hadithReadingNotCompleted: 'Hadith reading – not completed (hadithReadingNotCompleted)',
  bookReadingCompleted:      'Book reading – completed (bookReadingCompleted)',
  bookReadingNotCompleted:   'Book reading – not completed (bookReadingNotCompleted)',
  weeklyMeetingAbsentees:    'Weekly meeting absentees (weeklyMeetingAbsentees)',
  weeklyMeetingPresent:      'Weekly meeting present (weeklyMeetingPresent)',
  jamaathMeetingAbsentees:   'Jamaath meeting absentees (jamaathMeetingAbsentees)',
  jamaathMeetingPresent:     'Jamaath meeting present (jamaathMeetingPresent)',
  grihaMeetingsThreeOrMore:  'Griha meetings ≥ 2 (grihaMeetingsThreeOrMore)',
  grihaMeetingsLessThanThree:'Griha meetings < 2 (grihaMeetingsLessThanThree)',
  baitulmalDefaulters:       'Baitulmal defaulters (baitulmalDefaulters)',
  baitulmalPaid:             'Baitulmal paid (baitulmalPaid)',
  presentationSatisfactory:  'Presentation effort – satisfactory (presentationSatisfactory)',
  presentationUnsatisfactory:'Presentation effort – unsatisfactory (presentationUnsatisfactory)',
  newHalqaMembersOnePlus:    '1:3 ഹൽക്ക മെമ്ബേഴ്‌സ് – 1+',
  newHalqaMembersZero:       '1:3 ഹൽക്ക മെമ്ബേഴ്‌സ് – 0',
  muslimRelationsOnePlus:    '1:20 മുസ്ലിം വ്യക്തിബന്ധം – 1+',
  muslimRelationsZero:       '1:20 മുസ്ലിം വ്യക്തിബന്ധം – 0',
  communityRelationsOnePlus: '1:10 സദ്ദഹോദര ബന്ധം – 1+',
  communityRelationsZero:    '1:10 സദ്ദഹോദര ബന്ധം – 0',
  quarterlyVisitsOnePlus:    'ത്രൈമാസ ഡൗ – 1+',
  quarterlyVisitsZero:       'ത്രൈമാസ ഡൗ – 0',
  // Context variable labels
  _ctx_unit:     'Unit (context)',
  _ctx_quarter:  'Quarter (context)',
  _ctx_district: 'District (context)',
  _ctx_year:     'Year (context)',
}

// Fields that contain objects (with a .name property) rather than plain strings
const OBJECT_FIELDS = new Set(['weeklyMeetingAbsentees'])

function getArray(aggregatedData, fieldKey, context) {
  const resolver = FIELD_MAP[fieldKey]
  return resolver ? resolver(aggregatedData, context) : []
}

function getNames(items, nameProperty, limit) {
  const names = nameProperty
    ? items.map((item) => (item && typeof item === 'object' ? item[nameProperty] : item))
    : items.map((item) => (item && typeof item === 'object' ? item.name || JSON.stringify(item) : item))
  const limited = limit ? names.slice(0, limit) : names
  return limited.filter(Boolean)
}

function evaluateCondition(arr, condition) {
  if (!condition) return arr.length > 0
  const len = arr.length
  const { operator, value } = condition
  switch (operator) {
    case 'gt':  return len > value
    case 'gte': return len >= value
    case 'lt':  return len < value
    case 'lte': return len <= value
    case 'eq':  return len === value
    default:    return len > 0
  }
}

const QUARTER_NAMES = {
  1: 'Q1 (ജനുവരി-മാർച്ച്)',
  2: 'Q2 (ഏപ്രിൽ-ജൂൺ)',
  3: 'Q3 (ജൂലൈ-സെപ്റ്റംബർ)',
  4: 'Q4 (ഒക്ടോബർ-ഡിസംബർ)',
}

function interpolate(template, vars) {
  return template
    .replace(/\{names\}/g, vars.names)
    .replace(/\{count\}/g, vars.count)
    .replace(/\{unit\}/g, vars.unit)
    .replace(/\{quarter\}/g, vars.quarter)
    .replace(/\{year\}/g, vars.year)
}

/**
 * Renders a template (array of blocks) into a message string.
 * @param {Array} blocks - template blocks
 * @param {Object} aggregatedData - from backend /admin/unit-reply-data
 * @param {{ unit: string, year: number, quarter: number }} context
 * @returns {string}
 */
export function renderTemplate(blocks, aggregatedData, context) {
  const { unit = '', year = '', quarter = '', district = '' } = context
  const quarterName = QUARTER_NAMES[quarter] || (quarter ? `Q${quarter}` : '')
  const ctx = { unit, year, quarter, district }

  let message = ''
  for (const block of blocks) {
    // Ensure blocks are separated by at least one newline
    if (message && !message.endsWith('\n\n')) {
      message += '\n\n'
    }

    if (block.type === 'static') {
      message += block.text || ''
    } else if (block.type === 'data') {
      const arr = getArray(aggregatedData, block.fieldKey, ctx)
      const conditionMet = evaluateCondition(arr, block.condition)

      if (conditionMet) {
        const nameProperty = block.nameProperty || (OBJECT_FIELDS.has(block.fieldKey) ? 'name' : null)
        const names = getNames(arr, nameProperty, block.limit || null)
        const namesStr = names.length > 0 ? names.join(', ') : (block.elseText || 'ആരുമില്ല')
        const rendered = interpolate(block.textTemplate || '', {
          names: namesStr,
          count: arr.length,
          unit,
          quarter: quarterName,
          year,
        })
        message += rendered
      } else {
        message += block.elseText || ''
      }
    }
  }
  return message
}

/**
 * DEFAULT_TEMPLATE_BLOCKS reproduces the exact same output as the previous
 * hard-coded generateFormattedReply function, expressed as template blocks.
 */
export const DEFAULT_TEMPLATE_BLOCKS = [
  // Header
  {
    type: 'static',
    text: 'അംഗങ്ങളുടെ ത്രൈമാസ തർബിയത്ത് റിപ്പോർട്ട്: {quarter} പ്രതികരണം\n\n',
  },
  {
    type: 'static',
    text: 'പ്രിയ സഹോദരങ്ങളെ,  അസലാമു അലൈക്കും വറഹ്മത്തുല്ലാഹ്\n\n',
  },
  {
    type: 'static',
    text: '{unit} പ്രാദേശിക ജമാഅത്തിലെ  അംഗങ്ങളുടെ  ത്രൈ മാസ റിപ്പോർട്ട് ഹൽഖാ കേന്ദ്രത്തിൽ ലഭിച്ചു.\n\n',
  },
  {
    type: 'static',
    text: 'താഴെ പറയുന്ന കാര്യങ്ങൾ ശ്രദ്ധിക്കുമല്ലോ...\n\n',
  },
  // 1. Submitted members
  {
    type: 'data',
    fieldKey: 'submittedMembers',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: '1. {names} എന്നിവരാണ് റിപ്പോർട്ട് അയച്ചത്.\n\n',
    elseText: '1. ആരുമില്ല എന്നിവരാണ് റിപ്പോർട്ട് അയച്ചത്.\n\n',
  },
  // 2. Quran study section header
  {
    type: 'static',
    text: '2. ഖുർആൻ പഠനം:\n\n',
  },
  {
    type: 'data',
    fieldKey: 'quranStudyCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'ഖുർആൻ പഠനം പൂർത്തിയാക്കിയവർ: {names}\n\n',
    elseText: 'ഖുർആൻ പഠനം പൂർത്തിയാക്കിയവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'data',
    fieldKey: 'quranStudyNotCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'ഖുർആൻ പഠനം പൂർത്തിയാക്കാത്തവർ: {names}\n\n',
    elseText: 'ഖുർആൻ പഠനം പൂർത്തിയാക്കാത്തവർ: ആരുമില്ല\n\n',
  },
  // 3. Hadith reading
  {
    type: 'static',
    text: '3. ഹദീസ് പഠനം\n\n',
  },
  {
    type: 'data',
    fieldKey: 'hadithReadingCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'ഹദീസ് പഠനം പൂർത്തിയാക്കിയവർ: {names}\n\n',
    elseText: 'ഹദീസ് പഠനം പൂർത്തിയാക്കിയവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'data',
    fieldKey: 'hadithReadingNotCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'ഹദീസ് പഠനം - പൂർത്തിയാക്കാത്തവർ : {names}\n\n',
    elseText: 'ഹദീസ് പഠനം - പൂർത്തിയാക്കാത്തവർ : ആരുമില്ല\n\n',
  },
  // 4. Book reading
  {
    type: 'static',
    text: '4. സാഹിത്യ വായന\n\n',
  },
  {
    type: 'data',
    fieldKey: 'bookReadingCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'സാഹിത്യ വായന പൂർത്തിയാക്കിയവർ: {names}\n\n',
    elseText: 'സാഹിത്യ വായന പൂർത്തിയാക്കിയവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'data',
    fieldKey: 'bookReadingNotCompleted',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: 'സാഹിത്യ വായന പൂർത്തിയാക്കാത്തവർ: {names}\n\n',
    elseText: 'സാഹിത്യ വായന പൂർത്തിയാക്കാത്തവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'static',
    text: 'വളരെ ചെറിയ ഭാഗങ്ങളാണ് തഫ്‌സീർ വായന, ഹദീസ് പഠനം, പുസ്‌തക വായന എന്നിവക്ക് 3 മാസത്തിലൊരിക്കൽ നിർദേശിക്കുന്നത്. പൊതുവെ ജമാഅത്തെ അംഗങ്ങൾക്കിടയിൽ വീഴ്‌ച വരാത്ത കാര്യമാണ് ഇവ. ഭാവിയിൽ അത്തരം കാര്യങ്ങൾ പ്രത്യേകം ശ്രദ്ധ വെക്കണമെന്ന് അംഗങ്ങളെ ഉണർത്തുമല്ലോ.\n\n',
  },
  // 5. Weekly meeting
  {
    type: 'static',
    text: '5. പ്രതിവാര യോഗങ്ങളിലും പ്രാദേശിക ജമാഅത്തിലും അംഗങ്ങളുടെ ഹാജർ ഉറപ്പുവരുത്തുന്നതിൽ പ്രത്യേക ശ്രദ്ധ ഉണ്ടാകണം.\n\n',
  },
  {
    type: 'data',
    fieldKey: 'weeklyMeetingAbsentees',
    nameProperty: 'name',
    limit: 3,
    condition: { operator: 'gt', value: 0 },
    textTemplate: '{names} എന്നിവർ  ആബ്സൻ്റ് രേഖപ്പെടുത്തിയതായി  കാണുന്നു.   യോഗങ്ങളിൽ ലീവ് അറിയിക്കുന്നതിൽ യാതൊരു കാരണവശാലും വീഴ്ച വരാൻ പാടില്ലാത്തതാണ്.\n\n',
    elseText: 'യോഗങ്ങളിൽ ലീവ് അറിയിക്കുന്നതിൽ യാതൊരു കാരണവശാലും വീഴ്ച വരാൻ പാടില്ലാത്തതാണ്\n\n',
  },
  // 6. Griha meetings
  {
    type: 'data',
    fieldKey: 'grihaMeetingsThreeOrMore',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: '6. ഗൃഹയോഗം : 3 എണ്ണം നടത്തിയവർ: {names}\n\n',
    elseText: '6. ഗൃഹയോഗം : 3 എണ്ണം നടത്തിയവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'data',
    fieldKey: 'grihaMeetingsLessThanThree',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gte', value: 0 },
    textTemplate: '3 എണ്ണത്തിൽ കുറവുള്ളവർ: {names}\n\n',
    elseText: '3 എണ്ണത്തിൽ കുറവുള്ളവർ: ആരുമില്ല\n\n',
  },
  {
    type: 'static',
    text: 'ഗൃഹയോഗം നടത്തുന്നതിൽ അംഗങ്ങൾ കൂടുതൽ ശ്രദ്ധ പുലർത്തണം. മാസത്തിൽ ഒന്ന് നടക്കണം എന്നതാണല്ലോ നമ്മുടെ തീരുമാനം\n\n',
  },
  // 7. Baitulmal
  {
    type: 'data',
    fieldKey: 'baitulmalDefaulters',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gt', value: 0 },
    textTemplate: '7. ബൈത്തുൽമാൽ രണ്ട് ശതമാനം നൽകുന്നതിൽ വീഴ്ച വരുത്തുന്നവർ ഉണ്ടെങ്കിൽ പ്രാദേശിക അമീർ അക്കാര്യം ശ്രദ്ധയിൽ പെടുത്തുമല്ലോ.\n\n',
    elseText: '7. ബൈത്തുൽമാൽ കാര്യത്തിൽ എല്ലാ അംഗങ്ങളും നല്ല ശ്രദ്ധ പുലർത്തിയിട്ടുണ്ട്.\n\n',
  },
  // 8. Presentation effort – satisfactory
  {
    type: 'data',
    fieldKey: 'presentationSatisfactory',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gt', value: 0 },
    textTemplate: '8. ചുരുങ്ങിയത് മൂന്നു പേരെ പ്രസ്താവനവുമായി അടുപ്പിക്കുവാനുള്ള ശ്രമം {names} എന്നീ അംഗങ്ങൾ കാര്യമായി ശ്രദ്ധിച്ചിട്ടുണ്ട് എന്നത് സന്തോഷകരമാണ്.',
    elseText: '',
  },
  // 8. Presentation effort – unsatisfactory
  {
    type: 'data',
    fieldKey: 'presentationUnsatisfactory',
    nameProperty: null,
    limit: null,
    condition: { operator: 'gt', value: 0 },
    textTemplate: ' എന്നാൽ {names} എന്നിവർ ഈ രംഗത്ത് വേണ്ടത്ര ശ്രദ്ധ നൽകിയിട്ടില്ലെന്ന് മനസ്സിലാകുന്നു.',
    elseText: '',
  },
  // Presentation closing (always shown)
  {
    type: 'static',
    text: ' കരുത്തും വലിപ്പവുമുള്ള പ്രസ്ഥാനം എന്ന  നമ്മുടെ ഊന്നൽ അംഗങ്ങൾ എന്ന നിലയിൽ നാം ഏറ്റെടുക്കുകയും ഈ രംഗത്ത് നമ്മുടെ ഹൽഖയിലെ മറ്റു സഹപ്രവർത്തകർക്ക് പ്രചോദനമാവുകയും ചെയ്യണം.\n\n',
  },
  // 9-11 Static closing paragraphs
  {
    type: 'static',
    text: '9. പുതിയ വ്യക്തികളെ ( മിനിമം 3 പേർ) ഹൽഖയിലേക്ക് കൊണ്ടുവരാനുള്ള ടാർഗറ്റിൻ്റെ കാര്യത്തിലും അതീവ ജാഗ്രത ഉണ്ടായേ പറ്റൂ.\n\n',
  },
  {
    type: 'static',
    text: '10. വ്യക്തിബന്ധങ്ങളിൽ (സഹോദര സമുദായംഗങ്ങളുൾപ്പെടെ)  പിറകിലുള്ളവർ മെച്ചപ്പെടുത്തണം.\n\n',
  },
  {
    type: 'static',
    text: '11.⁠ ⁠ഹൽഖാ കേന്ദ്രം നൽകിയ അജണ്ടയനുസരിച്ച് തന്നെയാവണം പ്രാദേശിക ജമാഅത്തെ യോഗങ്ങൾ നടത്തേണ്ടത് .\n\n',
  },
  {
    type: 'static',
    text: '•⁠  ⁠അംഗങ്ങളുടെ തർബിയത്ത് ലക്ഷ്യം വെച്ച് നിർദേശിക്കുന്ന വ്യക്തിഗത പരിപാടികൾ മുഴുവൻ അംഗങ്ങളും പൂർത്തികരിക്കാൻ ശ്രദ്ധിക്കുമ്പോഴാണല്ലോ നമ്മുടെ പ്രാദേശിക ജമാഅത്തെ യോഗങ്ങൾ ഫലപ്രദമാവുക. എല്ലാ അംഗങ്ങളും ഇക്കാര്യത്തിൽ ജാഗ്രത പുലർത്തണം.\n\n•⁠  ⁠വാർധക്യം, രോഗം, മറ്റു കാരണങ്ങൾ എന്നിവ കൊണ്ട് പ്രയാസമനുഭവിക്കുന്ന നമ്മുടെ സഹോദരങ്ങൾക്ക് അല്ലാഹു ആശ്വാസം നൽകട്ടെ.\n\n•⁠  ⁠നമ്മുടെ മുഴുവൻ പ്രവർത്തനങ്ങളും അല്ലാഹു സ്വീകരിക്കുകയും വീഴ്ചകൾ പൊറുത്തു തരികയും ചെയ്യട്ടെ...  ആമീൻ\n\n',
  },
  // Signature
  {
    type: 'static',
    text: 'അസിസ്റ്റൻറ് സെക്രട്ടറി,\nജമാഅത്തെ ഇസ്‌ലാമി - ഹിന്ദ്,\nകേരള ഹൽഖ,\n7012545656',
  },
]

// Ensure every block has the required fields with defaults for safe rendering
export function normalizeBlock(block) {
  if (block.type === 'static') {
    return { type: 'static', text: block.text || '' }
  }
  return {
    type: 'data',
    fieldKey: block.fieldKey || '',
    nameProperty: block.nameProperty || null,
    limit: block.limit || null,
    condition: {
      operator: block.condition?.operator || 'gt',
      value: block.condition?.value ?? 0,
    },
    textTemplate: block.textTemplate || '',
    elseText: block.elseText || '',
  }
}

// Deep-clone the default template blocks (avoids mutating the constant)
export function getDefaultBlocks() {
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_BLOCKS))
}
