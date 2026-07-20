import React, { createContext, useContext, useState, useCallback } from 'react';

const FormContext = createContext();

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

export const FormProvider = ({ children, initialData }) => {
  // Initialize yearly survey form data to match backend models/form.js
  const getInitialFormData = () => ({
    district: '',
    partA: {
      totalPopulation: '',
      muslimPercentage: '',
      hinduPercentage: '',
      christianPercentage: '',
      othersPercentage: '',
      movementPercentage: '',
      majorityInReligiousOrganizations: '',
      secondPosition: '',
      thirdPosition: '',
      ourPosition: '',
      morePoliticalInfluence: ''
    },
    partB: {
      organizations: {
        jih: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        vanitha: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        solidarity: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        sio: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        gio: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        malarvadi: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' },
        teenIndia: { totalAreas: '', components: '', workers2023: '', workers2025: '', components2023: '', components2025: '' }
      },
      thawheedMaraa: { existing: '', students: '', nonWorkers: '' },
      qscMen: { existing: '', students: '', nonWorkers: '' },
      qscWomen: { existing: '', students: '', nonWorkers: '' },
      jumaMosques: { count: '', averageAttendees: '', nonWorkersApprox: '' },
      institutions: {
        madrasas: { count: '', studentsCount: '', staffWorkers: '', staffOthers: '', nonTeachingWorkers: '', nonTeachingOthers: '' },
        schools: { count: '', studentsCount: '', staffWorkers: '', staffOthers: '', nonTeachingWorkers: '', nonTeachingOthers: '' },
        heavens: { count: '', studentsCount: '', staffWorkers: '', staffOthers: '', nonTeachingWorkers: '', nonTeachingOthers: '' },
        arabicColleges: { count: '', studentsCount: '', staffWorkers: '', staffOthers: '', nonTeachingWorkers: '', nonTeachingOthers: '' },
        artsColleges: { count: '', studentsCount: '', staffWorkers: '', staffOthers: '', nonTeachingWorkers: '', nonTeachingOthers: '' },
        mainCampuses: { count: '', studentsCount: '' }
      }
    },
    partC: {
      friendshipPlatforms: { count: '', cooperatingOthers: '', remarks: '' },
      fridayClub: { count: '', cooperatingOthers: '', remarks: '' },
      wings: { count: '', cooperatingOthers: '', remarks: '' },
      neighborhoodGroups: { count: '', cooperatingOthers: '', remarks: '' },
      otherNGOs: { count: '', cooperatingOthers: '', remarks: '' },
      palliative: { count: '', cooperatingOthers: '', remarks: '' },
      otherActivities: { count: '', cooperatingOthers: '', remarks: '' }
    },
    partD: {
      interestFreeSystems: { count: '', beneficiariesLast3Years: '' },
      zakatCommittee: { count: '', beneficiariesLast3Years: '' },
      peoplesFoundationBeneficiaries: '',
      housingProjectBeneficiaries: '',
      baytulZakatBeneficiaries: '',
      nonWorkersinMadhyamamReaders: '',
      nonWorkersinPrabodhanamReaders: '',
      nonWorkersinAaramamReaders: '',
      nonWorkersinAyahUsers: '',
      areas: { ourAreas: '', registeredNonOurFamilies: '' },
      influentialMahalls: '',
      khutbaListenersfromOrganizedAreas: '',
      khutbaListenersfromNonOrganizedAreas: '',
      FullTimeWorkers: '',
      PartTimeWorkers: ''
    },
    partE: {
      areasWithoutPresence: { description: '', type: 'urban' },
      panchayatsWithoutPresence: '',
      newComponentsLast5Years: { count: '', type: 'urban', details: '' },
      workersGrowthInLast5Years: { count: '', type: 'personalConnections' },
      componentsToFormIn6Months: { jih: '', vanitha: '', solidarity: '', sio: '', gio: '', teenIndia: '', malarvadi: '' }
    }
  });

  const [formData, setFormData] = useState(initialData || getInitialFormData());
  const [currentStep, setCurrentStep] = useState(1);

  const updateFormData = useCallback((part, data) => {
    setFormData(prev => {
      if (['district'].includes(part)) {
        return { ...prev, [part]: data };
      }
      return { ...prev, [part]: { ...prev[part], ...data } };
    });
  }, []);

  const setFormDataDirectly = useCallback((data) => {
    setFormData(data);
  }, []);

  const validateCurrentStep = useCallback(() => validateYearlyStep(currentStep, formData), [currentStep, formData]);

  const nextStep = useCallback(() => {
    const maxSteps = 5;
    setCurrentStep(prev => Math.min(prev + 1, maxSteps));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
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
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

// Yearly form validation, step-wise strict checks
const isFilledNumber = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const num = Number(v);
  return !isNaN(num) && num >= 0;
};
const isFilledString = (v) => typeof v === 'string' && v.trim() !== '';

const validateYearlyStep = (step, formData) => {
  if (!isFilledString(formData.district)) return false;

  if (step === 1) {
    const a = formData.partA || {};
    const requiredStrings = [
      'majorityInReligiousOrganizations',
      'secondPosition',
      'thirdPosition',
      'ourPosition',
      'morePoliticalInfluence'
    ];
    const requiredNumbers = [
      'totalPopulation',
      'muslimPercentage',
      'hinduPercentage',
      'christianPercentage',
      'othersPercentage',
      'movementPercentage'
    ];
    if (!requiredStrings.every(k => isFilledString(a[k]))) return false;
    if (!requiredNumbers.every(k => isFilledNumber(a[k]))) return false;
    return true;
  }

  if (step === 2) {
    const b = formData.partB || {};
    const orgs = b.organizations || {};
    const orgKeys = ['jih','vanitha','solidarity','sio','gio','malarvadi','teenIndia'];
    const orgFields = ['totalAreas','components','workers2023','workers2025','components2023','components2025'];
    
    for (const ok of orgKeys) {
      const o = orgs[ok] || {};
      
      // Skip totalAreas validation for malarvadi and teenIndia as they are disabled in UI
      const fieldsToValidate = ok === 'malarvadi' || ok === 'teenIndia' 
        ? orgFields.filter(f => f !== 'totalAreas')
        : orgFields;
        
      for (const f of fieldsToValidate) {
        if (!isFilledNumber(o[f])) {
          return false;
        }
      }
    }
    const requireNums = [
      b.thawheedMaraa, b.qscMen, b.qscWomen
    ].every(s => s && isFilledNumber(s.existing) && isFilledNumber(s.students) && isFilledNumber(s.nonWorkers));
    if (!requireNums) return false;
    
    const jm = b.jumaMosques || {};
    if (!(isFilledNumber(jm.count) && isFilledNumber(jm.averageAttendees) && isFilledNumber(jm.nonWorkersApprox))) return false;
    const inst = b.institutions || {};
    const instKeys = ['madrasas','schools','heavens','arabicColleges','artsColleges'];
    for (const ik of instKeys) {
      const i = inst[ik] || {};
      const fields = ['count','studentsCount','staffWorkers','staffOthers','nonTeachingWorkers','nonTeachingOthers'];
      for (const f of fields) {
        if (!isFilledNumber(i[f])) {
          return false;
        }
      }
    }
    
    // Main campuses only require count and studentsCount, staff fields are optional
    const main = inst.mainCampuses || {};
    if (!(isFilledNumber(main.count) && isFilledNumber(main.studentsCount))) return false;
    return true;
  }

  if (step === 3) {
    const c = formData.partC || {};
    const keys = ['friendshipPlatforms','fridayClub','wings','neighborhoodGroups','otherNGOs','palliative','otherActivities'];
    for (const k of keys) {
      const v = c[k] || {};
      if (!(isFilledNumber(v.count) && isFilledNumber(v.cooperatingOthers) && typeof v.remarks === 'string')) return false;
    }
    return true;
  }

  if (step === 4) {
    const d = formData.partD || {};
    const reqNumFields = [
      d.interestFreeSystems?.count,
      d.interestFreeSystems?.beneficiariesLast3Years,
      d.zakatCommittee?.count,
      d.zakatCommittee?.beneficiariesLast3Years,
      d.peoplesFoundationBeneficiaries,
      d.housingProjectBeneficiaries,
      d.baytulZakatBeneficiaries,
      d.nonWorkersinMadhyamamReaders,
      d.nonWorkersinPrabodhanamReaders,
      d.nonWorkersinAaramamReaders,
      d.nonWorkersinAyahUsers,
      d.areas?.ourAreas,
      d.areas?.registeredNonOurFamilies,
      d.influentialMahalls,
      d.khutbaListenersfromOrganizedAreas,
      d.khutbaListenersfromNonOrganizedAreas,
      d.FullTimeWorkers,
      d.PartTimeWorkers
    ];
    if (!reqNumFields.every(isFilledNumber)) return false;
    return true;
  }

  if (step === 5) {
    const e = formData.partE || {};
    if (!isFilledString(e.areasWithoutPresence?.description)) return false;
    if (!isFilledString(e.areasWithoutPresence?.type)) return false;
    if (!isFilledString(e.panchayatsWithoutPresence)) return false;
    if (!(isFilledNumber(e.newComponentsLast5Years?.count) && isFilledString(e.newComponentsLast5Years?.type) && isFilledString(e.newComponentsLast5Years?.details))) return false;
    if (!(isFilledNumber(e.workersGrowthInLast5Years?.count) && isFilledString(e.workersGrowthInLast5Years?.type))) return false;
    const comps = e.componentsToFormIn6Months || {};
    const compKeys = ['jih','vanitha','solidarity','sio','gio','teenIndia','malarvadi'];
    if (!compKeys.every(k => isFilledNumber(comps[k]))) return false;
    return true;
  }

  return false;
};
