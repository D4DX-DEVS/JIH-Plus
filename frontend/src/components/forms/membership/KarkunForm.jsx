import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Camera, Upload, X } from 'lucide-react';
import axios from 'axios';
import logo from '../../../assets/LogoColor.png';
import '../../../styles/karkun-form-print.css';
const KarkunForm = ({ initialData = null, isReadOnly = false, onBack = null }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo || null);

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

  // API Base URL
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      // Default otherBooks structure
      const defaultOtherBooks = {
        rakshasarani: false,
        islamicLessons: false,
        messageOfIslam: false,
        truthFalsehood: false,
        successFactors: false,
        truePath: false,
        islamAtGlance: false,
        constructionDestruction: false,
        lifeAfterDeath: false,
        rudadFull: false,
        islamReligion: false,
        politicalTheory: false,
        moralTheory: false,
        shirkPolytheism: false,
        fourTechnicalTerms: false
      };
      
      return {
        ...initialData,
        occupation: normalizeOccupation(initialData.occupation),
        // Merge existing otherBooks with defaults to ensure all fields exist
        otherBooks: {
          ...defaultOtherBooks,
          ...(initialData.otherBooks || {})
        }
      };
    }
    return {
      // Personal Information (1-9)
      name: '',
      nameEnglish: '',
      fathersName: '',
      gender: '',
      age: '',
      dateOfBirth: { day: '', month: '', year: '' },
      spouseName: '',
      childrenBoys: '',
      childrenGirls: '',
      mobileCountryCode: '+91',
      mobile: '',
      email: '',
      address: '',

      // Detailed Information (10-22)
      educationalQualification: '',
      occupation: '',
      otherSkills: { speech: false, khutuba: false, writing: false, other: false, otherText: '' },
      halkhaName: '',
      area: '',
      district: '',
      ageAssociated: '',
      associationCircumstances: {
        family: false,
        personal: false,
        reading: false,
        others: false
      },
      firstActiveUnit: {
        balasangham: false,
        teenIndia: false,
        sio: false,
        gio: false,
        solidarity: false,
        jamaatHalkha: false,
        others: false
      },
      workedOtherOrganization: '',
      otherOrganizationName: '',
      organizationalBooksRead: '',
      otherBooks: {
        rakshasarani: false,
        islamicLessons: false,
        messageOfIslam: false,
        truthFalsehood: false,
        successFactors: false,
        truePath: false,
        islamAtGlance: false,
        constructionDestruction: false,
        lifeAfterDeath: false,
        rudadFull: false,
        islamReligion: false,
        politicalTheory: false,
        moralTheory: false,
        shirkPolytheism: false,
        fourTechnicalTerms: false
      },

      // Local Official
      localUnitOfficialName: '',
      applicantName: '',
      applicantDate: '',
      officialDate: '',

      // Office Use
      officeDate: '',
      registrationNumber: '',
      officeRegistrationDate: '',

      // Additional signature fields
      localUnitSignature: '',
      localUnit: '',
      localUnitDate: '',
      areaPresidentName: '',
      areaPresidentSignature: '',
      areaPresidentDate: '',

      // Compulsory books
      compulsoryBooks: {
        book1: false,
        book2: false,
        book3: false,
      },

      // Declaration
      declarationAccepted: false,
    };
  });

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

  const otherBooksOptions = [
    { value: 'rakshasarani', label: 'രക്ഷാസരണി' },
    { value: 'islamicLessons', label: 'ഇസ്‌ലാമിക പാഠങ്ങൾ' },
    { value: 'messageOfIslam', label: 'ഇസ്‌ലാമിന്റെ സന്ദേശം' },
    { value: 'truthFalsehood', label: 'സത്യവും അസത്യവും' },
    { value: 'successFactors', label: 'ഇസ്‌ലാമിക പ്രസ്ഥാനത്തിന്റെ വിജയനിദാനങ്ങൾ' },
    { value: 'truePath', label: 'സത്യമാർഗം' },
    { value: 'islamAtGlance', label: 'ഇസ്‌ലാം ഒറ്റ നോട്ടത്തിൽ' },
    { value: 'constructionDestruction', label: 'നിർമ്മാണവും സംഹാരവും' },
    { value: 'lifeAfterDeath', label: 'മരണാനന്തര ജീവിതം' },
    { value: 'rudadFull', label: 'റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി (ഭാഗം:1-5)' },
    { value: 'islamReligion', label: 'ഇസ്‌ലാം മതം' },
    { value: 'politicalTheory', label: 'ഇസ്‌ലാമിന്റെ രാഷ്ട്രീയ സിദ്ധാന്തം' },
    { value: 'moralTheory', label: 'ഇസ്‌ലാമിന്റെ ധാർമ്മിക സിദ്ധാന്തം' },
    { value: 'shirkPolytheism', label: 'ശിർക്ക് അഥവാ ബഹുദൈവ വിശ്വാസം' },
    { value: 'fourTechnicalTerms', label: 'ഖുർആനിലെ നാലു സാങ്കേതിക ശബ്ദങ്ങൾ' }
  ];

  const [occupationOpen, setOccupationOpen] = useState(false);

  // Hierarchy options state
  const [districts, setDistricts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');

  // Load districts
  const loadDistricts = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/districts`);
      if (res.data?.success) {
        const districtsList = res.data.data || [];
        setDistricts(districtsList);
      }
    } catch (e) {
      console.error('Failed loading districts', e);
    }
  }, [import.meta.env.VITE_API_URL]);

  // Load areas
  const loadAreas = useCallback(async (districtId) => {
    if (!districtId) {
      setAreas([]);
      setUnits([]);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(districtId)}`);
      if (res.data?.success) {
        const areasList = res.data.data || [];
        setAreas(areasList);
      }
    } catch (e) {
      console.error('Failed loading areas', e);
    }
  }, [import.meta.env.VITE_API_URL]);

  // Update area name when areas are loaded and selectedAreaId exists
  useEffect(() => {
    if (selectedAreaId && areas.length > 0) {
      const selectedArea = areas.find(a => (a._id || a.id) === selectedAreaId);
      if (selectedArea) {
        setFormData(prev => {
          const areaName = selectedArea.title || selectedArea.name || '';
          // Only update if it's different to avoid unnecessary re-renders
          if (prev.area !== areaName) {
            return { ...prev, area: areaName };
          }
          return prev;
        });
      }
    }
  }, [areas, selectedAreaId]);

  // Load units
  const loadUnits = useCallback(async (areaId) => {
    if (!areaId) {
      setUnits([]);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(areaId)}`);
      if (res.data?.success) {
        const unitsList = res.data.data || [];
        setUnits(unitsList);
      }
    } catch (e) {
      console.error('Failed loading units', e);
    }
  }, [import.meta.env.VITE_API_URL]);

  // Load districts on mount
  useEffect(() => {
    loadDistricts();
  }, [loadDistricts]);

  // Load areas when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      // Reset dependent selections
      setAreas([]);
      setUnits([]);
      setSelectedAreaId('');
      setFormData(prev => ({ ...prev, area: '', halkhaName: '' }));
      loadAreas(selectedDistrictId);
    } else {
      setAreas([]);
      setUnits([]);
    }
  }, [selectedDistrictId, loadAreas]);

  // Load units when area changes
  useEffect(() => {
    if (selectedAreaId) {
      // Update area name in formData
      const selectedArea = areas.find(a => (a._id || a.id) === selectedAreaId);
      if (selectedArea) {
        setFormData(prev => ({
          ...prev,
          area: selectedArea.title || selectedArea.name || '',
          halkhaName: ''
        }));
      }
      // Reset unit selection
      setUnits([]);
      loadUnits(selectedAreaId);
    } else {
      setUnits([]);
    }
  }, [selectedAreaId, loadUnits, areas]);

  // Update district name when district is selected
  useEffect(() => {
    if (selectedDistrictId) {
      const selectedDistrict = districts.find(d => (d._id || d.id) === selectedDistrictId);
      if (selectedDistrict) {
        setFormData(prev => ({
          ...prev,
          district: selectedDistrict.title || selectedDistrict.name || prev.district
        }));
      }
    }
  }, [selectedDistrictId, districts]);

  // Sync initial data when districts/areas/units are loaded
  useEffect(() => {
    if (initialData?.district && districts.length > 0 && !selectedDistrictId) {
      const matchedDistrict = districts.find(d =>
        (d.title || d.name) === initialData.district ||
        d._id === initialData.districtId ||
        d.id === initialData.districtId
      );
      if (matchedDistrict) {
        setSelectedDistrictId(matchedDistrict._id || matchedDistrict.id);
      }
    }
  }, [initialData, districts, selectedDistrictId]);

  useEffect(() => {
    if (initialData?.area && areas.length > 0 && !selectedAreaId) {
      const matchedArea = areas.find(a => 
        (a.title || a.name) === initialData.area || 
        a._id === initialData.areaId || 
        a.id === initialData.areaId
      );
      if (matchedArea) {
        setSelectedAreaId(matchedArea._id || matchedArea.id);
      }
    }
  }, [initialData, areas, selectedAreaId]);

  // Auto-populate applicant date with current date if empty (only for new forms)
  useEffect(() => {
    if (!isReadOnly && !initialData && !formData.applicantDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      setFormData(prev => ({
        ...prev,
        applicantDate: formattedDate
      }));
    }
  }, [isReadOnly, initialData]); // Run when component mounts or when initialData changes

  // Calculate age from DOB when initial data is loaded or DOB changes
  useEffect(() => {
    if (formData.dateOfBirth.day && formData.dateOfBirth.month && formData.dateOfBirth.year) {
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
    } else if (formData.dateOfBirth.day === '' && formData.dateOfBirth.month === '' && formData.dateOfBirth.year === '') {
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
  }, [formData.dateOfBirth.day, formData.dateOfBirth.month, formData.dateOfBirth.year]);

  const handleInputChange = (field, value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Calculate age from date of birth
   * @param {Object} dob - Date of birth object with day, month, year
   * @returns {string} Calculated age or empty string if DOB is invalid
   */
  const calculateAge = (dob) => {
    if (!dob.day || !dob.month || !dob.year) {
      return '';
    }

    const birthDate = new Date(parseInt(dob.year), parseInt(dob.month) - 1, parseInt(dob.day));
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
    // Clear error when compulsory book is checked
    if (section === 'compulsoryBooks' && checked) {
      setCompulsoryBooksError(null);
    }
  };

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

  const handleDateChange = (part, value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      dateOfBirth: {
        ...prev.dateOfBirth,
        [part]: value
      }
    }));
  };

  const handleOtherSkillsTextChange = (value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      otherSkills: {
        ...(typeof prev.otherSkills === 'object' ? prev.otherSkills : { speech: false, khutuba: false, writing: false, other: true, otherText: prev.otherSkills || '' }),
        otherText: value
      }
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [compulsoryBooksError, setCompulsoryBooksError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Reset errors
    setCompulsoryBooksError(null);
    setSubmitError(null);

    // Check required fields
    if (!formData.name || !formData.nameEnglish || !formData.fathersName || !formData.mobile || !formData.gender) {
      alert('Please fill all required fields: Name (Malayalam), Name (English), Father\'s Name, Mobile, and Gender');
      return;
    }

    if (!formData.mobileCountryCode) {
      alert('Please include your country code');
      return;
    }

    // Validate mobile number (10 digits only for +91, otherwise allow any length)
    if (formData.mobileCountryCode === '+91') {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(formData.mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      // For other country codes, just ensure mobile number is not empty
      if (!formData.mobile || formData.mobile.trim() === '') {
        alert('Please enter a valid mobile number');
        return;
      }
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!formData.age) {
      alert('Please enter your age');
      return;
    }

    if (!formData.dateOfBirth.day || !formData.dateOfBirth.month || !formData.dateOfBirth.year) {
      alert('Please select your date of birth');
      return;
    }

    if (!formData.address) {
      alert('Please enter your address');
      return;
    }

    if (!formData.district || !selectedDistrictId) {
      alert('Please select a district (ജില്ല)');
      return;
    }

    if (!formData.area || !selectedAreaId) {
      alert('Please select an area (ഏരിയ)');
      return;
    }

    if (!formData.halkhaName) {
      alert('Please select a unit (ഹൽഖ)');
      return;
    }

    // Check if at least one compulsory book is selected
    const hasCompulsoryBook = formData.compulsoryBooks.book1 ||
      formData.compulsoryBooks.book2 ||
      formData.compulsoryBooks.book3;

    if (!hasCompulsoryBook) {
      setCompulsoryBooksError('നിര്ബന്ധമായി വായിക്കേണ്ട പുസ്തകങ്ങളിൽ ഏതെങ്കിലും ഒന്നെങ്കിലും തിരഞ്ഞെടുക്കണം');
      return;
    }


    setIsSubmitting(true);

    try {
      // Convert otherSkills object to comma-separated string
      let otherSkillsString = '';
      if (formData.otherSkills && typeof formData.otherSkills === 'object') {
        const skills = [];
        if (formData.otherSkills.speech) skills.push('പ്രസംഗം');
        if (formData.otherSkills.khutuba) skills.push('ഖുതുബ');
        if (formData.otherSkills.writing) skills.push('എഴുത്ത്');
        if (formData.otherSkills.other && formData.otherSkills.otherText) {
          skills.push(formData.otherSkills.otherText);
        }
        otherSkillsString = skills.join(', ');
      } else if (typeof formData.otherSkills === 'string') {
        otherSkillsString = formData.otherSkills;
      }

      // Convert occupation from pipe-delimited to comma-separated for backend
      const occupationForSubmit = formData.occupation
        ? formData.occupation.split('|').map(v => v.trim()).filter(Boolean).join(', ')
        : '';

      // Prepare form data with photo
      const submitData = {
        ...formData,
        countryCode: formData.mobileCountryCode,
        photo: photoPreview,
        otherSkills: otherSkillsString,
        occupation: occupationForSubmit,
        dateOfBirth: {
          day: formData.dateOfBirth.day,
          month: formData.dateOfBirth.month,
          year: formData.dateOfBirth.year
        }
      };
      console.log('submitData', submitData);
      // Submit to backend API
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/karkun/submit`,
        submitData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        // Show success message
        setShowSuccess(true);
        // Navigate to landing page after 2 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        alert('Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit form. Please try again.';
      setSubmitError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to format otherSkills for display
  const formatOtherSkills = () => {
    if (formData.otherSkills && typeof formData.otherSkills === 'object') {
      const skills = [];
      if (formData.otherSkills.speech) skills.push('പ്രസംഗം');
      if (formData.otherSkills.khutuba) skills.push('ഖുതുബ');
      if (formData.otherSkills.writing) skills.push('എഴുത്ത്');
      if (formData.otherSkills.other && formData.otherSkills.otherText) {
        skills.push(formData.otherSkills.otherText);
      }
      return skills.join(', ');
    } else if (typeof formData.otherSkills === 'string') {
      return formData.otherSkills;
    }
    return '';
  };

  // Helper function to format association circumstances
  const formatAssociationCircumstances = () => {
    const circumstances = [];
    if (formData.associationCircumstances.family) circumstances.push('കുടുംബപരം');
    if (formData.associationCircumstances.personal) circumstances.push('വ്യക്തിബന്ധം');
    if (formData.associationCircumstances.reading) circumstances.push('വായന');
    if (formData.associationCircumstances.others) circumstances.push('മറ്റുള്ളവ');
    return circumstances.join(', ');
  };

  // Helper function to format first active unit
  const formatFirstActiveUnit = () => {
    const units = [];
    if (formData.firstActiveUnit.balasangham) units.push('ബാലസംഘം');
    if (formData.firstActiveUnit.teenIndia) units.push('ടീൻ ഇന്ത്യ');
    if (formData.firstActiveUnit.sio) units.push('എസ്.ഐ.ഒ');
    if (formData.firstActiveUnit.gio) units.push('ജി.ഐ.ഒ');
    if (formData.firstActiveUnit.solidarity) units.push('സോളിഡാരിറ്റി');
    if (formData.firstActiveUnit.jamaatHalkha) units.push('ജമാഅത്തെ ഹൽഖ');
    if (formData.firstActiveUnit.others) units.push('മറ്റുള്ളവ');
    return units.join(', ');
  };

  // Helper function to format compulsory books
  const formatCompulsoryBooks = () => {
    const books = [];
    if (formData.compulsoryBooks.book1) books.push('✓');
    if (formData.compulsoryBooks.book2) books.push('✓');
    if (formData.compulsoryBooks.book3) books.push('✓');
    return books.length > 0 ? '✓' : '';
  };

  // Format date of birth
  const formatDateOfBirth = () => {
    if (formData.dateOfBirth.day && formData.dateOfBirth.month && formData.dateOfBirth.year) {
      return `${formData.dateOfBirth.day}/${formData.dateOfBirth.month}/${formData.dateOfBirth.year}`;
    }
    return '';
  };

  // PDF Layout Component (Print-Only JSX)
  const PDFLayout = () => (
    <div className="pdf-layout print-only" style={{ fontFamily: 'Anek Malayalam Variable' }}>
      {/* PDF Header */}
      <div className="pdf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logo} alt="JIH Logo" style={{ height: '64px', width: 'auto' }} />
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '20px' }}>കാർകുൻ ഫോറം</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>ജമാഅത്തെ</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>ഇസ്‌ലാമി ഹിന്ദ്</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>കേരള ഹൽഖ</p>
          <p style={{ fontSize: '12px', marginTop: '4px', margin: '0' }}>www.jihkerala.org</p>
        </div>
      </div>

      {/* Section 1: Personal Information */}
      <div className="pdf-section" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>വ്യക്തിഗത വിവരങ്ങൾ (Personal Information)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '20px 20px', alignItems: 'start' }}>
          {/* Row 1: Names */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര് (Malayalam)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.name || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Name (English)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.nameEnglish || ''}</p>
          </div>
          {/* Photo - spans 3 rows */}
          <div style={{ gridRow: '1 / span 3' }}>
            {photoPreview && (
              <img src={photoPreview} alt="Applicant Photo" style={{ width: '120px', height: 'auto', display: 'block' }} />
            )}
          </div>
          {/* Row 2: Father's Name and Gender */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിതാവിന്റെ പേര് (Father's Name)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.fathersName || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ലിംഗം (Gender)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.gender === 'male' ? 'ആൺ (Male)' : formData.gender === 'female' ? 'പെൺ (Female)' : ''}</p>
          </div>
          {/* Row 3: DOB and Age */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജനന തിയ്യതി(DOB)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDateOfBirth()}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വയസ്സ് (Age)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.age || ''}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Family Information */}
      <div className="pdf-section" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>കുടുംബ വിവരങ്ങൾ (Family Information)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഭർത്താവിന്റെ/ഭാര്യയുടെ പേര് (Spouse Name)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.spouseName || ''}</p>
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മക്കൾ - ആൺകുട്ടികൾ (Sons)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.childrenBoys || '0'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മക്കൾ - പെൺകുട്ടികൾ (Daughters)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.childrenGirls || '0'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Contact Information */}
      <div className="pdf-section" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ (Contact Information)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മൊബൈൽ (Mobile)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.mobileCountryCode || '+91'} {formData.mobile || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഇമെയിൽ (Email)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.email || ''}</p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിലാസം (Address)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{formData.address || ''}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Educational & Professional - Must be at bottom of Page 1 */}
      <div className="pdf-section" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>വിദ്യാഭ്യാസ / തൊഴിൽ വിവരങ്ങൾ (Educational & Professional)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിദ്യാഭ്യാസ യോഗ്യത (Educational Qualification)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.educationalQualification || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റു കഴിവുകൾ (Other Skills)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatOtherSkills() || ''}</p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തൊഴിൽ (Occupation)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{formData.occupation || ''}</p>
          </div>
        </div>
      </div>

      {/* Section 5: Location & Organization - Allow all content to flow to Page 1 */}
      <div className="pdf-section pdf-section-5 pdf-section-page2-start" style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>സംഘടന വിവരങ്ങൾ (Location & Organization)</h2>

        {/* Row 1: District, Area, Unit */}
        <div className="section-5-row-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജില്ല (District)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.district || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഏരിയ (Area)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.area || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഹൽഖ / Unit</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.halkhaName || ''}</p>
          </div>
        </div>

        {/* Row 2: Age Associated and Association Circumstances */}
        <div className="section-5-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജമാഅത്തുമായി ബന്ധപ്പെട്ട പ്രായം (Age When Associated)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.ageAssociated || ''}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജമാഅത്തുമായി ബന്ധപ്പെടാനുണ്ടായ സാഹചര്യം (Association Circumstances)</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatAssociationCircumstances() || ''}</p>
          </div>
        </div>

        {/* Row 3: First Active Unit */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ആദ്യമായി പ്രവർത്തിച്ച ഘടകം (First Active Unit)</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatFirstActiveUnit() || ''}</p>
        </div>

        {/* Worked in Other Organization */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മുമ്പ് മറ്റേതെങ്കിലും പ്രസ്ഥാനത്തിൽ പ്രവർത്തിച്ചിരുന്നോ? (was/is Worked in other org?)</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>
            {formData.workedOtherOrganization === 'yes' ? 'അതെ' : formData.workedOtherOrganization === 'no' ? 'ഇല്ല' : ''}
          </p>
          {formData.workedOtherOrganization === 'yes' && formData.otherOrganizationName && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പ്രസ്ഥാനത്തിന്റെ പേര് (Organization Name)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.otherOrganizationName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Books & Reading - First section on Page 2, add top margin */}
      <div className="pdf-section pdf-section-page2-start" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>വായനാ വിവരങ്ങൾ (Books & Reading)</h2>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#dc2626' }}>* നിര്ബന്ധമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</p>
          <div style={{ fontSize: '11pt' }}>
            {formData.compulsoryBooks.book1 && <p style={{ margin: '4px 0' }}>✓ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയിലെ ആദർശം, ലക്ഷ്യം, പ്രവർത്തനമാർഗം (ഖണ്ഡിക 3, 4, 5)</p>}
            {formData.compulsoryBooks.book2 && <p style={{ margin: '4px 0' }}>✓ പ്രസ്ഥാനവും പ്രവർത്തകരും</p>}
            {formData.compulsoryBooks.book3 && <p style={{ margin: '4px 0' }}>✓ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ആദർശം ലക്ഷ്യം നയപരിപാടികൾ</p>}
          </div>
        </div>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>മറ്റു പുസ്‌തകങ്ങൾ:</p>
          <div style={{ fontSize: '11pt', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 16px' }}>
            {otherBooksOptions.map((book) => (
              formData.otherBooks?.[book.value] && (
                <p key={book.value} style={{ margin: '2px 0', fontSize: '10pt' }}>✓ {book.label}</p>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Section 7: Declaration */}
      <div className="pdf-section" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>പ്രസ്താവന  (Declaration)</h2>
        <div style={{ fontSize: '11pt', lineHeight: '1.6', marginBottom: '16px' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>1.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 3ൽ പറഞ്ഞ{' '}
            <span style={{ direction: 'rtl', textAlign: 'center', display: 'inline-block', fontFamily: 'Arial, sans-serif' }}>لا إله إلا الله محمد رسول الله</span>{' '}
            എന്ന ആദർശം അതിന്റെ വിശദീകരണത്തോടെ നന്നായി മനസ്സിലാക്കി, ഇത് തന്നെയാണ് എൻ്റെ ആദർശമെന്ന് ഞാൻ സാക്ഷ്യപ്പെടുത്തുന്നു
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>2.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 4 ൽ പറഞ്ഞ ലക്ഷ്യം അതിൻ്റെ വിശദീകരണ സഹിതം നന്നായി മനസ്സിലാക്കി, ഇത് തന്നെയാണ് എന്റെ ജീവിതത്തിൻ്റെ ലക്ഷ്യമെന്ന് ഞാൻ അംഗീകരിക്കുന്നു.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>3.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന 5ൽ പറഞ്ഞ പ്രവർത്തന മാർഗം ശ്രദ്ധാപൂർവ്വം പഠിച്ചു, അത് നിഷ്ഠയോടെ പാലിക്കുമെന്നു ഞാൻ സമ്മതിക്കുന്നു.
          </p>
          <p style={{ marginBottom: '8px' }}>
            അതിനാൽ കാർകുൻ എന്ന നിലക്ക് ഇഖാമതുദ്ദീനിന് വേണ്ടി സേവനം ചെയ്യാൻ എനിക്ക് സന്ദർഭം നൽകണമെന്ന് അപേക്ഷിക്കുന്നു
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0' }}>തിയ്യതി:</p>
          <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.applicantDate || ''}</p>
        </div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>പ്രാദേശിക ഘടകം ഭാരവാഹി</p>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '11pt', marginBottom: '8px' }}>
              {formData.declarationAccepted ? '✓' : ''} മേൽ പറഞ്ഞ കാര്യങ്ങൾ എന്റെ അറിവിൽ പെട്ടിടത്തോളം സത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. അപേക്ഷ പരിഗണനാർഹമാണ്.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>ഘടകം :</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>തിയ്യതി:</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px' }}>
                  {formData.localUnit || ''}
                </span>
                <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px', textAlign: 'right' }}>
                  {formData.localUnitDate ? new Date(formData.localUnitDate).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>ഏരിയ പ്രസിഡണ്ട് / ജില്ല പ്രസിഡണ്ട്</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>പേര് :</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>തിയ്യതി:</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px' }}>
                  {formData.areaPresidentName || ''}
                </span>
                <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px', textAlign: 'right' }}>
                  {formData.areaPresidentDate ? new Date(formData.areaPresidentDate).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 8: Office Use */}
      <div className="pdf-section">
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>ഓഫീസ് ഉപയോഗത്തിന് (Office Use Only)</h2>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>അപേക്ഷ അംഗീകരിച്ചിരിക്കുന്നു.</p>
          <p style={{ fontSize: '12px', fontWeight: 'bold' }}>ഹൽഖ അമീർ</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>രജിസ്ട്രേഷൻ നമ്പർ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formData.registrationNumber || '(For Department Use Only)'}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>
              {formData.officeRegistrationDate ? new Date(formData.officeRegistrationDate).toLocaleDateString() : (formData.officeDate ? new Date(formData.officeDate).toLocaleDateString() : '(For Department Use Only)')}
            </p>
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
        const img = new Image();
        img.onload = () => {
          // Create a canvas to compress the image
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large (max 800px on longest side)
          const maxDimension = 800;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (0.85 quality)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoPreview(compressedDataUrl);
        };
        img.onerror = () => {
          // Fallback to original if compression fails
          setPhotoPreview(e.target.result);
        };
        img.src = e.target.result;
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

  const handleCloseForm = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {/* Screen-Only Form UI */}
      <div className="screen-only min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-4 md:py-8 px-2 md:px-4" style={{ fontFamily: 'Anek Malayalam Variable' }}>
        <button
          onClick={handleCloseForm}
          className="hidden md:flex fixed top-4 right-4 z-40 bg-white text-[#002349] border border-[#002349]/20 p-3 rounded-full shadow-lg hover:bg-[#002349] hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Close form"
        >
          <X className="w-5 h-5" />
        </button>

        {showSuccess && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="text-center">
                <div className="mb-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                  <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">സബ്മിറ്റ് ചെയ്തു!</h3>
                <p className="text-gray-600 mb-4">നിങ്ങളുടെ അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു</p>
                <p className="text-sm text-gray-500">Redirecting to home page...</p>
              </div>
            </div>
          </div>
        )}

        <div className={`max-w-4xl mx-auto transition-all duration-300 ${showSuccess ? 'blur-sm pointer-events-none' : ''}`}>
          {/* Header Card - Hidden in print */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-[#002349]/10 print:hidden">
            <div className="bg-gradient-to-r from-[#002349] to-[#1b4d87] text-white px-4 py-6 md:px-8 md:py-8">
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img src={logo} alt="JIH Logo" className="h-12 w-auto drop-shadow-lg" />
                  <div className="text-center">
                    <span className="block text-base font-semibold">ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്</span>
                    <span className="text-xs text-blue-100">www.jihkerala.org</span>
                  </div>
                </div>
                <div className="text-center border-t border-white/20 pt-4">
                  <h1 className="text-2xl font-bold mb-1">കാർകുൻ അപേക്ഷ</h1>
                  <p className="text-sm text-blue-100">Karkun Application Form</p>
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden md:flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={logo} alt="JIH Logo" className="h-16 w-auto drop-shadow-lg" />
                  <div>
                    <h1 className="text-3xl font-bold mb-1">കാർകുൻ അപേക്ഷ</h1>
                    <p className="text-sm text-blue-100">Karkun Application Form</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-semibold">ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്</span>
                  <span className="text-sm text-blue-100">www.jihkerala.org</span>
                  <button
                    onClick={handlePrint}
                    className="mt-3 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ml-auto backdrop-blur-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Print Form</span>
                  </button>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Print header - inside form as first child */}
            <div className="hidden print:block print-header mb-4 bg-white p-4 border-b-2 border-gray-900">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center space-x-4">
                  <img src={logo} alt="JIH Logo" className="h-16 w-auto" />
                  <div className="text-center font-bold text-xl">കാർകുൻ ഫോറം</div>
                </div>
                <div className="flex flex-col text-right">
                  <p className="font-bold text-base">ജമാഅത്തെ</p>
                  <p className="font-bold text-base">ഇസ്‌ലാമി ഹിന്ദ്</p>
                  <p className="font-bold text-base">കേരള ഹൽഖ</p>
                  <p className="text-xs mt-1">www.jihkerala.org</p>
                </div>
              </div>
            </div>
            {/* Section 1: Personal Information */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  വ്യക്തിഗത വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Personal Information)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                {/* Photo Upload - Center */}
                <div className="flex justify-center mb-6">
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      ഫോട്ടോ (Photo)
                    </label>
                    <div
                      onClick={!isReadOnly ? handlePhotoClick : undefined}
                      className={`w-32 h-40 border-2 border-dashed ${isReadOnly ? 'border-gray-300 bg-gray-50 cursor-default' : 'border-[#002349]/30 cursor-pointer hover:border-[#002349] hover:bg-[#002349]/5'
                        } rounded-xl transition-all duration-200 flex flex-col items-center justify-center relative group`}
                    >
                      {photoPreview ? (
                        <div className="relative w-full h-full">
                          <img
                            src={photoPreview}
                            alt="Applicant Photo"
                            className="w-full h-full object-cover rounded-xl"
                          />
                          {!isReadOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePhoto();
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-lg transition-colors"
                              aria-label="Remove photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center px-3 text-center">
                          <Upload className="w-8 h-8 text-[#002349]/40 mb-2 group-hover:text-[#002349] transition-colors" />
                          <span className="text-xs text-gray-600 font-medium">Click to upload</span>
                          <span className="text-[10px] text-gray-400 mt-1">Max: 5MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      പേര് (Malayalam) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        const mal = e.target.value.replace(/[^\u0D00-\u0D7F\s]/g, '');
                        handleInputChange('name', mal);
                      }}
                      pattern="[\u0D00-\u0D7F\s]+"
                      title="Enter Malayalam letters only"
                      placeholder="മലയാളത്തിൽ എഴുതുക"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nameEnglish}
                      onChange={(e) => handleInputChange('nameEnglish', e.target.value)}
                      placeholder="Enter name in English"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>
                </div>

                {/* Father's Name */}
                <div className="form-group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    പിതാവിന്റെ പേര് (Father's Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fathersName}
                    onChange={(e) => handleInputChange('fathersName', e.target.value)}
                    placeholder="Enter father's name"
                    readOnly={isReadOnly}
                    className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                  />
                </div>

                {/* Gender, Age, DOB Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ലിംഗം (Gender) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.gender === 'male'}
                          onChange={() => handleInputChange('gender', 'male')}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">ആൺ (Male)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.gender === 'female'}
                          onChange={() => handleInputChange('gender', 'female')}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">പെൺ (Female)</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ജനന തിയ്യതി(DOB) <span className="text-red-500">*</span>
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-700">
                        {formData.dateOfBirth.day && formData.dateOfBirth.month && formData.dateOfBirth.year
                          ? `${formData.dateOfBirth.day}/${formData.dateOfBirth.month}/${formData.dateOfBirth.year}`
                          : '-'}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={formData.dateOfBirth.year && formData.dateOfBirth.month && formData.dateOfBirth.day
                          ? `${formData.dateOfBirth.year}-${String(formData.dateOfBirth.month).padStart(2, '0')}-${String(formData.dateOfBirth.day).padStart(2, '0')}`
                          : ''}
                        onChange={(e) => {
                          const date = e.target.value;
                          if (date) {
                            const [year, month, day] = date.split('-');
                            const newDob = { day, month, year };
                            const calculatedAge = calculateAge(newDob);
                            setFormData(prev => ({
                              ...prev,
                              dateOfBirth: newDob,
                              age: calculatedAge
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              dateOfBirth: { day: '', month: '', year: '' },
                              age: ''
                            }));
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200"
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      വയസ്സ് (Age) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.age || ''}
                      readOnly={true}
                      placeholder="Age"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed outline-none transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Family Information */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  കുടുംബ വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Family Information)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                {/* Spouse Name */}
                <div className="form-group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ഭർത്താവിന്റെ/ഭാര്യയുടെ പേര് (Spouse Name)
                  </label>
                  <input
                    type="text"
                    value={formData.spouseName}
                    onChange={(e) => handleInputChange('spouseName', e.target.value)}
                    placeholder="Enter spouse name"
                    readOnly={isReadOnly}
                    className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                  />
                </div>

                {/* Children */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      മക്കൾ - ആൺകുട്ടികൾ (Sons)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.childrenBoys}
                      onChange={(e) => handleInputChange('childrenBoys', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      മക്കൾ - പെൺകുട്ടികൾ (Daughters)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.childrenGirls}
                      onChange={(e) => handleInputChange('childrenGirls', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Contact Information */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                  ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Contact Information)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                {/* Restructured layout: Mobile/Email on left, Address on right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 contact-info-layout">
                  {/* Left column: Mobile and Email stacked */}
                  <div className="space-y-4">
                    {/* Mobile */}
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        മൊബൈൽ (Mobile) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.mobileCountryCode}
                          onChange={(e) => handleInputChange('mobileCountryCode', e.target.value.replace(/[^0-9+]/g, ''))}
                          placeholder="+91"
                          maxLength="5"
                          readOnly={isReadOnly}
                          className="w-20 px-2 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white country-code-input"
                        />
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => {
                            const isIndia = formData.mobileCountryCode === '+91';
                            const maxLength = isIndia ? 10 : 15; // Allow up to 15 digits for international numbers
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, maxLength);
                            handleInputChange('mobile', value);
                          }}
                          placeholder={formData.mobileCountryCode === '+91' ? 'Enter 10-digit mobile number' : 'Enter mobile number'}
                          maxLength={formData.mobileCountryCode === '+91' ? 10 : 15}
                          readOnly={isReadOnly}
                          className={`flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 mobile-number-input ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ഇമെയിൽ (Email)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        readOnly={isReadOnly}
                        className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      />
                    </div>
                  </div>

                  {/* Right column: Address */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      വിലാസം (Address) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows="4"
                      placeholder="Enter full address"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 resize-none address-textarea h-28 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Educational & Professional Information */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-visible transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                  വിദ്യാഭ്യാസ / തൊഴിൽ വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Educational & Professional)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      വിദ്യാഭ്യാസ യോഗ്യത (Educational Qualification)
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700">
                        {formData.educationalQualification || '-'}
                      </div>
                    ) : (
                      <select
                        value={formData.educationalQualification}
                        onChange={(e) => handleInputChange('educationalQualification', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select education</option>
                        {educationOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      തൊഴിൽ (Occupation)
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700">
                        {formData.occupation || '-'}
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOccupationOpen(o => !o)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] bg-white text-left text-sm"
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
                          <div className="absolute z-30 mt-2 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    മറ്റു കഴിവുകൾ (Other Skills)
                    <span className="text-xs text-gray-500 font-normal ml-2">(പ്രസംഗം, ഖുതുബ, എഴുത്ത്, മറ്റുള്ളവ)</span>
                  </label>
                  {typeof formData.otherSkills === 'string' && isReadOnly ? (
                    <div className="text-sm text-gray-800 px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg">{formData.otherSkills}</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typeof formData.otherSkills === 'object' && formData.otherSkills.speech}
                            onChange={(e) => handleCheckboxChange('otherSkills', 'speech', e.target.checked)}
                            disabled={isReadOnly}
                            className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                          />
                          <span className="text-sm font-medium text-gray-700">പ്രസംഗം</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typeof formData.otherSkills === 'object' && formData.otherSkills.khutuba}
                            onChange={(e) => handleCheckboxChange('otherSkills', 'khutuba', e.target.checked)}
                            disabled={isReadOnly}
                            className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                          />
                          <span className="text-sm font-medium text-gray-700">ഖുതുബ</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typeof formData.otherSkills === 'object' && formData.otherSkills.writing}
                            onChange={(e) => handleCheckboxChange('otherSkills', 'writing', e.target.checked)}
                            disabled={isReadOnly}
                            className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                          />
                          <span className="text-sm font-medium text-gray-700">എഴുത്ത്</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typeof formData.otherSkills === 'object' && formData.otherSkills.other}
                            onChange={(e) => handleCheckboxChange('otherSkills', 'other', e.target.checked)}
                            disabled={isReadOnly}
                            className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                          />
                          <span className="text-sm font-medium text-gray-700">മറ്റുള്ളവ</span>
                        </label>
                      </div>
                      {(typeof formData.otherSkills === 'object' && (formData.otherSkills.other || (isReadOnly && formData.otherSkills.otherText))) && (
                        <input
                          type="text"
                          value={typeof formData.otherSkills === 'object' ? (formData.otherSkills.otherText || '') : ''}
                          onChange={(e) => handleOtherSkillsTextChange(e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Specify other skills"
                          className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Location & Organization Information */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                  സംഘടന വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Location & Organization)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ജില്ല (District) <span className="text-red-500">*</span>
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-700">
                        {formData.district || '-'}
                      </div>
                    ) : (
                      <select
                        value={selectedDistrictId}
                        onChange={(e) => setSelectedDistrictId(e.target.value)}
                        disabled={districts.length === 0}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select District</option>
                        {districts.map(d => (
                          <option key={d._id || d.id} value={d._id || d.id}>
                            {d.title || d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ഏരിയ (Area) <span className="text-red-500">*</span>
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-700">
                        {formData.area || '-'}
                      </div>
                    ) : (
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        disabled={areas.length === 0}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select Area</option>
                        {areas.map(a => (
                          <option key={a._id || a.id} value={a._id || a.id}>
                            {a.title || a.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ഹൽഖ / Unit <span className="text-red-500">*</span>
                    </label>
                    {isReadOnly ? (
                      <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm text-gray-700">
                        {formData.halkhaName || '-'}
                      </div>
                    ) : (
                      <select
                        value={formData.halkhaName}
                        onChange={(e) => handleInputChange('halkhaName', e.target.value)}
                        disabled={units.length === 0}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select Unit</option>
                        {units.map(u => (
                          <option key={u._id || u.id} value={u.title || u.name || u.code}>
                            {u.title || u.name || u.code}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ജമാഅത്തുമായി ബന്ധപ്പെട്ട പ്രായം (Age When Associated)
                    </label>
                    <input
                      type="text"
                      value={formData.ageAssociated}
                      onChange={(e) => handleInputChange('ageAssociated', e.target.value)}
                      placeholder="Enter age"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ജമാഅത്തുമായി ബന്ധപ്പെടാനുണ്ടായ സാഹചര്യം (Association Circumstances)
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.associationCircumstances.family}
                          onChange={(e) => handleCheckboxChange('associationCircumstances', 'family', e.target.checked)}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">കുടുംബപരം</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.associationCircumstances.personal}
                          onChange={(e) => handleCheckboxChange('associationCircumstances', 'personal', e.target.checked)}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">വ്യക്തിബന്ധം</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.associationCircumstances.reading}
                          onChange={(e) => handleCheckboxChange('associationCircumstances', 'reading', e.target.checked)}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">വായന</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.associationCircumstances.others}
                          onChange={(e) => handleCheckboxChange('associationCircumstances', 'others', e.target.checked)}
                          disabled={isReadOnly}
                          className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                        />
                        <span className="text-sm font-medium text-gray-700">മറ്റുള്ളവ</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ആദ്യമായി പ്രവർത്തിച്ച ഘടകം (First Active Unit)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.balasangham}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'balasangham', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">ബാലസംഘം</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.teenIndia}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'teenIndia', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">ടീൻ ഇന്ത്യ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.sio}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'sio', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">എസ്.ഐ.ഒ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.gio}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'gio', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">ജി.ഐ.ഒ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.solidarity}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'solidarity', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">സോളിഡാരിറ്റി</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.jamaatHalkha}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'jamaatHalkha', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">ജമാഅത്തെ ഹൽഖ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.firstActiveUnit.others}
                        onChange={(e) => handleCheckboxChange('firstActiveUnit', 'others', e.target.checked)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">മറ്റുള്ളവ</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    മുമ്പ് മറ്റേതെങ്കിലും പ്രസ്ഥാനത്തിൽ പ്രവർത്തിച്ചിരുന്നോ? (was/is Worked in other org?)
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="workedOtherOrganization"
                        value="yes"
                        checked={formData.workedOtherOrganization === 'yes'}
                        onChange={(e) => handleInputChange('workedOtherOrganization', e.target.value)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">അതെ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="workedOtherOrganization"
                        value="no"
                        checked={formData.workedOtherOrganization === 'no'}
                        onChange={(e) => handleInputChange('workedOtherOrganization', e.target.value)}
                        disabled={isReadOnly}
                        className="w-5 h-5 text-[#002349] border-gray-300 focus:ring-[#002349]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">ഇല്ല</span>
                    </label>
                  </div>
                </div>

                {formData.workedOtherOrganization === 'yes' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      പ്രസ്ഥാനത്തിന്റെ പേര് (Organization Name)
                    </label>
                    <input
                      type="text"
                      value={formData.otherOrganizationName}
                      onChange={(e) => handleInputChange('otherOrganizationName', e.target.value)}
                      placeholder="Enter organization name"
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 6: Books & Reading */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
                  വായനാ വിവരങ്ങൾ
                  <span className="text-sm font-normal text-gray-600 ml-2">(Books & Reading)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    വായിച്ച പ്രാസ്ഥാനിക പുസ്‌തകങ്ങൾ (Organizational books)
                  </label>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-red-600">
                    * നിര്ബന്ധമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.compulsoryBooks.book1}
                        onChange={(e) => handleCheckboxChange('compulsoryBooks', 'book1', e.target.checked)}
                        className="mt-1 w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm text-gray-800">
                        ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയിലെ ആദർശം, ലക്ഷ്യം, പ്രവർത്തനമാർഗം (ഖണ്ഡിക 3, 4, 5)
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.compulsoryBooks.book2}
                        onChange={(e) => handleCheckboxChange('compulsoryBooks', 'book2', e.target.checked)}
                        className="mt-1 w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm text-gray-800">പ്രസ്ഥാനവും പ്രവർത്തകരും</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.compulsoryBooks.book3}
                        onChange={(e) => handleCheckboxChange('compulsoryBooks', 'book3', e.target.checked)}
                        className="mt-1 w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm text-gray-800">ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ആദർശം ലക്ഷ്യം നയപരിപാടികൾ</span>
                    </label>
                  </div>
                  {compulsoryBooksError && (
                    <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-semibold">{compulsoryBooksError}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">മറ്റു പുസ്‌തകങ്ങൾ:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {otherBooksOptions.map((book) => (
                      <label key={book.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.otherBooks?.[book.value] || false}
                          onChange={(e) => handleCheckboxChange('otherBooks', book.value, e.target.checked)}
                          disabled={isReadOnly}
                          className="w-4 h-4 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20 flex-shrink-0"
                        />
                        <span className="flex-1">{book.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: Declarations & Signatures */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
                  പ്രസ്താവന
                  <span className="text-sm font-normal text-gray-600 ml-2">(Declaration)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div className="space-y-2 text-sm leading-relaxed text-gray-800">
                  <p>
                    <strong>1.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 3ൽ പറഞ്ഞ <span className="arabic-text"> لا إله إلا الله محمد رسول الله </span> എന്ന ആദർശം അതിന്റെ വിശദീകരണത്തോടെ നന്നായി മനസ്സിലാക്കി, ഇത് തന്നെയാണ് എൻ്റെ ആദർശമെന്ന് ഞാൻ സാക്ഷ്യപ്പെടുത്തുന്നു
                  </p>
                  <p>
                    <strong>2.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന ഖണ്ഡിക 4 ൽ പറഞ്ഞ ലക്ഷ്യം അതിൻ്റെ വിശദീകരണ സഹിതം നന്നായി മനസ്സിലാക്കി, ഇത് തന്നെയാണ് എന്റെ ജീവിതത്തിൻ്റെ ലക്ഷ്യമെന്ന് ഞാൻ അംഗീകരിക്കുന്നു.
                  </p>
                  <p>
                    <strong>3.</strong> ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന 5ൽ പറഞ്ഞ പ്രവർത്തന മാർഗം ശ്രദ്ധാപൂർവ്വം പഠിച്ചു, അത് നിഷ്ഠയോടെ പാലിക്കുമെന്നു ഞാൻ സമ്മതിക്കുന്നു.
                  </p>
                  <p>
                    അതിനാൽ കാർകുൻ എന്ന നിലക്ക് ഇഖാമതുദ്ദീനിന് വേണ്ടി സേവനം ചെയ്യാൻ എനിക്ക് സന്ദർഭം നൽകണമെന്ന് അപേക്ഷിക്കുന്നു
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  <span className="text-sm font-semibold text-gray-700">തിയ്യതി:</span>
                  <input
                    type="date"
                    value={formData.applicantDate || ''}
                    onChange={(e) => handleInputChange('applicantDate', e.target.value)}
                    readOnly={isReadOnly}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002349]/20 focus:border-[#002349] outline-none transition-all duration-200 bg-white"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">പ്രാദേശിക ഘടകം ഭാരവാഹി</p>
                  </div>
                  <div className="flex justify-center">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declarationAccepted}
                        onChange={(e) => handleInputChange('declarationAccepted', e.target.checked)}
                        disabled={isReadOnly}
                        className="mt-1 w-5 h-5 text-[#002349] border-gray-300 rounded focus:ring-[#002349]/20"
                      />
                      <span className="text-sm text-gray-800">
                        മേൽ പറഞ്ഞ കാര്യങ്ങൾ എന്റെ അറിവിൽ പെട്ടിടത്തോളം സത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. അപേക്ഷ പരിഗണനാർഹമാണ്.
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                        <span>ഘടകം :</span>
                        <span>തിയ്യതി:</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-700">
                        <div className="w-40 border-b border-gray-400 pb-1">
                          {formData.localUnit || '(For Department Use Only)'}
                        </div>
                        <div className="w-40 border-b border-gray-400 pb-1 text-right">
                          {formData.localUnitDate ? new Date(formData.localUnitDate).toLocaleDateString() : '(For Department Use Only)'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <div className="text-center mb-2 text-sm font-semibold text-gray-700">ഏരിയ പ്രസിഡണ്ട് / ജില്ല പ്രസിഡണ്ട്</div>
                      <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                        <span>പേര് :</span>
                        <span>തിയ്യതി:</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-700">
                        <div className="w-40 border-b border-gray-400 pb-1">
                          {formData.areaPresidentName || '(For Department Use Only)'}
                        </div>
                        <div className="w-40 border-b border-gray-400 pb-1 text-right">
                          {formData.areaPresidentDate ? new Date(formData.areaPresidentDate).toLocaleDateString() : '(For Department Use Only)'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 8: Office Use */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200/50 overflow-hidden transition-all duration-200 hover:shadow-lg">
              <div className="bg-gradient-to-r from-[#002349]/5 to-blue-50/50 px-4 md:px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-[#002349] flex items-center gap-2">
                  <span className="bg-[#002349] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
                  ഓഫീസ് ഉപയോഗത്തിന്
                  <span className="text-sm font-normal text-gray-600 ml-2">(Office Use Only)</span>
                </h2>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm text-gray-800">അപേക്ഷ അംഗീകരിച്ചിരിക്കുന്നു.</h3>
                  <p className="text-sm font-bold text-gray-700">ഹൽഖ അമീർ</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-gray-700">രജിസ്ട്രേഷൻ നമ്പർ</span>
                    <div className="w-full md:w-48 h-10 border-2 border-gray-300 rounded-lg bg-gray-50 text-center text-sm text-gray-700 flex items-center justify-center">
                      {formData.registrationNumber || '(For Department Use Only)'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-gray-700">തിയ്യതി</span>
                    <div className="w-full md:w-48 h-10 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center justify-center">
                      {formData.officeRegistrationDate ? new Date(formData.officeRegistrationDate).toLocaleDateString() : (formData.officeDate ? new Date(formData.officeDate).toLocaleDateString() : '(For Department Use Only)')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Area */}
            {!isReadOnly && (
              <div className="print:hidden mt-6 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="md:hidden flex items-center gap-2 bg-white text-[#002349] border-2 border-[#002349] px-6 py-3 rounded-lg hover:bg-[#002349] hover:text-white transition-all duration-200 font-semibold w-full justify-center"
                >
                  <Download className="w-5 h-5" />
                  <span>Print Form</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#002349] text-white px-8 py-3 rounded-lg hover:bg-[#1a3a5c] transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>സമർപ്പിക്കുന്നു...</span>
                    </>
                  ) : (
                    <span>സമർപ്പിക്കുക (Submit Application)</span>
                  )}
                </button>

                {submitError && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-semibold">{submitError}</p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Print-Only PDF Layout */}
      <div className="print-only">
        <PDFLayout />
      </div>
    </>
  );
};

export default KarkunForm;