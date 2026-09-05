/**
 * Members Application — Mekhala / District / Area / Unit master data.
 *
 * Owned entirely by this section: it is seeded and edited from the members admin
 * panel, never read from the JIH or ihthisabi databases. Flat parent-name links
 * (rather than ObjectId refs) keep it consistent with how MemberAdmin.scope and
 * Application.scope store locations.
 *
 * NOTE: registered on `membersConnection`, deliberately unlike
 * models/ihthisabi/LocationMaster.js which calls mongoose.model() and therefore
 * ends up on the default JIH connection.
 */

const mongoose = require('mongoose');
const membersConnection = require('../../config/membersConnection');

const LOCATION_TYPES = ['mekhala', 'district', 'area', 'unit'];

const locationMasterSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: LOCATION_TYPES,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Parent chain. Which of these are required depends on `type`:
  //   mekhala  -> none
  //   district -> mekhala
  //   area     -> district
  //   unit     -> district + area
  mekhala: { type: String, default: '', trim: true },
  district: { type: String, default: '', trim: true },
  area: { type: String, default: '', trim: true },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Prevents duplicates within the same parent scope.
locationMasterSchema.index(
  { type: 1, name: 1, mekhala: 1, district: 1, area: 1 },
  { unique: true }
);

locationMasterSchema.pre('validate', function (next) {
  if (this.type === 'district' && !this.mekhala) {
    return next(new Error('A district must belong to a mekhala'));
  }
  if (this.type === 'area' && !this.district) {
    return next(new Error('An area must belong to a district'));
  }
  if (this.type === 'unit' && (!this.district || !this.area)) {
    return next(new Error('A unit must belong to a district and an area'));
  }
  next();
});

module.exports = membersConnection.model('LocationMaster', locationMasterSchema);
module.exports.LOCATION_TYPES = LOCATION_TYPES;
