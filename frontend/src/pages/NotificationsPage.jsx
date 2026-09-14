import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, AlertCircle, Pencil, ChevronLeft, ChevronRight, Send, Mail, Users, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateNotificationModal from '../components/modals/CreateNotificationModal';
import NotificationDetailModal from '../components/modals/NotificationDetailModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AdminSidebar from '../components/sidebars/AdminSidebar';
import AreaAdminSidebar from '../components/sidebars/AreaAdminSidebar';
import UnitAdminSidebar from '../components/sidebars/UnitAdminSidebar';
import DistrictAdminSidebar from '../components/sidebars/DistrictAdminSidebar';
import axios from 'axios';
import MobileTopBar from '../components/sidebars/MobileTopBar';
import { JihFab, JihAddButton, JihFilterBar, JihFilterSelect } from '../components/JihToolbar';

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
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [showDeleteNotifModal, setShowDeleteNotifModal] = useState(false);
  const [isDeletingNotif, setIsDeletingNotif] = useState(false);
  // Client-side narrowing of the loaded page (the API only pages by tab).
  const [searchTerm, setSearchTerm] = useState('');
  const [readFilter, setReadFilter] = useState(''); // '' | 'unread' | 'read'

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
    setSearchTerm('');
    setReadFilter('');
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

  // Mobile top-bar bell with the unread count, like a standard app header.
  const unreadBell = (
    <span
      role="img"
      aria-label={unreadCount > 0 ? `${unreadCount} unread` : 'Notifications'}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1f3560] shadow-[0_6px_18px_rgba(15,35,65,0.12)]"
    >
      <Bell className="h-4 w-4" strokeWidth={1.9} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#e0334c] px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </span>
  );
  const topBarSubtitle = activeTab === 'sent' ? 'അയച്ച സന്ദേശങ്ങൾ' : 'പ്രധാന അറിയിപ്പുകൾ';

  const wrapWithAdminSidebar = (content) => (
    <div className="app-viewport bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
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
        <MobileTopBar
          title="നോട്ടിഫിക്കേഷൻ"
          subtitle={topBarSubtitle}
          actions={unreadBell}
        />
        <div className="mobile-readable-content flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-4 lg:px-8 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithAreaSidebar = (content) => (
    <div className="app-viewport bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
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
          subtitle={topBarSubtitle}
          actions={unreadBell}
        />
        <div className="mobile-readable-content flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-4 lg:px-8 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithUnitSidebar = (content) => (
    <div className="app-viewport bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
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
          subtitle={topBarSubtitle}
          actions={unreadBell}
        />
        <div className="mobile-readable-content flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-4 lg:px-8 lg:pb-4 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );

  const wrapWithDistrictSidebar = (content) => (
    <div className="app-viewport bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex overflow-hidden">
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
          subtitle={topBarSubtitle}
          actions={unreadBell}
        />
        <div className="mobile-readable-content flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-4 lg:px-8 lg:pb-4 min-w-0">
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
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setIsDeletingNotif(true);
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
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    } finally {
      setIsDeletingNotif(false);
      setShowDeleteNotifModal(false);
      setNotificationToDelete(null);
    }
  };

  const handleDeleteNotificationClick = (notification) => {
    setNotificationToDelete(notification);
    setShowDeleteNotifModal(true);
  };

  const confirmDeleteNotification = () => {
    if (notificationToDelete) {
      deleteNotification(notificationToDelete._id);
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

  const canCreate = ['admin', 'superadmin', 'district', 'area'].includes(userData?.role);

  const query = searchTerm.trim().toLowerCase();
  const visibleNotifications = notifications.filter((n) => {
    if (readFilter === 'unread' && n.hasRead) return false;
    if (readFilter === 'read' && !n.hasRead) return false;
    if (!query) return true;
    return `${n.title || ''} ${n.description || ''} ${n.senderName || ''}`.toLowerCase().includes(query);
  });

  const pageContent = (
    <div className="space-y-4 pb-10 sm:space-y-6">
      {/* Desktop-only header: below lg the MobileTopBar owns the title, the
          add action is the FAB, and the unread badge sits in the tab row so
          no vertical space is spent on a header. */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3">
        <h1 className="lg:text-3xl font-bold text-[#002349]">നോട്ടിഫിക്കേഷൻ</h1>
        {canCreate && (
          <JihAddButton onClick={openCreateModal}>
            {showCreateModal ? 'Hide Form' : 'Create Notification'}
          </JihAddButton>
        )}
      </div>
      {canCreate && !showCreateModal && <JihFab onClick={openCreateModal} label="Create Notification" />}

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
          {(showReceivedTab && showSentTab || unreadCount > 0) && (
            <div className={`${showReceivedTab && showSentTab ? 'grid grid-cols-2 gap-3' : 'hidden lg:flex'} items-center`}>
              {showReceivedTab && showSentTab && (
                <button
                  onClick={() => setActiveTab('received')}
                  aria-pressed={activeTab === 'received'}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] text-[14px] font-bold transition-colors sm:min-h-[44px] sm:text-sm ${
                    activeTab === 'received' ? 'bg-[#14346b] text-white shadow-[0_10px_24px_rgba(20,52,107,0.28)]' : 'jih-card text-[#1f3560]'
                  }`}
                >
                  <Bell className="h-[18px] w-[18px] sm:h-4 sm:w-4" strokeWidth={1.9} />
                  Received
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] rounded-full bg-[#e0334c] px-1.5 text-center text-[12px] font-bold leading-5 text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              {showReceivedTab && showSentTab && (
                <button
                  onClick={() => setActiveTab('sent')}
                  aria-pressed={activeTab === 'sent'}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] text-[14px] font-bold transition-colors sm:min-h-[44px] sm:text-sm ${
                    activeTab === 'sent' ? 'bg-[#14346b] text-white shadow-[0_10px_24px_rgba(20,52,107,0.28)]' : 'jih-card text-[#1f3560]'
                  }`}
                >
                  <Send className="h-[18px] w-[18px] sm:h-4 sm:w-4" strokeWidth={1.9} />
                  Sent
                </button>
              )}
              {unreadCount > 0 && (
                <div className="col-span-2 ml-auto hidden justify-self-end lg:inline-flex items-center gap-1 rounded-full bg-[#957C3D] px-3 py-1 text-xs font-semibold text-white">
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount} unread
                </div>
              )}
            </div>
          )}

          <JihFilterBar
            search={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder={activeTab === 'sent' ? 'Search sent notifications...' : 'Search notifications...'}
            activeFilterCount={readFilter ? 1 : 0}
            onClear={() => setReadFilter('')}
          >
            {activeTab === 'received' && (
              <JihFilterSelect value={readFilter} onChange={(e) => setReadFilter(e.target.value)} label="Read status">
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </JihFilterSelect>
            )}
          </JihFilterBar>

          <div className="space-y-3">
            {loading ? (
              <div className="jih-card p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349] mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="jih-card p-6 text-center">
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
              <div className="jih-card p-6 text-center">
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
            ) : visibleNotifications.length === 0 ? (
              <div className="jih-card p-6 text-center text-sm text-gray-600">
                No notifications match your search.
              </div>
            ) : (
              visibleNotifications.map((notification) => {
                const isSent = activeTab === 'sent';
                const Icon = isSent ? Send : Bell;
                return (
                  <div
                    key={notification._id}
                    onClick={() => setSelectedNotification(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNotification(notification);
                      }
                    }}
                    className="jih-card cursor-pointer p-3 transition hover:shadow-[0_10px_28px_rgba(15,35,65,0.12)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e4edfb] text-[#1d4fa8]">
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                        {!isSent && !notification.hasRead && (
                          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#1d4fa8] ring-2 ring-white" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 max-w-full text-[14px] font-extrabold leading-snug text-[#0f2a5c] [overflow-wrap:anywhere] sm:text-sm">{notification.title}</p>
                          {!notification.hasRead && (
                            <span className="rounded-full bg-[#fdf1dc] px-2 py-0.5 text-[12px] font-bold text-[#a06a12] sm:text-[10px]">New</span>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-[12px] leading-snug text-[#5b6b85] line-clamp-2 sm:text-sm">{notification.description}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 text-[12px] text-[#5b6b85] sm:text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-[#eef2f8] px-2 py-1 text-[12px] font-semibold text-[#5b6b85]">
                        {isSent ? <Users className="h-3.5 w-3.5 flex-shrink-0" /> : <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span className="break-words">
                          {isSent ? `To: ${getRecipientsText(notification.recipients)}` : `From: ${notification.senderName}`}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {isSent && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(notification); }}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#e4edfb] px-2.5 text-[12px] font-bold text-[#1d4fa8] hover:bg-[#d3e0f6] sm:text-xs"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteNotificationClick(notification); }}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#fbe6ee] px-2.5 text-[12px] font-bold text-[#c8203f] hover:bg-[#f7d3df] sm:text-xs"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </>
                        )}
                        {!isSent && !notification.hasRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification._id); }}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-[#14346b] px-2.5 text-[12px] font-bold text-[#14346b] hover:bg-[#f4f7fc] sm:text-xs"
                          >
                            <Mail className="h-4 w-4" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && !error && notifications.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[12px] text-[#5b6b85] sm:text-xs">
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[#e6ecf5] bg-white px-3 text-[12px] font-semibold text-[#5b6b85] hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[40px] sm:text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[#e6ecf5] bg-white px-3 text-[12px] font-semibold text-[#5b6b85] hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[40px] sm:text-xs"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
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

      <ConfirmationModal
        isOpen={showDeleteNotifModal}
        onClose={() => { setShowDeleteNotifModal(false); setNotificationToDelete(null); }}
        onConfirm={confirmDeleteNotification}
        title="Delete Notification"
        message={`Are you sure you want to delete "${notificationToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={isDeletingNotif}
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
