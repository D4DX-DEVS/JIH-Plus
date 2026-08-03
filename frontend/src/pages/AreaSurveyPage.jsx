import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AreaFormProvider } from '../contexts/AreaFormContext';
import AreaPageA from '../components/forms/area/AreaPageA';
import AreaPageB from '../components/forms/area/AreaPageB';
import AreaPageC from '../components/forms/area/AreaPageC';
import AreaPageD from '../components/forms/area/AreaPageD';
import AreaPageE from '../components/forms/area/AreaPageE';
import AreaPageF from '../components/forms/area/AreaPageF';
import { useAreaForm } from '../contexts/AreaFormContext';
import { getAuthToken } from '../utils/auth';
import { CheckCircle, Menu } from 'lucide-react';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import AdminSidebar from '../components/sidebars/AdminSidebar';

const AreaSurveyContent = ({ editingSurvey, isAdmin }) => {
  const { currentStep } = useAreaForm();
  const navigate = useNavigate();
  const { areaId } = useParams();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [area, setArea] = useState(null);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      const storedAdminData = localStorage.getItem('adminData');
      if (storedAdminData) {
        setAdminData(JSON.parse(storedAdminData));
      }
    }

    // Load area data
    const loadAreaData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const token = localStorage.getItem('userToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        if (userData?.districtId) {
          const areasResp = await fetch(
            `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(userData.districtId)}`,
            { headers }
          );
          const areasData = await areasResp.json();
          const areas = areasData?.data || [];
          const found = areas.find(a => (a.id || a._id || a.code) == areaId);
          if (found) {
            setArea({
              id: found.id || found._id || found.code,
              name: found.title || found.name || areaId
            });
          } else {
            setArea({ id: areaId, name: areaId });
          }
        } else {
          setArea({ id: areaId, name: areaId });
        }
      } catch (error) {
        setArea({ id: areaId, name: areaId });
      }
    };
    
    if (areaId) {
      loadAreaData();
    } else {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setArea({ id: userData.areaId, name: userData.area || userData.areaName || '—' });
    }
  }, [areaId]);

  const handleLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      navigate('/', { replace: true });
      return;
    }
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    navigate('/', { replace: true });
  };

  const handleSidebarNavigate = (tabId) => {
    setIsSidebarOpen(false);

    if (isAdmin) {
      if (tabId === 'yearly' || tabId === 'monthly' || tabId === 'stats') {
        navigate('/admin-dashboard', { state: { activeTab: tabId } });
      } else if (tabId === 'notifications') {
        navigate('/notifications');
      } else if (tabId === 'view-reports') {
        navigate('/view-reports');
      } else if (tabId === 'membership') {
        navigate('/membership', { state: { roleHint: 'admin' } });
      }
      return;
    }

    if (tabId === 'monthly') {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const areaId = userData.areaId || userData.area;
      navigate(`/area-dashboard/${areaId}`);
    } else if (tabId === 'units') {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const areaId = userData.areaId || userData.area;
      navigate(`/area-dashboard/${areaId}`, { state: { initialTab: 'units' } });
    } else if (tabId === 'stats') {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const areaId = userData.areaId || userData.area;
      navigate(`/area-dashboard/${areaId}`, { state: { initialTab: 'stats' } });
    }
  };

  const handleSave = async (formData) => {
    setError('');
    setSuccess('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      // Use admin endpoint if user is admin, otherwise use regular endpoint
      const endpoint = isAdmin 
        ? `${import.meta.env.VITE_API_URL}/api/admin/area-surveys/${editingSurvey._id}`
        : `${import.meta.env.VITE_API_URL}/api/area/surveys/${editingSurvey._id}`;
        
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Area report updated successfully!');
        // Navigate after a short delay to show success message
        setTimeout(() => {
          if (isAdmin) {
            navigate('/admin-dashboard');
          } else {
            // Get user data to determine the correct area dashboard URL
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const areaId = userData.areaId || userData.area;
            navigate(`/area-dashboard/${areaId}`);
          }
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      setError('Error updating report. Please try again.');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <AreaPageA />;
      case 2:
        return <AreaPageB />;
      case 3:
        return <AreaPageC />;
      case 4:
        return <AreaPageD />;
      case 5:
        return <AreaPageE />;
      case 6:
        return <AreaPageF 
          onSave={editingSurvey ? handleSave : null}
          isEditing={!!editingSurvey}
        />;
      default:
        return <AreaPageA />;
    }
  };

  const sidebarElement = isAdmin ? (
    <AdminSidebar
      activeTab="monthly"
      onTabChange={handleSidebarNavigate}
      onNavigateToReports={() => navigate('/view-reports')}
      onDownloadCSV={() => {}}
      onNavigateToNotifications={() => navigate('/notifications')}
      onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'admin' } })}
      onLogout={handleLogout}
      adminEmail={adminData?.email || 'Admin'}
      totalForms={0}
      totalSurveys={0}
      isMobileOpen={isSidebarOpen}
      onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
    />
  ) : (
    <AreaAdminSidebar
      activeTab="monthly"
      onNavigate={handleSidebarNavigate}
      onLogout={handleLogout}
      onNotifications={() => navigate('/notifications')}
      onDynamicReports={() => navigate('/user-reports')}
      onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'area' } })}
      areaName={area?.name || '—'}
      isMobileOpen={isSidebarOpen}
      onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
    />
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      {sidebarElement}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile toggle */}
        <div className="lg:hidden px-4 pt-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur px-4 py-2 text-sm font-semibold text-[#002349] shadow-md"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4">
          {/* Progress Bar */}
          <div className="bg-white shadow-lg border border-gray-200 rounded-2xl mb-4 hover:shadow-xl transition-all duration-500">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-[#002349]">
                  ഏരിയ തലം പ്രതിമാസ  റിപ്പോർട്ട്
                </h1>
                <div className="text-xs text-gray-600 font-medium">
                  Step {currentStep} of 6
                </div>
              </div>
              <div className="flex space-x-1.5">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                      step <= currentStep
                        ? 'bg-[#002349]'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-600 font-medium">
                <span>ഘടകങ്ങൾ</span>
                <span>പ്രവർത്തനങ്ങൾ</span>
                <span>ഫോകസ്</span>
                <span>ടീം പ്രവർത്തനങ്ങൾ</span>
                <span>വ്യക്തികൾ</span>
                <span>വർദ്ധനവ്</span>
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
          {(error || success) && (
            <div className="mb-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                  <p className="text-red-600 text-sm font-semibold">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-700 text-sm font-semibold">{success}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Content */}
          <div className="max-w-7xl mx-auto">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

const AreaSurveyPage = () => {
  const location = useLocation();
  const stateEditingSurvey = location.state?.editingSurvey || null;
  const isAdminFromState = location.state?.isAdmin || false;

  const editingSurvey = stateEditingSurvey;
  const isAdmin = isAdminFromState || !!localStorage.getItem('adminToken');

  // Transform survey data to form structure if editing
  const getInitialData = () => {
    if (!editingSurvey) return null;

    return {
      district: editingSurvey.district || '',
      area: editingSurvey.areaName || editingSurvey.area || '',
      month: editingSurvey.month || '',
      partA: editingSurvey.partA || {
        pj: null,
        kh: null,
        vkh: null
      },
      partB: editingSurvey.partB || {
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
      partC: editingSurvey.partC || {
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
      partD: editingSurvey.partD || {
        activities: []
      },
      partE: editingSurvey.partE || {
        male: null,
        female: null,
        categories: {
          personalConnection: false,
          literaryConnection: false,
          qscStudent: false,
          regularKhutbaListener: false,
          prabodhanamReader: false,
          jaBeneficiary: false,
          adaBeneficiary: false,
          localReliefBeneficiary: false,
          aaramamReader: false,
          thawheedulMaraStudent: false,
          madrasaAlumni: false,
          islamicCollegeAlumni: false,
          neighborhoodMember: false,
          palliativeConnection: false,
          friendsClubMember: false,
          mediaReader: false,
          ayahDarsQuranStudent: false,
          heavenGuardian: false,
          schoolGuardian: false,
          arabicCollegeGuardian: false,
          arabicCollegeStudent: false,
          artsCollegeStudent: false,
          artsCollegeGuardian: false,
          publicCampusStudent: false,
          otherNGOs: false,
          mahallConnection: false,
          fulltimeWorkerConnection: false
        }
      },
      partF: editingSurvey.partF || {
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
    };
  };

  return (
    <AreaFormProvider initialData={getInitialData()}>
      <AreaSurveyContent editingSurvey={editingSurvey} isAdmin={isAdmin} />
    </AreaFormProvider>
  );
};

export default AreaSurveyPage;
