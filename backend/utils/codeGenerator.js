/**
 * Code & Password generation utilities for Location Master Data
 *
 * District uniqueCode  : [first word of district name lowercase] + [2-digit sequential, starts at 01]
 *   e.g. "Malappuram West" → "malappuram01"
 *
 * Area uniqueCode      : [first 4 alpha letters of area name] + [district 2-digit seq] + [3-digit random]
 *   e.g. area "Kazhakannu" under district seq "01" → "kazh01384"
 *
 * Unit uniqueCode      : [first 4 alpha letters of unit name] + [district 2-digit seq] + [area 3-digit random]
 *   e.g. unit "Mundal" under district "01", area "384" → "mund01384"
 *
 * District password    : "26" + 5 random digits (7 total)
 * Area password        : "26" + 4 random digits (6 total)
 * Unit password        : "2" + 4 random digits (5 total)
 */

// Extract first N alpha characters (a-z only) from a name, lowercase
const firstAlpha = (text, n) => {
  if (!text) return '';
  return text.replace(/[^a-zA-Z]/g, '').toLowerCase().substring(0, n);
};

// Pad number to 2 digits
const pad2 = (n) => String(n).padStart(2, '0');

// Check whether a uniqueCode is already used in any of the given models
// (uniqueCode must be unique across District/AreaMaster/UnitMaster collectively,
// since login looks a username up across all three).
const isCodeTaken = async (candidate, models) => {
  for (const model of models) {
    if (!model) continue;
    // eslint-disable-next-line no-await-in-loop
    const existing = await model.findOne({ uniqueCode: candidate }).select('_id').lean();
    if (existing) return true;
  }
  return false;
};

/**
 * Generate district uniqueCode and determine sequential number.
 * Finds existing districts that share the same first-word prefix and picks the next number.
 *
 * @param {string} districtName
 * @param {Model} DistrictModel - Mongoose District model
 * @param {Model[]} [otherModels] - other location models to also check for code collisions
 * @returns {{ uniqueCode: string, sequentialNumber: number, seqCode: string }}
 */
const generateDistrictCode = async (districtName, DistrictModel, otherModels = []) => {
  const firstWord = (districtName.trim().split(/\s+/)[0] || '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

  // Find highest sequential number for this prefix
  const existing = await DistrictModel.find({
    uniqueCode: { $regex: new RegExp(`^${firstWord}\\d{2}$`, 'i') }
  }).sort({ sequentialNumber: -1 }).limit(1);

  let nextSeq = existing.length > 0 ? existing[0].sequentialNumber + 1 : 1;
  let seqCode = pad2(nextSeq);

  // Guard against collision with an Area/Unit code that happens to match this pattern
  while (await isCodeTaken(`${firstWord}${seqCode}`, otherModels)) {
    nextSeq += 1;
    seqCode = pad2(nextSeq);
  }

  return {
    uniqueCode: `${firstWord}${seqCode}`,
    sequentialNumber: nextSeq,
    seqCode
  };
};

/**
 * Generate area uniqueCode.
 * Ensures the 3-digit random code is unique within AreaMaster and across the
 * other location models passed in (District/UnitMaster share the same username
 * lookup space at login, so their codes must not collide with an area's).
 *
 * @param {string} areaName
 * @param {string} districtSeqCode - 2-digit district sequential code (e.g. "01")
 * @param {Model} AreaModel - Mongoose AreaMaster model
 * @param {Model[]} [otherModels] - other location models to also check for code collisions
 * @returns {{ uniqueCode: string, randomCode: string }}
 */
const generateAreaCode = async (areaName, districtSeqCode, AreaModel, otherModels = []) => {
  const prefix4 = firstAlpha(areaName, 4);

  let randomCode;
  let candidate;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 1000) {
    // Random 3-digit number: 100–999
    randomCode = String(Math.floor(100 + Math.random() * 900));
    candidate = `${prefix4}${districtSeqCode}${randomCode}`;
    // eslint-disable-next-line no-await-in-loop
    isUnique = !(await isCodeTaken(candidate, [AreaModel, ...otherModels]));
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Could not generate a unique area code after 1000 attempts');
  }

  return {
    uniqueCode: candidate,
    randomCode
  };
};

/**
 * Generate unit uniqueCode.
 * Base form: [first 4 alpha letters of unit name] + [district seq] + [area random].
 * If that collides with an existing code in UnitMaster or any of the other
 * location models passed in, a numeric suffix is appended ("…1", "…2", …) until
 * a free code is found. Pass UnitModel to enable collision checks; omit it for
 * a one-shot synchronous generation (e.g. unit tests).
 *
 * @param {string} unitName
 * @param {string} districtSeqCode - 2-digit district sequential code (e.g. "01")
 * @param {string} areaRandomCode  - 3-digit area random code (e.g. "384")
 * @param {Model} [UnitModel]      - Mongoose UnitMaster model (optional)
 * @param {Model[]} [otherModels]  - other location models to also check for code collisions
 * @returns {Promise<{ uniqueCode: string }> | { uniqueCode: string }}
 */
const generateUnitCode = (unitName, districtSeqCode, areaRandomCode, UnitModel, otherModels = []) => {
  const prefix4 = firstAlpha(unitName, 4);
  const base = `${prefix4}${districtSeqCode}${areaRandomCode}`;

  if (!UnitModel) {
    return { uniqueCode: base };
  }

  return (async () => {
    let candidate = base;
    let suffix = 0;
    // eslint-disable-next-line no-await-in-loop
    while (await isCodeTaken(candidate, [UnitModel, ...otherModels])) {
      suffix += 1;
      candidate = `${base}${suffix}`;
      if (suffix > 999) {
        throw new Error(`Could not generate unique unit code for "${unitName}" after 999 attempts`);
      }
    }
    return { uniqueCode: candidate };
  })();
};

// ── Password generators ──────────────────────────────────────────────────────

/** District password: "26" + 5 random digits (7 chars total) */
const generateDistrictPassword = () => {
  const digits = Math.floor(10000 + Math.random() * 90000); // 10000–99999
  return `26${digits}`;
};

/** Area password: "26" + 4 random digits (6 chars total) */
const generateAreaPassword = () => {
  const digits = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  return `26${digits}`;
};

/** Unit password: "2" + 4 random digits (5 chars total) */
const generateUnitPassword = () => {
  const digits = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  return `2${digits}`;
};

module.exports = {
  generateDistrictCode,
  generateAreaCode,
  generateUnitCode,
  generateDistrictPassword,
  generateAreaPassword,
  generateUnitPassword
};
