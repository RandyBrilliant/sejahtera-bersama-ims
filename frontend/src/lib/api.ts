import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL

if (!baseURL) {
  throw new Error('VITE_API_URL is not defined')
}

/**
 * Shared Axios instance for the API. Uses cookie-based JWT (`kms_access` / `kms_refresh`)
 * with `withCredentials: true`.
 *
 * **Why sessions felt “stuck”:** When the access cookie expired, requests returned 401 but nothing
 * called `POST /api/account/auth/refresh/`, so the browser never received new cookies and every
 * request stayed unauthorized — React Query showed empty/error states while the shell still
 * looked “logged in” from the last `/me` bootstrap.
 *
 * **Interceptor:** On 401 (except login/refresh endpoints), we refresh once, retry the request,
 * then redirect to `/login` if refresh fails or the retry still returns 401.
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
})

type RequestWithAuthRetry = InternalAxiosRequestConfig & { _authRetry?: boolean }

const LOGIN_ROUTE = '/login'

function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname === LOGIN_ROUTE) return
  window.location.replace(LOGIN_ROUTE)
}

function isAuthHandshakeRequest(url: string): boolean {
  /* Only endpoints that must not trigger refresh (avoid loops). Logout is unauthenticated on server. */
  return url.includes('/auth/refresh/') || url.includes('/auth/login/')
}

/** Single in-flight refresh so concurrent 401s share one cookie rotation. */
let refreshPromise: Promise<boolean> | null = null

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/api/account/auth/refresh/')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RequestWithAuthRetry | undefined
    const status = error.response?.status

    if (status !== 401 || !original) {
      return Promise.reject(error)
    }

    const path = original.url ?? ''
    if (isAuthHandshakeRequest(path)) {
      return Promise.reject(error)
    }

    if (original._authRetry) {
      redirectToLogin()
      return Promise.reject(error)
    }

    original._authRetry = true

    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      redirectToLogin()
      return Promise.reject(error)
    }

    return api.request(original)
  }
)
