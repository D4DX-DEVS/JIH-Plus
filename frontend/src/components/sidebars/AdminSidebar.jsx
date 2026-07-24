import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Eye,
  Bell,
  Calendar,
  CalendarDays,
  Star,
  Users,
  BarChart3,
  BarChart2,
  MapPin,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Target as TargetIcon
} from 'lucide-react';
import jihLogoWhite from '../../assets/LogoWhite.png';
import PoweredByD4DX from './PoweredByD4DX';
import { SIDEBAR_THEME, DYNAMIC_REPORT_META, REPORT_TYPE_STYLES } from './sidebarTheme';

const AdminSidebar = ({
  activeTab,
  onTabChange,
  onNavigateToReports,
  onNavigateToNotifications,
  onNavigateToMembership,
  onLogout,
  adminEmail,
  adminData,
  totalForms,
  totalSurveys,
  isMobileOpen,
  onMobileToggle,
  isOpen,
  onClose
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState(
    location.pathname.startsWith('/admin/dynamic-submissions') ? 'dynamic-submissions' : null
  );
  const sidebarOpen = typeof isMobileOpen === 'boolean' ? isMobileOpen : Boolean(isOpen);
  const toggleSidebar = onMobileToggle || onClose;
  const resolvedAdminEmail = adminEmail || adminData?.email || 'Admin';
  const navItems = [
    {
      id: 'dashboard',
      label: 'ഡാഷ്ബോർഡ്',
      icon: LayoutDashboard,
      onClick: () => navigate('/expansion-portal/dashboard')
    },
    {
      id: 'membership',
      label: 'അംഗത്വം',
      icon: Users,
      onClick: onNavigateToMembership
    },
    {
      id: 'stats',
      label: 'സ്ഥിതിവിവരക്കണക്കുകൾ',
      icon: BarChart3
    },
    {
      id: 'view-reports',
      label: 'റിപ്പോർട്ട് ജനറേഷൻ',
      icon: Eye,
      onClick: onNavigateToReports
    },
    {
      id: 'dynamic-submissions',
      type: 'group',
      label: 'ഡൈനാമിക് സബ്മിഷൻ',
      icon: ClipboardList,
      children: [
        {
          id: 'dynamic-submissions-monthly',
          reportType: 'monthly',
          icon: Calendar,
          onClick: () => navigate('/admin/dynamic-submissions/monthly')
        },
        {
          id: 'dynamic-submissions-quarterly',
          reportType: 'quarterly',
          icon: BarChart2,
          onClick: () => navigate('/admin/dynamic-submissions/quarterly')
        },
        {
          id: 'dynamic-submissions-yearly',
          reportType: 'yearly',
          icon: CalendarDays,
          onClick: () => navigate('/admin/dynamic-submissions/yearly')
        },
        {
          id: 'dynamic-submissions-special',
          reportType: 'special',
          icon: Star,
          onClick: () => navigate('/admin/dynamic-submissions/special')
        }
      ]
    },
    {
      id: 'notifications',
      label: 'നോട്ടിഫിക്കേഷൻ',
      icon: Bell,
      onClick: onNavigateToNotifications
    },
    {
      id: 'targets',
      label: 'ടാർഗറ്റ്',
      icon: TargetIcon,
      onClick: () => navigate('/targets')
    },
    {
      id: 'master-data',
      label: 'മാസ്റ്റർ ഡാറ്റ',
      icon: MapPin,
      onClick: () => navigate('/admin/master-data')
    }
  ];

  const isReportsRoute =
    location.pathname === '/view-reports' ||
    location.pathname.startsWith('/view-reports/') ||
    location.pathname.startsWith('/report-submissions') ||
    location.pathname === '/create-report' ||
    location.pathname.startsWith('/view-report/') ||
    location.pathname.startsWith('/edit-report/');

  const isNotificationsRoute =
    location.pathname === '/notifications' ||
    location.pathname.startsWith('/notifications') ||
    (location.pathname === '/admin-dashboard' && location.state?.showNotifications === true);

  const isMasterDataRoute = location.pathname.startsWith('/admin/master-data');
  const isDynamicSubmissionsRoute = location.pathname.startsWith('/admin/dynamic-submissions');
  const isDashboardRoute = location.pathname === '/expansion-portal/dashboard';

  const handleTabChangeSafe = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
      return;
    }

    if (tabId === 'membership') {
      navigate('/membership', { state: { roleHint: 'admin' } });
      return;
    }

    if (tabId === 'view-reports') {
      navigate('/view-reports');
      return;
    }

    if (tabId === 'notifications') {
      navigate('/notifications');
      return;
    }

    if (['stats'].includes(tabId)) {
      navigate('/admin-dashboard', { state: { activeTab: tabId } });
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] sm:w-72 ${SIDEBAR_THEME.bg} shadow-2xl border-r ${SIDEBAR_THEME.border} transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className={`flex items-center h-16 justify-between px-4 border-b ${SIDEBAR_THEME.border} ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src={jihLogoWhite}
                alt="JIH Logo"
                className="h-9 w-9 flex-shrink-0 object-contain"
              />
              <div className={isDesktopCollapsed ? 'lg:hidden' : ''}>
                <h2 className="text-base font-bold text-white whitespace-nowrap" style={{ fontFamily: 'Cinzel, serif' }}>Admin Dashboard</h2>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className={`mx-3 mt-3 mb-1 rounded-xl p-3 ${SIDEBAR_THEME.infoCard} ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-[10px] uppercase tracking-wide font-semibold ${SIDEBAR_THEME.infoLabel}`}>Welcome,</p>
            <p className={`text-xs font-bold ${SIDEBAR_THEME.infoPrimary} truncate`}>{resolvedAdminEmail}</p>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.type === 'group') {
                  const isOpen = expandedGroup === item.id;
                  const isGroupActive = isDynamicSubmissionsRoute;
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setExpandedGroup(isOpen ? null : item.id)}
                        className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                          isGroupActive ? SIDEBAR_THEME.groupActive : SIDEBAR_THEME.navDefault
                        }`}
                      >
                        <div className={`flex items-center ${isDesktopCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                          <Icon className={`w-4 h-4 ${isGroupActive ? SIDEBAR_THEME.iconActive : SIDEBAR_THEME.iconDefault}`} />
                          <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-white/40 ${isDesktopCollapsed ? 'lg:hidden' : ''}`} />
                      </button>
                      {isOpen && !isDesktopCollapsed && (
                        <div className="mt-1 ml-3 space-y-1">
                          {(item.children || []).map(child => {
                            const ChildIcon = child.icon;
                            const isChildActive = location.pathname === `/admin/dynamic-submissions/${child.id.replace('dynamic-submissions-', '')}`;
                            const meta = DYNAMIC_REPORT_META[child.reportType];
                            const style = REPORT_TYPE_STYLES[meta.color];
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  child.onClick?.();
                                  if (toggleSidebar) toggleSidebar();
                                }}
                                className={`w-full flex items-center pl-3 pr-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                                  isChildActive ? style.active : style.base
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <ChildIcon className={`w-3.5 h-3.5 flex-shrink-0 ${style.icon}`} />
                                  <span>{meta.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive =
                  activeTab === item.id ||
                  (item.id === 'dashboard' && isDashboardRoute) ||
                  (item.id === 'view-reports' && isReportsRoute) ||
                  (item.id === 'notifications' && isNotificationsRoute) ||
                  (item.id === 'master-data' && isMasterDataRoute);

                const handleClick = () => {
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    handleTabChangeSafe(item.id);
                  }
                  if (toggleSidebar) toggleSidebar();
                };

                return (
                  <button
                    key={item.id}
                    onClick={handleClick}
                    className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                      isActive ? SIDEBAR_THEME.navActive : SIDEBAR_THEME.navDefault
                    }`}
                  >
                    <div className={`flex items-center ${isDesktopCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? SIDEBAR_THEME.iconActive : SIDEBAR_THEME.iconDefault}`} />
                      <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Powered by and Logout Buttons */}
          <div className="p-3 space-y-1.5 border-t border-white/10">
            <PoweredByD4DX collapsed={isDesktopCollapsed} dark />

            {/* Logout Button */}
            <button
              onClick={() => {
                onLogout();
                if (toggleSidebar) toggleSidebar();
              }}
              className={`w-full flex items-center justify-center ${isDesktopCollapsed ? 'lg:space-x-0 lg:px-2' : 'space-x-2 px-3'} py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 ${SIDEBAR_THEME.logout}`}
            >
              <LogOut className="w-4 h-4" />
              <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>Logout</span>
            </button>
          </div>
        </div>

        {/* Floating desktop collapse toggle — a sibling of the clipped inner
            wrapper so half the circle can sit outside the sidebar edge. */}
        <button
          onClick={() => setIsDesktopCollapsed((prev) => !prev)}
          className={`hidden lg:flex absolute top-16 -right-3 z-10 h-6 w-6 items-center justify-center rounded-full transition-all ${SIDEBAR_THEME.toggleBtn}`}
          title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isDesktopCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>
    </>
  );
};

export default AdminSidebar;
