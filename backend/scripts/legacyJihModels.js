/**
 * Read-only handles on the two legacy JIH collections, for the members migration.
 *
 * These live here rather than in models/ because the application no longer has a
 * Rukn/Karkun feature — the collections exist only as a migration source. The
 * schemas are deliberately `strict: false` so every field the old forms wrote
 * comes through, whatever shape it ended up in.
 */

const mongoose = require('mongoose');

const ruknFormSchema = new mongoose.Schema({}, { strict: false, collection: 'ruknforms' });
const karkunFormSchema = new mongoose.Schema({}, { strict: false, collection: 'karkunforms' });

module.exports = {
  LegacyRuknForm: mongoose.models.LegacyRuknForm || mongoose.model('LegacyRuknForm', ruknFormSchema),
  LegacyKarkunForm: mongoose.models.LegacyKarkunForm || mongoose.model('LegacyKarkunForm', karkunFormSchema)
};
