import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Link2, Settings2, Users, Shield,
  MapPinned, Bell, LogOut, Menu, Workflow as WorkflowIcon, UserRound
} from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'
import { api } from '../../utils/members/api'

/**
 * Nav is derived from the logged-in account's Role record rather than a hardcoded
 * switch, so a role added in the admin panel gets a working sidebar with no code
 * change. Configuration screens stay super-admin only.
 */
function navItems({ isSuperAdmin, canCreateAccessLinks }) {
  const items = [
    { to: '/members', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/members/applications', label: 'Applications', icon: FileText }
  ]
  if (canCreateAccessLinks) {
    items.push({ to: '/members/access-links', label: 'Form Access', icon: Link2 })
  }
  items.push({ to: '/members/notifications', label: 'Notifications', icon: Bell })
  if (isSuperAdmin) {
    items.push(
      { to: '/members/forms', label: 'Form Builder', icon: Settings2, section: 'Configuration' },
      { to: '/members/workflows', label: 'Workflows', icon: WorkflowIcon },
      { to: '/members/roles', label: 'Roles', icon: Shield },
      { to: '/members/accounts', label: 'Accounts', icon: Users },
      { to: '/members/master-data', label: 'Master Data', icon: MapPinned }
    )
  }
  return items
}

export default function Layout() {
  const { user, logout, isSuperAdmin, canCreateAccessLinks } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(({ data }) => setUnread(data.count || 0))
      .catch(() => {})
  }, [])

  // Close the "More" sheet whenever the route changes (e.g. a row navigated away).
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const items = navItems({ isSuperAdmin, canCreateAccessLinks })

  // Mobile app-bar title. Pages hide their own <h1> on phones, so the bar is the
  // only thing that names the screen — longest matching prefix wins.
  const PAGE_TITLES = {
    '/members/applications': 'Applications',
    '/members/notifications': 'Notifications',
    '/members/access-links': 'Form Access',
    '/members/forms': 'Form Builder',
    '/members/workflows': 'Workflows',
    '/members/roles': 'Roles',
    '/members/accounts': 'Accounts',
    '/members/master-data': 'Master Data',
    '/members': 'Dashboard'
  }

  const pageTitle = (() => {
    const current = location.pathname
    let best = null
    Object.keys(PAGE_TITLES).forEach(prefix => {
      if (current === prefix || current.startsWith(prefix + '/')) {
        if (!best || prefix.length > best.length) best = prefix
      }
    })
    return best ? PAGE_TITLES[best] : 'Members Application'
  })()

  // Curated mobile bottom bar — the most important destinations, always derived
  // from `items` so a role missing a permission never gets a dead tab. Everything
  // else (permission-gated or super-admin-only) lives in the "More" sheet instead.
  const BAR_LABELS = ['Dashboard', 'Applications', 'Notifications']
  const barItems = items.filter((item) => BAR_LABELS.includes(item.label))
  const moreItems = items.filter((item) => !BAR_LABELS.includes(item.label))

  const handleLogout = () => {
    logout()
    navigate('/members/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gradient-to-r from-[#6d28d9] to-[#5b21b6] text-white shadow-sm'
        : 'text-gray-600 hover:bg-violet-50 hover:text-[#5b21b6]'
    }`

  const scopeLabel =
    user?.scope?.unit || user?.scope?.area || user?.scope?.district || user?.scope?.mekhala || ''

  const sidebar = (
    <nav className="flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white flex items-center justify-center font-bold text-sm shadow-sm">
          MA
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 leading-tight truncate">Members Application</p>
          <p className="text-xs text-gray-500 mt-0.5">Rukn &amp; Karkoon</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <React.Fragment key={item.to}>
              {item.section && (
                <p className="px-3.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {item.section}
                </p>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={linkClass}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.label === 'Notifications' && unread > 0 && (
                  <span className="ml-auto text-[11px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            </React.Fragment>
          )
        })}
      </div>

      <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-violet-100 text-[#5b21b6] flex items-center justify-center">
            <UserRound size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role?.name}
              {scopeLabel ? ` · ${scopeLabel}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </nav>
  )

  return (
    /* The shell is exactly one viewport tall and never scrolls itself — only
       <main> below scrolls. That keeps the sidebar (and its sign-out block)
       physically fixed no matter how long the page content is. */
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white border-r border-gray-200 h-full">
        {sidebar}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <header className="lg:hidden flex-shrink-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
          {unread > 0 && (
            <NavLink to="/members/notifications" className="ml-auto relative p-3 -mr-1 text-gray-600">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full px-1 py-0.5 leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            </NavLink>
          )}
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 ih-mobile-bottom-safe lg:pb-8">
          {/* Every page renders inside the same centered container so widths stay uniform. */}
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav — curated destinations from `items` + More */}
        {moreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-gray-900/40"
            onClick={() => setMoreOpen(false)}
          />
        )}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-1px_0_rgba(16,24,40,0.06),0_-8px_32px_rgba(16,24,40,0.06)] ih-mobile-nav-safe">
          {/* "More" sheet — grows upward out of the bar, carrying only the
              destinations the bar itself doesn't already show. */}
          {moreOpen && (
            <div className="ih-more-sheet max-h-[60vh] overflow-y-auto border-b border-gray-200 bg-white px-3 pb-2 pt-3">
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <React.Fragment key={item.to}>
                      {item.section && (
                        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          {item.section}
                        </p>
                      )}
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
                            isActive ? 'bg-[#7c3aed] text-white' : 'text-gray-700 active:bg-gray-100'
                          }`
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </NavLink>
                    </React.Fragment>
                  )
                })}
              </div>

              <div className="mt-2 border-t border-gray-100 pt-2">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-violet-100 text-[#5b21b6] flex items-center justify-center">
                    <UserRound size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.role?.name}
                      {scopeLabel ? ` · ${scopeLabel}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setMoreOpen(false); handleLogout() }}
                  className="flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors active:bg-red-50"
                >
                  <LogOut size={18} className="shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <nav
            className="grid gap-0.5 px-1.5 py-1"
            style={{ gridTemplateColumns: `repeat(${barItems.length + 1}, minmax(0, 1fr))` }}
          >
            {barItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[9px] font-semibold ${
                      isActive ? 'text-[#7c3aed]' : 'text-gray-400'
                    }`
                  }
                >
                  <span className="relative flex items-center justify-center">
                    <Icon size={18} className="shrink-0" />
                    {item.label === 'Notifications' && unread > 0 && (
                      <span className="absolute -top-1.5 -right-2 text-[9px] font-semibold bg-red-500 text-white rounded-full px-1 py-0.5 leading-none">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </NavLink>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[9px] font-semibold ${
                moreOpen ? 'text-[#7c3aed]' : 'text-gray-400'
              }`}
            >
              <Menu size={18} className="shrink-0" />
              <span className="max-w-full truncate">More</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
