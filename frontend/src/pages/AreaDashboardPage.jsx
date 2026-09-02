import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, FileText, Search, Filter, Edit, Trash2, Users, ArrowLeft, Check, Bell, Eye, MapPin, Building, BookOpen, TrendingUp } from 'lucide-react';
import axios from 'axios';
import AreaSurveyDetailPage from './AreaSurveyDetailPage';
import AreaSurveyEditPage from './AreaSurveyEditPage';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import SubmissionsAnalytics from '../components/dashboard/SubmissionsAnalytics';
import StatisticsCard from '../components/charts/StatisticsCard';
import SurveyBarChart from '../components/charts/SurveyBarChart';
import SurveyPieChart from '../components/charts/SurveyPieChart';
import AreaStatsChart from '../components/charts/AreaStatsChart';
import AreaMonthlyStatsTable from '../components/tables/AreaMonthlyStatsTable';
import UnitMonthlyStatsTable from '../components/tables/UnitMonthlyStatsTable';
import jihLogo from '../assets/LogoColor.png';
import ActiveReportsCard from '../components/dashboard/ActiveReportsCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const AreaDashboardPage = ({ onLogout }) => {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Area and user data
  const [userData, setUserData] = useState(null);
  const [area, setArea] = useState(null);
  const [units, setUnits] = useState([]);
  
  // Surveys and data
  const [monthlySurveys, setMonthlySurveys] = useState([]);
  const [allUnitSurveys, setAllUnitSurveys] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [enhancedStats, setEnhancedStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'monthly', 'units', 'stats'
  const [activeStatsSubTab, setActiveStatsSubTab] = useState('summary'); // 'summary' | 'areaTable' | 'unitTable'
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFormEdit, setShowFormEdit] = useState(false);
  const [showCreateSurvey, setShowCreateSurvey] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedUnitSurveys, setSelectedUnitSurveys] = useState([]);
  const [showUnitDetailView, setShowUnitDetailView] = useState(false);
  const [viewingUnitSurvey, setViewingUnitSurvey] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  // Removed unit filter per new requirement
  const [unitFilter, setUnitFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSurveys, setTotalSurveys] = useState(0);

  // Dashboard overview state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [activeReportsList, setActiveReportsList] = useState([]);
  const [activeReportsLoading, setActiveReportsLoading] = useState(false);

  useEffect(() => {
    // Honor navigation state (e.g., from District dashboard)
    const state = location.state || {};
    let consumed = false;
    if (state.initialTab) {
      setActiveTab(state.initialTab);
      consumed = true;
    }
    if (state.initialStatsSubTab) {
      setActiveStatsSubTab(state.initialStatsSubTab);
      consumed = true;
    }
    if (consumed) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    // Get user data from localStorage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
    
    loadAreaData();
    if (activeTab === 'dashboard') {
      loadDashboardOverview();
      loadActiveReportsList();
    } else if (activeTab === 'monthly') {
      loadMonthlySurveys();
    } else if (activeTab === 'units') {
      loadUnits();
      // Also load monthly surveys for unit filtering
      loadMonthlySurveys();
      // Load unit surveys to show correct per-unit counts. Delay a tick until units set.
      setTimeout(() => loadAllUnitSurveys(), 0);
    } else if (activeTab === 'stats') {
      loadUnits();
      loadMonthlySurveys();
    }
  }, [areaId, currentPage, monthFilter, activeTab]);

  // Load unit surveys and AI summary when units are loaded and stats tab is active
  useEffect(() => {
    if (activeTab === 'stats' && units.length > 0) {
      loadAllUnitSurveys();
      loadAISummary();
    }
    if (activeTab === 'units' && units.length > 0) {
      // Ensure allUnitSurveys is fresh when entering Units tab
      loadAllUnitSurveys();
    }
  }, [units, activeTab]);

  // Handle back navigation to login page
  const handleBackNavigation = () => {
    navigate('/');
  };


  const handleSidebarNavigate = (tabId) => {
    setActiveTab(tabId);
    setShowDetailView(false);
    setShowFormEdit(false);
    setShowUnitDetailView(false);
    setSelectedUnit(null);
    setSelectedUnitSurveys([]);
    setIsSidebarOpen(false);
  };

  const loadDashboardOverview = async () => {
    try {
      setDashboardLoading(true);
      setDashboardError('');
      const token = localStorage.getItem('userToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/dashboard/overview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboardData(response.data.data);
    } catch (err) {
      console.error('Area dashboard overview error:', err);
      setDashboardError('Failed to load dashboard data');
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadActiveReportsList = async () => {
    try {
      setActiveReportsLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        setActiveReportsList(response.data.data || []);
      }
    } catch (err) {
      console.error('Area active reports list error:', err);
    } finally {
      setActiveReportsLoading(false);
    }
  };

  const loadAreaData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const fallbackName = userData?.area || userData?.areaName || areaId;

      if (userData?.districtId) {
        const areasResp = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(userData.districtId)}`, 
          { headers, timeout: 5000 }
        );
        const areas = areasResp.data?.data || [];
        const found = areas.find(a => (a.id || a._id || a.code) == areaId);
        if (found) {
          setArea({
            id: found.id || found._id || found.code,
            name: found.title || found.name || fallbackName
          });
        } else {
          setArea({ id: areaId, name: fallbackName });
        }
      } else {
        setArea({ id: areaId, name: fallbackName });
      }
    } catch (error) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setArea({ id: areaId, name: userData?.area || userData?.areaName || areaId });
    }
  };

  const loadUnits = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(areaId)}`, 
        { headers, timeout: 5000 }
      );
      setUnits(response.data?.data || []);
    } catch (error) {
      setUnits([]);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to load units');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUnitSurveys = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };
      let allSurveys = [];

      for (const unit of units) {
        try {
          const unitId = unit.id || unit._id || unit.code;
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/unit/unit-surveys/unit/${encodeURIComponent(unitId)}?page=1&limit=100`,
            { headers, timeout: 5000 }
          );
          const unitSurveys = (response.data?.surveys || []).map(s => ({ ...s, __unitId: unitId }));
          allSurveys = [...allSurveys, ...unitSurveys];
        } catch (error) {
          // Silent fail for individual unit errors
        }
      }

      setAllUnitSurveys(allSurveys);
    } catch (error) {
      setAllUnitSurveys([]);
    }
  };

  const loadAISummary = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/area/statistics/ai-summary?areaId=${areaId}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      
      if (response.data.success) {
        setAiSummary(response.data.summary);
        setEnhancedStats(response.data.stats);
      }
    } catch (error) {
      setAiSummary('AI summary is currently unavailable. Please check your area statistics below for detailed information.');
    }
  };

  const loadMonthlySurveys = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        areaId: areaId
      });
      
      if (monthFilter) params.append('month', monthFilter);
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/area/surveys?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });
      
      if (response.data.success) {
        const surveys = response.data.data || [];
        setMonthlySurveys(surveys);
        setTotalPages(1);
        setTotalSurveys(surveys.length);
      } else {
        setMonthlySurveys([]);
        setTotalPages(1);
        setTotalSurveys(0);
      }
    } catch (error) {
      setMonthlySurveys([]);
      setTotalPages(1);
      setTotalSurveys(0);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load monthly reports');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsSidebarOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setShowLogoutModal(false);
    // Call onLogout callback if provided (to update App.jsx state)
    if (onLogout) {
      onLogout();
    }
    // Always navigate to LandingPage after logout
    navigate('/', { replace: true });
  };

  const handleSearch = () => {
    setCurrentPage(1);
    if (activeTab === 'monthly') {
      loadMonthlySurveys();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    // unit filter removed
    setMonthFilter('');
    setCurrentPage(1);
  };

  const handleViewSurvey = (survey) => {
    setSelectedFormId(survey._id);
    setEditingSurvey(survey);
    setShowDetailView(true);
  };

  const handleEditSurvey = (survey) => {
    setEditingSurvey(survey);
    setShowFormEdit(true);
  };

  const handleDeleteSurvey = (survey) => {
    setSurveyToDelete(survey);
    setShowDeleteModal(true);
  };

  const handleCreateSurvey = () => {
    navigate('/area-survey');
  };

  const handleUnitClick = async (unit) => {
    try {
      setSelectedUnit(unit);
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const unitIdentifier = unit.id || unit._id || unit.code;
      const params = new URLSearchParams({ page: 1, limit: 50 });
      const resp = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/unit/unit-surveys/unit/${encodeURIComponent(unitIdentifier)}?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setSelectedUnitSurveys(resp.data?.surveys || []);
    } catch (e) {
      setError('Failed to load unit reports for this unit');
      setSelectedUnitSurveys([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUnitSurvey = async (survey) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const resp = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/unit/unit-survey/${survey._id}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      setViewingUnitSurvey(resp.data?.survey || survey);
      setShowUnitDetailView(true);
    } catch (e) {
      setError('Failed to load unit report details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setSelectedUnitSurveys([]);
  };

  // Filter units based on search term
  const filteredUnits = units.filter(unit => {
    if (!unitSearchTerm) return true;
    const unitName = (unit.name || unit.title || 'Unnamed Unit').toLowerCase();
    const unitId = (unit.id || unit._id || unit.code || '').toLowerCase();
    const searchLower = unitSearchTerm.toLowerCase();
    return unitName.includes(searchLower) || unitId.includes(searchLower);
  });

  // Highlight search term in text
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  // Normalize strings for tolerant comparisons (IDs/names)
  const normalize = (value) => (value || '').toString().toLowerCase().replace(/\s+/g, '').trim();

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (surveyToDelete) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/area/surveys/${surveyToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });
        setSurveyToDelete(null);
        loadMonthlySurveys();
      }
      
      setShowDeleteModal(false);
    } catch (error) {
      setError('Failed to delete report');
    }
  };

  // Calculate statistics
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Area surveys this month
  const areaSurveysThisMonth = monthlySurveys.filter(s => {
    const surveyDate = new Date(s.submittedAt);
    return surveyDate.getMonth() === currentMonth && 
           surveyDate.getFullYear() === currentYear;
  }).length;

  // Unit surveys this month
  const unitSurveysThisMonth = allUnitSurveys.filter(s => {
    const surveyDate = new Date(s.submittedAt);
    return surveyDate.getMonth() === currentMonth && 
           surveyDate.getFullYear() === currentYear;
  }).length;

  // Total surveys this month (area + unit)
  const totalSurveysThisMonth = areaSurveysThisMonth + unitSurveysThisMonth;

  // Active units (units that have submitted surveys)
  const activeUnits = new Set(allUnitSurveys.map(s => s.unitId || s.component)).size;

  // Total workers from unit surveys
  const totalWorkers = allUnitSurveys.reduce((sum, survey) => {
    return sum + (survey.workers?.rukkun || 0) + 
           (survey.workers?.karkun || 0) + 
           (survey.workers?.activeAssociate || 0);
  }, 0);

  // Total new members from unit surveys
  const totalNewMembers = allUnitSurveys.reduce((sum, survey) => {
    return sum + (survey.partB?.newJIHMembers?.male || 0) + 
           (survey.partB?.newJIHMembers?.female || 0);
  }, 0);

  const areaStats = {
    totalUnits: units.length,
    totalAreaSurveys: totalSurveys,
    totalUnitSurveys: allUnitSurveys.length,
    totalSurveysThisMonth: totalSurveysThisMonth,
    areaSurveysThisMonth: areaSurveysThisMonth,
    unitSurveysThisMonth: unitSurveysThisMonth,
    activeUnits: activeUnits,
    totalWorkers: totalWorkers,
    totalNewMembers: totalNewMembers
  };

  const unitsBarData = units.map(u => {
    const unitId = u.id || u._id || u.code;
    const unitSurveys = allUnitSurveys.filter(s => 
      (s.unitId || s.component) === unitId
    ).length;
    return {
    name: u.name || u.title || u.code || 'Unit',
      surveys: unitSurveys
    };
  });

  const filteredSurveys = monthlySurveys.filter(survey => 
    survey.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showDetailView) {
    return (
      <AreaSurveyDetailPage
        surveyId={selectedFormId}
        onBack={() => {
          setShowDetailView(false);
          setSelectedFormId(null);
          setEditingSurvey(null);
        }}
        onEdit={(survey) => {
          setShowDetailView(false);
          setSelectedFormId(null);
          setEditingSurvey(survey);
          setShowFormEdit(true);
        }}
        onDelete={() => {
          setShowDetailView(false);
          setSelectedFormId(null);
          setEditingSurvey(null);
          loadMonthlySurveys();
        }}
      />
    );
  }

  if (showFormEdit) {
    return (
      <AreaSurveyEditPage
        surveyId={editingSurvey?._id}
          onBack={() => {
              setShowFormEdit(false);
              setEditingSurvey(null);
          }}
        onSubmit={(updatedSurvey) => {
              setShowFormEdit(false);
              setEditingSurvey(null);
              setSuccessMessage(`${updatedSurvey?.month || 'Area'} മാസത്തിലെ റിപ്പോർട്ട് വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു!`);
              
              // Clear success message after 3 seconds
              setTimeout(() => {
                setSuccessMessage('');
              }, 3000);
              
            loadMonthlySurveys();
          }}
        />
    );
  }

  const mainContent = (
    <>
      {/* Dashboard Overview Tab */}
      {activeTab === 'dashboard' && (() => {
        const COLORS = ['#002349', '#957C3D', '#10b981', '#f59e0b'];
        const d = dashboardData || {};
        const submissionData = [
          { name: 'Submitted', value: d.submitted || 0 },
          { name: 'Pending', value: d.pending || 0 },
          { name: 'Not Started', value: d.notStarted || 0 },
        ];
        const areaName = userData?.areaName || userData?.area || '';
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] rounded-2xl p-6 text-white">
              <h2 className="hidden lg:block text-xl font-bold">ഏരിയ ഡാഷ്ബോർഡ്</h2>
              {areaName && <p className="text-white/80 text-sm lg:mt-1">{areaName}</p>}
            </div>

            <SubmissionsAnalytics scope="area" />

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                <span className="ml-3 text-gray-600 font-medium">Loading...</span>
              </div>
            ) : dashboardError ? (
              <div className="text-center py-10">
                <p className="text-red-500">{dashboardError}</p>
                <button onClick={loadDashboardOverview} className="mt-3 inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-[#002349] text-white rounded-lg text-sm">Retry</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white rounded-2xl shadow border border-gray-100 p-2.5 sm:p-5 flex flex-col items-start gap-1.5 sm:gap-2 overflow-hidden">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Building className="w-5 h-5 text-[#957C3D]" />
                    </div>
                    <p className="text-2xl font-bold text-[#957C3D]">{d.units ?? '—'}</p>
                    <p className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">ആകെ യൂണിറ്റുകൾ</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow border border-gray-100 p-2.5 sm:p-5 flex flex-col items-start gap-1.5 sm:gap-2 overflow-hidden">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-50 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{d.activeReports ?? '—'}</p>
                    <p className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">ആക്ടീവ് റിപ്പോർട്ടുകൾ</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow border border-gray-100 p-2.5 sm:p-5 flex flex-col items-start gap-1.5 sm:gap-2 overflow-hidden">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{d.submitted ?? '—'}</p>
                    <p className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">സബ്മിറ്റ് ചെയ്തവ</p>
                  </div>
                </div>

                {d.activeReports > 0 && (
                  <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-[#002349] mb-4">സബ്മിഷൻ സ്റ്റാറ്റസ്</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={submissionData} cx="50%" cy="42%" outerRadius={62} dataKey="value">
                          {submissionData.map((_, i) => (
                            <Cell key={i} fill={['#10b981', '#f59e0b', '#e5e7eb'][i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px', lineHeight: '1.6' }}
                          formatter={(value, entry) => `${value}: ${entry.payload.value}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <ActiveReportsCard reports={activeReportsList} loading={activeReportsLoading} />
              </>
            )}
          </div>
        );
      })()}

      {/* Monthly Surveys Tab */}
        {activeTab === 'monthly' && (
          <>
            {/* Page Heading */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="hidden lg:block">
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">
                  ഏരിയ റിപ്പോർട്ട്
                </h1>
              </div>
              <button
                onClick={handleCreateSurvey}
                className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl transition-all duration-500 flex items-center space-x-2 text-sm font-semibold hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
              >
                <FileText className="w-4 h-4" />
                <span>New Area Report</span>
              </button>
            </div>

            {/* Inline Search & Filters (no container card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-1">Search</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search area reports..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 text-base"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 group-hover:text-[#002349] transition-colors duration-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-1">Month</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 text-base"
                >
                  <option value="">All Months</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surveys Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#002349]"></div>
                  <span className="ml-2 text-gray-600 text-sm font-medium">Loading reports...</span>
                </div>
              ) : filteredSurveys.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-[#002349] mb-1">No area reports found</h3>
                  <p className="text-gray-600 mb-4 text-xs">
                    No reports found for this area. Create the first area report to get started.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#002349] border-b border-[#002349]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            District
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Area
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Month
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Submitted At
                          </th>
                          <th className="px-4 py-2 text-right text-[11px] font-semibold text-white uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredSurveys.map((survey, index) => (
                          <tr
                            key={survey._id}
                            className={`transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                            } hover:bg-blue-50/60`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-900 align-middle">
                              <span className="font-medium">{survey.district || 'Unknown District'}</span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-900 align-middle">
                              <span className="font-semibold text-[#002349]">{survey.area || 'Unknown Area'}</span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#957C3D] text-white shadow-sm">
                                {survey.month}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                              {new Date(survey.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-1 whitespace-nowrap text-[13px] font-medium text-right align-middle">
                              <div className="inline-flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSurvey(survey);
                                  }}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-[#002349] hover:text-[#1a3a5c] hover:bg-gray-100 rounded-lg transition-all duration-200"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSurvey(survey);
                                  }}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-[#957C3D] hover:text-[#8A6F35] hover:bg-amber-50 rounded-lg transition-all duration-200"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSurvey(survey);
                                  }}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-4 py-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-700 font-medium">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#002349] hover:text-[#002349] hover:bg-gray-50 transition-all duration-200"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#002349] hover:text-[#002349] hover:bg-gray-50 transition-all duration-200"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="space-y-6">
            {showUnitDetailView && viewingUnitSurvey && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setShowUnitDetailView(false);
                        setViewingUnitSurvey(null);
                      }}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm">Back to Unit</span>
                    </button>
                    <div className="h-6 w-px bg-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Unit Report Details</h3>
                      <p className="text-sm text-gray-600">{viewingUnitSurvey?.component} • {viewingUnitSurvey?.month} {viewingUnitSurvey?.year}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">District:</span>
                          <span className="font-medium text-gray-900">{viewingUnitSurvey?.district}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Area:</span>
                          <span className="font-medium text-gray-900">{viewingUnitSurvey?.area}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit/Component:</span>
                          <span className="font-medium text-gray-900">{viewingUnitSurvey?.component || viewingUnitSurvey?.unitId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Month:</span>
                          <span className="font-medium text-gray-900">{viewingUnitSurvey?.month}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Year:</span>
                          <span className="font-medium text-gray-900">{viewingUnitSurvey?.year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Submitted At:</span>
                          <span className="font-medium text-gray-900">{new Date(viewingUnitSurvey?.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workers Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">1</span>
                      പ്രവർത്തക വിവരങ്ങൾ
                    </h4>
                    <div className="divide-y divide-gray-200 bg-white rounded-lg">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-gray-700">റുക്ന്‍</span>
                        <span className="text-xl font-semibold text-blue-600">{viewingUnitSurvey?.workers?.rukkun || 0}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-gray-700">കാര്‍കുന്‍</span>
                        <span className="text-xl font-semibold text-green-600">{viewingUnitSurvey?.workers?.karkun || 0}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-gray-700">ആക്ടീവ് അസോസിയേറ്റ്‌സ്</span>
                        <span className="text-xl font-semibold text-purple-600">{viewingUnitSurvey?.workers?.activeAssociate || 0}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-b-lg">
                        <span className="text-sm text-blue-800">ആകെ തൊഴിലാളികൾ</span>
                        <span className="text-sm font-semibold text-blue-800">{(viewingUnitSurvey?.workers?.rukkun || 0) + (viewingUnitSurvey?.workers?.karkun || 0) + (viewingUnitSurvey?.workers?.activeAssociate || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Part A - Spoken Persons and Categories with Gender Counts */}
                  {viewingUnitSurvey?.partA && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">2</span>
                        സംസാരിച്ചവർ
                      </h4>
                      <div className="divide-y divide-gray-200 bg-white rounded-lg mb-3">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">ആൺ സംസാരിച്ചവർ</span>
                          <span className="text-xl font-semibold text-blue-600">{viewingUnitSurvey.partA.spokenPersons?.male || 0}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">പെൺ  സംസാരിച്ചവർ</span>
                          <span className="text-xl font-semibold text-pink-600">{viewingUnitSurvey.partA.spokenPersons?.female || 0}</span>
                        </div>
                      </div>
                      {viewingUnitSurvey.partA.codes && (
                        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg">
                          <span className="text-sm text-gray-700">കോഡുകൾ</span>
                          <span className="text-sm font-semibold text-gray-900">{viewingUnitSurvey.partA.codes}</span>
                        </div>
                      )}
                      {/* Authority Persons Gender + Counts */}
                      {viewingUnitSurvey.partA.authorityPersonsGender && (
                        <div className="mt-4">
                          <h5 className="text-md font-semibold text-gray-900 mb-2">ഏത് കാറ്റഗറിയിൽ പെട്ടവരോട് ആണ് പെട്ടവരോട് സംസാരിച്ചവർ</h5>
                          <div className="divide-y divide-gray-100 rounded-lg bg-white">
                            {[
                              { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
                              { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
                              { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
                              { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
                              { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
                              { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
                              { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
                              { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
                              { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
                              { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
                              { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
                              { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
                              { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
                              { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
                              { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
                              { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
                              { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആൻ പഠിതാവ്' },
                              { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
                              { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
                              { key: 'arabicCollegeGuardian', label: 'അറബിക് കോളേജ് രക്ഷിതാവ്' },
                              { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
                              { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
                              { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
                              { key: 'publicCampusStudent', label: 'പൊതു ക്യാമ്പസിലെ വിദ്യാർത്ഥി' },
                              { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
                              { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
                              { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
                            ].map((option) => {
                              const gender = viewingUnitSurvey.partA.authorityPersonsGender?.[option.key] || { male: false, female: false };
                              const counts = viewingUnitSurvey.partA.authorityPersonsCounts?.[option.key] || { male: 0, female: 0 };
                              const show = gender.male || gender.female || (counts.male || 0) > 0 || (counts.female || 0) > 0;
                              if (!show) return null;
                              return (
                                <div key={option.key} className="flex items-center justify-between px-3 py-2">
                                  <span className="text-sm text-gray-800">{option.label}</span>
                                  <div className="flex items-center space-x-2">
                                    {(gender.male || (counts.male || 0) > 0) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">ആൺ{(counts.male || 0) > 0 ? ` • ${counts.male}` : ''}</span>
                                    )}
                                    {(gender.female || (counts.female || 0) > 0) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">പെൺ {(counts.female || 0) > 0 ? ` • ${counts.female}` : ''}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Other text */}
                      {viewingUnitSurvey.partA.authorityOtherText && (
                        <div className="mt-4 p-3 bg-white rounded-lg border">
                          <div className="text-sm text-gray-600 mb-1">മറ്റുള്ളവ (വ്യക്തമാക്കുക)</div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">{viewingUnitSurvey.partA.authorityOtherText}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Part B - New Members and Categories with Gender Counts */}
                  {viewingUnitSurvey?.partB && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">3</span>
                        പുതിയ JIH അംഗങ്ങൾ
                      </h4>
                      <div className="divide-y divide-gray-200 bg-white rounded-lg">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">ആൺ പുതിയ അംഗങ്ങൾ</span>
                          <span className="text-xl font-semibold text-blue-600">{viewingUnitSurvey.partB.newJIHMembers?.male || 0}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">പെൺ  പുതിയ അംഗങ്ങൾ</span>
                          <span className="text-xl font-semibold text-pink-600">{viewingUnitSurvey.partB.newJIHMembers?.female || 0}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-b-lg">
                          <span className="text-sm text-green-800">ആകെ പുതിയ അംഗങ്ങൾ</span>
                          <span className="text-sm font-semibold text-green-800">{(viewingUnitSurvey.partB.newJIHMembers?.male || 0) + (viewingUnitSurvey.partB.newJIHMembers?.female || 0)}</span>
                        </div>
                      </div>
                      {/* Member Categories Gender + Counts */}
                      {viewingUnitSurvey.partB.memberCategoriesGender && (
                        <div className="mt-4">
                          <h5 className="text-md font-semibold text-gray-900 mb-2">അംഗ വിഭാഗങ്ങൾ (ഏത് വിഭാഗത്തിൽ പെട്ടവരാണ് വന്നത്)</h5>
                          <div className="divide-y divide-gray-100 rounded-lg bg-white">
                            {[
                              { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
                              { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
                              { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
                              { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
                              { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
                              { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
                              { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
                              { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
                              { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
                              { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
                              { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
                              { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
                              { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
                              { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
                              { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
                              { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
                              { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുര്‍ആൻ പഠിതാവ്' },
                              { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
                              { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
                              { key: 'arabicCollegeGuardian', label: 'അറബിക് കോളേജ് രക്ഷിതാവ്' },
                              { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
                              { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
                              { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
                              { key: 'publicCampusStudent', label: 'പൊതു ക്യാമ്പസിലെ വിദ്യാർത്ഥി' },
                              { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
                              { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
                              { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
                            ].map((option) => {
                              const gender = viewingUnitSurvey.partB.memberCategoriesGender?.[option.key] || { male: false, female: false };
                              const counts = viewingUnitSurvey.partB.memberCategoriesCounts?.[option.key] || { male: 0, female: 0 };
                              const show = gender.male || gender.female || (counts.male || 0) > 0 || (counts.female || 0) > 0;
                              if (!show) return null;
                              return (
                                <div key={option.key} className="flex items-center justify-between px-3 py-2">
                                  <span className="text-sm text-gray-800">{option.label}</span>
                                  <div className="flex items-center space-x-2">
                                    {(gender.male || (counts.male || 0) > 0) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">ആൺ{(counts.male || 0) > 0 ? ` • ${counts.male}` : ''}</span>
                                    )}
                                    {(gender.female || (counts.female || 0) > 0) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">പെൺ {(counts.female || 0) > 0 ? ` • ${counts.female}` : ''}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Part C - Public Meeting Attendees */}
                  {viewingUnitSurvey?.partC?.publicMeetingAttendees && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">4</span>
                        പൊതുയോഗത്തിൽ വന്നവർ
                      </h4>
                      <div className="divide-y divide-gray-200 bg-white rounded-lg">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">ആൺ</span>
                          <span className="text-xl font-semibold text-blue-600">{viewingUnitSurvey.partC.publicMeetingAttendees.male || 0}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">പെൺ </span>
                          <span className="text-xl font-semibold text-pink-600">{viewingUnitSurvey.partC.publicMeetingAttendees.female || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Part D - Growth Acceleration */}
                  {viewingUnitSurvey?.partD?.growthAcceleration && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">5</span>
                        റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്
                      </h4>
                      <div className="divide-y divide-gray-200 bg-white rounded-lg">
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">റുക്ന്‍</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-blue-600">പുരുഷൻ: {typeof viewingUnitSurvey.partD.growthAcceleration.rukkun === 'object' ? (viewingUnitSurvey.partD.growthAcceleration.rukkun?.male || 0) : (viewingUnitSurvey.partD.growthAcceleration.rukkun || 0)}</span>
                              <span className="text-sm text-pink-600">സ്ത്രീ: {typeof viewingUnitSurvey.partD.growthAcceleration.rukkun === 'object' ? (viewingUnitSurvey.partD.growthAcceleration.rukkun?.female || 0) : 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">കാര്‍കുന്‍</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-blue-600">പുരുഷൻ: {typeof viewingUnitSurvey.partD.growthAcceleration.karkun === 'object' ? (viewingUnitSurvey.partD.growthAcceleration.karkun?.male || 0) : (viewingUnitSurvey.partD.growthAcceleration.karkun || 0)}</span>
                              <span className="text-sm text-pink-600">സ്ത്രീ: {typeof viewingUnitSurvey.partD.growthAcceleration.karkun === 'object' ? (viewingUnitSurvey.partD.growthAcceleration.karkun?.female || 0) : 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">Solidarity</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-gray-800">മൊത്തം: {typeof viewingUnitSurvey.partD.growthAcceleration.solidarity === 'object' ? ((viewingUnitSurvey.partD.growthAcceleration.solidarity?.male || 0) + (viewingUnitSurvey.partD.growthAcceleration.solidarity?.female || 0)) : (viewingUnitSurvey.partD.growthAcceleration.solidarity || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">SIO</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-gray-800">മൊത്തം: {typeof viewingUnitSurvey.partD.growthAcceleration.sio === 'object' ? ((viewingUnitSurvey.partD.growthAcceleration.sio?.male || 0) + (viewingUnitSurvey.partD.growthAcceleration.sio?.female || 0)) : (viewingUnitSurvey.partD.growthAcceleration.sio || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">GIO</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-gray-800">മൊത്തം: {typeof viewingUnitSurvey.partD.growthAcceleration.gio === 'object' ? ((viewingUnitSurvey.partD.growthAcceleration.gio?.male || 0) + (viewingUnitSurvey.partD.growthAcceleration.gio?.female || 0)) : (viewingUnitSurvey.partD.growthAcceleration.gio || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  

                  {viewingUnitSurvey?.partE && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Part E - Additional Information</h4>
                      <div className="p-3 bg-white rounded-lg border">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(viewingUnitSurvey.partE, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Submission Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Submission Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">Submitted By</div>
                        <div className="font-medium text-gray-900">{viewingUnitSurvey?.submittedByName || viewingUnitSurvey?.submittedBy || 'Unknown'}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">Submission Level</div>
                        <div className="font-medium text-gray-900">{viewingUnitSurvey?.submissionLevel || 'Unit'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Selected Unit Details - Show above units list */}
            {selectedUnit && !showUnitDetailView && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleBackToUnits}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Clear Selection</span>
                      </button>
                      <div className="h-6 w-px bg-gray-300"></div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedUnit.name || selectedUnit.title || 'Unnamed Unit'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Unit ID: {selectedUnit.id || selectedUnit._id || selectedUnit.code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Reports</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedUnitSurveys.length}</p>
                    </div>
                  </div>
                </div>

                {/* Unit Surveys Table */}
                <div className="px-6 py-4">
                  {selectedUnitSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-sm font-medium text-gray-900 mb-1">No Reports found</h4>
                      <p className="text-xs text-gray-600">This unit hasn't submitted any monthly reports yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Month
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submitted At
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedUnitSurveys.map((survey) => (
                            <tr key={survey._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {survey.month}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {survey.year}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {new Date(survey.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleViewUnitSurvey(survey)}
                                    className="text-blue-600 hover:text-blue-900 text-xs"
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Units List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#002349]">യൂണിറ്റുകൾ</h2>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      Total: {units.length} units in this area
                      {unitSearchTerm && (
                        <span className="ml-2 text-[#957C3D] font-semibold">
                          (Showing {filteredUnits.length} filtered)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={unitSearchTerm}
                        onChange={(e) => setUnitSearchTerm(e.target.value)}
                        placeholder="Search units..."
                        className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent text-base transition-all duration-300 hover:border-[#002349]/50"
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    {unitSearchTerm && (
                      <button
                        onClick={() => setUnitSearchTerm('')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-[#002349] border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                <span className="ml-2 text-gray-600 font-medium">Loading units...</span>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-[#002349] mb-2">
                  {unitSearchTerm ? 'No units found matching your search' : 'No units found'}
                </h3>
                <p className="text-gray-600 font-medium">
                  {unitSearchTerm
                    ? `No units match "${unitSearchTerm}". Try a different search term.`
                    : 'No units found for this area.'
                  }
                </p>
                {unitSearchTerm && (
                  <button
                    onClick={() => setUnitSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] text-white rounded-2xl transition-all duration-300 font-semibold hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-[#002349]/50"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredUnits.map((unit) => {
                  const unitId = unit.id || unit._id || unit.code;
                  const unitNameNorm = normalize(unit.name || unit.title || unit.code);
                  // Use allUnitSurveys which includes actual unit-level submissions
                  const unitSurveys = allUnitSurveys.filter(s => {
                    const sid = s.__unitId || s.unitId || s.component;
                    const snameNorm = normalize(s.component);
                    return sid === unitId || snameNorm === unitNameNorm;
                  });
                  const hasSurveyThisMonth = unitSurveys.some(s => {
                    const d = new Date(s.submittedAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                  });
                  const lastSurvey = unitSurveys.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

                  return (
                    <div
                      key={unit.id || unit._id || unit.code}
                      className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm hover:shadow-lg hover:border-[#002349]/40 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#002349]/10 flex items-center justify-center">
                            <Building className="w-5 h-5 text-[#002349]" />
                          </div>
                          <div className="min-w-0">
                            <h3
                              className="text-sm font-bold text-[#002349] truncate"
                              dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(unit.name || unit.title || 'Unnamed Unit', unitSearchTerm)
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-0.5">
                              {lastSurvey ? `Last activity: ${new Date(lastSurvey.submittedAt).toLocaleDateString()}` : 'No activity yet'}
                            </p>
                          </div>
                        </div>
                        {!hasSurveyThisMonth && (
                          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            Pending
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate('/area/dynamic-submissions/monthly', { state: { unitFilter: unit.name || unit.title } })}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#002349] text-white text-sm font-semibold hover:bg-[#1a3a5c] transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        സബ്മിഷനുകൾ
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Sub-tabs: Statistics | Area Table | Unit Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3">
              <div className="ih-mobile-tabs">
                <button
                  onClick={() => setActiveStatsSubTab('summary')}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeStatsSubTab === 'summary'
                      ? 'bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-100 hover:shadow-sm'
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setActiveStatsSubTab('areaTable')}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeStatsSubTab === 'areaTable'
                      ? 'bg-gradient-to-r from-[#957C3D] to-[#8A6F35] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-100 hover:shadow-sm'
                  }`}
                >
                  Area Table
                </button>
                <button
                  onClick={() => setActiveStatsSubTab('unitTable')}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeStatsSubTab === 'unitTable'
                      ? 'bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-100 hover:shadow-sm'
                  }`}
                >
                  Unit Table
                </button>
              </div>
            </div>

            {activeStatsSubTab === 'summary' && aiSummary && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#002349] to-[#1a3a5c] rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#002349] mb-2">AI-Powered Area Summary</h3>
                    <p className="text-gray-700 leading-relaxed font-medium">{aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {activeStatsSubTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatisticsCard 
                title="Total Units" 
                value={areaStats.totalUnits} 
                subtitle="Units in this area" 
              />
              <StatisticsCard 
                title="Total Reports" 
                value={areaStats.totalAreaSurveys + areaStats.totalUnitSurveys} 
                subtitle={`${areaStats.totalAreaSurveys} area + ${areaStats.totalUnitSurveys} unit reports`}
              />
              <StatisticsCard 
                title="This Month" 
                value={areaStats.totalSurveysThisMonth} 
                subtitle={`${areaStats.areaSurveysThisMonth} area + ${areaStats.unitSurveysThisMonth} unit reports`}
              />
              <StatisticsCard 
                title="Active Units" 
                value={areaStats.activeUnits} 
                subtitle={`${areaStats.activeUnits}/${areaStats.totalUnits} units with submissions`}
              />
            </div>
            )}

            {activeStatsSubTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatisticsCard 
                title="Total Workers" 
                value={areaStats.totalWorkers.toLocaleString()} 
                subtitle="From unit reports" 
              />
              <StatisticsCard 
                title="New Members" 
                value={areaStats.totalNewMembers.toLocaleString()} 
                subtitle="This year from unit reports" 
              />
              <StatisticsCard 
                title="Completion Rate" 
                value={`${areaStats.totalUnits > 0 ? Math.round((areaStats.activeUnits / areaStats.totalUnits) * 100) : 0}%`}
                subtitle="Units with submissions" 
              />
            </div>
            )}

            {activeStatsSubTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AreaStatsChart
                  data={unitsBarData}
                title="Unit Report Activity"
                  dataKey1="surveys"
                label1="Report Submitted"
                color1="#3B82F6"
              />
              
              <AreaStatsChart
                data={[
                  { name: 'Area reports', value: areaStats.totalAreaSurveys },
                  { name: 'Unit reports', value: areaStats.totalUnitSurveys }
                ]}
                title="Report Distribution"
                type="pie"
                dataKey1="value"
              />
            </div>
            )}

            {activeStatsSubTab === 'summary' && (
            <div className="grid grid-cols-1 gap-6">
              <AreaStatsChart
                data={[
                  { name: 'Area Reports This Month', value: areaStats.areaSurveysThisMonth },
                  { name: 'Unit Reports This Month', value: areaStats.unitSurveysThisMonth }
                ]}
                title="Current Month Activity"
                dataKey1="value"
                  label1="Reports"
                color1="#10B981"
                />
              </div>
            )}
            
            {activeStatsSubTab === 'summary' && (
              <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Area Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Area Name:</span>
                    <span className="text-sm font-medium text-gray-900">{area?.name || areaId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Units:</span>
                    <span className="text-sm font-medium text-gray-900">{areaStats.totalUnits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Reports:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {areaStats.totalAreaSurveys + areaStats.totalUnitSurveys} 
                      <span className="text-gray-500 text-xs ml-1">
                        ({areaStats.totalAreaSurveys} area + {areaStats.totalUnitSurveys} unit)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {areaStats.totalSurveysThisMonth} reports
                      <span className="text-gray-500 text-xs ml-1">
                        ({areaStats.areaSurveysThisMonth} area + {areaStats.unitSurveysThisMonth} unit)
                      </span>
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Units:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {areaStats.activeUnits} / {areaStats.totalUnits} 
                      ({areaStats.totalUnits > 0 ? Math.round((areaStats.activeUnits / areaStats.totalUnits) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Workers:</span>
                    <span className="text-sm font-medium text-gray-900">{areaStats.totalWorkers.toLocaleString()}</span>
                </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New Members:</span>
                    <span className="text-sm font-medium text-gray-900">{areaStats.totalNewMembers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeStatsSubTab === 'areaTable' && (
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-[#002349] mb-4">Area Table</h3>
                <AreaMonthlyStatsTable 
                  surveys={monthlySurveys} 
                  onRowClick={(survey) => {
                    setSelectedFormId(survey._id);
                    setEditingSurvey(survey);
                    setShowDetailView(true);
                  }}
                />
              </div>
            )}

            {activeStatsSubTab === 'unitTable' && (
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-[#002349] mb-4">Units</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {units.map((u) => {
                        const unitId = u.id || u._id || u.code;
                        return (
                          <tr key={unitId} className="hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#957C3D]/5 transition-all duration-300 hover:shadow-sm">
                            <td className="whitespace-nowrap text-sm font-bold text-[#002349] p-0">
                              <button
                                className="block w-full text-left px-6 py-4 hover:underline transition-all duration-300"
                                onClick={() => setExpandedUnitId(expandedUnitId === unitId ? null : unitId)}
                              >
                                {u.name || u.title || unitId}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">View unit monthly data</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Expanded unit tables */}
                <div className="mt-4 space-y-6">
                  {units.map((u) => {
                    const unitId = u.id || u._id || u.code;
                    if (expandedUnitId !== unitId) return null;
                    const unitSurveys = allUnitSurveys.filter(s => (s.__unitId || s.unitId || s.component) === unitId);
                    return (
                      <div key={`unit-${unitId}`} className="border border-gray-200 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-bold text-[#002349]">{u.name || u.title || unitId} - Monthly Table</h4>
                          <button className="p-2 text-sm text-gray-600 hover:text-[#002349] font-medium transition-all duration-300" onClick={() => setExpandedUnitId(null)}>Close</button>
                        </div>
                        <UnitMonthlyStatsTable 
                          surveys={unitSurveys}
                          onRowClick={(survey) => {
                            // Open full unit survey details
                            handleViewUnitSurvey(survey);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-red-600 text-sm font-semibold">{error}</p>
          </div>
        )}
    </>
  );

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <AreaAdminSidebar
          activeTab={activeTab}
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={() => navigate('/notifications')}
          onDynamicReports={() => navigate('/user-reports')}
          onReportTypeSelect={(type) => navigate('/user-reports', { state: { initialType: type } })}
          areaName={area?.name || '—'}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileTopBar
            title="ഏരിയ ഡാഷ്ബോർഡ്"
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-24 lg:pb-4">
            {mainContent}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSurveyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Area Report"
        message={`Are you sure you want to delete the area report for ${surveyToDelete?.month}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        type="logout"
      />

            </>
  );
};

export default AreaDashboardPage;