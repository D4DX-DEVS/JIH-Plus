import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, CheckCircle, Menu } from 'lucide-react';
import axios from 'axios';
import { AreaFormProvider, useAreaForm } from '../contexts/AreaFormContext';
import AreaPageA from '../components/forms/area/AreaPageA';
import AreaPageB from '../components/forms/area/AreaPageB';
import AreaPageC from '../components/forms/area/AreaPageC';
import AreaPageD from '../components/forms/area/AreaPageD';
import AreaPageE from '../components/forms/area/AreaPageE';
import AreaPageF from '../components/forms/area/AreaPageF';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';

const AreaSurveyEditContent = ({ survey, onSave, isSaving, onBack, error, success, setError, setSuccess }) => {
  const { currentStep } = useAreaForm();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [area, setArea] = useState(null);

  useEffect(() => {
    // Load area data
    const loadAreaData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const token = localStorage.getItem('userToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        if (userData?.districtId) {
          const areasResp = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(userData.districtId)}`,
            { headers }
          );
          const areas = areasResp.data?.data || [];
          const found = areas.find(a => (a.id || a._id || a.code) == (userData.areaId || survey?.area));
          if (found) {
            setArea({
              id: found.id || found._id || found.code,
              name: found.title || found.name || userData.areaId
            });
          } else {
            setArea({ id: userData.areaId, name: survey?.area || userData.area || userData.areaName || '—' });
          }
        } else {
          setArea({ id: userData.areaId, name: survey?.area || userData.area || userData.areaName || '—' });
        }
      } catch (error) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        setArea({ id: userData.areaId, name: survey?.area || userData.area || userData.areaName || '—' });
      }
    };
    
    if (survey) {
      loadAreaData();
    }
  }, [survey]);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    navigate('/', { replace: true });
  };

  const handleSidebarNavigate = (tabId) => {
    setIsSidebarOpen(false);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const areaId = userData.areaId || userData.area;
    if (areaId) {
      navigate(`/area-dashboard/${areaId}`, { state: { initialTab: tabId } });
    } else {
      navigate('/area-dashboard');
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
        return <AreaPageF onSave={onSave} isSaving={isSaving} isEditing={true} />;
      default:
        return <AreaPageA />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-x-hidden">
      <AreaAdminSidebar
        activeTab="monthly"
        onNavigate={handleSidebarNavigate}
        onLogout={handleLogout}
        onNotifications={() => navigate('/notifications')}
        onDynamicReports={() => navigate('/user-reports')}
        onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'area' } })}
        areaName={area?.name || survey?.area || '—'}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Progress Bar */}
          <div className="bg-white shadow-lg border border-gray-200 rounded-2xl mb-4 hover:shadow-xl transition-all duration-500">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-[#002349]">
                  ഏരിയ തലം പ്രതിമാസ റിപ്പോർട്ട് എഡിറ്റ്
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

const AreaSurveyEditPage = ({ surveyId: propSurveyId, onBack, onSubmit }) => {
  const { surveyId: paramSurveyId } = useParams();
  const navigate = useNavigate();
  
  // Use prop surveyId if provided, otherwise use param surveyId
  const surveyId = propSurveyId || paramSurveyId;
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/area/surveys/${surveyId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSurvey(response.data.data);
      } else {
        setError('Failed to load report');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      setError('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('userToken');
      
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/area/surveys/${surveyId}`, formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSuccess('Area report updated successfully!');
        setTimeout(() => {
          if (onSubmit) {
            onSubmit(response.data.data);
          } else {
            navigate(`/area-survey-detail/${surveyId}`);
          }
        }, 2000);
      } else {
        setError('Failed to update report');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      setError('Failed to update report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading report for editing...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 font-semibold">{error}</p>
          <button
            onClick={handleBack}
            className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-2 rounded-2xl transition-all duration-500 font-semibold hover:shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4 font-medium">Report not found</p>
          <button
            onClick={handleBack}
            className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-2 rounded-2xl transition-all duration-500 font-semibold hover:shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AreaFormProvider initialData={survey}>
      <AreaSurveyEditContent 
        survey={survey} 
        onSave={handleSave} 
        isSaving={isSaving} 
        onBack={handleBack}
        error={error}
        success={success}
        setError={setError}
        setSuccess={setSuccess}
      />
    </AreaFormProvider>
  );
};

export default AreaSurveyEditPage;
