/**
 * Utility to auto-convert static form submissions to dynamic form format.
 * Used when a submission was created with the old hardcoded form but the quarter
 * now has a published dynamic form.
 */
const ApplicationForm = require('../models/ihthisabi/ApplicationForm');

// Maps static form English values to possible Malayalam labels in dynamic form options.
// Arrays allow multiple label variants to handle different question contexts.
const VALUE_LABEL_MAP = {
  'complete': ['പൂർണം', 'കൃത്യം.', 'കൃത്യം'],
  'partial': ['ഭാഗികം', 'ഭാഗികം '],
  'none': ['വായിച്ചില്ല'],
  'notread': ['വായിച്ചില്ല'],
  'incomplete': ['അപൂർണം'],
  'yes': ['അതെ', '70'],
  'no': ['ഇല്ല'],
  'satisfactory': ['തൃപ്തികരം'],
  'unsatisfactory': ['തൃപ്തികരമല്ല'],
  'notApplicable': ['ബാധകമല്ല', '0'],
  'almost': ['ഏറെക്കുറെ'],
  'small': ['ചെറിയ തോതിൽ']
};

// Static form fields ordered to best match typical dynamic form question order.
// Fields most likely to appear in dynamic forms come first.
// Extra static-only fields are at the end and will be skipped if no match.
const STATIC_FIELDS = [
  { types: ['radio', 'dropdown'], getValue: (f) => f.quranStudy?.status },
  { types: ['text', 'textarea'], getValue: (f) => f.quranStudy?.others },
  { types: ['number'], getValue: (f) => f.hadithCount },
  { types: ['radio', 'dropdown'], getValue: (f) => f.bookReading?.islami },
  { types: ['text', 'textarea'], getValue: (f) => f.bookReading?.others },
  { types: ['group'], getValue: (f) => f.jamaathMeeting, subKeys: ['hadir', 'absent', 'leave'] },
  { types: ['number', 'radio'], getValue: (f) => f.grihameetings, isNumericRadio: true },
  { types: ['radio', 'checkbox'], getValue: (f) => f.baithulmaal },
  { types: ['radio', 'checkbox'], getValue: (f) => f.zakatPaid },
  { types: ['number', 'checkbox'], getValue: (f) => f.newMembers, isNumericCheckbox: true },
  { types: ['number'], getValue: (f) => { const n = Number(f.newMembers) || 0; return n > 3 ? n : 0; } },
  { types: ['number'], getValue: (f) => f.muslimRelations },
  { types: ['number'], getValue: (f) => f.communityRelations },
  { types: ['number'], getValue: (f) => f.scoreCount },
  { types: ['text', 'textarea'], getValue: (f) => f.suggestions },
  // Extra static fields that may not have dynamic equivalents
  { types: ['radio', 'dropdown'], getValue: (f) => f.bookReading?.atma },
  { types: ['group'], getValue: (f) => f.weeklyMeeting, subKeys: ['hadir', 'leave', 'absent'] },
  { types: ['number', 'radio'], getValue: (f) => f.thahreekiMeetings },
  { types: ['radio'], getValue: (f) => f.meqathService },
  { types: ['radio'], getValue: (f) => f.skillUsage },
  { types: ['radio', 'star'], getValue: (f) => f.jamaathInfluence },
];

/**
 * Convert a static value to match a dynamic form option value.
 */
