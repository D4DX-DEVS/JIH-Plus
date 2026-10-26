/**
 * IHTHISABI member category (Aged / Patient) and automatic alternative submissions.
 *
 * Aged and Patient members do not fill the regular form. An admin (any member)
 * or a unit admin (own unit) sets the category on the member; from the next
 * report quarter onwards an alternative submission of that type is created for
 * the member automatically, so they never have to submit anything themselves.
 *
 * "Next report quarter" = the quarter after the one currently open for
 * submission. Example: set while Q3 2026 reports are being collected (Oct-Dec
 * 2026) → Q4 2026 is auto-submitted as soon as it opens (1 Jan 2027).
 */
const AlternativeSubmit = require('../models/ihthisabi/alternativeSubmit');
const Submission = require('../models/ihthisabi/Submission');
const User = require('../models/ihthisabi/User');
const { getAvailableSubmissionQuarter } = require('./quarterHelper');

const MEMBER_CATEGORIES = ['Aged', 'Patient'];

const nextQuarter = ({ year, quarter }) =>
  quarter === 4 ? { year: year + 1, quarter: 1 } : { year, quarter: quarter + 1 };

// First report quarter a category set at `date` applies to.
const getCategoryEffectiveQuarter = (date = new Date()) =>
  nextQuarter(getAvailableSubmissionQuarter(date));

/**
 * Applies a category change to a User document (caller saves it).
 * `category` is 'Aged' | 'Patient' | null/'' (regular member).
 * Changing the category (or switching Aged ↔ Patient) takes effect from the next
 * report quarter; reports already auto-submitted are left as they are.
 * @returns {boolean} whether anything changed
 */
const applyMemberCategory = (user, category, updatedBy, date = new Date()) => {
  const next = MEMBER_CATEGORIES.includes(category) ? category : null;
  if ((user.memberCategory || null) === next) return false;
  user.memberCategory = next;
  user.memberCategoryFrom = next ? getCategoryEffectiveQuarter(date) : undefined;
  user.memberCategoryUpdatedAt = date;
  user.memberCategoryUpdatedBy = updatedBy;
  return true;
};

const isValidCategoryInput = (category) =>
  category === null || category === '' || MEMBER_CATEGORIES.includes(category);

// Same location strings the member's own alternative form sends (their User
// district/area/unit); abroad members with blank fields fall back to their
// abroad country/area/unit, since the model requires all three.
const submissionLocation = (member) => {
  const pick = (own, abroadRef) => {
    const value = String(own || '').trim();
    return value || abroadRef?.title || '-';
  };
  return {
    district: pick(member.district, member.abroadCountry),
    area: pick(member.area, member.abroadArea),
    unit: pick(member.unit, member.abroadUnit)
  };
};

/**
 * Creates the open quarter's alternative submission for every active Aged /
 * Patient member whose category is in effect and who has not submitted for that
 * quarter yet (regular or alternative, under any of their roles). Idempotent:
 * safe to run repeatedly and from several server instances.
 */
const runAutoAlternativeSubmissions = async (date = new Date()) => {
  const period = getAvailableSubmissionQuarter(date);

  const members = await User.find({
    role: 'rukn',
    isActive: { $ne: false },
    memberCategory: { $in: MEMBER_CATEGORIES },
    $or: [
      { 'memberCategoryFrom.year': { $lt: period.year } },
      { 'memberCategoryFrom.year': period.year, 'memberCategoryFrom.quarter': { $lte: period.quarter } }
    ]
  })
    .select('name ruknId district area unit memberCategory memberCategoryUpdatedBy abroadCountry abroadArea abroadUnit')
    .populate('abroadCountry abroadArea abroadUnit', 'title')
    .lean();

  if (members.length === 0) return { period, created: 0, skipped: 0 };

  // Who already submitted this quarter — matched by ruknId too, because a member
  // who submits while logged in as Unit Admin is stored under that account's id.
  const periodMatch = { 'submissionPeriod.year': period.year, 'submissionPeriod.quarter': period.quarter };
  const ownerMatch = {
    $or: [
      { userId: { $in: members.map(m => m._id) } },
      { ruknId: { $in: members.map(m => m.ruknId).filter(Boolean) } }
    ]
  };
  const [subs, alts] = await Promise.all([
    Submission.find({ ...periodMatch, ...ownerMatch }).select('userId ruknId').lean(),
    AlternativeSubmit.find({ ...periodMatch, ...ownerMatch }).select('userId ruknId').lean()
  ]);
  const submittedUserIds = new Set([...subs, ...alts].map(s => String(s.userId)));
  const submittedRuknIds = new Set([...subs, ...alts].map(s => s.ruknId).filter(Boolean));

  let created = 0;
  let skipped = 0;
  for (const member of members) {
    if (submittedUserIds.has(String(member._id)) || (member.ruknId && submittedRuknIds.has(member.ruknId))) {
      skipped += 1;
      continue;
    }
    try {
      await AlternativeSubmit.create({
        userId: member._id,
        ruknId: member.ruknId,
        type: member.memberCategory,
        ...submissionLocation(member),
        ruknName: member.name,
        reason: `Submitted automatically: member is in the ${member.memberCategory} category`
          + (member.memberCategoryUpdatedBy ? ` (set by ${member.memberCategoryUpdatedBy})` : ''),
        autoSubmitted: true,
        submissionPeriod: { year: period.year, quarter: period.quarter, month: date.getMonth() + 1 }
      });
      created += 1;
    } catch (error) {
      // Another instance (or the member) got there first.
      if (error.code === 11000) skipped += 1;
      else console.error(`[AutoAlternativeSubmit] Failed for rukn ${member.ruknId}:`, error.message);
    }
  }

  return { period, created, skipped };
};

module.exports = {
  MEMBER_CATEGORIES,
  getCategoryEffectiveQuarter,
  applyMemberCategory,
  isValidCategoryInput,
  runAutoAlternativeSubmissions
};
