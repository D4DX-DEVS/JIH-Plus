import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Search,
  MapPin,
  Check,
  X,
  Trash2,
  Eye,
  Menu,
  Clock
} from 'lucide-react';
import RejectionModal from '../components/modals/RejectionModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import SuggestionModal from '../components/modals/SuggestionModal';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_LABELS = {
  unitAdmin: 'Unit',
  areaAdmin: 'Area',
  districtAdmin: 'District',
  stateAdmin: 'State'
};

const ROLE_CONFIG = {
  admin: {
    key: 'admin',
    title: 'State Membership Review',
    tokenKey: 'adminToken',
    fetchers: {
      karkun: `${API_BASE_URL}/api/karkun/state/mine`,
      rukn: `${API_BASE_URL}/api/rukn/state/mine`
    },
    verifyPath: (type, id) => `${API_BASE_URL}/api/${type}/${id}/verify/state`,
    deletePath: (type, id) => `${API_BASE_URL}/api/${type}/${id}/admin`,
    allowRukn: true,
    canDelete: true,
    filters: { search: true, district: true, status: true },
    approvals: {
      currentLevel: 'stateAdmin',
      previous: ['unitAdmin', 'areaAdmin', 'districtAdmin']
    }
  },
  district: {
    key: 'district',
    title: 'District Membership Desk',
    subtitle: 'Review applications escalated from areas and units',
    tokenKey: 'userToken',
    fetchers: {
      karkun: `${API_BASE_URL}/api/karkun/district/mine`,
      rukn: `${API_BASE_URL}/api/rukn/district/mine`
    },
    verifyPath: (type, id) => `${API_BASE_URL}/api/${type}/${id}/verify/district`,
    deletePath: (type, id) => `${API_BASE_URL}/api/${type}/${id}`,
    allowRukn: true,
    canDelete: true,
    filters: { search: true, district: false, status: true },
    approvals: {
      currentLevel: 'districtAdmin',
      previous: ['unitAdmin', 'areaAdmin'],
      ruknNeedsSuggestion: true
    }
  },
  area: {
    key: 'area',
    title: 'Area Membership Desk',
    subtitle: 'Verify karkun applications from units',
    tokenKey: 'userToken',
    fetchers: {
      karkun: `${API_BASE_URL}/api/karkun/area/mine`
    },
    verifyPath: (type, id) => `${API_BASE_URL}/api/${type}/${id}/verify/area`,
    deletePath: (type, id) => `${API_BASE_URL}/api/${type}/${id}`,
    allowRukn: false,
    canDelete: true,
    filters: { search: false, district: false, status: false },
    approvals: {
      currentLevel: 'areaAdmin',
      previous: ['unitAdmin']
    }
  },
  unit: {
    key: 'unit',
    title: 'Unit Membership Desk',
    subtitle: 'Initial screening for karkun and rukn applications',
    tokenKey: 'userToken',
    fetchers: {
      karkun: `${API_BASE_URL}/api/karkun/unit/mine`,
      rukn: `${API_BASE_URL}/api/rukn/unit/mine`
    },
    verifyPath: (type, id) => `${API_BASE_URL}/api/${type}/${id}/verify/unit`,
    deletePath: (type, id) => `${API_BASE_URL}/api/${type}/${id}`,
    allowRukn: true,
    canDelete: true,
    filters: { search: false, district: false, status: false },
    approvals: {
      currentLevel: 'unitAdmin',
      previous: []
    }
  }
};

const detectRole = () => {
  if (localStorage.getItem('adminToken')) return 'admin';
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // Check both 'role' and 'type' fields (backend uses 'type', but login might set 'role')
    return userData.role || userData.type || 'district';
  } catch {
    return 'district';
  }
};

const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem('userData') || '{}');
  } catch {
    return {};
  }
};

