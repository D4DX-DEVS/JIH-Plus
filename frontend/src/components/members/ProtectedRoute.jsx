import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-gray-200 border-t-[#5b21b6] rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view this page.</p>
          <button onClick={goBack} className="px-4 py-2 rounded-lg bg-[#5b21b6] text-white">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return children
}
