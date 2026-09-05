import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Star, ClipboardList, BarChart2, RefreshCw, Download, ArrowDownUp, MapPin, FileText } from 'lucide-react';
import { JihFilterBar, JihFilterSelect } from '../components/JihToolbar';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import SubmissionPreviewModal from '../components/reportRenderer/SubmissionPreviewModal';
import { downloadDynamicReportPdf } from '../utils/dynamicReportPdfGenerator';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const TYPE_LABELS = {
  monthly: 'പ്രതിമാസം',
  yearly: 'വാർഷികം',
  special: 'സ്പെഷ്യൽ',
  quarterly: 'ത്രൈമാസം'
};

const TYPE_ICONS = {
  monthly: Calendar,
  yearly: CalendarDays,
  special: Star,
  quarterly: BarChart2
};

const STATUS_BADGE = {
  submitted: 'bg-green-100 text-green-800 border border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  draft: 'bg-gray-100 text-gray-700 border border-gray-200'
};

const REPORT_FOR_BADGE = {
  district: 'bg-blue-100 text-blue-800',
  area: 'bg-purple-100 text-purple-800',
  unit: 'bg-orange-100 text-orange-800'
};

const ITEMS_PER_PAGE = 20;

// Per-scope behaviour: which API + token to use, which sidebar to render,
// and which hierarchy filters are relevant for that role.
const SCOPE_CONFIG = {
  admin: {
    submissionsEndpoint: '/api/admin/report-submissions',
    reportsEndpoint: '/api/admin/reports',
    tokenKey: 'adminToken',
    basePath: '/admin/dynamic-submissions',
    showDistrictFilter: true,
    showAreaFilter: true,
    showUnitFilter: true,
    showUserTypeFilter: true,
  },
  district: {
    submissionsEndpoint: '/api/user/report-submissions',
    reportsEndpoint: '/api/user/reports',
    tokenKey: 'userToken',
    basePath: '/district/dynamic-submissions',
    showDistrictFilter: false,
    showAreaFilter: true,
    showUnitFilter: true,
    showUserTypeFilter: true,
  },
  area: {
    submissionsEndpoint: '/api/user/report-submissions',
    reportsEndpoint: '/api/user/reports',
    tokenKey: 'userToken',
    basePath: '/area/dynamic-submissions',
    showDistrictFilter: false,
    showAreaFilter: false,
    showUnitFilter: true,
    showUserTypeFilter: false,
  },
};

