import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, FileText, Search, Filter, Edit, Trash2, Calendar, ArrowLeft, Eye, Save, Bell, Check, X, BookOpen, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import FormDetailPage from './FormDetailPage';
import FormPage from './FormPage';
import UnitSurveyPage from './UnitSurveyPage';
import KarkunForm from '../components/forms/membership/KarkunForm';
import RuknForm from '../components/forms/membership/RuknForm';
import { FormProvider } from '../contexts/FormContext';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import RejectionModal from '../components/modals/RejectionModal';
import StatisticsCard from '../components/charts/StatisticsCard';
import SurveyBarChart from '../components/charts/SurveyBarChart';
import UnitMonthlyStatsTable from '../components/tables/UnitMonthlyStatsTable';
import ActiveReportsCard from '../components/dashboard/ActiveReportsCard';
import jihLogo from '../assets/LogoColor.png';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import MobileTopBar from '../components/sidebars/MobileTopBar';

// Authority persons options for display
const authorityPersonsOptions = [
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
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

// Member categories options for display
const memberCategoriesOptions = [
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
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

const UnitDashboardPage = ({ onLogout }) => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  
  // Track if component is mounted to prevent API calls after logout
  const isMountedRef = useRef(true);
  const lastFetchedRef = useRef({ activeTab: null, currentPage: null, monthFilter: null });
  const monthlyFetchControllerRef = useRef(null);
  const isLoadingMonthlyRef = useRef(false);
  const currentRequestParamsRef = useRef(null);
  
  // Unit and user data
  const [userData, setUserData] = useState(null);
  const [unit, setUnit] = useState(null);
  const [area, setArea] = useState(null);
  
  // Surveys and data
  const [monthlySurveys, setMonthlySurveys] = useState([]);
  const [error, setError] = useState('');
  
  // Membership data
  const [membershipData, setMembershipData] = useState({
    karkun: [],
    rukn: []
  });
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipTab, setMembershipTab] = useState('karkun'); // 'karkun' | 'rukn'
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'monthly', 'stats', 'membership'
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [activeReportsList, setActiveReportsList] = useState([]);
  const [activeReportsLoading, setActiveReportsLoading] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionData, setRejectionData] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFormEdit, setShowFormEdit] = useState(false);
  const [showCreateSurvey, setShowCreateSurvey] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [viewingSurvey, setViewingSurvey] = useState(null);
  const [showDeleteKarkunModal, setShowDeleteKarkunModal] = useState(false);
  const [showDeleteRuknModal, setShowDeleteRuknModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
const [isUnitSidebarOpen, setIsUnitSidebarOpen] = useState(false);
  
  // Membership navigation state
  const [showKarkunForm, setShowKarkunForm] = useState(false);
  const [showRuknForm, setShowRuknForm] = useState(false);
  const [selectedKarkunForm, setSelectedKarkunForm] = useState(null);
  const [selectedRuknForm, setSelectedRuknForm] = useState(null);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSurveys, setTotalSurveys] = useState(0);

  useEffect(() => {
    const state = location.state || {};
    let consumed = false;
    if (state.initialTab) {
      setActiveTab(state.initialTab);
      consumed = true;
    }
    if (state.showNotifications) {
      // Navigate to notifications route instead of showing in dashboard
      navigate('/notifications', { replace: true });
      consumed = true;
    }
    if (consumed) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  // Load user data once on mount
  useEffect(() => {
    // Ensure mounted ref is set to true on mount
    isMountedRef.current = true;
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const parsedUserData = JSON.parse(storedUserData);
      setUserData(parsedUserData);
      
      if (parsedUserData?.unit || parsedUserData?.unitName) {
        setUnit({
          id: unitId,
          name: parsedUserData.unit || parsedUserData.unitName
        });
      }
      if (parsedUserData?.area || parsedUserData?.areaName) {
        setArea({
          id: parsedUserData.areaId,
          name: parsedUserData.area || parsedUserData.areaName
        });
      }
    }
    
    const { editingSurvey: adminEditingSurvey, isAdmin } = location.state || {};
    if (adminEditingSurvey && isAdmin) {
      setEditingSurvey(adminEditingSurvey);
      setShowFormEdit(true);
    }
    
    loadUnitData();
  }, [unitId, navigate]);

  const loadMonthlySurveys = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }
    
    // Ensure unitId is available
    if (!unitId) {
      setMonthlySurveys([]);
      setTotalSurveys(0);
      setTotalPages(1);
      return;
    }
    
    // Create request key to check for duplicates
    const requestKey = `${unitId}-${monthFilter || 'all'}`;
    
    // Prevent duplicate requests with same parameters
    if (isLoadingMonthlyRef.current && currentRequestParamsRef.current === requestKey) {
      return;
    }
    
    // Don't abort previous requests - just let them complete
    // The duplicate prevention above will handle same-parameter requests
    // For different parameters, we'll let the old request finish and the new one will update the state
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      setMonthlySurveys([]);
      setTotalSurveys(0);
      setTotalPages(1);
      return;
    }

    setError('');
    isLoadingMonthlyRef.current = true;
    currentRequestParamsRef.current = requestKey;
    
    const controller = new AbortController();
    monthlyFetchControllerRef.current = controller;

    try {
      const params = new URLSearchParams();
      
      // Only add month filter if specified
      if (monthFilter) params.append('month', monthFilter);

      // Build URL with or without query params
      const apiUrl = params.toString() 
        ? `${API_BASE_URL}/api/unit/unit-surveys/unit/${unitId}?${params}`
        : `${API_BASE_URL}/api/unit/unit-surveys/unit/${unitId}`;

      // Use the specific unit endpoint
      const response = await axios.get(
        apiUrl,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
      
      // Check if this response is still relevant (matches current request)
      const currentRequestKey = `${unitId}-${monthFilter || 'all'}`;
      if (currentRequestParamsRef.current && currentRequestParamsRef.current !== currentRequestKey) {
        return;
      }
      
      // Process the response - don't check isMountedRef here as it can be false during re-renders
      // The component is clearly still active if we got a response
      
      // Extract surveys from response - try multiple possible structures
      let surveys = [];
      if (Array.isArray(response.data?.surveys)) {
        surveys = response.data.surveys;
      } else if (Array.isArray(response.data?.data)) {
        surveys = response.data.data;
      } else if (Array.isArray(response.data)) {
        surveys = response.data;
      }
      
      // Update state
      setMonthlySurveys(surveys);
      setTotalPages(response.data?.totalPages || 1);
      setTotalSurveys(response.data?.totalSurveys || surveys.length);
    } catch (error) {
      // Ignore cancellation errors - they're expected when requests are aborted
      if (controller.signal.aborted || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return;
      }
      
      if (error.response?.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        navigate('/', { replace: true });
        return;
      }
      
      if (!isMountedRef.current) return;
      
      setMonthlySurveys([]);
      setTotalPages(1);
      setTotalSurveys(0);
      setError(error.response?.data?.message || 'Failed to load monthly reports');
    } finally {
      isLoadingMonthlyRef.current = false;
      if (monthlyFetchControllerRef.current === controller) {
        monthlyFetchControllerRef.current = null;
        // Clear request params for this request
        currentRequestParamsRef.current = null;
      }
    }
  }, [unitId, currentPage, monthFilter, navigate]);

  // Load data based on active tab
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Only fetch if values have actually changed
    if (activeTab === 'monthly') {
      // Don't trigger if unitId is not available yet
      if (!unitId) {
        return;
      }
      
      // Don't trigger if a request is already in progress with the same parameters
      const requestKey = `${unitId}-${monthFilter || 'all'}`;
      if (isLoadingMonthlyRef.current && currentRequestParamsRef.current === requestKey) {
        return;
      }
      const key = `${activeTab}-${currentPage}-${monthFilter}`;
      const lastKey = `${lastFetchedRef.current.activeTab}-${lastFetchedRef.current.currentPage}-${lastFetchedRef.current.monthFilter}`;
      
      // Always fetch on initial load (when lastFetchedRef.activeTab is null) or when key changes
      const isInitialLoad = lastFetchedRef.current.activeTab === null;
      const hasKeyChanged = key !== lastKey;
      
      if (isInitialLoad || hasKeyChanged) {
        lastFetchedRef.current = { activeTab, currentPage, monthFilter };
        // Call directly - the duplicate prevention in loadMonthlySurveys will handle rapid calls
        if (isMountedRef.current) {
          loadMonthlySurveys();
        }
      }
    } else {
      // Membership is now handled by dedicated MembershipPage route
      lastFetchedRef.current = { activeTab, currentPage: null, monthFilter: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, monthFilter, unitId]); // loadMonthlySurveys is stable via useCallback

  // Ensure we load surveys when unitId becomes available and activeTab is monthly
  useEffect(() => {
    if (activeTab === 'monthly' && unitId && isMountedRef.current && !isLoadingMonthlyRef.current) {
      const requestKey = `${unitId}-${monthFilter || 'all'}`;
      // Only load if we haven't loaded this exact request yet
      if (currentRequestParamsRef.current !== requestKey) {
        loadMonthlySurveys();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, activeTab]); // Only depend on unitId and activeTab

  // Load dashboard overview + active reports when the dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard' && unitId && isMountedRef.current) {
      loadDashboardOverview();
      loadActiveReportsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Don't abort requests on unmount - let them complete
      // The isMountedRef check will prevent state updates if component unmounted
      // This prevents unnecessary request cancellations
    };
  }, []);

  // Handle back navigation to login page
  const handleBackNavigation = () => {
    navigate('/');
  };

  const resetOverlayViews = () => {
    setShowDetailView(false);
    setShowFormEdit(false);
    setShowCreateSurvey(false);
    setShowKarkunForm(false);
    setShowRuknForm(false);
    setViewingSurvey(null);
    setSelectedFormId(null);
    setEditingSurvey(null);
  };

  const handleNavigateToMembership = () => {
    setIsUnitSidebarOpen(false);
    navigate('/membership', { state: { roleHint: 'unit' } });
  };

  const handleSidebarNavigate = (viewId) => {
    setIsUnitSidebarOpen(false);
    if (viewId === 'notifications') {
      // Navigate to notifications route
      navigate('/notifications');
      return;
    }
    if (viewId === 'dynamic-reports') {
      navigate('/user-reports');
      return;
    }
    if (viewId === 'membership') {
      handleNavigateToMembership();
      return;
    }
    if (viewId === 'dashboard' || viewId === 'monthly' || viewId === 'stats') {
      resetOverlayViews();
      setActiveTab(viewId);
    }
  };

  const handleDynamicReportsShortcut = () => {
    setIsUnitSidebarOpen(false);
    navigate('/user-reports');
  };

  const handleNotificationsShortcut = () => {
    setIsUnitSidebarOpen(false);
    // Navigate to notifications route
    navigate('/notifications');
  };

  // Handle Karkun form navigation
  const handleViewKarkunForm = (form) => {
    setSelectedKarkunForm(form);
    setShowKarkunForm(true);
  };

  const handleBackFromKarkunForm = () => {
    setShowKarkunForm(false);
    setSelectedKarkunForm(null);
  };

  const handleVerifyKarkun = async (formId, status) => {
    if (status === 'rejected') {
      setRejectionData({ formId, type: 'karkun' });
      setShowRejectionModal(true);
      return;
    }
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(
        `${API_BASE_URL}/api/karkun/${formId}/verify/unit`,
        { status },
        { headers, timeout: 5000 }
      );
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({
          ...prev,
          karkun: prev.karkun.map(f => (f._id === updated._id ? { ...f, ...updated } : f))
        }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Verification failed');
    }
  };

  const handleConfirmRejection = async (comments) => {
    if (!rejectionData) return;
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      
      const endpoint = rejectionData.type === 'karkun' 
        ? `${API_BASE_URL}/api/karkun/${rejectionData.formId}/verify/unit`
        : `${API_BASE_URL}/api/rukn/${rejectionData.formId}/verify/unit`;
      
      const res = await axios.put(endpoint, { status: 'rejected', comments }, { 
        headers, 
        timeout: 5000 
      });
      
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({
          ...prev,
          [rejectionData.type]: prev[rejectionData.type].map(f => (f._id === updated._id ? { ...f, ...updated } : f))
        }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Rejection failed');
    }
  };

  const handleDeleteKarkun = (form) => {
    setFormToDelete({ id: form._id, type: 'karkun', name: form.name });
    setShowDeleteKarkunModal(true);
  };

  const confirmDeleteKarkun = async () => {
    if (!formToDelete || formToDelete.type !== 'karkun') return;
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE_URL}/api/karkun/${formToDelete.id}`, { 
        headers, 
        timeout: 5000 
      });
      setMembershipData(prev => ({
        ...prev,
        karkun: prev.karkun.filter(f => f._id !== formToDelete.id)
      }));
      setSuccessMessage('Karkun application deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    } finally {
      setShowDeleteKarkunModal(false);
      setFormToDelete(null);
    }
  };

  const handleVerifyRukn = async (formId, status) => {
    if (status === 'rejected') {
      setRejectionData({ formId, type: 'rukn' });
      setShowRejectionModal(true);
      return;
    }
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(
        `${API_BASE_URL}/api/rukn/${formId}/verify/unit`,
        { status },
        { headers, timeout: 5000 }
      );
      const updated = res.data?.data;
      if (updated?._id) {
        setMembershipData(prev => ({
          ...prev,
          rukn: prev.rukn.map(f => (f._id === updated._id ? { ...f, ...updated } : f))
        }));
      } else {
        await loadMembershipData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Verification failed');
    }
  };

  const handleDeleteRukn = (form) => {
    setFormToDelete({ id: form._id, type: 'rukn', name: form.name });
    setShowDeleteRuknModal(true);
  };

  const confirmDeleteRukn = async () => {
    if (!formToDelete || formToDelete.type !== 'rukn') return;
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE_URL}/api/rukn/${formToDelete.id}`, { 
        headers, 
        timeout: 5000 
      });
      setMembershipData(prev => ({
        ...prev,
        rukn: prev.rukn.filter(f => f._id !== formToDelete.id)
      }));
      setSuccessMessage('Rukn application deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    } finally {
      setShowDeleteRuknModal(false);
      setFormToDelete(null);
    }
  };

  // Handle Rukn form navigation
  const handleViewRuknForm = (form) => {
    setSelectedRuknForm(form);
    setShowRuknForm(true);
  };

  const handleBackFromRuknForm = () => {
    setShowRuknForm(false);
    setSelectedRuknForm(null);
  };

  const loadDashboardOverview = async () => {
    if (!isMountedRef.current) return;
    try {
      setDashboardLoading(true);
      setDashboardError('');
      const token = localStorage.getItem('userToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/user/dashboard/overview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!isMountedRef.current) return;
      setDashboardData(response.data.data);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Unit dashboard overview error:', err);
      setDashboardError('Failed to load dashboard data');
    } finally {
      if (isMountedRef.current) setDashboardLoading(false);
    }
  };

  const loadActiveReportsList = async () => {
    if (!isMountedRef.current) return;
    try {
      setActiveReportsLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/api/user/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!isMountedRef.current) return;
      if (response.data?.success) {
        setActiveReportsList(response.data.data || []);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Unit active reports list error:', err);
    } finally {
      if (isMountedRef.current) setActiveReportsLoading(false);
    }
  };

  const loadUnitData = async () => {
    if (!isMountedRef.current) return;
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const headers = { Authorization: `Bearer ${token}` };

      if (userData?.areaId) {
        const unitsResp = await axios.get(
          `${API_BASE_URL}/api/user/hierarchy/units/${encodeURIComponent(userData.areaId)}`, 
          { headers, timeout: 5000 }
        );
        
        if (!isMountedRef.current) return;
        
        const units = unitsResp.data?.data || [];
        const found = units.find(u => (u.id || u._id || u.code) == unitId);
        
        if (found) {
          setUnit({
            id: found.id || found._id || found.code,
            name: found.title || found.name || unitId
          });
        } else {
          setUnit({ 
            id: unitId, 
            name: userData?.unit || userData?.unitName || unitId 
          });
        }

        if (userData?.districtId) {
          const areasResp = await axios.get(
            `${API_BASE_URL}/api/user/hierarchy/areas/${encodeURIComponent(userData.districtId)}`, 
            { headers, timeout: 5000 }
          );
          
          if (!isMountedRef.current) return;
          
          const areas = areasResp.data?.data || [];
          const areaFound = areas.find(a => (a.id || a._id || a.code) == userData.areaId);
          
          if (areaFound) {
            setArea({
              id: areaFound.id || areaFound._id || areaFound.code,
              name: areaFound.title || areaFound.name || userData.areaId
            });
          } else {
            if (userData?.area || userData?.areaName) {
              setArea({
                id: userData.areaId,
                name: userData.area || userData.areaName
              });
            }
          }
        }
      } else {
        if (isMountedRef.current) {
          const fallbackUnitName = userData?.unit || userData?.unitName || unitId;
          setUnit({ id: unitId, name: fallbackUnitName });
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (error.response?.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        navigate('/', { replace: true });
        return;
      }
      
      if (isMountedRef.current) {
        const fallbackData = JSON.parse(localStorage.getItem('userData') || '{}');
        setUnit({ id: unitId, name: fallbackData?.unit || fallbackData?.unitName || unitId });
      }
    }
  };

  const loadMembershipData = async () => {
    if (!isMountedRef.current) return;
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      setMembershipLoading(false);
      return;
    }

    try {
      setMembershipLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };

      const karkunResponse = await axios.get(
        `${API_BASE_URL}/api/karkun/unit/mine`,
        { headers, timeout: 5000 }
      );
      
      const ruknResponse = await axios.get(
        `${API_BASE_URL}/api/rukn/unit/mine`,
        { headers, timeout: 5000 }
      );

      if (!isMountedRef.current) return;

      setMembershipData({
        karkun: karkunResponse.data?.data || [],
        rukn: ruknResponse.data?.data || []
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (error.response?.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        navigate('/', { replace: true });
        return;
      }
      
      setMembershipData({ karkun: [], rukn: [] });
      if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load membership data');
      }
    } finally {
      if (isMountedRef.current) {
        setMembershipLoading(false);
      }
    }
  };


  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    // Mark component as unmounting to prevent further API calls
    isMountedRef.current = false;
    
    // Clear authentication data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    
    // Close modal
    setShowLogoutModal(false);
    
    // Call onLogout callback if provided (to update App.jsx state)
    if (onLogout) {
      onLogout();
    }
    
    // Navigate to LandingPage immediately
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
    setMonthFilter('');
    setCurrentPage(1);
  };

  const handleViewSurvey = async (survey) => {
    try {
      const token = localStorage.getItem('userToken');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/unit/unit-survey/${survey._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
      
      setViewingSurvey(response.data.survey);
      setShowDetailView(true);
    } catch (error) {
      setError('റിപ്പോർട്ട് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു');
    }
  };

  const handleEditSurvey = async (survey) => {
    try {
      const token = localStorage.getItem('userToken');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/unit/unit-survey/${survey._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
      
      setEditingSurvey(response.data.survey);
      setShowFormEdit(true);
    } catch (error) {
      setError('റിപ്പോർട്ട് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു');
    }
  };

  const handleDeleteSurvey = (survey) => {
    setSurveyToDelete(survey);
    setShowDeleteModal(true);
  };

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowCreateSurvey(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (surveyToDelete) {
        const endpoint = `${API_BASE_URL}/api/unit/unit-survey/${surveyToDelete._id}`;
          
        await axios.delete(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });
        
        setSuccessMessage(`${surveyToDelete.month} മാസത്തിലെ റിപ്പോർട്ട് വിജയകരമായി ഡിലീറ്റ് ചെയ്തു!`);
        setSurveyToDelete(null);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        loadMonthlySurveys();
      }
      
      setShowDeleteModal(false);
    } catch (error) {
      setError('റിപ്പോർട്ട് ഡിലീറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു');
    }
  };


  // Calculate statistics
  const unitStats = {
    totalMonthlySurveys: totalSurveys,
    surveysThisMonth: monthlySurveys.filter(s => {
      const surveyDate = new Date(s.submittedAt);
      const currentDate = new Date();
      return surveyDate.getMonth() === currentDate.getMonth() && 
             surveyDate.getFullYear() === currentDate.getFullYear();
    }).length,
    surveysThisYear: monthlySurveys.filter(s => {
      const surveyDate = new Date(s.submittedAt);
      const currentDate = new Date();
      return surveyDate.getFullYear() === currentDate.getFullYear();
    }).length,
    lastSubmission: monthlySurveys.length > 0 ? 
      new Date(Math.max(...monthlySurveys.map(s => new Date(s.submittedAt)))) : null
  };

  const monthlyData = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'].map(month => ({
    name: month,
    surveys: monthlySurveys.filter(s => s.month === month).length
  }));

  const filteredSurveys = monthlySurveys.filter(survey => {
    // Apply search filter
    const matchesSearch = !searchTerm || 
      survey.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.component?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.month?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey._id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply month filter
    const matchesMonth = !monthFilter || survey.month === monthFilter;
    
    return matchesSearch && matchesMonth;
  });

  // Define variables needed for conditional rendering
  const isUnitUser = userData?.role === 'unit';
  const sidebarActiveTab = activeTab;
  const unitName = unit?.name || userData?.unit || userData?.unitName || '—';
  const areaName = area?.name || userData?.area || userData?.areaName || '';
  const districtName = userData?.district || userData?.districtName || '';

  if (showDetailView && viewingSurvey) {
    const detailViewContent = (
      <div className="min-h-screen mt-6">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-0 py-2">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">യൂണിറ്റ് റിപ്പോർട്ടുകളുടെ വിശദാംശങ്ങൾ</h1>
              <p className="text-sm text-gray-600 font-medium mt-1">
                <span className="font-bold">{viewingSurvey.month}</span> {viewingSurvey.year} - {viewingSurvey.component}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setViewingSurvey(null);
                  setEditingSurvey(viewingSurvey);
                  setShowFormEdit(true);
                }}
                className="p-2 text-[#957C3D] border border-[#957C3D] rounded-xl hover:bg-gradient-to-r hover:from-[#957C3D] hover:to-[#8A6F35] hover:text-white transition-all duration-300 hover:shadow-md"
                title="Edit Report"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSurveyToDelete(viewingSurvey);
                  setShowDeleteModal(true);
                }}
                className="p-2 text-red-600 border border-red-600 rounded-xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white transition-all duration-300 hover:shadow-md"
                title="Delete Report"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setViewingSurvey(null);
                  setSelectedFormId(null);
                }}
                className="p-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 hover:text-white transition-all duration-300 hover:shadow-md"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Survey Details */}
        <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-2">
          <main>
            {/* Basic Information Container */}
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6 mb-8">
              <h3 className="text-lg font-semibold text-[#002349] mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.district || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.area || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Component</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.component || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.month || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.year || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Submitted At</label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">
                    {new Date(viewingSurvey.submittedAt).toLocaleDateString()} at{' '}
                    {new Date(viewingSurvey.submittedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            

            {/* Part A */}
            {(viewingSurvey.workers || viewingSurvey.partA) && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം A: Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ</h3>
                
                {/* Workers Information */}
                {viewingSurvey.workers && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">1</span>
                      പ്രവർത്തകർ (എണ്ണം)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">റുക്കുൻ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.workers.rukkun ?? 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">കർക്കുൻ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.workers.karkun ?? 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ആക്ടീവ് അസോസിയേറ്റ്‌സ്</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.workers.activeAssociate ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Codes */}
                {viewingSurvey.partA.codes && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">2</span>
                      A സ്‌കോഡുകൾ
                    </label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.partA.codes || '—'}</div>
                  </div>
                )}
                
                {/* Spoken Persons */}
                {viewingSurvey.partA.spokenPersons && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">3</span>
                      സംസാരിച്ച വ്യക്തികൾ ആണ്‍
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partA.spokenPersons.male ?? 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partA.spokenPersons.female ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Authority Persons Gender with Counts */}
                {viewingSurvey.partA.authorityPersonsGender && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">4</span>
                      ഏത് കാറ്റഗറിയിൽ പെട്ടവരോട് ആണ് പെട്ടവരോട് സംസാരിച്ചവർ (✓ മാർക്ക് ചെയ്യുക)
                    </label>
                    <div className="space-y-3">
                      {authorityPersonsOptions.map((option) => {
                        const genderData = viewingSurvey.partA.authorityPersonsGender?.[option.key] || { male: false, female: false };
                        const countData = viewingSurvey.partA.authorityPersonsCounts?.[option.key] || { male: 0, female: 0 };
                        const hasSelection = genderData.male || genderData.female;
                        const hasCounts = (typeof countData.male === 'number' && countData.male > 0) || (typeof countData.female === 'number' && countData.female > 0);
                        
                        if (!hasSelection && !hasCounts) return null;
                        
                        return (
                          <div key={option.key} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="text-sm font-medium text-gray-900 mb-3">{option.label}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Male Section */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">ആൺ</label>
                                {(genderData.male || (typeof countData.male === 'number' && countData.male > 0)) ? (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-blue-800">✓ Selected</span>
                                      <span className="text-sm font-semibold text-blue-900">{typeof countData.male === 'number' ? countData.male : 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                                )}
                              </div>
                              
                              {/* Female Section */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">പെൺ</label>
                                {(genderData.female || (typeof countData.female === 'number' && countData.female > 0)) ? (
                                  <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-pink-800">✓ Selected</span>
                                      <span className="text-sm font-semibold text-pink-900">{typeof countData.female === 'number' ? countData.female : 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Authority Other Text */}
                {viewingSurvey.partA.authorityOtherText && viewingSurvey.partA.authorityOtherText.trim() !== '' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">5</span>
                      മറ്റുള്ളവ (വ്യക്തമാക്കുക)
                    </label>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">{viewingSurvey.partA.authorityOtherText}</div>
                  </div>
                )}
              </div>
            )}
            {/* Part B */}
            {viewingSurvey.partB && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം B: പുതിയ അംഗങ്ങൾ</h3>
                
                {/* New JIH Members */}
                {viewingSurvey.partB.newJIHMembers && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">6</span>
                      പുതുതായി പ്രതിവാരയോഗത്തിൽ വന്നവർ
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partB.newJIHMembers.male ?? 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partB.newJIHMembers.female ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Member Categories with Gender and Counts */}
                {viewingSurvey.partB.memberCategoriesGender && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">7</span>
                      ഏത് കാറ്റഗരിയിൽപെട്ടവരാണ് വന്നത് (✓ മാർക്ക് ചെയ്യുക)
                    </label>
                    <div className="space-y-3">
                      {memberCategoriesOptions.map((option) => {
                        const genderData = viewingSurvey.partB.memberCategoriesGender?.[option.key] || { male: false, female: false };
                        const countData = viewingSurvey.partB.memberCategoriesCounts?.[option.key] || { male: 0, female: 0 };
                        const hasSelection = genderData.male || genderData.female;
                        const hasCounts = (typeof countData.male === 'number' && countData.male > 0) || (typeof countData.female === 'number' && countData.female > 0);
                        
                        if (!hasSelection && !hasCounts) return null;
                        
                        return (
                          <div key={option.key} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="text-sm font-medium text-gray-900 mb-3">{option.label}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Male Section */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">ആൺ</label>
                                {(genderData.male || (typeof countData.male === 'number' && countData.male > 0)) ? (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-blue-800">✓ Selected</span>
                                      <span className="text-sm font-semibold text-blue-900">{typeof countData.male === 'number' ? countData.male : 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                                )}
                              </div>
                              
                              {/* Female Section */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">പെൺ</label>
                                {(genderData.female || (typeof countData.female === 'number' && countData.female > 0)) ? (
                                  <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-pink-800">✓ Selected</span>
                                      <span className="text-sm font-semibold text-pink-900">{typeof countData.female === 'number' ? countData.female : 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm">—</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Part C */}
            {viewingSurvey.partC && viewingSurvey.partC.publicMeetingAttendees && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം C: പൊതുയോഗം</h3>
                
                {/* Public Meeting Attendees */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">8</span>
                    പ്രതിമാസ പൊതുയോഗത്തിൽ വന്നവർ
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ആൺ</label>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partC.publicMeetingAttendees.male ?? 0}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">പെൺ</label>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-center text-lg font-semibold">{viewingSurvey.partC.publicMeetingAttendees.female ?? 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Part D */}
            {viewingSurvey.partD && viewingSurvey.partD.growthAcceleration && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#002349] mb-4">ഭാഗം D: വർധനവ്</h3>
                
                {/* Growth Acceleration */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mr-2">9</span>
                    റിപ്പോർട്ട് കാലയളവിലെ വർധനവ് രേഖപ്പെടുത്തുക
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Rukkun */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-3">റുക്ൻ</label>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">പുരുഷൻ</label>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-900 text-center text-base font-semibold">
                            {typeof viewingSurvey.partD.growthAcceleration.rukkun === 'object' 
                              ? (viewingSurvey.partD.growthAcceleration.rukkun?.male || 0)
                              : (viewingSurvey.partD.growthAcceleration.rukkun || 0)
                            }
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">സ്ത്രീ</label>
                          <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-pink-900 text-center text-base font-semibold">
                            {typeof viewingSurvey.partD.growthAcceleration.rukkun === 'object' 
                              ? (viewingSurvey.partD.growthAcceleration.rukkun?.female || 0)
                              : 0
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Karkun */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-3">കാർകുൻ</label>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">പുരുഷൻ</label>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-900 text-center text-base font-semibold">
                            {typeof viewingSurvey.partD.growthAcceleration.karkun === 'object' 
                              ? (viewingSurvey.partD.growthAcceleration.karkun?.male || 0)
                              : (viewingSurvey.partD.growthAcceleration.karkun || 0)
                            }
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">സ്ത്രീ</label>
                          <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 text-pink-900 text-center text-base font-semibold">
                            {typeof viewingSurvey.partD.growthAcceleration.karkun === 'object' 
                              ? (viewingSurvey.partD.growthAcceleration.karkun?.female || 0)
                              : 0
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Solidarity - display total only */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-3">സോളിഡാരിറ്റി</label>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                        <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                          {typeof viewingSurvey.partD.growthAcceleration.solidarity === 'object' 
                            ? ((viewingSurvey.partD.growthAcceleration.solidarity?.male || 0) + (viewingSurvey.partD.growthAcceleration.solidarity?.female || 0))
                            : (viewingSurvey.partD.growthAcceleration.solidarity || 0)
                          }
                        </div>
                      </div>
                    </div>

                    {/* SIO - display total only */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-3">SIO</label>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                        <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                          {typeof viewingSurvey.partD.growthAcceleration.sio === 'object' 
                            ? ((viewingSurvey.partD.growthAcceleration.sio?.male || 0) + (viewingSurvey.partD.growthAcceleration.sio?.female || 0))
                            : (viewingSurvey.partD.growthAcceleration.sio || 0)
                          }
                        </div>
                      </div>
                    </div>

                    {/* GIO - display total only */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-3">GIO</label>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">മൊത്തം</label>
                        <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-base font-semibold">
                          {typeof viewingSurvey.partD.growthAcceleration.gio === 'object' 
                            ? ((viewingSurvey.partD.growthAcceleration.gio?.male || 0) + (viewingSurvey.partD.growthAcceleration.gio?.female || 0))
                            : (viewingSurvey.partD.growthAcceleration.gio || 0)
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    );

    // Wrap with sidebar if unit user
    if (isUnitUser) {
      return (
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
          <UnitAdminSidebar
            activeTab="monthly"
            onNavigate={handleSidebarNavigate}
            onLogout={handleLogout}
            onNotifications={handleNotificationsShortcut}
            onDynamicReports={handleDynamicReportsShortcut}
            onNavigateToMembership={handleNavigateToMembership}
            onReportTypeSelect={(type) => navigate('/user-reports', { state: { initialType: type } })}
            unitName={unitName}
            areaName={areaName}
            districtName={districtName}
            isMobileOpen={isUnitSidebarOpen}
            onMobileToggle={() => setIsUnitSidebarOpen((prev) => !prev)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <MobileTopBar
              title="യൂണിറ്റ് ഡാഷ്ബോർഡ്"
            />
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
              {detailViewContent}
            </div>
          </div>
        </div>
      );
    }

    return detailViewContent;
  }


  if (showFormEdit || showCreateSurvey) {
    
    
    return (
      <UnitSurveyPage
        onBack={() => {
        
          
          if (showCreateSurvey) {
            setShowCreateSurvey(false);
          } else {
            setShowFormEdit(false);
            setEditingSurvey(null);
          }
          // Reload surveys when going back
          loadMonthlySurveys();
        }}
        editingSurvey={showCreateSurvey ? null : editingSurvey}
      />
    );
  }

  // Show Karkun form if selected
  if (showKarkunForm && selectedKarkunForm) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 animate-fade-in">
          <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={handleBackFromKarkunForm}
                  className="text-gray-600 hover:text-[#002349] transition-all duration-500 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:border-[#002349] rounded-2xl hover:shadow-md transform hover:-translate-y-1 hover:scale-105 ease-out hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#002349]/10"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <img src={jihLogo} alt="JIH Logo" className="h-8 sm:h-12 w-auto animate-fade-in" />
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-[#002349]">Karkun Application</h1>
                  <p className="text-sm text-gray-600 font-medium">
                    {selectedKarkunForm.name} - {selectedKarkunForm.mobile}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Karkun Form */}
        <main className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500 animate-slide-in-up">
            <KarkunForm 
              initialData={selectedKarkunForm}
              isReadOnly={true}
              onBack={handleBackFromKarkunForm}
            />
          </div>
        </main>
      </div>
    );
  }

  // Show Rukn form if selected
  if (showRuknForm && selectedRuknForm) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 animate-fade-in">
          <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={handleBackFromRuknForm}
                  className="text-gray-600 hover:text-[#002349] transition-all duration-500 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:border-[#002349] rounded-2xl hover:shadow-md transform hover:-translate-y-1 hover:scale-105 ease-out hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#002349]/10"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <img src={jihLogo} alt="JIH Logo" className="h-8 sm:h-12 w-auto animate-fade-in" />
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-[#002349]">Rukn Application</h1>
                  <p className="text-sm text-gray-600 font-medium">
                    {selectedRuknForm.name} - {selectedRuknForm.mobile}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Rukn Form */}
        <main className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-500 animate-slide-in-up">
            <RuknForm 
              initialData={selectedRuknForm}
              isReadOnly={true}
              onBack={handleBackFromRuknForm}
            />
          </div>
        </main>
      </div>
    );
  }

  const pageContent = (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-6">

        {/* Dashboard Overview Tab */}
        {activeTab === 'dashboard' && (() => {
          const d = dashboardData || {};
          const submissionData = [
            { name: 'Submitted', value: d.submitted || 0 },
            { name: 'Pending', value: d.pending || 0 },
            { name: 'Not Started', value: d.notStarted || 0 },
          ];
          return (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] rounded-2xl p-6 text-white">
                <h2 className="text-xl font-bold">യൂണിറ്റ് ഡാഷ്ബോർഡ്</h2>
                {unitName !== '—' && <p className="text-white/80 text-sm mt-1">{unitName}</p>}
              </div>

              {dashboardLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                  <span className="ml-3 text-gray-600 font-medium">Loading...</span>
                </div>
              ) : dashboardError ? (
                <div className="text-center py-10">
                  <p className="text-red-500">{dashboardError}</p>
                  <button onClick={loadDashboardOverview} className="mt-3 px-4 py-2 bg-[#002349] text-white rounded-lg text-sm">Retry</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
                    <div className="bg-white rounded-2xl shadow border border-gray-100 p-2.5 sm:p-5 flex flex-col items-start gap-1.5 sm:gap-2 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#957C3D]" />
                      </div>
                      <p className="text-2xl font-bold text-[#957C3D]">{totalSurveys}</p>
                      <p className="w-full text-xs leading-tight text-gray-500 font-medium break-words [overflow-wrap:anywhere]">പ്രതിമാസ റിപ്പോർട്ടുകൾ</p>
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
                          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px", lineHeight: "1.6" }} formatter={(value, entry) => `${value}: ${entry.payload.value}`} />
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 -mx-4 sm:-mx-6 lg:-mx-8 px-2 sm:px-3 lg:px-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">
                  പ്രതിമാസ റിപ്പോർട്ട്
                </h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Total: {totalSurveys} monthly reports submitted by this unit
                </p>
              </div>
              <button
                onClick={handleCreateSurvey}
                className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl transition-all duration-500 flex items-center space-x-2 text-sm font-semibold hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
              >
                <FileText className="w-4 h-4" />
                <span>Create Monthly Report</span>
              </button>
            </div>

            {/* Inline Search & Filters (no container card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-1">Search</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 text-sm"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 group-hover:text-[#002349] transition-colors duration-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#002349] mb-1">Month</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50 text-sm"
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500 -mx-4 sm:-mx-6 lg:-mx-8">

              {filteredSurveys.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#002349] mb-2">No monthly reports found</h3>
                  <p className="text-gray-600 mb-2 font-medium">
                    {searchTerm || monthFilter 
                      ? 'No reports match your search criteria.' 
                      : 'No monthly reports submitted by this unit yet.'}
                  </p>
                  {monthlySurveys.length > 0 && filteredSurveys.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      (Found {monthlySurveys.length} report(s) but filtered out by search/filter)
                    </p>
                  )}
                  {monthlySurveys.length === 0 && totalSurveys > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      (API reports {totalSurveys} total survey(s) but none loaded)
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#002349] border-b border-[#002349]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Month
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Submitted By
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Submitted At
                          </th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wide">
                            Status
                          </th>
                          <th className="px-4 py-2 text-center text-[11px] font-semibold text-white uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredSurveys.map((survey, index) => (
                          <tr
                            key={survey._id}
                            onClick={() => handleViewSurvey(survey)}
                            className={`transition-colors duration-200 cursor-pointer ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                            } hover:bg-blue-50/60`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#957C3D] text-white shadow-sm">
                                {survey.month}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-900 align-middle">
                              <span className="font-semibold text-[#002349]">
                                {survey.submittedByName || survey.component || survey.submittedBy}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 font-medium align-middle">
                              {new Date(survey.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] text-gray-600 align-middle">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-800 shadow-sm">
                                Submitted
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-[13px] font-medium text-center align-middle">
                              <div className="inline-flex items-center justify-center space-x-2" style={{ pointerEvents: 'auto' }}>
                                {/* View Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSurvey(survey);
                                  }}
                                  className="p-2 text-[#002349] border border-[#002349] rounded-xl hover:bg-gradient-to-r hover:from-[#002349] hover:to-[#1a3a5c] hover:text-white transition-all duration-300 hover:shadow-md"
                                  title="View Report Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSurvey(survey);
                                  }}
                                  className="p-2 text-[#957C3D] border border-[#957C3D] rounded-xl hover:bg-gradient-to-r hover:from-[#957C3D] hover:to-[#8A6F35] hover:text-white transition-all duration-300 hover:shadow-md"
                                  title="Edit Report"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                
                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSurvey(survey);
                                  }}
                                  className="p-2 text-red-600 border border-red-600 rounded-xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white transition-all duration-300 hover:shadow-md"
                                  title="Delete Report"
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
                    <div className="px-4 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 font-medium">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-2xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300 font-medium"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-2xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300 font-medium"
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

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatisticsCard 
                title="Total Reports" 
                value={unitStats.totalMonthlySurveys} 
                subtitle="Monthly reports submitted" 
              />
              <StatisticsCard 
                title="This Month" 
                value={unitStats.surveysThisMonth} 
                subtitle="Reports this month" 
              />
              <StatisticsCard 
                title="This Year" 
                value={unitStats.surveysThisYear} 
                subtitle="Reports this year" 
              />
              <StatisticsCard 
                title="Last Submission" 
                value={unitStats.lastSubmission ? unitStats.lastSubmission.toLocaleDateString() : 'None'} 
                subtitle="Most recent report" 
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
                <SurveyBarChart
                  data={monthlyData}
                  title="Monthly Report Submissions"
                  dataKey1="surveys"
                  label1="Reports"
                />
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
                <h3 className="text-lg font-bold text-[#002349] mb-4">Unit Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unit Name:</span>
                    <span className="text-sm font-medium text-gray-900">{unit?.name || unitId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Area:</span>
                    <span className="text-sm font-medium text-gray-900">{area?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Reports:</span>
                    <span className="text-sm font-medium text-gray-900">{unitStats.totalMonthlySurveys}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Year:</span>
                    <span className="text-sm font-medium text-gray-900">{unitStats.surveysThisYear}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((unitStats.surveysThisYear / 12) * 100)}% 
                      <span className="text-gray-500 text-xs ml-1">
                        ({unitStats.surveysThisYear}/12 months)
                      </span>
                    </span>
                  </div>
                </div>
                
                {/* Quick Action */}
                <div className="mt-6 p-4 bg-green-50 rounded-2xl border-2 border-green-200 hover:shadow-md transition-all duration-300">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Quick Action</h4>
                  <p className="text-sm text-green-700 mb-3 font-medium">
                    {unitStats.surveysThisMonth === 0 
                      ? "Haven't submitted this month's report yet?" 
                      : "Want to update this month's data?"}
                  </p>
                  <button
                    onClick={() => {
                      setEditingSurvey(null);
                      setShowCreateSurvey(true);
                    }}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-2xl text-sm transition-all duration-500 flex items-center space-x-2 font-semibold hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out hover:shadow-green-500/50"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {unitStats.surveysThisMonth === 0 ? 'Submit Monthly Report' : 'Create New Monthly Report'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics Table - സ്ഥിതിവിവരക്കണക്കുകൾ */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-500">
              <h3 className="text-lg font-bold text-[#002349] mb-4">സ്ഥിതിവിവരക്കണക്കുകൾ</h3>
              <UnitMonthlyStatsTable surveys={monthlySurveys} />
            </div>
          </div>
        )}

        {/* Membership is now handled by dedicated MembershipPage route */}

        {successMessage && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4 animate-fade-in">
            <p className="text-red-600 text-sm font-semibold">{error}</p>
          </div>
        )}
      </main>

        {/* Confirmation Modals */}
        <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSurveyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="റിപ്പോർട്ട് ഡിലീറ്റ് ചെയ്യുക"
        message={`${surveyToDelete?.month} മാസത്തിലെ യൂണിറ്റ് റിപ്പോർട്ട് ഡിലീറ്റ് ചെയ്യാൻ താങ്കൾക്ക് തീർച്ചയാണോ? ഈ പ്രവർത്തനം പിന്നീട് തിരിച്ചെടുക്കാൻ കഴിയില്ല.`}
        confirmText="ഡിലീറ്റ് ചെയ്യുക"
        confirmColor="red"
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="ലോഗൗട്ട്"
        message="താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
        confirmText="ലോഗൗട്ട്"
        cancelText="റദ്ദാക്കുക"
        type="logout"
      />

      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setRejectionData(null);
        }}
        onConfirm={handleConfirmRejection}
        title="Reject Application"
        message="Please enter the reason for rejection:"
        confirmText="Reject"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={showDeleteKarkunModal}
        onClose={() => {
          setShowDeleteKarkunModal(false);
          setFormToDelete(null);
        }}
        onConfirm={confirmDeleteKarkun}
        title="Delete Karkun Application"
        message={`Are you sure you want to delete the Karkun application for ${formToDelete?.name || 'this applicant'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <ConfirmationModal
        isOpen={showDeleteRuknModal}
        onClose={() => {
          setShowDeleteRuknModal(false);
          setFormToDelete(null);
        }}
        onConfirm={confirmDeleteRukn}
        title="Delete Rukn Application"
        message={`Are you sure you want to delete the Rukn application for ${formToDelete?.name || 'this applicant'}? This action cannot be undone.`}
        confirmText="Delete"
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

  if (isUnitUser) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
        <UnitAdminSidebar
          activeTab={sidebarActiveTab}
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNotificationsShortcut}
          onDynamicReports={handleDynamicReportsShortcut}
          onNavigateToMembership={handleNavigateToMembership}
          onReportTypeSelect={(type) => navigate('/user-reports', { state: { initialType: type } })}
          unitName={unitName}
          areaName={areaName}
          districtName={districtName}
          isMobileOpen={isUnitSidebarOpen}
          onMobileToggle={() => setIsUnitSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileTopBar
            title="യൂണിറ്റ് ഡാഷ്ബോർഡ്"
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {pageContent}
          </div>
        </div>
      </div>
    );
  }

  return pageContent;
}
  
export default UnitDashboardPage;
