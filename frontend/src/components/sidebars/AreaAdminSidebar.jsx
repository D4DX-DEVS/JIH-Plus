import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  Star,
  BarChart3,
  BarChart2,
  ClipboardList,
  Bell,
  FileText,
  LogOut,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Target as TargetIcon
} from 'lucide-react';
import jihLogoWhite from '../../assets/LogoWhite.png';
import PoweredByD4DX from './PoweredByD4DX';
import MobileBottomNav from './MobileBottomNav';
import { SIDEBAR_THEME, DYNAMIC_REPORT_META, REPORT_TYPE_STYLES } from './sidebarTheme';

/**
 * Sidebar component for area administrators.
 * Matches the styling of the district sidebar while exposing area-specific tabs.
 */
const AreaAdminSidebar = ({
  activeTab = 'monthly',
  onNavigate,
  onLogout,
  onNotifications,
  onDynamicReports,
  onReportTypeSelect,
  reportCounts = null,
  areaName = '—',
  districtName = '',
  isMobileOpen = false,
  onMobileToggle
}) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState(
    String(activeTab).startsWith('submissions') ? 'submissions' : 'dynamic-reports'
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

  // Switch dashboard tab without toggling the (closed) mobile drawer.
  const goTab = (id) => {
    if (onNavigate) { onNavigate(id); return; }
    try {
      const ud = JSON.parse(localStorage.getItem('userData') || '{}');
      if (ud.areaId) navigate(`/area-dashboard/${ud.areaId}`, { state: { initialTab: id } });
    } catch { /* ignore */ }
  };

  const bottomNavItems = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard, active: activeTab === 'dashboard',
      onClick: () => goTab('dashboard') },
    { key: 'units', label: 'Units', icon: ClipboardList, active: activeTab === 'units',
      onClick: () => goTab('units') },
    { key: 'reports', label: 'Reports', icon: FileText, active: location.pathname.startsWith('/user-reports'),
      onClick: () => navigate('/user-reports') },
    { key: 'notifications', label: 'Alerts', icon: Bell, active: location.pathname.startsWith('/notifications'),
      onClick: () => { if (onNotifications) onNotifications(); else navigate('/notifications'); } },
    { key: 'more', label: 'More', icon: Menu, action: 'more' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'ഡാഷ്ബോർഡ്', icon: LayoutDashboard },
    { id: 'units', label: 'യൂണിറ്റുകൾ', icon: ClipboardList },
    { id: 'stats', label: 'സ്ഥിതിവിവരക്കണക്കുകൾ', icon: BarChart3 },
    {
      id: 'submissions',
      type: 'group',
      label: 'സബ്മിഷനുകൾ',
      icon: ClipboardList,
      children: [
        { id: 'submissions-monthly', reportType: 'monthly', icon: Calendar, onClick: () => navigate('/area/dynamic-submissions/monthly') },
        { id: 'submissions-quarterly', reportType: 'quarterly', icon: BarChart2, onClick: () => navigate('/area/dynamic-submissions/quarterly') },
        { id: 'submissions-yearly', reportType: 'yearly', icon: CalendarDays, onClick: () => navigate('/area/dynamic-submissions/yearly') },
        { id: 'submissions-special', reportType: 'special', icon: Star, onClick: () => navigate('/area/dynamic-submissions/special') },
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

  // "More" sheet lists only what the bottom bar doesn't already carry —
  // dashboard, units and notifications are one tap away via the bar itself.
  const barIds = new Set(['dashboard', 'units', 'notifications']);
  const moreItems = [];
  navItems.forEach((item) => {
    if (item.type === 'group') {
      item.children.forEach((child) => {
        const meta = DYNAMIC_REPORT_META[child.reportType];
        moreItems.push({
          key: child.id,
          label: `${item.label} · ${meta.label}`,
          icon: child.icon,
          active: activeTab === child.id,
          count: child.count,
          onClick: child.onClick,
        });
      });
    } else if (!barIds.has(item.id)) {
      moreItems.push({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active:
          item.id === 'stats' ? activeTab === 'stats' :
          item.id === 'targets' ? location.pathname.startsWith('/targets') :
          false,
        onClick: item.onClick || (() => goTab(item.id)),
      });
    }
  });

  const handleNavigate = (item) => {
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
        if (ud.areaId) navigate(`/area-dashboard/${ud.areaId}`, { state: { initialTab: item.id } });
      } catch {}
    }
    if (onMobileToggle) onMobileToggle();
  };

  return (
    <>
      {/* Sidebar — desktop only; phones navigate via the bottom bar and its
          "More" sheet, so this never slides in on mobile. */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] sm:w-72 ${SIDEBAR_THEME.bg} shadow-2xl border-r ${SIDEBAR_THEME.border} transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className={`flex items-center h-16 justify-between px-4 border-b ${SIDEBAR_THEME.border} ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="flex items-center space-x-3 min-w-0">
              <img src={jihLogoWhite} alt="JIH Logo" className="h-9 w-9 flex-shrink-0 object-contain" />
              <div className={isDesktopCollapsed ? 'lg:hidden' : ''}>
                <h2
                  className="text-base font-bold text-white whitespace-nowrap"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  JIH Plus
                </h2>
                <p className="text-xs text-white/60 font-medium">Area Admin</p>
              </div>
            </div>
          </div>

          {/* Hierarchical location info: District -> Area */}
          {(districtName || areaName) && (
            <div className={`mx-3 mt-3 mb-1 rounded-xl p-3 ${SIDEBAR_THEME.infoCard} ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
              <div className="relative pl-3">
                <div className="absolute left-0 top-1 bottom-1 w-px bg-white/15" />
                {districtName && (
                  <div className="mb-1.5">
                    <p className={`text-[10px] uppercase tracking-wide font-semibold ${SIDEBAR_THEME.infoLabel}`}>District</p>
                    <p className={`text-xs font-medium ${SIDEBAR_THEME.infoMuted} truncate uppercase`}>{districtName}</p>
                  </div>
                )}
                <div className="pl-3">
                  <p className={`text-[10px] uppercase tracking-wide font-bold ${SIDEBAR_THEME.infoLabel}`}>Area</p>
                  <p className={`text-sm font-bold ${SIDEBAR_THEME.infoPrimary} truncate uppercase`}>{areaName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.type === 'group') {
                  const isOpen = expandedGroup === item.id;
                  const isGroupActive = (item.children || []).some(c => activeTab === c.id);
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
                        <div className="mt-1 ml-3 space-y-2">
                          {(item.children || []).map(child => {
                            const isChildActive = activeTab === child.id;
                            const meta = DYNAMIC_REPORT_META[child.reportType];
                            const style = REPORT_TYPE_STYLES[meta.color];
                            return (
                              <button
                                key={child.id}
                                onClick={() => { child.onClick?.(); if (onMobileToggle) onMobileToggle(); }}
                                className={`w-full flex items-center justify-between pl-3 pr-2 py-3 text-xs font-medium rounded-lg transition-colors ${
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

                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item)}
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
          <div className="p-3 border-t border-white/10 ih-mobile-nav-safe">
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

      <MobileBottomNav items={bottomNavItems} hidden={isMobileOpen} moreItems={moreItems} onLogout={onLogout} />
    </>
  );
};

export default AreaAdminSidebar;
