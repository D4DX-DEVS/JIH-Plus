import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, X } from 'lucide-react';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import logo from '../assets/LogoColor.png';
import '../styles/rukn-form-print.css';
import MobileTopBar from '../components/sidebars/MobileTopBar';

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

const RuknDetailPage = () => {
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
        `${import.meta.env.VITE_API_URL}/api/rukn/${id}`,
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
      console.error('Error loading Rukn form details:', error);
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
          onDownloadCSV={() => {}}
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

  const parseAttendanceString = (s = '') => {
    if (typeof s !== 'string') return { total: '', attended: '', leave: '', absent: '' };
    const [total = '', attended = '', leave = '', absent = ''] = s.split('|');
    return { total, attended, leave, absent };
  };

  // Format occupation for display (convert pipe-delimited to comma-separated)
  const formatOccupation = (occupation) => {
    if (!occupation) return '—';
    if (occupation.includes('|')) {
      return occupation.split('|').map(v => v.trim()).filter(Boolean).join(', ');
    }
    return occupation;
  };

  // PDF Layout Component (Print-Only JSX)
  const RuknDetailPDFLayout = () => {
    if (!form) return null;

    const weekly = parseAttendanceString(form.attendance?.weeklyMeeting);
    const area = parseAttendanceString(form.attendance?.areaConvention);
    const night = parseAttendanceString(form.attendance?.nightCamp);

    return (
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
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.district || form.districtName || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഏരിയ (Area)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.area || form.areaName || ''}</p>
            </div>
            <div style={{ gridRow: '1 / span 3' }}>
              {form.photo && (
                <img src={form.photo} alt="Applicant Photo" style={{ width: '120px', height: 'auto', display: 'block' }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഘടകം (Unit)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.localUnit || form.unitName || ''}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', marginTop: '20px' }}>വ്യക്തിപരമായ വിവരങ്ങൾ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര് (Malayalam)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.name || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Name (English)</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.nameEnglish || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിതാവിന്റെ പേര്</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.fathersName || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഭാര്യ/ഭർത്താവ്</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.spouse || form.familyConnection?.wifeHusband || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ആൺകുട്ടികൾ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.childrenBoys || '0'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പെൺകുട്ടികൾ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.childrenGirls || '0'}</p>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പൂർണ്ണവിലാസം</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{form.fullAddress || ''}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>സ്ഥലം</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.place || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പി.ഒ.</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.po || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പിൻ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.pin || ''}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മൊബൈൽ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.mobile || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ഇ-മെയിൽ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>അധിക വിവരങ്ങൾ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വയസ്സ്</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.age || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജനന തിയ്യതി</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{formatDate(form.dateOfBirth)}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>വിദ്യാഭ്യാസ യോഗ്യത</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.educationalQualification || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റു കഴിവുകൾ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.otherSkills || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>അറിയാവുന്ന ഭാഷകൾ</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.knownLanguages || ''}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ജോലി</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{formatOccupation(form.occupation)}</p>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മറ്റുവരുമാന മാർഗ്ഗങ്ങൾ</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.otherIncomeSources || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മുമ്പ് മറ്റു സംഘടന/പ്രസ്ഥാനവുമായി ബന്ധമുണ്ടായിരുന്നുവോ?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>{form.previousOrganization || ''}</p>
          </div>
        </div>

        {/* Page 2: Questions 5-7 */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>ചോദ്യങ്ങൾ 5 - 7</h3>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>5. ജമാഅത്തെ സാഹിത്യങ്ങൾ എപ്പോൾ മുതൽ വായിച്ചു തുടങ്ങി?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.question5a || form.question5 || ''}</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}> - ജമാഅത്തെ അംഗത്വത്തിനപേക്ഷിക്കാൻ പ്രേരിപ്പിച്ച സംഗതി എന്ത്?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.question5b || ''}</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>6. നിങ്ങളുടെ ജീവിതത്തിൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയുടെ എട്ടാം ഖണ്ഡികയുമായി വിരുദ്ധമായ എന്തെങ്കിലും ഉണ്ടോ?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.question6 || ''}</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>7. സത്യമാർഗത്തിൽ പ്രവർത്തിക്കുമ്പോൾ നേരിടാനിടയുള്ള പ്രയാസങ്ങളും കഷ്ടനഷ്ടങ്ങളും സംബന്ധിച്ച് താങ്കൾ നല്ലപോലെ ബോധവാനാണോ?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.question7a || ''}</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}> - അത് സന്മനസ്സോടെയും സമചിത്തതയോടെയും അഭിമുഖീകരിക്കാൻ താങ്കൾ തയാറാണോ?</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.question7b || ''}</p>
          </div>
        </div>

        {/* Other Information */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>മറ്റുവിവരങ്ങൾ</h3>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>1. കുടുംബത്തിന്റെ പ്രാസ്ഥാനിക ബന്ധം: ഭാര്യ/ഭർത്താവ്:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.familyConnection?.wifeHusband || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>സന്താനങ്ങൾ:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.familyConnection?.children || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>2. കടങ്ങൾ, ബാധ്യതകൾ:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.debtsLiabilities || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>3. പ്രസ്ഥാനവുമായി ബന്ധപ്പെട്ട് വഹിക്കുന്ന ചുമതലകൾ?:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.organizationalResponsibilities || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>4. ഏറ്റവും അടുത്തുള്ള പ്രാദേശിക ജമാഅത്തെ:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.nearestLocalJamaat || ''}</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>5. കേരളത്തിന് പുറത്താണെങ്കിൽ (വിദേശം/ഇതര സംസ്ഥാനം) നാട്ടിൽ ബന്ധപ്പെടുന്ന ഘടകം:</p>
            <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px' }}>{form.contactUnitAbroad || ''}</p>
          </div>
        </div>

        {/* Compulsory Books */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>നിർബന്ധമായും വായിച്ചിരിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              {compulsoryBookLabels.slice(0, 7).map((book, idx) => (
                <p key={book.key} style={{ fontSize: '11pt', margin: '4px 0' }}>
                  {form.compulsoryBooks?.[book.key] ? '✓' : ''} {idx + 1}. {book.label}
                </p>
              ))}
            </div>
            <div>
              {compulsoryBookLabels.slice(7).map((book, idx) => (
                <p key={book.key} style={{ fontSize: '11pt', margin: '4px 0' }}>
                  {form.compulsoryBooks?.[book.key] ? '✓' : ''} {idx + 8}. {book.label}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Advisable Books */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>അഭികാമ്യമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              {advisableBookLabels.slice(0, 5).map((book) => (
                <p key={book.key} style={{ fontSize: '11pt', margin: '4px 0' }}>
                  {form.advisableBooks?.[book.key] ? '✓' : ''} {book.label}
                </p>
              ))}
            </div>
            <div>
              {advisableBookLabels.slice(5, 9).map((book) => (
                <p key={book.key} style={{ fontSize: '11pt', margin: '4px 0' }}>
                  {form.advisableBooks?.[book.key] ? '✓' : ''} {book.label}
                </p>
              ))}
            </div>
            <div>
              {advisableBookLabels.slice(9).map((book) => (
                <p key={book.key} style={{ fontSize: '11pt', margin: '4px 0' }}>
                  {form.advisableBooks?.[book.key] ? '✓' : ''} {book.label}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Page 3: Activity Report */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>അപേക്ഷകന്റെ കഴിഞ്ഞ ഒരു വർഷത്തെ പ്രവർത്തന റിപ്പോർട്ട്</h2>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '11pt', marginBottom: '8px' }}>
              {formatDate(form.reportPeriod?.from)} മുതൽ {formatDate(form.reportPeriod?.to)} വരെ
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
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{weekly.total || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{area.total || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{night.total || ''}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ഹാജർ</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{weekly.attended || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{area.attended || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{night.attended || ''}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ലീവ്</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{weekly.leave || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{area.leave || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{night.leave || ''}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11pt' }}>ആബ്സന്റ്</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{weekly.absent || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{area.absent || ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11pt' }}>{night.absent || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Activity Questions */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>2. പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം</h3>
            <div style={{ fontSize: '11pt' }}>
              {activityQuestionLabels.map((q) => (
                <div key={q.key} style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                  <p style={{ margin: '0', fontSize: '11pt' }}>{q.label}</p>
                  <p style={{ margin: '0', fontSize: '11pt' }}>{form.activityQuestions?.[q.key] || ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Page 4: Recommendation Form */}
        <div className="pdf-section" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>ശുപാർശ</h2>
          <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>പ്രാദേശിക / ജില്ല / മേഖല നേതൃത്വത്തിന്റെ വിലയിരുത്തൽ</p>

          {/* Local Ameer */}
          <div className="pdf-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>പ്രാദേശിക അമീർ / ഘടക നേതൃത്വ വിവരം</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{form.localAmeer?.name || ''}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>ചുമതല:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{form.localAmeer?.responsibility || ''}</p>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>മൊബൈൽ നമ്പർ:</p>
              <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{form.localAmeer?.mobile || ''}</p>
            </div>
            
            {/* Local Ameer Opinion */}
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>പ്രാദേശിക അമീർന്റെ അഭിപ്രായം</h3>
              <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
                <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{form.localAmeer?.opinion || ''}</p>
              </div>
            </div>
          </div>

          {/* District President */}
          <div className="pdf-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>ജില്ല പ്രസിഡണ്ടിന്റെ അഭിപ്രായം</h3>
            <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
              <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{form.districtPresident?.opinion || ''}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{form.districtPresident?.name || ''}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formatDate(form.districtPresident?.date)}</p>
              </div>
            </div>
          </div>

          {/* Regional Nazim */}
          <div className="pdf-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>മേഖല നാസിമിന്റെ അഭിപ്രായം</h3>
            <div style={{ marginBottom: '12px', minHeight: '80px', border: '1px solid #000', padding: '8px' }}>
              <p style={{ fontSize: '11pt', margin: '0', whiteSpace: 'pre-wrap' }}>{form.regionalNazim?.opinion || ''}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>പേര്:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{form.regionalNazim?.name || ''}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>തിയ്യതി:</p>
                <p style={{ fontSize: '11pt', margin: '0', minHeight: '20px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>{formatDate(form.regionalNazim?.date)}</p>
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
  };

  // Map backend book fields to UI labels
  const compulsoryBookLabels = [
    { key: 'book1', label: 'ജമാअത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടന' },
    { key: 'book2', label: 'പ്രാസ്ഥാനിക  ശിക്ഷണം : റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി സംഗ്രഹം.' },
    { key: 'book3', label: 'ഖുതുബാത്ത്' },
    { key: 'book4', label: 'സത്യസാക്ഷ്യം' },
    { key: 'book5', label: 'പ്രസ്ഥാനവും പ്രവർത്തകരും' },
    { key: 'book6', label: 'ഇസ്‌ലാമും ജാഹിലിയ്യത്തും' },
    { key: 'book7', label: 'ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്, ആദർശം ലക്ഷ്യം നയനിലപാടുകൾ' },
    { key: 'book8', label: 'ഇസ്‌ലാമിന്റെ ജീവിത വ്യവസ്ഥ' },
    { key: 'book9', label: 'ഇസ്‌ലാമിക പ്രവർത്തകരുടെ പരസ്പര ബന്ധങ്ങൾ' },
    { key: 'book10', label: 'ഇസ്‌ലാമിക പ്രവർത്തകരുടെ ഉത്തരവാദിത്തങ്ങൾ' },
    { key: 'book11', label: 'ഇസ്‌ലാമും സംഘടിത ജീവിതവും' },
    { key: 'book12', label: 'ഇഖാമതുദ്ദീനിന്റെ ഭൂമിക' },
    { key: 'book13', label: 'നടപ്പുമീഖാത്തിലെ പോളിസി-പ്രോഗ്രാം' }
  ];

  const advisableBookLabels = [
    { key: 'book1', label: 'രക്ഷാസരണി' },
    { key: 'book2', label: 'സത്യമാർഗം' },
    { key: 'book3', label: 'ഇസ്‌ലാം മതം' },
    { key: 'book4', label: 'ഇസ്‌ലാമിക പാഠങ്ങൾ' },
    { key: 'book5', label: 'ഇസ്‌ലാം ഒറ്റ നോട്ടത്തിൽ' },
    { key: 'book6', label: 'ഇസ്‌ലാമിന്റെ രാഷ്ട്രീയ സിദ്ധാന്തം' },
    { key: 'book7', label: 'ഇസ്‌ലാമിന്റെ സന്ദേശം' },
    { key: 'book8', label: 'നിർമ്മാണവും സംഹാരവും' },
    { key: 'book9', label: 'ഇസ്‌ലാമിന്റെ ധാർമ്മിക സിദ്ധാന്തം' },
    { key: 'book10', label: 'സത്യവും അസത്യവും' },
    { key: 'book11', label: 'മരണാനന്തര ജീവിതം' },
    { key: 'book12', label: 'ശിർക്ക് അഥവാ ബഹുദൈവ വിശ്വാസം' },
    { key: 'book13', label: 'ഇസ്‌ലാമിക പ്രസ്ഥാനത്തിന്റെ വിജയനിദാനങ്ങൾ' },
    { key: 'book14', label: 'ഖുർആനിലെ നാലു സാങ്കേതിക ശബ്ദങ്ങൾ' },
    { key: 'book15', label: 'റൂദാദ് ജമാഅത്തെ ഇസ്‌ലാമി (ഭാഗം:1-5)' }
  ];

  const activityQuestionLabels = [
    { key: 'question1', label: 'ബൈത്തുൽമാൽ കൃത്യമായി നൽകാറുണ്ടോ?' },
    { key: 'question2', label: 'ദഅ്‌വാ പ്രവർത്തനം' },
    { key: 'question3', label: 'ഇസ്‌ലാമിക സമൂഹത്തിലെ പ്രവർത്തനം' },
    { key: 'question4', label: 'ഗൃഹയോഗം ഓരോ മാസവും ചേരാറുണ്ടോ?' },
    { key: 'question5', label: 'നിർബന്ധ ആരാധന/ അനുഷ്‌ഠാനങ്ങൾ ക്യത്യമായി നിർവഹിക്കാറുണ്ടോ?' },
    { key: 'question6', label: 'സകാത്ത് കൃത്യമായി ബൈതുൽമാലിൽ അടക്കാറുണ്ടോ?' },
    { key: 'question7', label: 'സുന്നത്തായ ആരാധന/ അനുഷ്‌ഠാന കാര്യങ്ങളുടെ നിർവഹണം' },
    { key: 'question8', label: 'ദിവസേനയുള്ള ഖുർആൻ പാരായണം' },
    { key: 'question9', label: 'ഖുർആൻ പഠനം/തഫ്ഹീം വായന' },
    { key: 'question10', label: 'വായന, ആനുകാലികം/പുസ്‌തകങ്ങൾ' },
    { key: 'question11', label: 'ദാനധർമങ്ങൾ, സേവന പ്രവർത്തനങ്ങൾ' },
    { key: 'question12', label: 'ഇടപാടുകളിലെ ഇസ്‌ലാമിക മര്യാദകൾ പാലിക്കൽ' },
    { key: 'question13', label: 'കുടുംബസംസ്കരണത്തിലെ ശ്രദ്ധ (ദീനി, പ്രാസ്ഥാനിക അവസ്ഥ, സംസ്കരണ പ്രവർത്തനങ്ങൾ)' },
    { key: 'question14', label: 'പരസ്പരബന്ധങ്ങൾ(മാതാപിതാക്കൾ, സഹോദരങ്ങൾ, അയൽവാസികൾ, പ്രസ്ഥാനപ്രവർത്തകർ)' },
    { key: 'question15', label: 'നിത്യവും വ്യായാമം ചെയ്യാറുണ്ടോ?' }
  ];

  const sidebarElement = renderSidebar();

  return (
    <>
      {/* Screen-Only Display */}
      <div className="screen-only h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        {sidebarElement}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="റുക്ൻ വിവരങ്ങൾ"
        />

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Form Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
            {/* Header with Back, Heading and Print Button */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-[#002349]" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-[#002349]">റുക്ന് അപേക്ഷ വിവരങ്ങൾ</h1>
                  <p className="text-sm text-gray-600 mt-1">Rukn Application Details</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-[#002349] hover:bg-[#1a3a5c] text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>

            {/* Standalone Form Display */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-8" style={{ fontFamily: 'Anek Malayalam Variable' }}>
              {/* Page 1: Personal Information */}
              <section className="space-y-4">
                <div className="pb-2">
                  <h2 className="text-xl font-bold text-gray-900">അപേക്ഷകൻ്റെ വിവരങ്ങൾ</h2>
                  <p className="text-sm text-gray-600 mt-1">Applicant's Details</p>
                </div>

                {/* Photo and Basic Info - Merged */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* District, Area, Unit Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ജില്ല</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.district || form.districtName || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഏരിയ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.area || form.areaName || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഘടകം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.localUnit || form.unitName || '—'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Photo - Reduced size with click to view */}
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

                {/* Personal Details */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">വ്യക്തിപരമായ വിവരങ്ങൾ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">പേര്</label>
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
                      <label className="text-sm font-medium text-gray-700">ഭാര്യ/ഭർത്താവ്</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.spouse || form.familyConnection?.wifeHusband || '—'}
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
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">പൂർണ്ണവിലാസം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.fullAddress || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">സ്ഥലം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.place || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">പി.ഒ.</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.po || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">പിൻ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.pin || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">മൊബൈൽ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.mobile || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഇ-മെയിൽ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.email || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">അധിക വിവരങ്ങൾ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">വയസ്സ്</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.age || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ജനന തിയ്യതി</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {formatDate(form.dateOfBirth)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">വിദ്യാഭ്യാസ യോഗ്യത</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.educationalQualification || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">മറ്റു കഴിവുകൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.otherSkills || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">അറിയാവുന്ന ഭാഷകൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.knownLanguages || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ജോലി</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {formatOccupation(form.occupation)}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">മറ്റുവരുമാന മാർഗ്ഗങ്ങൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.otherIncomeSources || '—'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">മുൻ സംഘടനാ ബന്ധം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm min-h-[60px]">
                        {form.previousOrganization || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application Date */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">അപേക്ഷ തിയ്യതി</label>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {formatDate(form.applicationDate || form.applicantDate || form.submittedAt)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Page 2: Questions and Books */}
              <section className="space-y-6 border-t border-gray-300 pt-8">
                <div className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-bold text-gray-900">ചോദ്യങ്ങൾ</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">5. ജമാഅത്തെ സാഹിത്യങ്ങൾ എപ്പോൾ മുതൽ വായിച്ചു തുടങ്ങി?</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {form.question5a || form.question5 || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">- ജമാഅത്തെ അംഗത്വത്തിനപേക്ഷിക്കാൻ പ്രേരിപ്പിച്ച സംഗതി എന്ത്?</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {form.question5b || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">6. നിങ്ങളുടെ ജീവിതത്തിൽ ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് ഭരണഘടനയുടെ എട്ടാം ഖണ്ഡികയുമായി വിരുദ്ധമായ എന്തെങ്കിലും ഉണ്ടോ?</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {form.question6 || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">7. സത്യമാർഗത്തിൽ പ്രവർത്തിക്കുമ്പോൾ നേരിടാനിടയുള്ള പ്രയാസങ്ങളും കഷ്ടനഷ്ടങ്ങളും സംബന്ധിച്ച് താങ്കൾ നല്ലപോലെ ബോധവാനാണോ?</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {form.question7a || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">- അത് സന്മനസ്സോടെയും സമചിത്തതയോടെയും അഭിമുഖീകരിക്കാൻ താങ്കൾ തയാറാണോ?</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {form.question7b || '—'}
                    </div>
                  </div>
                </div>

                {/* Other Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">മറ്റുവിവരങ്ങൾ</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">കുടുംബത്തിന്റെ പ്രാസ്ഥാനിക ബന്ധം: ഭാര്യ/ഭർത്താവ്</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.familyConnection?.wifeHusband || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">സന്താനങ്ങൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.familyConnection?.children || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">കടങ്ങൾ, ബാധ്യതകൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.debtsLiabilities || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">പ്രസ്ഥാനവുമായി ബന്ധപ്പെട്ട് വഹിക്കുന്ന ചുമതലകൾ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.organizationalResponsibilities || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">ഏറ്റവും അടുത്തുള്ള പ്രാദേശിക ജമാഅത്തെ</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.nearestLocalJamaat || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">കേരളത്തിന് പുറത്താണെങ്കിൽ (വിദേശം/ഇതര സംസ്ഥാനം) നാട്ടിൽ ബന്ധപ്പെടുന്ന ഘടകം</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {form.contactUnitAbroad || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compulsory Books */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">നിർബന്ധമായും വായിച്ചിരിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {compulsoryBookLabels.map((book, idx) => (
                      <div key={book.key} className="flex items-center gap-2 text-sm">
                        <span className="w-6">{idx + 1}.</span>
                        <span className="flex-1">{book.label}</span>
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          form.compulsoryBooks?.[book.key] ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {form.compulsoryBooks?.[book.key] && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advisable Books */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">അഭികാമ്യമായി വായിക്കേണ്ട പുസ്തകങ്ങൾ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {advisableBookLabels.map((book) => (
                      <div key={book.key} className="flex items-center gap-2 text-sm">
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          form.advisableBooks?.[book.key] ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {form.advisableBooks?.[book.key] && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </span>
                        <span className="flex-1">{book.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Page 3: Activity Report */}
              <section className="space-y-6 border-t border-gray-300 pt-8">
                <div className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-bold text-gray-900">അപേക്ഷകന്റെ കഴിഞ്ഞ ഒരു വർഷത്തെ പ്രവർത്തന റിപ്പോർട്ട്</h2>
                </div>

                {/* Report Period */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">മുതൽ:</label>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {formatDate(form.reportPeriod?.from)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">വരെ:</label>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      {formatDate(form.reportPeriod?.to)}
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">യോഗങ്ങളിലെ ഹാജർ</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-sm text-left">യോഗങ്ങൾ</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm text-center">പ്രതിവാരയോഗം</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm text-center">ഏരിയാ കൺവെൻഷൻ</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm text-center">നിശാ ക്യാമ്പ്</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { field: 'total', label: 'റിപ്പോർട്ട് കാലത്ത് ആകെ നടന്നത്' },
                          { field: 'attended', label: 'ഹാജർ' },
                          { field: 'leave', label: 'ലീവ്' },
                          { field: 'absent', label: 'ആബ്സന്റ്' }
                        ].map((row) => {
                          const weekly = parseAttendanceString(form.attendance?.weeklyMeeting);
                          const area = parseAttendanceString(form.attendance?.areaConvention);
                          const night = parseAttendanceString(form.attendance?.nightCamp);
                          return (
                            <tr key={row.field} className="bg-white even:bg-gray-50">
                              <td className="border border-gray-300 px-3 py-2 text-sm">{row.label}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{weekly[row.field] || '—'}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{area[row.field] || '—'}</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{night[row.field] || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Activity Questions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം</h3>
                  <div className="space-y-3">
                    {activityQuestionLabels.map((q) => (
                      <div key={q.key} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4 items-center">
                        <p className="text-sm text-gray-700">{q.label}</p>
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.activityQuestions?.[q.key] || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Page 4: Recommendations */}
              <section className="space-y-6 border-t border-gray-300 pt-8">
                <div className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-bold text-gray-900">ശുപാർശ</h2>
                </div>

                {/* Local Ameer */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">പ്രാദേശിക അമീർ / ഘടക നേതൃത്വ വിവരം</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">പേര്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.localAmeer?.name || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ചുമതല</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.localAmeer?.responsibility || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">മൊബൈൽ നമ്പർ</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.localAmeer?.mobile || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Local Ameer Opinion */}
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">പ്രാദേശിക അമീർന്റെ അഭിപ്രായം</h3>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm min-h-[100px]">
                      {form.localAmeer?.opinion || '—'}
                    </div>
                  </div>
                </div>

                {/* District President */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">ജില്ല പ്രസിഡണ്ടിന്റെ അഭിപ്രായം</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">അഭിപ്രായം</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm min-h-[100px]">
                        {form.districtPresident?.opinion || '—'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">പേര്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.districtPresident?.name || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">തിയ്യതി</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {formatDate(form.districtPresident?.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regional Nazim */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">മേഖല നാസിമിന്റെ അഭിപ്രായം</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">അഭിപ്രായം</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm min-h-[100px]">
                        {form.regionalNazim?.opinion || '—'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">പേര്</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {form.regionalNazim?.name || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">തിയ്യതി</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {formatDate(form.regionalNazim?.date)}
                        </div>
                      </div>
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
        <RuknDetailPDFLayout />
      </div>
    </>
  );
};

export default RuknDetailPage;

