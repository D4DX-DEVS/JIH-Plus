/**
 * Members Application — dynamic role registry.
 *
 * Unlike the ihthisabi section (one collection per role: UnitAdmin, DistrictAdmin,
 * MekhalaNazim...), every members account lives in a single MemberAdmin collection
 * and points at a Role document here. Adding a role is data entry, not a code change.
 *
 *   key        – stable slug referenced by workflows and form fields ('unitAdmin')
 *   level      – hierarchy rank; 0 is highest (superAdmin). Lower rank = larger number.
 *   scopeType  – which geography an account holding this role is bound to
 */

const mongoose = require('mongoose');
const membersConnection = require('../../config/membersConnection');

const SCOPE_TYPES = ['state', 'mekhala', 'district', 'area', 'unit'];

const roleSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[a-zA-Z][a-zA-Z0-9]*$/, 'Role key must be alphanumeric and start with a letter']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  nameMl: {
    type: String,
    default: '',
    trim: true
  },
  level: {
    type: Number,
    required: true,
    min: 0
  },
  scopeType: {
    type: String,
    enum: SCOPE_TYPES,
    required: true
  },
  // Roles that may issue temporary form-access links to applicants.
  canCreateAccessLinks: {
    type: Boolean,
    default: false
  },
  // Seeded roles the workflows depend on; blocked from deletion.
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });

module.exports = membersConnection.model('Role', roleSchema);
module.exports.SCOPE_TYPES = SCOPE_TYPES;
