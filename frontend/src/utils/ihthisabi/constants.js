// Form field options
export const FORM_OPTIONS = {
  bookReading: [
    { value: 'complete', label: 'പൂർണം' },
    { value: 'partial', label: 'ഭാഗികം' },
    { value: 'notread', label: 'വായിച്ചില്ല' }
  ],
  baithulmaal: [
    { value: 'complete', label: 'കൃത്യം' },
    { value: 'partial', label: 'ഭാഗികം' },
    { value: 'incomplete', label: 'അപൂർണം' }
  ],
  zakatPaid: [
    { value: 'yes', label: 'YES' },
    { value: 'no', label: 'NO' },
    { value: 'notApplicable', label: 'ബാധകമല്ല' }
  ],
  recruitEffort: [
    { value: 'satisfactory', label: 'തൃപ്തികരം' },
    { value: 'unsatisfactory', label: 'തൃപ്തികരമല്ല' }
  ],
  meqathService: [
    { value: 'yes', label: 'YES' },
    { value: 'no', label: 'NO' }
  ],
  skillUsage: [
    { value: 'yes', label: 'YES' },
    { value: 'no', label: 'NO' }
  ],
  jamaathAgenda: [
    { value: 'yes', label: 'അതെ' },
    { value: 'no', label: 'ഇല്ല' },
    { value: 'almost', label: 'ഏറെക്കുറെ' }
  ],
  jamaathInfluence: [
    { value: 'yes', label: 'അതെ' },
    { value: 'no', label: 'ഇല്ല' },
    { value: 'small', label: 'ചെറിയ തോതിൽ' }
  ]
}

// Meeting attendance options
export const MEETING_OPTIONS = [
  { value: 'hadir', label: 'ഹാജർ' },
  { value: 'leave', label: 'ലീവ്' },
  { value: 'absent', label: 'ആബ്സൻ്റ്' }
]

// Quran study options
export const QURAN_STUDY_OPTIONS = [
  { value: 'complete', label: 'പൂർണം' },
  { value: 'partial', label: 'ഭാഗികം' }
]

// Griha meetings options
export const GRIHA_MEETINGS_OPTIONS = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' }
]

// Thahreeki meetings options
export const THAHREEKI_MEETINGS_OPTIONS = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' }
]

// Note: Districts are now fetched dynamically from backend via locationService
// This array is kept for reference but should not be used in components
export const FALLBACK_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
]

// Status options
export const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'reviewed', label: 'Reviewed', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' }
]

// API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
    me: `${API_BASE_URL}/api/auth/me`,
    profile: `${API_BASE_URL}/api/auth/profile`,
    changePassword: `${API_BASE_URL}/api/auth/change-password`
  },
  submissions: {
    create: `${API_BASE_URL}/api/submissions`,
    mySubmissions: `${API_BASE_URL}/api/submissions/my-submissions`,
    getById: `${API_BASE_URL}/api/submissions`,
    updateStatus: `${API_BASE_URL}/api/submissions`,
    stats: `${API_BASE_URL}/api/submissions/stats/my-stats`
  },
  admin: {
    submissions: `${API_BASE_URL}/api/ihthisabi/admin/submissions`,
    dashboard: `${API_BASE_URL}/api/ihthisabi/admin/dashboard/stats`,
    analytics: `${API_BASE_URL}/api/ihthisabi/admin/analytics`,
    users: `${API_BASE_URL}/api/ihthisabi/admin/users`,
    export: `${API_BASE_URL}/api/ihthisabi/admin/export`
  },
  area: {
    surveys: `${API_BASE_URL}/api/area/surveys`
  },
  location: {
    districts: `${API_BASE_URL}/api/location/districts`,
    areas: `${API_BASE_URL}/api/location/areas`,
    units: `${API_BASE_URL}/api/location/units`
  }
}

// Chart colors
export const CHART_COLORS = {
  primary: '#178582',
  secondary: '#0A1828',
  accent: '#BFA181',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6'
}

// Form validation rules
export const VALIDATION_RULES = {
  required: (value) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value !== null && value !== undefined
  },
  minLength: (min) => (value) => value.length >= min,
  maxLength: (max) => (value) => value.length <= max,
  min: (min) => (value) => Number(value) >= min,
  max: (max) => (value) => Number(value) <= max,
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  englishOnly: (value) => /^[a-zA-Z\s]*$/.test(value)
}

// Local storage keys
export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  theme: 'theme',
  language: 'language'
}

// Date formats
export const DATE_FORMATS = {
  display: 'DD MMM YYYY',
  api: 'YYYY-MM-DD',
  full: 'DD MMMM YYYY, hh:mm A'
}

// Pagination
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
  maxPageSize: 100
}
