const mongoose = require('mongoose');

const unitSurveySchema = new mongoose.Schema({
  // Unit Information
  district: { type: String, required: true },
  area: { type: String, required: true },
  component: { type: String, required: true },
  
  // Workers Information
  workers: {
    rukkun: { type: Number, default: 0 },
    karkun: { type: Number, default: 0 },
    activeAssociate: { type: Number, default: 0 }
  },

  // Part A - General Information
  partA: {
    codes: { type: String, default: '' },
    spokenPersons: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 }
    },
    
    authorityPersonsGender: {
      vyakthibandham: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      sahitiyabandham: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      qscStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      regularKhutbaListener: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      prabodhanamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      pfBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      bzBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      regionalReliefBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      aaramamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      tamheedulManhabStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      institutionAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      islamicCollegeAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      neighborhoodGroupMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      palliativeConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      friendsClubMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mediaReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      ayathulDursalQuranStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      heavensGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      schoolGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      publicCampusStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      otherNGOs: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mahalluConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      fullTimeWorkerConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } }
    },
    authorityPersonsCounts: {
      vyakthibandham: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      sahitiyabandham: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      qscStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regularKhutbaListener: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      prabodhanamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      pfBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      bzBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regionalReliefBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      aaramamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      tamheedulManhabStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      institutionAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      islamicCollegeAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      neighborhoodGroupMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      palliativeConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      friendsClubMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mediaReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      ayathulDursalQuranStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      heavensGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      schoolGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      publicCampusStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      otherNGOs: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mahalluConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      fullTimeWorkerConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } }
    },
    authorityGender: {
      male: { type: Boolean, default: false },
      female: { type: Boolean, default: false }
    },
    authorityOtherText: { type: String, default: '' }
  },

  // Part B - New Members
  partB: {
    newJIHMembers: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 }
    },
    
    memberCategoriesGender: {
      vyakthibandham: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      sahitiyabandham: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      qscStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      regularKhutbaListener: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      prabodhanamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      pfBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      bzBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      regionalReliefBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      aaramamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      tamheedulManhabStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      institutionAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      islamicCollegeAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      neighborhoodGroupMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      palliativeConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      friendsClubMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mediaReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      ayathulDursalQuranStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      heavensGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      schoolGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      publicCampusStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      otherNGOs: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mahalluConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      fullTimeWorkerConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } }
    },
    memberCategoriesCounts: {
      vyakthibandham: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      sahitiyabandham: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      qscStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regularKhutbaListener: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      prabodhanamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      pfBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      bzBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regionalReliefBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      aaramamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      tamheedulManhabStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      institutionAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      islamicCollegeAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      neighborhoodGroupMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      palliativeConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      friendsClubMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mediaReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      ayathulDursalQuranStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      heavensGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      schoolGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      publicCampusStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      otherNGOs: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mahalluConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      fullTimeWorkerConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } }
    }
  },

// Part C - Public meeting attendees (monthly)
  partC: {
    publicMeetingAttendees: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 }
    }
  },

  // Part D - Growth Acceleration within report period
  partD: {
    growthAcceleration: {
      rukkun: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 }
      },
      karkun: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 }
      },
      // For these three, we allow either a single total number
      // or an object with male/female for backward compatibility.
      solidarity: { type: mongoose.Schema.Types.Mixed, default: 0 },
      sio: { type: mongoose.Schema.Types.Mixed, default: 0 },
      gio: { type: mongoose.Schema.Types.Mixed, default: 0 }
    }
  },

  // Survey metadata
  month: { type: String, required: true },
  year: { type: Number, required: true },
  submittedBy: { type: String, required: true }, // Unit ID or user identifier
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String }, // Track which user updated (optional)
  
  // Hierarchy tracking
  districtId: { type: String },
  areaId: { type: String },
  unitId: { type: String },
  submissionLevel: { type: String, enum: ['unit'], default: 'unit' }
});

// Index for efficient queries
unitSurveySchema.index({ district: 1, area: 1, component: 1 });
unitSurveySchema.index({ submittedBy: 1, month: 1, year: 1 });
unitSurveySchema.index({ districtId: 1, areaId: 1, unitId: 1 });


// 🔹 Add static method BEFORE exporting
unitSurveySchema.statics.findAll = function (query = {}) {
  return this.find(query).sort({ submittedAt: -1 });
};
module.exports = mongoose.model('UnitSurvey', unitSurveySchema);
