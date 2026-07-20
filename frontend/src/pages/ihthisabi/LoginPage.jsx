import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { User, Shield, Home, AlertCircle } from 'lucide-react'
import logoColor from '../../assets/LogoColor.png'

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

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      {/* Home Icon - Floating */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 right-6 z-50 text-[#002349] hover:text-[#1a3a5c] transition-colors duration-300 cursor-pointer"
        aria-label="Back to Home"
      >
        <Home className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div className="h-full overflow-hidden flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* Header with Logo */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="mx-auto flex items-center justify-center mb-4">
              <img 
                src={logoColor} 
                alt="JIH Logo" 
                className="h-20 w-auto object-contain"
              />
            </div>
            
            {/* Branding */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#002349] mb-3 tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>
                IHTHISABI REPORT
              </h1>
            </div>
          </div>

          {/* Toggle Button */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowMainAdminLogin(false)
                setError(null)
                setAdminError(null)
              }}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                !showMainAdminLogin
                  ? 'bg-[#7B4FF2] text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              RUKN Login
            </button>
            <button
              onClick={() => {
                setShowMainAdminLogin(true)
                setError(null)
                setAdminError(null)
              }}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                showMainAdminLogin
                  ? 'bg-[#7B4FF2] text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Admin Login
            </button>
          </div>

          {/* RUKN Login Form */}
          {!showMainAdminLogin && (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* RUKN ID Field */}
                <div>
                  <label htmlFor="ruknId" className="block text-xs font-semibold text-[#002349] mb-2">
                    RUKN ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="ruknId"
                      name="ruknId"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={formData.ruknId}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 pl-10 border-2 rounded-lg focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2] text-center text-sm transition-all duration-200 bg-gray-50 hover:bg-white ${
                        error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-200'
                      }`}
                      placeholder="Enter 6-digit RUKN ID (e.g., 109702)"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto max-w-xs bg-[#7B4FF2] hover:bg-[#6a3dd9] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-600">
                  Enter your <strong>6-digit RUKN ID</strong> to login. You will be automatically directed to your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Admin Login Form */}
          {showMainAdminLogin && (
            <div className="space-y-5">
              <form onSubmit={handleMainAdminSubmit} className="space-y-5">
                <div>
                  <label htmlFor="mainAdminEmail" className="block text-xs font-semibold text-[#002349] mb-2">
                    Email
                  </label>
                  <input
                    id="mainAdminEmail"
                    name="email"
                    type="email"
                    required
                    value={mainAdminFormData.email}
                    onChange={(e) => {
                      setMainAdminFormData({...mainAdminFormData, [e.target.name]: e.target.value})
                      if (adminError) setAdminError(null)
                    }}
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2] text-center text-sm transition-all duration-200 bg-gray-50 hover:bg-white ${
                      adminError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-200'
                    }`}
                    placeholder="admin@example.com"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="mainAdminPassword" className="block text-xs font-semibold text-[#002349] mb-2">
                    Password
                  </label>
                  <input
                    id="mainAdminPassword"
                    name="password"
                    type="password"
                    required
                    value={mainAdminFormData.password}
                    onChange={(e) => {
                      setMainAdminFormData({...mainAdminFormData, [e.target.name]: e.target.value})
                      if (adminError) setAdminError(null)
                    }}
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#7B4FF2] focus:border-[#7B4FF2] text-center text-sm transition-all duration-200 bg-gray-50 hover:bg-white ${
                      adminError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-gray-200'
                    }`}
                    placeholder="••••••••"
                  />
                </div>

                {/* Error Message */}
                {adminError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{adminError}</p>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto max-w-xs bg-[#7B4FF2] hover:bg-[#6a3dd9] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      'Sign In as Admin'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  )
}

export default LoginPage
