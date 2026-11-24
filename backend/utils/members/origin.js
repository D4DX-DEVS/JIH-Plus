/**
 * Members Application — where an application form is filled from.
 *
 * Every applicant answers this before the form opens: India, the GCC (then
 * which part of it), or International / Online. Stored on the access link while
 * they fill in the form and copied onto the Application at submission, so the
 * admin lists can filter by it.
 */

const ORIGIN_REGIONS = {
  india: 'India',
  gcc: 'GCC',
  international: 'International / Online'
};

const GCC_COUNTRIES = ['UAE', 'Bahrain', 'Qatar', 'Kuwait', 'KSA', 'Muscat', 'Salala'];

/** Validate `{ region, country }` from a client. Returns { origin } or { error }. */
function normalizeOrigin(input) {
  const region = String(input?.region || '').trim();
  if (!ORIGIN_REGIONS[region]) return { error: 'Choose India, GCC or International / Online' };
  if (region !== 'gcc') return { origin: { region, country: '' } };

  const country = GCC_COUNTRIES.find(c => c === String(input?.country || '').trim());
  if (!country) return { error: 'Choose where in the GCC the form is from' };
  return { origin: { region, country } };
}

module.exports = { ORIGIN_REGIONS, GCC_COUNTRIES, normalizeOrigin };
