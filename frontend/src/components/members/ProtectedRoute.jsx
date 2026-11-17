import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'

/**
 * Gate for every members route. `allowedRoles` takes Role keys; `superAdminOnly`
 * covers the configuration screens (roles, form builder, workflow, master data);
 * `canCreateAccessLinksOnly` covers the access-links screen, which a scoped
 * role can also reach without being a super admin.
 */
export default function ProtectedRoute({ children, allowedRoles = [], superAdminOnly = false, canCreateAccessLinksOnly = false }) {
  const { isAuthenticated, initializing, roleKey, isSuperAdmin, canCreateAccessLinks } = useAuth()
  const navigate = useNavigate()

  if (initializing) {
    return (
      <div className="mbr mbr-canvas flex min-h-dvh items-center justify-center">
        <div className="text-center" role="status">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-royal-100 border-t-royal-600" />
          <p className="text-sm font-medium text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/members/login" replace />

  const denied =
    (superAdminOnly && !isSuperAdmin) ||
    (canCreateAccessLinksOnly && !canCreateAccessLinks) ||
    (allowedRoles.length > 0 && !isSuperAdmin && !allowedRoles.includes(roleKey))

  if (denied) {
    // A shared/direct link can land here with no prior history entry in this
    // tab, so window.history.back() alone can be a dead end.
    const goBack = () => {
      if (window.history.length > 1) window.history.back()
      else navigate('/members')
    }
    return (
      <div className="mbr mbr-canvas flex min-h-dvh items-center justify-center px-4">
        <div className="mbr-card w-full max-w-sm p-6 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert size={24} />
          </span>
          <h2 className="text-lg font-bold text-ink">Access denied</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">You don't have permission to view this page.</p>
          <button onClick={goBack} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-royal-600 px-4 text-sm font-semibold text-white hover:bg-royal-700">
            Go back
          </button>
        </div>
      </div>
    )
  }

  return children
}
