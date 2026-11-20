import React, { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Link2, Settings2, Users, Shield,
  MapPinned, Bell, LogOut, Menu, Workflow as WorkflowIcon, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'
import { api } from '../../utils/members/api'
import BrandLogo from '../branding/BrandLogo'
import useModalFocus from '../../hooks/useModalFocus'
import {
  Avatar
} from './ui'
import { cx } from '../../utils/members/format'

/**
 * Nav is derived from the logged-in account's Role record rather than a hardcoded
 * switch, so a role added in the admin panel gets a working sidebar with no code
 * change. Configuration screens stay super-admin only.
 */
function navItems({ isSuperAdmin, canCreateAccessLinks }) {
  const items = [
    { to: '/members', end: true, label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
    { to: '/members/applications', label: 'Applications', icon: FileText, description: 'Review and track' }
  ]
  if (canCreateAccessLinks) {
    items.push({ to: '/members/access-links', label: 'Form Access', short: 'Links', icon: Link2, description: 'Applicant links' })
  }
  items.push({ to: '/members/notifications', label: 'Notifications', short: 'Alerts', icon: Bell, description: 'Updates for you' })
  if (isSuperAdmin) {
    items.push(
      { to: '/members/forms', label: 'Form Builder', short: 'Forms', icon: Settings2, section: 'Configuration' },
      { to: '/members/workflows', label: 'Workflows', icon: WorkflowIcon },
      { to: '/members/roles', label: 'Roles', icon: Shield },
      { to: '/members/accounts', label: 'Accounts', icon: Users },
      { to: '/members/master-data', label: 'Master Data', short: 'Locations', icon: MapPinned }
    )
  }
  return items
}

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

// Detail screens get a back arrow in the app bar instead of the logo.
const DETAIL_TITLES = {
  '/members/applications': 'Application',
  '/members/forms': 'Edit form'
}

export default function Layout() {
  const { user, logout, isSuperAdmin, canCreateAccessLinks } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const { dialogRef: moreSheetRef, triggerRef: moreButtonRef } = useModalFocus(moreOpen, closeMore)
  const [unread, setUnread] = useState(0)

  // Refresh the unread badge on every navigation, so reading a notification
  // (or a new one arriving) shows without a reload.
  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(({ data }) => setUnread(data.count || 0))
      .catch(() => {})
  }, [location.pathname])

  // Close the "More" sheet whenever the route changes (e.g. a row navigated away).
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const items = navItems({ isSuperAdmin, canCreateAccessLinks })
  const path = location.pathname

  const pageTitle = (() => {
    let best = null
    Object.keys(PAGE_TITLES).forEach(prefix => {
      if (path === prefix || path.startsWith(prefix + '/')) {
        if (!best || prefix.length > best.length) best = prefix
      }
    })
    return best ? PAGE_TITLES[best] : 'Members Portal'
  })()

  const detailParent = Object.keys(DETAIL_TITLES).find(prefix => path.startsWith(prefix + '/'))
  const title = detailParent ? DETAIL_TITLES[detailParent] : pageTitle

  // Bottom bar: Home, Applications, then Form Access for roles that issue links
  // (their alerts live on the app-bar bell) or Alerts for everyone else, then
  // More. Always derived from `items`, so a missing permission never leaves a
  // dead tab; the More sheet carries everything the bar does not.
  const barTargets = ['/members', '/members/applications', canCreateAccessLinks ? '/members/access-links' : '/members/notifications']
  const barItems = items.filter(item => barTargets.includes(item.to))
  const moreItems = items.filter(item => !barTargets.includes(item.to))
  const workspaceMore = moreItems.filter(item => !item.section && !isConfig(item, items))
  const configMore = moreItems.filter(item => isConfig(item, items))
  const isActive = (to, end) => (end ? path === to : path === to || path.startsWith(to + '/'))
  const hasActiveMoreItem = moreItems.some(item => isActive(item.to, item.end))

  const handleLogout = () => {
    logout()
    navigate('/members/login', { replace: true })
  }

  const scopeLabel =
    user?.scope?.unit || user?.scope?.area || user?.scope?.district || user?.scope?.mekhala || ''
  const roleLine = [user?.role?.name || (isSuperAdmin ? 'Super admin' : ''), scopeLabel].filter(Boolean).join(' · ')
  const badge = unread > 99 ? '99+' : unread

  const sidebar = (
    <nav className="flex h-full w-full flex-col" aria-label="Main">
      <Link to="/members" className="flex items-center gap-3 px-5 pb-5 pt-6">
        <BrandLogo alt="JIH Plus" size="sm" variant="white" />
        <span className="min-w-0">
          <span className="block font-semibold leading-tight text-white">Members Portal</span>
          <span className="mt-0.5 block text-xs text-royal-200/70">Rukn &amp; Karkun</span>
        </span>
      </Link>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map(item => {
          const Icon = item.icon
          return (
            <React.Fragment key={item.to}>
              {item.section && (
                <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">{item.section}</p>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive: active }) => cx(
                  'relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/[0.11] text-white before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-royal-300'
                    : 'text-[#aebbe3] hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.to === '/members/notifications' && unread > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge}</span>
                )}
              </NavLink>
            </React.Fragment>
          )
        })}
      </div>

      <div className="m-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
        <Avatar name={user?.name} size="sm" className="bg-white/15 text-white" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="truncate text-xs text-[#aebbe3]">{roleLine}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[#aebbe3] transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
        </button>
      </div>
    </nav>
  )

  return (
    /* The shell is exactly one viewport tall and never scrolls itself — only
       <main> below scrolls. That keeps the sidebar (and its sign-out block)
       physically fixed no matter how long the page content is. */
    <div className="mbr app-viewport flex">
      <aside className="mbr-sidebar hidden h-full w-[260px] shrink-0 lg:flex">
        {sidebar}
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 shrink-0 border-b border-line bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-2.5 px-3">
            {detailParent ? (
              // A real link, so pages with unsaved-change guards (the form
              // builder intercepts in-app link clicks) can still stop it.
              <Link
                to={detailParent}
                aria-label="Back"
                className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink active:bg-slate-100"
              >
                <ChevronLeft size={22} />
              </Link>
            ) : (
              <BrandLogo alt="JIH Plus" size="xs" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold leading-tight text-ink">{title}</p>
              {!detailParent && path === '/members' && roleLine && (
                <p className="truncate text-xs leading-tight text-slate-500">{roleLine}</p>
              )}
            </div>
            <NavLink
              to="/members/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className={({ isActive: active }) => cx(
                'relative -mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                active ? 'bg-royal-50 text-royal-700' : 'text-slate-600 active:bg-slate-100'
              )}
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                  {badge}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        <main data-app-scroll className="app-scroll-region mbr-bottom-safe flex-1 px-3 pt-3 sm:px-6 sm:pt-5 lg:px-10 lg:pt-8">
          {/* Every page renders inside the same centred container so widths stay uniform. */}
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav — curated destinations from `items` + More */}
        {moreOpen && (
          <div className="mbr-fade-in fixed inset-0 z-30 bg-ink/45 backdrop-blur-[2px] lg:hidden" onClick={() => setMoreOpen(false)} />
        )}
        <div
          className={cx(
            'fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden',
            moreOpen
              ? 'rounded-t-[1.75rem] bg-[#fff] shadow-[0_-12px_40px_rgba(11,20,48,0.2)]'
              : 'border-t border-line bg-white/90 backdrop-blur-xl'
          )}
        >
          {/* "More" sheet — grows upward out of the bar, carrying only the
              destinations the bar itself doesn't already show. */}
          {moreOpen && (
            <div
              ref={moreSheetRef}
              id="members-mobile-more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              className="mbr-sheet-in max-h-[68vh] overflow-y-auto overscroll-contain px-4 pb-2 pt-2"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />

              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-mist p-3">
                <Avatar name={user?.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{user?.name}</p>
                  <p className="text-xs leading-snug text-slate-500 [overflow-wrap:anywhere]">{roleLine}</p>
                </div>
              </div>

              {workspaceMore.length > 0 && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-line">
                  {workspaceMore.map(item => {
                    const Icon = item.icon
                    const active = isActive(item.to, item.end)
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={cx('flex min-h-[56px] items-center gap-3 border-b border-line px-3 last:border-b-0', active ? 'bg-royal-50' : 'active:bg-mist')}
                      >
                        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', active ? 'bg-royal-600 text-white' : 'bg-royal-50 text-royal-700')}>
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{item.label}</span>
                          {item.description && <span className="block text-xs text-slate-500">{item.description}</span>}
                        </span>
                        {item.to === '/members/notifications' && unread > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge}</span>
                        )}
                        <ChevronRight size={16} className="shrink-0 text-slate-300" />
                      </NavLink>
                    )
                  })}
                </div>
              )}

              {configMore.length > 0 && (
                <>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Configuration</p>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {configMore.map(item => {
                      const Icon = item.icon
                      const active = isActive(item.to, item.end)
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={cx(
                            'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 text-center text-xs font-semibold leading-tight',
                            active ? 'border-royal-200 bg-royal-50 text-royal-700' : 'border-line text-slate-700 active:bg-mist'
                          )}
                        >
                          <Icon size={20} className={active ? 'text-royal-600' : 'text-royal-600/80'} />
                          {item.short || item.label}
                        </NavLink>
                      )
                    })}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => { setMoreOpen(false); handleLogout() }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-semibold text-rose-700 active:bg-rose-100"
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          )}

          <nav
            className="grid h-[4.25rem] px-1.5"
            style={{ gridTemplateColumns: `repeat(${barItems.length + 1}, minmax(0, 1fr))` }}
            aria-label="Primary"
          >
            {barItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="group flex min-w-0 flex-col items-center justify-center gap-1"
                >
                  {({ isActive: active }) => (
                    <>
                      <span className={cx('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors', active ? 'bg-royal-100 text-royal-700' : 'text-slate-500')}>
                        <Icon size={20} strokeWidth={active ? 2.3 : 2} />
                        {item.to === '/members/notifications' && unread > 0 && (
                          <span className="absolute right-1.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className={cx('max-w-full text-center text-xs leading-none', active ? 'font-semibold text-royal-700' : 'font-medium text-slate-500')}>
                        {item.short || item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })}
            <button
              type="button"
              ref={moreButtonRef}
              onClick={() => setMoreOpen(v => !v)}
              className="mobile-compact-control flex min-w-0 flex-col items-center justify-center gap-1"
              aria-current={hasActiveMoreItem ? 'page' : undefined}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="members-mobile-more-sheet"
            >
              <span className={cx('flex h-8 w-14 items-center justify-center rounded-full transition-colors', moreOpen || hasActiveMoreItem ? 'bg-royal-100 text-royal-700' : 'text-slate-500')}>
                <Menu size={20} />
              </span>
              <span className={cx('text-xs leading-none', moreOpen || hasActiveMoreItem ? 'font-semibold text-royal-700' : 'font-medium text-slate-500')}>More</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

/** Items from the first `section` entry onward are configuration screens. */
function isConfig(item, all) {
  const firstConfig = all.findIndex(i => i.section)
  return firstConfig !== -1 && all.indexOf(item) >= firstConfig
}
