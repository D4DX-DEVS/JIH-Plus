import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { User, Shield, Users, Building2, ArrowLeft, ArrowRight, Landmark, Lock, Mail, KeyRound } from 'lucide-react'
import AuthShell from '../../components/auth/AuthShell'
import { AuthButton, AuthError, AuthField, AuthInfoBanner, AuthTabs } from '../../components/auth/AuthControls'

const LOGIN_TABS = [
  { value: 'rukn', label: 'RUKN Login', icon: User },
  { value: 'admin', label: 'Admin Login', icon: Shield },
]

const ROLE_ICONS = {
  mekhalaNazim: Landmark,
  districtAdmin: Building2,
  unitAdmin: Users,
}

const LoginPage = () => {
  const [formData, setFormData] = useState({
    ruknId: ''
  })
  const [mainAdminFormData, setMainAdminFormData] = useState({
    email: '',
    password: '',
    role: 'mainAdmin'
  })
  const [loading, setLoading] = useState(false)
  const [showMainAdminLogin, setShowMainAdminLogin] = useState(false)
  const [error, setError] = useState(null)
  const [adminError, setAdminError] = useState(null)
  // Set when the RUKN ID holds multiple roles: { ruknId, name, availableRoles }
  const [roleSelection, setRoleSelection] = useState(null)

  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Only redirect if user was already authenticated when page FIRST loaded
  // This handles the case where user visits /login while already logged in
  // We use a ref to track if this is the initial mount
  const hasCheckedInitialAuth = useRef(false)

  useEffect(() => {
    // Only check on initial mount, not on subsequent auth state changes
    if (!hasCheckedInitialAuth.current) {
      hasCheckedInitialAuth.current = true

      // If user is already authenticated on page load, redirect them
      if (isAuthenticated && user) {
        let redirectPath = '/ihthisabi/dashboard'
        if (user?.role === 'admin' || user?.role === 'mainAdmin') {
          redirectPath = '/ihthisabi/admin'
        } else if (user?.role === 'unitAdmin') {
          redirectPath = '/ihthisabi/unitadmin'
        } else if (user?.role === 'districtAdmin') {
          redirectPath = '/ihthisabi/districtadmin'
        } else if (user?.role === 'mekhalaNazim') {
          redirectPath = '/ihthisabi/mekhalanazim'
        } else if (user?.role === 'rukn') {
          redirectPath = '/ihthisabi/dashboard'
        }
        const from = location.state?.from?.pathname || redirectPath
        navigate(from, { replace: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleChange = (e) => {
    const value = e.target.value
    // Only allow numeric input and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)

    setFormData({
      ...formData,
      [e.target.name]: numericValue
    })
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null) // Clear previous errors

    // Validate RUKN ID: must be exactly 6 digits
    if (!/^\d{6}$/.test(formData.ruknId)) {
      setError('RUKN ID must be exactly 6 digits.')
      setLoading(false)
      return
    }

    try {
      console.log('Login with RUKN ID:', formData.ruknId)
      const result = await login({ ruknId: formData.ruknId, role: 'unified' })

      // Check for explicit failure - DO NOT navigate
      if (result.success === false) {
        setError(result.error || 'Invalid RUKN ID. Please check and try again.')
        setLoading(false)
        return // Stay on login page
      }

      // Multiple roles found - show role picker instead of navigating
      if (result.requiresRoleSelection) {
        setError(null)
        setLoading(false)
        setRoleSelection({
          ruknId: result.ruknId || formData.ruknId,
          name: result.name,
          availableRoles: result.availableRoles
        })
        return
      }

      // Only navigate on successful login
      if (result.success && result.user) {
        // Clear error state before navigation
        setError(null)
        setLoading(false)

        // Small delay to ensure state is updated, then navigate
        setTimeout(() => {
          // Redirect based on the role returned from backend
          let redirectPath = '/ihthisabi/dashboard'
          if (result.user.role === 'admin' || result.user.role === 'mainAdmin') {
            redirectPath = '/ihthisabi/admin'
          } else if (result.user.role === 'unitAdmin') {
            redirectPath = '/ihthisabi/unitadmin'
          } else if (result.user.role === 'districtAdmin') {
            redirectPath = '/ihthisabi/districtadmin'
          } else if (result.user.role === 'mekhalaNazim') {
            redirectPath = '/ihthisabi/mekhalanazim'
          } else if (result.user.role === 'rukn') {
            redirectPath = '/ihthisabi/dashboard'
          }
          navigate(redirectPath, { replace: true })
        }, 100)
      } else {
        // If result doesn't have success or user, treat as failure
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      // Handle unexpected errors - DO NOT navigate
      setError(error.response?.data?.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Complete a multi-role login with the role the user picked
  const handleRoleSelect = async (selectedRole) => {
    setLoading(true)
    setError(null)

    try {
      const result = await login({
        ruknId: roleSelection.ruknId,
        role: 'unified',
        selectedRole
      })

      if (result.success === false) {
        setError(result.error || 'Login failed. Please try again.')
        setLoading(false)
        return
      }

      if (result.success && result.user) {
        setError(null)
        setLoading(false)

        setTimeout(() => {
          let redirectPath = '/ihthisabi/dashboard'
          if (result.user.role === 'admin' || result.user.role === 'mainAdmin') {
            redirectPath = '/ihthisabi/admin'
          } else if (result.user.role === 'unitAdmin') {
            redirectPath = '/ihthisabi/unitadmin'
          } else if (result.user.role === 'districtAdmin') {
            redirectPath = '/ihthisabi/districtadmin'
          } else if (result.user.role === 'mekhalaNazim') {
            redirectPath = '/ihthisabi/mekhalanazim'
          } else if (result.user.role === 'rukn') {
            redirectPath = '/ihthisabi/dashboard'
          }
          navigate(redirectPath, { replace: true })
        }, 100)
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Role selection login error:', error)
      setError(error.response?.data?.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleMainAdminSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAdminError(null) // Clear previous errors

    try {
      console.log('Main Admin login data:', mainAdminFormData)
      const result = await login(mainAdminFormData)

      // Check for explicit failure - DO NOT navigate
      if (result.success === false) {
        setAdminError(result.error || 'Invalid email or password. Please check and try again.')
        setLoading(false)
        return // Stay on login page
      }

      // Only navigate on successful login
      if (result.success) {
        // Clear error state before navigation
        setAdminError(null)
        setLoading(false)

        // Small delay to ensure state is updated, then navigate
        setTimeout(() => {
          navigate('/ihthisabi/admin', { replace: true })
        }, 100)
      } else {
        // If result doesn't have success, treat as failure
        setAdminError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Main Admin login error:', error)
      // Handle unexpected errors - DO NOT navigate
      setAdminError(error.response?.data?.message || 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setShowMainAdminLogin(tab === 'admin')
    setError(null)
    setAdminError(null)
    if (tab === 'admin') setRoleSelection(null)
  }

  return (
    <AuthShell title="IHTHISABI Report" caps subtitle="For RUKN members and IHTHISABI administrators.">
      <AuthTabs tabs={LOGIN_TABS} value={showMainAdminLogin ? 'admin' : 'rukn'} onChange={handleTabChange} />

      {/* Role Selection (multi-role RUKN IDs) */}
      {!showMainAdminLogin && roleSelection && (
        <div className="mt-5 space-y-4">
          <AuthInfoBanner
            icon={Users}
            title={`Welcome${roleSelection.name ? `, ${roleSelection.name}` : ''}!`}
            description="Your RUKN ID has multiple roles. Choose which dashboard you want to access."
          />

          <div className="space-y-3">
            {roleSelection.availableRoles.map((roleOption) => {
              const Icon = ROLE_ICONS[roleOption.role] || User
              return (
                <button
                  key={roleOption.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleRoleSelect(roleOption.role)}
                  className="flex min-h-[64px] w-full items-center gap-4 rounded-2xl border border-[#dfe5f0] bg-white/90 px-4 py-3 text-left shadow-[0_8px_24px_rgba(30,56,110,0.06)] transition hover:border-[#2a5fc4] hover:bg-[#f3f6fb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e4edfb] text-[#1d4fa8]" aria-hidden="true">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-[#10274f]">{roleOption.label}</span>
                    {roleOption.scope && (
                      <span className="block truncate text-sm text-[#5b6b85]">{roleOption.scope}</span>
                    )}
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-[#1d4fa8]" strokeWidth={2.4} aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {error && <AuthError id="rukn-role-error" message={error} />}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#5b6b85]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d4fa8] border-t-transparent" aria-hidden="true" />
              Signing in...
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setRoleSelection(null)
              setError(null)
            }}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-sm font-semibold text-[#5b6b85] transition hover:text-[#10274f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Use a different RUKN ID
          </button>
        </div>
      )}

      {/* RUKN Login Form */}
      {!showMainAdminLogin && !roleSelection && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5" aria-busy={loading}>
          <AuthInfoBanner
            icon={User}
            title="RUKN member access"
            description="Enter your 6-digit RUKN ID to open the appropriate dashboard."
          />
          <AuthField
            id="ruknId"
            name="ruknId"
            label="RUKN ID"
            icon={KeyRound}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={formData.ruknId}
            onChange={handleChange}
            placeholder="Enter 6-digit RUKN ID"
            invalid={Boolean(error)}
            describedBy={error ? 'rukn-login-error' : undefined}
            autoFocus
          />

          {error && <AuthError id="rukn-login-error" message={error} />}

          <AuthButton type="submit" loading={loading} loadingLabel="Signing in..." className="w-full">
            Sign In
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </AuthButton>

          <p className="text-center text-sm leading-relaxed text-[#5b6b85]">
            Enter your <strong>6-digit RUKN ID</strong> to login. You will be automatically directed to your dashboard.
          </p>
        </form>
      )}

      {/* Admin Login Form */}
      {showMainAdminLogin && (
        <form onSubmit={handleMainAdminSubmit} className="mt-5 space-y-5" aria-busy={loading}>
          <AuthInfoBanner
            icon={Shield}
            title="IHTHISABI administrator"
            description="Use your administrator email and password."
          />
          <AuthField
            id="mainAdminEmail"
            name="email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            required
            value={mainAdminFormData.email}
            onChange={(e) => {
              setMainAdminFormData({...mainAdminFormData, [e.target.name]: e.target.value})
              if (adminError) setAdminError(null)
            }}
            placeholder="Enter admin email"
            invalid={Boolean(adminError)}
            describedBy={adminError ? 'admin-login-error' : undefined}
            autoFocus
          />
          <AuthField
            id="mainAdminPassword"
            name="password"
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            required
            value={mainAdminFormData.password}
            onChange={(e) => {
              setMainAdminFormData({...mainAdminFormData, [e.target.name]: e.target.value})
              if (adminError) setAdminError(null)
            }}
            placeholder="Enter password"
            invalid={Boolean(adminError)}
            describedBy={adminError ? 'admin-login-error' : undefined}
          />

          {adminError && <AuthError id="admin-login-error" message={adminError} />}

          <AuthButton type="submit" loading={loading} loadingLabel="Signing in..." className="w-full">
            Sign In as Admin
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </AuthButton>
        </form>
      )}
    </AuthShell>
  )
}

export default LoginPage
