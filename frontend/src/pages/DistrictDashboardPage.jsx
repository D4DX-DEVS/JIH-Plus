import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Users, Building, BookOpen, TrendingUp, BarChart3, MapPin, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import axios from 'axios';
import { validateUserToken } from '../utils/auth';
import { Navigate } from 'react-router-dom';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import SubmissionsAnalytics from '../components/dashboard/SubmissionsAnalytics';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import HomePage from './HomePage';
import FormSubmissionPage from './FormSubmissionPage';
import FormPage from './FormPage';
import MonthlySurveyDashboard from './MonthlySurveyDashboard';
import MonthlySurveyPage from './MonthlySurveyPage';
import { FormProvider } from '../contexts/FormContext';
import SurveyBarChart from '../components/charts/SurveyBarChart';
import StatisticsCard from '../components/charts/StatisticsCard';
import DistrictMonthlyStatsTable from '../components/tables/DistrictMonthlyStatsTable';
import AreaMonthlyStatsTable from '../components/tables/AreaMonthlyStatsTable';
import ActiveReportsCard from '../components/dashboard/ActiveReportsCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const DistrictDashboardPage = ({ onLogout }) => {
  const { districtId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [editingForm, setEditingForm] = useState(null);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState(null);
  const [areaCount, setAreaCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [summary, setSummary] = useState('');
  const [activeStatsSubTab, setActiveStatsSubTab] = useState('summary'); // 'summary' | 'districtTable' | 'areaTable' | 'unitTable'
  const [districtMonthlySurveys, setDistrictMonthlySurveys] = useState([]);
  const [areas, setAreas] = useState([]);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [expandedAreaSurveys, setExpandedAreaSurveys] = useState([]);
  const [expandedAreaUnits, setExpandedAreaUnits] = useState([]);
  const [expandedAreaAllUnitSurveys, setExpandedAreaAllUnitSurveys] = useState([]);
  const [viewingUnitSurvey, setViewingUnitSurvey] = useState(null);
  const [showUnitDetailView, setShowUnitDetailView] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [loadingExpandedArea, setLoadingExpandedArea] = useState(false);

  // Dashboard overview state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [activeReportsList, setActiveReportsList] = useState([]);
  const [activeReportsLoading, setActiveReportsLoading] = useState(false);

  // Respect navigation requests coming from other pages
  useEffect(() => {
    const nextView = location.state?.activeView;
    if (!nextView) return;

    if (nextView === 'notifications') {
      handleNavigateToNotifications();
    } else {
      setCurrentView(nextView);
      setEditingForm(null);
      setEditingSurvey(null);
    }

    // Clear the state so future navigations are fresh
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.activeView, navigate]);

  useEffect(() => {
    initializeUser();
  }, []);

  // Load stats when stats view is active
  useEffect(() => {
    if (currentView === 'stats') {
      loadDistrictStats();
      loadHierarchyCounts();
      loadDistrictMonthlySurveys();
      loadAreas();
    }
    if (currentView === 'dashboard') {
      loadDashboardOverview();
      loadActiveReportsList();
    }
    if (currentView === 'locations') {
      loadAreas();
    }
  }, [currentView]);

  const initializeUser = async () => {
    try {
      // First validate the token
      const tokenValid = await validateUserToken();
      if (!tokenValid) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Get user data from localStorage
      const storedUserData = localStorage.getItem('userData');
      let userData = storedUserData ? JSON.parse(storedUserData) : {};
      
      // Extract additional data from JWT token if missing
      const token = localStorage.getItem('userToken');
      if (token) {
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          
          // Merge token data with stored userData
          userData = {
            ...userData,
            ...tokenPayload,
            // Ensure we have the required fields
            role: tokenPayload.role || userData.role,
            district: tokenPayload.district || userData.district,
            districtId: tokenPayload.districtId || userData.districtId,
            areaId: tokenPayload.areaId || userData.areaId,
            unitId: tokenPayload.unitId || userData.unitId
          };
          
          // Update localStorage with complete userData
          localStorage.setItem('userData', JSON.stringify(userData));
        } catch (error) {
          console.error('Error parsing token:', error);
        }
      }
      
      setUserData(userData);
      // Only set to 'dashboard' if there's no activeView in location state
      // This prevents overriding navigation state from other pages
      if (!location.state?.activeView) {
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      
      // Handle authentication errors (401, 403)
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        setIsAuthenticated(false);
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to initialize user. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handleNavigateToYearly = () => setCurrentView('yearly-dashboard');
  const handleNavigateToMonthly = () => setCurrentView('monthly-dashboard');
  const handleNavigateToStats = () => setCurrentView('stats');
  const handleNavigateToReports = () => navigate('/user-reports');
  const handleNavigateToNotifications = () => {
    // Navigate to notifications page route
    navigate('/notifications');
  };
  const handleBackToHome = () => {
    setCurrentView('home');
    setEditingForm(null);
    setEditingSurvey(null);
  };

  // Yearly survey handlers
  const handleCreateYearlyForm = () => {
    setEditingForm(null);
    setCurrentView('yearly-form');
  };
  
  const handleEditYearlyForm = (form) => {
    setEditingForm(form);
    setCurrentView('yearly-form');
  };

  const handleYearlyFormSubmit = () => {
    setCurrentView('yearly-dashboard');
    setEditingForm(null);
  };

  // Monthly survey handlers
  const handleCreateMonthlySurvey = () => {
    setEditingSurvey(null);
    // For district users, navigate to the district survey form
    window.location.href = '/district-survey';
  };
  
  const handleEditMonthlySurvey = (survey) => {
    setEditingSurvey(survey);
    setCurrentView('monthly-form');
  };

  const handleMonthlySurveySubmit = () => {
    setCurrentView('monthly-dashboard');
    setEditingSurvey(null);
  };

  const normalizeSidebarView = (view) => {
    const map = {
      'yearly-form': 'yearly-dashboard',
      'monthly-form': 'monthly-dashboard'
    };
    return map[view] || view;
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const cancelLogout = () => setShowLogoutModal(false);

  // Stats helper functions
  const isValidObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

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
      console.error('Dashboard overview error:', err);
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
      console.error('District active reports list error:', err);
    } finally {
      setActiveReportsLoading(false);
    }
  };

  const loadDistrictStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStats(response.data.stats);
      setSummary(response.data.summary || '');
    } catch (error) {
      console.error('Error loading district stats:', error);
      setStatsError('Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadHierarchyCounts = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('userData') || '{}');
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const distId = user?.districtId || user?.district?._id || stats?.yearly?.districtId;
      if (!distId || !isValidObjectId(distId)) {
        console.warn('District ID missing or invalid. Skipping area count fetch. Got:', distId);
        return;
      }
      const areasResp = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas/${encodeURIComponent(distId)}`, { headers });
      const areas = areasResp.data?.data || [];
      setAreaCount(areas.length);
      let unitsTotal = 0;
      for (const a of areas) {
        try {
          const unitsResp = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(a.id || a._id || a.code)}`, { headers });
          unitsTotal += (unitsResp.data?.data || []).length;
        } catch {}
      }
      setUnitCount(unitsTotal);
    } catch (e) {
      console.error('Hierarchy count error', e);
    }
  };

  const loadAreas = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('userData') || '{}');
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const distId = user?.districtId || user?.district?._id || stats?.yearly?.districtId;
      if (!distId || !isValidObjectId(distId)) {
        console.warn('District ID missing or invalid. Skipping areas fetch. Got:', distId);
        setAreas([]);
        return;
      }
      const areasResp = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas-db/${encodeURIComponent(distId)}`, { headers });
      setAreas(areasResp.data?.data || []);
    } catch (e) {
      console.error('Error loading areas', e);
    }
  };

  const loadDistrictMonthlySurveys = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ page: 1, limit: 100, level: 'district' });
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/monthly-surveys/all?${params}`, { headers });
      const surveys = response.data?.surveys || response.data?.data || [];
      setDistrictMonthlySurveys(surveys.filter(s => s.submissionLevel === 'district'));
    } catch (e) {
      console.error('Error loading district monthly surveys', e);
    }
  };

  const loadExpandedAreaData = async (areaId) => {
    try {
      setLoadingExpandedArea(true);
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const areaObj = areas.find(x => (x.id||x._id||x.code) === areaId) || {};
      const user = JSON.parse(localStorage.getItem('userData') || '{}');
      const districtUpper = (user?.districtName || user?.district || stats?.yearly?.district || '').toString().toUpperCase();
      const districtIdVal = user?.districtId || user?.district?._id || '';
      // Units first (local DB, reliable) so any failure in the legacy
      // area-survey lookups below can never block the units list.
      let units = [];
      try {
        const unitsResp = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(areaId)}`, { headers });
        units = unitsResp.data?.data || [];
      } catch (err) {
        console.error('Error loading area units', err);
      }
      setExpandedAreaUnits(units);

      // Legacy area monthly surveys (best-effort; only feeds the stats tab).
      let areaSurveys = [];
      try {
        const candidates = [areaId, areaObj.code, areaObj.title, areaObj.name].filter(Boolean);
        let lastAreaUpperTried = '';
        for (const candidate of candidates) {
          const params = new URLSearchParams({ page: 1, limit: 100 });
          params.append('areaId', candidate);
          const areaUpper = (areaObj.title || areaObj.name || areaObj.code || candidate).toString().toUpperCase();
          lastAreaUpperTried = areaUpper;
          params.append('area', areaUpper);
          if (districtUpper) params.append('district', districtUpper);
          if (districtIdVal) params.append('districtId', districtIdVal);
          const areaUrl = `${import.meta.env.VITE_API_URL}/api/area/surveys?${params.toString()}`;
          const areaResp = await axios.get(areaUrl, { headers });
          areaSurveys = areaResp.data?.data || areaResp.data?.surveys || [];
          if (Array.isArray(areaSurveys) && areaSurveys.length > 0) break;
        }
        if (!Array.isArray(areaSurveys) || areaSurveys.length === 0) {
          const msParams = new URLSearchParams({ page: 1, limit: 200, level: 'area' });
          if (districtUpper) msParams.append('district', districtUpper);
          const msUrl = `${import.meta.env.VITE_API_URL}/api/user/monthly-surveys/all?${msParams.toString()}`;
          const msResp = await axios.get(msUrl, { headers });
          const all = msResp.data?.surveys || msResp.data?.data || [];
          areaSurveys = all.filter(s => (
            (s.submissionLevel === 'area' || s.level === 'area') &&
            (s.area?.toString().toUpperCase() === lastAreaUpperTried) &&
            (!districtUpper || s.district?.toString().toUpperCase() === districtUpper)
          ));
        }
      } catch (err) {
        console.error('Error loading area surveys', err);
        areaSurveys = [];
      }
      setExpandedAreaSurveys(areaSurveys);
      let all = [];
      for (const u of units) {
        const uid = u.id || u._id || u.code;
        try {
          const unitUrl = `${import.meta.env.VITE_API_URL}/api/unit/unit-surveys/unit/${encodeURIComponent(uid)}?page=1&limit=100`;
          const usv = await axios.get(unitUrl, { headers });
          const list = (usv.data?.surveys || []).map(s => ({ ...s, __unitId: uid }));
          all = [...all, ...list];
        } catch (e) {
          console.error('[District] Unit Surveys Error:', { uid, error: e });
        }
      }
      setExpandedAreaAllUnitSurveys(all);
    } catch (e) {
      console.error('Error loading expanded area data', e);
      setExpandedAreaSurveys([]);
      setExpandedAreaUnits([]);
      setExpandedAreaAllUnitSurveys([]);
    } finally {
      setLoadingExpandedArea(false);
    }
  };

  const handleAreaClick = async (area) => {
    const areaId = area._id || area.id || area.code || area.title || area.name;
    if (!areaId) {
      console.warn('Area identifier missing for expanded view.', area);
      setExpandedAreaId(null);
      setExpandedAreaSurveys([]);
      setExpandedAreaUnits([]);
      setExpandedAreaAllUnitSurveys([]);
      return;
    }
    if (expandedAreaId === areaId) {
      setExpandedAreaId(null);
      setExpandedAreaSurveys([]);
      setExpandedAreaUnits([]);
      setExpandedAreaAllUnitSurveys([]);
      return;
    }
    setExpandedAreaId(areaId);
    await loadExpandedAreaData(areaId);
  };

  const handleViewUnitSurvey = async (survey) => {
    try {
      const token = localStorage.getItem('userToken');
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/api/unit/unit-survey/${survey._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setViewingUnitSurvey(resp.data?.survey || survey);
      setShowUnitDetailView(true);
    } catch (e) {
      console.error('Failed to load unit survey detail', e);
    }
  };

  // Render based on current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardView();
      case 'locations':
        return renderLocationsView();
      case 'home':
        return (
          <HomePage
            onLogout={handleLogoutClick}
            onNavigateToYearly={handleNavigateToYearly}
            onNavigateToMonthly={handleNavigateToMonthly}
            onNavigateToStats={handleNavigateToStats}
            onNavigateToNotifications={handleNavigateToNotifications}
            onNavigateToReports={handleNavigateToReports}
            userData={userData}
            defaultTab="overview"
          />
        );
      case 'yearly-dashboard':
        return (
          <FormSubmissionPage
            onLogout={handleLogoutClick}
            onBack={handleBackToHome}
            onCreateNew={handleCreateYearlyForm}
            onEdit={handleEditYearlyForm}
            userData={userData}
          />
        );
      
      case 'yearly-form':
        return (
          <FormProvider>
            <FormPage
              onBack={() => setCurrentView('yearly-dashboard')}
              onSubmit={handleYearlyFormSubmit}
              editingForm={editingForm}
            />
          </FormProvider>
        );
      
      case 'monthly-dashboard':
        return (
          <MonthlySurveyDashboard
            onBack={handleBackToHome}
            onCreateNew={handleCreateMonthlySurvey}
            onEdit={handleEditMonthlySurvey}
            userData={userData}
          />
        );
      
      case 'monthly-form':
        return (
          <FormProvider>
            <MonthlySurveyPage
              onBack={() => setCurrentView('monthly-dashboard')}
              onSubmit={handleMonthlySurveySubmit}
              editingSurvey={editingSurvey}
            />
          </FormProvider>
        );
      
      case 'stats':
        return renderStatsView();
      
      default:
        return (
          <HomePage
            onLogout={handleLogoutClick}
            onNavigateToYearly={handleNavigateToYearly}
            onNavigateToMonthly={handleNavigateToMonthly}
            onNavigateToStats={handleNavigateToStats}
            onNavigateToNotifications={handleNavigateToNotifications}
            onNavigateToReports={handleNavigateToReports}
            userData={userData}
            defaultTab="overview"
          />
        );
    }
  };

  // Render dashboard overview view
  const renderDashboardView = () => {
    if (dashboardLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading dashboard...</span>
        </div>
      );
    }

    if (dashboardError) {
      return (
        <div className="text-center py-16">
          <p className="text-red-500 font-medium">{dashboardError}</p>
          <button onClick={loadDashboardOverview} className="mt-4 px-4 py-2 bg-[#002349] text-white rounded-lg text-sm">Retry</button>
        </div>
      );
    }

    const d = dashboardData || {};
    const COLORS = ['#002349', '#957C3D', '#10b981', '#f59e0b'];

    const locationData = [
      { name: 'Areas', value: d.areas || 0 },
      { name: 'Units', value: d.units || 0 },
    ];

    const submissionData = [
      { name: 'Submitted', value: d.submitted || 0 },
      { name: 'Pending', value: d.pending || 0 },
      { name: 'Not Started', value: d.notStarted || 0 },
    ];

    const districtName = userData?.district || userData?.districtName || '';

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] rounded-2xl p-6 text-white">
          {/* MobileTopBar already names this screen on mobile; avoid a duplicate title below lg. */}
          <h2 className="hidden lg:block text-xl font-bold">ജില്ലാ ഡാഷ്ബോർഡ്</h2>
          {districtName && <p className="text-white/80 text-sm mt-1">{districtName}</p>}
        </div>

        <SubmissionsAnalytics scope="district" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-2.5 sm:p-5 flex flex-col items-start gap-1.5 sm:gap-2 overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#002349]" />
            </div>
            <p className="text-2xl font-bold text-[#002349]">{d.areas ?? '—'}</p>
            <p className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">ആകെ ഏരിയകൾ</p>
          </div>
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

        {/* Charts */}
        {(d.areas || d.units || d.activeReports) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location breakdown */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-[#002349] mb-4">ലൊക്കേഷൻ ഓവർവ്യൂ</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={locationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {locationData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Submission status pie */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-[#002349] mb-4">സബ്മിഷൻ സ്റ്റാറ്റസ്</h3>
              {(d.activeReports > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={submissionData}
                      cx="50%"
                      cy="42%"
                      outerRadius={62}
                      dataKey="value"
                    >
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
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  ആക്ടീവ് റിപ്പോർട്ടുകൾ ഇല്ല
                </div>
              )}
            </div>
          </div>
        ) : null}

        <ActiveReportsCard reports={activeReportsList} loading={activeReportsLoading} />
      </div>
    );
  };

  // Render stats view
  const renderStatsView = () => {
    if (statsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
          <span className="ml-2 text-gray-600 font-medium">Loading statistics...</span>
        </div>
      );
    }

    if (statsError) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600 font-semibold">{statsError}</p>
        </div>
      );
    }

    if (!stats) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 font-medium">No statistics available</p>
        </div>
      );
    }

    // Prepare data for charts
    const monthlySurveysData = [
      {
        name: 'Current Year',
        district: stats.monthly?.districtCount || 0,
        area: stats.monthly?.areaCount || 0,
        unit: stats.monthly?.unitCount || 0
      },
      {
        name: 'Last Year',
        district: stats.lastYear?.districtSurveys || 0,
        area: stats.lastYear?.areaSurveys || 0,
        unit: stats.lastYear?.unitSurveys || 0
      }
    ];

    const monthlyTrendData = stats.monthly?.surveys?.map(survey => ({
      name: survey.month,
      surveys: 1
    })) || [];

    const monthlyByLevelData = [
      {
        name: 'District',
        surveys: stats.monthly?.districtCount || 0
      },
      {
        name: 'Area',
        surveys: stats.monthly?.areaCount || 0
      },
      {
        name: 'Unit',
        surveys: stats.monthly?.unitCount || 0
      }
    ];

    return (
      <div className="space-y-6">
        {/* Sub-tabs within District Statistics */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3">
          <div className="flex space-x-3 flex-wrap gap-2">
            <button
              onClick={() => setActiveStatsSubTab('summary')}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-500 ${activeStatsSubTab === 'summary' ? 'bg-[#002349] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveStatsSubTab('districtTable')}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-500 ${activeStatsSubTab === 'districtTable' ? 'bg-[#957C3D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}`}
            >
              District Table
            </button>
            <button
              onClick={() => setActiveStatsSubTab('areaTable')}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-500 ${activeStatsSubTab === 'areaTable' ? 'bg-[#002349] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}`}
            >
              Area Table
            </button>
            <button
              onClick={() => setActiveStatsSubTab('unitTable')}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-500 ${activeStatsSubTab === 'unitTable' ? 'bg-[#957C3D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}`}
            >
              Unit Table
            </button>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all duration-300">
          <p className="text-sm text-gray-700">
            This page shows your district's progress in simple numbers and charts. You can see totals from your last yearly report and how this year's months are going.
          </p>
        </div>
        {/* AI Summary */}
        {activeStatsSubTab === 'summary' && summary && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
            <div className="text-sm text-gray-800 leading-relaxed break-words">{summary}</div>
          </div>
        )}

        {/* Statistics Cards */}
        {activeStatsSubTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatisticsCard
            title="Monthly Reports This Year"
            value={(stats.monthly?.count || 0).toLocaleString()}
            subtitle="All levels combined"
            icon={TrendingUp}
            color="yellow"
          />
          <StatisticsCard
            title="District Monthly Reports"
            value={(stats.monthly?.districtCount || 0).toLocaleString()}
            subtitle="District level submissions"
            icon={Building}
            color="blue"
          />
          <StatisticsCard
            title="Area Monthly Reports"
            value={(stats.monthly?.areaCount || 0).toLocaleString()}
            subtitle="Area level submissions"
            icon={MapPin}
            color="green"
          />
          <StatisticsCard
            title="Unit Monthly Reports"
            value={(stats.monthly?.unitCount || 0).toLocaleString()}
            subtitle="Unit level submissions"
            icon={Users}
            color="purple"
          />
          <StatisticsCard
            title="Total Areas"
            value={areaCount}
            subtitle="Under this district"
            icon={MapPin}
            color="orange"
          />
          <StatisticsCard
            title="Total Units"
            value={unitCount}
            subtitle="Under this district"
            icon={Building}
            color="teal"
          />
          <StatisticsCard
            title="Current Month Surveys"
            value={(stats.currentMonth?.totalSurveys || 0).toLocaleString()}
            subtitle={`${stats.currentMonth?.month || 'N/A'} ${stats.currentMonth?.year || ''}`}
            icon={BarChart3}
            color="indigo"
          />
          <StatisticsCard
            title="Last Year Total"
            value={(stats.lastYear?.totalSurveys || 0).toLocaleString()}
            subtitle={`Year ${stats.lastYear?.year || 'N/A'}`}
            icon={BookOpen}
            color="pink"
          />
        </div>
        )}

        {/* Charts */}
        {activeStatsSubTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SurveyBarChart
            data={monthlySurveysData}
            title="Current Year vs Last Year"
            dataKey1="district"
            dataKey2="area"
            dataKey3="unit"
            label1="District"
            label2="Area"
            label3="Unit"
          />
          
          <SurveyBarChart
            data={monthlyByLevelData}
            title="Surveys by Level"
            dataKey1="surveys"
            label1="Surveys"
          />
        </div>
        )}
        <p className="text-xs text-gray-500">Tip: The charts show survey submission activity by level and year-over-year comparison.</p>

        {/* Monthly Trend */}
        {activeStatsSubTab === 'summary' && monthlyTrendData.length > 0 && (
          <SurveyBarChart
            data={monthlyTrendData}
            title="Month-by-Month Survey Submissions"
            dataKey1="surveys"
            label1="Surveys"
          />
        )}

        {/* Monthly Surveys by Level */}
        {activeStatsSubTab === 'summary' && monthlyByLevelData.some(level => level.surveys > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurveyBarChart
              data={monthlyByLevelData}
              title="Monthly Reports by Level"
              dataKey1="surveys"
              label1="Surveys"
            />
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Breakdown</h3>
              <div className="space-y-4">
                {monthlyByLevelData.map((level, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{level.name} Level</div>
                      <div className="text-sm text-gray-600">{level.surveys} Reports submitted</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">{level.surveys.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">surveys</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* District Information */}
        {activeStatsSubTab === 'summary' && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
            <h3 className="text-lg font-bold text-[#002349] mb-6">District Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">District</p>
                <p className="text-lg font-semibold text-[#002349]">{stats.yearly?.district || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">Monthly Surveys This Year</p>
                <p className="text-lg font-semibold text-gray-700">{(stats.monthly?.count || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">Yearly Survey Date</p>
                <p className="text-lg font-semibold text-gray-700">{stats.yearly?.submittedAt ? new Date(stats.yearly.submittedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">Current Month</p>
                <p className="text-lg font-semibold text-gray-700">{stats.currentMonth?.month || 'N/A'} ({stats.currentMonth?.totalSurveys || 0} surveys)</p>
              </div>
            </div>
          </div>
        )}

        {activeStatsSubTab === 'districtTable' && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-lg font-bold text-[#002349]">District Table</h3>
              <span className="text-[10px] uppercase tracking-wide px-3 py-1 rounded-full bg-[#002349] text-white font-semibold">District</span>
            </div>
            <DistrictMonthlyStatsTable 
              surveys={districtMonthlySurveys}
            />
          </div>
        )}

        {activeStatsSubTab === 'areaTable' && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#957C3D]">Areas</h3>
                <span className="text-[10px] uppercase tracking-wide px-3 py-1 rounded-full bg-[#957C3D] text-white font-semibold">Area</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{areas.length} total</span>
            </div>
            <div className="divide-y rounded-2xl border border-gray-200">
              {areas.map((a) => {
                const areaId = a.id || a._id || a.code;
                const isExpanded = expandedAreaId === areaId;
                return (
                  <div key={areaId} className="bg-white">
                    <button
                      onClick={() => handleAreaClick(a)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gradient-to-br hover:from-white hover:to-gray-50 transition-all duration-300 ${isExpanded ? 'bg-gray-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#957C3D]" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        <span className="text-sm font-semibold text-[#002349]">{a.title || a.name || areaId}</span>
                      </div>
                      <span className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">View monthly data</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Area</div>
                              <h4 className="text-sm font-semibold text-gray-900">{a.title || a.name || areaId}</h4>
                            </div>
                            <button className="text-xs text-gray-600 hover:text-gray-900 px-3 py-2.5" onClick={() => setExpandedAreaId(null)}>Close</button>
                          </div>

                          {loadingExpandedArea ? (
                            <div className="p-4 animate-pulse space-y-3">
                              <div className="h-4 bg-gray-200 rounded" />
                              <div className="h-4 bg-gray-200 rounded" />
                              <div className="h-4 bg-gray-200 rounded" />
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <AreaMonthlyStatsTable surveys={expandedAreaSurveys} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeStatsSubTab === 'unitTable' && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#002349]">Areas & Units</h3>
                <span className="text-[10px] uppercase tracking-wide px-3 py-1 rounded-full bg-slate-600 text-white font-semibold">Unit</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{areas.length} areas</span>
            </div>
            {renderAreasUnitsList()}
          </div>
        )}
      </div>
    );
  };

  // Shared list of areas (expandable to their units) with per-area / per-unit
  // "submissions" shortcuts. Used by both the stats "unit table" tab and the
  // dedicated Areas & Units page.
  const renderAreasUnitsList = () => {
    if (!areas || areas.length === 0) {
      return <p className="text-sm text-gray-500 py-6 text-center">No areas found under this district.</p>;
    }
    return (
      <div className="space-y-3">
        {areas.map((a) => {
          const areaId = a.id || a._id || a.code;
          const areaName = a.title || a.name || areaId;
          const isExpanded = expandedAreaId === areaId;
          return (
            <div key={areaId} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-all duration-300">
              <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isExpanded ? 'bg-gradient-to-r from-[#002349]/5 to-[#957C3D]/5' : ''}`}>
                <button
                  onClick={() => handleAreaClick(a)}
                  className="flex items-center gap-3 min-w-0 text-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#957C3D]/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#957C3D]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#002349] truncate">{areaName}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide units' : 'View units'}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => navigate('/district/dynamic-submissions/monthly', { state: { areaFilter: a.name || a.title } })}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#002349] text-white text-xs font-semibold hover:bg-[#1a3a5c] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>സബ്മിഷനുകൾ</span>
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1">
                  <div className="rounded-xl border border-gray-200 divide-y">
                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">Units</h4>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {expandedAreaUnits.length}
                      </span>
                    </div>
                    {expandedAreaUnits.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">No units under this area.</p>
                    ) : (
                      expandedAreaUnits.map((u) => {
                        const unitId = u.id || u._id || u.code;
                        return (
                          <div key={unitId} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building className="w-4 h-4 text-[#002349] flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-800 truncate">{u.name || u.title || unitId}</span>
                            </div>
                            <button
                              onClick={() => navigate('/district/dynamic-submissions/monthly', { state: { unitFilter: u.name || u.title } })}
                              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#002349]/10 text-[#002349] text-xs font-semibold hover:bg-[#002349]/20 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>സബ്മിഷനുകൾ</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Dedicated "Areas & Units" page (sidebar → locations).
  const renderLocationsView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold">ഏരിയകളും യൂണിറ്റുകളും</h2>
        <p className="text-white/80 text-sm mt-1">
          {userData?.district || userData?.districtName || ''} · {areas.length} areas
        </p>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200">
        <p className="text-xs text-[#957C3D] font-medium mb-4 break-words leading-relaxed">
          💡 ഒരു ഏരിയയിൽ ക്ലിക്ക് ചെയ്ത് അതിലെ യൂണിറ്റുകൾ കാണുക. "സബ്മിഷനുകൾ" ബട്ടൺ ആ ഏരിയ / യൂണിറ്റിന്റെ സബ്മിഷനുകൾ കാണിക്കും.
        </p>
        {renderAreasUnitsList()}
      </div>
    </div>
  );

  const currentViewContent = renderCurrentView();

  const handleSidebarNavigate = (viewId) => {
    if (viewId === 'reports') {
      navigate('/user-reports');
      setIsSidebarOpen(false);
      return;
    }
    setEditingForm(null);
    setEditingSurvey(null);
    setCurrentView(viewId);
    setIsSidebarOpen(false);
  };

  // If not authenticated, redirect to landing page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('userToken');
                  localStorage.removeItem('userData');
                  window.location.href = '/';
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <DistrictAdminSidebar
          activeView={normalizeSidebarView(currentView)}
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogoutClick}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={() => navigate('/user-reports')}
          onReportTypeSelect={(type) => navigate('/user-reports', { state: { initialType: type } })}
          districtName={userData?.district}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileTopBar
            title={
              {
                'yearly-dashboard': 'വാർഷിക റിപ്പോർട്ട്',
                'yearly-form': 'വാർഷിക റിപ്പോർട്ട്',
                'monthly-dashboard': 'പ്രതിമാസ റിപ്പോർട്ട്',
                'monthly-form': 'പ്രതിമാസ റിപ്പോർട്ട്',
                locations: 'ലൊക്കേഷനുകൾ',
                stats: 'സ്ഥിതിവിവരങ്ങൾ',
              }[currentView] || 'ജില്ലാ ഡാഷ്ബോർഡ്'
            }
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-24 lg:pb-4">
            {currentViewContent}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout from the district dashboard?"
        confirmText="Logout"
        cancelText="Cancel"
        type="logout"
      />
    </>
  );
};

export default DistrictDashboardPage;

