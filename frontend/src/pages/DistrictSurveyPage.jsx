import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DistrictFormProvider } from '../contexts/DistrictFormContext';
import DistrictPageA from '../components/forms/district/DistrictPageA';
import DistrictPageB from '../components/forms/district/DistrictPageB';
import { useDistrictForm } from '../contexts/DistrictFormContext';
import { getAuthToken } from '../utils/auth';
import { CheckCircle } from 'lucide-react';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const DistrictSurveyContent = ({ editingSurvey, isAdmin }) => {
  const { currentStep } = useDistrictForm();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          ? `${import.meta.env.VITE_API_URL}/api/admin/district-surveys/${editingSurvey._id}`
          : `${import.meta.env.VITE_API_URL}/api/district/surveys/${editingSurvey._id}`;
          
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('District report updated successfully!');
        // Navigate after a short delay to show success message
        setTimeout(() => {
          if (isAdmin) {
            navigate('/admin-dashboard');
          } else {
            // Get user data to determine the correct district dashboard URL
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData.districtId) {
              navigate(`/district-dashboard/${userData.districtId}`);
            } else {
              // Fallback: try to get districtId from token or redirect to home
              const token = localStorage.getItem('userToken');
              if (token) {
                try {
                  const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                  if (tokenPayload.districtId) {
                    navigate(`/district-dashboard/${tokenPayload.districtId}`);
                    return;
                  }
                } catch (e) {
                  console.error('Error parsing token:', e);
                }
              }
              navigate('/');
            }
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
        return <DistrictPageA />;
      case 2:
        return <DistrictPageB 
          onSave={editingSurvey ? handleSave : null}
          isEditing={!!editingSurvey}
        />;
      default:
        return <DistrictPageA />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#002349]">
                ജില്ലാ തലം പ്രതിമാസ റിപ്പോർട്ട്
              </h1>
              <div className="text-sm text-gray-600 font-medium">
                Step {currentStep} of 2
              </div>
            </div>
            <div className="mt-4">
              <div className="flex space-x-2">
                {[1, 2].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                      step <= currentStep
                        ? 'bg-[#002349] shadow-md'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600 font-medium">
                <span>ആദ്യ ഭാഗം</span>
                <span>രണ്ടാം ഭാഗം</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 animate-fade-in">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700 text-sm font-semibold">{success}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Content */}
      <div className="max-w-7xl mx-auto py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

const DistrictSurveyPage = () => {
  const location = useLocation();
  const { editingSurvey, isAdmin: isAdminFromState } = location.state || {};
  const [adminData, setAdminData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = isAdminFromState || !!localStorage.getItem('adminToken');

  useEffect(() => {
    if (isAdmin) {
      const storedAdminData = localStorage.getItem('adminData');
      if (storedAdminData) {
        setAdminData(JSON.parse(storedAdminData));
      }
    }
  }, [isAdmin]);
  
  // State for editing survey data fetched from backend or fallback
  const [editingSurveyData, setEditingSurveyData] = useState(() => {
    // Prefer router state
    if (editingSurvey) return editingSurvey;
    // Fallback to sessionStorage written by dashboard
    try {
      const stored = sessionStorage.getItem('editingDistrictSurvey');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(false);

  const handleSidebarNavigate = (tabId) => {
    if (tabId === 'yearly' || tabId === 'monthly' || tabId === 'stats') {
      navigate('/admin-dashboard', { state: { activeTab: tabId } });
    } else if (tabId === 'notifications') {
      navigate('/notifications');
    } else if (tabId === 'view-reports') {
      navigate('/view-reports');
    } else if (tabId === 'membership') {
      navigate('/membership', { state: { roleHint: 'admin' } });
    }
  };
  
  useEffect(() => {
    // If we already have data from state or storage, do not fetch
    if (editingSurveyData) {
      console.log('Using existing editingSurveyData (state/storage). Skipping fetch.');
      return;
    }
    // Check if we're in edit mode from URL parameters
    const urlParams = new URLSearchParams(location.search);
    const editId = urlParams.get('edit');
    
    if (editId && !editingSurveyData) {
      // Fetch survey data from backend
      const fetchSurveyData = async () => {
        setLoading(true);
        try {
          const adminToken = localStorage.getItem('adminToken');
          const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
          const token = isAdmin ? adminToken : userToken;
          const endpoint = isAdmin
            ? `${import.meta.env.VITE_API_URL}/api/admin/district-surveys/${editId}`
            : `${import.meta.env.VITE_API_URL}/api/district/surveys/${editId}`;

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setEditingSurveyData(data.data);
          } else {
            const raw = await response.text();
            console.error('Failed to fetch report data. Status:', response.status, 'Body:', raw);
          }
        } catch (error) {
          console.error('Error fetching report data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchSurveyData();
    }
  }, [location.search, editingSurveyData]);

  // Transform survey data to form structure if editing
  const getInitialData = () => {
    const surveyToEdit = editingSurveyData || editingSurvey;
    if (!surveyToEdit) return null;

    return {
      district: surveyToEdit.district || '',
      month: surveyToEdit.month || '',
      partA: {
        attendance: {
          jih: { 
            present: surveyToEdit.partA?.attendance?.jih?.present || null, 
            leave: surveyToEdit.partA?.attendance?.jih?.leave || null, 
            absent: surveyToEdit.partA?.attendance?.jih?.absent || null 
          },
          vanitha: { 
            present: surveyToEdit.partA?.attendance?.vanitha?.present || null, 
            leave: surveyToEdit.partA?.attendance?.vanitha?.leave || null, 
            absent: surveyToEdit.partA?.attendance?.vanitha?.absent || null 
          },
          solidarity: { 
            present: surveyToEdit.partA?.attendance?.solidarity?.present || null, 
            leave: surveyToEdit.partA?.attendance?.solidarity?.leave || null, 
            absent: surveyToEdit.partA?.attendance?.solidarity?.absent || null 
          },
          sio: { 
            present: surveyToEdit.partA?.attendance?.sio?.present || null, 
            leave: surveyToEdit.partA?.attendance?.sio?.leave || null, 
            absent: surveyToEdit.partA?.attendance?.sio?.absent || null 
          },
          gio: { 
            present: surveyToEdit.partA?.attendance?.gio?.present || null, 
            leave: surveyToEdit.partA?.attendance?.gio?.leave || null, 
            absent: surveyToEdit.partA?.attendance?.gio?.absent || null 
          }
        }
      },
      partB: {
        focusAreas: {
          newAreaExpansionWorkshop: surveyToEdit.partB?.focusAreas?.newAreaExpansionWorkshop || false,
          workerTraining: surveyToEdit.partB?.focusAreas?.workerTraining || false,
          newAreaAgendaPreparation: surveyToEdit.partB?.focusAreas?.newAreaAgendaPreparation || false,
          fulltimeRecruitment: surveyToEdit.partB?.focusAreas?.fulltimeRecruitment || false,
          schoolGuardianClusterFormation: surveyToEdit.partB?.focusAreas?.schoolGuardianClusterFormation || false,
          reliefBeneficiaryDataCollection: surveyToEdit.partB?.focusAreas?.reliefBeneficiaryDataCollection || false,
          workerDeploymentToNewAreas: surveyToEdit.partB?.focusAreas?.workerDeploymentToNewAreas || false,
          weeklyMeetingEffectiveness: surveyToEdit.partB?.focusAreas?.weeklyMeetingEffectiveness || false,
          khatibUtilization: surveyToEdit.partB?.focusAreas?.khatibUtilization || false,
          madrasaMovementGrowthCalculation: surveyToEdit.partB?.focusAreas?.madrasaMovementGrowthCalculation || false,
          schoolCenteredWork: surveyToEdit.partB?.focusAreas?.schoolCenteredWork || false,
          staffHalkaFormation: surveyToEdit.partB?.focusAreas?.staffHalkaFormation || false,
          islamicCollegeAlumniDiscovery: surveyToEdit.partB?.focusAreas?.islamicCollegeAlumniDiscovery || false,
          quranStudyCenterWork: surveyToEdit.partB?.focusAreas?.quranStudyCenterWork || false,
          artsScienceCampusLeadership: surveyToEdit.partB?.focusAreas?.artsScienceCampusLeadership || false,
          hajjUmrahGroupDiscovery: surveyToEdit.partB?.focusAreas?.hajjUmrahGroupDiscovery || false,
          majorMuslimCenterStructure: surveyToEdit.partB?.focusAreas?.majorMuslimCenterStructure || false,
          weakAreaFinancialSupport: surveyToEdit.partB?.focusAreas?.weakAreaFinancialSupport || false,
          qscTeacherOrientation: surveyToEdit.partB?.focusAreas?.qscTeacherOrientation || false,
          khatibOrientation: surveyToEdit.partB?.focusAreas?.khatibOrientation || false,
          institutionBearingOrientation: surveyToEdit.partB?.focusAreas?.institutionBearingOrientation || false,
          selectedWorkerTraining: surveyToEdit.partB?.focusAreas?.selectedWorkerTraining || false,
          otherFocusAreas: surveyToEdit.partB?.focusAreas?.otherFocusAreas || ''
        }
      },
      partC: {
        activities: {
          jih: { componentVisits: surveyToEdit.partC?.activities?.jih?.componentVisits || null },
          vanitha: { areaVisits: surveyToEdit.partC?.activities?.vanitha?.areaVisits || null },
          solidarity: { newComponentFormationAttempts: surveyToEdit.partC?.activities?.solidarity?.newComponentFormationAttempts || null },
          sio: { newPersonConnections: surveyToEdit.partC?.activities?.sio?.newPersonConnections || null },
          gio: { newPersonConnections: surveyToEdit.partC?.activities?.gio?.newPersonConnections || null }
        }
      },
      partD: {
        invitations: {
          male: surveyToEdit.partD?.invitations?.male || null,
          female: surveyToEdit.partD?.invitations?.female || null
        },
        categories: {
          personalConnection: surveyToEdit.partD?.categories?.personalConnection || { male: false, female: false },
          literaryConnection: surveyToEdit.partD?.categories?.literaryConnection || { male: false, female: false },
          qscStudent: surveyToEdit.partD?.categories?.qscStudent || { male: false, female: false },
          regularKhutbaListener: surveyToEdit.partD?.categories?.regularKhutbaListener || { male: false, female: false },
          prabodhanamReader: surveyToEdit.partD?.categories?.prabodhanamReader || { male: false, female: false },
          pfBeneficiary: surveyToEdit.partD?.categories?.pfBeneficiary || { male: false, female: false },
          bzBeneficiary: surveyToEdit.partD?.categories?.bzBeneficiary || { male: false, female: false },
          localReliefBeneficiary: surveyToEdit.partD?.categories?.localReliefBeneficiary || { male: false, female: false },
          aaramamReader: surveyToEdit.partD?.categories?.aaramamReader || { male: false, female: false },
          thawheedulMaraStudent: surveyToEdit.partD?.categories?.thawheedulMaraStudent || { male: false, female: false },
          madrasaAlumni: surveyToEdit.partD?.categories?.madrasaAlumni || { male: false, female: false },
          islamicCollegeAlumni: surveyToEdit.partD?.categories?.islamicCollegeAlumni || { male: false, female: false },
          neighborhoodMember: surveyToEdit.partD?.categories?.neighborhoodMember || { male: false, female: false },
          palliativeConnection: surveyToEdit.partD?.categories?.palliativeConnection || { male: false, female: false },
          friendsClubMember: surveyToEdit.partD?.categories?.friendsClubMember || { male: false, female: false },
          mediaReader: surveyToEdit.partD?.categories?.mediaReader || { male: false, female: false },
          ayahDarsQuranStudent: surveyToEdit.partD?.categories?.ayahDarsQuranStudent || { male: false, female: false },
          heavenGuardian: surveyToEdit.partD?.categories?.heavenGuardian || { male: false, female: false },
          schoolGuardian: surveyToEdit.partD?.categories?.schoolGuardian || { male: false, female: false },
          arabicCollegeGuardian: surveyToEdit.partD?.categories?.arabicCollegeGuardian || { male: false, female: false },
          arabicCollegeStudent: surveyToEdit.partD?.categories?.arabicCollegeStudent || { male: false, female: false },
          artsCollegeStudent: surveyToEdit.partD?.categories?.artsCollegeStudent || { male: false, female: false },
          artsCollegeGuardian: surveyToEdit.partD?.categories?.artsCollegeGuardian || { male: false, female: false },
          publicCampusStudent: surveyToEdit.partD?.categories?.publicCampusStudent || { male: false, female: false },
          otherNGOs: surveyToEdit.partD?.categories?.otherNGOs || { male: false, female: false },
          mahallConnection: surveyToEdit.partD?.categories?.mahallConnection || { male: false, female: false },
          fulltimeWorkerConnection: surveyToEdit.partD?.categories?.fulltimeWorkerConnection || { male: false, female: false },
          otherCategories: surveyToEdit.partD?.categories?.otherCategories || ''
        },
        categoriesCounts: surveyToEdit.partD?.categoriesCounts || {
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
          jih: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.jih?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.jih?.newMembers || null 
          },
          vanitha: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.vanitha?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.vanitha?.newMembers || null 
          },
          solidarity: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.solidarity?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.solidarity?.newMembers || null 
          },
          sio: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.sio?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.sio?.newMembers || null 
          },
          gio: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.gio?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.gio?.newMembers || null 
          },
          teenIndia: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.teenIndia?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.teenIndia?.newMembers || null 
          },
          malarvadi: { 
            newComponents: surveyToEdit.partE?.wingGrowth?.malarvadi?.newComponents || null, 
            newMembers: surveyToEdit.partE?.wingGrowth?.malarvadi?.newMembers || null 
          }
        }
      }
    };
  };

  // Show loading state while fetching survey data
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading report data...</p>
        </div>
      </div>
    );
  }

  const formContent = (
    <DistrictFormProvider initialData={getInitialData()}>
      <DistrictSurveyContent editingSurvey={editingSurvey || editingSurveyData} isAdmin={isAdmin} />
    </DistrictFormProvider>
  );

  if (isAdmin) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <AdminSidebar
          activeTab="monthly"
          onTabChange={handleSidebarNavigate}
          onNavigateToReports={() => navigate('/view-reports')}
          onDownloadCSV={() => {}}
          onNavigateToNotifications={() => navigate('/notifications')}
          onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'admin' } })}
          onLogout={() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            navigate('/', { replace: true });
          }}
          adminEmail={adminData?.email || 'Admin'}
          totalForms={0}
          totalSurveys={0}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 relative z-10 box-border flex flex-col min-w-0 overflow-hidden">
          <MobileTopBar
            title="ജില്ലാ റിപ്പോർട്ട്"
          />
          <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return formContent;
};

export default DistrictSurveyPage;
