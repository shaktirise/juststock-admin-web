export const API_BASE_URL = 'https://backend-server-11f5.onrender.com'

export const getAdminToken = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem('adminToken')
}

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export const apiRequest = async (
  path,
  { method = 'GET', body, token, headers } = {},
) => {
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData
  const isJsonBody = body !== undefined && body !== null && !isFormData
  const requestHeaders = {
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: isJsonBody ? JSON.stringify(body) : body,
  })

  const data = await parseResponse(response)

  if (!response.ok) {
    const fallbackError =
      Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors[0]?.message || data.errors[0]
        : null
    const message =
      data?.message ||
      data?.error ||
      fallbackError ||
      'Request failed. Please try again.'
    throw new Error(message)
  }

  return data
}

export const adminSignup = (payload) =>
  apiRequest('/api/auth/admin/signup', {
    method: 'POST',
    body: payload,
  })

export const adminLogin = (payload) =>
  apiRequest('/api/auth/admin/login', {
    method: 'POST',
    body: payload,
  })

export const adminRequest = (path, options = {}) =>
  apiRequest(path, { ...options, token: getAdminToken() })

const resolveCsvFilename = (headerValue) => {
  if (!headerValue) {
    return null
  }
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch) {
    return decodeURIComponent(utfMatch[1])
  }
  const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i)
  return asciiMatch ? asciiMatch[1] : null
}

const downloadAdminCsv = async (path, params = {}, fallbackName) => {
  const token = getAdminToken()
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()
  const response = await fetch(
    `${API_BASE_URL}${path}${query ? `?${query}` : ''}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'Request failed. Please try again.'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed?.message || parsed?.error || message
    } catch {
      message = errorText || message
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const headerValue = response.headers.get('content-disposition')
  const filename = resolveCsvFilename(headerValue) || fallbackName
  return { blob, filename }
}

export const sendTradeMessage = (category, payload) =>
  adminRequest(`/api/advice-v2/${category}`, {
    method: 'POST',
    body: payload,
  })

export const sendDailyTip = (payload) =>
  adminRequest('/api/admin/daily-tip', {
    method: 'POST',
    body: payload,
  })

export const uploadAdminImage = (formData) =>
  adminRequest('/api/images/upload', {
    method: 'POST',
    body: formData,
  })

export const downloadAdminPhonesCsv = () =>
  downloadAdminCsv(
    '/api/auth/admin/users/phones/download',
    {},
    'phone-numbers.csv',
  )

export const downloadWalletWithdrawalsCsv = (params = {}) =>
  downloadAdminCsv(
    '/api/wallet/withdrawals/export.csv',
    params,
    'wallet-withdrawals.csv',
  )

export const downloadReferralWithdrawalsCsv = (params = {}) =>
  downloadAdminCsv(
    '/api/admin/referrals/withdrawals/export.csv',
    params,
    'referral-withdrawals.csv',
  )

export const fetchDashboardOverview = (params = {}) => {
  const searchParams = new URLSearchParams()
  if (params.from) {
    searchParams.set('from', params.from)
  }
  if (params.to) {
    searchParams.set('to', params.to)
  }
  if (params.userId) {
    searchParams.set('userId', params.userId)
  }

  const query = searchParams.toString()
  return adminRequest(
    `/api/admin/dashboard/overview${query ? `?${query}` : ''}`,
  )
}

export const fetchAdminUsers = (params = {}) => {
  const searchParams = new URLSearchParams()
  const page = params.page ?? 1
  const limit = params.limit ?? 25

  searchParams.set('page', page)
  searchParams.set('limit', limit)

  if (params.role) {
    searchParams.set('role', params.role)
  }
  if (params.search) {
    searchParams.set('search', params.search)
  }

  return adminRequest(`/api/admin/users?${searchParams.toString()}`)
}

export const fetchAdminUser = (userId, params = {}) => {
  const searchParams = new URLSearchParams()
  if (params.depth) {
    searchParams.set('depth', params.depth)
  }
  const query = searchParams.toString()
  return adminRequest(
    `/api/admin/users/${userId}${query ? `?${query}` : ''}`,
  )
}

export const fetchAdminUserNonPaidReferrals = (userId, params = {}) => {
  const searchParams = new URLSearchParams()
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 25

  searchParams.set('page', page)
  searchParams.set('pageSize', pageSize)

  const query = searchParams.toString()
  return adminRequest(
    `/api/admin/users/${userId}/referrals/non-paid${query ? `?${query}` : ''}`,
  )
}

export const fetchAdminReferralWithdrawals = (params = {}) => {
  const searchParams = new URLSearchParams()
  if (params.status) {
    searchParams.set('status', params.status)
  }
  if (params.userId) {
    searchParams.set('userId', params.userId)
  }
  const query = searchParams.toString()
  return adminRequest(
    `/api/admin/referrals/withdrawals${query ? `?${query}` : ''}`,
  )
}

export const updateAdminReferralWithdrawal = (requestId, payload) =>
  adminRequest(`/api/admin/referrals/withdrawals/${requestId}`, {
    method: 'PATCH',
    body: payload,
  })