const getAdminData = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const StatusIcon = ({ status }) => {
  if (!status || status === 'pending') {
    return (
      <div className="flex items-center justify-center">
        <Clock className="w-4 h-4 text-yellow-600" />
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center justify-center">
        <Check className="w-4 h-4 text-green-600" />
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center justify-center">
        <X className="w-4 h-4 text-red-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Clock className="w-4 h-4 text-yellow-600" />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  if (!status) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Pending
      </span>
    );
  }

  const tone =
    status === 'approved'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const MembershipPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(() => {
    const detected = location.state?.roleHint || detectRole();
    console.log('MembershipPage - Initial role detection:', detected);
    return detected;
  });
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.district;
  
  // Update role if userData changes
  useEffect(() => {
    const currentRole = detectRole();
    if (currentRole !== role) {
      console.log('MembershipPage - Role changed from', role, 'to', currentRole);
      setRole(currentRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeType, setActiveType] = useState('karkun');
  const [membershipData, setMembershipData] = useState({ karkun: [], rukn: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suggestionTarget, setSuggestionTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Get user data for sidebar - use useMemo to ensure it's always available
  const userData = useMemo(() => getUserData(), []);
  const adminData = useMemo(() => getAdminData(), []);

  useEffect(() => {
    setActiveType(config.allowRukn ? 'karkun' : 'karkun');
    loadMembershipData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const loadMembershipData = async () => {
    const token = localStorage.getItem(config.tokenKey);
    if (!token) {
      setError('Authentication required. Please login again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };
      const requests = [];

      if (config.fetchers.karkun) {
        requests.push(
          axios.get(config.fetchers.karkun, { headers, timeout: 10000 })
        );
      } else {
        requests.push(Promise.resolve({ data: { data: [] } }));
      }

      if (config.allowRukn && config.fetchers.rukn) {
        requests.push(
          axios.get(config.fetchers.rukn, { headers, timeout: 10000 })
        );
      } else {
        requests.push(Promise.resolve({ data: { data: [] } }));
      }

      const [karkunRes, ruknRes] = await Promise.all(requests);

      setMembershipData({
        karkun: karkunRes.data?.data || karkunRes.data?.forms || [],
        rukn: config.allowRukn
          ? ruknRes.data?.data || ruknRes.data?.forms || []
          : []
      });
    } catch (apiError) {
      console.error('Membership load failed:', apiError);
      if (apiError.response?.status === 401) {
        localStorage.removeItem(config.tokenKey);
        setError('Session expired. Please login again.');
      } else if (apiError.code === 'ERR_NETWORK') {
        setError('Backend server unavailable. Please try again later.');
      } else {
        setError(apiError.response?.data?.message || 'Failed to load membership data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    const source = membershipData[activeType] || [];
    return source.filter((form) => {
      const matchesSearch =
        !config.filters?.search ||
        !searchTerm ||
        form.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.district?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDistrict =
        !config.filters?.district ||
        !districtFilter ||
        form.district?.toLowerCase().includes(districtFilter.toLowerCase());

      const matchesStatus =
        !config.filters?.status ||
        !statusFilter ||
        (form.status?.toLowerCase() === statusFilter.toLowerCase() ||
          (statusFilter === 'pending' &&
            (!form.status || form.status === 'pending')));

      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [activeType, membershipData, config.filters, searchTerm, districtFilter, statusFilter]);

  const previousLevelsSatisfied = (form) => {
    const previous = config.approvals.previous || [];
    if (!form?.verification) return previous.length === 0;
    
    // For Rukn forms, exclude areaAdmin from previous levels check
    // (Rukn workflow: Unit → District → State, no Area step)
    const isRukn = activeType === 'rukn';
    const levelsToCheck = isRukn 
      ? previous.filter(level => level !== 'areaAdmin')
      : previous;
    
    if (levelsToCheck.length === 0) return true;
    
    return levelsToCheck.every(
      (levelKey) => form.verification[levelKey]?.status === 'approved'
    );
  };

  const hasNegativePrevious = (form) => {
    const previous = config.approvals.previous || [];
    
    // For Rukn forms, exclude areaAdmin from negative check
    const isRukn = activeType === 'rukn';
    const levelsToCheck = isRukn 
      ? previous.filter(level => level !== 'areaAdmin')
      : previous;
    
    return levelsToCheck.some(
      (levelKey) => form?.verification?.[levelKey]?.status === 'rejected'
    );
  };

  const isActionAllowed = (form) => {
    if (hasNegativePrevious(form)) return false;
    if (!previousLevelsSatisfied(form)) return false;
    const currentLevel = config.approvals.currentLevel;
    const currentStatus = form?.verification?.[currentLevel]?.status || 'pending';
    return currentStatus === 'pending';
  };

  const getToken = () => localStorage.getItem(config.tokenKey);

  const performVerification = async (type, formId, payload = {}) => {
    const token = getToken();
    if (!token) {
      setError('Authentication required.');
      return;
    }
    try {
      const endpoint = config.verifyPath(type, formId);
      await axios.put(
        endpoint,
        payload,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      await loadMembershipData();
      setSuccessMessage('Status updated successfully.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (apiError) {
      console.error('Verification failed:', apiError);
      setError(apiError.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleApprove = (type, form) => {
    if (
      config.approvals.ruknNeedsSuggestion &&
      type === 'rukn'
    ) {
      setSuggestionTarget(form);
      return;
    }
    performVerification(type, form._id, { status: 'approved' });
  };

  const handleReject = (type, form) => {
    setRejectionTarget({ type, formId: form._id });
  };

  const handleConfirmRejection = async (comments) => {
    if (!rejectionTarget) return;
    await performVerification(rejectionTarget.type, rejectionTarget.formId, {
      status: 'rejected',
      comments
    });
    setRejectionTarget(null);
  };

  const handleSuggestionConfirm = async (suggestion) => {
    if (!suggestionTarget) return;
    await performVerification('rukn', suggestionTarget._id, {
      status: 'approved',
      opinion: suggestion,
      comments: suggestion
    });
    setSuggestionTarget(null);
  };

  const handleDelete = (type, form) => {
    if (!config.canDelete) return;
    setDeleteTarget({ type, formId: form._id, name: form.name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const token = getToken();
    if (!token) {
      setError('Authentication required.');
      return;
    }
    try {
      await axios.delete(config.deletePath(deleteTarget.type, deleteTarget.formId), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      await loadMembershipData();
      setSuccessMessage('Application removed successfully.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (apiError) {
      console.error('Delete failed:', apiError);
      setError(apiError.response?.data?.message || 'Failed to delete application.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleView = (type, form) => {
    navigate(type === 'karkun' ? `/karkun/${form._id}` : `/rukn/${form._id}`);
  };

  // Sidebar navigation handlers
  const handleSidebarNavigate = (viewId) => {
    setIsSidebarOpen(false);
    if (viewId === 'membership') {
      // Already on membership page
      return;
    }
    
    // Navigate based on role
    if (role === 'admin') {
      navigate('/admin-dashboard', { state: { activeTab: viewId } });
    } else if (role === 'district') {
      // Get district dashboard path
      const userData = getUserData();
      const districtId = userData?.districtId || userData?.district_id;
      const districtDashboardPath = districtId ? `/district-dashboard/${districtId}` : '/district-dashboard';
      navigate(districtDashboardPath, { state: { activeView: viewId } });
    } else if (role === 'area') {
      const userData = getUserData();
      const areaId = userData?.areaId || userData?.area_id || userData?.areaCode || userData?.area;
      const areaDashboardPath = areaId ? `/area-dashboard/${areaId}` : '/area-dashboard';
      navigate(areaDashboardPath, { state: { initialTab: viewId } });
    } else if (role === 'unit') {
      const userData = getUserData();
      const unitId = userData?.unitId || userData?.unit_id || userData?.unit;
      const unitDashboardPath = unitId ? `/unit-dashboard/${unitId}` : '/unit-dashboard';
      navigate(unitDashboardPath, { state: { initialTab: viewId } });
    }
  };

  const handleNavigateToMembership = () => {
    // Already on membership page, just close sidebar
    setIsSidebarOpen(false);
  };

  const handleNavigateToNotifications = () => {
    setIsSidebarOpen(false);
    navigate('/notifications');
  };

  const handleNavigateToReports = () => {
    setIsSidebarOpen(false);
    if (role === 'admin') {
      navigate('/view-reports');
    } else {
      navigate('/user-reports');
    }
  };

  const handleDynamicReports = () => {
    setIsSidebarOpen(false);
    navigate('/user-reports');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    // Clear all auth data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    
    // Close modal
    setShowLogoutModal(false);
    
    // Use window.location.href for complete logout and page reload
    // This ensures all React state is cleared and user is redirected to landing page
    window.location.href = '/';
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const emptyState = (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-[#002349]">No applications found</h3>
      <p className="text-sm text-gray-600 mt-2">
        Adjust your filters or check back later.
      </p>
    </div>
  );

  // Render appropriate sidebar based on role
  const renderSidebar = () => {
    // Ensure we have a valid role
    const currentRole = role || detectRole();
    
    if (currentRole === 'admin') {
      return (
        <AdminSidebar
          activeTab="membership"
          onTabChange={handleSidebarNavigate}
          onNavigateToReports={handleNavigateToReports}
          onDownloadCSV={() => {}}
          onNavigateToNotifications={handleNavigateToNotifications}
          onNavigateToMembership={handleNavigateToMembership}
          onLogout={handleLogout}
          adminEmail={adminData?.email || 'Admin'}
          totalForms={0}
          totalSurveys={0}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'district') {
      return (
        <DistrictAdminSidebar
          activeView="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          districtName={userData?.district || userData?.districtName || '—'}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'area') {
      return (
        <AreaAdminSidebar
          activeTab="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          areaName={userData?.area || userData?.areaName || '—'}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    } else if (currentRole === 'unit') {
      return (
        <UnitAdminSidebar
          activeTab="membership"
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onNotifications={handleNavigateToNotifications}
          onDynamicReports={handleDynamicReports}
          onNavigateToMembership={handleNavigateToMembership}
          unitName={userData?.unit || userData?.unitName || '—'}
          areaName={userData?.area || userData?.areaName || ''}
          districtName={userData?.district || userData?.districtName || ''}
          isMobileOpen={isSidebarOpen}
          onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      );
    }
    
    // Fallback: If role is not detected, show district sidebar as default
    console.warn('MembershipPage - Role not detected, using district as fallback');
    return (
      <DistrictAdminSidebar
        activeView="membership"
        onNavigate={handleSidebarNavigate}
        onLogout={handleLogout}
        onNotifications={handleNavigateToNotifications}
        onDynamicReports={handleDynamicReports}
        onNavigateToMembership={handleNavigateToMembership}
        districtName={userData?.district || userData?.districtName || '—'}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
    );
  };

  // Ensure sidebar is always rendered
  const sidebarElement = renderSidebar();
  
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      {sidebarElement || (
        <div className="fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl border-r border-gray-200">
          <div className="p-4 text-red-600">Sidebar Error: Role not detected</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile menu toggle */}
        <div className="lg:hidden px-4 pt-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur px-4 py-2 text-sm font-semibold text-[#002349] shadow-md"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4 space-y-5 min-w-0">
        {/* Page Heading with Filters */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#002349] mb-2 break-words">
              അംഗത്വ അപേക്ഷകൾ
            </h1>
            <p className="text-gray-600">
              {config.subtitle}
            </p>
          </div>

          {/* Karkun and Rukn Tabs in top right (not for area) */}
          {role !== 'area' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveType('karkun')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeType === 'karkun'
                    ? 'bg-[#002349] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Karkun ({membershipData.karkun.length})
              </button>
              {config.allowRukn && (
                <button
                  onClick={() => setActiveType('rukn')}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeType === 'rukn'
                      ? 'bg-[#957C3D] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rukn ({membershipData.rukn.length})
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
            {successMessage}
          </div>
        )}

        {/* Filters horizontally below tabs */}
        {(config.filters?.search || config.filters?.district || config.filters?.status) && (
          <div className="flex flex-wrap items-center gap-3">
            {config.filters?.search && (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent bg-white"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            )}
            {config.filters?.district && (
              <div className="relative">
                <input
                  type="text"
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  placeholder="District..."
                  className="pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent bg-white"
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            )}
            {config.filters?.status && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002349] focus:border-transparent bg-white"
              >
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow-lg border border-gray-200 min-w-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#002349]" />
              <p className="text-gray-600 font-medium mt-4">Loading applications...</p>
            </div>
          ) : filteredData.length === 0 ? (
            emptyState
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed text-sm">
                <thead className="bg-gradient-to-r from-[#002349] to-[#1a3a5c]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-48">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-32">
                      Mobile
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-64">
                      Unit / Area / District
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border-l border-r border-white/20" colSpan={activeType === 'rukn' ? '3' : '4'}>
                      Review Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-32">
                      Final
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                  <tr className="bg-gradient-to-r from-[#002349] to-[#1a3a5c]">
                    <th colSpan="3"></th>
                    <th className="px-4 py-1.5 text-center text-xs font-medium text-white uppercase tracking-wider border-l border-white/20">
                      Unit
                    </th>
                    {activeType === 'karkun' && (
                      <th className="px-4 py-1.5 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Area
                      </th>
                    )}
                    <th className="px-4 py-1.5 text-center text-xs font-medium text-white uppercase tracking-wider">
                      District
                    </th>
                    <th className="px-4 py-1.5 text-center text-xs font-medium text-white uppercase tracking-wider border-r border-white/20">
                      State
                    </th>
                    <th colSpan="2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((form) => {
                    const canAct = isActionAllowed(form);
                    return (
                      <tr key={form._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-sm font-semibold text-[#002349] whitespace-nowrap">
                          {form.name || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {form.mobile || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          <div className="space-y-1">
                            <div>Unit: {form.halkhaName || form.localUnit || form.unitName || form.unit || '—'}</div>
                            <div>Area: {form.areaName || form.area || '—'}</div>
                            <div>District: {form.district || form.districtName || '—'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center border-l border-gray-200">
                          <StatusIcon status={form?.verification?.unitAdmin?.status} />
                        </td>
                        {activeType === 'karkun' && (
                          <td className="px-4 py-2 text-center">
                            <StatusIcon status={form?.verification?.areaAdmin?.status} />
                          </td>
                        )}
                        <td className="px-4 py-2 text-center">
                          <StatusIcon status={form?.verification?.districtAdmin?.status} />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-200">
                          <StatusIcon status={form?.verification?.stateAdmin?.status} />
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <StatusBadge status={form.status} />
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(activeType, form)}
                              className="p-2 rounded-lg border border-[#002349] text-[#002349] hover:bg-[#002349] hover:text-white transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canAct && (
                              <>
                                <button
                                  onClick={() => handleApprove(activeType, form)}
                                  className="p-2 rounded-lg border border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(activeType, form)}
                                  className="p-2 rounded-lg border border-red-600 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {config.canDelete && (
                              <button
                                onClick={() => handleDelete(activeType, form)}
                                className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete application"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <RejectionModal
        isOpen={!!rejectionTarget}
        onClose={() => setRejectionTarget(null)}
        onConfirm={handleConfirmRejection}
        title="Reject Application"
        message="Please provide the reason for rejection."
        confirmText="Reject"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Application"
        message={`Are you sure you want to delete the application${deleteTarget?.name ? ` for ${deleteTarget.name}` : ''}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <SuggestionModal
        isOpen={!!suggestionTarget}
        onClose={() => setSuggestionTarget(null)}
        onConfirm={handleSuggestionConfirm}
        title="Approval Note"
        message="Please enter your opinion before approving the Rukn application."
        confirmText="Approve"
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        type="logout"
      />
      </div>
    </div>
  );
};

export default MembershipPage;

