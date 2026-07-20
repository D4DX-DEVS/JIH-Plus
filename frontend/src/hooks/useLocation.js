import { useState, useEffect } from 'react'
import locationService from '../services/locationService'

/**
 * Custom hook for managing location data (districts, areas, units)
 */
export const useLocation = () => {
  const [districts, setDistricts] = useState([])
  const [areas, setAreas] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState({
    districts: false,
    areas: false,
    units: false
  })
  const [error, setError] = useState(null)

  // Load districts
  const loadDistricts = async () => {
    setLoading(prev => ({ ...prev, districts: true }))
    setError(null)
    try {
      const districtsData = await locationService.getDistricts()
      setDistricts(districtsData)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load districts:', err)
    } finally {
      setLoading(prev => ({ ...prev, districts: false }))
    }
  }

  // Load areas for a district
  const loadAreas = async (districtId) => {
    if (!districtId) {
      setAreas([])
      return
    }

    setLoading(prev => ({ ...prev, areas: true }))
    setError(null)
    try {
      const areasData = await locationService.getAreas(districtId)
      setAreas(areasData)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load areas:', err)
    } finally {
      setLoading(prev => ({ ...prev, areas: false }))
    }
  }

  // Load units for an area
  const loadUnits = async (areaId) => {
    if (!areaId) {
      setUnits([])
      return
    }

    setLoading(prev => ({ ...prev, units: true }))
    setError(null)
    try {
      const unitsData = await locationService.getUnits(areaId)
      setUnits(unitsData)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load units:', err)
    } finally {
      setLoading(prev => ({ ...prev, units: false }))
    }
  }

  // Find district by name
  const findDistrictByName = async (districtName) => {
    return await locationService.findDistrictByName(districtName)
  }

  // Find area by name within a district
  const findAreaByName = async (areaName, districtId) => {
    return await locationService.findAreaByName(areaName, districtId)
  }

  // Clear areas and units when district changes
  const onDistrictChange = (districtId) => {
    setAreas([])
    setUnits([])
    if (districtId) {
      loadAreas(districtId)
    }
  }

  // Clear units when area changes
  const onAreaChange = (areaId) => {
    setUnits([])
    if (areaId) {
      loadUnits(areaId)
    }
  }

  // Load districts on mount
  useEffect(() => {
    loadDistricts()
  }, [])

  return {
    districts,
    areas,
    units,
    loading,
    error,
    loadDistricts,
    loadAreas,
    loadUnits,
    findDistrictByName,
    findAreaByName,
    onDistrictChange,
    onAreaChange
  }
}

export default useLocation
















