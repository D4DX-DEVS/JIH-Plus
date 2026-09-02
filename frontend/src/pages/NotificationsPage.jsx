import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Calendar, AlertCircle, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import CreateNotificationModal from '../components/modals/CreateNotificationModal';
import NotificationDetailModal from '../components/modals/NotificationDetailModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import axios from 'axios';
import MobileTopBar from '../components/sidebars/MobileTopBar';

const NotificationsPage = ({ onBack, userData: propUserData, onNavigateTab, onLogout }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });
  const PAGE_SIZE = 10;
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [areaSidebarOpen, setAreaSidebarOpen] = useState(false);
  const [unitSidebarOpen, setUnitSidebarOpen] = useState(false);
  const [districtSidebarOpen, setDistrictSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load userData synchronously on mount if not provided as prop
  const [loadedUserData] = useState(() => {
    if (propUserData) return null;
    
    const storedAdminData = localStorage.getItem('adminData');
    const storedUserData = localStorage.getItem('userData');
    
    if (storedAdminData) {
      try {
        const parsed = JSON.parse(storedAdminData);
        return {
          role: parsed.role === 'superadmin' ? 'superadmin' : 'admin',
          email: parsed.email || parsed.username || 'Admin',
          name: parsed.name || 'Admin',
          districtId: 'admin',
          district: parsed.role === 'superadmin' ? 'Super Admin' : 'Admin',
          ...parsed
        };
      } catch (e) {
        return null;
      }
    } else if (storedUserData) {
      try {
        return JSON.parse(storedUserData);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const userData = propUserData || loadedUserData;
  const userRole = userData?.role;

  // Default tab depends on role — admins only ever have a "sent" view, units
  // only a "received" view. Computed synchronously so the very first fetch
  // uses the right filter (avoids a wrong-then-right race on mount).
  const [activeTab, setActiveTab] = useState(() => {
    if (userRole === 'admin' || userRole === 'superadmin') return 'sent';
    return 'received';
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userRole) {
      setLoading(false);
      return;
    }

    try {
      let token = (userRole === 'admin' || userRole === 'superadmin')
        ? localStorage.getItem('adminToken') 
        : localStorage.getItem('userToken');
      
      if (!token && (userRole === 'admin' || userRole === 'superadmin')) {
        token = localStorage.getItem('userToken');
      }
      
      if (!token) {
        setLoading(false);
        setError('Authentication required. Please login again.');
        return;
      }
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/notifications/my-notifications`,
        {
          params: { page, limit: PAGE_SIZE, filter: activeTab === 'sent' ? 'sent' : 'received' },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );

      setNotifications(response.data.notifications || []);
      setPagination(response.data.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 });
      setLoading(false);
      setError('');
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setNotifications([]);
        setError('');
        setLoading(false);
        return;
      }

      let errorMessage = 'Failed to load notifications. Please try again.';
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view notifications.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (userRole === 'admin' || userRole === 'superadmin') {
      setUnreadCount(0);
      return;
    }

    try {
      let token = (userRole === 'admin' || userRole === 'superadmin')
        ? localStorage.getItem('adminToken') 
        : localStorage.getItem('userToken');
      
      if (!token && (userRole === 'admin' || userRole === 'superadmin')) {
        token = localStorage.getItem('userToken');
      }

      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      setUnreadCount(0);
    }
  };

  // Reset to page 1 whenever the tab changes (each tab paginates independently)
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Fetch data when activeTab, userRole, or page changes
  useEffect(() => {
    if (!userRole) {
      setLoading(false);
      return;
    }

    const token = (userRole === 'admin' || userRole === 'superadmin')
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('userToken');

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    Promise.all([
      fetchNotifications(),
      fetchUnreadCount()
    ]).catch(() => {
      setLoading(false);
      setError('Failed to load notifications. Please try again.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userRole, page]);

  // Load adminData on mount
  useEffect(() => {
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      try {
        const parsed = JSON.parse(storedAdminData);
        setAdminData(parsed);
      } catch (e) {
        // Silent fail
      }
    } else if (userData?.email) {
      setAdminData({ email: userData.email });
    }
  }, [userData]);

  const handleTabChange = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
      return;
    }
    if (onBack) {
      onBack();
      return;
    }

    const isDistrictUser = userRole === 'district';
    const districtDashboardPath = userData?.districtId ? `/district-dashboard/${userData.districtId}` : '/district-dashboard';


    if (isDistrictUser) {
      const viewMap = {
        yearly: 'yearly-dashboard',
        monthly: 'monthly-dashboard',
        stats: 'stats',
        notifications: 'notifications'
      };
      const activeView = viewMap[tabId] || 'home';
      navigate(districtDashboardPath, { state: { activeView } });
      return;
    }

    navigate('/admin-dashboard', { state: { activeTab: tabId } });
  };

  const handleNavigateToReports = () => {
    if (onBack) {
      onBack();
    }
    navigate('/view-reports');
  };


  const handleDownloadCSV = () => {
    // Download CSV functionality
  };

  const handleNavigateToNotifications = () => {
    // Already here, but keep function for sidebar consistency
    setAdminSidebarOpen(false);
  };

  const handleLogoutClick = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    if (isUnitUser || isAreaUser || isDistrictUser) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      setShowLogoutModal(false);
      window.location.href = '/';
    } else if (isCentralAdmin) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      setShowLogoutModal(false);
      if (onLogout) {
        onLogout();
      }
      window.location.href = '/';
    } else {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      setShowLogoutModal(false);
      window.location.href = '/';
    }
  };

  const cancelLogout = () => setShowLogoutModal(false);

  const isCentralAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';
  const isAreaUser = userData?.role === 'area';
  const isUnitUser = userData?.role === 'unit';
  const isDistrictUser = userData?.role === 'district';
  const areaId =
    userData?.areaId ||
    userData?.area_id ||
    userData?.areaCode ||
    userData?.area;
  const areaName = userData?.area || userData?.areaName || userData?.districtArea || '—';
  const areaDashboardPath = areaId ? `/area-dashboard/${areaId}` : '/area-dashboard';

  const areaTabStateMap = {
    monthly: { initialTab: 'monthly' },
    units: { initialTab: 'units' },
    stats: { initialTab: 'stats' }
  };

  const goToAreaDashboard = (tabId) => {
    const state = areaTabStateMap[tabId] ? { ...areaTabStateMap[tabId] } : {};
    if (tabId === 'notifications') {
      state.showNotifications = true;
    }
    navigate(areaDashboardPath, { state });
  };

  const handleAreaSidebarNavigate = (viewId) => {
    setAreaSidebarOpen(false);
    if (viewId === 'notifications') {
      return;
    }
    if (viewId === 'dynamic-reports') {
      navigate('/user-reports');
      return;
    }
    goToAreaDashboard(viewId);
  };

  const handleAreaNotificationsShortcut = () => setAreaSidebarOpen(false);
  const handleAreaDynamicShortcut = () => {
    setAreaSidebarOpen(false);
    navigate('/user-reports');
  };

  // Unit user handlers
  const unitId = userData?.unitId || userData?.unit_id || userData?.unit;
  const unitName = userData?.unit || userData?.unitName || '—';
  const unitAreaName = userData?.area || userData?.areaName || '—';
  const unitDashboardPath = unitId ? `/unit-dashboard/${unitId}` : '/unit-dashboard';

  const goToUnitDashboard = (tabId) => {
    const state = { initialTab: tabId };
    if (tabId === 'notifications') {
      state.showNotifications = true;
    }
    navigate(unitDashboardPath, { state });
  };

  const handleUnitSidebarNavigate = (viewId) => {
    setUnitSidebarOpen(false);
    if (viewId === 'notifications') {
      return;
    }
    if (viewId === 'dynamic-reports') {
      navigate('/user-reports');
      return;
    }
    goToUnitDashboard(viewId);
  };

  const handleUnitNotificationsShortcut = () => setUnitSidebarOpen(false);
  const handleUnitDynamicShortcut = () => {
    setUnitSidebarOpen(false);
    navigate('/user-reports');
  };

  // District user handlers
  const districtName = userData?.district || userData?.districtName || '—';
  const districtId = userData?.districtId || userData?.district_id;
  const districtDashboardPath = districtId ? `/district-dashboard/${districtId}` : '/district-dashboard';

  const goToDistrictDashboard = (viewId) => {
    if (viewId === 'notifications') {
      return; // Already on notifications page
    }
    if (viewId === 'reports' || viewId === 'dynamic-reports') {
      navigate('/user-reports');
      return;
    }
    navigate(districtDashboardPath, { state: { activeView: viewId } });
  };

  const handleDistrictSidebarNavigate = (viewId) => {
    setDistrictSidebarOpen(false);
    goToDistrictDashboard(viewId);
  };

  const handleDistrictNotificationsShortcut = () => setDistrictSidebarOpen(false);
  const handleDistrictDynamicShortcut = () => {
    setDistrictSidebarOpen(false);
    navigate('/user-reports');
  };

  const shouldUseAdminLayout = isCentralAdmin && !onBack;

  const wrapWithAdminSidebar = (content) => (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AdminSidebar
        activeTab="notifications"
        onTabChange={handleTabChange}
        onNavigateToReports={handleNavigateToReports}
        onDownloadCSV={handleDownloadCSV}
        onNavigateToNotifications={handleNavigateToNotifications}
        onLogout={handleLogoutClick}
        adminEmail={adminData?.email || 'Admin'}
        totalForms={0}
        totalSurveys={0}
        isMobileOpen={adminSidebarOpen}
        onMobileToggle={() => setAdminSidebarOpen(!adminSidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithAreaSidebar = (content) => (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <AreaAdminSidebar
        activeTab="notifications"
        onNavigate={handleAreaSidebarNavigate}
        onLogout={handleLogoutClick}
        onNotifications={handleAreaNotificationsShortcut}
        onDynamicReports={handleAreaDynamicShortcut}
        areaName={areaName}
        districtName={districtName}
        isMobileOpen={areaSidebarOpen}
        onMobileToggle={() => setAreaSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="നോട്ടിഫിക്കേഷൻ"
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithUnitSidebar = (content) => (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <UnitAdminSidebar
        activeTab="notifications"
        onNavigate={handleUnitSidebarNavigate}
        onLogout={handleLogoutClick}
        onNotifications={handleUnitNotificationsShortcut}
        onDynamicReports={handleUnitDynamicShortcut}
        unitName={unitName}
        areaName={unitAreaName}
        districtName={districtName}
        isMobileOpen={unitSidebarOpen}
        onMobileToggle={() => setUnitSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="നോട്ടിഫിക്കേഷൻ"
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithDistrictSidebar = (content) => (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
      <DistrictAdminSidebar
        activeView="notifications"
        onNavigate={handleDistrictSidebarNavigate}
        onLogout={handleLogoutClick}
        onNotifications={handleDistrictNotificationsShortcut}
        onDynamicReports={handleDistrictDynamicShortcut}
        districtName={districtName}
        isMobileOpen={districtSidebarOpen}
        onMobileToggle={() => setDistrictSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar
          title="നോട്ടിഫിക്കേഷൻ"
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const markAsRead = async (notificationId) => {
    try {
      let token = (userData?.role === 'admin' || userData?.role === 'superadmin')
        ? localStorage.getItem('adminToken') 
        : localStorage.getItem('userToken');
      
      if (!token && (userData?.role === 'admin' || userData?.role === 'superadmin')) {
        token = localStorage.getItem('userToken');
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, hasRead: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silent fail
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      let token = (userData?.role === 'admin' || userData?.role === 'superadmin')
        ? localStorage.getItem('adminToken') 
        : localStorage.getItem('userToken');
      
      if (!token && (userData?.role === 'admin' || userData?.role === 'superadmin')) {
        token = localStorage.getItem('userToken');
      }

      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      // Silent fail
    }
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecipientsText = (recipients) => {
    const parts = [];
    if (recipients.areas?.length > 0) {
      parts.push(`${recipients.areas.length} area${recipients.areas.length > 1 ? 's' : ''}`);
    }
    if (recipients.units?.length > 0) {
      parts.push(`${recipients.units.length} unit${recipients.units.length > 1 ? 's' : ''}`);
    }
    if (recipients.district) {
      parts.push('district admin');
    }
    return parts.join(', ');
  };

  const handleNotificationCreated = () => {
    setShowCreateModal(false);
    setEditingNotification(null);
    fetchNotifications();
  };

  const openCreateModal = () => {
    setEditingNotification(null);
    setShowCreateModal((prev) => !prev);
  };

  const openEditModal = (notification) => {
    setEditingNotification(notification);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingNotification(null);
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > (pagination.totalPages || 1)) return;
    setPage(newPage);
  };

  const showReceivedTab = userData?.role !== 'admin' && userData?.role !== 'superadmin';
  const showSentTab =
    userData?.role === 'admin' ||
    userData?.role === 'superadmin' ||
    userData?.role === 'district' ||
    userData?.role === 'area';

  // Empty state helpers for clearer, role-based messages
  const getEmptyStateTitle = () => {
    if (activeTab === 'sent') {
      if (userData?.role === 'admin' || userData?.role === 'superadmin') {
        return 'No notifications sent yet';
      }
      if (userData?.role === 'district') {
        return 'No notifications sent from this district yet';
      }
      if (userData?.role === 'area') {
        return 'No notifications sent from this area yet';
      }
      return 'No notifications sent yet';
    }

    // received tab
    if (userData?.role === 'district') {
      return 'No notifications for this district yet';
    }
    if (userData?.role === 'area') {
      return 'No notifications for this area yet';
    }
    if (userData?.role === 'unit') {
      return 'No notifications for this unit yet';
    }
    return 'No notifications received';
  };

  const getEmptyStateDescription = () => {
    if (activeTab === 'sent') {
      if (userData?.role === 'admin' || userData?.role === 'superadmin') {
        return 'You haven\'t sent any notifications yet. Click "Create Notification" to send your first one.';
      }
      if (userData?.role === 'district') {
        return 'District-level notifications that you send will appear here.';
      }
      if (userData?.role === 'area') {
        return 'Area-level notifications that you send will appear here.';
      }
      return 'Notifications that you send will appear here.';
    }

    // received tab
    if (userData?.role === 'area') {
      return 'You don\'t have any notifications for this area at the moment. Notifications from district or central administrators will appear here.';
    }
    if (userData?.role === 'district') {
      return 'You don\'t have any notifications for this district at the moment. Notifications from central administrators will appear here.';
    }
    if (userData?.role === 'unit') {
      return 'You don\'t have any notifications for this unit at the moment. Notifications from your area or district administrators will appear here.';
    }
    return 'You don\'t have any notifications at the moment. Notifications from administrators will appear here.';
  };

  const pageContent = (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* Central admin has no MobileTopBar wrapper, so this stays the only
              mobile title there; district/area/unit already show the title in
              MobileTopBar, so hide the duplicate below lg for those roles. */}
          <h1 className={isCentralAdmin ? 'text-lg sm:text-xl lg:text-3xl font-bold text-[#002349]' : 'hidden lg:block lg:text-3xl font-bold text-[#002349]'}>നോട്ടിഫിക്കേഷൻ</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {unreadCount > 0 && (
            <div className="bg-[#957C3D] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
              <Bell className="w-4 h-4 mr-1" />
              {unreadCount} unread
            </div>
          )}
          {(userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.role === 'district' || userData?.role === 'area') && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#002349] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a3a5c]"
            >
              <Plus className="w-4 h-4" />
              {showCreateModal ? 'Hide Form' : 'Create Notification'}
            </button>
          )}
        </div>
      </div>

      {showCreateModal ? (
        <CreateNotificationModal
          isOpen={showCreateModal}
          onClose={closeCreateModal}
          userData={userData}
          notification={editingNotification}
          onNotificationCreated={handleNotificationCreated}
        />
      ) : (
        <>
          {showReceivedTab && showSentTab && (
            <div className="flex gap-2 text-sm font-semibold text-gray-500">
              {showReceivedTab && (
                <button
                  onClick={() => setActiveTab('received')}
                  className={`rounded-full px-4 py-2 transition ${activeTab === 'received' ? 'bg-[#002349] text-white' : 'bg-white shadow-sm'}`}
                >
                  Received
                </button>
              )}
              {showSentTab && (
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`rounded-full px-4 py-2 transition ${activeTab === 'sent' ? 'bg-[#957C3D] text-white' : 'bg-white shadow-sm'}`}
                >
                  Sent
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349] mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchNotifications}
                  className="bg-[#002349] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 ease-out"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {getEmptyStateTitle()}
                </h3>
                <p className="text-gray-600 text-sm">
                  {getEmptyStateDescription()}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => setSelectedNotification(notification)}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${notification.hasRead ? 'bg-gray-100 text-gray-500' : 'bg-[#002349] text-white'}`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold text-[#002349]">{notification.title}</p>
                          {!notification.hasRead && <span className="rounded-full bg-[#957C3D]/10 px-2 py-0.5 text-[10px] font-semibold text-[#957C3D]">New</span>}
                        </div>
                        <p className="break-words text-sm text-gray-600 line-clamp-2">{notification.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(notification.createdAt)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    {activeTab === 'sent' ? (
                      <span className="min-w-0 break-words">To: {getRecipientsText(notification.recipients)}</span>
                    ) : (
                      <span className="min-w-0 break-words">From: {notification.senderName}</span>
                    )}
                    <div className="flex items-center gap-2">
                      {activeTab === 'sent' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(notification); }}
                            className="inline-flex items-center gap-1 rounded-md border border-[#002349]/30 px-2.5 py-2 text-xs font-semibold text-[#002349] hover:bg-[#002349]/5"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification._id); }}
                            className="rounded-md border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {activeTab === 'received' && !notification.hasRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification._id); }}
                          className="rounded-md border border-[#002349] px-2.5 py-2 text-xs font-semibold text-[#002349] hover:bg-[#002349]/5"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && !error && notifications.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <NotificationDetailModal
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="ലോഗൗട്ട്"
        message={isUnitUser 
          ? "താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?" 
          : isAreaUser
          ? "താങ്കൾ ലോഗൗട്ട് ചെയ്യാൻ തീർച്ചയാണോ?"
          : "Are you sure you want to logout?"
        }
        confirmText={isUnitUser || isAreaUser ? "ലോഗൗട്ട്" : "Logout"}
        cancelText={isUnitUser || isAreaUser ? "റദ്ദാക്കുക" : "Cancel"}
        type="logout"
      />
    </div>
  );

  if (shouldUseAdminLayout) {
    return wrapWithAdminSidebar(pageContent);
  }

  if (isDistrictUser) {
    return wrapWithDistrictSidebar(pageContent);
  }

  if (isUnitUser) {
    return wrapWithUnitSidebar(pageContent);
  }

  if (isAreaUser) {
    return wrapWithAreaSidebar(pageContent);
  }

  return pageContent;
};

export default NotificationsPage;