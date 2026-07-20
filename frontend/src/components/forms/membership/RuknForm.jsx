import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Camera, Upload, ChevronRight, ChevronLeft, X } from 'lucide-react';
import axios from 'axios';
import logo from '../../../assets/LogoColor.png';
import '../../../styles/rukn-form-print.css';

const RuknForm = ({ initialData = null, isReadOnly = false, onBack = null }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const formTopRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(!!isReadOnly);
  
  // Dropdown data states
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [occupationOpen, setOccupationOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');


  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Helper to normalize occupation: convert comma-separated (from backend) to pipe-delimited (internal)
  const normalizeOccupation = (occupation) => {
    if (!occupation) return '';
    // If already pipe-delimited, return as-is
    if (occupation.includes('|') && !occupation.includes(',')) {
      return occupation;
    }
    // Convert comma-separated to pipe-delimited
    return occupation.split(',').map(v => v.trim()).filter(Boolean).join('|');
  };

  // Helper to normalize knownLanguages: convert comma-separated (from backend) to pipe-delimited (internal)
  const normalizeKnownLanguages = (knownLanguages) => {
    if (!knownLanguages) return '';
    // If already pipe-delimited, return as-is
    if (knownLanguages.includes('|') && !knownLanguages.includes(',')) {
      return knownLanguages;
    }
    // Convert comma-separated to pipe-delimited
    return knownLanguages.split(',').map(v => v.trim()).filter(Boolean).join('|');
  };

  // Defaults for nested structures to avoid undefined access in view mode
  const defaultActivityQuestions = {
    baitulMal: '',
    dawah: '',
    islamicCommunity: '',
    householdMeeting: '',
    obligatoryWorship: '',
    zakat: '',
    sunnahWorship: '',
    dailyQuran: '',
    quranStudy: '',
    reading: '',
    charity: '',
    islamicEtiquette: '',
    familyUpbringing: '',
    relationships: '',
    dailyExercise: ''
  };

  const defaultAttendance = {
    weeklyMeeting: { total: '', attended: '', leave: '', absent: '' },
    areaConvention: { total: '', attended: '', leave: '', absent: '' },
    nightCamp: { total: '', attended: '', leave: '', absent: '' }
  };

  // Predefined option lists
  const educationOptions = [
    'Below 10th STD',
    '10th Standard / SSLC / Matriculation',
    '12th Standard / Plus Two / HSC / Pre-Degree',
    'B.A. - Bachelor of Arts',
    'B.Sc. - Bachelor of Science',
    'B.Com. - Bachelor of Commerce',
    'B.Tech / B.E. - Bachelor of Technology / Engineering',
    'M.B.B.S. / BAMS / BHMS / BUMS etc',
    'B.D.S',
    'B.Arch - Architecture',
    'B.B.A. - Bachelor of Business Administration',
    'L.L.B. - Law',
    'B.C.A',
    "Any other Bachelor's Degree",
    'M.A. - Master of Arts',
    'M.Sc. - Master of Science',
    'M.Com. - Master of Commerce',
    'M.Tech / M.E. - Master of Technology / Engineering',
    'M.B.A. - Master of Business Administration',
    'M.C.A. - Master of Computer Applications',
    'M.D. / M.S. - Medicine',
    'L.L.M. - Master of Laws',
    "Any other Master's Degree",
    'M.Phil. - Master of Philosophy',
    'Ph.D. / D.Phil. - Doctorate',
    'D.Sc. / D.Litt. - Higher Doctorate',
    'Polytechnic Diploma',
    'P.G. Diploma - Post Graduate Diploma',
    'Any other Diploma',
    'I.T.I. - Industrial Training Institute',
    'Vocational Certificate',
    'Any other Certificate Course',
    'No formal education',
    'Not specified / Not applicable'
  ];

  const occupationOptions = [
    'Government Employee / Public Sector',
    'Private Sector Employee',
    'Self-Employed / Freelancer',
    'Small business owner',
    'Professional freelancer - e.g., Writer, Designer, Consultant',
    'Agriculturist / Farmer',
    'Student',
    'Homemaker / Housewife',
    'Retired',
    'Unemployed / Job Seeker',
    'IT & Technology / Software',
    'Finance & Banking',
    'Education & Training / Academics',
    'Healthcare & Medical',
    'Construction & Real Estate',
    'Manufacturing Industry',
    'Transportation & Logistics',
    'Marketing & Sales',
    'Research & Development - R&D',
    'Legal & Judiciary',
    'Hospitality & Tourism',
    'Media & Entertainment',
    'Government / Public Administration',
    'Defense & Armed Forces',
    'Administration / Office Clerk',
    'Engineer - Civil, Mechanical, Electrical, Software, etc',
    'Doctor / Nurse / Medical Professional',
    'Teacher / Professor / Educator',
    'Accountant / CA',
    'Consultant / Advisor',
    'Manager / Executive',
    'Lawyer / Advocate',
    'Driver',
    'Manual Labourer',
    'Trader / Merchant',
    'Others'
  ];

  const languageOptions = [
    { value: 'malayalam', label: 'മലയാളം' },
    { value: 'tamil', label: 'തമിഴ്' },
    { value: 'hindi', label: 'ഹിന്ദി' },
    { value: 'urdu', label: 'ഉർദു' },
    { value: 'kannada', label: 'കന്നഡ' },
    { value: 'telugu', label: 'തെലുങ്ക്' },
    { value: 'english', label: 'ഇംഗ്ലീഷ്' },
    { value: 'french', label: 'ഫ്രഞ്ച്' },
    { value: 'german', label: 'ജർമ്മൻ' },
    { value: 'spanish', label: 'സ്പാനിഷ്' },
    { value: 'latin', label: 'ലാറ്റിൻ' }
  ];

  // Checkbox mappings: UI keys -> backend book1..bookN
  const compulsoryUiKeys = [
    'constitution','rudad1','rudad2','rudad3','rudad4','rudad5','khutubat','witnessToTruth','movementAndWorkers','islamAndIgnorance','ideologyGoalPolicies','islamicWayOfLife','interrelationships','responsibilities','islamAndOrganizedLife','roleOfIqamatuddin','currentPolicyProgram'
  ];
  const advisableUiKeys = [
    'pathToSalvation','truePath','islamReligion','islamicLessons','islamAtGlance','politicalTheory','messageOfIslam','constructionDestruction','moralTheory','truthFalsehood','lifeAfterDeath','shirkPolytheism','successFactors','fourTechnicalTerms','rudadFull'
  ];

  const mapUiCompulsoryToBackend = (ui = {}) => {
    const out = {};
    compulsoryUiKeys.forEach((key, idx) => {
      out[`book${idx + 1}`] = !!ui[key];
    });
    return out;
  };
  const mapBackendCompulsoryToUi = (backend = {}) => {
    const out = {};
    compulsoryUiKeys.forEach((key, idx) => {
      out[key] = !!backend[`book${idx + 1}`];
    });
    return out;
  };

  const mapUiAdvisableToBackend = (ui = {}) => {
    const out = {};
    advisableUiKeys.forEach((key, idx) => {
      out[`book${idx + 1}`] = !!ui[key];
    });
    return out;
  };
  const mapBackendAdvisableToUi = (backend = {}) => {
    const out = {};
    advisableUiKeys.forEach((key, idx) => {
      out[key] = !!backend[`book${idx + 1}`];
    });
    return out;
  };

  // Map UI activityQuestions keys to backend question1..question15 and vice versa
  const activityUiOrder = [
    'baitulMal',
    'dawah',
    'islamicCommunity',
    'householdMeeting',
    'obligatoryWorship',
    'zakat',
    'sunnahWorship',
    'dailyQuran',
    'quranStudy',
    'reading',
    'charity',
    'islamicEtiquette',
    'familyUpbringing',
    'relationships',
    'dailyExercise'
  ];

  const mapUiActivityToBackend = (ui = {}) => {
    const out = {};
    activityUiOrder.forEach((key, idx) => {
      out[`question${idx + 1}`] = ui[key] ?? '';
    });
    return out;
  };

  const mapBackendActivityToUi = (backend = {}) => {
    const out = {};
    activityUiOrder.forEach((key, idx) => {
      out[key] = backend[`question${idx + 1}`] ?? '';
    });
    return out;
  };

  const formatDateValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.includes('T')) return trimmed.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
    return '';
  };

  const parseAttendanceString = (s = '') => {
    if (typeof s !== 'string') return { total: '', attended: '', leave: '', absent: '' };
    const [total = '', attended = '', leave = '', absent = ''] = s.split('|');
    return { total, attended, leave, absent };
  };

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        occupation: normalizeOccupation(initialData.occupation),
        knownLanguages: normalizeKnownLanguages(initialData.knownLanguages)
      };
    }
    return {
    // Personal Information
    localUnit: '',
    area: '',
    district: '',
    division: '',
    name: '',
    nameEnglish: '',
    fathersName: '',
    spouse: '',
    childrenBoys: '',
    childrenGirls: '',
    fullAddress: '',
    place: '',
    po: '',
    pin: '',
    mobile: '',
    email: '',
    
    // Additional Information
    age: '',
    dateOfBirth: '',
    educationalQualification: '',
    otherSkills: '',
    knownLanguages: '',
    occupation: '',
    otherIncomeSources: '',
    previousOrganization: '',
    
    // Application details
    applicationDate: '',
    applicantDate: '',
    signature: '',
    
    // Page 2 - Additional Questions
    question5a: '', // When did you start reading Jamath literature?
    question5b: '', // What prompted you to apply for membership?
    question6: '',
    question7a: '', // Are you well aware of the difficulties and hardships?
    question7b: '', // Are you willing to face them with good will and equanimity?
    question7: '', // Combined field for backward compatibility
    
    // Other Information
    familyConnection: {
      wifeHusband: '',
      children: ''
    },
    debtsLiabilities: '',
    organizationalResponsibilities: '',
    nearestLocalJamaat: '',
    contactUnitAbroad: '',
    
    // Compulsory Books
    compulsoryBooks: {
      constitution: false,
      rudad1: false,
      rudad2: false,
      rudad3: false,
      rudad4: false,
      rudad5: false,
      khutubat: false,
      witnessToTruth: false,
      movementAndWorkers: false,
      islamAndIgnorance: false,
      ideologyGoalPolicies: false,
      islamicWayOfLife: false,
      interrelationships: false,
      responsibilities: false,
      islamAndOrganizedLife: false,
      roleOfIqamatuddin: false,
      currentPolicyProgram: false
    },
    
    // Advisable Books
    advisableBooks: {
      pathToSalvation: false,
      truePath: false,
      islamReligion: false,
      islamicLessons: false,
      islamAtGlance: false,
      politicalTheory: false,
      messageOfIslam: false,
      constructionDestruction: false,
      moralTheory: false,
      truthFalsehood: false,
      lifeAfterDeath: false,
      shirkPolytheism: false,
      successFactors: false,
      fourTechnicalTerms: false,
      rudadFull: false
    },
    
    // Page 3 - Activity Report
    reportPeriod: {
      from: '',
      to: ''
    },
    attendance: {
      weeklyMeeting: {
        total: '',
        attended: '',
        leave: '',
        absent: ''
      },
      areaConvention: {
        total: '',
        attended: '',
        leave: '',
        absent: ''
      },
      nightCamp: {
        total: '',
        attended: '',
        leave: '',
        absent: ''
      }
    },
    activityQuestions: {
      baitulMal: '',
      dawah: '',
      islamicCommunity: '',
      householdMeeting: '',
      obligatoryWorship: '',
      zakat: '',
      sunnahWorship: '',
      dailyQuran: '',
      quranStudy: '',
      reading: '',
      charity: '',
      islamicEtiquette: '',
      familyUpbringing: '',
      relationships: '',
      dailyExercise: ''
    },
    
    // Page 4 - Recommendation Form
    localAmeer: {
      name: '',
      date: '',
      signature: '',
      opinion: ''
    },
    districtPresident: {
      opinion: '',
      name: '',
      signature: '',
      date: ''
    },
    regionalNazim: {
      opinion: '',
      name: '',
      signature: '',
      date: ''
    }
    };
  });

  // Hydrate names and ids when viewing an existing form
  useEffect(() => {
    if (initialData) {
      const splitLegacyQuestion7 = (value = '') => {
        if (!value) return { a: '', b: '' };
        if (typeof value !== 'string') return { a: String(value ?? ''), b: '' };
        const parts = value.split(/\r?\n|\|/).map(part => part.trim()).filter(Boolean);
        if (parts.length === 0) return { a: value.trim(), b: '' };
        if (parts.length === 1) return { a: parts[0], b: '' };
        return { a: parts[0], b: parts[1] };
      };
      const legacyQ7 = splitLegacyQuestion7(initialData.question7);

      setFormData(prev => ({
        ...prev,
        district: initialData.district || initialData.districtName || prev.district,
        area: initialData.area || initialData.areaName || prev.area,
        localUnit: initialData.localUnit || initialData.unitName || prev.localUnit,
        dateOfBirth: formatDateValue(initialData.dateOfBirth ?? prev.dateOfBirth),
        applicationDate: formatDateValue(initialData.applicationDate ?? initialData.applicantDate ?? initialData.submittedAt ?? prev.applicationDate),
        applicantDate: formatDateValue(initialData.applicantDate ?? initialData.applicationDate ?? initialData.submittedAt ?? prev.applicantDate),
        question5a: initialData.question5a ?? initialData.question5 ?? prev.question5a ?? '',
        question5b: initialData.question5b ?? prev.question5b ?? '',
        question6: initialData.question6 ?? prev.question6 ?? '',
        question7a: initialData.question7a ?? legacyQ7.a ?? prev.question7a ?? '',
        question7b: initialData.question7b ?? legacyQ7.b ?? prev.question7b ?? '',
        question7: initialData.question7 ?? prev.question7 ?? '',
        reportPeriod: {
          ...(prev.reportPeriod || {}),
          from: formatDateValue(initialData.reportPeriod?.from ?? prev?.reportPeriod?.from),
          to: formatDateValue(initialData.reportPeriod?.to ?? prev?.reportPeriod?.to)
        },
        localAmeer: {
          ...(prev.localAmeer || {}),
          ...(initialData.localAmeer || {}),
          date: formatDateValue(initialData.localAmeer?.date ?? prev.localAmeer?.date)
        },
        districtPresident: {
          ...(prev.districtPresident || {}),
          ...(initialData.districtPresident || {}),
          date: formatDateValue(initialData.districtPresident?.date ?? prev.districtPresident?.date)
        },
        regionalNazim: {
          ...(prev.regionalNazim || {}),
          ...(initialData.regionalNazim || {}),
          date: formatDateValue(initialData.regionalNazim?.date ?? prev.regionalNazim?.date)
        },
        officeUse: {
          ...(prev.officeUse || {}),
          ...(initialData.officeUse || {}),
          date: formatDateValue(initialData.officeUse?.date ?? prev.officeUse?.date)
        },
        // Ensure nested defaults exist when initialData lacks them
        activityQuestions: {
          ...defaultActivityQuestions,
          ...(prev.activityQuestions || {}),
          ...mapBackendActivityToUi(initialData.activityQuestions || {})
        },
        compulsoryBooks: {
          ...mapBackendCompulsoryToUi(initialData.compulsoryBooks || {}),
          ...(prev.compulsoryBooks || {})
        },
        advisableBooks: {
          ...mapBackendAdvisableToUi(initialData.advisableBooks || {}),
          ...(prev.advisableBooks || {})
        },
        attendance: {
          weeklyMeeting: parseAttendanceString(initialData.attendance?.weeklyMeeting),
          areaConvention: parseAttendanceString(initialData.attendance?.areaConvention),
          nightCamp: parseAttendanceString(initialData.attendance?.nightCamp)
        }
      }));
      if (initialData.districtId) setSelectedDistrictId(initialData.districtId);
      if (initialData.areaId) setSelectedAreaId(initialData.areaId);
      if (initialData.unitId) setSelectedUnitId(initialData.unitId);
    }
  }, [initialData]);

  // On first mount ensure defaults for nested objects even without initialData
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      activityQuestions: { ...defaultActivityQuestions, ...(prev.activityQuestions || {}) },
      attendance: {
        weeklyMeeting: { ...defaultAttendance.weeklyMeeting, ...(typeof prev.attendance?.weeklyMeeting === 'object' ? prev.attendance.weeklyMeeting : {}) },
        areaConvention: { ...defaultAttendance.areaConvention, ...(typeof prev.attendance?.areaConvention === 'object' ? prev.attendance.areaConvention : {}) },
        nightCamp: { ...defaultAttendance.nightCamp, ...(typeof prev.attendance?.nightCamp === 'object' ? prev.attendance.nightCamp : {}) }
      }
    }));
  }, []);

  // Load full form when viewing (initialData may be partial from list)
  useEffect(() => {
    const loadFullFormIfNeeded = async () => {
      try {
        if (!isReadOnly) return; // editing/new submit uses local state
        const id = initialData?._id;
        if (!id) return;
        const token = localStorage.getItem('userToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const url = `${API_BASE_URL}/api/rukn/${id}`;
        const res = await axios.get(url, { headers });
        const full = res.data?.data || {};
        // Merge into form with proper mappings
        setFormData(prev => ({
          ...prev,
          // names
          district: full.district || full.districtName || prev.district,
          area: full.area || full.areaName || prev.area,
          localUnit: full.localUnit || full.unitName || prev.localUnit,
          // page 2 fields (backward compatibility: if old question5 exists, use it for question5a)
          question5a: (full.question5a ?? (full.question5 && !full.question5a ? full.question5 : '') ?? prev.question5a ?? ''),
          question5b: (full.question5b ?? prev.question5b ?? ''),
          question6: (full.question6 ?? full.activityQuestions?.question6 ?? prev.question6 ?? ''), 
          question7a: (full.question7a ?? prev.question7a ?? ''),
          question7b: (full.question7b ?? prev.question7b ?? ''),
          question7: (full.question7 ?? full.activityQuestions?.question7 ?? prev.question7 ?? ''),
          // activity questions map
          activityQuestions: {
            ...defaultActivityQuestions,
            ...mapBackendActivityToUi(full.activityQuestions || {}),
            ...(prev.activityQuestions || {})
          },
          compulsoryBooks: {
            ...mapBackendCompulsoryToUi(full.compulsoryBooks || {}),
            ...(prev.compulsoryBooks || {})
          },
          advisableBooks: {
            ...mapBackendAdvisableToUi(full.advisableBooks || {}),
            ...(prev.advisableBooks || {})
          },
          // attendance parse from strings
          attendance: {
            weeklyMeeting: parseAttendanceString(full.attendance?.weeklyMeeting),
            areaConvention: parseAttendanceString(full.attendance?.areaConvention),
            nightCamp: parseAttendanceString(full.attendance?.nightCamp)
          }
        }));
        // ids
        if (full.districtId) setSelectedDistrictId(full.districtId);
        if (full.areaId) setSelectedAreaId(full.areaId);
        if (full.unitId) setSelectedUnitId(full.unitId);
      } catch (e) {
        console.error('Failed to load full Rukn form:', e?.response?.data || e.message);
      }
    };
    loadFullFormIfNeeded();
  }, [isReadOnly, initialData, API_BASE_URL]);

  const loadDistricts = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/districts`);
      console.log('Raw districts response:', response.data);
      const list = Array.isArray(response?.data?.data)
        ? response.data.data.map(d => ({ id: d._id || d.id, name: d.title || d.name }))
        : [];
      console.log('Districts parsed:', list);
      setDistricts(list);
    } catch (error) {
      console.error('Error loading districts:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
     
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAreas = useCallback(async (districtId) => {
    try {
      setLoading(true);
      console.log('Loading areas for districtId:', districtId);
      if (!districtId) { setAreas([]); return; }
      const url = `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(districtId)}`;
      console.log('Loading areas from:', url);
      const response = await axios.get(url);
      const list = Array.isArray(response?.data?.data)
        ? response.data.data.map(a => ({ id: a._id || a.id, name: a.title || a.name }))
        : [];
      console.log('Areas parsed:', list);
      setAreas(list);
    } catch (error) {
      console.error('Error loading areas:', error);
      console.error('Error response:', error.response?.data);
      // Set fallback data for testing
      const fallbackAreas = [
        { id: `${districtId}_area1`, name: `${districtId} Area 1` },
        { id: `${districtId}_area2`, name: `${districtId} Area 2` },
        { id: `${districtId}_area3`, name: `${districtId} Area 3` }
      ];
      console.log('Using fallback areas:', fallbackAreas);
      setAreas(fallbackAreas);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnits = useCallback(async (areaId) => {
    try {
      setLoading(true);
      console.log('Loading units for areaId:', areaId);
      if (!areaId) { setUnits([]); return; }
      const url = `${API_BASE_URL}/api/user/hierarchy/units/${encodeURIComponent(areaId)}`;
      console.log('Loading units from:', url);
      const response = await axios.get(url);
      console.log('Raw units response:', response.data);
      const list = Array.isArray(response?.data?.data)
        ? response.data.data.map(u => ({ id: u._id || u.id, name: u.title || u.name }))
        : [];
      console.log('Units parsed:', list);
      setUnits(list);
    } catch (error) {
      console.error('Error loading units:', error);
      console.error('Error response:', error.response?.data);
      // Set fallback data for testing
      const fallbackUnits = [
        { id: `${areaId}_unit1`, name: `${areaId} Unit 1` },
        { id: `${areaId}_unit2`, name: `${areaId} Unit 2` },
        { id: `${areaId}_unit3`, name: `${areaId} Unit 3` }
      ];
      console.log('Using fallback units:', fallbackUnits);
      setUnits(fallbackUnits);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load districts on component mount
  useEffect(() => {
    loadDistricts();
  }, [loadDistricts]);

  // Load areas when districtId changes
  useEffect(() => {
    if (selectedDistrictId) {
      loadAreas(selectedDistrictId);
    } else {
      setAreas([]);
      setUnits([]);
    }
  }, [selectedDistrictId, loadAreas]);

  // Load units when areaId changes
  useEffect(() => {
    if (selectedAreaId) {
      loadUnits(selectedAreaId);
    } else {
      setUnits([]);
    }
  }, [selectedAreaId, loadUnits]);

  // No auto-fill; names come from selections

  // Auto-populate current date for applicationDate when form loads (only for new forms)
  useEffect(() => {
    if (!isReadOnly && !initialData && !formData.applicationDate) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        applicationDate: today
      }));
    }
  }, [isReadOnly, initialData]);

  /**
   * Calculate age from date of birth (string format: YYYY-MM-DD)
   * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
   * @returns {string} Calculated age or empty string if DOB is invalid
   */
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) {
      return '';
    }

    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      // Validate date
      if (isNaN(birthDate.getTime()) || birthDate > today) {
        return '';
      }

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 0 ? age.toString() : '';
    } catch {
      return '';
    }
  };

  // Calculate age from DOB when initial data is loaded or DOB changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const calculatedAge = calculateAge(formData.dateOfBirth);
      setFormData(prev => {
        // Only update if the calculated age is different from current age
        if (calculatedAge !== prev.age) {
          return {
            ...prev,
            age: calculatedAge
          };
        }
        return prev;
      });
    } else {
      // Clear age if DOB is cleared
      setFormData(prev => {
        if (prev.age !== '') {
          return {
            ...prev,
            age: ''
          };
        }
        return prev;
      });
    }
  }, [formData.dateOfBirth]);

  const handleInputChange = (field, value) => {
    if (isReadOnly) return;
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate age when DOB changes
      if (field === 'dateOfBirth') {
        newData.age = calculateAge(value);
      }
      
      // Clear dependent fields when parent changes
      if (field === 'district') {
        newData.area = '';
        newData.localUnit = '';
      } else if (field === 'area') {
        newData.localUnit = '';
      }
      
      return newData;
    });
  };

  const handleCheckboxChange = (section, field, checked) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: checked
      }
    }));
  };

  const handleNestedInputChange = (section, field, value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleAttendanceChange = (meetingType, field, value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [meetingType]: {
          ...prev.attendance[meetingType],
          [field]: value
        }
      }
    }));
  };

  // Occupation multi-select: keep backend format as comma-separated string
  const handleOccupationMultiSelect = (selectedValues) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      occupation: selectedValues.join('|')
    }));
  };

  const selectedOccupationValues = Array.isArray(formData.occupation)
    ? formData.occupation
    : (formData.occupation ? formData.occupation.split('|').map(val => val.trim()).filter(Boolean) : []);

  // Languages multi-select: keep backend format as comma-separated string
  const handleLanguagesMultiSelect = (selectedValues) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      knownLanguages: selectedValues.join('|')
    }));
  };

  const selectedLanguageValues = Array.isArray(formData.knownLanguages)
    ? formData.knownLanguages
    : (formData.knownLanguages ? formData.knownLanguages.split('|').map(val => val.trim()).filter(Boolean) : []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      setSubmitting(true);
      // Basic required checks
      if (!formData.district || !formData.area || !formData.localUnit) {
        alert('Please select District, Area and Unit');
        setSubmitting(false);
        return;
      }
      if (!formData.name || !formData.nameEnglish || !formData.mobile || !formData.email || !formData.fathersName || !formData.fullAddress || !formData.place || !formData.po || !formData.pin || !formData.age || !formData.dateOfBirth) {
        alert('Please fill all required fields: Name (Malayalam), Name (English), Mobile, Email, Father\'s Name, Address, Place, PO, PIN, Age and Date of Birth');
        setSubmitting(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert('Please enter a valid email address');
        setSubmitting(false);
        return;
      }

      // Children counts validation (allow empty -> 0; else non-negative integers)
      const boysStr = (formData.childrenBoys ?? '').toString().trim();
      const girlsStr = (formData.childrenGirls ?? '').toString().trim();
      const boys = boysStr === '' ? 0 : Number(boysStr);
      const girls = girlsStr === '' ? 0 : Number(girlsStr);
      const isInt = (n) => Number.isInteger(n) && n >= 0;
      if (!isInt(boys) || !isInt(girls)) {
        alert('Please enter valid non-negative whole numbers for children counts');
        setSubmitting(false);
        return;
      }

      // Backend expects attendance.* as strings, not objects
      const formatAttendance = (a) => {
        if (!a) return '';
        const total = a.total ?? '';
        const attended = a.attended ?? '';
        const leave = a.leave ?? '';
        const absent = a.absent ?? '';
        return `${total}|${attended}|${leave}|${absent}`; // total|attended|leave|absent
      };

      const combinedQuestion7 = [formData.question7a || '', formData.question7b || '']
        .map((part) => (part || '').trim())
        .filter((part, index, arr) => part !== '' || arr.length === 1)
        .join(' ')
        .trim();

      // Convert occupation from pipe-delimited to comma-separated for backend
      const occupationForSubmit = formData.occupation 
        ? formData.occupation.split('|').map(v => v.trim()).filter(Boolean).join(', ')
        : '';

      // Convert knownLanguages from pipe-delimited to comma-separated for backend
      const knownLanguagesForSubmit = formData.knownLanguages 
        ? formData.knownLanguages.split('|').map(v => v.trim()).filter(Boolean).join(', ')
        : '';

        const submitData = {
        ...formData,
        photo: photoPreview,
        occupation: occupationForSubmit,
        knownLanguages: knownLanguagesForSubmit,
          childrenBoys: boys,
          childrenGirls: girls,
        applicantDate: formData.applicationDate || formData.applicantDate || '',
        question7: combinedQuestion7 || formData.question7 || '',
        // Persist selected hierarchy to backend model fields
        unitId: selectedUnitId || '',
        unitName: formData.localUnit || '',
        areaId: selectedAreaId || '',
        areaName: formData.area || '',
        districtId: selectedDistrictId || '',
        districtName: formData.district || '',
        // Map activity questions to backend field names
        activityQuestions: mapUiActivityToBackend(formData.activityQuestions || {}),
        // Map checkbox groups to backend structure
        compulsoryBooks: mapUiCompulsoryToBackend(formData.compulsoryBooks || {}),
        advisableBooks: mapUiAdvisableToBackend(formData.advisableBooks || {}),
        attendance: {
          weeklyMeeting: formatAttendance(formData.attendance?.weeklyMeeting),
          areaConvention: formatAttendance(formData.attendance?.areaConvention),
          nightCamp: formatAttendance(formData.attendance?.nightCamp)
        }
      };

      const url = `${API_BASE_URL}/api/rukn/submit`;
      console.log('Submitting Rukn payload:', {
        unitId: submitData.unitId,
        unitName: submitData.unitName,
        areaId: submitData.areaId,
        areaName: submitData.areaName,
        districtId: submitData.districtId,
        districtName: submitData.districtName,
        compulsoryBooks: submitData.compulsoryBooks,
        advisableBooks: submitData.advisableBooks,
        activityQuestions: submitData.activityQuestions,
        attendance: submitData.attendance
      });
      const res = await axios.post(url, submitData);
      if (res?.data?.success) {
        console.log('Rukn submit response:', res.data);
        // Show success message
        setShowSuccess(true);
        // Navigate to landing page after 2 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        alert(res?.data?.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit error:', err?.response?.data || err.message);
      alert(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper functions for PDF layout
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const formatCompulsoryBooks = () => {
    const books = [];
    if (formData.compulsoryBooks?.constitution) books.push('1. ജമാअത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന');
    if (formData.compulsoryBooks?.rudad1 || formData.compulsoryBooks?.rudad2 || 
        formData.compulsoryBooks?.rudad3 || formData.compulsoryBooks?.rudad4 || 
        formData.compulsoryBooks?.rudad5) {
      books.push('2. പ്രാസ്ഥാനിക  ശിക്ഷണം : റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി സംഗ്രഹം.');
    }
    if (formData.compulsoryBooks?.khutubat) books.push('3. ഖുതുബാത്ത്');
    if (formData.compulsoryBooks?.witnessToTruth) books.push('4. സത്യസാക്ഷ്യം');
    if (formData.compulsoryBooks?.movementAndWorkers) books.push('5. പ്രസ്ഥാനവും പ്രവർത്തകരും');
    if (formData.compulsoryBooks?.islamAndIgnorance) books.push('6. ഇസ്‌ലാമും ജാഹിലിയ്യത്തും');
    if (formData.compulsoryBooks?.ideologyGoalPolicies) books.push('7. ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്, ആദർശം ലക്ഷ്യം നയനിലപാടുകൾ');
    if (formData.compulsoryBooks?.islamicWayOfLife) books.push('8. ഇസ്‌ലാമിന്റെ ജീവിത വ്യവസ്ഥ');
    if (formData.compulsoryBooks?.interrelationships) books.push('9. ഇസ്‌ലാമിക പ്രവർത്തകരുടെ പരസ്പര ബന്ധങ്ങൾ');
    if (formData.compulsoryBooks?.responsibilities) books.push('10. ഇസ്‌ലാമിക പ്രവർത്തകരുടെ ഉത്തരവാദിത്തങ്ങൾ');
    if (formData.compulsoryBooks?.islamAndOrganizedLife) books.push('11. ഇസ്‌ലാമും സംഘടിത ജീവിതവും');
    if (formData.compulsoryBooks?.roleOfIqamatuddin) books.push('12. ഇഖാമതുദ്ദീനിന്റെ ഭൂമിക');
    if (formData.compulsoryBooks?.currentPolicyProgram) books.push('13. നടപ്പുമീഖാത്തിലെ പോളിസി-പ്രോഗ്രാം');
    return books;
  };

  const formatAdvisableBooks = () => {
    const books = [];
    const bookMap = {
      pathToSalvation: 'രക്ഷാസരണി',
      truePath: 'സത്യമാർഗം',
      islamReligion: 'ഇസ്‌ലാം മതം',
      islamicLessons: 'ഇസ്‌ലാമിക പാഠങ്ങൾ',
      islamAtGlance: 'ഇസ്‌ലാം ഒറ്റ നോട്ടത്തിൽ',
      politicalTheory: 'ഇസ്‌ലാമിന്റെ രാഷ്ട്രീയ സിദ്ധാന്തം',
      messageOfIslam: 'ഇസ്‌ലാമിന്റെ സന്ദേശം',
      constructionDestruction: 'നിർമ്മാണവും സംഹാരവും',
      moralTheory: 'ഇസ്‌ലാമിന്റെ ധാർമ്മിക സിദ്ധാന്തം',
      truthFalsehood: 'സത്യവും അസത്യവും',
      lifeAfterDeath: 'മരണാനന്തര ജീവിതം',
      shirkPolytheism: 'ശിർക്ക് അഥവാ ബഹുദൈവ വിശ്വാസം',
      successFactors: 'ഇസ്‌ലാമിക പ്രസ്ഥാനത്തിന്റെ വിജയനിദാനങ്ങൾ',
      fourTechnicalTerms: 'ഖുർആനിലെ നാലു സാങ്കേതിക ശബ്ദങ്ങൾ',
      rudadFull: 'റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി (ഭാഗം:1-5)'
    };
    Object.keys(bookMap).forEach(key => {
      if (formData.advisableBooks?.[key]) {
        books.push(bookMap[key]);
      }
    });
    return books;
  };

  // PDF Layout Component (Print-Only JSX)
  const RuknPDFLayout = () => (
    <div className="pdf-layout print-only" style={{ fontFamily: 'Anek Malayalam Variable' }}>
      {/* PDF Header */}
      <div className="pdf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logo} alt="JIH Logo" style={{ height: '64px', width: 'auto' }} />
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '20px' }}>അംഗത്വ അപേക്ഷ</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>ജമാഅത്തെ</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>ഇസ്‌ലാമി ഹിന്ദ്</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>കേരള ഹൽഖ</p>
          <p style={{ fontSize: '12px', marginTop: '4px', margin: '0' }}>www.jamaateislamihind.org</p>
        </div>
      </div>

      {/* Page 1: Personal Information */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>അപേക്ഷകൻ്റെ വിവരങ്ങൾ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '20px', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജില്ല (District)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.district || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഏരിയ (Area)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.area || ''}</p>
          </div>
          <div style={{ gridRow: '1 / span 3' }}>
            {photoPreview && (
              <img src={photoPreview} alt="Applicant Photo" style={{ width: '120px', height: 'auto', display: 'block' }} />
            )}
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഘടകം (Unit)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.localUnit || ''}</p>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', marginTop: '20px' }}>വ്യക്തിപരമായ വിവരങ്ങൾ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര് (Malayalam)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.name || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Name (English)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.nameEnglish || ''}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിതാവിന്റെ പേര്</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.fathersName || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഭാര്യ/ഭർത്താവ്</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.spouse || ''}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ആൺകുട്ടികൾ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.childrenBoys || '0'}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പെൺകുട്ടികൾ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.childrenGirls || '0'}</p>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പൂർണ്ണവിലാസം</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{formData.fullAddress || ''}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>സ്ഥലം</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.place || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പി.ഒ.</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.po || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിൻ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.pin || ''}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മൊബൈൽ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.mobile || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഇ-മെയിൽ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Declaration Section */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>പ്രഖ്യാപനം</h3>
        <div style={{ fontSize: '11pt', lineHeight: '1.6', marginBottom: '12px' }}>
          <p style={{ marginBottom: '8px' }}>
            ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് കേരള ഹൽഖ അമീർ അവർകൾക്ക്{' '}
            <span style={{ direction: 'rtl', textAlign: 'center', display: 'inline-block', fontFamily: 'Arial, sans-serif' }}>السلام عليكم ورحمة الله وبركاته</span>
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>1.</strong> ഞാൻ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 3 പ്രകാരം{' '}
            <span style={{ direction: 'rtl', textAlign: 'center', display: 'inline-block', fontFamily: 'Arial, sans-serif' }}>لا إله إلا الله محمد رسول الله</span>{' '}
            എന്ന ആദർശവാക്യം, വിശദീകരണ സഹിതം ശരിക്കും മനസ്സിലാക്കുകയും ഇതുതന്നെയാണ് എന്റെ ആദർശമെന്ന് സാക്ഷ്യം വഹിക്കുകയും ചെയ്യുന്നു.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>2.</strong> ജമാഅത്തിന്റെ ലക്ഷ്യം ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 4 പ്രകാരം വിശദീകരണ സഹിതം ഞാൻ നല്ലപോലെ മനസ്സിലാക്കിയതിനെ തുടർന്ന് എന്റെ ജീവിതത്തിന്റെ ലക്ഷ്യം ഇഖാമതുദ്ദീൻ ആണെന്ന് ഞാൻ പ്രഖ്യാപിക്കുന്നു. ലക്ഷ്യസാക്ഷാത്ക്കാരത്തിനായി, അല്ലാഹുവിന്റെ തൃപ്‌തി മാത്രം കാംക്ഷിച്ച് ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദിൽ ചേർന്ന് പ്രവർത്തിക്കാൻ ഞാൻ ആഗ്രഹിക്കുന്നു. ഇക്കാര്യത്തിൽ എന്റെ സാക്ഷാൽ പ്രചോദനം അല്ലാഹുവിന്റെ തൃപ്തിയും പരലോക വിജയവും മാത്രമാകുന്നു.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>3.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 5-ൽ പറയുന്ന പ്രവർത്തന മാർഗം ഞാൻ ശ്രദ്ധാപൂർവം മനസ്സിലാക്കിയിട്ടുണ്ട്. ആയതിനാൽ ലക്ഷ്യസാക്ഷാത്ക്കാരത്തിനായി ഇതേ പ്രവർത്തന മാർഗം ഞാൻ അനുസരണപൂർവം പിന്തുടരുന്നതാണ്.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>4.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഞാൻ നല്ല പോലെ മനസ്സിലാക്കിയിട്ടുണ്ട്. ആയതിനാൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയും അതുപ്രകാരമുള്ള പാർട്ടി വ്യവസ്ഥകളും പൂർണ്ണമായും അനുസരിക്കുമെന്ന് ഞാൻ പ്രതിജ്ഞ ചെയ്യുന്നു. മേൽ പറഞ്ഞ സാക്ഷ്യത്തിന്റെയും പ്രതിജ്ഞയുടെയും അടിസ്ഥാനത്തിൽ എന്നെ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് അംഗമാക്കാൻ ശുപാർശ ചെയ്യണമെന്ന് അഭ്യർഥിക്കുന്നു.
          </p>
        </div>
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(formData.applicationDate)}</p>
        </div>
      </div>

      {/* Additional Information */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>അധിക വിവരങ്ങൾ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജനന തിയ്യതി</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(formData.dateOfBirth)}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വയസ്സ്</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.age || ''}</p>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിദ്യാഭ്യാസ യോഗ്യത</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.educationalQualification || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റു കഴിവുകൾ</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.otherSkills || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>അറിയാവുന്ന ഭാഷകൾ</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.knownLanguages || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജോലി</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{formData.occupation || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റുവരുമാന മാർഗ്ഗങ്ങൾ</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.otherIncomeSources || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മുമ്പ് മറ്റു സംഘടന/പ്രസ്ഥാനവുമായി ബന്ധമുണ്ടായിരുന്നുവോ?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{formData.previousOrganization || ''}</p>
        </div>
      </div>

      {/* Hard Page Break Before Page 2 */}
      <div className="page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

      {/* Page 2: Questions 5-7 */}
      <div className="pdf-section pdf-section-page2-start" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>ചോദ്യങ്ങൾ 5 - 7</h3>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>5.ജമാഅത്ത്  സാഹിത്യങ്ങൾ എപ്പോൾ മുതൽ വായിച്ചു തുടങ്ങി?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.question5a || ''}</p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}> - ജമാഅത്ത്  അംഗത്വത്തിനപേക്ഷിക്കാൻ പ്രേരിപ്പിച്ച സംഗതി എന്ത്?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.question5b || ''}</p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>6. നിങ്ങളുടെ ജീവിതത്തിൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയുടെ എട്ടാം ഖണ്ഡികയുമായി വിരുദ്ധമായ എന്തെങ്കിലും ഉണ്ടോ?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.question6 || ''}</p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>7. സത്യമാർഗത്തിൽ പ്രവർത്തിക്കുമ്പോൾ നേരിടാനിടയുള്ള പ്രയാസങ്ങളും കഷ്ടനഷ്ടങ്ങളും സംബന്ധിച്ച് താങ്കൾ നല്ലപോലെ ബോധവാനാണോ?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.question7a || ''}</p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}> - അത് സന്മനസ്സോടെയും സമചിത്തതയോടെയും അഭിമുഖീകരിക്കാൻ താങ്കൾ തയാറാണോ?</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.question7b || ''}</p>
        </div>
      </div>

      {/* Applicant Confirmation */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>അപേക്ഷകന്റെ സ്ഥിരീകരണം</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>അപേക്ഷകന്റെ പേര്</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.name || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(formData.applicationDate)}</p>
          </div>
        </div>
      </div>

      {/* Other Information */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>മറ്റുവിവരങ്ങൾ</h3>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>1. കുടുംബത്തിന്റെ പ്രാസ്ഥാനിക ബന്ധം: ഭാര്യ/ഭർത്താവ്:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.familyConnection?.wifeHusband || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>സന്താനങ്ങൾ:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.familyConnection?.children || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>2. കടങ്ങൾ, ബാധ്യതകൾ:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.debtsLiabilities || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>3. പ്രസ്ഥാനവുമായി ബന്ധപ്പെട്ട് വഹിക്കുന്ന ചുമതലകൾ?:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.organizationalResponsibilities || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>4. ഏറ്റവും അടുത്തുള്ള പ്രാദേശിക ജമാഅത്തെ:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.nearestLocalJamaat || ''}</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>5. കേരളത്തിന് പുറത്താണെങ്കിൽ (വിദേശം/ഇതര സംസ്ഥാനം) നാട്ടിൽ ബന്ധപ്പെടുന്ന ഘടകം:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.contactUnitAbroad || ''}</p>
        </div>
      </div>

      {/* Compulsory Books */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>നിർബന്ധമായും വായിച്ചിരിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            {formatCompulsoryBooks().slice(0, 7).map((book, idx) => (
              <p key={idx} style={{ fontSize: '11pt', margin: '4px 0' }}>{book}</p>
            ))}
          </div>
          <div>
            {formatCompulsoryBooks().slice(7).map((book, idx) => (
              <p key={idx} style={{ fontSize: '11pt', margin: '4px 0' }}>{book}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Advisable Books */}
      <div className="pdf-section" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>അഭികാമ്യമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            {formatAdvisableBooks().slice(0, 5).map((book, idx) => (
              <p key={idx} style={{ fontSize: '11pt', margin: '4px 0' }}>{book}</p>
            ))}
          </div>
          <div>
            {formatAdvisableBooks().slice(5, 9).map((book, idx) => (
              <p key={idx} style={{ fontSize: '11pt', margin: '4px 0' }}>{book}</p>
            ))}
          </div>
          <div>
            {formatAdvisableBooks().slice(9).map((book, idx) => (
              <p key={idx} style={{ fontSize: '11pt', margin: '4px 0' }}>{book}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Hard Page Break Before Page 3 */}
      <div className="page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

      {/* Page 3: Activity Report */}
      <div className="pdf-section pdf-section-page2-start" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>അപേക്ഷകന്റെ കഴിഞ്ഞ ഒരു വർഷത്തെ പ്രവർത്തന റിപ്പോർട്ട്</h2>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '11pt', marginBottom: '8px' }}>
            {formatDate(formData.reportPeriod?.from)} മുതൽ {formatDate(formData.reportPeriod?.to)} വരെ
          </p>
        </div>

        {/* Attendance Table */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>1. യോഗങ്ങളിലെ ഹാജർ</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontSize: '11pt', fontWeight: 'bold' }}>യോഗങ്ങൾ</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt', fontWeight: 'bold' }}>പ്രതിവാരയോഗം</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt', fontWeight: 'bold' }}>ഏരിയാ കൺവെൻഷൻ</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt', fontWeight: 'bold' }}>നിശാ ക്യാമ്പ്</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>റിപ്പോർട്ട് കാലത്ത് ആകെ നടന്നത്</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.weeklyMeeting?.total || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.areaConvention?.total || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.nightCamp?.total || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ഹാജർ</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.weeklyMeeting?.attended || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.areaConvention?.attended || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.nightCamp?.attended || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ലീവ്</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.weeklyMeeting?.leave || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.areaConvention?.leave || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.nightCamp?.leave || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ആബ്സന്റ്</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.weeklyMeeting?.absent || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.areaConvention?.absent || ''}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{formData.attendance?.nightCamp?.absent || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Activity Questions */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>2. പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം</h3>
          <div style={{ fontSize: '11pt' }}>
            {[
              { key: 'baitulMal', label: '2. ബൈത്തുൽമാൽ കൃത്യമായി നൽകാറുണ്ടോ?' },
              { key: 'dawah', label: '3. ദഅ്‌വാ പ്രവർത്തനം' },
              { key: 'islamicCommunity', label: '4. ഇസ്‌ലാമിക സമൂഹത്തിലെ പ്രവർത്തനം' },
              { key: 'householdMeeting', label: '5. ഗൃഹയോഗം ഓരോ മാസവും ചേരാറുണ്ടോ?' },
              { key: 'obligatoryWorship', label: '6. നിർബന്ധ ആരാധന/ അനുഷ്‌ഠാനങ്ങൾ ക്യത്യമായി നിർവഹിക്കാറുണ്ടോ?' },
              { key: 'zakat', label: '7. സകാത്ത് കൃത്യമായി ബൈതുൽമാലിൽ അടക്കാറുണ്ടോ?' },
              { key: 'sunnahWorship', label: '8. സുന്നത്തായ ആരാധന/ അനുഷ്‌ഠാന കാര്യങ്ങളുടെ നിർവഹണം' },
              { key: 'dailyQuran', label: '9. ദിവസേനയുള്ള ഖുർആൻ പാരായണം' },
              { key: 'quranStudy', label: '10. ഖുർആൻ പഠനം/തഫ്ഹീം വായന' },
              { key: 'reading', label: '11. വായന, ആനുകാലികം/പുസ്‌തകങ്ങൾ' },
              { key: 'charity', label: '12. ദാനധർമങ്ങൾ, സേവന പ്രവർത്തനങ്ങൾ' },
              { key: 'islamicEtiquette', label: '13. ഇടപാടുകളിലെ ഇസ്‌ലാമിക മര്യാദകൾ പാലിക്കൽ' },
              { key: 'familyUpbringing', label: '14. കുടുംബസംസ്കരണത്തിലെ ശ്രദ്ധ (ദീനി, പ്രാസ്ഥാനിക അവസ്ഥ, സംസ്കരണ പ്രവർത്തനങ്ങൾ)' },
              { key: 'relationships', label: '15. പരസ്പരബന്ധങ്ങൾ(മാതാപിതാക്കൾ, സഹോദരങ്ങൾ, അയൽവാസികൾ, പ്രസ്ഥാനപ്രവർത്തകർ)' },
              { key: 'dailyExercise', label: '16. നിത്യവും വ്യായാമം ചെയ്യാറുണ്ടോ?' }
            ].map((q) => (
              <div key={q.key} style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <p style={{ margin: '0', fontSize: '11pt' }}>{q.label}</p>
                <p style={{ margin: '0', fontSize: '11pt' }}>{formData.activityQuestions?.[q.key] || ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Applicant Confirmation Page 3 */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>അപേക്ഷകന്റെ സ്ഥിരീകരണം</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>അപേക്ഷകന്റെ പേര്</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(formData.applicationDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hard Page Break Before Page 4 */}
      <div className="page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

      {/* Page 4: Recommendation Form */}
      <div className="pdf-section pdf-section-page2-start" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>ശുപാർശ</h2>
        <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>പ്രാദേശിക / ജില്ല / മേഖല നേതൃത്വത്തിന്റെ വിലയിരുത്തൽ</p>

        {/* Local Ameer */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>പ്രാദേശിക അമീർ / ഘടക നേതൃത്വ വിവരം</h3>
          
          {/* Local Ameer Opinion */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>പ്രാദേശിക അമീർന്റെ അഭിപ്രായം</h3>
            <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
              <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{formData.localAmeer?.opinion || ''}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formData.localAmeer?.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formatDate(formData.localAmeer?.date)}</p>
            </div>
          </div>
        </div>

        {/* District President */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>ജില്ല പ്രസിഡണ്ടിന്റെ അഭിപ്രായം</h3>
          <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
            <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{formData.districtPresident?.opinion || ''}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formData.districtPresident?.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formatDate(formData.districtPresident?.date)}</p>
            </div>
          </div>
        </div>

        {/* Regional Nazim */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>മേഖല നാസിമിന്റെ അഭിപ്രായം</h3>
          <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
            <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{formData.regionalNazim?.opinion || ''}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formData.regionalNazim?.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formatDate(formData.regionalNazim?.date)}</p>
            </div>
          </div>
        </div>

        {/* Office Use */}
        <div className="pdf-section">
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>ഓഫീസ് ഉപയോഗത്തിന്</h3>
          <div style={{ minHeight: '120px', border: '1px dashed #000', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '11pt', color: '#666' }}>(Office Use Only)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const handlePhotoUpload = (event) => {
    if (isReadOnly) return;
    const file = event.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('Photo size exceeds the maximum limit of 5MB. Please choose a smaller image.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoClick = () => {
    if (isReadOnly) return;
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    if (isReadOnly) return;
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const nextPage = () => {
    if (currentPage < 4) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderPage1 = () => (
    <form id="rukn-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6">
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">അപേക്ഷകൻ്റെ വിവരങ്ങൾ</h2>
              <p className="text-sm text-gray-600">Select your district, area and unit before filling personal details.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    ജില്ല <span className="text-red-500">*</span>
                  </label>
                  {isReadOnly ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{formData.district || ''}</div>
                  ) : (
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedDistrictId(id);
                        const found = districts.find(d => (d.id + '') === (id + ''));
                        handleInputChange('district', found?.name || '');
                        setSelectedAreaId('');
                        setAreas([]);
                        setUnits([]);
                        handleInputChange('area', '');
                        handleInputChange('localUnit', '');
                        setSelectedUnitId('');
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
                      disabled={isReadOnly || loading}
                    >
                      <option value="">{loading ? 'Loading...' : 'Select District'}</option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    ഏരിയ <span className="text-red-500">*</span>
                  </label>
                  {isReadOnly ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{formData.area || ''}</div>
                  ) : (
                    <select
                      value={selectedAreaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedAreaId(id);
                        const found = areas.find(a => (a.id + '') === (id + ''));
                        handleInputChange('area', found?.name || '');
                        handleInputChange('localUnit', '');
                        setSelectedUnitId('');
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
                      disabled={isReadOnly || !selectedDistrictId || loading}
                    >
                      <option value="">{!selectedDistrictId ? 'Select District' : loading ? 'Loading...' : 'Select Area'}</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    ഘടകം <span className="text-red-500">*</span>
                  </label>
                  {isReadOnly ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{formData.localUnit || ''}</div>
                  ) : (
                    <select
                      value={selectedUnitId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedUnitId(id);
                        const found = units.find(u => (u.id + '') === (id + ''));
                        handleInputChange('localUnit', found?.name || '');
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
                      disabled={isReadOnly || !selectedAreaId || loading}
                    >
                      <option value="">{!selectedAreaId ? 'Select Area' : loading ? 'Loading...' : 'Select Unit'}</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-28 h-32 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 text-xs flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all relative group"
                onClick={handlePhotoClick}
              >
                {photoPreview ? (
                  <div className="relative w-full h-full">
                    <img
                      src={photoPreview}
                      alt="Applicant Photo"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto();
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="w-6 h-6 text-indigo-400 mb-1" />
                    <span className="text-xs text-indigo-700 font-medium">Upload photo</span>
                    <span className="text-[10px] text-indigo-400 mt-1">Max size: 5MB</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 text-center max-w-[10rem]">Tap to add a clear portrait for your profile.</span>
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Personal Information Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">വ്യക്തിപരമായ വിവരങ്ങൾ</h3>
          <p className="text-sm text-gray-500 mt-1">അപേക്ഷകന്റെ അടിസ്ഥാന വിവരങ്ങൾ നൽകുക</p>
        </div>
        {/* Name (Malayalam) and Name (English) in the same row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
            <div className="flex items-center gap-1">
              <label className="text-sm text-black">പേര്:</label>
              <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const mal = e.target.value.replace(/[^\u0D00-\u0D7F\s]/g, '');
                handleInputChange('name', mal);
              }}
              pattern="[\u0D00-\u0D7F\s]+"
              title="Enter Malayalam letters only"
              placeholder="മലയാളത്തിൽ എഴുതുക / Type in Malayalam"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
            <div className="flex items-center gap-1">
              <label className="text-sm text-black">Name (English):</label>
              <span className="text-red-500">*</span>
            </div>
            <input
              type="text"
              value={formData.nameEnglish}
              onChange={(e) => handleInputChange('nameEnglish', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        
        {/* Two fields per line */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">പിതാവിന്റെ പേര്:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.fathersName}
                onChange={(e) => handleInputChange('fathersName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <label className="text-sm text-black">ഭാര്യ/ഭർത്താവ്:</label>
              <input
                type="text"
                value={formData.spouse}
                onChange={(e) => handleInputChange('spouse', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Children counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm text-black">ആൺകുട്ടികൾ:</label>
              <div className="w-full sm:w-32">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.childrenBoys}
                  onChange={(e) => handleInputChange('childrenBoys', e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm text-black">പെൺകുട്ടികൾ:</label>
              <div className="w-full sm:w-32">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.childrenGirls}
                  onChange={(e) => handleInputChange('childrenGirls', e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">പൂർണ്ണവിലാസം: വീട്:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.fullAddress}
                onChange={(e) => handleInputChange('fullAddress', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">സ്ഥലം:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.place}
                onChange={(e) => handleInputChange('place', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">പി.ഒ.:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.po}
                onChange={(e) => handleInputChange('po', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">പിൻ:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => handleInputChange('pin', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">മൊബൈൽ:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleInputChange('mobile', value);
                }}
                maxLength={10}
                pattern="[0-9]{10}"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <label className="text-sm text-black">ഇ-മെയിൽ:</label>
                <span className="text-red-500">*</span>
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </section>

        {/* Declarations Section */}
      <section className="space-y-4 mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">പ്രഖ്യാപനം</h3>
          <p className="text-sm text-gray-500 mt-1">ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയോടുള്ള പ്രതിബദ്ധത</p>
        </div>
        <div className="text-sm leading-relaxed space-y-3">
          <p className=" mb-4">
            ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് കേരള ഹൽഖ അമീർ അവർകൾക്ക്
            <span className="text-lg font-bold text-green-600 mx-2">السلام عليكم ورحمة الله وبركاته</span>
          </p>
          
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              <strong>1.</strong> ഞാൻ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 3 പ്രകാരം 
              <span className="text-lg font-bold text-green-600 mx-1">لا إله إلا الله محمد رسول الله</span>
              എന്ന ആദർശവാക്യം, വിശദീകരണ സഹിതം ശരിക്കും മനസ്സിലാക്കുകയും ഇതുതന്നെയാണ് എന്റെ ആദർശമെന്ന് സാക്ഷ്യം വഹിക്കുകയും ചെയ്യുന്നു.
            </p>
            
            <p className="text-sm leading-relaxed">
              <strong>2.</strong> ജമാഅത്തിന്റെ ലക്ഷ്യം ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 4 പ്രകാരം വിശദീകരണ സഹിതം ഞാൻ നല്ലപോലെ മനസ്സിലാക്കിയതിനെ തുടർന്ന് എന്റെ ജീവിതത്തിന്റെ ലക്ഷ്യം ഇഖാമതുദ്ദീൻ ആണെന്ന് ഞാൻ പ്രഖ്യാപിക്കുന്നു. ലക്ഷ്യസാക്ഷാത്ക്കാരത്തിനായി, അല്ലാഹുവിന്റെ തൃപ്‌തി മാത്രം കാംക്ഷിച്ച് ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദിൽ ചേർന്ന് പ്രവർത്തിക്കാൻ ഞാൻ ആഗ്രഹിക്കുന്നു. ഇക്കാര്യത്തിൽ എന്റെ സാക്ഷാൽ പ്രചോദനം അല്ലാഹുവിന്റെ തൃപ്തിയും പരലോക വിജയവും മാത്രമാകുന്നു.
            </p>
            
            <p className="text-sm leading-relaxed">
              <strong>3.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 5-ൽ പറയുന്ന പ്രവർത്തന മാർഗം ഞാൻ ശ്രദ്ധാപൂർവം മനസ്സിലാക്കിയിട്ടുണ്ട്. ആയതിനാൽ ലക്ഷ്യസാക്ഷാത്ക്കാരത്തിനായി ഇതേ പ്രവർത്തന മാർഗം ഞാൻ അനുസരണപൂർവം പിന്തുടരുന്നതാണ്.
            </p>
            
            <p className="text-sm leading-relaxed">
              <strong>4.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഞാൻ നല്ല പോലെ മനസ്സിലാക്കിയിട്ടുണ്ട്. ആയതിനാൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയും അതുപ്രകാരമുള്ള പാർട്ടി വ്യവസ്ഥകളും പൂർണ്ണമായും അനുസരിക്കുമെന്ന് ഞാൻ പ്രതിജ്ഞ ചെയ്യുന്നു. മേൽ പറഞ്ഞ സാക്ഷ്യത്തിന്റെയും പ്രതിജ്ഞയുടെയും അടിസ്ഥാനത്തിൽ എന്നെ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് അംഗമാക്കാൻ ശുപാർശ ചെയ്യണമെന്ന് അഭ്യർഥിക്കുന്നു.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">തിയ്യതി:</span>
              <input
                type="date"
                value={formData.applicationDate}
                onChange={(e) => handleInputChange('applicationDate', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Information Section */}
      <section className="mt-8 space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100 [&_textarea]:!rounded-lg [&_textarea]:!border [&_textarea]:!border-gray-200 [&_textarea]:!px-3 [&_textarea]:!py-2 [&_textarea]:!bg-white [&_textarea]:!text-sm [&_textarea]:focus:!border-indigo-500 [&_textarea]:focus:!ring-2 [&_textarea]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">അധിക വിവരങ്ങൾ</h3>
          <p className="text-sm text-gray-500 mt-1">വിദ്യാഭ്യാസം, ജോലി, സംഘടനാ ബന്ധങ്ങൾ എന്നിവ</p>
        </div>
        <h3 className="text-lg font-bold italic">അംഗത്വാപേക്ഷയോടൊപ്പം താഴെ പറയുന്ന വിവരങ്ങൾ കൂടി നൽകേണ്ടതാണ്.</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm w-42 flex items-center gap-1">
                <span>1. ജനന തിയ്യതി, വയസ്സ്:</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formData.age || ''}
                readOnly={true}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-not-allowed outline-none"
                placeholder="വയസ്സ്"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm w-42">2. വിദ്യാഭ്യാസ യോഗ്യത:</label>
            {isReadOnly ? (
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {formData.educationalQualification || ''}
              </div>
            ) : (
              <select
                value={formData.educationalQualification}
                onChange={(e) => handleInputChange('educationalQualification', e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
              >
                <option value="">Select education</option>
                {educationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm w-32">മറ്റു കഴിവുകൾ:</label>
            <input
              type="text"
              value={formData.otherSkills}
              onChange={(e) => handleInputChange('otherSkills', e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm w-42">അറിയാവുന്ന ഭാഷകൾ:</label>
            {isReadOnly ? (
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {selectedLanguageValues.length > 0 
                  ? selectedLanguageValues.map(val => {
                      const lang = languageOptions.find(l => l.value === val);
                      return lang ? lang.label : val;
                    }).join(', ')
                  : formData.knownLanguages || ''}
              </div>
            ) : (
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setLanguagesOpen(l => !l)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 flex flex-wrap gap-2 items-center"
                >
                  {selectedLanguageValues.length === 0 ? (
                    <span className="text-gray-500">ഭാഷകൾ തിരഞ്ഞെടുക്കുക</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedLanguageValues.map(val => {
                        const lang = languageOptions.find(l => l.value === val);
                        return (
                          <span key={val} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
                            {lang ? lang.label : val}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
                {languagesOpen && (
                  <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                    {languageOptions.map((option) => {
                      const checked = selectedLanguageValues.includes(option.value);
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              // Prevent duplicate selections
                              if (e.target.checked && selectedLanguageValues.includes(option.value)) {
                                return;
                              }
                              const next = e.target.checked
                                ? [...selectedLanguageValues.filter(v => v !== option.value), option.value] // Remove if exists, then add
                                : selectedLanguageValues.filter(v => v !== option.value);
                              handleLanguagesMultiSelect(next);
                            }}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm w-32">3. ജോലി:</label>
            {isReadOnly ? (
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {formData.occupation || ''}
              </div>
            ) : (
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setOccupationOpen(o => !o)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 flex flex-wrap gap-2 items-center"
                >
                  {selectedOccupationValues.length === 0 ? (
                    <span className="text-gray-500">Select occupation(s)</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedOccupationValues.map(val => (
                        <span key={val} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                {occupationOpen && (
                  <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                    {occupationOptions.map((option) => {
                      const checked = selectedOccupationValues.includes(option);
                      return (
                        <label key={option} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              // Prevent duplicate selections
                              if (e.target.checked && selectedOccupationValues.includes(option)) {
                                return;
                              }
                              const next = e.target.checked
                                ? [...selectedOccupationValues.filter(v => v !== option), option] // Remove if exists, then add
                                : selectedOccupationValues.filter(v => v !== option);
                              handleOccupationMultiSelect(next);
                            }}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm w-42">മറ്റുവരുമാന മാർഗ്ഗങ്ങൾ:</label>
            <input
              type="text"
              value={formData.otherIncomeSources}
              onChange={(e) => handleInputChange('otherIncomeSources', e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm block">
              4. ഇതിന്നുമുമ്പ് മറ്റു വല്ല സംഘടന/പ്രസ്ഥാനവുമായി ബന്ധമുണ്ടായിരുന്നുവോ? ഇല്ലെങ്കിൽ എന്തുകൊണ്ട്? ഉണ്ടായിരുന്നെങ്കിൽ അതുമായി ബന്ധം വിച്ഛേദിക്കാനുള്ള കാരണമെന്ത്?
            </label>
            <textarea
              value={formData.previousOrganization}
              onChange={(e) => handleInputChange('previousOrganization', e.target.value)}
              rows="4"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        </section>


      </form>
    );

  const renderPage2 = () => (
    <form id="rukn-form" onSubmit={handleSubmit} className="space-y-8">
      {/* Questions 5-7 Section */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">ചോദ്യങ്ങൾ 5 - 7</h3>
          <p className="text-sm text-gray-500 mt-1">ജമാഅത്ത് സാഹിത്യവും പ്രതിബദ്ധതയും സംബന്ധിച്ച വിശദാംശങ്ങൾ</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <p className="text-sm">
                5. ജമാഅത്ത്  സാഹിത്യങ്ങൾ എപ്പോൾ മുതൽ വായിച്ചു തുടങ്ങി?
              </p>
              <div>
                <input
                  type="text"
                value={formData.question5a}
                onChange={(e) => handleInputChange('question5a', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
              />
            </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <p className="text-sm">
                 - ജമാഅത്ത്  അംഗത്വത്തിനപേക്ഷിക്കാൻ പ്രേരിപ്പിച്ച സംഗതി എന്ത്?
              </p>
              <div>
                <input
                  type="text"
                value={formData.question5b}
                onChange={(e) => handleInputChange('question5b', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
              />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm">
              6. നിങ്ങളുടെ ജീവിതത്തിൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയുടെ എട്ടാം ഖണ്ഡികയുമായി വിരുദ്ധമായ എന്തെങ്കിലും ഉണ്ടോ?
            </p>
            <div>
              <input
                type="text"
              value={formData.question6}
              onChange={(e) => handleInputChange('question6', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
            />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm font">
                7. സത്യമാർഗത്തിൽ പ്രവർത്തിക്കുമ്പോൾ നേരിടാനിടയുള്ള പ്രയാസങ്ങളും കഷ്ടനഷ്ടങ്ങളും സംബന്ധിച്ച് താങ്കൾ നല്ലപോലെ ബോധവാനാണോ?
              </p>
              <div>
                <input
                  type="text"
                  value={formData.question7a}
                  onChange={(e) => handleInputChange('question7a', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <p className="text-sm font">
                - അത് സന്മനസ്സോടെയും സമചിത്തതയോടെയും അഭിമുഖീകരിക്കാൻ താങ്കൾ തയാറാണോ?
              </p>
              <div>
                <input
                  type="text"
                  value={formData.question7b}
                  onChange={(e) => handleInputChange('question7b', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Applicant Information */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">അപേക്ഷകന്റെ സ്ഥിരീകരണം</h3>
          <p className="text-sm text-gray-500 mt-1">പേര്, തിയ്യതി എന്നിവ ഉൾപ്പെടുത്തുക</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm sm:w-28">അപേക്ഷകന്റെ പേര്:</label>
            <input
              type="text"
              value={formData.name}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 cursor-not-allowed"
              placeholder="പേര് ആദ്യ വിഭാഗത്തിൽ നൽകുക"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm sm:w-20">തിയ്യതി:</label>
            <input
              type="date"
              value={formData.applicationDate}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Other Information Section */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">മറ്റുവിവരങ്ങൾ</h3>
          <p className="text-sm text-gray-500 mt-1">കുടുംബബന്ധങ്ങൾ, ഉത്തരവാദിത്വങ്ങൾ, ബന്ധപ്പെടാവുന്ന ഘടകങ്ങൾ</p>
        </div>
        <h3 className="text-lg font-bold italic">മറ്റുവിവരങ്ങൾ</h3>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <p className="text-sm ">
                <strong>1.</strong> കുടുംബത്തിന്റെ പ്രാസ്ഥാനിക ബന്ധം: ഭാര്യ/ഭർത്താവ്:
              </p>
              <div>
                <input
                  type="text"
                  value={formData.familyConnection.wifeHusband}
                  onChange={(e) => handleNestedInputChange('familyConnection', 'wifeHusband', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start sm:pl-6">
              <p className="text-sm">
                സന്താനങ്ങൾ:
              </p>
              <div>
                <input
                  type="text"
                  value={formData.familyConnection.children}
                  onChange={(e) => handleNestedInputChange('familyConnection', 'children', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm">
              2. കടങ്ങൾ, ബാധ്യതകൾ:
            </p>
            <div>
              <input
                type="text"
              value={formData.debtsLiabilities}
              onChange={(e) => handleInputChange('debtsLiabilities', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm">
              3. പ്രസ്ഥാനവുമായി ബന്ധപ്പെട്ട് വഹിക്കുന്ന ചുമതലകൾ?:
            </p>
            <div>
              <input
                type="text"
              value={formData.organizationalResponsibilities}
              onChange={(e) => handleInputChange('organizationalResponsibilities', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm">
              4. ഏറ്റവും അടുത്തുള്ള പ്രാദേശിക ജമാഅത്തെ:
            </p>
            <div>
            <input
              type="text"
              value={formData.nearestLocalJamaat}
              onChange={(e) => handleInputChange('nearestLocalJamaat', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <p className="text-sm">
              5. കേരളത്തിന് പുറത്താണെങ്കിൽ (വിദേശം/ഇതര സംസ്ഥാനം) നാട്ടിൽ ബന്ധപ്പെടുന്ന ഘടകം:
            </p>
            <div>
            <input
              type="text"
              value={formData.contactUnitAbroad}
              onChange={(e) => handleInputChange('contactUnitAbroad', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                readOnly={isReadOnly}
            />
            </div>
          </div>
        </div>
      </section>

      {/* Compulsory Books Section */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-2 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="text-center border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">നിർബന്ധമായും വായിച്ചിരിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
          <p className="text-sm text-gray-500 mt-1">(വായിച്ച പുസ്തകങ്ങളിൽ (✓) ചെയ്യുക)</p>
        </div>
        <div className="border-2 border-gray-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(() => {
              const books = [
                { num: 1, key: 'constitution', label: 'ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന' },
                { num: 2, key: 'rudad1', label: 'പ്രാസ്ഥാനിക  ശിക്ഷണം : റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി സംഗ്രഹം.' },
                { num: 3, key: 'khutubat', label: 'ഖുതുബാത്ത്' },
                { num: 4, key: 'witnessToTruth', label: 'സത്യസാക്ഷ്യം' },
                { num: 5, key: 'movementAndWorkers', label: 'പ്രസ്ഥാനവും പ്രവർത്തകരും' },
                { num: 6, key: 'islamAndIgnorance', label: 'ഇസ്‌ലാമും ജാഹിലിയ്യത്തും' },
                { num: 7, key: 'ideologyGoalPolicies', label: 'ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്, ആദർശം ലക്ഷ്യം നയനിലപാടുകൾ' },
                { num: 8, key: 'islamicWayOfLife', label: 'ഇസ്‌ലാമിന്റെ ജീവിത വ്യവസ്ഥ' },
                { num: 9, key: 'interrelationships', label: 'ഇസ്‌ലാമിക പ്രവർത്തകരുടെ പരസ്പര ബന്ധങ്ങൾ' },
                { num: 10, key: 'responsibilities', label: 'ഇസ്‌ലാമിക പ്രവർത്തകരുടെ ഉത്തരവാദിത്തങ്ങൾ' },
                { num: 11, key: 'islamAndOrganizedLife', label: 'ഇസ്‌ലാമും സംഘടിത ജീവിതവും' },
                { num: 12, key: 'roleOfIqamatuddin', label: 'ഇഖാമതുദ്ദീനിന്റെ ഭൂമിക' },
                { num: 13, key: 'currentPolicyProgram', label: 'നടപ്പുമീഖാത്തിലെ പോളിസി-പ്രോഗ്രാം' }
              ];
              
              const leftColumn = books.slice(0, 7);
              const rightColumn = books.slice(7);
              
              return (
                <>
                  <div className="space-y-2">
                    {leftColumn.map((book) => {
                      return renderBookItem(book);
                    })}
                  </div>
                  <div className="space-y-2">
                    {rightColumn.map((book) => {
                      return renderBookItem(book);
                    })}
                  </div>
                </>
              );
              
              function renderBookItem(book) {
                // Special handling for rudad - check if any of rudad1-5 are checked
                const isRudadChecked = book.key === 'rudad1' 
                  ? (formData.compulsoryBooks?.rudad1 || 
                     formData.compulsoryBooks?.rudad2 || 
                     formData.compulsoryBooks?.rudad3 || 
                     formData.compulsoryBooks?.rudad4 || 
                     formData.compulsoryBooks?.rudad5)
                  : formData.compulsoryBooks[book.key];
                
                const handleRudadChange = (checked) => {
                  if (book.key === 'rudad1') {
                    // Check/uncheck all rudad parts
                    handleCheckboxChange('compulsoryBooks', 'rudad1', checked);
                    handleCheckboxChange('compulsoryBooks', 'rudad2', checked);
                    handleCheckboxChange('compulsoryBooks', 'rudad3', checked);
                    handleCheckboxChange('compulsoryBooks', 'rudad4', checked);
                    handleCheckboxChange('compulsoryBooks', 'rudad5', checked);
                  } else {
                    handleCheckboxChange('compulsoryBooks', book.key, checked);
                  }
                };

                return (
              <label key={book.key} className="flex items-center space-x-2 text-sm">
                    <span className="w-6">{book.num}.</span>
                    <span className="flex-1">{book.label}</span>
                <input
                  type="checkbox"
                      checked={isRudadChecked}
                      onChange={(e) => handleRudadChange(e.target.checked)}
                      className="w-4 h-4 cursor-pointer flex-shrink-0"
                      disabled={isReadOnly}
                    />
              </label>
                );
              }
            })()}
          </div>
        </div>
      </section>

      {/* Advisable Books Section */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="text-center border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">അഭികാമ്യമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
          <p className="text-sm text-gray-500 mt-1">താഴെ പറയുന്ന പുസ്തകങ്ങൾ വായിക്കുന്നത് അഭികാമ്യം</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(() => {
            const books = [
              // Column 1 (Leftmost) - 5 items
              { key: 'pathToSalvation', label: 'രക്ഷാസരണി' },
              { key: 'islamicLessons', label: 'ഇസ്‌ലാമിക പാഠങ്ങൾ' },
              { key: 'messageOfIslam', label: 'ഇസ്‌ലാമിന്റെ സന്ദേശം' },
            { key: 'truthFalsehood', label: 'സത്യവും അസത്യവും' },
              { key: 'successFactors', label: 'ഇസ്‌ലാമിക പ്രസ്ഥാനത്തിന്റെ വിജയനിദാനങ്ങൾ' },
              // Column 2 (Middle) - 5 items
              { key: 'truePath', label: 'സത്യമാർഗം' },
              { key: 'islamAtGlance', label: 'ഇസ്‌ലാം ഒറ്റ നോട്ടത്തിൽ' },
              { key: 'constructionDestruction', label: 'നിർമ്മാണവും സംഹാരവും' },
            { key: 'lifeAfterDeath', label: 'മരണാനന്തര ജീവിതം' },
              { key: 'rudadFull', label: 'റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി (ഭാഗം:1-5)' },
              // Column 3 (Rightmost) - 5 items
              { key: 'islamReligion', label: 'ഇസ്‌ലാം മതം' },
              { key: 'politicalTheory', label: 'ഇസ്‌ലാമിന്റെ രാഷ്ട്രീയ സിദ്ധാന്തം' },
              { key: 'moralTheory', label: 'ഇസ്‌ലാമിന്റെ ധാർമ്മിക സിദ്ധാന്തം' },
              { key: 'shirkPolytheism', label: 'ശിർക്ക് അഥവാ ബഹുദൈവ വിശ്വാസം' },
              { key: 'fourTechnicalTerms', label: 'ഖുർആനിലെ നാലു സാങ്കേതിക ശബ്ദങ്ങൾ' }
            ];
            
            const column1 = books.slice(0, 5);
            const column2 = books.slice(5, 9);
            const column3 = books.slice(9);
            
            return (
              <>
                <div className="space-y-2">
                  {column1.map((book) => (
                    <label key={book.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.advisableBooks[book.key]}
                        onChange={(e) => handleCheckboxChange('advisableBooks', book.key, e.target.checked)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                        disabled={isReadOnly}
                      />
                      <span className="flex-1">{book.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  {column2.map((book) => (
                    <label key={book.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.advisableBooks[book.key]}
                        onChange={(e) => handleCheckboxChange('advisableBooks', book.key, e.target.checked)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                        disabled={isReadOnly}
                      />
                      <span className="flex-1">{book.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  {column3.map((book) => (
                    <label key={book.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.advisableBooks[book.key]}
                        onChange={(e) => handleCheckboxChange('advisableBooks', book.key, e.target.checked)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                        disabled={isReadOnly}
                      />
                      <span className="flex-1">{book.label}</span>
                    </label>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      
    </form>
  );

  const renderPage3 = () => (
    <form id="rukn-form" onSubmit={handleSubmit} className="space-y-8">
      {/* Page 3 Header */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 text-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">അപേക്ഷകന്റെ കഴിഞ്ഞ ഒരു വർഷത്തെ പ്രവർത്തന റിപ്പോർട്ട്</h2>
          <p className="text-sm text-gray-600 mt-2">
            (പോഷക സംഘടന പ്രവർത്തകരായ അപേക്ഷകരും ഈ ഭാഗം പുരിപ്പിച്ചിരിക്കണം. അവരവരുടെ സംഘടനാ വ്യവസ്ഥ പ്രകാരമുള്ള യോഗങ്ങളും പ്രവർത്തനങ്ങളും ചേർക്കുക)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            
            <input
              type="date"
              value={formData.reportPeriod.from}
              onChange={(e) => handleNestedInputChange('reportPeriod', 'from', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
            />
            <label className="text-sm text-gray-600">: മുതൽ</label>
          </div>
          <div className="flex items-center gap-2">
            
            <input
              type="date"
              value={formData.reportPeriod.to}
              onChange={(e) => handleNestedInputChange('reportPeriod', 'to', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
            />
            <label className="text-sm text-gray-600">: വരെ</label>
          </div>
        </div>
      </section>

      {/* Attendance Table */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">1. യോഗങ്ങളിലെ ഹാജർ</h3>
          <p className="text-sm text-gray-500 mt-1">റിപ്പോർട്ട് കാലയളവിൽ പങ്കെടുത്ത യോഗങ്ങളുടെ വിശദാംശങ്ങൾ</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-sm text-left">യോഗങ്ങൾ</th>
                <th className="border border-gray-200 px-3 py-2 text-sm text-center">പ്രതിവാരയോഗം</th>
                <th className="border border-gray-200 px-3 py-2 text-sm text-center">ഏരിയാ കൺവെൻഷൻ</th>
                <th className="border border-gray-200 px-3 py-2 text-sm text-center">നിശാ ക്യാമ്പ്</th>
              </tr>
            </thead>
            <tbody>
              {[
                { field: 'total', label: 'റിപ്പോർട്ട് കാലത്ത് ആകെ നടന്നത്' },
                { field: 'attended', label: 'ഹാജർ' },
                { field: 'leave', label: 'ലീവ്' },
                { field: 'absent', label: 'ആബ്സന്റ്' }
              ].map((row) => (
                <tr key={row.field} className="bg-white even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-sm">{row.label}</td>
                  {['weeklyMeeting', 'areaConvention', 'nightCamp'].map((meeting) => (
                    <td key={meeting} className="border border-gray-200 px-3 py-2">
                      <input
                        type="text"
                        value={formData.attendance[meeting][row.field]}
                        onChange={(e) => handleAttendanceChange(meeting, row.field, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity Questions */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">2. പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം</h3>
          <p className="text-sm text-gray-500 mt-1">ദൈനംദിന/സാമൂഹിക പ്രവർത്തനങ്ങളിൽ നിങ്ങൾ പുലർത്തുന്ന നിലപാടുകൾ</p>
        </div>
        <div className="space-y-3">
          {[
            { key: 'baitulMal', label: '2. ബൈത്തുൽമാൽ കൃത്യമായി നൽകാറുണ്ടോ?' },
            { key: 'dawah', label: '3. ദഅ്‌വാ പ്രവർത്തനം' },
            { key: 'islamicCommunity', label: '4. ഇസ്‌ലാമിക സമൂഹത്തിലെ പ്രവർത്തനം' },
            { key: 'householdMeeting', label: '5. ഗൃഹയോഗം ഓരോ മാസവും ചേരാറുണ്ടോ?' },
            { key: 'obligatoryWorship', label: '6. നിർബന്ധ ആരാധന/ അനുഷ്‌ഠാനങ്ങൾ ക്യത്യമായി നിർവഹിക്കാറുണ്ടോ?' },
            { key: 'zakat', label: '7. സകാത്ത് കൃത്യമായി ബൈതുൽമാലിൽ അടക്കാറുണ്ടോ?' },
            { key: 'sunnahWorship', label: '8. സുന്നത്തായ ആരാധന/ അനുഷ്‌ഠാന കാര്യങ്ങളുടെ നിർവഹണം' },
            { key: 'dailyQuran', label: '9. ദിവസേനയുള്ള ഖുർആൻ പാരായണം' },
            { key: 'quranStudy', label: '10. ഖുർആൻ പഠനം/തഫ്ഹീം വായന' },
            { key: 'reading', label: '11. വായന, ആനുകാലികം/പുസ്‌തകങ്ങൾ' },
            { key: 'charity', label: '12. ദാനധർമങ്ങൾ, സേവന പ്രവർത്തനങ്ങൾ' },
            { key: 'islamicEtiquette', label: '13. ഇടപാടുകളിലെ ഇസ്‌ലാമിക മര്യാദകൾ പാലിക്കൽ' },
            { key: 'familyUpbringing', label: '14. കുടുംബസംസ്കരണത്തിലെ ശ്രദ്ധ (ദീനി, പ്രാസ്ഥാനിക അവസ്ഥ, സംസ്കരണ പ്രവർത്തനങ്ങൾ)' },
            { key: 'relationships', label: '15. പരസ്പരബന്ധങ്ങൾ(മാതാപിതാക്കൾ, സഹോദരങ്ങൾ, അയൽവാസികൾ, പ്രസ്ഥാനപ്രവർത്തകർ)' },
            { key: 'dailyExercise', label: '16. നിത്യവും വ്യായാമം ചെയ്യാറുണ്ടോ?' }
          ].map((question) => (
            <div key={question.key} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4 items-center">
              <p className="text-sm text-gray-700">{question.label}</p>
              <div>
                <input
                  type="text"
                  value={formData.activityQuestions?.[question.key] || ''}
                  onChange={(e) => handleNestedInputChange('activityQuestions', question.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Applicant Information */}
      <section className="space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xl font-semibold text-gray-800">അപേക്ഷകന്റെ സ്ഥിരീകരണം</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm sm:w-28">അപേക്ഷകന്റെ പേര്:</label>
            <input
              type="text"
              value={formData.name}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 cursor-not-allowed"
              placeholder="പേര് ആദ്യ വിഭാഗത്തിൽ നൽകുക"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm sm:w-20">തിയ്യതി:</label>
            <input
              type="date"
              value={formData.applicationDate}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Submission Instructions */}
      <section className="p-6 bg-white border border-yellow-200 rounded-2xl shadow-sm">
        <p className="text-sm text-gray-700">
          അപേക്ഷകൻ ഫോറം പൂർണ്ണമായി പുരിപ്പിച്ചതിനുശേഷം പ്രാദേശിക അമീറിനെ ഏൽപ്പിക്കുക.
        </p>
      </section>

      
    </form>
  );

  const renderPage4 = () => (
    <form
      id="rukn-form"
      onSubmit={handleSubmit}
      className={`space-y-8 ${!isReadOnly ? 'opacity-75 pointer-events-none' : ''}`}
    >
      {/* Main Header */}
      <section className="rounded-2xl shadow-sm overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-[#134e5e] to-[#71b280] text-white text-center px-6 py-6">
          <h1 className="text-2xl font-bold mb-1">ശുപാർശ</h1>
          <p className="text-sm text-green-100">പ്രാദേശിക / ജില്ല / മേഖല നേതൃത്വത്തിന്റെ വിലയിരുത്തൽ</p>
        </div>
        {!isReadOnly && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-4">
            <p className="text-sm text-yellow-800 font-medium text-center">
              ⚠️ ഈ പേജ് ഔദ്യോഗിക ഉപയോഗത്തിന് മാത്രമാണ്. പ്രാദേശിക അമീർ/ജില്ല പ്രസിഡണ്ട്/മേഖല നാസിം മാത്രം ഇവിടെ ഡാറ്റ എന്റർ ചെയ്യുക.
            </p>
          </div>
        )}
      </section>

      {/* Instructions Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">കുറിപ്പ്</h3>
        <div className="text-sm space-y-3 text-gray-600 leading-relaxed">
          <p>
            <strong>1.</strong> അപേക്ഷകന്റെ വാരാന്തയോഗങ്ങളിലെ ഹാജർ നില, ജമാഅത്തെ പ്രവർത്തനങ്ങളിലുള്ള താൽപര്യം, സാമ്പത്തിക ഇടപാടുകൾ, കുടുംബത്തോടും, ബന്ധുക്കളോടും, അയൽവാസികളോടും പ്രസ്ഥാന പ്രവർത്തകരോടുമുള്ള  ഇടപഴകൽ, ധനവ്യയം, പഠനപാരായണങ്ങളിലുള്ള താല്പര്യം, സമസ്കാരാദി നിർബന്ധ കർമ്മങ്ങളിലും സംഘടന വ്യവസ്ഥകൾ  പാലിക്കുന്നതിലുമുള്ള നിഷ്ഠ എന്നിവ മുന്നിൽ വെച്ചുകൊണ്ട് അഭിപ്രായം രേഖപ്പെടുത്തുക.
          </p>
          <p>
            <strong>2.</strong> അപേക്ഷകൻ പോഷക സംഘടനയിൽ പ്രവർത്തിക്കുന്ന വ്യക്തിയാണെങ്കിൽ അംഗമാണെങ്കിൽ പ്രാദേശിക നേതൃത്വത്തോട് സംസാരിച്ച് വ്യക്തത വരുത്തി അഭിപ്രായം രേഖപ്പെടുത്തുക.
          </p>
          <p>
            <strong>3.</strong> പ്രാദേശിക അമീർ തങ്ങളുടെ അഭിപ്രായവും ശുപാർശയും രേഖപ്പെടുത്തി ഫോറം ജില്ലാ പ്രസിഡണ്ടിന് ഏറ്റവും വേഗം ഏൽപ്പിക്കുക.
          </p>
        </div>
      </section>

      {/* Local Ameer/Area President Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100 [&_textarea]:!rounded-lg [&_textarea]:!border [&_textarea]:!border-gray-200 [&_textarea]:!px-3 [&_textarea]:!py-2 [&_textarea]:!bg-white [&_textarea]:!text-sm [&_textarea]:focus:!border-indigo-500 [&_textarea]:focus:!ring-2 [&_textarea]:focus:!ring-indigo-100">
        <h3 className="text-lg font-semibold text-gray-800">പ്രാദേശിക അമീർ / ഘടക നേതൃത്വ വിവരം</h3>
        
        {/* Local Ameer Opinion */}
        <div>
          <div className="text-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">പ്രാദേശിക അമീറിന്റെ അഭിപ്രായം</h3>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <textarea
              value={formData.localAmeer?.opinion || ''}
              onChange={(e) => handleNestedInputChange('localAmeer', 'opinion', e.target.value)}
              rows="4"
              className="w-full border-0 outline-none text-sm resize-none bg-transparent"
              placeholder="പ്രാദേശിക അമീർന്റെ അഭിപ്രായം ഇവിടെ എഴുതുക..."
              readOnly={isReadOnly}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">പേര്:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="text"
                value={formData.localAmeer?.name || ''}
                onChange={(e) => handleNestedInputChange('localAmeer', 'name', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={isReadOnly}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">തിയ്യതി:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="date"
                value={formData.localAmeer?.date || ''}
                onChange={(e) => handleNestedInputChange('localAmeer', 'date', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Divider removed */}

      {/* District President Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100 [&_textarea]:!rounded-lg [&_textarea]:!border [&_textarea]:!border-gray-200 [&_textarea]:!px-3 [&_textarea]:!py-2 [&_textarea]:!bg-white [&_textarea]:!text-sm [&_textarea]:focus:!border-indigo-500 [&_textarea]:focus:!ring-2 [&_textarea]:focus:!ring-indigo-100">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">ജില്ല പ്രസിഡണ്ടിന്റെ അഭിപ്രായം</h3>
          <p className="text-xs text-gray-500 mt-1">
            (ഫോറം ലഭിച്ച് ഒരുമാസത്തിനകം അഭിപ്രായം രേഖപ്പെടുത്തി ഹൽഖ കേന്ദ്രത്തിൽ എത്തിക്കുക.)
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <textarea
            value={formData.districtPresident?.opinion || ''}
            onChange={(e) => handleNestedInputChange('districtPresident', 'opinion', e.target.value)}
            rows="4"
            className="w-full border-0 outline-none text-sm resize-none bg-transparent"
            placeholder="ജില്ല പ്രസിഡണ്ടിന്റെ അഭിപ്രായം ഇവിടെ എഴുതുക..."
            readOnly={isReadOnly}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">പേര്:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="text"
                value={formData.districtPresident?.name || ''}
                onChange={(e) => handleNestedInputChange('districtPresident', 'name', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={isReadOnly}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">തിയ്യതി:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="date"
                value={formData.districtPresident?.date || ''}
                onChange={(e) => handleNestedInputChange('districtPresident', 'date', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Divider removed */}

      {/* Regional Nazim Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 print:border-none print:shadow-none [&_input]:!rounded-lg [&_input]:!border [&_input]:!border-gray-200 [&_input]:!px-3 [&_input]:!py-2 [&_input]:!bg-white [&_input]:!text-sm [&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-indigo-100 [&_textarea]:!rounded-lg [&_textarea]:!border [&_textarea]:!border-gray-200 [&_textarea]:!px-3 [&_textarea]:!py-2 [&_textarea]:!bg-white [&_textarea]:!text-sm [&_textarea]:focus:!border-indigo-500 [&_textarea]:focus:!ring-2 [&_textarea]:focus:!ring-indigo-100">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">മേഖല നാസിമിന്റെ അഭിപ്രായം</h3>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <textarea
            value={formData.regionalNazim?.opinion || ''}
            onChange={(e) => handleNestedInputChange('regionalNazim', 'opinion', e.target.value)}
            rows="4"
            className="w-full border-0 outline-none text-sm resize-none bg-transparent"
            placeholder="മേഖല നാസിമിന്റെ അഭിപ്രായം ഇവിടെ എഴുതുക..."
            readOnly={isReadOnly}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">പേര്:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="text"
                value={formData.regionalNazim?.name || ''}
                onChange={(e) => handleNestedInputChange('regionalNazim', 'name', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={!isReadOnly}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm w-16">തിയ്യതി:</span>
            <div className="flex-1 border-b border-gray-300 pb-1">
              <input
                type="date"
                value={formData.regionalNazim?.date || ''}
                onChange={(e) => handleNestedInputChange('regionalNazim', 'date', e.target.value)}
                className="w-full border-0 outline-none text-sm focus:bg-gray-50"
                readOnly={!isReadOnly}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Divider removed */}

      {/* Office Use Section */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 text-center">ഓഫീസ് ഉപയോഗത്തിന്</h3>
        <div className="h-32 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center rounded-xl">
          <span className="text-gray-500 text-sm">(Office Use Only)</span>
        </div>
      </section>

      
    </form>
  );

  useEffect(() => {
    if (viewAll) return;
    const target = formTopRef.current;
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [currentPage, viewAll]);

  const handleCloseForm = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 1:
        return renderPage1();
      case 2:
        return renderPage2();
      case 3:
        return renderPage3();
      case 4:
        return renderPage4();
      default:
        return renderPage1();
    }
  };

  return (
    <>
      {/* Screen-Only Form UI */}
      <div className="screen-only min-h-screen bg-gray-50 p-4" style={{ fontFamily: 'Anek Malayalam Variable' }}>
        <button
          onClick={handleCloseForm}
          className="fixed top-4 right-4 z-40 bg-white text-[#002349] border border-[#002349]/20 p-3 rounded-full shadow-lg hover:bg-[#002349] hover:text-white transition-colors"
          aria-label="Close form"
        >
          <X className="w-4 h-4" />
        </button>

        {showSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
              <div className="text-center">
                <div className="mb-4">
                  <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted Successfully!</h3>
                <p className="text-gray-600 mb-4">Your application has been submitted successfully.</p>
                <p className="text-sm text-gray-500">Redirecting to home page...</p>
              </div>
            </div>
          </div>
        )}

        <div className={`max-w-6xl mx-auto transition-all duration-300 ${showSuccess ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {!isReadOnly && (
            <div className="bg-gradient-to-r from-[#002349] to-[#1b4d87] text-white px-6 py-5 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1 || viewAll}
                  className={`hidden md:flex p-2 rounded-full transition-colors ${
                    currentPage === 1 || viewAll
                      ? 'bg-white/10 text-white/60 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-lg font-semibold">ജമാഅത്തെ</span>
                    <span className="text-lg font-semibold">ഇസ്‌ലാമി ഹിന്ദ്</span>
                    <span className="text-xs text-green-100">www.jamaateislamihind.org</span>
                  </div>
                  <div className="w-px h-12 bg-white/30" />
                  <img src={logo} alt="JIH Logo" className="h-12 w-auto drop-shadow" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold">അംഗത്വ അപേക്ഷ</h1>
                  <p className="text-sm text-green-100">Rukn Membership Application</p>
                  <p className="text-xs text-green-50 mt-1">
                    {viewAll ? 'Viewing full application' : `Page ${currentPage} of 4`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setViewAll(v => !v)}
                  className="px-4 py-2 text-sm font-semibold rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                >
                  {viewAll ? 'Paginated View' : 'View All'}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 bg-white text-[#2e5f29] px-4 py-2 rounded-full text-sm font-semibold shadow hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          )}

          <div className="p-6 bg-gray-50" ref={formTopRef}>
            <div className="space-y-8">
              {viewAll ? (
                <>
                  {renderPage1()}
                  {renderPage2()}
                  {renderPage3()}
                  {renderPage4()}
                </>
              ) : (
                renderCurrentPage()
              )}
            </div>

            {!viewAll && (
              <div className="mt-8 print:hidden">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600 font-semibold">
                    Page {currentPage} of 4
                  </div>
                  <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row">
                    <button
                      type="button"
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    {currentPage < 4 ? (
                      <button
                        type="button"
                        onClick={nextPage}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#002349] text-white hover:bg-[#1a3a5c] transition-colors w-full sm:w-auto"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      !isReadOnly && (
                        <button
                          type="submit"
                          form="rukn-form"
                          disabled={submitting}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            submitting
                              ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                              : 'bg-[#002349] hover:bg-[#1a3a5c] text-white'
                          }`}
                        >
                          {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Print-Only PDF Layout */}
      <div className="print-only">
        <RuknPDFLayout />
      </div>
    </>
  );
};

export default RuknForm; 