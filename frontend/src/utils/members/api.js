import axios from 'axios'

// Members Application (Rukn / Karkoon) runs against its own API prefix and its
// own token store. The key must not collide with the JIH portal ('userToken',
// 'adminToken') or ihthisabi ('token'), which live in the same browser origin.
export const MEMBERS_TOKEN_KEY = 'membersToken'
export const MEMBERS_USER_KEY = 'membersData'
export const APPLICANT_TOKEN_KEY = 'membersApplicantToken'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/members`
  : 'http://localhost:4001/api/members'

/** Authenticated admin/reviewer client. */
export const api = axios.create({
  baseURL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
})

/** Applicant client — a separate session backed by a temporary access link. */
export const applicantApi = axios.create({
  baseURL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
})

function attachToken(instance, key) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(key)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
}

attachToken(api, MEMBERS_TOKEN_KEY)
attachToken(applicantApi, APPLICANT_TOKEN_KEY)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const isLogin = url.includes('/auth/login')

    if (status === 401 && !isLogin) {
      localStorage.removeItem(MEMBERS_TOKEN_KEY)
      localStorage.removeItem(MEMBERS_USER_KEY)
      if (!window.location.pathname.startsWith('/members/login')) {
        window.location.href = '/members/login'
      }
    }
    return Promise.reject(error)
  }
)

/** The message a failed request should show the user. */
export function apiError(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback
}

export default api
