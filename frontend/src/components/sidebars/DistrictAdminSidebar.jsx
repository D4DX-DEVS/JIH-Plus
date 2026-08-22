import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  Star,
  ClipboardList,
  BarChart3,
  BarChart2,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Target as TargetIcon
} from 'lucide-react';
import jihLogoWhite from '../../assets/LogoWhite.png';
import PoweredByD4DX from './PoweredByD4DX';
import MobileBottomNav from './MobileBottomNav';
import { SIDEBAR_THEME, DYNAMIC_REPORT_META, REPORT_TYPE_STYLES } from './sidebarTheme';

/**
 * Sidebar component for district administrators.
 * Mirrors the styling of AdminSidebar while exposing navigation/actions
 * that match the district level workflow handled inside DistrictDashboardPage.
 */
const DistrictAdminSidebar = ({
  activeView = 'home',
  onNavigate,
  onLogout,
  onNotifications,
  onDynamicReports,
  onNavigateToMembership,
  onReportTypeSelect,
  reportCounts = null,
  districtName = '—',
  isMobileOpen = false,
  onMobileToggle
}) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState(
    String(activeView).startsWith('submissions') ? 'submissions' : 'dynamic-reports'
  );
  const navigate = useNavigate();
  const location = useLocation();

  const handleReportType = (type) => {
    if (onReportTypeSelect) {
      onReportTypeSelect(type);
    } else {
      navigate('/user-reports', { state: { initialType: type } });
    }
  };

  // Switch dashboard view without toggling the (closed) mobile drawer.
  const goView = (id) => {
    if (onNavigate) { onNavigate(id); return; }
    try {
      const ud = JSON.parse(localStorage.getItem('userData') || '{}');
      if (ud.districtId) navigate(`/district-dashboard/${ud.districtId}`, { state: { activeView: id } });
    } catch { /* ignore */ }
  };

  const bottomNavItems = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard, active: activeView === 'dashboard' || activeView === 'home',
      onClick: () => goView('dashboard') },
    { key: 'locations', label: 'Areas', icon: MapPin, active: activeView === 'locations',
      onClick: () => goView('locations') },
    { key: 'reports', label: 'Reports', icon: FileText, active: location.pathname.startsWith('/user-reports'),
      onClick: () => navigate('/user-reports') },
    { key: 'notifications', label: 'Alerts', icon: Bell, active: location.pathname.startsWith('/notifications'),
      onClick: () => { if (onNotifications) onNotifications(); else navigate('/notifications'); } },
    { key: 'more', label: 'More', icon: Menu, active: false,
      onClick: () => { if (onMobileToggle) onMobileToggle(); } },
  ];

  const navItems = [
    { id: 'dashboard', label: 'ഡാഷ്ബോർഡ്', icon: LayoutDashboard },
    { id: 'locations', label: 'ഏരിയകളും യൂണിറ്റുകളും', icon: MapPin },
    { id: 'stats', label: 'സ്ഥിതിവിവരക്കണക്കുകൾ', icon: BarChart3 },
    {
      id: 'submissions',
      type: 'group',
      label: 'സബ്മിഷനുകൾ',
      icon: ClipboardList,
      children: [
        { id: 'submissions-monthly', reportType: 'monthly', icon: Calendar, onClick: () => navigate('/district/dynamic-submissions/monthly') },
        { id: 'submissions-quarterly', reportType: 'quarterly', icon: BarChart2, onClick: () => navigate('/district/dynamic-submissions/quarterly') },
        { id: 'submissions-yearly', reportType: 'yearly', icon: CalendarDays, onClick: () => navigate('/district/dynamic-submissions/yearly') },
        { id: 'submissions-special', reportType: 'special', icon: Star, onClick: () => navigate('/district/dynamic-submissions/special') },
      ]
    },
    {
      id: 'dynamic-reports',
      type: 'group',
      label: 'ഡൈനാമിക് റിപ്പോർട്ടുകൾ',
      icon: FileText,
      children: [
        { id: 'monthly-report-type', reportType: 'monthly', icon: Calendar, onClick: () => handleReportType('monthly'), count: reportCounts?.monthly },
        { id: 'quarterly-report-type', reportType: 'quarterly', icon: BarChart2, onClick: () => handleReportType('quarterly'), count: reportCounts?.quarterly },
        { id: 'yearly-report-type', reportType: 'yearly', icon: CalendarDays, onClick: () => handleReportType('yearly'), count: reportCounts?.yearly },
        { id: 'special-report-type', reportType: 'special', icon: Star, onClick: () => handleReportType('special'), count: reportCounts?.special },
      ]
    },
    { id: 'notifications', label: 'നോട്ടിഫിക്കേഷൻ', icon: Bell, onClick: onNotifications || (() => navigate('/notifications')) },
    { id: 'targets', label: 'ടാർഗറ്റ്', icon: TargetIcon, onClick: () => navigate('/targets') }
  ];

  const handleNavigateSafe = (item) => {
    if (item.onClick) {
      item.onClick();
      if (onMobileToggle) onMobileToggle();
      return;
    }
    if (onNavigate) {
      onNavigate(item.id);
    } else {
      try {
        const ud = JSON.parse(localStorage.getItem('userData') || '{}');
        if (ud.districtId) navigate(`/district-dashboard/${ud.districtId}`, { state: { activeView: item.id } });
      } catch {}
    }
    if (onMobileToggle) onMobileToggle();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] sm:w-72 ${SIDEBAR_THEME.bg} shadow-2xl border-r ${SIDEBAR_THEME.border} transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'} ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
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
                <h2 className="text-base font-bold text-white whitespace-nowrap" style={{ fontFamily: 'Cinzel, serif' }}>
                  JIH Plus
                </h2>
              </div>
            </div>
            <button
              onClick={onMobileToggle}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors flex-shrink-0"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* District info */}
          <div className={`mx-3 mt-3 mb-1 rounded-xl p-3 ${SIDEBAR_THEME.infoCard} ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
            <p className={`text-[10px] uppercase tracking-wide font-bold ${SIDEBAR_THEME.infoLabel}`}>District</p>
            <p className={`text-sm font-bold ${SIDEBAR_THEME.infoPrimary} truncate uppercase`}>{districtName}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.type === 'group') {
                  const isOpen = expandedGroup === item.id;
                  const isGroupActive = (item.children || []).some(c => activeView === c.id);
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
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-white/40 ${isDesktopCollapsed ? 'lg:hidden' : ''}`} />
                      </button>
                      {isOpen && !isDesktopCollapsed && (
                        <div className="mt-1 ml-3 space-y-1">
                          {(item.children || []).map(child => {
                            const isChildActive = activeView === child.id;
                            const meta = DYNAMIC_REPORT_META[child.reportType];
                            const style = REPORT_TYPE_STYLES[meta.color];
                            return (
                              <button
                                key={child.id}
                                onClick={() => { child.onClick?.(); if (onMobileToggle) onMobileToggle(); }}
                                className={`w-full flex items-center justify-between pl-3 pr-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                                  isChildActive ? style.active : style.base
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {(() => { const CI = child.icon; return <CI className={`w-3.5 h-3.5 flex-shrink-0 ${style.icon}`} />; })()}
                                  <span>{meta.label}</span>
                                </div>
                                {child.count > 0 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.badge}`}>{child.count}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigateSafe(item)}
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

          {/* Actions */}
          <div className="p-3 border-t border-white/10">
            <PoweredByD4DX collapsed={isDesktopCollapsed} dark />
            <button
              onClick={() => {
                if (onLogout) onLogout();
                if (onMobileToggle) onMobileToggle();
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

      <MobileBottomNav items={bottomNavItems} hidden={isMobileOpen} />
    </>
  );
};

export default DistrictAdminSidebar;
