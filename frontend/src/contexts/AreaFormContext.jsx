import React, { createContext, useContext, useState, useCallback } from 'react';

const AreaFormContext = createContext();

export const useAreaForm = () => {
  const context = useContext(AreaFormContext);
  if (!context) {
    throw new Error('useAreaForm must be used within an AreaFormProvider');
  }
  return context;
};

export const AreaFormProvider = ({ children, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    district: '',
    area: '',
    month: '',
    partA: {
      kh: null,
      vkh: null
    },
    partB: {
      monthlyMeeting: '',
      monthlyMeetingReason: '',
      wingAttendance: {
        jih: { present: null, leave: null, absent: null },
        vanitha: { present: null, leave: null, absent: null },
        solidarity: { present: null, leave: null, absent: null },
        sio: { present: null, leave: null, absent: null },
        gio: { present: null, leave: null, absent: null }
      },
      mainDecisions: []
    },
    partC: {
      expansionActivities: {
        newAreaWorkshop: false,
        workerTraining: false,
        newAreaAgenda: false,
        fulltimeRecruitment: false,
        schoolGuardianCluster: false,
        reliefDataCollection: false,
        workerDeployment: false,
        weeklyMeetingEffectiveness: false,
        khatheebUtilization: false,
        hajjUmrahGroup: false,
        artsScienceCampus: false,
        madrasaGrowthCalculation: false,
        schoolCenteredWork: false,
        staffHalkaFormation: false,
        islamicCollegeAlumni: false,
        quranStudyCenterWork: false
      },
      otherFocus: ''
    },
    partD: {
      activities: {
        jih: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
        vanitha: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
        solidarity: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
        gio: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null }
      }
    },
    partE: {
      male: null,
      female: null,
      categories: {
        personalConnection: { male: false, female: false },
        literaryConnection: { male: false, female: false },
        qscStudent: { male: false, female: false },
        regularKhutbaListener: { male: false, female: false },
        prabodhanamReader: { male: false, female: false },
        jaBeneficiary: { male: false, female: false },
        adaBeneficiary: { male: false, female: false },
        localReliefBeneficiary: { male: false, female: false },
        aaramamReader: { male: false, female: false },
        thawheedulMaraStudent: { male: false, female: false },
        madrasaAlumni: { male: false, female: false },
        islamicCollegeAlumni: { male: false, female: false },
        neighborhoodMember: { male: false, female: false },
        palliativeConnection: { male: false, female: false },
        friendsClubMember: { male: false, female: false },
        mediaReader: { male: false, female: false },
        ayahDarsQuranStudent: { male: false, female: false },
        heavenGuardian: { male: false, female: false },
        schoolGuardian: { male: false, female: false },
        arabicCollegeGuardian: { male: false, female: false },
        arabicCollegeStudent: { male: false, female: false },
        artsCollegeStudent: { male: false, female: false },
        artsCollegeGuardian: { male: false, female: false },
        publicCampusStudent: { male: false, female: false },
        otherNGOs: { male: false, female: false },
        mahallConnection: { male: false, female: false },
        fulltimeWorkerConnection: { male: false, female: false }
      },
      categoriesCounts: {
        personalConnection: { male: 0, female: 0 },
        literaryConnection: { male: 0, female: 0 },
        qscStudent: { male: 0, female: 0 },
        regularKhutbaListener: { male: 0, female: 0 },
        prabodhanamReader: { male: 0, female: 0 },
        jaBeneficiary: { male: 0, female: 0 },
        adaBeneficiary: { male: 0, female: 0 },
        localReliefBeneficiary: { male: 0, female: 0 },
        aaramamReader: { male: 0, female: 0 },
        thawheedulMaraStudent: { male: 0, female: 0 },
        madrasaAlumni: { male: 0, female: 0 },
        islamicCollegeAlumni: { male: 0, female: 0 },
        neighborhoodMember: { male: 0, female: 0 },
        palliativeConnection: { male: 0, female: 0 },
        friendsClubMember: { male: 0, female: 0 },
        mediaReader: { male: 0, female: 0 },
        ayahDarsQuranStudent: { male: 0, female: 0 },
        heavenGuardian: { male: 0, female: 0 },
        schoolGuardian: { male: 0, female: 0 },
        arabicCollegeGuardian: { male: 0, female: 0 },
        arabicCollegeStudent: { male: 0, female: 0 },
        artsCollegeStudent: { male: 0, female: 0 },
        artsCollegeGuardian: { male: 0, female: 0 },
        publicCampusStudent: { male: 0, female: 0 },
        otherNGOs: { male: 0, female: 0 },
        mahallConnection: { male: 0, female: 0 },
        fulltimeWorkerConnection: { male: 0, female: 0 }
      },
      otherCategory: ''
    },
    partF: {
      wingGrowth: {
        jih: { newComponents: null, newMembers: null },
        vanitha: { newComponents: null, newMembers: null },
        solidarity: { newComponents: null, newMembers: null },
        sio: { newComponents: null, newMembers: null },
        gio: { newComponents: null, newMembers: null },
        teenIndia: { newComponents: null, newMembers: null },
        malarvadi: { newComponents: null, newMembers: null }
      }
    }
  });

  const [currentStep, setCurrentStep] = useState(1);

  const updateFormData = useCallback((part, data) => {
    setFormData(prev => {
      // If the part is a top-level property (like 'district', 'area', 'month'), update it directly
      if (part === 'district' || part === 'area' || part === 'month') {
        return {
          ...prev,
          [part]: data
        };
      }
      // Otherwise, treat it as a nested part
      return {
        ...prev,
        [part]: { ...prev[part], ...data }
      };
    });
  }, []);

  const setFormDataDirectly = useCallback((data) => {
    setFormData(data);
  }, []);

  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 1: // Part A
        // Check if district, area, and month are selected
        if (!formData.district || !formData.area || !formData.month) return false;
        
        // Check all numeric fields (including 0 as valid value)
        const numericFields = ['kh', 'vkh'];
        
        for (const field of numericFields) {
          if (formData.partA[field] === null || formData.partA[field] === undefined || formData.partA[field] === '') {
            return false;
          }
        }
        
        return true;

      case 2: // Part B
        // Check monthly meeting
        if (!formData.partB.monthlyMeeting) return false;
        if (formData.partB.monthlyMeeting === 'No' && !formData.partB.monthlyMeetingReason) return false;
        
        // Check wing attendance (at least one field should be filled for each wing)
        const wings = ['jih', 'vanitha', 'solidarity', 'sio', 'gio'];
        for (const wing of wings) {
          const attendance = formData.partB.wingAttendance[wing];
          if (!attendance || 
              (attendance.present === null && attendance.leave === null && attendance.absent === null)) {
            return false;
          }
        }
        
        return true;

      case 3: // Part C - Focus Areas (expansion activities)
        // Check if at least one expansion activity is selected
        const expansionActivities = formData.partC.expansionActivities;
        const hasSelectedActivity = Object.values(expansionActivities).some(activity => activity === true);
        if (!hasSelectedActivity) return false;
        
        return true;

      case 4: // Part D - Area Team Activities (table)
        {
          const wingsForD = ['jih', 'vanitha', 'solidarity', 'gio'];
          let hasAny = false;
          for (const wing of wingsForD) {
            const a = formData.partD.activities?.[wing];
            if (!a) continue;
            if (a.componentVisits !== null || a.newComponentAttempts !== null || a.newPersonDiscoveryAttempts !== null) {
              hasAny = true;
              break;
            }
          }
          return hasAny;
        }

      case 5: // Part E - New Person Discovery
        // Check if male and female counts are provided
        if (formData.partE.male === null || formData.partE.male === undefined || formData.partE.male === '') {
          return false;
        }
        if (formData.partE.female === null || formData.partE.female === undefined || formData.partE.female === '') {
          return false;
        }
        
        // Validate that category totals match overall totals
        let maleTotal = 0;
        let femaleTotal = 0;
        
        const categoriesCounts = formData.partE.categoriesCounts || {};
        Object.values(categoriesCounts).forEach(counts => {
          if (counts) {
            maleTotal += parseInt(counts.male || 0);
            femaleTotal += parseInt(counts.female || 0);
          }
        });
        
        const overallMale = parseInt(formData.partE.male || 0);
        const overallFemale = parseInt(formData.partE.female || 0);
        
        // Only validate if there are category counts entered
        const hasCategoryCounts = Object.values(categoriesCounts).some(counts => 
          counts && (parseInt(counts.male || 0) > 0 || parseInt(counts.female || 0) > 0)
        );
        
        if (hasCategoryCounts) {
          if (maleTotal !== overallMale || femaleTotal !== overallFemale) {
            return false;
          }
        }
        
        return true;

      case 6: // Part F - Growth Data
        // Check wing growth (at least one field should be filled for each wing)
        const wingKeys = ['jih', 'vanitha', 'solidarity', 'sio', 'gio', 'teenIndia', 'malarvadi'];
        for (const wing of wingKeys) {
          const growth = formData.partF.wingGrowth[wing];
          if (!growth || 
              (growth.newComponents === null && growth.newMembers === null)) {
            return false;
          }
        }
        
        return true;

      default:
        return false;
    }
  }, [currentStep, formData]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      district: '',
      area: '',
      month: '',
      partA: {
        kh: null,
        vkh: null
      },
      partB: {
        monthlyMeeting: '',
        wingAttendance: {
          jih: { present: null, leave: null, absent: null },
          vanitha: { present: null, leave: null, absent: null },
          solidarity: { present: null, leave: null, absent: null },
          sio: { present: null, leave: null, absent: null },
          gio: { present: null, leave: null, absent: null }
        },
        mainDecisions: []
      },
      partC: {
        expansionActivities: {
          newAreaWorkshop: false,
          workerTraining: false,
          newAreaAgenda: false,
          fulltimeRecruitment: false,
          schoolGuardianCluster: false,
          reliefDataCollection: false,
          workerDeployment: false,
          weeklyMeetingEffectiveness: false,
          hajjUmrahGroup: false,
          artsScienceCampus: false,
          madrasaGrowthCalculation: false,
          schoolCenteredWork: false,
          staffHalkaFormation: false,
          islamicCollegeAlumni: false,
          quranStudyCenterWork: false
        }
      },
      partD: {
        activities: {
          jih: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
          vanitha: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
          solidarity: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null },
          gio: { componentVisits: null, newComponentAttempts: null, newPersonDiscoveryAttempts: null }
        }
      },
      partE: {
      male: null,
      female: null,
      categories: {
        personalConnection: { male: false, female: false },
        literaryConnection: { male: false, female: false },
        qscStudent: { male: false, female: false },
        regularKhutbaListener: { male: false, female: false },
        prabodhanamReader: { male: false, female: false },
        jaBeneficiary: { male: false, female: false },
        adaBeneficiary: { male: false, female: false },
        localReliefBeneficiary: { male: false, female: false },
        aaramamReader: { male: false, female: false },
        thawheedulMaraStudent: { male: false, female: false },
        madrasaAlumni: { male: false, female: false },
        islamicCollegeAlumni: { male: false, female: false },
        neighborhoodMember: { male: false, female: false },
        palliativeConnection: { male: false, female: false },
        friendsClubMember: { male: false, female: false },
        mediaReader: { male: false, female: false },
        ayahDarsQuranStudent: { male: false, female: false },
        heavenGuardian: { male: false, female: false },
        schoolGuardian: { male: false, female: false },
        arabicCollegeGuardian: { male: false, female: false },
        arabicCollegeStudent: { male: false, female: false },
        artsCollegeStudent: { male: false, female: false },
        artsCollegeGuardian: { male: false, female: false },
        publicCampusStudent: { male: false, female: false },
        otherNGOs: { male: false, female: false },
        mahallConnection: { male: false, female: false },
        fulltimeWorkerConnection: { male: false, female: false }
        },
        categoriesCounts: {
          personalConnection: { male: 0, female: 0 },
          literaryConnection: { male: 0, female: 0 },
          qscStudent: { male: 0, female: 0 },
          regularKhutbaListener: { male: 0, female: 0 },
          prabodhanamReader: { male: 0, female: 0 },
          jaBeneficiary: { male: 0, female: 0 },
          adaBeneficiary: { male: 0, female: 0 },
          localReliefBeneficiary: { male: 0, female: 0 },
          aaramamReader: { male: 0, female: 0 },
          thawheedulMaraStudent: { male: 0, female: 0 },
          madrasaAlumni: { male: 0, female: 0 },
          islamicCollegeAlumni: { male: 0, female: 0 },
          neighborhoodMember: { male: 0, female: 0 },
          palliativeConnection: { male: 0, female: 0 },
          friendsClubMember: { male: 0, female: 0 },
          mediaReader: { male: 0, female: 0 },
          ayahDarsQuranStudent: { male: 0, female: 0 },
          heavenGuardian: { male: 0, female: 0 },
          schoolGuardian: { male: 0, female: 0 },
          arabicCollegeGuardian: { male: 0, female: 0 },
          arabicCollegeStudent: { male: 0, female: 0 },
          artsCollegeStudent: { male: 0, female: 0 },
          artsCollegeGuardian: { male: 0, female: 0 },
          publicCampusStudent: { male: 0, female: 0 },
          otherNGOs: { male: 0, female: 0 },
          mahallConnection: { male: 0, female: 0 },
          fulltimeWorkerConnection: { male: 0, female: 0 }
        },
        otherCategory: ''
      },
      partF: {
        wingGrowth: {
          jih: { newComponents: null, newMembers: null },
          vanitha: { newComponents: null, newMembers: null },
          solidarity: { newComponents: null, newMembers: null },
          sio: { newComponents: null, newMembers: null },
          gio: { newComponents: null, newMembers: null },
          teenIndia: { newComponents: null, newMembers: null },
          malarvadi: { newComponents: null, newMembers: null }
        }
      }
    });
    setCurrentStep(1);
  }, []);

  const value = {
    formData,
    currentStep,
    updateFormData,
    setFormData: setFormDataDirectly,
    nextStep,
    prevStep,
    resetForm,
    validateCurrentStep
  };

  return (
    <AreaFormContext.Provider value={value}>
      {children}
    </AreaFormContext.Provider>
  );
};
