import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, User, MapPin, CheckCircle, Users, TrendingUp, Activity } from 'lucide-react';
import axios from 'axios';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import jihLogo from '../assets/LogoColor.png';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const AreaSurveyDetailPage = ({ surveyId: propSurveyId, onBack, onEdit, onDelete }) => {
  const { surveyId: paramSurveyId } = useParams();
  const navigate = useNavigate();
  
  // Use prop surveyId if provided, otherwise use param surveyId
  const surveyId = propSurveyId || paramSurveyId;
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const handleEdit = () => {
    if (onEdit) {
      onEdit(survey);
    } else {
      navigate(`/area-survey-edit/${surveyId}`);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/area/surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (onDelete) {
        onDelete();
      } else {
        navigate('/area-dashboard');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      setError('Failed to delete report');
    }
    setShowDeleteModal(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPartA = (partA) => (
    <div className="pt-6 pb-6 border-b border-gray-300">
      <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">1</span>
        ആകെ ഘടകങ്ങൾ
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            KH
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
            {partA.kh || 0}
          </div>
        </div>
        <div className="group">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            VKH
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
            {partA.vkh || 0}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPartB = (partB) => (
    <>
        {/* Monthly Meeting Status */}
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">2</span>
            മാസിക കൂടിക്കാഴ്ച
          </h4>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-700 font-medium">നടന്നുവോ?</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            partB.monthlyMeeting === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
              {partB.monthlyMeeting === 'Yes' ? 'അതെ' : 'ഇല്ല'}
          </span>
          </div>
          {partB.monthlyMeetingReason && (
          <div className="mt-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">കാരണം</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-xs font-medium">
                {partB.monthlyMeetingReason}
              </div>
            </div>
          )}
        </div>

        {/* Wing Attendance */}
      <div className="pt-6 pb-6 border-b border-gray-300">
          <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">3</span>
              വിംഗ് ഹാജരാകൽ
            </h4>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-[#002349]">വിംഗ്</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഹാജരായി</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">അവധി</th>
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഗൈർഹാജർ</th>
                </tr>
              </thead>
              <tbody>
            {Object.entries(partB.wingAttendance || {}).map(([wing, attendance]) => (
                <tr key={wing} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="border-b border-gray-100 px-3 py-2 text-xs font-bold text-[#002349] capitalize">{wing}</td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.present || 0}</td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.leave || 0}</td>
                  <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{attendance.absent || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Main Decisions */}
        {partB.mainDecisions && partB.mainDecisions.length > 0 && (
        <div className="pt-6 pb-6 border-b border-gray-300">
          <h4 className="text-base font-bold text-[#002349] mb-4 flex items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">4</span>
              പ്രധാന തീരുമാനങ്ങൾ
            </h4>
          <div className="space-y-2">
              {partB.mainDecisions.map((decision, index) => (
              <div key={index} className="flex items-start space-x-2 p-2.5 bg-gray-50 rounded-xl">
                <span className="text-xs font-bold text-[#957C3D] mt-0.5 min-w-[16px]">{index + 1}.</span>
                <p className="text-xs text-gray-900 font-medium">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );

  const renderPartC = (partC) => {
    const activityLabels = {
      newAreaWorkshop: 'പുതിയ ഏരിയ വർക്ക്ഷോപ്പ്',
      workerTraining: 'പ്രവർത്തക പരിശീലനം',
      newAreaAgenda: 'പുതിയ ഏരിയ എജണ്ട തയ്യാറാക്കൽ',
      fulltimeRecruitment: 'പൂർണ്ണസമയ നിയമനം',
      schoolGuardianCluster: 'സ്കൂൾ രക്ഷിതാവ് ക്ലസ്റ്റർ രൂപീകരണം',
      reliefDataCollection: 'ആശ്വാസ ഗുണഭോക്താവ് ഡാറ്റ ശേഖരണം',
      workerDeployment: 'പുതിയ ഏരിയകളിലേക്ക് പ്രവർത്തക വിന്യാസം',
      weeklyMeetingEffectiveness: 'ആഴ്ചയിലെ കൂടിക്കാഴ്ച ഫലപ്രാപ്തി',
      hajjUmrahGroup: 'ഹജ്ജ്/ഉംറ ഗ്രൂപ്പ് അംഗങ്ങൾ',
      artsScienceCampus: 'ആർട്സ് & സയൻസ് കാമ്പസ് പ്രവർത്തനങ്ങൾ',
      madrasaGrowthCalculation: 'മദ്റസ വളർച്ച കണക്കുകൂട്ടൽ',
      schoolCenteredWork: 'സ്കൂൾ കേന്ദ്രീകൃത പ്രവർത്തനം',
      staffHalkaFormation: 'സ്റ്റാഫ് ഹൽക്ക രൂപീകരണം',
      islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥികൾ',
      quranStudyCenterWork: 'ഖുർആൻ പഠന കേന്ദ്ര പ്രവർത്തനം'
    };

    const selectedActivities = Object.entries(partC.expansionActivities || {})
      .filter(([key, value]) => value)
      .map(([key]) => ({ key, label: activityLabels[key] || key }));

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">5</span>
          ശ്രദ്ധേയമായ മേഖലകൾ
        </h3>
        
        {selectedActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedActivities.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2 py-1.5 px-2.5 bg-gray-50 rounded-xl">
                <div className="w-1.5 h-1.5 bg-[#957C3D] rounded-full"></div>
                <span className="text-xs text-gray-900 font-medium">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 font-medium">ശ്രദ്ധേയമായ മേഖലകൾ തിരഞ്ഞെടുത്തിട്ടില്ല</p>
        )}
      </div>
    );
  };

  const renderPartD = (partD) => {
    const wingLabels = {
      jih: 'JIH',
      vanitha: 'Vanitha',
      solidarity: 'Solidarity',
      gio: 'GIO'
    };

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">6</span>
          ഏരിയ ടീം പ്രവർത്തനങ്ങൾ
        </h3>
        
        {partD.activities ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-[#002349]">വിംഗ്</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">ഘടക സന്ദർശനങ്ങൾ</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">പുതിയ ഘടക ശ്രമങ്ങൾ</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-[#002349]">പുതിയ വ്യക്തി കണ്ടെത്തൽ ശ്രമങ്ങൾ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(partD.activities).map(([wing, data]) => (
                  <tr key={wing} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="border-b border-gray-100 px-3 py-2 text-xs font-bold text-[#002349]">{wingLabels[wing] || wing}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">{data.componentVisits || 0}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                      {data.newComponentAttempts === 1 ? 'അതെ' : data.newComponentAttempts === 0 ? 'ഇല്ല' : '-'}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                      {data.newPersonDiscoveryAttempts === 1 ? 'അതെ' : data.newPersonDiscoveryAttempts === 0 ? 'ഇല്ല' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-600 font-medium">ടീം പ്രവർത്തനങ്ങൾ രേഖപ്പെടുത്തിയിട്ടില്ല</p>
        )}
      </div>
    );
  };

  const renderPartE = (partE) => {
    const categoryLabels = {
      personalConnection: 'വ്യക്തിബന്ധം',
      literaryConnection: 'സാഹിത്യബന്ധം',
      qscStudent: 'QSC പഠിതാവ്',
      regularKhutbaListener: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ',
      prabodhanamReader: 'പ്രബോധനം വായനക്കാരൻ',
      jaBeneficiary: 'PF ഗുണഭോക്താവ്',
      adaBeneficiary: 'BZ ഗുണഭോക്താവ്',
      localReliefBeneficiary: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്',
      aaramamReader: 'ആരാമം വായനക്കാരി',
      thawheedulMaraStudent: 'തംഹീദുൽ മർഅ പഠിതാവ്',
      madrasaAlumni: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി',
      islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി',
      neighborhoodMember: 'അയൽകൂട്ടം അംഗം',
      palliativeConnection: 'പാലിയേറ്റീവ് ബന്ധം',
      friendsClubMember: 'Friends Club അംഗം',
      mediaReader: 'മാധ്യമം വായനക്കാരൻ',
      ayahDarsQuranStudent: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്',
      heavenGuardian: 'ഹെവൻസിലെ രക്ഷിതാവ്',
      schoolGuardian: 'സ്കൂളിലെ രക്ഷിതാവ്',
      arabicCollegeGuardian: 'അറബികോളജ് രക്ഷിതാവ്',
      arabicCollegeStudent: 'അറബിക് കോളജ് വിദ്യാർത്ഥി',
      artsCollegeStudent: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി',
      artsCollegeGuardian: 'ആർട്സ് കോളജ് രക്ഷിതാവ്',
      publicCampusStudent: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി',
      otherNGOs: 'മറ്റു NGO കൾ',
      mahallConnection: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം',
      fulltimeWorkerConnection: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം'
    };

    const selectedCategories = Object.entries(partE.categories || {})
      .filter(([key, value]) => value && (value.male || value.female))
      .map(([key, value]) => ({ 
        key, 
        label: categoryLabels[key] || key,
        male: value.male,
        female: value.female,
        maleCount: partE.categoriesCounts?.[key]?.male || 0,
        femaleCount: partE.categoriesCounts?.[key]?.female || 0
      }));

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#957C3D] text-white text-xs font-bold rounded-full mr-2">7</span>
          പുതിയ വ്യക്തികളെ കണ്ടെത്തുന്നതിനായി സംസാരിച്ച വ്യക്തികൾ
        </h3>
        
        <div className="space-y-4">
          {/* Gender Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                ആണ്‍
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
                {partE.male || 0}
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                പെണ്‍
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-[#002349]">
                {partE.female || 0}
              </div>
            </div>
          </div>

          {/* Categories */}
          {selectedCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[#002349] mb-3">ഏത് കാറ്റഗറിയിൽപെട്ടവരോടാണ് സംസാരിച്ചത് (✓ മാർക്ക് ചെയ്യുക)</h4>
              <div className="space-y-2">
                {selectedCategories.map(({ key, label, male, female, maleCount, femaleCount }) => (
                  <div key={key} className="p-2.5 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="text-xs font-medium text-gray-700 mb-2">{label}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Male Section */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={male}
                            readOnly
                            className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded"
                          />
                          <span className="text-xs font-medium text-blue-800">ആൺ</span>
                        </div>
                      {male && (
                          <input
                            type="number"
                            value={maleCount || 0}
                            readOnly
                            className="w-full px-2 py-1.5 border border-blue-300 rounded-lg bg-blue-50 text-base"
                            placeholder="എണ്ണം"
                          />
                        )}
                      </div>
                      
                      {/* Female Section */}
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={female}
                            readOnly
                            className="h-3.5 w-3.5 text-pink-600 border-gray-300 rounded"
                          />
                          <span className="text-xs font-medium text-pink-800">പെൺ </span>
                        </div>
                      {female && (
                          <input
                            type="number"
                            value={femaleCount || 0}
                            readOnly
                            className="w-full px-2 py-1.5 border border-pink-300 rounded-lg bg-pink-50 text-base"
                            placeholder="എണ്ണം"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Category */}
          {partE.otherCategory && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-xs font-medium">
                {partE.otherCategory}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPartF = (partF) => {
    const wingLabels = {
      jih: 'JIH',
      vanitha: 'Vanitha',
      solidarity: 'Solidarity',
      sio: 'SIO',
      gio: 'GIO',
      teenIndia: 'Teen India',
      malarvadi: 'Malarvadi'
    };

    const totalComponents = Object.values(partF.wingGrowth || {}).reduce((sum, data) => sum + (data.newComponents || 0), 0);
    const totalMembers = Object.values(partF.wingGrowth || {}).reduce((sum, data) => sum + (data.newMembers || 0), 0);

    return (
      <div className="pt-6 pb-6 border-b border-gray-300">
        <h3 className="text-base font-bold text-[#002349] mb-4 flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002349] text-white text-xs font-bold rounded-full mr-2">8</span>
          റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(partF.wingGrowth || {}).map(([wing, data]) => (
            <div key={wing} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-[#002349] uppercase tracking-wide">
                  {wingLabels[wing] || wing}
                </h5>
                <div className="text-[10px] text-gray-600 font-semibold">
                  {((data.newComponents || 0) + (data.newMembers || 0))} ആകെ
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-xl">
                  <div className="text-base font-bold text-green-700 mb-0.5">{data.newComponents || 0}</div>
                  <div className="text-[10px] text-green-600 font-medium">ഘടകങ്ങൾ</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-xl">
                  <div className="text-base font-bold text-blue-700 mb-0.5">{data.newMembers || 0}</div>
                  <div className="text-[10px] text-blue-600 font-medium">അംഗങ്ങൾ</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-xl font-bold text-green-600">{totalComponents}</div>
              <div className="text-xs text-gray-600 font-semibold">ആകെ ഘടകങ്ങൾ</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-xl font-bold text-[#002349]">{totalMembers}</div>
              <div className="text-xs text-gray-600 font-semibold">ആകെ അംഗങ്ങൾ</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get area name for sidebar
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const areaName = area?.name || survey?.area || userData.area || userData.areaName || '—';

  const renderWithSidebar = (content) => (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AreaAdminSidebar
        activeTab="monthly"
        onNavigate={handleSidebarNavigate}
        onLogout={handleLogout}
        onNotifications={() => navigate('/notifications')}
        onDynamicReports={() => navigate('/user-reports')}
        areaName={areaName}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="ഏരിയ റിപ്പോർട്ട്"
        />
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          {content}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderWithSidebar(
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002349] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return renderWithSidebar(
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md shadow-lg">
            <p className="text-red-600 mb-6 font-semibold">{error}</p>
            <button
              onClick={handleBack}
              className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out hover:shadow-[#002349]/50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return renderWithSidebar(
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 max-w-md shadow-lg">
            <p className="text-yellow-700 mb-6 font-semibold">Report not found</p>
            <button
              onClick={handleBack}
              className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out hover:shadow-[#002349]/50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AreaAdminSidebar
        activeTab="monthly"
        onNavigate={handleSidebarNavigate}
        onLogout={handleLogout}
        onNotifications={() => navigate('/notifications')}
        onDynamicReports={() => navigate('/user-reports')}
        areaName={area?.name || survey?.area || '—'}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="ഏരിയ റിപ്പോർട്ട്"
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4">
          {/* Header - No container */}
          <div className="flex items-center justify-between mb-6 gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-[#002349] transition-all duration-300 flex items-center justify-center w-11 h-11 lg:w-7 lg:h-7 border border-gray-300 hover:border-[#002349] rounded-xl hover:shadow-md shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="hidden lg:block text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349] mb-2">ഏരിയ തലം റിപ്പോർട്ട്</h1>
                <p className="text-base text-gray-700 break-words">
                  <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-[#957C3D] text-white shadow-sm">{survey.month}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{survey.district}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{survey.area}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleEdit}
                className="bg-[#957C3D] hover:bg-[#8A6F35] text-white px-3 py-2.5 lg:py-1.5 rounded-xl transition-all duration-300 flex items-center space-x-1.5 text-xs font-semibold hover:shadow-md"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>തിരുത്തുക</span>
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 lg:py-1.5 rounded-xl transition-all duration-300 flex items-center space-x-1.5 text-xs font-semibold hover:shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ഇല്ലാതാക്കുക</span>
              </button>
            </div>
          </div>

      {/* Main Content */}
          <main className="max-w-4xl mx-auto pt-4">
        {/* Survey Parts */}
            <div className="space-y-0">
          {survey.partA && renderPartA(survey.partA)}
          {survey.partB && renderPartB(survey.partB)}
          {survey.partC && renderPartC(survey.partC)}
          {survey.partD && renderPartD(survey.partD)}
          {survey.partE && renderPartE(survey.partE)}
          {survey.partF && renderPartF(survey.partF)}
        </div>
      </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="ഏരിയ റിപ്പോർട്ട് ഇല്ലാതാക്കുക"
        message={`${survey.month} മാസത്തിലെ ഈ ഏരിയ റിപ്പോർട്ട് ഇല്ലാതാക്കണമെന്ന് നിങ്ങൾക്ക് ഉറപ്പാണോ? ഈ പ്രവർത്തനം പൂർവ്വാവസ്ഥയിലാക്കാൻ കഴിയില്ല.`}
        confirmText="ഇല്ലാതാക്കുക"
        confirmColor="red"
      />

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInDelay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fade-in-delay {
          animation: fadeInDelay 0.8s ease-out 0.2s both;
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out 0.2s both;
        }

        .animate-slide-in-up {
          animation: slideInUp 0.6s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
};

export default AreaSurveyDetailPage;
