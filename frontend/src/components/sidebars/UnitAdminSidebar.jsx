import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  Star,
  ClipboardList,
  Users,
  BarChart3,
  BarChart2,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Target as TargetIcon
} from 'lucide-react';
import jihLogoWhite from '../../assets/LogoWhite.png';
import PoweredByD4DX from './PoweredByD4DX';

/**
 * Sidebar component for unit administrators.
 * Matches the styling of area/district sidebars for consistent UX.
 */
const UnitAdminSidebar = ({
  activeTab = 'monthly',
  onNavigate,
  onLogout,
  onNotifications,
  onDynamicReports,
  onNavigateToMembership,
  onReportTypeSelect,
  reportCounts = null,
  unitName = '—',
  areaName = '',
  isMobileOpen = false,
  onMobileToggle
}) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState('dynamic-reports');
  const navigate = useNavigate();

  const handleReportType = (type) => {
    if (onReportTypeSelect) {
      onReportTypeSelect(type);
    } else {
      navigate('/user-reports', { state: { initialType: type } });
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'ഡാഷ്ബോർഡ്', icon: LayoutDashboard },
    { id: 'monthly', label: 'പ്രതിമാസ റിപ്പോൾട്ടുകൾ', icon: ClipboardList },
    { id: 'stats', label: 'സ്ഥിതിവിവരക്കണക്കുകൾ', icon: BarChart3 },
    { id: 'membership', label: 'അംഗത്വം', icon: Users, onClick: onNavigateToMembership },
    {
      id: 'dynamic-reports',
      type: 'group',
      label: 'ഡൈനാമിക് റിപ്പോർട്ടുകൾ',
      icon: FileText,
      children: [
        { id: 'monthly-report-type', label: 'മന്ത്ലി', icon: Calendar, onClick: () => handleReportType('monthly'), count: reportCounts?.monthly },
        { id: 'quarterly-report-type', label: 'ക്വാർട്ടർലി', icon: BarChart2, onClick: () => handleReportType('quarterly'), count: reportCounts?.quarterly },
        { id: 'yearly-report-type', label: 'ഇയർലി', icon: CalendarDays, onClick: () => handleReportType('yearly'), count: reportCounts?.yearly },
        { id: 'special-report-type', label: 'സ്പെഷ്യൽ', icon: Star, onClick: () => handleReportType('special'), count: reportCounts?.special },
      ]
    },
    {
      id: 'notifications',
      label: 'നോട്ടിഫിക്കേഷൻ',
      icon: Bell,
      onClick: onNotifications || (() => { onNavigate?.('notifications'); })
    },
    { id: 'targets', label: 'ടാർഗറ്റ്', icon: TargetIcon, onClick: () => navigate('/targets') }
  ];

  const handleNavigate = (item) => {
    if (item.onClick && typeof item.onClick === 'function') {
      item.onClick();
      if (onMobileToggle) onMobileToggle();
      return;
    }
    if (onNavigate) {
      onNavigate(item.id);
    } else {
      try {
        const ud = JSON.parse(localStorage.getItem('userData') || '{}');
        if (ud.unitId) navigate(`/unit-dashboard/${ud.unitId}`, { state: { initialTab: item.id } });
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
        className={`fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] sm:w-72 bg-white shadow-2xl border-r border-gray-200 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:flex-shrink-0 overflow-hidden ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'} ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-[#002349] to-[#1a3a5c]">
            <div className="flex items-center space-x-3 min-w-0">
              <img src={jihLogoWhite} alt="JIH Logo" className="h-9 w-auto" />
              <div className={isDesktopCollapsed ? 'lg:hidden' : ''}>
                <h2
                  className="text-base font-bold text-white"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  JIH Plus
                </h2>
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
              onClick={onMobileToggle}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

  {/* Unit Info */}
  <div className={`px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-0.5 ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
    {areaName && (
      <>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Area</p>
        <p className="text-sm text-[#002349] font-semibold truncate uppercase">{areaName}</p>
      </>
    )}
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Unit</p>
    <p className="text-sm text-[#002349] font-semibold truncate uppercase">{unitName}</p>
  </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.type === 'group') {
                  const isOpen = expandedGroup === item.id;
                  const isGroupActive = (item.children || []).some(c => activeTab === c.id);
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setExpandedGroup(isOpen ? null : item.id)}
                        className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          isGroupActive ? 'bg-gradient-to-r text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100 hover:text-[#002349]'
                        }`}
                        style={isGroupActive ? { background: 'linear-gradient(to right, #002349, #002349dd)' } : {}}
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
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => { child.onClick?.(); if (onMobileToggle) onMobileToggle(); }}
                                className={`w-full flex items-center justify-between pl-3 pr-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  isChildActive ? 'bg-[#002349]/10 text-[#002349] font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-[#002349]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {child.icon && (() => { const CI = child.icon; return <CI className={`w-3.5 h-3.5 flex-shrink-0 ${isChildActive ? 'text-[#002349]' : 'text-gray-400'}`} />; })()}
                                  <span>{child.label}</span>
                                </div>
                                {child.count > 0 && (
                                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{child.count}</span>
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
                    className={`w-full flex items-center ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#002349]'
                    }`}
                    style={
                      isActive
                        ? { background: 'linear-gradient(to right, #002349, #002349dd)' }
                        : {}
                    }
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

          {/* Logout */}
          <div className="p-3 border-t border-gray-100">
            <PoweredByD4DX collapsed={isDesktopCollapsed} />
            <button
              onClick={() => {
                if (onLogout) onLogout();
                if (onMobileToggle) onMobileToggle();
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

export default UnitAdminSidebar;


