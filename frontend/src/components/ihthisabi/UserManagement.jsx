import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/ihthisabi/api'
import { useLocation as useHierarchyLocation } from '../../hooks/useLocation'
import UnitAdminProfileModal from './UnitAdminProfileModal'
import UserProfileModal from './UserProfileModal'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Pagination'
import { 
  Upload, 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Settings,
  ArrowRightLeft,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })
  const [meta, setMeta] = useState({ totalUsers: 0, activeUsers: 0, units: [] })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteAllLoading, setDeleteAllLoading] = useState(false)
  const [showUnitAdminsOnly, setShowUnitAdminsOnly] = useState(false)
  const [unitAdmins, setUnitAdmins] = useState([])
  const [unitAdminPagination, setUnitAdminPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })
  const [selectedUnitAdminId, setSelectedUnitAdminId] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null, userName: null })
  // Transfer modal state
  const [transferModal, setTransferModal] = useState({ isOpen: false, user: null })
  const [transferMode, setTransferMode] = useState('location') // 'location' | 'abroad'
  const [transferDistricts, setTransferDistricts] = useState([])
  const [transferAreas, setTransferAreas] = useState([])
  const [transferUnits, setTransferUnits] = useState([])
  const [transferDistrict, setTransferDistrict] = useState('')
  const [transferArea, setTransferArea] = useState('')
  const [transferUnit, setTransferUnit] = useState('')
  const [abroadCountries, setAbroadCountries] = useState([])
  const [transferAbroadCountry, setTransferAbroadCountry] = useState('')
  const [transferWorking, setTransferWorking] = useState(false)
  const [transferError, setTransferError] = useState('')
  const {
    districts,
    areas,
    units,
    loading: locationLoading,
    onDistrictChange,
    onAreaChange
  } = useHierarchyLocation()

  const getLocationOptionId = (option) => option?.id || option?._id || option?.code || option?.name || option?.title || ''
  const getLocationOptionLabel = (option) => option?.name || option?.title || option?.label || option?.id || option?.code || ''

  const appendLocationFilter = useCallback((params) => {
    if (unitFilter) {
      params.append('unit', unitFilter)
      return
    }

    if (areaFilter) {
      params.append('area', areaFilter)
      return
    }

    if (districtFilter) {
      params.append('district', districtFilter)
    }
  }, [districtFilter, areaFilter, unitFilter])

  // Fetch users
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (searchTerm) params.append('search', searchTerm)
      appendLocationFilter(params)

      const response = await api.get(`/ihthisabi/admin/users?${params}`)
      console.log('Users response:', response.data.data)
      setUsers(response.data.data.users)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, appendLocationFilter])

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const response = await api.get('/ihthisabi/admin/users/meta')
        setMeta(response.data.data)
      } catch (error) {
        console.error('Error fetching users meta:', error)
      }
    }
    fetchMeta()
  }, [])

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setUploadLoading(true)
    const formData = new FormData()
    formData.append('excelFile', selectedFile)

    try {
      const response = await api.post('/ihthisabi/admin/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 90000 // allow up to 60s for large Excel processing
      })

      setUploadResult(response.data.data)
      toast.success('Excel file processed successfully!')
      setShowUploadModal(false)
      setSelectedFile(null)
      fetchUsers() // Refresh users list
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || 'Failed to upload file')
    } finally {
      setUploadLoading(false)
    }
  }

  // Delete user
  const handleDeleteUser = (e, userId, userName) => {
    e.stopPropagation() // Prevent row click event
    setDeleteUserModal({ isOpen: true, userId, userName })
  }

  const confirmDeleteUser = async () => {
    try {
      await api.delete(`/ihthisabi/admin/users/${deleteUserModal.userId}`)
      toast.success('User deleted successfully')
      fetchUsers(pagination.current)
      setDeleteUserModal({ isOpen: false, userId: null, userName: null })
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete user')
    }
  }

  // Transfer handlers
  const openTransferModal = async (e, user) => {
    e.stopPropagation()
    setTransferError('')
    setTransferMode('location')
    setTransferDistrict(''); setTransferArea(''); setTransferUnit('')
    setTransferAbroadCountry('')
    setTransferModal({ isOpen: true, user })
    // Fetch districts and abroad countries in parallel
    try {
      const [distRes, countryRes] = await Promise.all([
        api.get('/ihthisabi/admin/master-data/districts'),
        api.get('/ihthisabi/admin/abroad-countries')
      ])
      setTransferDistricts(distRes.data.data || [])
      setAbroadCountries(countryRes.data.data || [])
    } catch { /* ignore */ }
  }

  const handleTransferDistrictChange = async (districtName) => {
    setTransferDistrict(districtName); setTransferArea(''); setTransferUnit(''); setTransferAreas([]); setTransferUnits([])
    if (!districtName) return
    try {
      const res = await api.get('/ihthisabi/admin/master-data/areas', { params: { district: districtName } })
      setTransferAreas(res.data.data || [])
    } catch { /* ignore */ }
  }

  const handleTransferAreaChange = async (areaName) => {
    setTransferArea(areaName); setTransferUnit(''); setTransferUnits([])
    if (!areaName || !transferDistrict) return
    try {
      const res = await api.get('/ihthisabi/admin/master-data/units', {
        params: { district: transferDistrict, area: areaName }
      })
      setTransferUnits(res.data.data || [])
    } catch { /* ignore */ }
  }

  const confirmTransfer = async () => {
    setTransferError('')
    const { user } = transferModal
    if (transferMode === 'abroad') {
      if (!transferAbroadCountry) return setTransferError('Please select a country')
      setTransferWorking(true)
      try {
        await api.put(`/ihthisabi/admin/users/${user._id}/transfer`, {
          isAbroad: true, abroadCountry: transferAbroadCountry
        })
        toast.success('User transferred to abroad')
        setTransferModal({ isOpen: false, user: null })
        fetchUsers(pagination.current)
      } catch (e) { setTransferError(e.response?.data?.message || 'Transfer failed') }
      setTransferWorking(false)
    } else {
      if (!transferDistrict || !transferArea || !transferUnit) return setTransferError('Please select district, area and unit')
      setTransferWorking(true)
      try {
        await api.put(`/ihthisabi/admin/users/${user._id}/transfer`, {
          isAbroad: false, district: transferDistrict, area: transferArea, unit: transferUnit
        })
        toast.success('User transferred successfully')
        setTransferModal({ isOpen: false, user: null })
        fetchUsers(pagination.current)
      } catch (e) { setTransferError(e.response?.data?.message || 'Transfer failed') }
      setTransferWorking(false)
    }
  }

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('')
    setDistrictFilter('')
    setAreaFilter('')
    setUnitFilter('')
    setSelectedDistrictId('')
    setSelectedAreaId('')
    setSelectedUnitId('')
    onDistrictChange('')
  }

  const handleDistrictFilterChange = (districtId) => {
    setSelectedDistrictId(districtId)

    const selectedDistrict = districts.find((district) => getLocationOptionId(district) === districtId)
    setDistrictFilter(selectedDistrict ? getLocationOptionLabel(selectedDistrict) : '')

    setSelectedAreaId('')
    setAreaFilter('')
    setSelectedUnitId('')
    setUnitFilter('')
    onDistrictChange(districtId)
  }

  const handleAreaFilterChange = (areaId) => {
    setSelectedAreaId(areaId)

    const selectedArea = areas.find((area) => getLocationOptionId(area) === areaId)
    setAreaFilter(selectedArea ? getLocationOptionLabel(selectedArea) : '')

    setSelectedUnitId('')
    setUnitFilter('')
    onAreaChange(areaId)
  }

  const handleUnitFilterChange = (unitId) => {
    setSelectedUnitId(unitId)
    const selectedUnit = units.find((unit) => getLocationOptionId(unit) === unitId)
    setUnitFilter(selectedUnit ? getLocationOptionLabel(selectedUnit) : '')
  }

  // Fetch unit admins
  const fetchUnitAdmins = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (searchTerm) params.append('search', searchTerm)
      appendLocationFilter(params)

      const response = await api.get(`/ihthisabi/admin/unitadmins?${params}`)
      console.log('Unit admins response:', response.data.data)
      setUnitAdmins(response.data.data.unitAdmins || [])
      setUnitAdminPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 })
    } catch (error) {
      console.error('Error fetching unit admins:', error)
      toast.error('Failed to fetch unit admins')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, appendLocationFilter])

  useEffect(() => {
    if (showUnitAdminsOnly) {
      fetchUnitAdmins()
    } else {
      fetchUsers()
    }
  }, [showUnitAdminsOnly, fetchUnitAdmins, fetchUsers])

  // Delete all users
  const handleDeleteAllUsers = async () => {
    setDeleteAllLoading(true)
    try {
      const response = await api.delete('/ihthisabi/admin/delete-all-users')
      toast.success(`Successfully deleted ${response.data.data.deletedCount} users`)
      setShowDeleteAllModal(false)
      fetchUsers() // Refresh users list
      // Also refresh meta data
      const metaResponse = await api.get('/ihthisabi/admin/users/meta')
      setMeta(metaResponse.data.data)
    } catch (error) {
      console.error('Delete all users error:', error)
      toast.error('Failed to delete all users')
    } finally {
      setDeleteAllLoading(false)
    }
  }

  return (
    <div className="space-y-2 sm:space-y-5">
      {/* Header — title hidden on mobile, the app bar already names the page.
          Actions collapse to icons so they stay on one row. */}
      <div className="flex items-center justify-between gap-2">
        <div className="hidden min-w-0 sm:block">
          <h2 className="ih-page-title">User Management</h2>
          <p className="ih-page-subtitle">
            {showUnitAdminsOnly ? 'Manage unit admins' : 'Manage users uploaded from Excel files'}
          </p>
        </div>

        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <button
            onClick={() => {
              setShowUnitAdminsOnly(!showUnitAdminsOnly)
              resetFilters()
            }}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-3 py-[7px] text-[11px] font-medium transition-colors sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
              showUnitAdminsOnly ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
            style={showUnitAdminsOnly ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{showUnitAdminsOnly ? 'Regular Users' : 'Unit Admins'}</span>
          </button>

          {(meta.totalUsers > 0 || users.length > 0) && !showUnitAdminsOnly && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              title="Delete all users"
              className="ih-icon-btn bg-red-50 text-red-500 hover:bg-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!showUnitAdminsOnly && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary shrink-0 gap-1 px-2 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {(showUnitAdminsOnly
          ? [
              { label: 'Total Unit Admins', short: 'Total', value: unitAdminPagination.total || 0, Icon: Settings, tone: 'bg-blue-50 text-blue-600' },
              { label: 'Active Unit Admins', short: 'Active', value: unitAdmins.filter(u => u.isActive).length, Icon: CheckCircle, tone: 'bg-green-50 text-green-600' },
              { label: 'Inactive Unit Admins', short: 'Inactive', value: unitAdmins.filter(u => !u.isActive).length, Icon: AlertCircle, tone: 'bg-amber-50 text-amber-600' },
            ]
          : [
              { label: 'Total Users', short: 'Users', value: meta.totalUsers || pagination.total || 0, Icon: Users, tone: 'bg-blue-50 text-blue-600' },
              { label: 'Active Users', short: 'Active', value: meta.activeUsers || users.filter(u => u.isActive).length, Icon: CheckCircle, tone: 'bg-green-50 text-green-600' },
              { label: 'Total Units', short: 'Units', value: meta.units?.length || 0, Icon: AlertCircle, tone: 'bg-amber-50 text-amber-600' },
            ]
        ).map(({ label, short, value, Icon, tone }) => (
          <div key={label} className="ih-stat-card">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <p className="ih-stat-label truncate">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </p>
                <p className="ih-stat-value mt-1">{value}</p>
              </div>
              <div className={`ih-stat-icon ${tone} hidden sm:flex`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {/* Filters — placeholders carry the labels so no label rows are needed. */}
      <div className="ih-surface p-2 sm:p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or RUKN ID..."
              className="block w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2 text-[11px] shadow-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 sm:text-sm"
            />
          </div>
          {(searchTerm || districtFilter || areaFilter || unitFilter) && (
            <button
              onClick={resetFilters}
              className="shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <select
            value={selectedDistrictId}
            onChange={(e) => handleDistrictFilterChange(e.target.value)}
            className="ih-filter-select pl-2"
          >
            <option value="">All Districts</option>
            {districts.map((district) => (
              <option key={getLocationOptionId(district)} value={getLocationOptionId(district)}>
                {getLocationOptionLabel(district)}
              </option>
            ))}
          </select>

          <select
            value={selectedAreaId}
            onChange={(e) => handleAreaFilterChange(e.target.value)}
            className="ih-filter-select pl-2 disabled:bg-gray-50 disabled:text-gray-400"
            disabled={!selectedDistrictId || locationLoading.areas}
          >
            <option value="">All Areas</option>
            {areas.map((area) => (
              <option key={getLocationOptionId(area)} value={getLocationOptionId(area)}>
                {getLocationOptionLabel(area)}
              </option>
            ))}
          </select>

          <select
            value={selectedUnitId}
            onChange={(e) => handleUnitFilterChange(e.target.value)}
            className="ih-filter-select pl-2 disabled:bg-gray-50 disabled:text-gray-400"
            disabled={!selectedAreaId || locationLoading.units}
          >
            <option value="">All Units</option>
            {units.map((unit) => (
              <option key={getLocationOptionId(unit)} value={getLocationOptionId(unit)}>
                {getLocationOptionLabel(unit)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="ih-surface overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
          <h3 className="text-[11px] font-semibold text-gray-700 sm:text-sm">Users List</h3>
          <div className="truncate text-[10px] text-gray-500 sm:text-xs">
            {loading ? 'Loading...' : (
              <>
                {showUnitAdminsOnly ? unitAdmins.length : users.length} of {showUnitAdminsOnly ? (unitAdminPagination.total || 0) : (pagination.total || meta.totalUsers || 0)}
                {(searchTerm || districtFilter || areaFilter || unitFilter) && (
                  <span className="ml-1 text-blue-600">(filtered)</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Seven columns cannot stay legible at phone widths, so mobile gets a
            card list with just identity, location, status and actions. */}
        <div className="hidden lg:block lg:overflow-x-auto">
          <table className="ih-table-compact w-full min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RUKN ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                {!showUnitAdminsOnly && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                {showUnitAdminsOnly && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!showUnitAdminsOnly && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={showUnitAdminsOnly ? '6' : '7'} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                      Loading {showUnitAdminsOnly ? 'unit admins' : 'users'}...
                    </div>
                  </td>
                </tr>
              ) : showUnitAdminsOnly ? (
                unitAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No unit admins found
                    </td>
                  </tr>
                ) : (
                  unitAdmins.map((admin) => (
                    <tr
                      key={admin._id}
                      onClick={() => {
                        setSelectedUnitAdminId(admin._id)
                        setShowProfileModal(true)
                      }}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {admin.ruknId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.district || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.contactNo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      onClick={() => {
                        setSelectedUserId(user._id)
                        setShowUserProfileModal(true)
                      }}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.ruknId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.district || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => openTransferModal(e, user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Transfer user"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteUser(e, user._id, user.name)}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="ih-list lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading {showUnitAdminsOnly ? 'unit admins' : 'users'}...
            </div>
          ) : (showUnitAdminsOnly ? unitAdmins : users).length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No {showUnitAdminsOnly ? 'unit admins' : 'users'} found
            </div>
          ) : (
            (showUnitAdminsOnly ? unitAdmins : users).map((row) => (
              <div
                key={row._id}
                onClick={() => {
                  if (showUnitAdminsOnly) {
                    setSelectedUnitAdminId(row._id)
                    setShowProfileModal(true)
                  } else {
                    setSelectedUserId(row._id)
                    setShowUserProfileModal(true)
                  }
                }}
                className="ih-list-row cursor-pointer"
              >
                <div className="ih-avatar bg-primary/10 text-primary">
                  {(row.name || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="ih-list-title">{row.name}</div>
                  <div className="ih-list-meta">
                    {row.ruknId}
                    {!showUnitAdminsOnly && row.gender ? ` · ${row.gender}` : ''}
                    {showUnitAdminsOnly && row.contactNo ? ` · ${row.contactNo}` : ''}
                  </div>
                  <div className="ih-list-meta">
                    {[row.district, row.unit].filter(Boolean).join(' - ') || '—'}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className={`ih-chip ${
                    row.isActive
                      ? 'border-green-200 bg-green-100 text-green-800'
                      : 'border-red-200 bg-red-100 text-red-800'
                  }`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {!showUnitAdminsOnly && (
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => openTransferModal(e, row)}
                        title="Transfer user"
                        className="ih-icon-btn text-blue-600 hover:bg-blue-50"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteUser(e, row._id, row.name)}
                        title="Delete user"
                        className="ih-icon-btn text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {showUnitAdminsOnly ? (
          <Pagination pagination={unitAdminPagination} onPageChange={fetchUnitAdmins} loading={loading} itemLabel="unit admins" />
        ) : (
          <Pagination pagination={pagination} onPageChange={fetchUsers} loading={loading} itemLabel="users" />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Excel File</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="form-input"
                />
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Expected Excel format:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Column A: S.NO (Serial Number)</li>
                  <li>Column B: RUKN NAME (ENGLISH)</li>
                  <li>Column C: GENDER</li>
                  <li>Column D: UNIT (MUQAM)</li>
                  <li>Column E: RUKN ID</li>
                </ul>
              </div>

              {uploadResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Upload Results:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>Total processed: {uploadResult.totalProcessed}</li>
                    <li>Created: {uploadResult.created}</li>
                    <li>Updated: {uploadResult.updated}</li>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <li>Errors: {uploadResult.errors.length}</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadLoading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Users Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete All Users</h3>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-red-800">Warning!</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This action will permanently delete ALL {Math.max(meta.totalUsers, users.length)} users from the database. 
                      This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">This will delete:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All user records</li>
                  <li>All user data including names, districts, units, etc.</li>
                  <li>Associated submissions and data</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAllUsers}
                  disabled={deleteAllLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteAllLoading ? 'Deleting...' : 'Yes, Delete All Users'}
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={deleteAllLoading}
                  className="btn-ghost flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Admin Profile Modal */}
      <UnitAdminProfileModal
        unitAdminId={selectedUnitAdminId}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false)
          setSelectedUnitAdminId(null)
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUserId}
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false)
          setSelectedUserId(null)
        }}
      />

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteUserModal.isOpen}
        onClose={() => setDeleteUserModal({ isOpen: false, userId: null, userName: null })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteUserModal.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Transfer User Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Transfer: {transferModal.user?.name}
              </h3>
              <button onClick={() => setTransferModal({ isOpen: false, user: null })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => { setTransferMode('location'); setTransferError('') }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${transferMode === 'location' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Location Transfer
              </button>
              <button
                onClick={() => { setTransferMode('abroad'); setTransferError('') }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${transferMode === 'abroad' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Transfer to Abroad
              </button>
            </div>

            {transferMode === 'location' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <select
                    value={transferDistrict}
                    onChange={(e) => handleTransferDistrictChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select district</option>
                    {transferDistricts.map((d) => (
                      <option key={d._id || d.district} value={d.district}>{d.district}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <select
                    value={transferArea}
                    onChange={(e) => handleTransferAreaChange(e.target.value)}
                    disabled={!transferDistrict}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  >
                    <option value="">Select area</option>
                    {transferAreas.map((a) => (
                      <option key={a._id || a.area} value={a.area}>{a.area}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={transferUnit}
                    onChange={(e) => setTransferUnit(e.target.value)}
                    disabled={!transferArea}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  >
                    <option value="">Select unit</option>
                    {transferUnits.map((u) => (
                      <option key={u._id || u.unit} value={u.unit}>{u.unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {transferMode === 'abroad' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={transferAbroadCountry}
                  onChange={(e) => setTransferAbroadCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select country</option>
                  {abroadCountries.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {transferError && <p className="text-sm text-red-600 mt-2">{transferError}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setTransferModal({ isOpen: false, user: null })}
                disabled={transferWorking}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmTransfer}
                disabled={transferWorking}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {transferWorking ? 'Transferring…' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement


