import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Calendar, User, Menu, X } from 'lucide-react';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import logo from '../assets/LogoColor.png';
import '../styles/karkun-form-print.css';

const detectRole = () => {
  if (localStorage.getItem('adminToken')) return 'admin';
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return userData.role || userData.type || 'district';
  } catch {
    return 'district';
  }
};

const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem('userData') || '{}');
  } catch {
    return {};
  }
};

const getAdminData = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const KarkunDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [role] = useState(detectRole());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const userData = useMemo(() => getUserData(), []);
  const adminData = useMemo(() => getAdminData(), []);

  useEffect(() => {
    loadFormDetails();
  }, [id]);

  const loadFormDetails = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/karkun/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setForm(response.data.data || response.data.form);
      } else {
        setError('Failed to load form details');
      }
    } catch (error) {
      console.error('Error loading Karkun form details:', error);
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        setError('Backend server is not running. Please start the server and try again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. Please check your authentication.');
      } else if (error.response?.status === 404) {
        setError('Form not found.');
      } else {
        setError('Failed to load form details. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  // Sidebar navigation handlers
  const handleSidebarNavigate = (viewId) => {
    setIsSidebarOpen(false);
    if (role === 'admin') {
      navigate('/admin-dashboard', { state: { activeTab: viewId } });
    } else if (role === 'district') {
      navigate('/district-dashboard', { state: { activeView: viewId } });
    } else if (role === 'area') {
      navigate('/area-dashboard', { state: { activeTab: viewId } });
    } else if (role === 'unit') {
      navigate('/unit-dashboard', { state: { activeTab: viewId } });
    }
  };

  const handleNavigateToMembership = () => {
    setIsSidebarOpen(false);
    navigate('/membership', { state: { roleHint: role } });
  };

  const handleNavigateToNotifications = () => {
    setIsSidebarOpen(false);
    navigate('/notifications');
  };

  const handleNavigateToReports = () => {
    setIsSidebarOpen(false);
    if (role === 'admin') {
      navigate('/view-reports');
    } else {
      navigate('/user-reports');
    }
  };

  const handleDynamicReports = () => {
    setIsSidebarOpen(false);
    navigate('/user-reports');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    setShowLogoutModal(false);
    window.location.href = '/';
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Render appropriate sidebar based on role
  const renderSidebar = () => {
    const currentRole = role || detectRole();

    if (currentRole === 'admin') {
      return (
        <AdminSidebar
          activeTab="membership"
          onTabChange={handleSidebarNavigate}
          onNavigateToReports={handleNavigateToReports}
          onDownloadCSV={() => { }}
          onNavigateToNotifications={handleNavigateToNotifications}
          onNavigateToMembership={handleNavigateToMembership}
          onLogout={handleLogout}
          adminEmail={adminData?.email || 'Admin'}
          totalForms={0}
          totalSurveys={0}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'district') {
      return (
        <DistrictAdminSidebar
          activeView="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          districtName={userData?.district || userData?.districtName || '—'}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'area') {
      return (
        <AreaAdminSidebar
          activeTab="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          areaName={userData?.area || userData?.areaName || '—'}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'unit') {
      return (
        <UnitAdminSidebar
          activeTab="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          unitName={userData?.unit || userData?.unitName || '—'}
          areaName={userData?.area || userData?.areaName || ''}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    }

    return (
      <DistrictAdminSidebar
        activeView="membership"
        onNavigate={handleSidebarNavigate}
        onLogout={handleLogout}
        onNotifications={handleNavigateToNotifications}
        onDynamicReports={handleDynamicReports}
        onNavigateToMembership={handleNavigateToMembership}
        districtName={userData?.district || userData?.districtName || '—'}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">ഫോം വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md shadow-lg">
            <p className="text-red-600 mb-6 font-semibold">{error || 'ഫോം കണ്ടെത്തിയില്ല'}</p>
            <button
              onClick={handleBack}
              className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
            >
              തിരികെ പോകുക
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper functions for data formatting
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatDateOfBirth = (dob) => {
    if (!dob) return '—';
    if (typeof dob === 'object' && dob.day && dob.month && dob.year) {
      return `${dob.day}/${dob.month}/${dob.year}`;
    }
    return formatDate(dob);
  };

  const formatOtherSkills = (skills) => {
    if (!skills) return '—';
    if (typeof skills === 'string') return skills;
    if (typeof skills === 'object') {
      const skillList = [];
      if (skills.speech) skillList.push('പ്രസംഗം');
      if (skills.khutuba) skillList.push('ഖുതുബ');
      if (skills.writing) skillList.push('എഴുത്ത്');
      if (skills.other && skills.otherText) skillList.push(skills.otherText);
      return skillList.length > 0 ? skillList.join(', ') : '—';
    }
    return '—';
  };

  // Format occupation for display (convert pipe-delimited to comma-separated)
  const formatOccupation = (occupation) => {
    if (!occupation) return '—';
    if (occupation.includes('|')) {
      return occupation.split('|').map(v => v.trim()).filter(Boolean).join(', ');
    }
    return occupation;
  };

  // Format association circumstances
  const formatAssociationCircumstances = () => {
    if (!form.associationCircumstances) return '';
    const circumstances = [];
    if (form.associationCircumstances.family) circumstances.push('കുടുംബപരം');
    if (form.associationCircumstances.personal) circumstances.push('വ്യക്തിബന്ധം');
    if (form.associationCircumstances.reading) circumstances.push('വായന');
    if (form.associationCircumstances.others) circumstances.push('മറ്റുള്ളവ');
    return circumstances.join(', ');
  };

  // Format first active unit
  const formatFirstActiveUnit = () => {
    if (!form.firstActiveUnit) return '';
    const units = [];
    if (form.firstActiveUnit.balasangham) units.push('ബാലസംഘം');
    if (form.firstActiveUnit.teenIndia) units.push('ടീൻ ഇന്ത്യ');
    if (form.firstActiveUnit.sio) units.push('എസ്.ഐ.ഒ');
    if (form.firstActiveUnit.gio) units.push('ജി.ഐ.ഒ');
    if (form.firstActiveUnit.solidarity) units.push('സോളിഡാരിറ്റി');
    if (form.firstActiveUnit.jamaatHalkha) units.push('ജമാഅത്തെ ഹൽഖ');
    if (form.firstActiveUnit.others) units.push('മറ്റുള്ളവ');
    return units.join(', ');
  };

  // Format date of birth
  const formatDateOfBirthPDF = () => {
    if (!form.dateOfBirth) return '';
    if (typeof form.dateOfBirth === 'object' && form.dateOfBirth.day && form.dateOfBirth.month && form.dateOfBirth.year) {
      return `${form.dateOfBirth.day}/${form.dateOfBirth.month}/${form.dateOfBirth.year}`;
    }
    return formatDate(form.dateOfBirth);
  };

  // Other books options list
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

  // PDF Layout Component (Print-Only JSX)
  const KarkunDetailPDFLayout = () => {
    if (!form) return null;

    return (
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
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര് (Malayalam)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Name (English)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.nameEnglish || ''}</p>
            </div>
            <div style={{ gridRow: '1 / span 3' }}>
              {form.photo && (
                <img src={form.photo} alt="Applicant Photo" style={{ width: '120px', height: 'auto', display: 'block' }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിതാവിന്റെ പേര് (Father's Name)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.fathersName || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ലിംഗം (Gender)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.gender === 'male' ? 'ആൺ (Male)' : form.gender === 'female' ? 'പെൺ (Female)' : ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വയസ്സ് (Age)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.age || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജനന തിയ്യതി(DOB)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDateOfBirthPDF()}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Family Information */}
        <div className="pdf-section" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>കുടുംബ വിവരങ്ങൾ (Family Information)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഭർത്താവിന്റെ/ഭാര്യയുടെ പേര് (Spouse Name)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.spouseName || ''}</p>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മക്കൾ - ആൺകുട്ടികൾ (Sons)</p>
                  <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.childrenBoys || '0'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മക്കൾ - പെൺകുട്ടികൾ (Daughters)</p>
                  <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.childrenGirls || '0'}</p>
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
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.mobileCountryCode || '+91'} {form.mobile || ''}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഇമെയിൽ (Email)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.email || ''}</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിലാസം (Address)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{form.address || ''}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Educational & Professional */}
        <div className="pdf-section" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>വിദ്യാഭ്യാസ / തൊഴിൽ വിവരങ്ങൾ (Educational & Professional)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിദ്യാഭ്യാസ യോഗ്യത (Educational Qualification)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.educationalQualification || ''}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റു കഴിവുകൾ (Other Skills)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatOtherSkills(form.otherSkills) || ''}</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തൊഴിൽ (Occupation)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{formatOccupation(form.occupation) || ''}</p>
            </div>
          </div>
        </div>

        {/* Section 5: Location & Organization */}
        <div className="pdf-section pdf-section-5 pdf-section-page2-start" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>സംഘടന വിവരങ്ങൾ (Location & Organization)</h2>

          {/* Row 1: District, Area, Unit */}
          <div className="section-5-row-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജില്ല (District)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.district || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഏരിയ (Area)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.area || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഹൽഖ / Unit</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.halkhaName || ''}</p>
            </div>
          </div>

          {/* Row 2: Age Associated and Association Circumstances */}
          <div className="section-5-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജമാഅത്തുമായി ബന്ധപ്പെട്ട പ്രായം (Age When Associated)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.ageAssociated || ''}</p>
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
              {form.workedOtherOrganization === 'yes' ? 'അതെ' : form.workedOtherOrganization === 'no' ? 'ഇല്ല' : ''}
            </p>
            {form.workedOtherOrganization === 'yes' && form.otherOrganizationName && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പ്രസ്ഥാനത്തിന്റെ പേര് (Organization Name)</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.otherOrganizationName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Books & Reading */}
        <div className="pdf-section pdf-section-page2-start" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>വായനാ വിവരങ്ങൾ (Books & Reading)</h2>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#dc2626' }}>* നിര്ബന്ധമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</p>
            <div style={{ fontSize: '11pt' }}>
              {form.compulsoryBooks?.book1 && <p style={{ margin: '4px 0' }}>✓ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയിലെ ആദർശം, ലക്ഷ്യം, പ്രവർത്തനമാർഗം (ഖണ്ഡിക 3, 4, 5)</p>}
              {form.compulsoryBooks?.book2 && <p style={{ margin: '4px 0' }}>✓ പ്രസ്ഥാനവും പ്രവർത്തകരും</p>}
              {form.compulsoryBooks?.book3 && <p style={{ margin: '4px 0' }}>✓ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ആദർശം ലക്ഷ്യം നയപരിപാടികൾ</p>}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>മറ്റു പുസ്‌തകങ്ങൾ:</p>
            <div style={{ fontSize: '11pt', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 16px' }}>
              {otherBooksOptions.map((book) => (
                form.otherBooks?.[book.value] && (
                  <p key={book.value} style={{ margin: '2px 0', fontSize: '10pt' }}>✓ {book.label}</p>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Section 7: Declaration */}
        <div className="pdf-section" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>പ്രസ്താവന (Declaration)</h2>
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
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(form.applicantDate) || ''}</p>
          </div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '16px', marginTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>പ്രാദേശിക ഘടകം ഭാരവാഹി</p>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '11pt', marginBottom: '8px' }}>
                {form.declarationAccepted ? '✓' : ''} മേൽ പറഞ്ഞ കാര്യങ്ങൾ എന്റെ അറിവിൽ പെട്ടിടത്തോളം സത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. അപേക്ഷ പരിഗണനാർഹമാണ്.
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
                    {form.localUnit || ''}
                  </span>
                  <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px', textAlign: 'right' }}>
                    {form.localUnitDate ? new Date(form.localUnitDate).toLocaleDateString() : ''}
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
                    {form.areaPresidentName || ''}
                  </span>
                  <span style={{ fontSize: '11pt', borderBottom: '1px solid #000', width: '160px', display: 'inline-block', paddingBottom: '4px', textAlign: 'right' }}>
                    {form.areaPresidentDate ? new Date(form.areaPresidentDate).toLocaleDateString() : ''}
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
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.registrationNumber || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>
                {form.officeRegistrationDate ? new Date(form.officeRegistrationDate).toLocaleDateString() : (form.officeDate ? new Date(form.officeDate).toLocaleDateString() : '')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sidebarElement = renderSidebar();

  return (
    <>
      {/* Screen-Only Display */}
      <div className="screen-only min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-x-hidden">
        {sidebarElement}

        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Mobile menu toggle */}
          <div className="lg:hidden px-4 pt-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur px-4 py-2 text-sm font-semibold text-[#002349] shadow-md"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>

          <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleBack}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5 text-[#002349]" />
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold text-[#002349]">കാർകുൻ അപേക്ഷ വിവരങ്ങൾ</h1>
                      <p className="text-sm text-gray-600 mt-1">Karkun Application Details</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 bg-[#002349] hover:bg-[#1a3a5c] text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Form Info Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#002349] to-[#1a3a5c] rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg text-gray-600 font-medium">Name:</span>
                        <h2 className="text-xl font-bold text-[#002349]">{form.name || form.nameEnglish || 'N/A'}</h2>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 font-medium mt-2">
                        {form.mobile && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{form.mobileCountryCode || '+91'} {form.mobile}</span>
                          </div>
                        )}
                        {form.submittedAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Submitted: {formatDate(form.submittedAt)}</span>
                          </div>
                        )}
                        {form.district && (
                          <div className="flex items-center space-x-1">
                            <span>District: {form.district}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Status Badge */}
                  {form.status && (
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold ${form.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : form.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                    </div>
                  )}
                </div>
              </div>

              {/* Standalone Form Display */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-8" style={{ fontFamily: 'Anek Malayalam Variable' }}>
                {/* Section 1: Personal Information */}
                <section className="space-y-4">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">വ്യക്തിഗത വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Personal Information</p>
                  </div>

                  {/* Photo and Basic Info */}
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Name Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">പേര് (Malayalam)</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.name || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name (English)</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.nameEnglish || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">പിതാവിന്റെ പേര്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.fathersName || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ലിംഗം</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.gender === 'male' ? 'ആൺ (Male)' : form.gender === 'female' ? 'പെൺ (Female)' : '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">വയസ്സ്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.age || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ജനന തിയ്യതി</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {formatDateOfBirth(form.dateOfBirth)}
                        </div>
                      </div>
                    </div>

                    {/* Photo */}
                    {form.photo && (
                      <div className="flex flex-col items-center gap-1 -mt-20">
                        <img
                          src={form.photo}
                          alt="Applicant"
                          onClick={() => setShowPhotoModal(true)}
                          className="w-28 h-36 md:w-32 md:h-40 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-[#002349] hover:shadow-lg transition-all duration-300"
                        />
                        <p className="text-xs text-gray-500 text-center">Click to view larger</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 2: Family Information */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">കുടുംബ വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Family Information</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഭർത്താവിന്റെ/ഭാര്യയുടെ പേര്</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.spouseName || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ആൺകുട്ടികൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.childrenBoys || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">പെൺകുട്ടികൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.childrenGirls || '—'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Contact Information */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Contact Information</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">മൊബൈൽ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.mobileCountryCode || '+91'} {form.mobile || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഇമെയിൽ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.email || '—'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">വിലാസം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm min-h-[60px]">
                        {form.address || '—'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 4: Educational & Professional */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">വിദ്യാഭ്യാസ / തൊഴിൽ വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Educational & Professional</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">വിദ്യാഭ്യാസ യോഗ്യത</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.educationalQualification || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">തൊഴിൽ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {formatOccupation(form.occupation)}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">മറ്റു കഴിവുകൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {formatOtherSkills(form.otherSkills)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 5: Location & Organization */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">സംഘടന വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Location & Organization</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ജില്ല</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.district || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഏരിയ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.area || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഹൽഖ / Unit</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.halkhaName || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ജമാഅത്തുമായി ബന്ധപ്പെട്ട പ്രായം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.ageAssociated || '—'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">ജമാഅത്തുമായി ബന്ധപ്പെടാനുണ്ടായ സാഹചര്യം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.associationCircumstances ? [
                          form.associationCircumstances.family && 'കുടുംബപരം',
                          form.associationCircumstances.personal && 'വ്യക്തിബന്ധം',
                          form.associationCircumstances.reading && 'വായന',
                          form.associationCircumstances.others && 'മറ്റുള്ളവ'
                        ].filter(Boolean).join(', ') || '—' : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ആദ്യമായി പ്രവർത്തിച്ച ഘടകം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.firstActiveUnit ? [
                          form.firstActiveUnit.balasangham && 'ബാലസംഘം',
                          form.firstActiveUnit.teenIndia && 'ടീൻ ഇന്ത്യ',
                          form.firstActiveUnit.sio && 'എസ്.ഐ.ഒ',
                          form.firstActiveUnit.gio && 'ജി.ഐ.ഒ',
                          form.firstActiveUnit.solidarity && 'സോളിഡാരിറ്റി',
                          form.firstActiveUnit.jamaatHalkha && 'ജമാഅത്തെ ഹൽഖ',
                          form.firstActiveUnit.others && 'മറ്റുള്ളവ'
                        ].filter(Boolean).join(', ') || '—' : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">മുൻ മറ്റു പ്രസ്ഥാനത്തിൽ പ്രവർത്തിച്ചിരുന്നോ?</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.workedOtherOrganization === 'yes' ? 'അതെ' : form.workedOtherOrganization === 'no' ? 'ഇല്ല' : '—'}
                      </div>
                    </div>
                    {form.workedOtherOrganization === 'yes' && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">പ്രസ്ഥാനത്തിന്റെ പേര്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.otherOrganizationName || '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 6: Books & Reading */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">വായനാ വിവരങ്ങൾ</h2>
                    <p className="text-sm text-gray-600 mt-1">Books & Reading</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">വായിച്ച പ്രാസ്ഥാനിക പുസ്‌തകങ്ങൾ</label>
                    <label className="text-sm font-semibold text-red-600 mb-2 block">നിർബന്ധമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</label>
                    <div className="space-y-2">
                      {[
                        { key: 'book1', label: 'ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയിലെ ആദർശം, ലക്ഷ്യം, പ്രവർത്തനമാർഗം (ഖണ്ഡിക 3, 4, 5)' },
                        { key: 'book2', label: 'പ്രസ്ഥാനവും പ്രവർത്തകരും' },
                        { key: 'book3', label: 'ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ആദർശം ലക്ഷ്യം നയപരിപാടികൾ' }
                      ].map((book, idx) => (
                        <div key={book.key} className="flex items-start gap-2 text-sm">
                          <span className="w-6">{idx + 1}.</span>
                          <span className="flex-1">{book.label}</span>
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.compulsoryBooks?.[book.key] ? 'bg-green-500 border-green-500' : 'border-gray-300'
                            }`}>
                            {form.compulsoryBooks?.[book.key] && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {form.otherBooks && Object.values(form.otherBooks).some(val => val === true) && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">മറ്റു പുസ്‌തകങ്ങൾ</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {otherBooksOptions.map((book) => (
                          form.otherBooks?.[book.value] && (
                            <div key={book.value} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="w-4 h-4 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">✓</span>
                              </span>
                              <span className="flex-1">{book.label}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Section 7: Declaration */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">പ്രസ്താവന</h2>
                    <p className="text-sm text-gray-600 mt-1">Declaration</p>
                  </div>
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
                    <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {formatDate(form.applicantDate) || '—'}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-800">പ്രാദേശിക ഘടകം ഭാരവാഹി</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex items-start gap-3">
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-1 ${form.declarationAccepted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {form.declarationAccepted && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </span>
                        <span className="text-sm text-gray-800">
                          മേൽ പറഞ്ഞ കാര്യങ്ങൾ എന്റെ അറിവിൽ പെട്ടിടത്തോളം സത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. അപേക്ഷ പരിഗണനാർഹമാണ്.
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center text-sm font-semibold text-gray-700 mb-2">
                          <span>ഘടകം :</span>
                          <span>തിയ്യതി:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="w-40 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                            {form.localUnit || '—'}
                          </div>
                          <div className="w-40 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-right">
                            {formatDate(form.localUnitDate) || '—'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-center mb-2 text-sm font-semibold text-gray-700">ഏരിയ പ്രസിഡണ്ട് / ജില്ല പ്രസിഡണ്ട്</div>
                        <div className="flex justify-between items-center text-sm font-semibold text-gray-700 mb-2">
                          <span>പേര് :</span>
                          <span>തിയ്യതി:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="w-40 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                            {form.areaPresidentName || '—'}
                          </div>
                          <div className="w-40 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-right">
                            {formatDate(form.areaPresidentDate) || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 8: Office Use */}
                <section className="space-y-4 border-t border-gray-300 pt-8">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">ഓഫീസ് ഉപയോഗത്തിന്</h2>
                    <p className="text-sm text-gray-600 mt-1">Office Use Only</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">രജിസ്ട്രേഷൻ നമ്പർ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.registrationNumber || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">തിയ്യതി</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {formatDate(form.officeRegistrationDate || form.officeDate)}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Photo Modal */}
          {showPhotoModal && form.photo && (
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowPhotoModal(false)}
            >
              <div className="relative max-w-4xl max-h-[90vh] w-full">
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
                <img
                  src={form.photo}
                  alt="Applicant - Full Size"
                  className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <ConfirmationModal
            isOpen={showLogoutModal}
            onClose={cancelLogout}
            onConfirm={confirmLogout}
            title="Logout"
            message="Are you sure you want to logout?"
            confirmText="Logout"
            cancelText="Cancel"
            type="logout"
          />
        </div>
      </div>

      {/* Print-Only PDF Layout */}
      <div className="print-only">
        <KarkunDetailPDFLayout />
      </div>
    </>
  );
};

export default KarkunDetailPage;