function convertValue(staticValue, question, staticField) {
  if (staticValue == null || staticValue === '') return getDefault(question);
  const strVal = String(staticValue);

  if (question.answerType === 'radio' || question.answerType === 'dropdown') {
    if (!question.options?.length) return strVal;
    const mlLabels = VALUE_LABEL_MAP[strVal] || [];
    for (const mlLabel of mlLabels) {
      const opt = question.options.find(o =>
        o.value === mlLabel || o.label === mlLabel || o.labelMl === mlLabel ||
        o.value.trim() === mlLabel || o.label.trim() === mlLabel
      );
      if (opt) return opt.value;
    }
    const directOpt = question.options.find(o => o.value === strVal || o.label === strVal);
    if (directOpt) return directOpt.value;
    if (staticField?.isNumericRadio && !isNaN(strVal)) {
      const num = parseInt(strVal);
      const numOpt = question.options.find(o => o.value === String(num));
      if (numOpt) return numOpt.value;
      const numericOpts = question.options.filter(o => !isNaN(o.value)).map(o => parseInt(o.value)).sort((a, b) => b - a);
      if (numericOpts.length && num >= numericOpts[0]) return String(numericOpts[0]);
      if (numericOpts.length) return String(numericOpts[numericOpts.length - 1]);
    }
    return '';
  }

  if (question.answerType === 'checkbox') {
    if (!question.options?.length) return [];
    const mlLabels = VALUE_LABEL_MAP[strVal] || [];
    for (const mlLabel of mlLabels) {
      const opt = question.options.find(o =>
        o.value === mlLabel || o.label === mlLabel ||
        (o.labelMl && o.labelMl.trim() === mlLabel) ||
        o.value.trim() === mlLabel || o.label.trim() === mlLabel
      );
      if (opt) return [opt.value];
    }
    const directOpt = question.options.find(o => o.value === strVal || o.label === strVal);
    if (directOpt) return [directOpt.value];
    if (staticField?.isNumericCheckbox && !isNaN(strVal)) {
      const num = parseInt(strVal);
      const numOpt = question.options.find(o => o.value === String(num));
      if (numOpt) return [numOpt.value];
      const numericOpts = question.options.filter(o => !isNaN(o.value)).map(o => parseInt(o.value)).sort((a, b) => b - a);
      if (numericOpts.length && num >= numericOpts[0]) return [String(numericOpts[0])];
      if (num === 0) {
        const zeroOpt = question.options.find(o => o.value === '0');
        if (zeroOpt) return [zeroOpt.value];
      }
    }
    return [];
  }

  if (question.answerType === 'number' || question.answerType === 'star') {
    return Number(staticValue) || 0;
  }

  return strVal;
}

function getDefault(question) {
  if (question.answerType === 'group') {
    const d = {};
    (question.subFields || []).forEach((sf, i) => { d[sf.fieldId || `field_${i}`] = 0; });
    return d;
  }
  if (question.answerType === 'checkbox') return [];
  if (question.answerType === 'number' || question.answerType === 'star') return 0;
  return '';
}

function convertGroupValue(staticGroupData, staticSubKeys, question) {
  if (!staticGroupData || !question.subFields?.length) return getDefault(question);
  const result = {};
  for (let i = 0; i < question.subFields.length && i < staticSubKeys.length; i++) {
    const sf = question.subFields[i];
    const fieldId = sf.fieldId || `field_${i}`;
    result[fieldId] = Number(staticGroupData[staticSubKeys[i]]) || 0;
  }
  return result;
}

/**
 * Auto-convert a static submission to dynamic form format.
 * @param {Object} submission - Mongoose submission document (mutable)
 * @returns {boolean} true if conversion happened
 */
async function migrateStaticToDynamic(submission) {
  if (submission.dynamicFormId && submission.dynamicFormData) return false;
  if (!submission.form) return false;
  const quarter = submission.submissionPeriod?.quarter;
  const year = submission.submissionPeriod?.year;
  if (!quarter || !year) return false;

  const dynamicForm = await ApplicationForm.findOne({ quarter, year, status: 'published' }).lean();
  if (!dynamicForm) return false;

  console.log(`[Migration] Converting static submission ${submission._id} to dynamic format (Q${quarter} ${year})`);

  const form = submission.form;
  const questions = [...(dynamicForm.questions || [])].sort((a, b) => a.order - b.order);
  const dynamicFormData = {};
  let staticIdx = 0;

  for (const question of questions) {
    const qId = question.questionId;
    let matched = false;

    while (staticIdx < STATIC_FIELDS.length) {
      const sf = STATIC_FIELDS[staticIdx];
      const isTypeCompatible = sf.types.includes(question.answerType);

      if (isTypeCompatible) {
        const rawValue = sf.getValue(form);
        if (question.answerType === 'group' && sf.subKeys) {
          dynamicFormData[qId] = convertGroupValue(rawValue, sf.subKeys, question);
        } else {
          dynamicFormData[qId] = convertValue(rawValue, question, sf);
        }
        staticIdx++;
        matched = true;
        break;
      } else {
        staticIdx++;
      }
    }

    if (!matched) {
      dynamicFormData[qId] = getDefault(question);
    }
  }

  submission.dynamicFormId = dynamicForm._id;
  submission.dynamicFormData = dynamicFormData;
  await submission.save();

  console.log(`[Migration] Converted submission ${submission._id} successfully`);
  return true;
}

module.exports = { migrateStaticToDynamic };
