const mongoose = require('mongoose');

const ruknFormSchema = new mongoose.Schema({
  // Personal Information
  name: { type: String, required: true },
  // English name (required)
  nameEnglish: { type: String, required: true },
  fathersName: { type: String  },
  spouse: { type: String },
  // Children counts
  childrenBoys: { type: Number, default: 0 },
  childrenGirls: { type: Number, default: 0 },
  fullAddress: { type: String},
  place: { type: String},
  po: { type: String },
  pin: { type: String},
  mobile: { type: String},
  email: { type: String, required: true },
  
  // Additional Information
  age: { type: String },
  dateOfBirth: { type: String },
  educationalQualification: { type: String },
  otherSkills: { type: String },
  knownLanguages: { type: String },
  occupation: { type: String },
  otherIncomeSources: { type: String },
  previousOrganization: { type: String },
  
  // Questions
  question5: { type: String }, // Kept for backward compatibility
  question5a: { type: String }, // When did you start reading Jamath literature?
  question5b: { type: String }, // What prompted you to apply for membership?
  question6: { type: String },
  question7: { type: String }, // Backward compatibility (combined field)
  question7a: { type: String },
  question7b: { type: String },
  
  // Family Connection
  familyConnection: {
    wifeHusband: { type: String },
    children: { type: String }
  },
  
  // Other Information
  debtsLiabilities: { type: String },
  organizationalResponsibilities: { type: String },
  nearestLocalJamaat: { type: String },
  contactUnitAbroad: { type: String },
  
  // Compulsory Books (17 items)
  compulsoryBooks: {
    book1: { type: Boolean, default: false },
    book2: { type: Boolean, default: false },
    book3: { type: Boolean, default: false },
    book4: { type: Boolean, default: false },
    book5: { type: Boolean, default: false },
    book6: { type: Boolean, default: false },
    book7: { type: Boolean, default: false },
    book8: { type: Boolean, default: false },
    book9: { type: Boolean, default: false },
    book10: { type: Boolean, default: false },
    book11: { type: Boolean, default: false },
    book12: { type: Boolean, default: false },
    book13: { type: Boolean, default: false },
    book14: { type: Boolean, default: false },
    book15: { type: Boolean, default: false },
    book16: { type: Boolean, default: false },
    book17: { type: Boolean, default: false }
  },
  
  // Advisable Books (15 items)
  advisableBooks: {
    book1: { type: Boolean, default: false },
    book2: { type: Boolean, default: false },
    book3: { type: Boolean, default: false },
    book4: { type: Boolean, default: false },
    book5: { type: Boolean, default: false },
    book6: { type: Boolean, default: false },
    book7: { type: Boolean, default: false },
    book8: { type: Boolean, default: false },
    book9: { type: Boolean, default: false },
    book10: { type: Boolean, default: false },
    book11: { type: Boolean, default: false },
    book12: { type: Boolean, default: false },
    book13: { type: Boolean, default: false },
    book14: { type: Boolean, default: false },
    book15: { type: Boolean, default: false }
  },
  
  // Report Period
  reportPeriod: {
    from: { type: String },
    to: { type: String }
  },
  
  // Attendance
  attendance: {
    weeklyMeeting: { type: String },
    areaConvention: { type: String },
    nightCamp: { type: String }
  },
  
  // Activity Questions (15 items)
  activityQuestions: {
    question1: { type: String },
    question2: { type: String },
    question3: { type: String },
    question4: { type: String },
    question5: { type: String },
    question6: { type: String },
    question7: { type: String },
    question8: { type: String },
    question9: { type: String },
    question10: { type: String },
    question11: { type: String },
    question12: { type: String },
    question13: { type: String },
    question14: { type: String },
    question15: { type: String }
  },
  
  // Applicant Signature
  applicantSignature: { type: String },
  applicantDate: { type: String },
  
  // Local Ameer/Area President
  localAmeer: {
    name: { type: String },
    signature: { type: String },
    date: { type: String }
  },
  
  // District President
  districtPresident: {
    name: { type: String },
    signature: { type: String },
    date: { type: String },
    opinion: { type: String }
  },
  
  // Regional Nazim
  regionalNazim: {
    name: { type: String },
    signature: { type: String },
    date: { type: String }
  },
  
  // Office Use
  officeUse: {
    registrationNumber: { type: String },
    date: { type: String }
  },
  
  // Photo (base64 encoded)
  photo: { type: String },
  
  // Unit Information
  unitId: { type: String },
  unitName: { type: String },
  areaId: { type: String },
  areaName: { type: String },
  districtId: { type: String },
  districtName: { type: String },
  
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
ruknFormSchema.index({ unitId: 1 });
ruknFormSchema.index({ submittedBy: 1 });
ruknFormSchema.index({ status: 1 });
ruknFormSchema.index({ submittedAt: -1 });
ruknFormSchema.index({ 'verification.unitAdmin.status': 1 });
ruknFormSchema.index({ 'verification.areaAdmin.status': 1 });
ruknFormSchema.index({ 'verification.districtAdmin.status': 1 });
ruknFormSchema.index({ 'verification.stateAdmin.status': 1 });

module.exports = mongoose.model('RuknForm', ruknFormSchema);
