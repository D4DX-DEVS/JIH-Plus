import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Building, MapPin, AlertCircle, Search } from 'lucide-react';
import axios from 'axios';

const CreateNotificationModal = ({ isOpen, onClose, userData, onNotificationCreated, notification }) => {
  const isEdit = Boolean(notification);
  const errorRef = useRef(null);
  const [formData, setFormData] = useState(() => notification ? {
    title: notification.title || '',
    description: notification.description || '',
    recipients: {
      areas: (notification.recipients?.areas || []).map(a => ({ areaId: a.areaId, areaName: a.areaName })),
      units: (notification.recipients?.units || []).map(u => ({ unitId: u.unitId, unitName: u.unitName })),
      district: notification.recipients?.district
        ? { districtId: notification.recipients.district.districtId, districtName: notification.recipients.district.districtName }
        : null
    }
  } : {
    title: '',
    description: '',
    recipients: {
      areas: [],
      units: [],
      district: null
    }
  });
  const [districts, setDistricts] = useState([]);
  const [areasByDistrict, setAreasByDistrict] = useState({});
  const [unitsByArea, setUnitsByArea] = useState({});
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState({});
  const [loadingUnits, setLoadingUnits] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    district: '',
    area: '',
    unit: ''
  });
  const [expandedDistricts, setExpandedDistricts] = useState([]);
  const [expandedAreas, setExpandedAreas] = useState([]);


  useEffect(() => {
    console.log('userData:', userData);
    // Always attempt to fetch; fetchHierarchy handles fallbacks
    if (isOpen && userData) {
      fetchHierarchy();
    }
  }, [isOpen, userData]);

  // Bring the error banner back into view when a submit fails after the
  // admin has scrolled deep into the district/area/unit recipient tree.
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const normalizeDistrict = (d) => ({
    id: d?.id || d?._id || d?.code || d?.districtId || d?.district_id || '',
    name: d?.name || d?.districtName || d?.district || d?.title || d?.district_name || 'District'
  });

  const normalizeArea = (a) => ({
    id: a?.id || a?._id || a?.code || a?.areaId || a?.area_id || a?.areaCode || a?.area_code || '',
    name: a?.name || a?.areaName || a?.area || a?.title || a?.districtArea || a?.area_name || 'Area'
  });

  const normalizeUnit = (u) => ({
    id: u?.id || u?._id || u?.code || u?.unitId || u?.unit_id || u?.unitCode || u?.unit_code || '',
    name: u?.name || u?.unitName || u?.unit || u?.title || u?.unit_name || 'Unit'
  });

  const fetchDistricts = async (token) => {
    setLoadingDistricts(true);
    try {
      // Use the local location-master DB — the same collection district/area/unit
      // accounts log in against, so the ids picked here line up with the ids in
      // their JWTs and notifications actually reach them.
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/hierarchy/districts-db`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rawList = response.data?.data ?? [];
      const list = Array.isArray(rawList) ? rawList : [];
      setDistricts(list.map(normalizeDistrict));
    } catch (err) {
      console.error('Failed to load districts', err?.response?.data || err?.message);
      setError('Failed to load districts');
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchAreas = async (districtId, token) => {
    if (!districtId || areasByDistrict[districtId]) return;
    setLoadingAreas((prev) => ({ ...prev, [districtId]: true }));
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/hierarchy/areas-db/${encodeURIComponent(districtId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rawList = response.data?.data ?? [];
      const list = Array.isArray(rawList) ? rawList : [];
      setAreasByDistrict((prev) => ({
        ...prev,
        [districtId]: list.map(normalizeArea)
      }));
    } catch (err) {
      setError('Failed to load areas');
    } finally {
      setLoadingAreas((prev) => ({ ...prev, [districtId]: false }));
    }
  };

  const fetchUnits = async (areaId, token) => {
    if (!areaId || unitsByArea[areaId]) return;
    setLoadingUnits((prev) => ({ ...prev, [areaId]: true }));
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/hierarchy/units/${encodeURIComponent(areaId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rawList = response.data?.units ?? response.data?.data ?? response.data ?? [];
      const list = Array.isArray(rawList) ? rawList : [];
      console.log('Units response for area', areaId, 'len:', list.length, list);
      setUnitsByArea((prev) => ({
        ...prev,
        [areaId]: list.map(normalizeUnit)
      }));
    } catch (err) {
      setError('Failed to load units');
    } finally {
      setLoadingUnits((prev) => ({ ...prev, [areaId]: false }));
    }
  };

  const getAuthToken = () => {
    let token = (userData?.role === 'admin' || userData?.role === 'superadmin')
      ? localStorage.getItem('adminToken') 
      : localStorage.getItem('userToken');
    if (!token && (userData?.role === 'admin' || userData?.role === 'superadmin')) {
      token = localStorage.getItem('userToken');
    }
    return token;
  };

  const fetchHierarchy = async () => {
    try {
      // Use adminToken if user is admin or superadmin, otherwise use userToken
      const token = getAuthToken();
      
      console.log('Token for hierarchy fetch:', token);
      console.log('User role:', userData?.role);
      console.log('adminToken available:', !!localStorage.getItem('adminToken'));
      console.log('userToken available:', !!localStorage.getItem('userToken'));
      // Check user role and fetch appropriate hierarchy lazily
      if (userData?.role === 'admin' || userData?.role === 'superadmin') {
        await fetchDistricts(token);
      } else if (userData?.role === 'district') {
        const districtId = userData?.districtId;
        if (!districtId) {
          setError('District ID not found. Please logout and login again to refresh your session.');
          return;
        }
        await fetchAreas(districtId, token);
      } else if (userData?.role === 'area') {
        const areaId = userData?.areaId;
        if (!areaId) {
          setError('Area ID not found. Please logout and login again to refresh your session.');
          return;
        }
        await fetchUnits(areaId, token);
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      setError('Failed to load hierarchy data');
    }
  };

  const ensureAreasLoaded = async (districtId) => {
    const token = getAuthToken();
    await fetchAreas(districtId, token);
  };

  const ensureUnitsLoaded = async (areaId) => {
    const token = getAuthToken();
    await fetchUnits(areaId, token);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      district: '',
      area: '',
      unit: ''
    });
  };

  const handleRecipientChange = (type, id, name, checked) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [type]: checked
          ? [...prev.recipients[type], { [`${type.slice(0, -1)}Id`]: id, [`${type.slice(0, -1)}Name`]: name }]
          : prev.recipients[type].filter(item => item[`${type.slice(0, -1)}Id`] !== id)
      }
    }));
  };

  const handleSelectAll = (type, items, checked) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [type]: checked ? items.map(item => ({
          [`${type.slice(0, -1)}Id`]: item.id,
          [`${type.slice(0, -1)}Name`]: item.name
        })) : []
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
            // Use adminToken if user is admin or superadmin, otherwise use userToken
            let token = (userData?.role === 'admin' || userData?.role === 'superadmin')
              ? localStorage.getItem('adminToken') 
              : localStorage.getItem('userToken');
            
            // Fallback: if adminToken is not available but user is admin, try userToken
            if (!token && (userData?.role === 'admin' || userData?.role === 'superadmin')) {
              token = localStorage.getItem('userToken');
              console.log('adminToken not found for submit, using userToken as fallback');
            }
      console.log('Token:', token);
      
            // Prepare recipients data based on user role
            let recipients = {};
            
            if (userData?.role === 'admin' || userData?.role === 'superadmin') {
              recipients = {
                areas: formData.recipients.areas,
                units: formData.recipients.units,
                district: formData.recipients.district
              };
            } else if (userData?.role === 'district') {
        // Only the areas/units the district admin actually picked are
        // recipients — the district itself is the sender, not a target,
        // so it must not be tagged as a recipient here.
        recipients = {
          areas: formData.recipients.areas,
          units: formData.recipients.units,
          district: null
        };
      } else if (userData?.role === 'area') {
        // Only the units the area admin actually picked are recipients — the
        // area (and its parent district) is the sender here, not a target.
        recipients = {
          areas: [],
          units: formData.recipients.units,
          district: null
        };
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        recipients
      };
      console.log(payload);
      if (isEdit) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/notifications/${notification._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/notifications/create`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      onClose();
      // Reset form and filters
      setFormData({
        title: '',
        description: '',
        recipients: { areas: [], units: [], district: null }
      });
      setFilters({
        district: '',
        area: '',
        unit: ''
      });
      
      // Call the callback if provided
      if (onNotificationCreated) {
        onNotificationCreated();
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      setError(error.response?.data?.message || 'Failed to create notification');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalRecipients = () => {
    return (formData.recipients.district ? 1 : 0) + formData.recipients.areas.length + formData.recipients.units.length;
  };

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-[#002349]/5 to-[#957C3D]/5">
        <div>
          <h2 className="text-xl font-bold text-[#002349]">{isEdit ? 'Edit Notification' : 'Create Notification'}</h2>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            {userData?.role === 'admin' || userData?.role === 'superadmin'
              ? 'Send a notification to any district, area, or unit'
              : userData?.role === 'district' 
              ? 'Send a notification to areas and units in your district'
              : 'Send a notification to units in your area'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-[#002349] transition-all duration-300 p-2 hover:bg-gray-100 rounded-xl"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div ref={errorRef} className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}



        {/* Basic Information */}
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-2">
            Notification Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter notification title"
            className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50"
            required
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-[#002349] mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter notification description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all duration-300 hover:border-[#002349]/50"
            required
            maxLength={1000}
          />
          <p className="text-xs text-gray-600 mt-1 font-medium">
            {formData.description.length}/1000 characters
          </p>
        </div>


          {/* Recipients Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#002349]">Select Recipients</h3>
              <div className="text-sm text-gray-600 font-semibold bg-[#957C3D]/10 px-3 py-1 rounded-full">
                {getTotalRecipients()} recipients selected
              </div>
            </div>

            <div className="space-y-6">
              {/* Admin: progressively load districts -> areas -> units */}
              {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <h4 className="font-medium text-gray-900">Districts</h4>
                      <span className="text-sm text-gray-500">({districts.length} total)</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search districts..."
                          value={filters.district}
                          onChange={(e) => handleFilterChange('district', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        />
                      </div>
                      {filters.district && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingDistricts ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002349] mx-auto"></div>
                      <p className="text-gray-600 mt-2 font-medium">Loading districts...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {districts
                        .filter(d => {
                          if (!filters.district) return true;
                          return d.name?.toLowerCase().includes(filters.district.toLowerCase());
                        })
                        .map((district) => {
                          const districtAreas = areasByDistrict[district.id] || [];
                          const isExpanded = expandedDistricts.includes(district.id);
                          return (
                            <div key={district.id} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.district?.districtId === district.id}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({
                                          ...prev,
                                          recipients: {
                                            ...prev.recipients,
                                            district: {
                                              districtId: district.id,
                                              districtName: district.name
                                            }
                                          }
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          recipients: {
                                            ...prev.recipients,
                                            district: null
                                          }
                                        }));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-900">{district.name}</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!isExpanded) {
                                      await ensureAreasLoaded(district.id);
                                      setExpandedDistricts(prev => [...prev, district.id]);
                                    } else {
                                      setExpandedDistricts(prev => prev.filter(id => id !== district.id));
                                    }
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 p-2 -m-2"
                                >
                                  {loadingAreas[district.id]
                                    ? 'Loading...'
                                    : isExpanded
                                    ? 'Hide areas'
                                    : 'Show areas'}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="ml-4 mt-2 space-y-2">
                                  {loadingAreas[district.id] ? (
                                    <div className="text-gray-500 text-sm">Loading areas...</div>
                                  ) : districtAreas.length === 0 ? (
                                    <div className="text-gray-500 text-sm">No areas found</div>
                                  ) : (
                                    districtAreas.map(area => {
                                      const areaUnits = unitsByArea[area.id] || [];
                                      const areaExpanded = expandedAreas.includes(area.id);
                                      const areaMatchesFilter = !filters.district || area.name?.toLowerCase().includes(filters.district.toLowerCase());
                                      if (!areaMatchesFilter && !district.name?.toLowerCase().includes(filters.district.toLowerCase())) {
                                        return null;
                                      }
                                      return (
                                        <div key={area.id} className="border border-gray-100 rounded p-2">
                                          <div className="flex items-center justify-between">
                                            <label className="flex items-center space-x-2 p-2">
                                              <input
                                                type="checkbox"
                                                checked={formData.recipients.areas.some(a => a.areaId === area.id)}
                                                onChange={(e) => handleRecipientChange('areas', area.id, area.name, e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                              />
                                              <span className="text-sm text-gray-700">{area.name}</span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (!areaExpanded) {
                                                  await ensureUnitsLoaded(area.id);
                                                  setExpandedAreas(prev => [...prev, area.id]);
                                                } else {
                                                  setExpandedAreas(prev => prev.filter(id => id !== area.id));
                                                }
                                              }}
                                              className="text-xs text-blue-600 hover:text-blue-800 p-2 -m-2"
                                            >
                                              {loadingUnits[area.id]
                                                ? 'Loading...'
                                                : areaExpanded
                                                ? 'Hide units'
                                                : 'Show units'}
                                            </button>
                                          </div>

                                          {areaExpanded && (
                                            <div className="ml-4 mt-2 space-y-1">
                                              {loadingUnits[area.id] ? (
                                                <div className="text-gray-500 text-xs">Loading units...</div>
                                              ) : areaUnits.length === 0 ? (
                                                <div className="text-gray-500 text-xs">No units found</div>
                                              ) : (
                                                areaUnits
                                                  .filter(unit => {
                                                    if (!filters.district) return true;
                                                    return unit.name?.toLowerCase().includes(filters.district.toLowerCase());
                                                  })
                                                  .map(unit => (
                                                    <label key={unit.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                                      <input
                                                        type="checkbox"
                                                        checked={formData.recipients.units.some(u => u.unitId === unit.id)}
                                                        onChange={(e) => handleRecipientChange('units', unit.id, unit.name, e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                      />
                                                      <span className="text-xs text-gray-600">{unit.name}</span>
                                                    </label>
                                                  ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* District admins: areas then units (lazy) */}
              {userData?.role === 'district' && (
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-gray-900">Areas</h4>
                        <span className="text-sm text-gray-500">({(areasByDistrict[userData?.districtId]?.length) || 0} total)</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search areas..."
                            value={filters.area}
                            onChange={(e) => handleFilterChange('area', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          />
                        </div>
                        {filters.area && (
                          <button
                            type="button"
                            onClick={() => setFilters(prev => ({ ...prev, area: '' }))}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(areasByDistrict[userData?.districtId] || [])
                        .filter(area => {
                          if (!filters.area) return true;
                          return area.name?.toLowerCase().includes(filters.area.toLowerCase());
                        })
                        .map(area => {
                          const areaUnits = unitsByArea[area.id] || [];
                          const areaExpanded = expandedAreas.includes(area.id);
                          return (
                            <div key={area.id} className="border border-gray-100 rounded p-2">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 p-2">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.areas.some(r => r.areaId === area.id)}
                                    onChange={(e) => handleRecipientChange('areas', area.id, area.name, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{area.name}</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!areaExpanded) {
                                      await ensureUnitsLoaded(area.id);
                                      setExpandedAreas(prev => [...prev, area.id]);
                                    } else {
                                      setExpandedAreas(prev => prev.filter(id => id !== area.id));
                                    }
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 p-2 -m-2"
                                >
                                  {loadingUnits[area.id] ? 'Loading...' : areaExpanded ? 'Hide units' : 'Show units'}
                                </button>
                              </div>

                              {areaExpanded && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {loadingUnits[area.id] ? (
                                    <div className="text-gray-500 text-xs">Loading units...</div>
                                  ) : areaUnits.length === 0 ? (
                                    <div className="text-gray-500 text-xs">No units found</div>
                                  ) : (
                                    areaUnits
                                      .filter(unit => {
                                        if (!filters.unit) return true;
                                        return unit.name?.toLowerCase().includes(filters.unit.toLowerCase());
                                      })
                                      .map(unit => (
                                        <label key={unit.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                          <input
                                            type="checkbox"
                                            checked={formData.recipients.units.some(r => r.unitId === unit.id)}
                                            onChange={(e) => handleRecipientChange('units', unit.id, unit.name, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span className="text-xs text-gray-600">{unit.name}</span>
                                        </label>
                                      ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Area admins: only units */}
              {userData?.role === 'area' && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Units</h4>
                      <span className="text-sm text-gray-500">
                        {(unitsByArea[userData?.areaId]?.length || 0)} total
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search units..."
                          value={filters.unit}
                          onChange={(e) => handleFilterChange('unit', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        />
                      </div>
                      {filters.unit && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, unit: '' }))}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {loadingUnits[userData?.areaId] ? (
                      <div className="text-center text-gray-500 text-sm">Loading units...</div>
                    ) : (unitsByArea[userData?.areaId] || [])
                      .filter(unit => {
                        if (!filters.unit) return true;
                        return unit.name?.toLowerCase().includes(filters.unit.toLowerCase());
                      })
                      .map(unit => (
                        <label key={unit.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={formData.recipients.units.some(r => r.unitId === unit.id)}
                            onChange={(e) => handleRecipientChange('units', unit.id, unit.name, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-600">{unit.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all duration-300 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !formData.title || !formData.description || getTotalRecipients() === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#002349] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#002349] disabled:from-gray-400 disabled:to-gray-400 text-white rounded-2xl transition-all duration-500 font-semibold hover:shadow-lg transform hover:scale-105 ease-out hover:shadow-[#002349]/50 disabled:transform-none"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isEdit ? 'Saving...' : 'Sending...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isEdit ? 'Save Changes' : 'Send Notification'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateNotificationModal;
