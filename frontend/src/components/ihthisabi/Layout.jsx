import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import ConfirmationModal from './ConfirmationModal'
import PoweredByD4DX from '../sidebars/PoweredByD4DX'
import LogoWhite from '../../assets/LogoWhite.png'
import LogoColor from '../../assets/LogoColor.png'
import { 
  Home, 
  FileText, 
  BarChart3, 
  User, 
  LogOut, 
  Menu, 
  X,
  Users,
  ClipboardList,
  LifeBuoy,
  Settings,
  MessageSquare,
  Globe,
  Database,
  Archive,
  MapPin,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    logout()
    navigate('/ihthisabi/login')
    setShowLogoutModal(false)
  }

  // A nav item is active only if it is the *best* (longest) matching route for the
  // current path. Plain prefix matching made the dashboard href (e.g. /ihthisabi/admin)
  // stay active on every /ihthisabi/admin/* sub-route. bestMatchHref (computed below)
  // resolves this by picking the single most-specific destination.
  const isActive = (href) => href != null && href === bestMatchHref

  const isGroupActive = (children) =>
    children.some(child => isActive(child.href))

  // Auto-expand groups that contain the active route
  useEffect(() => {
    const groups = buildNavigation()
    const toExpand = new Set()
    groups.forEach(item => {
      if (item.type === 'group' && isGroupActive(item.children)) {
        toExpand.add(item.name)
      }
    })
    if (toExpand.size > 0) {
      setExpandedGroups(prev => new Set([...prev, ...toExpand]))
    }
  }, [location.pathname])

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const isSuperAdmin = user?.isAdmin || user?.role === 'mainAdmin'

  const dashboardHref =
    user?.role === 'admin' ? '/ihthisabi/admin'
    : user?.role === 'unitAdmin' ? '/ihthisabi/unitadmin'
    : user?.role === 'districtAdmin' ? '/ihthisabi/districtadmin'
    : '/ihthisabi/dashboard'

  const buildNavigation = () => {
    if (user?.role === 'rukn') {
      return [
        { name: 'Dashboard', mobileName: 'Dashboard', href: dashboardHref, icon: Home },
        { name: 'Submit Form', mobileName: 'Submit', href: '/ihthisabi/submit', icon: FileText },
        { name: 'Profile', mobileName: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'Help Desk', mobileName: 'Help', href: '/ihthisabi/help-desk', icon: LifeBuoy },
      ]
    }

    if (user?.role === 'unitAdmin') {
      return [
        { name: 'Dashboard', mobileName: 'Dashboard', href: dashboardHref, icon: Home },
        { name: 'Unit Submissions', mobileName: 'Forms', href: '/ihthisabi/unitadmin/submissions', icon: BarChart3 },
        { name: 'Unit Members', mobileName: 'Members', href: '/ihthisabi/unitadmin/members', icon: Users },
        { name: 'Profile', mobileName: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'Help Desk', mobileName: 'Help', href: '/ihthisabi/help-desk', icon: LifeBuoy },
      ]
    }

    if (user?.role === 'districtAdmin') {
      return [
        { name: 'Dashboard', mobileName: 'Dashboard', href: dashboardHref, icon: Home },
        { name: 'District Submissions', mobileName: 'Forms', href: '/ihthisabi/districtadmin/submissions', icon: BarChart3 },
        { name: 'District Members', mobileName: 'Members', href: '/ihthisabi/districtadmin/members', icon: Users },
        { name: 'Profile', mobileName: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'Help Desk', mobileName: 'Help', href: '/ihthisabi/help-desk', icon: LifeBuoy },
      ]
    }

    if (user?.role === 'admin') {
      return [
        { name: 'Dashboard', mobileName: 'Home', href: '/ihthisabi/admin', icon: Home },
        {
          name: 'Submissions',
          mobileName: 'Forms',
          icon: BarChart3,
          type: 'group',
          children: [
            { name: 'All Submissions', href: '/ihthisabi/admin/submissions', icon: BarChart3 },
            { name: 'Consolidation', href: '/ihthisabi/admin/consolidation', icon: BarChart3 },
            { name: 'Unit Reply', href: '/ihthisabi/admin/unit-reply', icon: MessageSquare },
          ]
        },
        { name: 'Form Management', mobileName: 'Forms', href: '/ihthisabi/admin/form-management', icon: ClipboardList },
        {
          name: 'User Management',
          mobileName: 'Users',
          icon: Users,
          type: 'group',
          children: [
            { name: 'All Members', href: '/ihthisabi/admin/members', icon: Users },
            { name: 'Unit Admins', href: '/ihthisabi/admin/unit-admins', icon: Settings },
            { name: 'District Admins', href: '/ihthisabi/admin/district-admins', icon: Settings },
            ...(isSuperAdmin ? [
              { name: 'User Management', href: '/ihthisabi/admin/user-management', icon: Settings },
              { name: 'Archive', href: '/ihthisabi/admin/archive', icon: Archive },
            ] : []),
            { name: 'Abroad Countries', href: '/ihthisabi/admin/abroad-countries', icon: Globe },
            { name: 'Abroad Members', href: '/ihthisabi/admin/abroad-members', icon: MapPin },
          ]
        },
        { name: 'Master Data', mobileName: 'Data', href: '/ihthisabi/admin/master-data', icon: Database },
        { name: 'Profile', mobileName: 'Profile', href: '/ihthisabi/profile', icon: User },
      ]
    }

    return [
      { name: 'Dashboard', mobileName: 'Dashboard', href: dashboardHref, icon: Home },
      { name: 'Profile', mobileName: 'Profile', href: '/ihthisabi/profile', icon: User },
    ]
  }

  const navigation = buildNavigation()

  // Longest nav href that matches the current path (see isActive above).
  const bestMatchHref = (() => {
    const currentPath = location.pathname
    const leaves = []
    navigation.forEach(item => {
      if (item.type === 'group') item.children.forEach(c => leaves.push(c.href))
      else if (item.href) leaves.push(item.href)
    })
    let best = null
    for (const href of leaves) {
      if (currentPath === href || currentPath.startsWith(href + '/')) {
        if (!best || href.length > best.length) best = href
      }
    }
    return best
  })()

  // Curated mobile bottom nav — a minimal set of the most important destinations
  // plus a "More" button that opens the full sidebar. `match` lets a tab stay
  // highlighted across a section's related sub-routes.
  const buildBottomNav = () => {
    if (user?.role === 'rukn') {
      return [
        { name: 'Home', href: dashboardHref, icon: Home },
        { name: 'Submit', href: '/ihthisabi/submit', icon: FileText },
        { name: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'Help', href: '/ihthisabi/help-desk', icon: LifeBuoy },
      ]
    }
    if (user?.role === 'unitAdmin') {
      return [
        { name: 'Home', href: dashboardHref, icon: Home },
        { name: 'Forms', href: '/ihthisabi/unitadmin/submissions', icon: BarChart3 },
        { name: 'Members', href: '/ihthisabi/unitadmin/members', icon: Users },
        { name: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'More', icon: Menu, action: 'menu' },
      ]
    }
    if (user?.role === 'districtAdmin') {
      return [
        { name: 'Home', href: dashboardHref, icon: Home },
        { name: 'Forms', href: '/ihthisabi/districtadmin/submissions', icon: BarChart3 },
        { name: 'Members', href: '/ihthisabi/districtadmin/members', icon: Users },
        { name: 'Profile', href: '/ihthisabi/profile', icon: User },
        { name: 'More', icon: Menu, action: 'menu' },
      ]
    }
    if (user?.role === 'admin') {
      return [
        { name: 'Home', href: '/ihthisabi/admin', icon: Home, match: ['/ihthisabi/admin'] },
        { name: 'Reports', href: '/ihthisabi/admin/submissions', icon: BarChart3,
          match: ['/ihthisabi/admin/submissions', '/ihthisabi/admin/consolidation', '/ihthisabi/admin/unit-reply'] },
        { name: 'Forms', href: '/ihthisabi/admin/form-management', icon: ClipboardList },
        { name: 'Users', href: '/ihthisabi/admin/members', icon: Users,
          match: ['/ihthisabi/admin/members', '/ihthisabi/admin/unit-admins', '/ihthisabi/admin/user-management',
                  '/ihthisabi/admin/archive', '/ihthisabi/admin/abroad-countries', '/ihthisabi/admin/abroad-members'] },
        { name: 'More', icon: Menu, action: 'menu' },
      ]
    }
    return [
      { name: 'Home', href: dashboardHref, icon: Home },
      { name: 'Profile', href: '/ihthisabi/profile', icon: User },
    ]
  }

  const bottomNavItems = buildBottomNav()

  const isBottomActive = (item) => {
    if (item.action === 'menu') return sidebarOpen
    if (item.match) return item.match.includes(bestMatchHref)
    return isActive(item.href)
  }

  const handleBottomClick = (item) => {
    if (item.action === 'menu') {
      setSidebarOpen(true)
    } else {
      navigate(item.href)
    }
  }

  const roleLabel = user?.role === 'unitAdmin'
    ? 'Unit Admin'
    : user?.role === 'districtAdmin'
      ? 'District Admin'
      : user?.role === 'admin'
        ? 'Admin'
        : 'Member'

  const renderNavItem = (item) => {
    if (item.type === 'group') {
      const Icon = item.icon
      const groupActive = isGroupActive(item.children)
      const expanded = expandedGroups.has(item.name)
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleGroup(item.name)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
              groupActive
                ? 'text-white bg-white/10'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${groupActive ? 'text-white' : 'text-white/50'}`} />
            <span className="flex-1 text-left">{item.name}</span>
            {expanded
              ? <ChevronDown className="w-4 h-4 text-white/50 flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" />
            }
          </button>
          {expanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 pb-1">
              {item.children.map(child => {
                const ChildIcon = child.icon
                const active = isActive(child.href)
                return (
                  <button
                    key={child.href}
                    onClick={() => { navigate(child.href); setSidebarOpen(false) }}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-[#7B4FF2] text-white shadow-lg shadow-[#7B4FF2]/30'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <ChildIcon className={`w-4 h-4 mr-2.5 flex-shrink-0 ${active ? 'text-white' : 'text-white/40'}`} />
                    <span>{child.name}</span>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <button
        key={item.name}
        onClick={() => { navigate(item.href); setSidebarOpen(false) }}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
          active
            ? 'bg-[#7B4FF2] text-white shadow-lg shadow-[#7B4FF2]/30 transform scale-[1.02]'
            : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${active ? 'text-white' : 'text-white/50'}`} />
        <span>{item.name}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#1E1040] to-[#2D1B69] border-r border-[#3D2475] shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#3D2475] bg-[#1A0D3D]/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <img 
              src={LogoWhite} 
              alt="IHTHISABI Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <span className="text-sm font-bold text-white block">IHTHISABI</span>
              <span className="text-xs text-purple-300">REPORT</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-purple-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar content */}
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <nav className="mt-6 px-3 flex-1 overflow-y-auto scrollbar-hide">
            <div className="space-y-1 pb-4">
              {navigation.map(item => renderNavItem(item))}
            </div>
          </nav>

          {/* Powered by and logout at bottom */}
          <div className="mt-auto p-4 border-t border-white/10 bg-[#1A0D3D]/30 backdrop-blur-sm">
            <PoweredByD4DX dark />
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white/80 bg-white/5 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 border border-white/10 hover:border-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_rgba(16,24,40,0.06)]">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <div className="min-w-0 flex items-center gap-2">
              <img src={LogoColor} alt="IHTHISABI" className="h-8 w-8 shrink-0 object-contain" />
              <p className="truncate text-[11px] leading-tight text-gray-500">
                {user?.unit || user?.username || roleLabel}
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                aria-label="Account menu"
              >
                <User className="w-4 h-4" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <PoweredByD4DX />
                  <button
                    onClick={() => { setProfileMenuOpen(false); handleLogout() }}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {profileMenuOpen && (
            <div className="fixed inset-0 z-20" onClick={() => setProfileMenuOpen(false)} />
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 ih-mobile-bottom-safe lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav — curated minimal destinations + More */}
        {bottomNavItems.length > 0 && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-1px_0_rgba(16,24,40,0.06),0_-8px_32px_rgba(16,24,40,0.06)] ih-mobile-nav-safe">
            <nav
              className="grid gap-0.5 px-1.5 py-1"
              style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}
            >
              {bottomNavItems.map((item) => {
                const Icon = item.icon
                const active = isBottomActive(item)
                return (
                  <button
                    key={item.name}
                    onClick={() => handleBottomClick(item)}
                    className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[9px] font-semibold leading-none transition-colors duration-300 ease-out ${
                      active ? 'text-[#7B4FF2]' : 'text-gray-400 hover:text-gray-700'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={`flex h-7 w-full max-w-[46px] items-center justify-center rounded-full transition-all duration-300 ease-out ${
                        active ? 'bg-[#7B4FF2]/12' : 'bg-transparent'
                      }`}
                    >
                      <Icon className={`h-[17px] w-[17px] shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
                    </span>
                    <span className="max-w-full truncate">{item.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to login again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  )
}

export default Layout

