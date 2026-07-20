const mongoose = require('mongoose');

const districtSurveySchema = new mongoose.Schema({
  // District Information
  district: { type: String, required: true },
  
  // Month field - required for monthly surveys
  month: { 
    type: String, 
    required: true,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December']
  },

  // Part A - District Subcommittee Attendance (ജില്ലാ സബ്കമ്മിറ്റി ചേർന്നത്)
  partA: {
    attendance: {
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
    }
  },

  // Part B - Focus Areas (താഴെപറയുന്നവയിൽ ഫോകസ് ചെയ്ത മേഖലകൾ)
  partB: {
    focusAreas: {
      newAreaExpansionWorkshop: { type: Boolean, default: false },
      workerTraining: { type: Boolean, default: false },
      newAreaAgendaPreparation: { type: Boolean, default: false },
      fulltimeRecruitment: { type: Boolean, default: false },
      schoolGuardianClusterFormation: { type: Boolean, default: false },
      reliefBeneficiaryDataCollection: { type: Boolean, default: false },
      workerDeploymentToNewAreas: { type: Boolean, default: false },
      weeklyMeetingEffectiveness: { type: Boolean, default: false },
      khatibUtilization: { type: Boolean, default: false },
      madrasaMovementGrowthCalculation: { type: Boolean, default: false },
      schoolCenteredWork: { type: Boolean, default: false },
      staffHalkaFormation: { type: Boolean, default: false },
      islamicCollegeAlumniDiscovery: { type: Boolean, default: false },
      quranStudyCenterWork: { type: Boolean, default: false },
      artsScienceCampusLeadership: { type: Boolean, default: false },
      hajjUmrahGroupDiscovery: { type: Boolean, default: false },
      majorMuslimCenterStructure: { type: Boolean, default: false },
      weakAreaFinancialSupport: { type: Boolean, default: false },
      qscTeacherOrientation: { type: Boolean, default: false },
      khatibOrientation: { type: Boolean, default: false },
      institutionBearingOrientation: { type: Boolean, default: false },
      selectedWorkerTraining: { type: Boolean, default: false },
      otherFocusAreas: { type: String, default: '' } // For "മറ്റുള്ളവ (വ്യക്തമാക്കുക)"
    }
  },

  // Part C - District Subcommittee Activities (ജില്ലാ സബ്കമ്മിറ്റി നടത്തിയ പ്രവർത്തനങ്ങൾ)
  partC: {
    activities: {
      jih: {
        componentVisits: { type: Number, default: 0 },
        areaVisits: { type: Number, default: 0 },
        newComponentFormationAttempts: { type: Number, default: 0 },
        newPersonConnections: { type: Number, default: 0 }
      },
      vanitha: {
        componentVisits: { type: Number, default: 0 },
        areaVisits: { type: Number, default: 0 },
        newComponentFormationAttempts: { type: Number, default: 0 },
        newPersonConnections: { type: Number, default: 0 }
      },
      solidarity: {
        componentVisits: { type: Number, default: 0 },
        areaVisits: { type: Number, default: 0 },
        newComponentFormationAttempts: { type: Number, default: 0 },
        newPersonConnections: { type: Number, default: 0 }
      },
      sio: {
        componentVisits: { type: Number, default: 0 },
        areaVisits: { type: Number, default: 0 },
        newComponentFormationAttempts: { type: Number, default: 0 },
        newPersonConnections: { type: Number, default: 0 }
      },
      gio: {
        componentVisits: { type: Number, default: 0 },
        areaVisits: { type: Number, default: 0 },
        newComponentFormationAttempts: { type: Number, default: 0 },
        newPersonConnections: { type: Number, default: 0 }
      }
    }
  },

  // Part D - New Person Invitations (പുതിയ വ്യക്തികളെ സംഘടനയിലേക്ക് ക്ഷണിച്ചത്)
  partD: {
    invitations: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 }
    },
    categories: {
      personalConnection: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      literaryConnection: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      qscStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      regularKhutbaListener: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      prabodhanamReader: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      pfBeneficiary: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      bzBeneficiary: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      localReliefBeneficiary: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      aaramamReader: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      thawheedulMaraStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      madrasaAlumni: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      islamicCollegeAlumni: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      neighborhoodMember: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      palliativeConnection: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      friendsClubMember: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      mediaReader: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      ayahDarsQuranStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      heavenGuardian: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      schoolGuardian: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      arabicCollegeGuardian: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      arabicCollegeStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      artsCollegeStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      artsCollegeGuardian: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      publicCampusStudent: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      otherNGOs: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      mahallConnection: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      fulltimeWorkerConnection: { 
        male: { type: Boolean, default: false },
        female: { type: Boolean, default: false }
      },
      otherCategories: { type: String, default: '' } // For "മറ്റുള്ളവ (വ്യക്തമാക്കുക)"
    },
    categoriesCounts: {
      personalConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      literaryConnection: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      qscStudent: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      regularKhutbaListener: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      prabodhanamReader: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      pfBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
      bzBeneficiary: { male: { type: Number, default: 0 }, female: { type: Number, default: 0 } },
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
    }
  },

  // Part E - Growth in Report Period (റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്)
  partE: {
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

// Note: Allow multiple submissions per district and month. If you need to enforce
// uniqueness later, consider handling it at the route level with validation.

module.exports = mongoose.model('DistrictSurvey', districtSurveySchema);
