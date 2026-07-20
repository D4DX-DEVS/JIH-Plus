import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  Star,
  ClipboardList,
  BarChart2,
  Filter,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import jihLogo from '../assets/LogoColor.png';

const TYPE_LABELS = {
  monthly: 'മന്ത്ലി',
  yearly: 'ഇയർലി',
  special: 'സ്പെഷ്യൽ',
  quarterly: 'ക്വാർട്ടർലി'
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

const AdminDynamicSubmissionsPage = ({ onLogout }) => {
  const { type } = useParams(); // 'monthly' | 'yearly' | 'special'
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [reportForFilter, setReportForFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportIdFilter, setReportIdFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const validType = ['monthly', 'yearly', 'special', 'quarterly'].includes(type) ? type : 'monthly';
  const TypeIcon = TYPE_ICONS[validType] || ClipboardList;

  // Load admin data
  useEffect(() => {
    const stored = localStorage.getItem('adminData');
    if (stored) setAdminData(JSON.parse(stored));
  }, []);

  // Fetch submissions and report list whenever type changes
  useEffect(() => {
    fetchSubmissions();
    fetchReportList();
    // Reset filters on type change
    setSearchTerm('');
    setDistrictFilter('');
    setAreaFilter('');
    setUnitFilter('');
    setReportForFilter('');
    setStatusFilter('');
    setReportIdFilter('');
    setMonthFilter('');
    setYearFilter('');
    setCurrentPage(1);
  }, [validType]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ reportType: validType, limit: 1000 });
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/report-submissions?${params}`,
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
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/reports?limit=200&type=${validType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
  }, [districtFilter]);

  useEffect(() => {
    setUnitFilter('');
    setCurrentPage(1);
  }, [areaFilter]);

  // Apply all filters
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

    return result;
  }, [submissions, reportIdFilter, reportForFilter, statusFilter, monthFilter, yearFilter, districtFilter, areaFilter, unitFilter, searchTerm]);

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

  const hasActiveFilters = reportIdFilter || reportForFilter || statusFilter || districtFilter || areaFilter || unitFilter || searchTerm || monthFilter || yearFilter;

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
    setCurrentPage(1);
  };

  // Sidebar handlers
  const handleTabChange = (tabId) => {
    if (tabId === 'membership') {
      navigate('/membership', { state: { roleHint: 'admin' } });
      return;
    }
    if (['yearly', 'monthly', 'stats'].includes(tabId)) {
      navigate('/admin-dashboard', { state: { activeTab: tabId } });
    }
  };

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setShowLogoutModal(false);
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AdminSidebar
        activeTab="dynamic-submissions"
        onTabChange={handleTabChange}
        onNavigateToReports={() => navigate('/view-reports')}
        onNavigateToMembership={() => navigate('/membership', { state: { roleHint: 'admin' } })}
        onDownloadCSV={() => {}}
        onNavigateToNotifications={() => navigate('/notifications')}
        onLogout={handleLogout}
        adminEmail={adminData?.email || 'Admin'}
        totalForms={0}
        totalSurveys={0}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-[#002349] hover:bg-gray-100 rounded-lg p-2 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <img src={jihLogo} alt="JIH Logo" className="h-7 w-auto" />
              <h1 className="text-base font-bold text-[#002349]">{TYPE_LABELS[validType]} സബ്മിഷൻ</h1>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6">
          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[#002349]/10 rounded-lg">
                <TypeIcon className="w-6 h-6 text-[#002349]" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[#002349]">
                  ഡൈനാമിക് സബ്മിഷൻ — {TYPE_LABELS[validType]}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isLoading ? 'Loading...' : `${filteredSubmissions.length} submissions`}
                </p>
              </div>
            </div>

            {/* Type switcher tabs */}
            <div className="flex gap-2 mt-4">
              {(['monthly', 'yearly', 'quarterly', 'special']).map(t => {
                const TIcon = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => navigate(`/admin/dynamic-submissions/${t}`)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="ഡിസ്ട്രിക്ട്, ഏരിയ, യൂണിറ്റ്, റിപ്പോർട്ട് തലക്കെട്ട്... എന്നിവ തിരഞ്ഞ് നോക്കൂ"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent bg-white shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter bar */}
          <div className="mb-5 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-[#002349]" />
              <span className="text-xs font-semibold text-[#002349] uppercase tracking-wide">ഫിൽട്ടർ</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {/* District */}
              <select
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349] min-w-[160px]"
              >
                <option value="">എല്ലാ ജില്ലകളും</option>
                {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Area (only if district selected) */}
              {districtFilter && (
                <select
                  value={areaFilter}
                  onChange={e => setAreaFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349] min-w-[150px]"
                >
                  <option value="">എല്ലാ ഏരിയകളും</option>
                  {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}

              {/* Unit (only if area selected) */}
              {areaFilter && (
                <select
                  value={unitFilter}
                  onChange={e => setUnitFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349] min-w-[150px]"
                >
                  <option value="">എല്ലാ യൂണിറ്റുകളും</option>
                  {allUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}

              {/* Report For */}
              <select
                value={reportForFilter}
                onChange={e => { setReportForFilter(e.target.value); setCurrentPage(1); }}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">എല്ലാ ലെവലുകളും</option>
                <option value="district">ജില്ല</option>
                <option value="area">ഏരിയ</option>
                <option value="unit">യൂണിറ്റ്</option>
              </select>

              {/* Specific Report */}
              <select
                value={reportIdFilter}
                onChange={e => { setReportIdFilter(e.target.value); setCurrentPage(1); }}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349] min-w-[180px]"
              >
                <option value="">എല്ലാ റിപ്പോർട്ടുകളും</option>
                {reportList.map(r => (
                  <option key={r._id} value={r._id}>{r.title}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
              >
                <option value="">എല്ലാ സ്റ്റാറ്റസും</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
              </select>

              {/* Month filter — only for monthly type */}
              {validType === 'monthly' && (
                <select
                  value={monthFilter}
                  onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
                >
                  <option value="">എല്ലാ മാസവും</option>
                  <option value="1">ജനുവരി</option>
                  <option value="2">ഫെബ്രുവരി</option>
                  <option value="3">മാർച്ച്</option>
                  <option value="4">ഏപ്രിൽ</option>
                  <option value="5">മേയ്</option>
                  <option value="6">ജൂൺ</option>
                  <option value="7">ജൂലൈ</option>
                  <option value="8">ഓഗസ്റ്റ്</option>
                  <option value="9">സെപ്റ്റംബർ</option>
                  <option value="10">ഒക്‌ടോബർ</option>
                  <option value="11">നവംബർ</option>
                  <option value="12">ഡിസംബർ</option>
                </select>
              )}

              {/* Year filter — for monthly and yearly types */}
              {(validType === 'monthly' || validType === 'yearly') && (
                <select
                  value={yearFilter}
                  onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#002349]"
                >
                  <option value="">എല്ലാ വർഷവും</option>
                  {Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => 2024 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              <span className="ml-auto self-center text-sm font-semibold text-[#002349]">
                {filteredSubmissions.length} submissions
              </span>
            </div>
          </div>

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
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                              <button
                                onClick={() => navigate(`/report-submissions/${sub.reportId?._id || sub.reportId}`)}
                                className="text-xs px-3 py-1.5 bg-[#002349]/10 text-[#002349] rounded-lg hover:bg-[#002349]/20 font-medium transition-colors"
                              >
                                View
                              </button>
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
                <div className="flex items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                  <p className="text-xs text-gray-500">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)} of {filteredSubmissions.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
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
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <ConfirmationModal
          title="Logout"
          message="Are you sure you want to logout?"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
};

export default AdminDynamicSubmissionsPage;
