import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Building, BookOpen, TrendingUp, BarChart3, MapPin, ChevronRight, ChevronDown, FileText, Bell, Info, Search } from 'lucide-react';
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
import AreaMonthlyStatsTable from '../components/tables/AreaMonthlyStatsTable';
import ActiveReportsCard from '../components/dashboard/ActiveReportsCard';
import DashboardMetricGrid from '../components/dashboard/DashboardMetricGrid';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MobileTopBar from '../components/sidebars/MobileTopBar';
import ConsolidationTab from '../components/admin/ConsolidationTab';
import useMediaQuery from '../hooks/useMediaQuery';

// Tinted pin per area row, cycled by position.
const AREA_TONES = [
  'bg-[#e4edfb] text-[#1d4fa8]',
  'bg-[#e3f4ea] text-[#1e8a4c]',
  'bg-[#fdf1dc] text-[#a06a12]',
  'bg-[#fbe6ee] text-[#b8244f]',
  'bg-[#ede6fb] text-[#6a3bd8]',
];

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
  // Mounted per breakpoint (not hidden with CSS) so the analytics fetch runs once.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // Stats state
  const [areas, setAreas] = useState([]);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [areaSearch, setAreaSearch] = useState('');

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

  // Load the data each view needs when it becomes active
  useEffect(() => {
    if (currentView === 'dashboard') {
      loadDashboardOverview();
      loadActiveReportsList();
      loadUnreadCount();
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
  const handleNavigateToStats = () => setCurrentView('consolidation');
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
    navigate('/district-survey');
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

  // Badge on the top-bar bell; best-effort, never blocks the dashboard.
  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      setUnreadCount(response.data?.count || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const loadAreas = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('userData') || '{}');
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const distId = user?.districtId || user?.district?._id;
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

  const loadExpandedAreaData = async (areaId) => {
    try {
      setLoadingExpandedArea(true);
      const token = localStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
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
      setExpandedAreaUnits([]);
      setExpandedAreaAllUnitSurveys([]);
      return;
    }
    if (expandedAreaId === areaId) {
      setExpandedAreaId(null);
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
      
      case 'consolidation':
        return (
          <div className="space-y-4">
            <h2 className="hidden lg:block text-xl font-bold text-[#0f2a5c]">കൺസോളിഡേഷൻ</h2>
            <ConsolidationTab scope="district" />
          </div>
        );
      
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
      <div className="space-y-2.5 sm:space-y-6">
        {/* MobileTopBar already names this screen on mobile; avoid a duplicate title below lg. */}
        <h2 className="hidden lg:block text-xl font-bold text-[#0f2a5c]">ജില്ലാ ഡാഷ്ബോർഡ്</h2>

        {/* District card */}
        <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-r from-[#0b2a5b] to-[#1b4384] p-2.5 text-white shadow-[0_10px_28px_rgba(11,42,91,0.28)] sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <MapPin className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold tracking-[0.12em] text-white/75">ജില്ല</span>
            <span className="block break-words text-[15px] font-extrabold uppercase leading-tight [overflow-wrap:anywhere]">{districtName || '—'}</span>
          </span>
          <button
            type="button"
            onClick={() => setCurrentView('locations')}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 text-[12px] font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
          >
            ഏരിയകൾ <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Full analytics stays on desktop; phones get just the submitted/pending
            roster below and reach the per-report breakdown via Consolidation. */}
        {isDesktop && <SubmissionsAnalytics scope="district" />}

        <DashboardMetricGrid
          items={[
            { key: 'areas', label: 'ആകെ ഏരിയകൾ', value: d.areas, icon: MapPin, tone: 'blue', onClick: () => setCurrentView('locations') },
            { key: 'units', label: 'ആകെ യൂണിറ്റുകൾ', value: d.units, icon: Building, tone: 'gold', onClick: () => setCurrentView('locations') },
            { key: 'reports', label: 'ആകെ റിപ്പോർട്ടുകൾ', value: d.activeReports, icon: BookOpen, tone: 'violet', onClick: handleNavigateToReports },
            { key: 'submitted', label: 'സബ്മിറ്റ് ചെയ്തവ', value: d.submitted, icon: TrendingUp, tone: 'green', onClick: () => setCurrentView('consolidation') },
          ]}
        />

        <ActiveReportsCard reports={activeReportsList} loading={activeReportsLoading} />

        {!isDesktop && <SubmissionsAnalytics scope="district" variant="status" />}

        <button
          type="button"
          onClick={() => setCurrentView('consolidation')}
          className="jih-card relative flex w-full items-center gap-2.5 overflow-hidden p-3 text-left transition hover:-translate-y-0.5 lg:hidden"
        >
          <svg className="pointer-events-none absolute bottom-0 right-2 h-8 w-10" viewBox="0 0 96 64" fill="none" aria-hidden="true">
            <rect x="6" y="40" width="12" height="24" rx="3" fill="#e4ecf8" />
            <rect x="26" y="30" width="12" height="34" rx="3" fill="#d7e2f4" />
            <rect x="46" y="18" width="12" height="46" rx="3" fill="#c9d8f0" />
            <rect x="66" y="6" width="12" height="58" rx="3" fill="#bccdec" />
          </svg>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e4edfb] text-[#1d4fa8]">
            <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold leading-tight text-[#0f2a5c]">കൺസോളിഡേഷൻ</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-[#5b6b85]">റിപ്പോർട്ട് ഉത്തരങ്ങൾ ഏരിയ, യൂണിറ്റ് തിരിച്ച്</span>
          </span>
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f8] text-[#1f3560]">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>

        {/* Charts */}
        {(d.areas || d.units || d.activeReports) ? (
          <div className="hidden grid-cols-1 gap-6 lg:grid lg:grid-cols-2">
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

      </div>
    );
  };

  // Shared list of areas (expandable to their units) with per-area / per-unit
  // "submissions" shortcuts, for the Areas & Units page.
  const renderAreasUnitsList = (list = areas) => {
    if (!list || list.length === 0) {
      return <p className="py-6 text-center text-sm text-gray-500">ഈ ജില്ലയിൽ ഏരിയകൾ ലഭ്യമല്ല.</p>;
    }
    return (
      <div className="space-y-3">
        {list.map((a, index) => {
          const areaId = a.id || a._id || a.code;
          const areaName = a.title || a.name || areaId;
          const isExpanded = expandedAreaId === areaId;
          return (
            <div key={areaId} className="jih-card overflow-hidden">
              <div className={`p-3 sm:flex sm:items-center sm:gap-3 ${isExpanded ? 'bg-[#f6f8fc]' : ''}`}>
                <button
                  onClick={() => handleAreaClick(a)}
                  aria-expanded={isExpanded}
                  className="flex min-h-[44px] w-full min-w-0 items-center gap-2.5 text-left sm:flex-1"
                >
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${AREA_TONES[index % AREA_TONES.length]}`}>
                    <MapPin className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[14px] font-extrabold uppercase leading-tight text-[#0f2a5c] [overflow-wrap:anywhere] sm:text-base">{areaName}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[#5b6b85] sm:text-sm">
                      {isExpanded ? 'യൂണിറ്റുകൾ മറയ്ക്കുക' : 'യൂണിറ്റുകൾ കാണുക'}
                    </span>
                  </span>
                  {isExpanded
                    ? <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#1f3560]" />
                    : <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#1f3560]" />}
                </button>
                <button
                  onClick={() => navigate('/district/dynamic-submissions/monthly', { state: { areaFilter: a.name || a.title } })}
                  className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#14346b] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#1d4487] sm:mt-0 sm:min-h-[44px] sm:w-auto sm:flex-shrink-0 sm:text-sm"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>സബ്മിഷനുകൾ</span>
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-[#e6ecf5] bg-[#f6f8fc] p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2 px-1">
                      <h4 className="text-[13px] font-semibold text-gray-900">യൂണിറ്റുകൾ</h4>
                      <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                        {expandedAreaUnits.length}
                      </span>
                  </div>
                  {loadingExpandedArea ? (
                    <div className="space-y-2" aria-label="Loading units">
                      <div className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white" />
                      <div className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white" />
                    </div>
                  ) : expandedAreaUnits.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-sm text-gray-600">ഈ ഏരിയയിൽ യൂണിറ്റുകൾ ലഭ്യമല്ല.</p>
                  ) : (
                    <div className="space-y-2">
                      {expandedAreaUnits.map((u) => {
                        const unitId = u.id || u._id || u.code;
                        return (
                          <div key={unitId} className="rounded-xl border border-gray-200 bg-white p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <Building className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#002349]" />
                              <span className="min-w-0 break-words text-[13px] font-semibold leading-snug text-gray-800 [overflow-wrap:anywhere]">{u.name || u.title || unitId}</span>
                            </div>
                            <button
                              onClick={() => navigate('/district/dynamic-submissions/monthly', { state: { unitFilter: u.name || u.title } })}
                              className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#002349]/10 px-3 py-2 text-[13px] font-semibold text-[#002349] transition-colors hover:bg-[#002349]/20 sm:mt-0 sm:w-auto sm:flex-shrink-0"
                            >
                              <FileText className="h-4 w-4" />
                              <span>സബ്മിഷനുകൾ</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Dedicated "Areas & Units" page (sidebar → locations).
  const renderLocationsView = () => {
    const query = areaSearch.trim().toLowerCase();
    const visibleAreas = query
      ? areas.filter((a) => `${a.title || ''} ${a.name || ''} ${a.code || ''}`.toLowerCase().includes(query))
      : areas;

    return (
      <div className="space-y-2.5 sm:space-y-6">
        <h2 className="hidden lg:block text-xl font-bold text-[#0f2a5c]">ഏരിയകളും യൂണിറ്റുകളും</h2>

        <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-r from-[#0b2a5b] to-[#1b4384] p-2.5 text-white shadow-[0_10px_28px_rgba(11,42,91,0.28)] sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <MapPin className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[15px] font-extrabold uppercase leading-tight [overflow-wrap:anywhere]">
              {userData?.district || userData?.districtName || '—'}
            </span>
            <span className="block text-[12px] text-white/80">{areas.length} പ്രദേശങ്ങൾ</span>
          </span>
        </div>

        <div className="flex items-start gap-2.5 rounded-[18px] bg-[#e4edfb] p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#1d4fa8]">
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <p className="min-w-0 text-[12px] font-medium leading-relaxed text-[#1f3560]">
            ഏരിയ തിരഞ്ഞെടുക്കുമ്പോൾ അതിലെ യൂണിറ്റുകൾ കാണാം. ഏരിയയുടെയോ യൂണിറ്റിന്റെയോ റിപ്പോർട്ടുകൾ കാണാൻ “സബ്മിഷനുകൾ” തിരഞ്ഞെടുക്കുക.
          </p>
        </div>

        <label className="jih-card flex min-h-[44px] items-center gap-2 px-3.5">
          <Search className="h-4 w-4 shrink-0 text-[#5b6b85]" />
          <input
            type="search"
            value={areaSearch}
            onChange={(e) => setAreaSearch(e.target.value)}
            placeholder="ഏരിയ തിരയുക..."
            aria-label="ഏരിയ തിരയുക"
            className="min-w-0 flex-1 bg-transparent text-base text-[#0f2a5c] placeholder:text-[#8593ab] focus:outline-none"
          />
        </label>

        {renderAreasUnitsList(visibleAreas)}
      </div>
    );
  };

  const currentViewContent = renderCurrentView();

  // Top-bar identity badge: two initials from the user's name, else the district.
  const initialsSource = (userData?.name || userData?.email || userData?.district || userData?.districtName || 'JIH').trim();
  const initialsWords = initialsSource.split(/[\s@._-]+/).filter(Boolean);
  const initials = (initialsWords.length > 1 ? initialsWords[0][0] + initialsWords[1][0] : initialsSource.slice(0, 2)).toUpperCase();

  const topBarActions = (
    <>
      <button
        type="button"
        onClick={handleNavigateToNotifications}
        aria-label={unreadCount > 0 ? `നോട്ടിഫിക്കേഷൻ, ${unreadCount} പുതിയത്` : 'നോട്ടിഫിക്കേഷൻ'}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1f3560] shadow-[0_6px_18px_rgba(15,35,65,0.12)] transition-colors hover:bg-[#f4f7fc]"
      >
        <Bell className="h-4 w-4" strokeWidth={1.9} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#e0334c] px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <span
        role="img"
        aria-label={initialsSource}
        title={initialsSource}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#14346b] text-[12px] font-extrabold text-white shadow-[0_6px_18px_rgba(20,52,107,0.28)]"
      >
        {initials}
        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-[#2fb36b] ring-2 ring-white" aria-hidden="true" />
      </span>
    </>
  );

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
      <div className="app-viewport bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
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
                consolidation: 'കൺസോളിഡേഷൻ',
              }[currentView] || 'ജില്ലാ ഡാഷ്ബോർഡ്'
            }
            subtitle={
              {
                dashboard: 'സേവനത്തിലൂടെ സമൂഹത്തിന് ഒപ്പം',
                locations: 'പ്രദേശങ്ങൾ കാണുക',
                consolidation: 'റിപ്പോർട്ട് ഉത്തരങ്ങളുടെ ആകെത്തുക',
              }[currentView] || null
            }
            actions={currentView === 'dashboard' ? topBarActions : null}
          />
          <div data-app-scroll className="app-scroll-region mobile-readable-content flex-1 px-3 pt-3 pb-24 sm:px-6 sm:pt-4 lg:px-8 lg:pb-4">
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
