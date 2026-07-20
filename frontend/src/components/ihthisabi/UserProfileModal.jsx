import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../utils/ihthisabi/api'
import { X, User, Phone, Mail, MapPin, Building2, Calendar, CheckCircle2, XCircle, Loader2, Users, FileText, Globe, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const UserProfileModal = ({ userId, isOpen, onClose }) => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState([])

  // Abroad edit state
  const [abroadCountries, setAbroadCountries] = useState([])
  const [isAbroadEdit, setIsAbroadEdit] = useState(false)
  const [abroadCountryEdit, setAbroadCountryEdit] = useState('')
  const [abroadSaving, setAbroadSaving] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
      fetchAbroadCountries()
    }
  }, [isOpen, userId])

  const fetchAbroadCountries = async () => {
    try {
      const res = await api.get('/ihthisabi/admin/abroad-countries')
      setAbroadCountries(res.data.data.countries || [])
    } catch {
      // non-critical, skip
    }
  }

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/ihthisabi/admin/users/${userId}`)
      const userData = response.data.data.user
      setUser(userData)
      setIsAbroadEdit(userData.isAbroad || false)
      setAbroadCountryEdit(userData.abroadCountry?._id || userData.abroadCountry || '')
      
      // Fetch submissions for all users (not just rukn — role check is at render time)
      fetchSubmissions(userData._id || userId)
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to load user details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAbroad = async () => {
    setAbroadSaving(true)
    try {
      const payload = {
        isAbroad: isAbroadEdit,
        abroadCountry: isAbroadEdit ? (abroadCountryEdit || null) : null
      }
      const res = await api.put(`/ihthisabi/admin/users/${userId}`, payload)
      const updatedUser = res.data.data.user
      setUser(updatedUser)
      setIsAbroadEdit(updatedUser.isAbroad || false)
      setAbroadCountryEdit(updatedUser.abroadCountry?._id || updatedUser.abroadCountry || '')
      toast.success('Abroad status updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update abroad status')
    } finally {
      setAbroadSaving(false)
    }
  }

  const fetchSubmissions = async (userId) => {
    try {
      const response = await api.get('/ihthisabi/admin/submissions', {
        params: { userId: userId, limit: 1000 }
      })
      const all = response.data.data.submissions || []
      const done = all
        .filter(s => ['submitted', 'reviewed', 'approved'].includes(s.status))
        .sort((a, b) => {
          const ay = a.submissionPeriod?.year || 0, by_ = b.submissionPeriod?.year || 0
          const aq = a.submissionPeriod?.quarter || 0, bq = b.submissionPeriod?.quarter || 0
          return by_ !== ay ? by_ - ay : bq - aq
        })
      setSubmissions(done)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="ml-2 text-gray-600 text-sm">Loading profile...</span>
            </div>
          ) : user ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 -mx-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white">
                      {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                      user.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{user.name || user.username || 'Unknown User'}</h3>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {user.isActive ? <><CheckCircle2 className="w-3 h-3 mr-1" />Active</> : <><XCircle className="w-3 h-3 mr-1" />Inactive</>}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                {user.ruknId && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">RUKN ID</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{user.ruknId}</p>
                  </div>
                )}
                {user.username && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Username</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                  </div>
                )}
                {user.gender && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Gender</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.gender}</p>
                  </div>
                )}
                {user.unit && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Unit</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.unit}</p>
                  </div>
                )}
                {user.district && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">District</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.district}</p>
                  </div>
                )}
                {user.area && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Area</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.area}</p>
                  </div>
                )}
                {user.contactNo && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">WhatsApp Number</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.contactNo}</p>
                  </div>
                )}
                {(user.emailId || user.email) && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Mail className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Email</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 break-all">{user.emailId || user.email}</p>
                  </div>
                )}
                {user.country && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Country</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{user.country}</p>
                  </div>
                )}
                {user.lastLogin && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Last Login</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{new Date(user.lastLogin).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {user.createdAt && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Created At</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{new Date(user.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>

              {/* Abroad Status Section — only for rukn users */}
              {user.role === 'rukn' && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center pb-2">
                    <Globe className="w-5 h-5 mr-2 text-blue-600" />
                    Abroad Status
                    {user.isAbroad && (
                      <span className="ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        Abroad
                      </span>
                    )}
                  </h4>

                  <div className="bg-blue-50/50 rounded-xl border border-blue-200/60 p-5 space-y-4">
                    {/* isAbroad toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Mark as Abroad Member</label>
                        <p className="text-xs text-gray-500 mt-0.5">Abroad members' submissions are only visible to super admin</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAbroadEdit(prev => !prev)
                          if (isAbroadEdit) setAbroadCountryEdit('')
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isAbroadEdit ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isAbroadEdit ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Country dropdown — shown when isAbroad is true */}
                    {isAbroadEdit && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={abroadCountryEdit}
                          onChange={e => setAbroadCountryEdit(e.target.value)}
                          className="form-select w-full"
                        >
                          <option value="">Select a country...</option>
                          {abroadCountries.map(c => (
                            <option key={c._id} value={c._id}>{c.title}</option>
                          ))}
                        </select>
                        {abroadCountries.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No countries available. Please add countries in the "Abroad Countries" tab first.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Save button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveAbroad}
                        disabled={abroadSaving || (isAbroadEdit && !abroadCountryEdit)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {abroadSaving ? 'Saving...' : 'Save Abroad Status'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission Details (for rukn users) */}
              {user.role?.toLowerCase() === 'rukn' && submissions.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    Submission Details
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {submissions.map((s) => (
                      <button
                        key={s.id || s._id}
                        onClick={() => { navigate(`/ihthisabi/submissions/${s.id || s._id}`); onClose(); }}
                        className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors"
                      >
                        {s.periodDisplay || `Q${s.submissionPeriod?.quarter} ${s.submissionPeriod?.year}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No profile data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfileModal

