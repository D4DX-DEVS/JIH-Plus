const mongoose = require('mongoose');

const areaSurveySchema = new mongoose.Schema({
  // Area Information
  district: { type: String, required: true },
  area: { type: String, required: true },
  
  // Month field - required for monthly surveys
  month: { 
    type: String, 
    required: true,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December']
  },

  // Part A - Total Components (ആകെ ഘടകങ്ങൾ)
  partA: {
    kh: { type: Number, default: 0 },
    vkh: { type: Number, default: 0 }
  },

  // Part B - Expansion Related Activities (Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ)
  partB: {
    monthlyMeeting: { 
      type: String, 
      enum: ['Yes', 'No'], 
      required: true 
    },
    monthlyMeetingReason: { type: String },
    wingAttendance: {
      jih: {
        present: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        absent: { type: Number, default: 0 }
      },
      vanitha: {
        present: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        absent: { type: Number, default: 0 }
      },
      solidarity: {
        present: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        absent: { type: Number, default: 0 }
      },
      sio: {
        present: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        absent: { type: Number, default: 0 }
      },
      gio: {
        present: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        absent: { type: Number, default: 0 }
      }
    },
    mainDecisions: [
      { type: String }
    ]
  },

  // Part C - Focus Areas (താഴെ പറയുന്നവയിൽ ഏതൊക്കെ മേഖലകളിൽ ഫോകസ് ചെയ്തു)
  partC: {
    expansionActivities: {
      newAreaWorkshop: { type: Boolean, default: false },
      workerTraining: { type: Boolean, default: false },
      newAreaAgenda: { type: Boolean, default: false },
      fulltimeRecruitment: { type: Boolean, default: false },
      schoolGuardianCluster: { type: Boolean, default: false },
      reliefDataCollection: { type: Boolean, default: false },
      workerDeployment: { type: Boolean, default: false },
      weeklyMeetingEffectiveness: { type: Boolean, default: false },
      khatheebUtilization: { type: Boolean, default: false },
      hajjUmrahGroup: { type: Boolean, default: false },
      artsScienceCampus: { type: Boolean, default: false },
      madrasaGrowthCalculation: { type: Boolean, default: false },
      schoolCenteredWork: { type: Boolean, default: false },
      staffHalkaFormation: { type: Boolean, default: false },
      islamicCollegeAlumni: { type: Boolean, default: false },
      quranStudyCenterWork: { type: Boolean, default: false }
    },
    otherFocus: { type: String }
  },

  // Part D - Area Team Activities (ഏരിയ ടീം നടത്തിയ പ്രവർത്തനങ്ങൾ)
  partD: {
    activities: {
      jih: {
        componentVisits: { type: Number, default: 0 },
        newComponentAttempts: { type: Number, enum: [0, 1], default: null },
        newPersonDiscoveryAttempts: { type: Number, enum: [0, 1], default: null }
      },
      vanitha: {
        componentVisits: { type: Number, default: 0 },
        newComponentAttempts: { type: Number, enum: [0, 1], default: null },
        newPersonDiscoveryAttempts: { type: Number, enum: [0, 1], default: null }
      },
      solidarity: {
        componentVisits: { type: Number, default: 0 },
        newComponentAttempts: { type: Number, enum: [0, 1], default: null },
        newPersonDiscoveryAttempts: { type: Number, enum: [0, 1], default: null }
      },
      sio: {
        componentVisits: { type: Number, default: 0 },
        newComponentAttempts: { type: Number, enum: [0, 1], default: null },
        newPersonDiscoveryAttempts: { type: Number, enum: [0, 1], default: null }
      },
      gio: {
        componentVisits: { type: Number, default: 0 },
        newComponentAttempts: { type: Number, enum: [0, 1], default: null },
        newPersonDiscoveryAttempts: { type: Number, enum: [0, 1], default: null }
      }
    }
  },

  // Part E - New Person Discovery (പുതിയ വ്യക്തികളെ കണ്ടെത്തുന്നതിനായി സംസാരിച്ച വ്യക്തികൾ)
  partE: {
    male: { type: Number, default: 0 },
    female: { type: Number, default: 0 },
    categories: {
      personalConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      literaryConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      qscStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      regularKhutbaListener: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      prabodhanamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      jaBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      adaBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      localReliefBeneficiary: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      aaramamReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      thawheedulMaraStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      madrasaAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      islamicCollegeAlumni: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      neighborhoodMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      palliativeConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      friendsClubMember: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mediaReader: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      ayahDarsQuranStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      heavenGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      schoolGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      arabicCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      artsCollegeGuardian: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      publicCampusStudent: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      otherNGOs: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      mahallConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } },
      fulltimeWorkerConnection: { male: { type: Boolean, default: false }, female: { type: Boolean, default: false } }
    },
    categoriesCounts: {
      personalConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      literaryConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      qscStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regularKhutbaListener: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      prabodhanamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      jaBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      adaBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      localReliefBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      aaramamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      thawheedulMaraStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      madrasaAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      islamicCollegeAlumni: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      neighborhoodMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      palliativeConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      friendsClubMember: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mediaReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      ayahDarsQuranStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      heavenGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      schoolGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      arabicCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      artsCollegeGuardian: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      publicCampusStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      otherNGOs: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      mahallConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      fulltimeWorkerConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } }
    },
    otherCategory: { type: String }
  },

  // Part F - Growth in Report Period (റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്)
  partF: {
    wingGrowth: {
      jih: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      vanitha: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      solidarity: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      sio: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      gio: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      teenIndia: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      },
      malarvadi: {
        newComponents: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 }
      }
    }
  },

  submittedBy: { type: String, required: true }, // Track which user submitted
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String } // Track which admin updated (optional)
});

// Create compound index to prevent duplicate area surveys for same district, area and month
areaSurveySchema.index({ district: 1, area: 1, month: 1, submittedBy: 1 }, { unique: true });


// 🔹 Add static method BEFORE exporting
areaSurveySchema.statics.findAll = function (query = {}) {
  return this.find(query).sort({ submittedAt: -1 });
};

module.exports = mongoose.model('AreaSurvey', areaSurveySchema);
