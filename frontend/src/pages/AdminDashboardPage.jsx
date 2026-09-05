import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Trash2, Download, MapPin, Calendar, TrendingUp, ArrowLeft, ChevronRight, LogOut, Edit, Bell, X, Eye, Plus, Check, Clock } from 'lucide-react';
import { JihFilterBar, JihFilterSelect, JihToolbarAction } from '../components/JihToolbar';
import axios from 'axios';
import FormDetailPage from './FormDetailPage';

// Configure API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log('API_BASE_URL:', API_BASE_URL);


import FormPage from './FormPage';
import { FormProvider } from '../contexts/FormContext';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import jihLogo from '../assets/LogoColor.png';
import SurveyBarChart from '../components/charts/SurveyBarChart';
import SurveyPieChart from '../components/charts/SurveyPieChart';
import StatisticsCard from '../components/charts/StatisticsCard';
import DistrictMonthlyStatsTable from '../components/tables/DistrictMonthlyStatsTable';
import { downloadAllFormsPDF } from '../utils/newPdfGenerator.jsx';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import ConsolidationTab from '../components/admin/ConsolidationTab';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const AdminDashboardPage = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminData, setAdminData] = useState(null);
  const [forms, setForms] = useState([]);
  const [monthlySurveys, setMonthlySurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingForm, setEditingForm] = useState(null);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFormEdit, setShowFormEdit] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMonthlyDetail, setShowMonthlyDetail] = useState(false);
  const [viewingMonthlySurvey, setViewingMonthlySurvey] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' (legacy 'yearly'/'monthly' pages removed)
  const DISTRICT_PAGE_SIZE = 10;
  const [districtPage, setDistrictPage] = useState(1);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [districtFilterValue, setDistrictFilterValue] = useState('all');
  const [areaFilterValue, setAreaFilterValue] = useState('all');
  const [unitFilterValue, setUnitFilterValue] = useState('all');
  const [expandedDistrictReports, setExpandedDistrictReports] = useState({}); // Track which district rows have reports dropdown open
  const [expandedAreaReports, setExpandedAreaReports] = useState({}); // Track which area rows have reports dropdown open
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalForms, setTotalForms] = useState(0);
  const [totalSurveys, setTotalSurveys] = useState(0);

  // Statistics tab state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [summary, setSummary] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary' | 'table' | 'consolidation'
  const [districtMonthlySurveys, setDistrictMonthlySurveys] = useState([]);

  // ===== Helpers for monthly detail rendering =====
  const formatLabel = (key) => {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  };

  const BooleanBadge = ({ value }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
      {value ? 'Yes' : 'No'}
    </span>
  );

  const KeyValueGrid = ({ data }) => {
    if (!data) return null;
    if (Array.isArray(data)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {data.length === 0 ? <li className="text-gray-500">None</li> : data.map((item, idx) => (
            <li key={idx} className="break-words text-gray-800 text-xs">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof data !== 'object') {
      return <span className="text-gray-800 text-xs">{String(data ?? '')}</span>;
    }
    const entries = Object.entries(data || {});
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 bg-white/60 rounded px-2 py-1">
            <span className="text-gray-600 text-xs whitespace-pre-wrap break-all min-w-[40%]">{formatLabel(k)}</span>
            <span className="text-gray-900 text-xs whitespace-pre-wrap break-all">
              {typeof v === 'boolean' ? (
                <BooleanBadge value={v} />
              ) : Array.isArray(v) ? (
                <KeyValueGrid data={v} />
              ) : typeof v === 'object' && v !== null ? (
                <KeyValueGrid data={v} />
              ) : (
                String(v ?? '')
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // On mount: read admin data and handle one-time navigation state for active tab
  useEffect(() => {
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      setAdminData(JSON.parse(storedAdminData));
    }
    
    let shouldClearState = false;

    // Apply activeTab from navigation state once, then clear it to avoid sticky tab
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      shouldClearState = true;
    }

    // Open notifications view if requested by navigation state - now handled by route
    if (location.state?.showNotifications) {
      navigate('/notifications', { replace: true });
      shouldClearState = true;
    }

    if (shouldClearState) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data whenever the active tab or filters change
  useEffect(() => {
    if (activeTab === 'yearly') {
      loadAllForms();
    } else if (activeTab === 'monthly') {
      loadAllMonthlySurveys();
    } else if (activeTab === 'stats') {
      loadMainStats();
      loadDistrictMonthlySurveys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtFilter, userFilter, monthFilter, activeTab]);

  // Separate effect for yearly forms pagination
  useEffect(() => {
    if (activeTab === 'yearly') {
      loadAllForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Yearly forms search: backend has no free-text search across district/submittedBy/id,
  // so widen the page size while a search term is active instead of only matching the
  // current 10-record page (debounced to avoid a fetch per keystroke).
  useEffect(() => {
    if (activeTab !== 'yearly') return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadAllForms();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadAllForms = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const hasSearch = searchTerm.trim().length > 0;
      const params = new URLSearchParams({
        page: hasSearch ? 1 : currentPage,
        limit: hasSearch ? 500 : 10
      });

      if (districtFilter) params.append('district', districtFilter);
      if (userFilter) params.append('submittedBy', userFilter);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/forms?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setForms(response.data.forms);
      setTotalPages(response.data.totalPages);
      setTotalForms(response.data.totalForms);
    } catch (error) {
      console.error('Error loading forms:', error);
      setError('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Statistics tab functions =====
  const loadMainStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('Main stats response:', response.data);
      setStats(response.data.stats);
      setSummary(response.data.summary || '');
    } catch (error) {
      console.error('Error loading main stats:', error);
      setStatsError('Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadDistrictMonthlySurveys = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/monthly-surveys/all-levels`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setDistrictMonthlySurveys(response.data.surveys || []);
    } catch (error) {
      console.error('Error loading district monthly surveys:', error);
    }
  };

  const loadAllMonthlySurveys = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      
      // Remove pagination - get all data at once
      // Apply filters if needed
      if (districtFilter) params.append('district', districtFilter);
      if (userFilter) params.append('submittedBy', userFilter);
      if (monthFilter) params.append('month', monthFilter);

      // Fetch first page to get total count
      params.append('page', '1');
      params.append('limit', '10000'); // Large limit to get most/all records

      const firstResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/monthly-surveys/all-levels?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      let allSurveys = firstResponse.data.surveys || [];
      const totalSurveys = firstResponse.data.totalSurveys || allSurveys.length;
      const totalPages = firstResponse.data.totalPages || 1;
      
      // If there are more pages, fetch them all
      if (totalPages > 1 && allSurveys.length < totalSurveys) {
        const remainingPages = [];
        for (let page = 2; page <= totalPages; page++) {
          const pageParams = new URLSearchParams(params);
          pageParams.set('page', page.toString());
          pageParams.set('limit', '10000');
          try {
            const pageResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/monthly-surveys/all-levels?${pageParams}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            remainingPages.push(...(pageResponse.data.surveys || []));
          } catch (err) {
            console.error(`Error fetching page ${page}:`, err);
          }
        }
        allSurveys = [...allSurveys, ...remainingPages];
      }
      
      setMonthlySurveys(allSurveys);
      setTotalSurveys(allSurveys.length);
      setTotalPages(1); // No pagination needed - all data loaded
    } catch (error) {
      console.error('Error loading monthly reports:', error);
      setError('Failed to load monthly reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setShowLogoutModal(false);
    // Call onLogout callback to update App.jsx state
    if (onLogout) {
      onLogout();
    }
    // Navigate to LandingPage after logout
    navigate('/', { replace: true });
  };

  // Handle notification navigation - navigate to notifications page
  const handleNavigateToNotifications = () => {
    navigate('/notifications');
  };


  const handleViewForm = (form) => {
    setSelectedFormId(form._id);
    setShowDetailView(true);
  };

  const handleEditForm = (form) => {
    setEditingForm(form);
    setShowFormEdit(true);
  };

  const handleDetailBack = () => {
    setShowDetailView(false);
    setSelectedFormId(null);
    setEditingForm(null);
  };

  const handleFormEditBack = () => {
    setShowFormEdit(false);
    setEditingForm(null);
  };

  const handleFormEditSubmit = (formData) => {
    setShowFormEdit(false);
    setEditingForm(null);
    loadAllForms();
  };

  const handleDetailEdit = (form) => {
    setShowDetailView(false);
    setSelectedFormId(null);
    setEditingForm(form);
    setShowFormEdit(true);
  };

  const handleDetailDelete = () => {
    setShowDetailView(false);
    setSelectedFormId(null);
    setEditingForm(null);
    loadAllForms();
  };

  const handleDeleteForm = (form) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (formToDelete) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/forms/${formToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormToDelete(null);
        loadAllForms();
      } else if (surveyToDelete) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/monthly-surveys/${surveyToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSurveyToDelete(null);
        loadAllMonthlySurveys();
      }
      
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting:', error);
      setError('Failed to delete item');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    if (activeTab === 'yearly') {
      loadAllForms();
    } else if (activeTab === 'monthly') {
      loadAllMonthlySurveys();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDistrictFilter('');
    setUserFilter('');
    setMonthFilter('');
    setCurrentPage(1);
  };

  const handleDownloadAllForms = async () => {
    try {
      setIsDownloading(true);
      // Get all forms without pagination for PDF generation
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        limit: 1000 // Get all forms
      });
      
      if (districtFilter) params.append('district', districtFilter);
      if (userFilter) params.append('submittedBy', userFilter);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/forms?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await downloadAllFormsPDF(response.data.forms);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredForms = forms.filter(form => 
    form.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===== Monthly helpers: hierarchical grouping, filters, and pagination =====
  const normalizeLevel = (s) => s?.submissionLevel || (s?.area ? 'area' : s?.component ? 'unit' : 'district');

  const monthlyHierarchy = React.useMemo(() => {
    const map = {};
    monthlySurveys.forEach((s) => {
      if (!s) return;
      const district = s.district || 'Unknown District';
      const area = s.areaName || s.area || 'Unknown Area';
      const unit = s.unitName || s.unit || s.component || 'Unknown Unit';
      const level = normalizeLevel(s);

      if (!map[district]) {
        map[district] = { districtReports: [], areas: {} };
      }

      if (level === 'district') {
        map[district].districtReports.push(s);
        return;
      }

      if (!map[district].areas[area]) {
        map[district].areas[area] = { areaReports: [], units: {} };
      }

      if (level === 'area') {
        map[district].areas[area].areaReports.push(s);
        return;
      }

      if (!map[district].areas[area].units[unit]) {
        map[district].areas[area].units[unit] = { unitReports: [] };
      }
      map[district].areas[area].units[unit].unitReports.push(s);
    });

    return map;
  }, [monthlySurveys]);

  const areaToDistrictMap = React.useMemo(() => {
    const map = {};
    Object.entries(monthlyHierarchy).forEach(([district, data]) => {
      Object.keys(data.areas || {}).forEach((area) => {
        map[area] = district;
      });
    });
    return map;
  }, [monthlyHierarchy]);

  const unitToAreaMap = React.useMemo(() => {
    const map = {};
    Object.entries(monthlyHierarchy).forEach(([district, data]) => {
      Object.entries(data.areas || {}).forEach(([area, areaData]) => {
        Object.keys(areaData.units || {}).forEach((unit) => {
          map[unit] = { area, district };
        });
      });
    });
    return map;
  }, [monthlyHierarchy]);

  const districtOptions = React.useMemo(
    () => ['all', ...Object.keys(monthlyHierarchy).sort()],
    [monthlyHierarchy]
  );

  const areaOptions = React.useMemo(() => {
    if (districtFilterValue !== 'all' && monthlyHierarchy[districtFilterValue]) {
      return ['all', ...Object.keys(monthlyHierarchy[districtFilterValue].areas || {}).sort()];
    }

    const areas = new Set();
    Object.values(monthlyHierarchy).forEach((data) => {
      Object.keys(data.areas || {}).forEach((a) => areas.add(a));
    });
    return ['all', ...Array.from(areas).sort()];
  }, [monthlyHierarchy, districtFilterValue]);

  const unitOptions = React.useMemo(() => {
    if (areaFilterValue !== 'all') {
      const district = areaToDistrictMap[areaFilterValue];
      const units = district ? monthlyHierarchy[district]?.areas?.[areaFilterValue]?.units || {} : {};
      return ['all', ...Object.keys(units).sort()];
    }

    const units = new Set();
    Object.values(monthlyHierarchy).forEach((data) => {
      Object.values(data.areas || {}).forEach((area) => {
        Object.keys(area.units || {}).forEach((u) => units.add(u));
      });
    });
    return ['all', ...Array.from(units).sort()];
  }, [monthlyHierarchy, areaFilterValue, areaToDistrictMap]);

  const surveyMatchesSearch = (payload) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      payload?.district?.toLowerCase().includes(q) ||
      payload?.area?.toLowerCase().includes(q) ||
      payload?.areaName?.toLowerCase().includes(q) ||
      payload?.unit?.toLowerCase().includes(q) ||
      payload?.unitName?.toLowerCase().includes(q) ||
      payload?.submittedBy?.toLowerCase().includes(q) ||
      payload?.submittedByName?.toLowerCase().includes(q) ||
      payload?._id?.toLowerCase().includes(q)
    );
  };

  const filteredDistricts = React.useMemo(() => {
    const districtMatchesSearch = (districtName, data) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      if (districtName?.toLowerCase().includes(q)) return true;

      // Search across area names
      const areaNames = Object.keys(data.areas || {});
      if (areaNames.some((a) => a.toLowerCase().includes(q))) return true;

      // Search across unit names
      const unitNames = [];
      Object.values(data.areas || {}).forEach((areaData) => {
        Object.keys(areaData.units || {}).forEach((u) => unitNames.push(u));
      });
      if (unitNames.some((u) => u.toLowerCase().includes(q))) return true;

      return false;
    };

    const allDistricts = Object.entries(monthlyHierarchy).map(([district, data]) => ({
      district,
      ...data
    }));

    return allDistricts
      .filter((d) => (districtFilterValue === 'all' ? true : d.district === districtFilterValue))
      .filter((d) => districtMatchesSearch(d.district, d));
  }, [monthlyHierarchy, districtFilterValue, searchTerm]);

  const totalDistrictPages = Math.max(1, Math.ceil(filteredDistricts.length / DISTRICT_PAGE_SIZE));
  const paginatedDistricts = filteredDistricts.slice(
    (districtPage - 1) * DISTRICT_PAGE_SIZE,
    districtPage * DISTRICT_PAGE_SIZE
  );

  const selectedDistrictData = selectedDistrict
    ? monthlyHierarchy?.[selectedDistrict] || null
    : null;

  const filteredAreas = React.useMemo(() => {
    if (!selectedDistrictData) return [];
    const entries = Object.entries(selectedDistrictData.areas || {}).map(([area, data]) => ({
      area,
      ...data
    }));

    return entries
      .filter((a) => (areaFilterValue === 'all' ? true : a.area === areaFilterValue))
      .filter((a) => surveyMatchesSearch({ area: a.area, district: selectedDistrict }));
  }, [selectedDistrict, selectedDistrictData, areaFilterValue, searchTerm]);

  const selectedAreaData =
    selectedDistrictData && (selectedArea || areaFilterValue !== 'all')
      ? selectedDistrictData.areas?.[selectedArea || areaFilterValue]
      : null;

  const filteredUnits = React.useMemo(() => {
    if (!selectedAreaData) return [];
    const entries = Object.entries(selectedAreaData.units || {}).map(([unit, data]) => ({
      unit,
      ...data
    }));

    return entries
      .filter((u) => (unitFilterValue === 'all' ? true : u.unit === unitFilterValue))
      .filter((u) =>
        surveyMatchesSearch({
          unit: u.unit,
          area: selectedArea || areaFilterValue,
          district: selectedDistrict
        })
      );
  }, [selectedArea, selectedAreaData, unitFilterValue, areaFilterValue, selectedDistrict, searchTerm]);

  const handleDistrictFilterChange = (value) => {
    setDistrictFilterValue(value);
    setSelectedDistrict(value === 'all' ? null : value);
    setAreaFilterValue('all');
    setSelectedArea(null);
    setUnitFilterValue('all');
    setSelectedUnit(null);
    setDistrictPage(1);
  };

  const handleAreaFilterChange = (value) => {
    if (value === 'all') {
      setAreaFilterValue('all');
      setSelectedArea(null);
      setUnitFilterValue('all');
      setSelectedUnit(null);
      setDistrictPage(1);
      return;
    }

    const owningDistrict = areaToDistrictMap[value];
    if (owningDistrict) {
      setDistrictFilterValue(owningDistrict);
      setSelectedDistrict(owningDistrict);
    }
    setAreaFilterValue(value);
    setSelectedArea(value);
    setUnitFilterValue('all');
    setSelectedUnit(null);
  };

  const handleUnitFilterChange = (value) => {
    if (value === 'all') {
      setUnitFilterValue('all');
      setSelectedUnit(null);
      return;
    }

    const location = unitToAreaMap[value];
    if (location?.district) {
      setDistrictFilterValue(location.district);
      setSelectedDistrict(location.district);
    }
    if (location?.area) {
      setAreaFilterValue(location.area);
      setSelectedArea(location.area);
    }
    setUnitFilterValue(value);
    setSelectedUnit(value);
  };

  const handleDistrictSelect = (districtName) => {
    handleDistrictFilterChange(districtName);
  };

  const handleAreaSelect = (areaName) => {
    if (!selectedDistrict) return;
    handleAreaFilterChange(areaName);
  };

  const handleUnitSelect = (unitName) => {
    if (!selectedDistrict || !selectedArea) return;
    handleUnitFilterChange(unitName);
  };

  useEffect(() => {
    setDistrictPage(1);
  }, [districtFilterValue, searchTerm]);

  useEffect(() => {
    if (districtPage > totalDistrictPages) {
      setDistrictPage(totalDistrictPages || 1);
    }
  }, [districtPage, totalDistrictPages]);

  const navigateToDetail = (survey) => {
    const level = normalizeLevel(survey);
    if (level === 'district') {
      navigate(`/monthly/district/${survey._id}`, { state: { survey } });
    } else if (level === 'area') {
      navigate(`/monthly/area/${survey._id}`, { state: { survey } });
    } else {
      navigate(`/monthly/unit/${survey._id}`, { state: { survey } });
    }
  };

  const handleReportNavigate = (surveyId) => {
    if (!surveyId) return;
    const survey = monthlySurveys.find((s) => s._id === surveyId);
    if (survey) {
      navigateToDetail(survey);
    }
  };

  const formatReportOptionLabel = (survey) => {
    const monthLabel = survey.month || '—';
    const submittedDate = survey.submittedAt
      ? new Date(survey.submittedAt).toLocaleDateString()
      : '—';
    const submittedBy = survey.submittedByName || survey.submittedBy || '';
    return `${monthLabel} • ${submittedDate}${submittedBy ? ` • ${submittedBy}` : ''}`;
  };

  const formatUnitReportOptionLabel = (report, unitName, areaName, districtName) => {
    const monthLabel = report.month || '—';
    const submittedDate = report.submittedAt
      ? new Date(report.submittedAt).toLocaleDateString()
      : '—';
    return `${monthLabel} • ${submittedDate} • ${unitName} • ${areaName} • ${districtName}`;
  };

  // Mobile top bar should name whichever tab is actually showing instead of a
  // static label, since the tab-specific headings below are hidden on mobile.
  // (showDetailView/showFormEdit render FormDetailPage/FormPage, which own
  // their own in-page titles, so the bar keeps the generic label there.)
  const mobileHeaderTitle = showDetailView || showFormEdit
    ? 'Admin Dashboard'
    : activeTab === 'yearly'
    ? 'Yearly Report'
    : activeTab === 'monthly'
    ? 'Monthly Report'
    : 'Statistics';

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateToReports={() => navigate('/view-reports')}
        onNavigateToNotifications={handleNavigateToNotifications}
        onLogout={handleLogout}
        adminEmail={adminData?.email || 'Admin'}
        totalForms={totalForms}
        totalSurveys={totalSurveys}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 box-border flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title={mobileHeaderTitle}
        />

      {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 relative z-0">
          {showDetailView ? (
            <FormDetailPage
              formId={selectedFormId}
              formData={editingForm}
              onBack={handleDetailBack}
              onEdit={handleDetailEdit}
              onDelete={handleDetailDelete}
              isAdmin={true}
            />
          ) : showFormEdit ? (
            <FormProvider>
              <FormPage
                onBack={handleFormEditBack}
                onSubmit={handleFormEditSubmit}
                editingForm={editingForm}
                isAdmin={true}
              />
            </FormProvider>
          ) : (
            <>
        {/* Content based on active tab */}
        {activeTab === 'yearly' && (
          <>
            {/* Header with Title, Download Button, and Search */}
        {(
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="hidden lg:block text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">വാർഷിക റിപ്പോർട്ട്</h2>
                <div className="w-full lg:w-auto lg:flex lg:items-center lg:gap-3">
                  <button
                    onClick={handleDownloadAllForms}
                    disabled={isDownloading || forms.length === 0}
                    className="hidden lg:flex bg-gradient-to-r from-[#957C3D] to-[#8A6F35] hover:from-[#8A6F35] hover:to-[#957C3D] disabled:from-gray-400 disabled:to-gray-400 text-white px-3 py-2 rounded-xl transition-all duration-500 items-center space-x-1.5 text-sm font-semibold hover:shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloading ? 'Generating...' : 'Download All PDF'}</span>
                  </button>
                  <JihFilterBar
                    className="lg:w-96"
                    search={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder="Search by district, user, or ID..."
                    actions={
                      <JihToolbarAction
                        icon={Download}
                        label={isDownloading ? 'Generating...' : 'Download All PDF'}
                        onClick={handleDownloadAllForms}
                        disabled={isDownloading || forms.length === 0}
                        className="lg:hidden"
                      />
                    }
                  />
                </div>
              </div>
        )}

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 mt-8">

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349] mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading forms...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No forms found</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        District
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted At
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredForms.map((form) => (
                      <tr
                        key={form._id}
                        className="hover:bg-gradient-to-br hover:from-[#002349]/5 hover:to-[#957C3D]/5 cursor-pointer transition-all duration-300 group border-l-4 border-transparent hover:border-[#002349]"
                        onClick={() => handleViewForm(form)}
                      >
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-[#002349]">
                          {form.district}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-700 font-semibold">
                          {form.submittedBy}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {new Date(form.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteForm(form)}
                              className="text-red-600 hover:text-white p-2.5 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-lg transition-all duration-500 transform hover:scale-110 hover:shadow-md"
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

              <div className="lg:hidden divide-y divide-gray-100">
                {filteredForms.map((form) => (
                  <div
                    key={form._id}
                    className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer active:bg-gray-50"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#002349] truncate">{form.district}</p>
                      <p className="text-sm text-gray-600 truncate">{form.submittedBy}</p>
                      <p className="text-xs text-gray-400">{new Date(form.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteForm(form); }}
                      className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                      aria-label="Delete form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 min-h-[44px] border border-gray-300 rounded-2xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300 font-medium"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 min-h-[44px] border border-gray-300 rounded-2xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300 font-medium"
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

        {/* Monthly Surveys Tab */}
        {activeTab === 'monthly' && (
          <>
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="hidden lg:block text-xl sm:text-2xl lg:text-4xl font-bold text-[#002349]">പ്രതിമാസ റിപ്പോർട്ട്</h2>
                <p className="text-sm text-gray-600">Browse monthly reports by district, area, and unit.</p>
              </div>
            </div>

            <JihFilterBar
              className="mb-4"
              search={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search by district, area, unit, or ID..."
              activeFilterCount={[districtFilterValue, areaFilterValue, unitFilterValue].filter(v => v && v !== 'all').length}
              gridClass="sm:grid-cols-3"
            >
              <JihFilterSelect icon={MapPin} value={districtFilterValue} onChange={(e) => handleDistrictFilterChange(e.target.value)}>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d === 'all' ? 'All Districts' : d}</option>
                ))}
              </JihFilterSelect>
              <JihFilterSelect icon={MapPin} value={areaFilterValue} onChange={(e) => handleAreaFilterChange(e.target.value)} disabled={areaOptions.length <= 1}>
                {areaOptions.map((a) => (
                  <option key={a} value={a}>{a === 'all' ? 'All Areas' : a}</option>
                ))}
              </JihFilterSelect>
              <JihFilterSelect icon={MapPin} value={unitFilterValue} onChange={(e) => handleUnitFilterChange(e.target.value)} disabled={unitOptions.length <= 1}>
                {unitOptions.map((u) => (
                  <option key={u} value={u}>{u === 'all' ? 'All Units' : u}</option>
                ))}
              </JihFilterSelect>
            </JihFilterBar>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                  <span className="ml-2 text-gray-600 font-medium">Loading monthly reports...</span>
                </div>
              ) : monthlySurveys.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#002349] mb-2">No monthly reports found</h3>
                  <p className="text-gray-600 font-medium">No monthly reports match your current filters.</p>
                </div>
              ) : (
                <>
                  {/* Hierarchical table rendering */}
                  {!selectedDistrict && areaFilterValue === 'all' && unitFilterValue === 'all' ? (
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#002349] text-white">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">District</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Areas</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">District Reports</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedDistricts.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">No districts found.</td>
                            </tr>
                          ) : (
                            paginatedDistricts.map((district) => {
                              const reports = [...(district.districtReports || [])].sort(
                                (a, b) =>
                                  new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                              );
                              const hasReports = reports.length > 0;
                              const isExpanded = expandedDistrictReports[district.district];

                              return (
                                <React.Fragment key={district.district}>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                      <div className="flex items-center gap-2">
                                        {hasReports && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedDistrictReports((prev) => ({
                                                ...prev,
                                                [district.district]: !prev[district.district]
                                              }));
                                            }}
                                            className="text-gray-500 hover:text-[#002349] transition-colors p-2 -m-2"
                                            title="Toggle district reports"
                                          >
                                            <ChevronRight
                                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                          </button>
                                        )}
                                        <span>{district.district}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{Object.keys(district.areas || {}).length}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      {hasReports ? `${reports.length} report${reports.length > 1 ? 's' : ''}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          onClick={() => handleDistrictSelect(district.district)}
                                          className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors"
                                        >
                                          View Areas
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && hasReports && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={4} className="px-6 py-4">
                                        <div className="space-y-2">
                                          <p className="text-xs font-semibold text-gray-700">District Reports</p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {reports.map((report) => (
                                              <div
                                                key={report._id}
                                                onClick={() => handleReportNavigate(report._id)}
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#002349] hover:bg-blue-50 cursor-pointer transition-colors"
                                              >
                                                <p className="text-sm font-medium text-gray-900">{formatReportOptionLabel(report)}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {!selectedDistrict && areaFilterValue === 'all' && unitFilterValue === 'all' && (
                    <div className="lg:hidden divide-y divide-gray-100">
                      {paginatedDistricts.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-500">No districts found.</p>
                      ) : (
                        paginatedDistricts.map((district) => {
                          const reports = [...(district.districtReports || [])].sort(
                            (a, b) =>
                              new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                          );
                          const hasReports = reports.length > 0;
                          const isExpanded = expandedDistrictReports[district.district];

                          return (
                            <div key={district.district} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {hasReports && (
                                    <button
                                      onClick={() =>
                                        setExpandedDistrictReports((prev) => ({
                                          ...prev,
                                          [district.district]: !prev[district.district]
                                        }))
                                      }
                                      className="shrink-0 text-gray-500 hover:text-[#002349] p-2 -m-2"
                                      aria-label="Toggle district reports"
                                    >
                                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{district.district}</p>
                                    <p className="text-xs text-gray-500">
                                      {Object.keys(district.areas || {}).length} areas · {hasReports ? `${reports.length} report${reports.length > 1 ? 's' : ''}` : 'no reports'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDistrictSelect(district.district)}
                                  className="shrink-0 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors"
                                >
                                  View Areas
                                </button>
                              </div>
                              {isExpanded && hasReports && (
                                <div className="mt-3 space-y-2">
                                  {reports.map((report) => (
                                    <div
                                      key={report._id}
                                      onClick={() => handleReportNavigate(report._id)}
                                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#002349] hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                      <p className="text-sm font-medium text-gray-900">{formatReportOptionLabel(report)}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {selectedDistrict && (selectedArea || areaFilterValue !== 'all' || unitFilterValue !== 'all') ? (
                    // Units table
                    <div className="overflow-x-auto">
                      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedArea(null);
                            setAreaFilterValue('all');
                            setUnitFilterValue('all');
                            setSelectedUnit(null);
                          }}
                          className="text-gray-600 hover:text-[#002349] transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Areas
                        </button>
                        <div className="text-sm text-gray-600">
                          Units in <span className="font-semibold text-[#002349]">{selectedArea || areaFilterValue}</span> — {selectedDistrict}
                        </div>
                      </div>
                      <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#002349] text-white">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Reports</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUnits.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-6 py-6 text-center text-sm text-gray-500">
                                No unit reports found for this area.
                              </td>
                            </tr>
                          ) : (
                            filteredUnits.map((unit) => {
                              const unitReports = [...(unit.unitReports || [])].sort(
                                (a, b) =>
                                  new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                              );
                              return (
                                <tr key={`${unit.unit}-${selectedArea || areaFilterValue}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{unit.unit}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    {unitReports.length ? `${unitReports.length} report${unitReports.length > 1 ? 's' : ''}` : '—'}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    {unitReports.length === 0 ? (
                                      <span className="text-gray-400 text-sm">No reports</span>
                                    ) : (
                                      <select
                                        defaultValue=""
                                        className="w-full md:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002349] bg-white shadow-sm"
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleReportNavigate(e.target.value);
                                            e.target.value = '';
                                          }
                                        }}
                                      >
                                        <option value="">Select unit report...</option>
                                        {unitReports.map((report) => (
                                          <option key={report._id} value={report._id}>
                                            {formatUnitReportOptionLabel(
                                              report,
                                              unit.unit,
                                              selectedArea || areaFilterValue,
                                              selectedDistrict
                                            )}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                      </div>
                      <div className="lg:hidden divide-y divide-gray-100">
                        {filteredUnits.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-gray-500">No unit reports found for this area.</p>
                        ) : (
                          filteredUnits.map((unit) => {
                            const unitReports = [...(unit.unitReports || [])].sort(
                              (a, b) =>
                                new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                            );
                            return (
                              <div key={`${unit.unit}-${selectedArea || areaFilterValue}-card`} className="px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900">{unit.unit}</p>
                                <p className="text-xs text-gray-500 mb-2">
                                  {unitReports.length ? `${unitReports.length} report${unitReports.length > 1 ? 's' : ''}` : 'No reports'}
                                </p>
                                {unitReports.length > 0 && (
                                  <select
                                    defaultValue=""
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 min-h-[44px] text-base focus:outline-none focus:ring-2 focus:ring-[#002349] bg-white shadow-sm"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleReportNavigate(e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    <option value="">Select unit report...</option>
                                    {unitReports.map((report) => (
                                      <option key={report._id} value={report._id}>
                                        {formatUnitReportOptionLabel(
                                          report,
                                          unit.unit,
                                          selectedArea || areaFilterValue,
                                          selectedDistrict
                                        )}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    // Area table
                    <div className="overflow-x-auto">
                      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedDistrict(null);
                            setDistrictFilterValue('all');
                            setAreaFilterValue('all');
                            setUnitFilterValue('all');
                            setSelectedArea(null);
                            setSelectedUnit(null);
                            setDistrictPage(1);
                          }}
                          className="text-gray-600 hover:text-[#002349] transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Districts
                        </button>
                        <div className="text-sm text-gray-600">
                          Areas in <span className="font-semibold text-[#002349]">{selectedDistrict}</span>
                        </div>
                      </div>
                      <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#002349] text-white">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Area</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Units</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Area Reports</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredAreas.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">
                                No areas found for this district.
                              </td>
                            </tr>
                          ) : (
                            filteredAreas.map((area) => {
                              const areaReports = [...(area.areaReports || [])].sort(
                                (a, b) =>
                                  new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                              );
                              const hasReports = areaReports.length > 0;
                              const areaKey = `${selectedDistrict}-${area.area}`;
                              const isExpanded = expandedAreaReports[areaKey];

                              return (
                                <React.Fragment key={areaKey}>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                      <div className="flex items-center gap-2">
                                        {hasReports && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedAreaReports((prev) => ({
                                                ...prev,
                                                [areaKey]: !prev[areaKey]
                                              }));
                                            }}
                                            className="text-gray-500 hover:text-[#002349] transition-colors p-2 -m-2"
                                            title="Toggle area reports"
                                          >
                                            <ChevronRight
                                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                          </button>
                                        )}
                                        <span>{area.area}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      {Object.keys(area.units || {}).length}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      {hasReports ? `${areaReports.length} report${areaReports.length > 1 ? 's' : ''}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          onClick={() => handleAreaSelect(area.area)}
                                          className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors"
                                        >
                                          View Units
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && hasReports && (
                                    <tr className="bg-gray-50">
                                      <td colSpan={4} className="px-6 py-4">
                                        <div className="space-y-2">
                                          <p className="text-xs font-semibold text-gray-700">Area Reports</p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {areaReports.map((report) => (
                                              <div
                                                key={report._id}
                                                onClick={() => handleReportNavigate(report._id)}
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#002349] hover:bg-blue-50 cursor-pointer transition-colors"
                                              >
                                                <p className="text-sm font-medium text-gray-900">{formatReportOptionLabel(report)}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                      </div>
                      <div className="lg:hidden divide-y divide-gray-100">
                        {filteredAreas.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-gray-500">No areas found for this district.</p>
                        ) : (
                          filteredAreas.map((area) => {
                            const areaReports = [...(area.areaReports || [])].sort(
                              (a, b) =>
                                new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
                            );
                            const hasReports = areaReports.length > 0;
                            const areaKey = `${selectedDistrict}-${area.area}-card`;
                            const isExpanded = expandedAreaReports[areaKey];

                            return (
                              <div key={areaKey} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {hasReports && (
                                      <button
                                        onClick={() =>
                                          setExpandedAreaReports((prev) => ({
                                            ...prev,
                                            [areaKey]: !prev[areaKey]
                                          }))
                                        }
                                        className="shrink-0 text-gray-500 hover:text-[#002349] p-2 -m-2"
                                        aria-label="Toggle area reports"
                                      >
                                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                      </button>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{area.area}</p>
                                      <p className="text-xs text-gray-500">
                                        {Object.keys(area.units || {}).length} units · {hasReports ? `${areaReports.length} report${areaReports.length > 1 ? 's' : ''}` : 'no reports'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleAreaSelect(area.area)}
                                    className="shrink-0 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    View Units
                                  </button>
                                </div>
                                {isExpanded && hasReports && (
                                  <div className="mt-3 space-y-2">
                                    {areaReports.map((report) => (
                                      <div
                                        key={report._id}
                                        onClick={() => handleReportNavigate(report._id)}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#002349] hover:bg-blue-50 cursor-pointer transition-colors"
                                      >
                                        <p className="text-sm font-medium text-gray-900">{formatReportOptionLabel(report)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pagination for districts view only */}
                  {!selectedDistrict && areaFilterValue === 'all' && unitFilterValue === 'all' && totalDistrictPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700 font-medium">
                        Page {districtPage} of {totalDistrictPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDistrictPage((prev) => Math.max(1, prev - 1))}
                          disabled={districtPage === 1}
                          className="px-3 py-1 min-h-[44px] border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setDistrictPage((prev) => Math.min(totalDistrictPages, prev + 1))}
                          disabled={districtPage === totalDistrictPages}
                          className="px-3 py-1 min-h-[44px] border border-gray-300 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200"
                        >
                          Next
                        </button>
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
          <div className="space-y-4">
            {/* Sub-tab bar — always visible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveSubTab('summary')}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeSubTab === 'summary'
                      ? 'bg-[#002349] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setActiveSubTab('table')}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeSubTab === 'table'
                      ? 'bg-[#002349] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setActiveSubTab('consolidation')}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeSubTab === 'consolidation'
                      ? 'bg-[#002349] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Consolidation / കൺസോളിഡേഷൻ
                </button>
              </div>
            </div>

            {/* Consolidation sub-tab — independent of stats data */}
            {activeSubTab === 'consolidation' && <ConsolidationTab />}

            {/* Summary / Table sub-tabs — need stats data */}
            {activeSubTab !== 'consolidation' && (
              statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349]"></div>
                <span className="ml-2 text-gray-600 font-medium">Loading statistics...</span>
              </div>
            ) : statsError ? (
              <div className="text-center py-12">
                <p className="text-red-600 font-semibold">{statsError}</p>
              </div>
            ) : !stats ? (
              <div className="text-center py-12">
                <p className="text-gray-600 font-medium">No statistics available</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-[#002349]/10 to-[#957C3D]/10 border-2 border-gray-200 rounded-2xl p-4 text-gray-800 hover:shadow-md transition-all duration-300">
                  <p className="text-sm font-medium">
                    This page shows overall progress across all districts. Cards show totals, and charts help compare districts and months in a simple way.
                  </p>
                </div>

                {/* AI Summary */}
                {activeSubTab === 'summary' && summary && (
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                    <div className="text-sm text-gray-800 font-medium">{summary}</div>
                  </div>
                )}

                {/* Statistics View */}
                {activeSubTab === 'summary' && (
                  <>
                    {/* Overview Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                      <StatisticsCard
                        title="Total Districts"
                        value={stats.overall?.totalDistricts || 0}
                        subtitle="Active districts"
                        icon={MapPin}
                        color="blue"
                      />
                      <StatisticsCard
                        title="Yearly Surveys"
                        value={stats.overall?.totalYearlySurveys || 0}
                        subtitle="Submitted"
                        icon={Calendar}
                        color="red"
                      />
                      <StatisticsCard
                        title="Monthly Reports"
                        value={stats.overall?.totalMonthlySurveys || 0}
                        subtitle="This year"
                        icon={TrendingUp}
                        color="green"
                      />
                    </div>

                    {/* Population Overview */}
                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                      <h3 className="text-lg font-semibold text-[#002349] mb-3">Population Overview</h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-[#002349]">
                            {stats.overall?.totalPopulation?.toLocaleString() || 0}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">Total Population</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-[#957C3D]/20 to-[#8A6F35]/20 rounded-lg">
                          <div className="text-2xl font-bold text-[#957C3D]">
                            {Math.round((stats.overall?.totalPopulation || 0) / (stats.overall?.totalDistricts || 1))}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">Avg per District</div>
                        </div>
                      </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                        <SurveyBarChart
                          data={stats.overall?.districtComparison?.map(district => ({
                            name: district.district,
                            monthlyCount: district.monthlyCount
                          })) || []}
                          title="Monthly Submissions by District"
                          dataKey1="monthlyCount"
                          label1="Monthly Submissions"
                        />
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                        <SurveyPieChart
                          data={[
                            { name: 'Yearly Reports', value: stats.overall?.totalYearlySurveys || 0 },
                            { name: 'Monthly Reports', value: stats.overall?.totalMonthlySurveys || 0 }
                          ]}
                          title="Yearly vs Monthly Reports"
                        />
                      </div>
                    </div>

                    {/* Additional Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                        <SurveyBarChart
                          data={Object.entries(stats.overall?.monthlySubmissionsByMonth || {}).map(([month, count]) => ({
                            name: month,
                            submissions: count
                          }))}
                          title="Submissions per Month (All Districts)"
                          dataKey1="submissions"
                          label1="Submissions"
                          color1="#10B981"
                        />
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                        <SurveyBarChart
                          data={stats.overall?.districtComparison?.map(district => ({
                            name: district.district,
                            yearly: district.yearlySubmitted ? 1 : 0,
                            monthly: district.monthlyCount
                          })) || []}
                          title="Submission Status by District"
                          dataKey1="yearly"
                          dataKey2="monthly"
                          label1="Yearly Submitted"
                          label2="Monthly Count"
                        />
                      </div>
                    </div>

                    {/* District Details Table */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-[#002349]">District-wise Details</h3>
                      </div>
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                District
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Yearly Survey
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Monthly Count
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {stats.overall?.districtComparison?.map((district, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#002349]">
                                  {district.district}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    district.yearlySubmitted
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {district.yearlySubmitted ? 'Submitted' : 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                                    {district.monthlyCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="lg:hidden divide-y divide-gray-100">
                        {stats.overall?.districtComparison?.map((district, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#002349] truncate">{district.district}</p>
                              <p className="text-xs text-gray-500">Monthly: {district.monthlyCount}</p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              district.yearlySubmitted
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {district.yearlySubmitted ? 'Submitted' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Table View */}
                {activeSubTab === 'table' && (
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 relative z-0">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-bold text-[#002349]">District Table</h3>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#002349] text-white border border-[#002349] shadow-sm font-semibold">District</span>
                      </div>
                      <div className="relative z-0">
                        <DistrictMonthlyStatsTable 
                          surveys={districtMonthlySurveys}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}
          </div>
        )}
            </>
          )}
      </main>
      </div>

      {/* Monthly Survey Detail Modal removed in favor of dedicated pages */}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setFormToDelete(null);
          setSurveyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={formToDelete ? "Delete Yearly report" : "Delete Monthly report"}
        message={`Are you sure you want to delete the ${formToDelete ? 'yearly report' : 'monthly report'} from ${(formToDelete || surveyToDelete)?.district}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout from the admin dashboard?"
        confirmText="Logout"
        cancelText="Cancel"
        type="logout"
      />

    </div>
  );
};

export default AdminDashboardPage;