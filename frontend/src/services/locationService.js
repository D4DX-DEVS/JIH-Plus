import { api } from '../utils/ihthisabi/api'

/**
 * Location service for fetching districts, areas, and units
 */
class LocationService {
  /**
   * Fetch all districts
   * @returns {Promise<Array>} Array of district objects with id and name
   */
  async getDistricts() {
    try {
      const response = await api.get('/location/districts')
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching districts:', error)
      // Return fallback districts if API fails
      return this.getFallbackDistricts()
    }
  }

  /**
   * Fetch areas for a specific district
   * @param {string} districtId - The district ID
   * @returns {Promise<Array>} Array of area objects with id and name
   */
  async getAreas(districtId) {
    try {
      if (!districtId) {
        return []
      }
      const response = await api.get(`/location/areas/${districtId}`)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching areas:', error)
      // Return fallback areas if API fails
      return this.getFallbackAreas(districtId)
    }
  }

  /**
   * Fetch units for a specific area
   * @param {string} areaId - The area ID
   * @returns {Promise<Array>} Array of unit objects with id and name
   */
  async getUnits(areaId) {
    try {
      if (!areaId) {
        return []
      }
      const response = await api.get(`/location/units/${areaId}`)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching units:', error)
      // Return fallback units if API fails
      return this.getFallbackUnits(areaId)
    }
  }

  /**
   * Fetch all unit names for login based on role
   * @param {('member'|'unitAdmin')} role
   * @returns {Promise<Array<string>>}
   */
  async getLoginUnits(role) {
    try {
      const response = await api.get(`/location/login/units`, { params: { role } })
      console.log('Login units response:', response.data.data)
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching login units:', error)
      return []
    }
  }

  /**
   * Get fallback districts data
   * @returns {Array} Array of fallback district objects
   */
  getFallbackDistricts() {
    return [
      { id: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
      { id: 'kollam', name: 'Kollam' },
      { id: 'pathanamthitta', name: 'Pathanamthitta' },
      { id: 'alappuzha', name: 'Alappuzha' },
      { id: 'kottayam', name: 'Kottayam' },
      { id: 'idukki', name: 'Idukki' },
      { id: 'ernakulam', name: 'Ernakulam' },
      { id: 'thrissur', name: 'Thrissur' },
      { id: 'palakkad', name: 'Palakkad' },
      { id: 'malappuram', name: 'Malappuram' },
      { id: 'kozhikode', name: 'Kozhikode' },
      { id: 'wayanad', name: 'Wayanad' },
      { id: 'kannur', name: 'Kannur' },
      { id: 'kasaragod', name: 'Kasaragod' }
    ]
  }

  /**
   * Get fallback areas data for a district
   * @param {string} districtId - The district ID
   * @returns {Array} Array of fallback area objects
   */
  getFallbackAreas(districtId) {
    const fallbackAreas = {
      'thiruvananthapuram': [
        { id: 'kazhakoottam', name: 'Kazhakoottam' },
        { id: 'nedumangad', name: 'Nedumangad' },
        { id: 'neyyattinkara', name: 'Neyyattinkara' }
      ],
      'malappuram': [
        { id: 'perinthalmanna', name: 'Perinthalmanna' },
        { id: 'tirur', name: 'Tirur' },
        { id: 'ponnani', name: 'Ponnani' }
      ],
      'kozhikode': [
        { id: 'kozhikode_city', name: 'Kozhikode City' },
        { id: 'koyilandy', name: 'Koyilandy' },
        { id: 'vatakara', name: 'Vatakara' }
      ]
    }
    return fallbackAreas[districtId] || []
  }

  /**
   * Get fallback units data for an area
   * @param {string} areaId - The area ID
   * @returns {Array} Array of fallback unit objects
   */
  getFallbackUnits(areaId) {
    const fallbackUnits = {
      'kazhakoottam': [
        { id: 'unit1', name: 'Unit 1' },
        { id: 'unit2', name: 'Unit 2' }
      ],
      'perinthalmanna': [
        { id: 'unit1', name: 'Unit 1' },
        { id: 'unit2', name: 'Unit 2' }
      ]
    }
    return fallbackUnits[areaId] || []
  }

  /**
   * Find district by name (case insensitive)
   * @param {string} districtName - The district name to search for
   * @returns {Object|null} District object or null if not found
   */
  async findDistrictByName(districtName) {
    if (!districtName) return null
    
    const districts = await this.getDistricts()
    return districts.find(district => 
      district.name.toLowerCase() === districtName.toLowerCase()
    ) || null
  }

  /**
   * Find area by name within a district (case insensitive)
   * @param {string} areaName - The area name to search for
   * @param {string} districtId - The district ID
   * @returns {Object|null} Area object or null if not found
   */
  async findAreaByName(areaName, districtId) {
    if (!areaName || !districtId) return null
    
    const areas = await this.getAreas(districtId)
    return areas.find(area => 
      area.name.toLowerCase() === areaName.toLowerCase()
    ) || null
  }
}

// Create and export a singleton instance
const locationService = new LocationService()
export default locationService
export { locationService }