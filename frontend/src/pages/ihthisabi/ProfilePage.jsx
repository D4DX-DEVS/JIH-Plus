import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import { User, Copy, Check, Calendar, MapPin, Shield, Mail, Phone, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(authUser)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      // Use different endpoints based on user role
      const endpoint = authUser?.role === 'unitAdmin'
        ? '/unitadmin/me'
        : authUser?.role === 'districtAdmin'
        ? '/districtadmin/me'
        : authUser?.role === 'admin'
        ? '/auth/me'
        : '/auth/me'
      
      const response = await api.get(endpoint)
      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user
        // Normalize email field (unit admin uses emailId, others use email)
        if (userData.emailId && !userData.email) {
          userData.email = userData.emailId
        }
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      // Don't show error toast if it's just a 404 and we have auth user data
      if (error.response?.status !== 404 || !authUser) {
        toast.error('Failed to load profile data')
      }
      // Fallback to auth user if API fails
      if (authUser) {
        // Normalize email field for fallback
        const fallbackUser = { ...authUser }
        if (fallbackUser.emailId && !fallbackUser.email) {
          fallbackUser.email = fallbackUser.emailId
        }
        setUser(fallbackUser)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(String(text))
      setCopied(true)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy')
      toast.error('Failed to copy')
    }
  }

  const initials = (user?.name || user?.username || '')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const formatDate = (dateString) => {
    if (!dateString) {
      // For admin users, if no lastLogin, show current time as "Just now"
      if (user?.role === 'admin' || user?.isAdmin) {
        return 'Just now'
      }
      return 'Never'
    }
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      // Show relative time for recent logins
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

      // For older dates, show formatted date
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin' || user?.isAdmin

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-3 sm:mb-4">
        <div className="bg-primary/5 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2 sm:gap-3">
            <div className="text-center sm:text-left">
              <h1 className="text-base sm:text-2xl font-semibold text-gray-900">
                {user?.name || user?.username || 'User'}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end">
              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                user?.isActive !== false
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {user?.isActive !== false ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    Inactive
                  </>
                )}
              </span>
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                {user?.role || 'Member'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-6">
        <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-100">Profile Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
          {/* RUKN ID / Admin ID */}
          {(user?.ruknId || user?.id) && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-600">{isAdmin ? 'Admin ID' : 'RUKN ID'}</label>
                </div>
                <button
                  onClick={() => handleCopy(user?.ruknId || user?.id, isAdmin ? 'Admin ID' : 'RUKN ID')}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title={`Copy ${isAdmin ? 'Admin ID' : 'RUKN ID'}`}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900 font-mono">{user?.ruknId || user?.id}</p>
            </div>
          )}

          {/* Username (for admin users) */}
          {user?.username && !user?.ruknId && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600">Username</label>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">{user.username}</p>
            </div>
          )}

          {/* Unit */}
          {user?.unit && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600">Unit</label>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">{user.unit}</p>
            </div>
          )}

          {/* District */}
          {user?.district && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600">District</label>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">{user.district}</p>
            </div>
          )}

          {/* Area - Always show for unit admins */}
          {(user?.area || user?.role === 'unitAdmin') && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600">Area</label>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">
                {user?.area || 'Not specified'}
              </p>
            </div>
          )}

          {/* Contact Number */}
          {user?.contactNo && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-600">Contact Number</label>
                </div>
                <button
                  onClick={() => handleCopy(user?.contactNo, 'Contact Number')}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy Contact Number"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">{user.contactNo}</p>
            </div>
          )}

          {/* Email */}
          {(user?.email || user?.emailId) && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-600">Email</label>
                </div>
                <button
                  onClick={() => handleCopy(user?.email || user?.emailId, 'Email')}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy Email"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900 break-all">{user?.email || user?.emailId}</p>
            </div>
          )}

          {/* Country */}
          {user?.country && (
            <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600">Country</label>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-gray-900">{user.country}</p>
            </div>
          )}

          {/* Last Login */}
          <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <label className="text-xs sm:text-sm font-semibold text-gray-600">Last Login</label>
            </div>
            <p className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
              {formatDate(user?.lastLogin)}
            </p>
            {user?.lastLogin && (
              <p className="text-xs text-gray-500">
                {new Date(user.lastLogin).toLocaleString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {/* Account Status */}
          <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <label className="text-xs sm:text-sm font-semibold text-gray-600">Account Status</label>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={`w-3.5 h-3.5 rounded-full ${user?.isActive !== false ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></div>
              <p className={`text-lg font-semibold ${user?.isActive !== false ? 'text-green-700' : 'text-red-700'}`}>
                {user?.isActive !== false ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage



