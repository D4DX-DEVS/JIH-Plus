// API endpoint builder utility
export const buildApiUrl = (endpoint) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  return `${baseUrl}/api${endpoint}`
}

// Example usage:
// const surveysUrl = buildApiUrl('/area/surveys')
// const authUrl = buildApiUrl('/auth/login')

// Direct endpoint examples:
export const API_URLS = {
  // Auth endpoints
  login: `${import.meta.env.VITE_API_URL}/api/auth/login`,
  register: `${import.meta.env.VITE_API_URL}/api/auth/register`,
  
  // Area endpoints (as per your example)
  areaSurveys: `${import.meta.env.VITE_API_URL}/api/area/surveys`,
  
  // Submission endpoints
  submissions: `${import.meta.env.VITE_API_URL}/api/submissions`,
  mySubmissions: `${import.meta.env.VITE_API_URL}/api/submissions/my-submissions`,
  
  // Admin endpoints
  adminDashboard: `${import.meta.env.VITE_API_URL}/api/ihthisabi/admin/dashboard/stats`,
  adminSubmissions: `${import.meta.env.VITE_API_URL}/api/ihthisabi/admin/submissions`,
  adminConsolidation: `${import.meta.env.VITE_API_URL}/api/ihthisabi/admin/consolidation`,
}

// Usage in components:
/*
import { API_URLS } from '../utils/apiEndpoints'

// In your component:
const response = await fetch(API_URLS.areaSurveys, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
*/
