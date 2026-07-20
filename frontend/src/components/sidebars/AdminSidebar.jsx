import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Eye,
  Bell,
  FileText, 
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
  ClipboardList,
  LayoutDashboard,
  Target as TargetIcon
} from 'lucide-react';
import jihLogoWhite from '../../assets/LogoWhite.png';
import PoweredByD4DX from './PoweredByD4DX';

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
      color: '#002349',
      onClick: () => navigate('/expansion-portal/dashboard')
    },
    {
      id: 'yearly',
      label: 'വാർഷിക റിപ്പോർട്ട്',
      icon: FileText,
      color: '#002349'
    },
    {
      id: 'monthly',
      label: 'പ്രതിമാസ റിപ്പോർട്ട്',
      icon: Calendar,
      color: '#002349'
    },
    {
      id: 'membership',
      label: 'അംഗത്വം',
      icon: Users,
      color: '#002349',
      onClick: onNavigateToMembership
    },
    {
      id: 'stats',
      label: 'സ്ഥിതിവിവരക്കണക്കുകൾ',
      icon: BarChart3,
      color: '#002349'
    },
    {
      id: 'view-reports',
      label: 'റിപ്പോർട്ട് ജനറേഷൻ',
      icon: Eye,
      color: '#002349',
      onClick: onNavigateToReports
    },
    {
      id: 'dynamic-submissions',
      type: 'group',
      label: 'ഡൈനാമിക് സബ്മിഷൻ',
      icon: ClipboardList,
      color: '#002349',
      children: [
        {
          id: 'dynamic-submissions-monthly',
          label: 'മന്ത്ലി',
          icon: Calendar,
          onClick: () => navigate('/admin/dynamic-submissions/monthly')
        },
        {
          id: 'dynamic-submissions-quarterly',
          label: 'ക്വാർട്ടർലി',
          icon: BarChart2,
          onClick: () => navigate('/admin/dynamic-submissions/quarterly')
        },
        {
          id: 'dynamic-submissions-yearly',
          label: 'ഇയർലി',
          icon: CalendarDays,
          onClick: () => navigate('/admin/dynamic-submissions/yearly')
        },
        {
          id: 'dynamic-submissions-special',
          label: 'സ്പെഷ്യൽ',
          icon: Star,
          onClick: () => navigate('/admin/dynamic-submissions/special')
        }
      ]
    },
    {
      id: 'notifications',
      label: 'നോട്ടിഫിക്കേഷൻ',
      icon: Bell,
      color: '#002349',
      onClick: onNavigateToNotifications
    },
    {
      id: 'targets',
      label: 'ടാർഗറ്റ്',
      icon: TargetIcon,
      color: '#002349',
      onClick: () => navigate('/targets')
    },
    {
      id: 'master-data',
      label: 'മാസ്റ്റർ ഡാറ്റ',
      icon: MapPin,
      color: '#002349',
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

    if (['yearly', 'monthly', 'stats'].includes(tabId)) {
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
        className={`fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] sm:w-72 bg-white shadow-2xl border-r border-gray-200 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:flex-shrink-0 overflow-hidden ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-[#002349] to-[#1a3a5c]">
            <div className="flex items-center space-x-3 min-w-0">
              <img 
                src={jihLogoWhite} 
                alt="JIH Logo" 
                className="h-9 w-auto"
              />
              <div className={isDesktopCollapsed ? 'lg:hidden' : ''}>
                <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Admin Dashboard</h2>
              </div>
            </div>
            <button
              onClick={() => setIsDesktopCollapsed((prev) => !prev)}
              className="hidden lg:inline-flex text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
              title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className={`px-4 py-3 border-b border-gray-200 bg-gray-50 ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs text-gray-600 font-medium">Welcome,</p>
            <p className="text-xs text-[#002349] font-semibold truncate">{resolvedAdminEmail}</p>
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
                        className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          isGroupActive
                            ? 'bg-gradient-to-r text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-[#002349]'
                        }`}
                        style={isGroupActive ? { background: `linear-gradient(to right, ${item.color}, ${item.color}dd)` } : {}}
                      >
                        <div className={`flex items-center ${isDesktopCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                          <Icon className={`w-4 h-4 ${isGroupActive ? 'text-white' : 'text-gray-500'}`} />
                          <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isGroupActive ? 'text-white' : 'text-gray-400'} ${isDesktopCollapsed ? 'lg:hidden' : ''}`} />
                      </button>
                      {isOpen && !isDesktopCollapsed && (
                        <div className="mt-0.5 ml-3 space-y-0.5">
                          {(item.children || []).map(child => {
                            const ChildIcon = child.icon;
                            const isChildActive = location.pathname === `/admin/dynamic-submissions/${child.id.replace('dynamic-submissions-', '')}`;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  child.onClick?.();
                                  if (toggleSidebar) toggleSidebar();
                                }}
                                className={`w-full flex items-center pl-3 pr-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  isChildActive
                                    ? 'bg-[#002349]/10 text-[#002349] font-semibold'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-[#002349]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <ChildIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isChildActive ? 'text-[#002349]' : 'text-gray-400'}`} />
                                  <span>{child.label}</span>
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
                    className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#002349]'
                    }`}
                    style={isActive ? {
                      background: `linear-gradient(to right, ${item.color}, ${item.color}dd)`
                    } : {}}
                  >
                    <div className={`flex items-center ${isDesktopCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Powered by and Logout Buttons */}
          <div className="p-3 space-y-1.5">
            <PoweredByD4DX collapsed={isDesktopCollapsed} />

            {/* Logout Button */}
            <button
              onClick={() => {
                onLogout();
                if (toggleSidebar) toggleSidebar();
              }}
              className={`w-full flex items-center justify-center ${isDesktopCollapsed ? 'lg:space-x-0 lg:px-2' : 'space-x-2 px-3'} py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] rounded-lg transition-all duration-200 shadow-md hover:shadow-lg`}
            >
              <LogOut className="w-4 h-4" />
              <span className={isDesktopCollapsed ? 'lg:hidden' : ''}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

