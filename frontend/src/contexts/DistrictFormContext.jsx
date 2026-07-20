import React, { createContext, useContext, useState, useCallback } from 'react';

const DistrictFormContext = createContext();

export const useDistrictForm = () => {
  const context = useContext(DistrictFormContext);
  if (!context) {
    throw new Error('useDistrictForm must be used within a DistrictFormProvider');
  }
  return context;
};

export const DistrictFormProvider = ({ children, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    district: '',
    month: '',
    partA: {
      attendance: {
        jih: { present: null, leave: null, absent: null },
        vanitha: { present: null, leave: null, absent: null },
        solidarity: { present: null, leave: null, absent: null },
        sio: { present: null, leave: null, absent: null },
        gio: { present: null, leave: null, absent: null }
      }
    },
    partB: {
      focusAreas: {
        newAreaExpansionWorkshop: false,
        workerTraining: false,
        newAreaAgendaPreparation: false,
        fulltimeRecruitment: false,
        schoolGuardianClusterFormation: false,
        reliefBeneficiaryDataCollection: false,
        workerDeploymentToNewAreas: false,
        weeklyMeetingEffectiveness: false,
        khatibUtilization: false,
        madrasaMovementGrowthCalculation: false,
        schoolCenteredWork: false,
        staffHalkaFormation: false,
        islamicCollegeAlumniDiscovery: false,
        quranStudyCenterWork: false,
        artsScienceCampusLeadership: false,
        hajjUmrahGroupDiscovery: false,
        majorMuslimCenterStructure: false,
        weakAreaFinancialSupport: false,
        qscTeacherOrientation: false,
        khatibOrientation: false,
        institutionBearingOrientation: false,
        selectedWorkerTraining: false,
        otherFocusAreas: ''
      }
    },
    partC: {
      activities: {
        jih: {
          componentVisits: null
        },
        vanitha: {
          areaVisits: null
        },
        solidarity: {
          newComponentFormationAttempts: null
        },
        sio: {
          newPersonConnections: null
        },
        gio: {
          newPersonConnections: null
        }
      }
    },
    partD: {
      invitations: {
        male: null,
        female: null
      },
      categories: {
        personalConnection: { male: false, female: false },
        literaryConnection: { male: false, female: false },
        qscStudent: { male: false, female: false },
        regularKhutbaListener: { male: false, female: false },
        prabodhanamReader: { male: false, female: false },
        pfBeneficiary: { male: false, female: false },
        bzBeneficiary: { male: false, female: false },
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
        fulltimeWorkerConnection: { male: false, female: false },
        otherCategories: ''
      },
      categoriesCounts: {
        personalConnection: { male: 0, female: 0 },
        literaryConnection: { male: 0, female: 0 },
        qscStudent: { male: 0, female: 0 },
        regularKhutbaListener: { male: 0, female: 0 },
        prabodhanamReader: { male: 0, female: 0 },
        pfBeneficiary: { male: 0, female: 0 },
        bzBeneficiary: { male: 0, female: 0 },
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
      }
    },
    partE: {
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
      // If the part is a top-level property (like 'district', 'month'), update it directly
      if (part === 'district' || part === 'month') {
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

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 2)); // District form has 2 pages
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      district: '',
      month: '',
      partA: {
        attendance: {
          jih: { present: null, leave: null, absent: null },
          vanitha: { present: null, leave: null, absent: null },
          solidarity: { present: null, leave: null, absent: null },
          sio: { present: null, leave: null, absent: null },
          gio: { present: null, leave: null, absent: null }
        }
      },
      partB: {
        focusAreas: {
          newAreaExpansionWorkshop: false,
          workerTraining: false,
          newAreaAgendaPreparation: false,
          fulltimeRecruitment: false,
          schoolGuardianClusterFormation: false,
          reliefBeneficiaryDataCollection: false,
          workerDeploymentToNewAreas: false,
          weeklyMeetingEffectiveness: false,
          khatibUtilization: false,
          madrasaMovementGrowthCalculation: false,
          schoolCenteredWork: false,
          staffHalkaFormation: false,
          islamicCollegeAlumniDiscovery: false,
          quranStudyCenterWork: false,
          artsScienceCampusLeadership: false,
          hajjUmrahGroupDiscovery: false,
          majorMuslimCenterStructure: false,
          weakAreaFinancialSupport: false,
          qscTeacherOrientation: false,
          khatibOrientation: false,
          institutionBearingOrientation: false,
          selectedWorkerTraining: false,
          otherFocusAreas: ''
        }
      },
      partC: {
        activities: {
          jih: { componentVisits: null },
          vanitha: { areaVisits: null },
          solidarity: { newComponentFormationAttempts: null },
          sio: { newPersonConnections: null },
          gio: { newPersonConnections: null }
        }
      },
      partD: {
        invitations: {
          male: null,
          female: null
        },
        categories: {
          personalConnection: { male: false, female: false },
          literaryConnection: { male: false, female: false },
          qscStudent: { male: false, female: false },
          regularKhutbaListener: { male: false, female: false },
          prabodhanamReader: { male: false, female: false },
          pfBeneficiary: { male: false, female: false },
          bzBeneficiary: { male: false, female: false },
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
          fulltimeWorkerConnection: { male: false, female: false },
          otherCategories: ''
        },
        categoriesCounts: {
          personalConnection: { male: 0, female: 0 },
          literaryConnection: { male: 0, female: 0 },
          qscStudent: { male: 0, female: 0 },
          regularKhutbaListener: { male: 0, female: 0 },
          prabodhanamReader: { male: 0, female: 0 },
          pfBeneficiary: { male: 0, female: 0 },
          bzBeneficiary: { male: 0, female: 0 },
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
        }
      },
      partE: {
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

  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 1:
        // Validate Part A, B, C
        return formData.district && formData.month;
      case 2:
        // Validate Part D, E
        return true; // Part D and E are optional
      default:
        return true;
    }
  }, [currentStep, formData]);

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
    <DistrictFormContext.Provider value={value}>
      {children}
    </DistrictFormContext.Provider>
  );
};
