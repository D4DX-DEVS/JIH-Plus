const mongoose = require('mongoose');

const karkunFormSchema = new mongoose.Schema({
  // Personal Information (1-9)
  name: { type: String, required: true },
  // English name (required along with Malayalam name)
  nameEnglish: { type: String, required: true },
  fathersName: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  age: { type: String },
  dateOfBirth: {
    day: { type: String },
    month: { type: String },
    year: { type: String }
  },
  spouseName: { type: String },
  // Children counts
  childrenBoys: { type: Number, default: 0 },
  childrenGirls: { type: Number, default: 0 },
  mobile: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  
  // Detailed Information (10-22)
  educationalQualification: { type: String },
  occupation: { type: String },
  otherSkills: { type: String },
  halkhaName: { type: String, required: true },
  area: { type: String, required: true },
  district: { type: String, required: true },
  // Hierarchy IDs for reliable lookups
  districtId: { type: String },
  areaId: { type: String },
  unitId: { type: String },
  ageAssociated: { type: String },
  associationCircumstances: {
    family: { type: Boolean, default: false },
    personal: { type: Boolean, default: false },
    reading: { type: Boolean, default: false },
    others: { type: Boolean, default: false }
  },
  firstActiveUnit: {
    balasangham: { type: Boolean, default: false },
    teenIndia: { type: Boolean, default: false },
    sio: { type: Boolean, default: false },
    gio: { type: Boolean, default: false },
    solidarity: { type: Boolean, default: false },
    jamaatHalkha: { type: Boolean, default: false },
    others: { type: Boolean, default: false }
  },
  workedOtherOrganization: { type: String, enum: ['yes', 'no', ''], default: '' },
  otherOrganizationName: { type: String },
  organizationalBooksRead: { type: String },
  listedBooks: [{
    basic: { type: String },
    other: { type: String }
  }],
  
  // Compulsory books
  compulsoryBooks: {
    book1: { type: Boolean, default: false },
    book2: { type: Boolean, default: false },
    book3: { type: Boolean, default: false }
  },
  
  // Applicant's declaration acceptance
  declarationAccepted: { type: Boolean, default: false },
  
  // Local Official
  localUnitOfficialName: { type: String },
  applicantName: { type: String },
  applicantDate: { type: String },
  officialDate: { type: String },
  
  // Office Use
  officeDate: { type: String },
  registrationNumber: { type: String },
  officeRegistrationDate: { type: String },
  
  // Additional signature fields
  localUnitSignature: { type: String },
  localUnit: { type: String },
  localUnitDate: { type: String },
  areaPresidentName: { type: String },
  areaPresidentSignature: { type: String },
  areaPresidentDate: { type: String },
  
  // Photo (base64 encoded)
  photo: { type: String },
  
  // Approval Workflow
  verification: {
    unitAdmin: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      comments: { type: String }
    },
    areaAdmin: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      comments: { type: String }
    },
    districtAdmin: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      comments: { type: String }
    },
    stateAdmin: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      comments: { type: String }
    }
  },
  
  // Current status - overall form status
  status: { 
    type: String, 
    enum: ['pending', 'unit_review', 'area_review', 'district_review', 'state_review', 'approved', 'rejected'], 
    default: 'pending' 
  },
  
  // Metadata
  submittedBy: { type: String },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
karkunFormSchema.index({ submittedBy: 1 });
karkunFormSchema.index({ status: 1 });
karkunFormSchema.index({ submittedAt: -1 });
karkunFormSchema.index({ 'verification.unitAdmin.status': 1 });
karkunFormSchema.index({ 'verification.areaAdmin.status': 1 });
karkunFormSchema.index({ 'verification.districtAdmin.status': 1 });
karkunFormSchema.index({ 'verification.stateAdmin.status': 1 });
// Hierarchy lookups
karkunFormSchema.index({ districtId: 1, areaId: 1, unitId: 1 });

module.exports = mongoose.model('KarkunForm', karkunFormSchema);