const DynamicSubmissionsPage = ({ scope = 'admin', onLogout }) => {
  const { type } = useParams(); // 'monthly' | 'yearly' | 'special' | 'quarterly'
  const navigate = useNavigate();
  const location = useLocation();
  const config = SCOPE_CONFIG[scope] || SCOPE_CONFIG.admin;

  const [submissions, setSubmissions] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewSub, setPreviewSub] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState(location.state?.areaFilter || '');
  const [unitFilter, setUnitFilter] = useState(location.state?.unitFilter || '');
  const [reportForFilter, setReportForFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportIdFilter, setReportIdFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  // On phones the filter panel ate more than half the viewport, so it starts
  // collapsed behind its own toggle. Desktop keeps it permanently open.

  const validType = ['monthly', 'yearly', 'special', 'quarterly'].includes(type) ? type : 'monthly';
  const TypeIcon = TYPE_ICONS[validType] || ClipboardList;

  // Load stored identity for whichever role is viewing.
  useEffect(() => {
    if (scope === 'admin') {
      const stored = localStorage.getItem('adminData');
      if (stored) setAdminData(JSON.parse(stored));
    } else {
      const stored = localStorage.getItem('userData');
      if (stored) setUserData(JSON.parse(stored));
    }
  }, [scope]);

  // Fetch submissions and report list whenever type changes
  useEffect(() => {
    fetchSubmissions();
    fetchReportList();
    // Reset filters on type change (keep any incoming pre-filter only on first mount)
    setSearchTerm('');
    setDistrictFilter('');
    setAreaFilter('');
    setUnitFilter('');
    setReportForFilter('');
    setStatusFilter('');
    setReportIdFilter('');
    setMonthFilter('');
    setYearFilter('');
    setSortBy('newest');
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validType]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem(config.tokenKey);
      const params = new URLSearchParams({ reportType: validType, limit: 1000 });
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}${config.submissionsEndpoint}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setSubmissions(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Submissions load failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReportList = async () => {
    try {
      const token = localStorage.getItem(config.tokenKey);
      const url = scope === 'admin'
        ? `${import.meta.env.VITE_API_URL}${config.reportsEndpoint}?limit=200&type=${validType}`
        : `${import.meta.env.VITE_API_URL}${config.reportsEndpoint}?type=${validType}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setReportList(res.data.data || []);
    } catch (_) {}
  };

  // Derive unique dropdown values from loaded submissions
  const allDistricts = useMemo(() => {
    const set = new Set();
    submissions.forEach(s => {
      const d = s.userId?.districtName;
      if (d) set.add(d);
    });
    return [...set].sort();
  }, [submissions]);

  const allAreas = useMemo(() => {
    const set = new Set();
    submissions.forEach(s => {
      if (districtFilter && s.userId?.districtName !== districtFilter) return;
      const a = s.userId?.areaName;
      if (a) set.add(a);
    });
    return [...set].sort();
  }, [submissions, districtFilter]);

  const allUnits = useMemo(() => {
    const set = new Set();
    submissions.forEach(s => {
      if (districtFilter && s.userId?.districtName !== districtFilter) return;
      if (areaFilter && s.userId?.areaName !== areaFilter) return;
      const u = s.userId?.unitName;
      if (u) set.add(u);
    });
    return [...set].sort();
  }, [submissions, districtFilter, areaFilter]);

  // Reset area/unit when district changes
  useEffect(() => {
    setAreaFilter('');
    setUnitFilter('');
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtFilter]);

  // Apply all filters + sorting
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    if (reportIdFilter) {
      result = result.filter(s => s.reportId?._id === reportIdFilter || s.reportId === reportIdFilter);
    }
    if (reportForFilter) {
      result = result.filter(s => (s.reportId?.reportFor || '') === reportForFilter);
    }
    if (statusFilter) {
      result = result.filter(s => s.status === statusFilter);
    }
    if (monthFilter) {
      const m = Number(monthFilter);
      result = result.filter(s => s.month === m || s.reportId?.month === m);
    }
    if (yearFilter) {
      const y = Number(yearFilter);
      result = result.filter(s => s.year === y || s.reportId?.year === y);
    }
    if (districtFilter) {
      result = result.filter(s => s.userId?.districtName === districtFilter);
    }
    if (areaFilter) {
      result = result.filter(s => s.userId?.areaName === areaFilter);
    }
    if (unitFilter) {
      result = result.filter(s => s.userId?.unitName === unitFilter);
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(s => {
        const u = s.userId;
        if (!u) return false;
        return (
          (u.accessCode || '').toLowerCase().includes(lower) ||
          (u.districtName || '').toLowerCase().includes(lower) ||
          (u.areaName || '').toLowerCase().includes(lower) ||
          (u.unitName || '').toLowerCase().includes(lower) ||
          (s.reportId?.title || '').toLowerCase().includes(lower)
        );
      });
    }

    const dateOf = (s) => new Date(s.submittedAt || s.createdAt || 0).getTime();
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return dateOf(a) - dateOf(b);
        case 'title': return (a.reportId?.title || '').localeCompare(b.reportId?.title || '');
        case 'status': return (a.status || '').localeCompare(b.status || '');
        case 'newest':
        default: return dateOf(b) - dateOf(a);
      }
    });

    return result;
  }, [submissions, reportIdFilter, reportForFilter, statusFilter, monthFilter, yearFilter, districtFilter, areaFilter, unitFilter, searchTerm, sortBy]);

  useEffect(() => { setCurrentPage(1); }, [filteredSubmissions.length]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE));
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getUserDisplay = (sub) => {
    const u = sub.userId;
    if (!u) return '—';
    const reportFor = sub.reportId?.reportFor || '';
    const parts = [];
    if (u.districtName) parts.push(u.districtName);
    if (reportFor !== 'district' && u.areaName) parts.push(u.areaName);
    if (reportFor === 'unit' && u.unitName) parts.push(u.unitName);
    return parts.length ? parts.join(' / ') : u.accessCode || '—';
  };

  const handleExport = async (sub) => {
    if (!sub?.reportId || typeof sub.reportId !== 'object') {
      setError('Report structure unavailable for export.');
      return;
    }
    setDownloadingId(sub._id);
    try {
      const ctx = sub.userId || {};
      await downloadDynamicReportPdf(sub.reportId, sub, {
        district: ctx.districtName,
        area: ctx.areaName,
        unit: ctx.unitName,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const activeFilterCount = [reportIdFilter, reportForFilter, statusFilter, districtFilter, areaFilter, unitFilter, monthFilter, yearFilter].filter(Boolean).length;

  const hasActiveFilters = reportIdFilter || reportForFilter || statusFilter || districtFilter || areaFilter || unitFilter || searchTerm || monthFilter || yearFilter || sortBy !== 'newest';

  const clearAllFilters = () => {
    setSearchTerm('');
    setDistrictFilter('');
    setAreaFilter('');
    setUnitFilter('');
    setReportForFilter('');
    setStatusFilter('');
    setReportIdFilter('');
    setMonthFilter('');
    setYearFilter('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => {
    if (scope === 'admin') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
    } else {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    }
    setShowLogoutModal(false);
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  const renderSidebar = () => {
    const commonMobile = {
      isMobileOpen: isSidebarOpen,
      onMobileToggle: () => setIsSidebarOpen(prev => !prev),
      onLogout: handleLogout,
    };
    if (scope === 'district') {
      return (
        <DistrictAdminSidebar
          {...commonMobile}
          activeView={`submissions-${validType}`}
          districtName={userData?.district || userData?.districtName || '—'}
          onNotifications={() => navigate('/notifications')}
        />
      );
    }
    if (scope === 'area') {
      return (
        <AreaAdminSidebar
          {...commonMobile}
          activeTab={`submissions-${validType}`}
          areaName={userData?.area || userData?.areaName || '—'}
          districtName={userData?.district || userData?.districtName || ''}
          onNotifications={() => navigate('/notifications')}
        />
      );
    }
    return (
      <AdminSidebar
        {...commonMobile}
        activeTab="dynamic-submissions"
        onNavigateToReports={() => navigate('/view-reports')}
        onNavigateToNotifications={() => navigate('/notifications')}
        adminEmail={adminData?.email || 'Admin'}
        totalForms={0}
        totalSurveys={0}
      />
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      {renderSidebar()}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title={`${TYPE_LABELS[validType]} സബ്മിഷൻ`}
          actions={
            <button onClick={fetchSubmissions} className="ih-icon-btn hover:text-[#002349]" title="Refresh" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          {/* Page header */}
          <div className="mb-4 lg:mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 sm:p-2 bg-[#002349]/10 rounded-lg flex-shrink-0">
                <TypeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#002349]" />
              </div>
              <div className="min-w-0">
                {/* MobileTopBar already names this screen below lg; avoid a
                    second big title on mobile. */}
                <h1 className="hidden lg:block text-3xl font-bold text-[#002349] leading-tight">
                  സബ്മിഷനുകൾ — {TYPE_LABELS[validType]}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {isLoading ? 'Loading...' : `${filteredSubmissions.length} submissions`}
                </p>
              </div>
            </div>

            {/* Type switcher tabs — horizontally swipeable so it never wraps
                or clips on narrow phones. */}
            <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-1 mt-3 sm:mt-4">
              {(['monthly', 'yearly', 'quarterly', 'special']).map(t => {
                const TIcon = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => navigate(`${config.basePath}/${t}`)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap min-h-[44px] sm:min-h-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
                      validType === t
                        ? 'bg-[#002349] text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#002349]/40 hover:text-[#002349]'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" />
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
              <button
                onClick={fetchSubmissions}
                className="ml-auto hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <JihFilterBar
            className="mb-4 lg:mb-5"
            search={searchTerm}
            onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder="ഏരിയ, യൂണിറ്റ്, റിപ്പോർട്ട് തലക്കെട്ട്... എന്നിവ തിരഞ്ഞ് നോക്കൂ"
            activeFilterCount={activeFilterCount}
            onClear={clearAllFilters}
            gridClass="sm:grid-cols-3 lg:grid-cols-4"
          >
            {config.showDistrictFilter && (
              <JihFilterSelect icon={MapPin} value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}>
                <option value="">എല്ലാ ജില്ലകളും</option>
                {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </JihFilterSelect>
            )}
            {config.showAreaFilter && (!config.showDistrictFilter || districtFilter) && (
              <JihFilterSelect icon={MapPin} value={areaFilter} onChange={e => { setAreaFilter(e.target.value); setUnitFilter(''); setCurrentPage(1); }}>
                <option value="">എല്ലാ ഏരിയകളും</option>
                {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </JihFilterSelect>
            )}
            {config.showUnitFilter && (
              <JihFilterSelect icon={MapPin} value={unitFilter} onChange={e => { setUnitFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">എല്ലാ യൂണിറ്റുകളും</option>
                {allUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </JihFilterSelect>
            )}
            {config.showUserTypeFilter && (
              <JihFilterSelect value={reportForFilter} onChange={e => { setReportForFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">എല്ലാ ലെവലുകളും</option>
                <option value="district">ജില്ല</option>
                <option value="area">ഏരിയ</option>
                <option value="unit">യൂണിറ്റ്</option>
              </JihFilterSelect>
            )}
            <JihFilterSelect icon={FileText} value={reportIdFilter} onChange={e => { setReportIdFilter(e.target.value); setCurrentPage(1); }}>
              <option value="">എല്ലാ റിപ്പോർട്ടുകളും</option>
              {reportList.map(r => (
                <option key={r._id} value={r._id}>{r.title}</option>
              ))}
            </JihFilterSelect>
            <JihFilterSelect value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="">എല്ലാ സ്റ്റാറ്റസും</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
            </JihFilterSelect>
            <JihFilterSelect icon={ArrowDownUp} value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A–Z)</option>
              <option value="status">Status</option>
            </JihFilterSelect>
          </JihFilterBar>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-[#002349] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-500 text-sm">Loading submissions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl">
              <p>{error}</p>
              <button
                onClick={fetchSubmissions}
                className="mt-3 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium text-lg">
                {submissions.length === 0
                  ? `${TYPE_LABELS[validType]} ടൈപ്പ് സബ്മിഷനുകൾ ഒന്നും ലഭ്യമല്ല`
                  : 'ഫിൽട്ടർ ഉപയോഗിച്ച് ഒന്നും കണ്ടെത്തിയില്ല'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-6 py-2.5 bg-[#002349] text-white rounded-xl font-semibold text-sm hover:bg-[#1a3a5c] transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile list — title, user and actions only. No sideways scrolling. */}
              <div className="lg:hidden space-y-2.5">
                {paginatedSubmissions.map((sub) => {
                  const isDownloading = downloadingId === sub._id;
                  const canExport = sub.status === 'submitted' && typeof sub.reportId === 'object';
                  return (
                    <div key={sub._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold text-[#002349] leading-snug break-words">
                          {sub.reportId?.title || '—'}
                        </p>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                          {sub.status === 'submitted' ? 'Submitted' : sub.status === 'pending' ? 'Pending' : sub.status || '—'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 break-words">{getUserDisplay(sub)}</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => setPreviewSub(sub)}
                          className="flex-1 rounded-lg bg-[#002349]/10 px-3 py-2.5 text-xs font-semibold text-[#002349]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleExport(sub)}
                          disabled={!canExport || isDownloading}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 disabled:opacity-40"
                        >
                          {isDownloading ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Export
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#002349] to-[#1a3a5c] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">റിപ്പോർട്ട്</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Submitted</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedSubmissions.map((sub, idx) => {
                        const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                        const reportFor = sub.reportId?.reportFor || '';
                        const isDownloading = downloadingId === sub._id;
                        const canExport = sub.status === 'submitted' && typeof sub.reportId === 'object';
                        return (
                          <tr key={sub._id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400 font-mono">{rowNum}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-[#002349] leading-tight">
                                {sub.reportId?.title || '—'}
                              </div>
                              {sub.userId?.accessCode && (
                                <div className="text-xs text-gray-400 mt-0.5 font-mono">{sub.userId.accessCode}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-800">{getUserDisplay(sub)}</div>
                            </td>
                            <td className="px-4 py-3">
                              {reportFor && (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${REPORT_FOR_BADGE[reportFor] || 'bg-gray-100 text-gray-700'}`}>
                                  {reportFor === 'district' ? 'ജില്ല' : reportFor === 'area' ? 'ഏരിയ' : 'യൂണിറ്റ്'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                                {sub.status === 'submitted' ? 'Submitted' : sub.status === 'pending' ? 'Pending' : sub.status || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(sub.submittedAt || sub.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setPreviewSub(sub)}
                                  className="text-xs px-3 py-1.5 bg-[#002349]/10 text-[#002349] rounded-lg hover:bg-[#002349]/20 font-medium transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleExport(sub)}
                                  disabled={!canExport || isDownloading}
                                  title={canExport ? 'Export PDF' : 'Only submitted reports can be exported'}
                                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {isDownloading ? (
                                    <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Export</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                  <p className="text-xs text-gray-500">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)} of {filteredSubmissions.length}
                  </p>
                  <div className="flex items-center gap-2 self-center sm:self-auto">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-h-[44px] min-w-[44px] lg:h-9 lg:w-9 lg:min-h-0 lg:min-w-0 rounded-lg text-xs font-semibold transition-colors ${
                            currentPage === page
                              ? 'bg-[#002349] text-white shadow'
                              : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Submission detail modal */}
      <SubmissionPreviewModal
        open={!!previewSub}
        loading={false}
        data={previewSub ? { report: previewSub.reportId, submission: previewSub } : null}
        onClose={() => setPreviewSub(null)}
        onDownload={previewSub && previewSub.status === 'submitted' && typeof previewSub.reportId === 'object'
          ? () => handleExport(previewSub)
          : undefined}
        downloading={previewSub && downloadingId === previewSub._id}
      />

      {/* Logout confirmation modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        type="logout"
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        onConfirm={confirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </div>
  );
};

export default DynamicSubmissionsPage;
