import React, { useState, useEffect } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { X, User, Phone, Mail, MapPin, Building2, Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const UnitAdminProfileModal = ({ unitAdminId, isOpen, onClose }) => {
  const [unitAdmin, setUnitAdmin] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && unitAdminId) {
      fetchUnitAdminDetails()
    }
  }, [isOpen, unitAdminId])

  const fetchUnitAdminDetails = async () => {
    setLoading(true)
    try {
      const response = await api.get(`ihthisabi/admin/unitadmins/${unitAdminId}`)
      setUnitAdmin(response.data.data.unitAdmin)
    } catch (error) {
      console.error('Error fetching unit admin details:', error)
      toast.error('Failed to load unit admin details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Unit Admin Profile</h2>
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
          ) : unitAdmin ? (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 -mx-4 -mt-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white">
                      {unitAdmin.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                      unitAdmin.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{unitAdmin.name}</h3>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        unitAdmin.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {unitAdmin.isActive ? <><CheckCircle2 className="w-3 h-3 mr-1" />Active</> : <><XCircle className="w-3 h-3 mr-1" />Inactive</>}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        Unit Admin
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                    <label className="text-xs font-semibold text-gray-500">RUKN ID</label>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{unitAdmin.ruknId}</p>
                </div>
                <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-primary" /></div>
                    <label className="text-xs font-semibold text-gray-500">Unit</label>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{unitAdmin.unit || 'N/A'}</p>
                </div>
                {unitAdmin.district && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">District</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{unitAdmin.district}</p>
                  </div>
                )}
                {unitAdmin.area && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Area</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{unitAdmin.area}</p>
                  </div>
                )}
                {unitAdmin.contactNo && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">WhatsApp Number</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{unitAdmin.contactNo}</p>
                  </div>
                )}
                {unitAdmin.emailId && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Mail className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Email</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 break-all">{unitAdmin.emailId}</p>
                  </div>
                )}
                {unitAdmin.country && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Country</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{unitAdmin.country}</p>
                  </div>
                )}
                {unitAdmin.lastLogin && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Last Login</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{new Date(unitAdmin.lastLogin).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {unitAdmin.createdAt && (
                  <div className="group bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
                      <label className="text-xs font-semibold text-gray-500">Created At</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{new Date(unitAdmin.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
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

export default UnitAdminProfileModal

