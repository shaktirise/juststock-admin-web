import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDashboardOverview,
  fetchAdminUsers,
  fetchAdminUser,
  fetchAdminReferralWithdrawals,
  sendDailyTip,
  sendTradeMessage,
  uploadAdminImage,
  downloadAdminPhonesCsv,
  downloadWalletWithdrawalsCsv,
  downloadReferralWithdrawalsCsv,
  updateAdminReferralWithdrawal,
} from '../services/api'

const navItems = [
  { key: 'home', label: 'Home', enabled: true },
  { key: 'messages', label: 'Messages', enabled: true },
  { key: 'users', label: 'Users', enabled: true },
  { key: 'referrals', label: 'Referrals', enabled: true },
  { key: 'withdrawals', label: 'Withdrawals', enabled: true },
  { key: 'settings', label: 'Settings', enabled: true },
]

const categories = [
  { key: 'stocks', label: 'Stocks', icon: 'ST', apiValue: 'stocks' },
  { key: 'options', label: 'Options', icon: 'OP', apiValue: 'options' },
  { key: 'future', label: 'Future', icon: 'FU', apiValue: 'future' },
  { key: 'commodity', label: 'Commodity', icon: 'CM', apiValue: 'commodity' },
]

const withdrawalStatusOptions = [
  { key: 'pending', label: 'Unpaid', tone: 'pending' },
  { key: 'paid', label: 'Paid', tone: 'paid' },
  { key: 'cancelled', label: 'Cancelled', tone: 'cancelled' },
  { key: 'all', label: 'All', tone: 'all' },
]

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home')
  const [messageType, setMessageType] = useState('trade')
  const [selectedCategory, setSelectedCategory] = useState(categories[0])
  const [overview, setOverview] = useState(null)
  const [overviewStatus, setOverviewStatus] = useState({
    loading: false,
    error: '',
  })
  const [usersData, setUsersData] = useState({
    items: [],
    page: 1,
    limit: 25,
    total: 0,
  })
  const [usersStatus, setUsersStatus] = useState({
    loading: false,
    error: '',
  })
  const [phonesCsvStatus, setPhonesCsvStatus] = useState({
    loading: false,
    error: '',
    success: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [referralFocus, setReferralFocus] = useState(null)
  const [referralSearchInput, setReferralSearchInput] = useState('')
  const [referralSearchTerm, setReferralSearchTerm] = useState('')
  const [referralSearchResults, setReferralSearchResults] = useState([])
  const [referralSearchStatus, setReferralSearchStatus] = useState({
    loading: false,
    error: '',
  })
  const [referralTree, setReferralTree] = useState(null)
  const [referralStatus, setReferralStatus] = useState({
    loading: false,
    error: '',
  })
  const [referralUser, setReferralUser] = useState(null)
  const [withdrawalsData, setWithdrawalsData] = useState({
    items: [],
  })
  const [withdrawalsStatus, setWithdrawalsStatus] = useState({
    loading: false,
    error: '',
  })
  const [withdrawalsCsvStatus, setWithdrawalsCsvStatus] = useState({
    loadingKey: '',
    error: '',
    success: '',
  })
  const [withdrawalsFilter, setWithdrawalsFilter] = useState('pending')
  const [withdrawalSearchInput, setWithdrawalSearchInput] = useState('')
  const [withdrawalSearchTerm, setWithdrawalSearchTerm] = useState('')
  const [withdrawalNotes, setWithdrawalNotes] = useState({})
  const [withdrawalActionStatus, setWithdrawalActionStatus] = useState({
    loadingId: null,
    error: '',
    success: '',
  })
  const [copiedFields, setCopiedFields] = useState({})
  const copyTimeouts = useRef({})
  const imageInputRef = useRef(null)
  const [expandedLevels, setExpandedLevels] = useState({})
  const [formValues, setFormValues] = useState({
    buy: '',
    target: '',
    stoploss: '',
    text: '',
  })
  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: '',
  })
  const [uploadStatus, setUploadStatus] = useState({
    loading: false,
    error: '',
    success: '',
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const navigate = useNavigate()
  const referralDepth = 10
  const maxReferralsPerLevel = 8

  const parseNumericValue = (value) => {
    if (value === null || value === undefined) {
      return null
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    const normalized = String(value).replace(/[^0-9.-]/g, '')
    if (!normalized) {
      return null
    }
    const numericValue = Number(normalized)
    return Number.isFinite(numericValue) ? numericValue : null
  }

  const formatNumber = (value) => {
    const numericValue = parseNumericValue(value)
    if (!Number.isFinite(numericValue)) {
      return '--'
    }
    return new Intl.NumberFormat('en-IN').format(numericValue)
  }

  const formatRupees = (value) => {
    const formatted = formatNumber(value)
    return formatted === '--' ? '--' : `Rs ${formatted}`
  }

  const formatDateTime = (value) => {
    if (!value) {
      return null
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const resolveUserCreatedAt = (user) =>
    user?.createdAt ||
    user?.created_at ||
    user?.createdOn ||
    user?.created_on ||
    user?.registeredAt ||
    user?.registered_at ||
    user?.registeredOn ||
    user?.signupAt ||
    user?.signedUpAt ||
    user?.joinedAt ||
    user?.joined_at ||
    user?.dateCreated ||
    user?.date_created ||
    null

  const getUserCreatedLine = (user) => {
    const formatted = formatDateTime(resolveUserCreatedAt(user))
    return formatted ? `Created: ${formatted}` : 'Created: --'
  }

  const safeParseJson = (value, fallback) => {
    if (!value) {
      return fallback
    }
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  const readLocalJson = (key, fallback) => {
    if (typeof window === 'undefined') {
      return fallback
    }
    return safeParseJson(window.localStorage.getItem(key), fallback)
  }

  const writeLocalJson = (key, value) => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(key, JSON.stringify(value))
  }

  const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') {
      return null
    }
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }
    const payload = parts[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '=',
    )
    try {
      const decoded =
        typeof atob === 'function'
          ? atob(padded)
          : typeof Buffer !== 'undefined'
            ? Buffer.from(padded, 'base64').toString('utf-8')
            : ''
      return safeParseJson(decoded, null)
    } catch {
      return null
    }
  }

  const resolveAdminProfile = () => {
    if (typeof window === 'undefined') {
      return { id: '', name: '', email: '' }
    }
    const storedProfile = readLocalJson('adminProfile', {})
    const profile =
      storedProfile && typeof storedProfile === 'object' ? storedProfile : {}
    const token = window.localStorage.getItem('adminToken')
    const payload = decodeJwtPayload(token) || {}
    return {
      id:
        profile.id ||
        profile._id ||
        payload.id ||
        payload._id ||
        payload.adminId ||
        payload.userId ||
        payload.sub ||
        '',
      name:
        profile.name ||
        payload.name ||
        payload.fullName ||
        payload.adminName ||
        payload.username ||
        '',
      email:
        profile.email ||
        payload.email ||
        payload.adminEmail ||
        payload.username ||
        '',
    }
  }

  const getAdminInitials = (name, email) => {
    const source = (name || email || 'Admin').trim()
    if (!source) {
      return 'AD'
    }
    const parts = source.split(/\s+/)
    if (parts.length === 1) {
      const cleaned = parts[0].replace(/[^a-zA-Z0-9]/g, '')
      return cleaned.slice(0, 2).toUpperCase() || 'AD'
    }
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  const normalizeAdminSession = (session) => {
    if (!session || typeof session !== 'object') {
      return null
    }
    return {
      id:
        session.id ||
        session._id ||
        session.adminId ||
        session.userId ||
        null,
      name:
        session.name ||
        session.adminName ||
        session.userName ||
        '',
      email:
        session.email ||
        session.adminEmail ||
        session.userEmail ||
        '',
      loginAt:
        session.loginAt ||
        session.loggedInAt ||
        session.loginTime ||
        session.createdAt ||
        null,
      logoutAt:
        session.logoutAt ||
        session.loggedOutAt ||
        session.logoutTime ||
        session.updatedAt ||
        null,
    }
  }

  const getAdminSessionLogs = () => {
    const storedSessions = readLocalJson('adminSessionLogs', [])
    const sessions = Array.isArray(storedSessions) ? storedSessions : []
    return sessions
      .map(normalizeAdminSession)
      .filter(Boolean)
      .sort((a, b) => {
        const timeA = a.loginAt ? new Date(a.loginAt).getTime() : 0
        const timeB = b.loginAt ? new Date(b.loginAt).getTime() : 0
        const safeA = Number.isNaN(timeA) ? 0 : timeA
        const safeB = Number.isNaN(timeB) ? 0 : timeB
        return safeB - safeA
      })
  }

  const recordAdminLogout = () => {
    if (typeof window === 'undefined') {
      return
    }
    const profile = resolveAdminProfile()
    const storedSessions = readLocalJson('adminSessionLogs', [])
    if (!Array.isArray(storedSessions) || storedSessions.length === 0) {
      return
    }
    const matchIndex = storedSessions.findIndex((entry) => {
      if (!entry || typeof entry !== 'object' || entry.logoutAt) {
        return false
      }
      const entryEmail =
        entry.email || entry.adminEmail || entry.userEmail || ''
      const entryId =
        entry.id || entry._id || entry.adminId || entry.userId || ''
      if (profile.email && entryEmail && profile.email === entryEmail) {
        return true
      }
      if (profile.id && entryId && profile.id === entryId) {
        return true
      }
      return false
    })
    if (matchIndex === -1) {
      return
    }
    const nextSessions = [...storedSessions]
    nextSessions[matchIndex] = {
      ...nextSessions[matchIndex],
      logoutAt: new Date().toISOString(),
    }
    writeLocalJson('adminSessionLogs', nextSessions)
  }

  const handleLogout = () => {
    recordAdminLogout()
    window.localStorage.removeItem('adminToken')
    navigate('/login', { replace: true })
  }

  const resolveRupees = (rupeesValue, paiseValue) => {
    const rupeesNumeric = parseNumericValue(rupeesValue)
    if (rupeesNumeric !== null) {
      return rupeesNumeric
    }
    const paiseNumeric = parseNumericValue(paiseValue)
    if (paiseNumeric !== null) {
      return paiseNumeric / 100
    }
    return null
  }

  const normalizeWithdrawalStatus = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (!normalized) {
      return 'pending'
    }
    if (normalized === 'canceled') {
      return 'cancelled'
    }
    if (['pending', 'paid', 'cancelled'].includes(normalized)) {
      return normalized
    }
    return normalized
  }

  const getWithdrawalStatusLabel = (status) => {
    const normalized = normalizeWithdrawalStatus(status)
    if (normalized === 'pending') {
      return 'Unpaid'
    }
    if (normalized === 'paid') {
      return 'Paid'
    }
    if (normalized === 'cancelled') {
      return 'Cancelled'
    }
    return normalized || 'Unknown'
  }

  const getWithdrawalStatusTone = (status) => {
    const normalized = normalizeWithdrawalStatus(status)
    if (['pending', 'paid', 'cancelled'].includes(normalized)) {
      return normalized
    }
    return 'unknown'
  }

  const resolveWithdrawalUserInfo = (withdrawal) => {
    const candidate =
      withdrawal?.user ||
      withdrawal?.requestedBy ||
      withdrawal?.requester ||
      withdrawal?.userDetails ||
      withdrawal?.customer ||
      {}
    const user =
      candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? candidate
        : {}
    const userId =
      withdrawal?.userId ||
      withdrawal?.userID ||
      user?.id ||
      user?._id ||
      (typeof withdrawal?.user === 'string' ? withdrawal.user : null)
    return {
      id: userId,
      name:
        user?.name ||
        withdrawal?.userName ||
        withdrawal?.name ||
        withdrawal?.requestedByName ||
        'Unknown user',
      email: user?.email || withdrawal?.userEmail || withdrawal?.email || '',
      phone: user?.phone || withdrawal?.userPhone || withdrawal?.phone || '',
    }
  }

  const resolveWithdrawalAmount = (withdrawal) => {
    const rupeesValue = resolveRupees(
      withdrawal?.amountRupees ??
        withdrawal?.amountInRupees ??
        withdrawal?.withdrawalRupees ??
        withdrawal?.rupees,
      withdrawal?.amountPaise ??
        withdrawal?.amountInPaise ??
        withdrawal?.withdrawalPaise ??
        withdrawal?.paise,
    )
    if (rupeesValue !== null) {
      return rupeesValue
    }
    return parseNumericValue(
      withdrawal?.amount ??
        withdrawal?.requestedAmount ??
        withdrawal?.withdrawalAmount ??
        withdrawal?.value,
    )
  }

  const resolveBankDetails = (withdrawal) => {
    const candidate =
      withdrawal?.bankDetails ||
      withdrawal?.bank ||
      withdrawal?.bankAccount ||
      withdrawal?.bankInfo ||
      withdrawal?.accountDetails ||
      withdrawal?.account ||
      {}
    const bank =
      candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? candidate
        : {}
    return {
      bankName: bank?.bankName || bank?.name || withdrawal?.bankName || '',
      accountNumber:
        bank?.accountNumber ||
        bank?.accountNo ||
        bank?.accNumber ||
        withdrawal?.accountNumber ||
        withdrawal?.accountNo ||
        '',
      accountName:
        bank?.accountName ||
        bank?.holderName ||
        bank?.nameOnAccount ||
        withdrawal?.accountName ||
        '',
      ifsc: bank?.ifsc || bank?.ifscCode || withdrawal?.ifsc || '',
    }
  }

  const resolveUpiDetails = (withdrawal) => {
    const candidate =
      withdrawal?.upiDetails ||
      withdrawal?.upi ||
      withdrawal?.upiId ||
      withdrawal?.upiID ||
      withdrawal?.vpa ||
      {}
    if (typeof candidate === 'string') {
      return { upiId: candidate, upiName: '' }
    }
    const upi =
      candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? candidate
        : {}
    return {
      upiId:
        upi?.upiId ||
        upi?.id ||
        upi?.vpa ||
        withdrawal?.upiId ||
        withdrawal?.upiID ||
        withdrawal?.vpa ||
        '',
      upiName: upi?.name || upi?.accountName || withdrawal?.upiName || '',
    }
  }

  const loadOverview = useCallback(() => {
    setOverviewStatus({ loading: true, error: '' })

    fetchDashboardOverview()
      .then((data) => {
        const resolvedOverview = data?.data ?? data?.result ?? data
        setOverview(resolvedOverview)
        setOverviewStatus({ loading: false, error: '' })
      })
      .catch((error) => {
        setOverviewStatus({
          loading: false,
          error:
            error?.message ||
            'Unable to load dashboard overview. Please try again.',
        })
      })
  }, [])

  useEffect(() => {
    if (activeTab === 'home') {
      loadOverview()
    }
  }, [activeTab, loadOverview])

  useEffect(
    () => () => {
      Object.values(copyTimeouts.current).forEach((timeoutId) =>
        clearTimeout(timeoutId),
      )
    },
    [],
  )

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 350)

    return () => clearTimeout(handler)
  }, [searchInput])

  useEffect(() => {
    const handler = setTimeout(() => {
      setReferralSearchTerm(referralSearchInput.trim())
    }, 350)

    return () => clearTimeout(handler)
  }, [referralSearchInput])

  useEffect(() => {
    const handler = setTimeout(() => {
      setWithdrawalSearchTerm(withdrawalSearchInput.trim())
    }, 350)

    return () => clearTimeout(handler)
  }, [withdrawalSearchInput])

  const loadUsers = useCallback(() => {
    setUsersStatus({ loading: true, error: '' })

    fetchAdminUsers({
      page: usersData.page,
      limit: usersData.limit,
      search: debouncedSearch || undefined,
    })
      .then((data) => {
        const resolved = data?.data ?? data?.result ?? data
        setUsersData((prev) => ({
          ...prev,
          items: resolved?.items ?? [],
          page: resolved?.page ?? prev.page,
          limit: resolved?.limit ?? prev.limit,
          total: resolved?.total ?? 0,
        }))
        setUsersStatus({ loading: false, error: '' })
      })
      .catch((error) => {
        setUsersStatus({
          loading: false,
          error:
            error?.message || 'Unable to load users. Please try again.',
        })
      })
  }, [usersData.page, usersData.limit, debouncedSearch])

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab, loadUsers])

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersData((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
    }
  }, [activeTab, debouncedSearch])

  const loadWithdrawals = useCallback(() => {
    setWithdrawalsStatus({ loading: true, error: '' })

    fetchAdminReferralWithdrawals({
      status: withdrawalsFilter,
      userId: withdrawalSearchTerm || undefined,
    })
      .then((data) => {
        const resolved = data?.data ?? data?.result ?? data
        const items = Array.isArray(resolved)
          ? resolved
          : resolved?.items ||
            resolved?.requests ||
            resolved?.withdrawals ||
            resolved?.data ||
            []
        setWithdrawalsData({
          items: Array.isArray(items) ? items : [],
        })
        setWithdrawalsStatus({ loading: false, error: '' })
      })
      .catch((error) => {
        setWithdrawalsStatus({
          loading: false,
          error:
            error?.message ||
            'Unable to load withdrawal requests. Please try again.',
        })
      })
  }, [withdrawalsFilter, withdrawalSearchTerm])

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      loadWithdrawals()
    }
  }, [activeTab, loadWithdrawals])

  const loadReferralTree = useCallback(
    (userId) => {
      if (!userId) {
        return
      }
      setReferralTree(null)
      setReferralUser(null)
      setExpandedLevels({})
      setReferralStatus({ loading: true, error: '' })

      fetchAdminUser(userId, { depth: referralDepth })
        .then((data) => {
          const resolved = data?.data ?? data?.result ?? data
          const extractedTree =
            resolved?.referralTree ||
            resolved?.user?.referralTree ||
            resolved?.item?.referralTree ||
            data?.referralTree ||
            data?.user?.referralTree ||
            data?.item?.referralTree ||
            null
          const extractedUser =
            resolved?.user ||
            resolved?.item ||
            data?.user ||
            data?.item ||
            null

          setReferralTree(extractedTree)
          setReferralUser(extractedUser)
          setReferralStatus({ loading: false, error: '' })
        })
        .catch((error) => {
          setReferralStatus({
            loading: false,
            error:
              error?.message || 'Unable to load referral tree. Please try again.',
          })
        })
    },
    [referralDepth],
  )

  useEffect(() => {
    if (activeTab === 'referrals' && referralFocus?.id) {
      loadReferralTree(referralFocus.id)
    }
  }, [activeTab, referralFocus, loadReferralTree])

  useEffect(() => {
    if (activeTab !== 'referrals') {
      return
    }

    if (!referralSearchTerm) {
      setReferralSearchResults([])
      setReferralSearchStatus({ loading: false, error: '' })
      return
    }

    setReferralSearchStatus({ loading: true, error: '' })

    fetchAdminUsers({ page: 1, limit: 12, search: referralSearchTerm })
      .then((data) => {
        const resolved = data?.data ?? data?.result ?? data
        setReferralSearchResults(resolved?.items ?? [])
        setReferralSearchStatus({ loading: false, error: '' })
      })
      .catch((error) => {
        setReferralSearchStatus({
          loading: false,
          error:
            error?.message ||
            'Unable to search users. Please try again.',
        })
      })
  }, [activeTab, referralSearchTerm])

  const totals =
    overview?.totals || overview?.data?.totals || overview?.result?.totals
  const money = overview?.money || overview?.data?.money || overview?.result?.money
  const totalUsers = formatNumber(totals?.users)
  const activeUsers = formatNumber(totals?.activeUsers)
  const walletBalanceValue = resolveRupees(
    money?.walletBalanceRupees,
    money?.walletBalancePaise,
  )
  const pendingReferralValue = resolveRupees(
    money?.pendingReferralRupees,
    money?.pendingReferralPaise,
  )
  const walletBalance = formatRupees(walletBalanceValue)
  const pendingReferral = formatRupees(pendingReferralValue)
  const pendingCount = formatNumber(money?.pendingReferralCount)
  const pendingNote =
    pendingCount === '--' ? 'Pending referrals' : `${pendingCount} pending referrals`

  const overviewCards = [
    {
      label: 'Total signups',
      value: totalUsers,
      note: 'All registered users',
    },
    {
      label: 'Active users',
      value: activeUsers,
      note: 'Logged in during the selected range',
    },
    {
      label: 'Wallet balance',
      value: walletBalance,
      note: 'Total wallet balance in rupees',
    },
    {
      label: 'Referral income',
      value: pendingReferral,
      note: pendingNote,
    },
  ]

  const totalUsersCount = parseNumericValue(usersData.total) ?? 0
  const totalPages = Math.max(
    1,
    Math.ceil(totalUsersCount / usersData.limit),
  )

  const resolveUserId = (user) =>
    user?.id || user?._id || user?.user?.id || user?.user?._id

  const resolveWithdrawalId = (withdrawal) =>
    withdrawal?.id ||
    withdrawal?._id ||
    withdrawal?.requestId ||
    withdrawal?.withdrawalId ||
    withdrawal?.referenceId

  const getUserWallet = (user) =>
    formatRupees(
      resolveRupees(user?.walletBalanceRupees, user?.walletBalancePaise),
    )

  const getUserPending = (user) =>
    formatRupees(
      resolveRupees(
        user?.pendingReferralRupees ?? user?.pendingReferralApproxRupees,
        user?.pendingReferralPaise,
      ),
    )

  const normalizeUserStatusLabel = (value) => {
    if (value === null || value === undefined || value === '') {
      return null
    }
    if (typeof value === 'boolean') {
      return value ? 'Active' : 'Inactive'
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return 'Active'
      }
      if (value === 0) {
        return 'Inactive'
      }
    }
    const normalized = String(value).trim().toLowerCase()
    if (!normalized) {
      return null
    }
    if (normalized === '1') {
      return 'Active'
    }
    if (normalized === '0') {
      return 'Inactive'
    }
    if (
      ['active', 'paid', 'subscribed', 'enabled', 'live', 'current'].includes(
        normalized,
      )
    ) {
      return 'Active'
    }
    if (
      [
        'inactive',
        'unpaid',
        'expired',
        'cancelled',
        'canceled',
        'disabled',
        'paused',
        'trial_expired',
        'suspended',
        'blocked',
        'past_due',
        'delinquent',
      ].includes(normalized)
    ) {
      return 'Inactive'
    }
    if (['true', 'yes', 'y'].includes(normalized)) {
      return 'Active'
    }
    if (['false', 'no', 'n'].includes(normalized)) {
      return 'Inactive'
    }
    return null
  }

  const resolveExpiryStatus = (value) => {
    if (!value) {
      return null
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return null
    }
    return parsed.getTime() > Date.now() ? 'Active' : 'Inactive'
  }

  const resolveExpiryStatusFromContainer = (container) => {
    if (!container || typeof container !== 'object') {
      return null
    }
    const expiryCandidates = [
      container?.subscriptionEndsAt,
      container?.subscriptionEndAt,
      container?.subscriptionExpiresAt,
      container?.planExpiresAt,
      container?.planExpiry,
      container?.planExpiryDate,
      container?.expiresAt,
      container?.expiryDate,
      container?.validTill,
      container?.validUntil,
      container?.activeUntil,
      container?.activeTill,
    ]
    for (const value of expiryCandidates) {
      const expiryStatus = resolveExpiryStatus(value)
      if (expiryStatus) {
        return expiryStatus
      }
    }
    return null
  }

  const resolveUserStatusLabel = (user) => {
    if (!user || typeof user !== 'object') {
      return null
    }
    const invertedFlags = [
      user?.isExpired,
      user?.expired,
      user?.subscriptionExpired,
      user?.planExpired,
    ]
    for (const flag of invertedFlags) {
      if (typeof flag === 'boolean') {
        return flag ? 'Inactive' : 'Active'
      }
    }
    const directCandidates = [
      user?.status,
      user?.accountStatus,
      user?.userStatus,
      user?.subscriptionStatus,
      user?.planStatus,
      user?.membershipStatus,
      user?.paymentStatus,
      user?.activeStatus,
      user?.isActive,
      user?.active,
      user?.is_active,
      user?.isPaid,
      user?.paid,
      user?.subscriptionActive,
      user?.planActive,
      user?.hasActivePlan,
      user?.isSubscribed,
      user?.isPremium,
      user?.isMember,
    ]
    for (const candidate of directCandidates) {
      const label = normalizeUserStatusLabel(candidate)
      if (label) {
        return label
      }
    }
    const nestedCandidates = [
      user?.subscription,
      user?.plan,
      user?.membership,
      user?.account,
    ]
    for (const container of nestedCandidates) {
      if (!container || typeof container !== 'object') {
        continue
      }
      const nestedInverted = [
        container?.isExpired,
        container?.expired,
        container?.subscriptionExpired,
        container?.planExpired,
      ]
      for (const flag of nestedInverted) {
        if (typeof flag === 'boolean') {
          return flag ? 'Inactive' : 'Active'
        }
      }
      const nestedValues = [
        container?.status,
        container?.planStatus,
        container?.subscriptionStatus,
        container?.membershipStatus,
        container?.paymentStatus,
        container?.activeStatus,
        container?.isActive,
        container?.active,
        container?.is_active,
        container?.isPaid,
        container?.paid,
        container?.subscriptionActive,
        container?.planActive,
        container?.hasActivePlan,
        container?.isSubscribed,
      ]
      for (const candidate of nestedValues) {
        const label = normalizeUserStatusLabel(candidate)
        if (label) {
          return label
        }
      }
      const nestedExpiryStatus = resolveExpiryStatusFromContainer(container)
      if (nestedExpiryStatus) {
        return nestedExpiryStatus
      }
    }
    const expiryStatus = resolveExpiryStatusFromContainer(user)
    if (expiryStatus) {
      return expiryStatus
    }
    return null
  }

  const referralLevels = Array.isArray(referralTree?.levels)
    ? referralTree.levels
    : referralTree?.levels
      ? Object.values(referralTree.levels)
      : []
  const totalReferralCount = referralLevels.reduce((sum, level) => {
    const descendants = level?.descendants || level?.users || level?.items || []
    return sum + descendants.length
  }, 0)

  const rootUser = referralUser || referralFocus || {}
  const rootWalletValue = resolveRupees(
    rootUser?.walletBalanceRupees,
    rootUser?.walletBalancePaise,
  )
  const rootPendingValue = resolveRupees(
    rootUser?.pendingReferralRupees ?? rootUser?.pendingReferralApproxRupees,
    rootUser?.pendingReferralPaise,
  )
  const rootReferralCount = parseNumericValue(rootUser?.referralCount)
  const rootStatus =
    resolveUserStatusLabel(rootUser) ||
    resolveUserStatusLabel(referralUser) ||
    resolveUserStatusLabel(referralTree?.user) ||
    resolveUserStatusLabel(referralTree?.root) ||
    resolveUserStatusLabel(referralTree)
  const rootChips = [
    rootWalletValue !== null
      ? { label: 'Wallet', value: formatRupees(rootWalletValue) }
      : null,
    rootPendingValue !== null
      ? { label: 'Pending', value: formatRupees(rootPendingValue) }
      : null,
    rootStatus ? { key: 'status', value: rootStatus } : null,
    rootReferralCount !== null
      ? { label: 'Referrals', value: formatNumber(rootReferralCount) }
      : null,
  ].filter(Boolean)

  const adminProfile = resolveAdminProfile()
  const adminName = adminProfile.name || adminProfile.email || 'Admin'
  const adminEmail = adminProfile.email || '--'
  const adminInitials = getAdminInitials(adminName, adminEmail)
  const adminSessionLogs = getAdminSessionLogs()

  const toggleLevel = (levelNumber) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [levelNumber]: !prev[levelNumber],
    }))
  }

  const handleWithdrawalNoteChange = (requestId, field, value) => {
    setWithdrawalNotes((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || {}),
        [field]: value,
      },
    }))
  }

  const handleWithdrawalStatusUpdate = async (withdrawal, nextStatus) => {
    const requestId = resolveWithdrawalId(withdrawal)
    if (!requestId) {
      setWithdrawalActionStatus({
        loadingId: null,
        error: 'Missing withdrawal request ID.',
        success: '',
      })
      return
    }

    setWithdrawalActionStatus({ loadingId: requestId, error: '', success: '' })

    const noteState = withdrawalNotes[requestId] || {}
    const payload = { status: nextStatus }
    const paymentRef = noteState.paymentRef?.trim()
    const adminNote = noteState.adminNote?.trim()

    if (paymentRef) {
      payload.paymentRef = paymentRef
    }
    if (adminNote) {
      payload.adminNote = adminNote
    }

    try {
      await updateAdminReferralWithdrawal(requestId, payload)
      setWithdrawalActionStatus({
        loadingId: null,
        error: '',
        success: `Withdrawal marked as ${getWithdrawalStatusLabel(nextStatus)}.`,
      })
      setWithdrawalNotes((prev) => {
        const nextNotes = { ...prev }
        delete nextNotes[requestId]
        return nextNotes
      })
      loadWithdrawals()
    } catch (error) {
      setWithdrawalActionStatus({
        loadingId: null,
        error:
          error?.message || 'Unable to update withdrawal. Please try again.',
        success: '',
      })
    }
  }

  const copyToClipboard = async (value) => {
    if (!value) {
      return false
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return true
      }
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch (error) {
      return false
    }
  }

  const markCopied = (key) => {
    if (!key) {
      return
    }
    setCopiedFields((prev) => ({ ...prev, [key]: true }))
    if (copyTimeouts.current[key]) {
      clearTimeout(copyTimeouts.current[key])
    }
    copyTimeouts.current[key] = setTimeout(() => {
      setCopiedFields((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      delete copyTimeouts.current[key]
    }, 1600)
  }

  const handleCopyValue = async (key, value) => {
    const didCopy = await copyToClipboard(value)
    if (didCopy) {
      markCopied(key)
    }
  }

  const renderCopyButton = (copyKey, value, label) => {
    if (!value) {
      return null
    }
    const isCopied = Boolean(copiedFields[copyKey])
    return (
      <button
        className={`copy-button ${isCopied ? 'is-copied' : ''}`}
        type="button"
        onClick={() => handleCopyValue(copyKey, value)}
        aria-label={isCopied ? `${label} copied` : `Copy ${label}`}
        title={isCopied ? 'Copied' : 'Copy'}
      >
        <span className="copy-icon-stack" aria-hidden="true">
          <svg
            className="copy-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <rect x="4" y="4" width="11" height="11" rx="2" />
          </svg>
          <svg
            className="copied-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        </span>
      </button>
    )
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const downloadCsvFile = ({ blob, filename }) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handlePhonesCsvDownload = async () => {
    setPhonesCsvStatus({ loading: true, error: '', success: '' })
    try {
      const file = await downloadAdminPhonesCsv()
      downloadCsvFile(file)
      setPhonesCsvStatus({
        loading: false,
        error: '',
        success: 'Phone list CSV downloaded.',
      })
    } catch (error) {
      setPhonesCsvStatus({
        loading: false,
        error: error?.message || 'Unable to download phone list CSV.',
        success: '',
      })
    }
  }

  const handleWithdrawalsCsvDownload = async (type) => {
    const userId = withdrawalSearchInput.trim()
    const params = {
      status: withdrawalsFilter,
      userId: userId || undefined,
    }

    setWithdrawalsCsvStatus({ loadingKey: type, error: '', success: '' })
    try {
      const file =
        type === 'wallet'
          ? await downloadWalletWithdrawalsCsv(params)
          : await downloadReferralWithdrawalsCsv(params)
      downloadCsvFile(file)
      setWithdrawalsCsvStatus({
        loadingKey: '',
        error: '',
        success: `${
          type === 'wallet' ? 'Wallet' : 'Referral'
        } withdrawals CSV downloaded.`,
      })
    } catch (error) {
      setWithdrawalsCsvStatus({
        loadingKey: '',
        error: error?.message || 'Unable to download withdrawals CSV.',
        success: '',
      })
    }
  }

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0] || null
    if (file && !file.type.startsWith('image/')) {
      setSelectedImage(null)
      setUploadStatus({
        loading: false,
        error: 'Please select an image file.',
        success: '',
      })
      return
    }
    setSelectedImage(file)
    setUploadStatus({ loading: false, error: '', success: '' })
  }

  const handleImageUpload = async () => {
    if (!selectedImage) {
      setUploadStatus({
        loading: false,
        error: 'Select an image before uploading.',
        success: '',
      })
      return
    }

    setUploadStatus({ loading: true, error: '', success: '' })
    const formData = new FormData()
    formData.append('image', selectedImage)

    try {
      await uploadAdminImage(formData)
      setUploadStatus({
        loading: false,
        error: '',
        success: 'Image uploaded successfully.',
      })
      setSelectedImage(null)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    } catch (error) {
      setUploadStatus({
        loading: false,
        error: error?.message || 'Unable to upload image. Try again.',
        success: '',
      })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ loading: true, error: '', success: '' })

    const trimmedText = formValues.text.trim()
    const hasAllStructured =
      formValues.buy.trim() &&
      formValues.target.trim() &&
      formValues.stoploss.trim()

    let payload = null

    if (messageType === 'daily') {
      if (!trimmedText) {
        setStatus({
          loading: false,
          error: 'Please enter a daily tip message.',
          success: '',
        })
        return
      }
      payload = { message: trimmedText }
    } else if (trimmedText) {
      payload = { text: trimmedText }
    } else if (hasAllStructured) {
      payload = {
        buy: formValues.buy.trim(),
        target: formValues.target.trim(),
        stoploss: formValues.stoploss.trim(),
      }
    }

    if (!payload) {
      setStatus({
        loading: false,
        error: 'Add message text or fill in buy, target, and stoploss.',
        success: '',
      })
      return
    }

    try {
      if (messageType === 'daily') {
        await sendDailyTip(payload)
      } else {
        await sendTradeMessage(selectedCategory.apiValue, payload)
      }
      setStatus({
        loading: false,
        error: '',
        success: 'Message sent successfully.',
      })
      setFormValues({
        buy: '',
        target: '',
        stoploss: '',
        text: '',
      })
    } catch (error) {
      setStatus({
        loading: false,
        error: error?.message || 'Unable to send message. Try again.',
        success: '',
      })
    }
  }

  const tabTitle =
    activeTab === 'messages'
      ? 'Messages'
      : activeTab === 'users'
        ? 'Users'
        : activeTab === 'referrals'
          ? 'Referrals'
          : activeTab === 'withdrawals'
            ? 'Withdrawals'
            : activeTab === 'settings'
              ? 'Settings'
            : 'Home'
  const isCompactTab =
    activeTab === 'home' || activeTab === 'referrals' || activeTab === 'withdrawals'

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">JS</div>
          <div>
            <p className="sidebar-title">JustStock</p>
            <p className="sidebar-subtitle">Admin console</p>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${
                activeTab === item.key ? 'is-active' : ''
              } ${item.enabled ? '' : 'is-disabled'}`}
              onClick={() => {
                if (item.enabled) {
                  setActiveTab(item.key)
                }
              }}
              disabled={!item.enabled}
            >
              <span className="nav-dot" />
              {item.label}
              {!item.enabled ? <span className="nav-chip">Soon</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <p className="sidebar-footer-label">Session</p>
            <p className="sidebar-footer-value">Secure admin mode</p>
          </div>
          <button className="btn btn-outline" type="button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main
        className={`dashboard-content${
          isCompactTab ? ' dashboard-content-compact' : ''
        }`}
      >
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h2>{tabTitle}</h2>
          </div>
        </header>

        {activeTab === 'home' && (
          <section className="overview-panel fade-in">
            <div className="overview-header">
              <div>
                <p className="overview-kicker">Dashboard overview</p>
                <h3>Key totals at a glance</h3>
                <p>Live metrics for admin visibility and performance.</p>
              </div>
              <button
                className="btn btn-outline"
                type="button"
                onClick={loadOverview}
                disabled={overviewStatus.loading}
              >
                {overviewStatus.loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {overviewStatus.error ? (
              <p className="form-error">{overviewStatus.error}</p>
            ) : null}

            <div className="metrics-grid">
              {overviewCards.map((card) => (
                <article key={card.label} className="metric-card fade-in">
                  <p className="metric-label">{card.label}</p>
                  <p className="metric-value">
                    {overviewStatus.loading && !overview
                      ? 'Loading...'
                      : card.value}
                  </p>
                  <p className="metric-note">{card.note}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="users-panel fade-in">
            <div className="users-header">
              <div>
                <p className="overview-kicker">User directory</p>
                <h3>All users</h3>
                <p>Search by name, email, phone, or referral code.</p>
              </div>
              <div className="users-actions">
                <input
                  className="search-field"
                  type="search"
                  placeholder="Search by name, email, or mobile number"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <select
                  className="users-select"
                  value={usersData.limit}
                  onChange={(event) => {
                    const nextLimit = Number(event.target.value)
                    setUsersData((prev) => ({
                      ...prev,
                      limit: nextLimit,
                      page: 1,
                    }))
                  }}
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={200}>200 per page</option>
                </select>
                <button
                  className="btn btn-outline btn-xs btn-icon"
                  type="button"
                  onClick={handlePhonesCsvDownload}
                  disabled={phonesCsvStatus.loading}
                  title="Download phone list CSV"
                  aria-label="Download phone list CSV"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M5 21h14" />
                  </svg>
                </button>
              </div>
            </div>

            {usersStatus.error ? (
              <p className="form-error">{usersStatus.error}</p>
            ) : null}
            {phonesCsvStatus.error ? (
              <p className="form-error">{phonesCsvStatus.error}</p>
            ) : null}
            {phonesCsvStatus.success ? (
              <p className="form-success">{phonesCsvStatus.success}</p>
            ) : null}

            <div className="users-table">
              <div className="users-row users-row-head">
                <span>Name</span>
                <span>Phone</span>
                <span>Email</span>
                <span>Wallet balance</span>
                <span>Pending referral</span>
                <span>Referral tree</span>
              </div>

              {usersStatus.loading && usersData.items.length === 0 ? (
                <div className="users-row users-row-empty">Loading users...</div>
              ) : null}

              {usersData.items.map((user, index) => {
                const pendingCount = formatNumber(user?.pendingReferralCount)
                const pendingNote =
                  pendingCount === '--' ? 'Pending' : `${pendingCount} pending`

                return (
                  <div
                    key={
                      user?.id ||
                      user?._id ||
                      user?.email ||
                      user?.phone ||
                      index
                    }
                    className="users-row"
                  >
                    <div className="user-cell">
                      <p className="user-primary">{user?.name || 'Unnamed user'}</p>
                      <p className="user-secondary">{getUserCreatedLine(user)}</p>
                    </div>
                    <div className="user-cell">{user?.phone || '--'}</div>
                    <div className="user-cell">{user?.email || '--'}</div>
                    <div className="user-cell user-amount">
                      {getUserWallet(user)}
                    </div>
                    <div className="user-cell">
                      <p className="user-primary">{getUserPending(user)}</p>
                      <p className="user-secondary">{pendingNote}</p>
                    </div>
                    <div className="user-cell">
                      <button
                        className="btn btn-outline btn-xs"
                        type="button"
                        onClick={() => {
                          const userId = resolveUserId(user)
                          setReferralFocus({
                            id: userId,
                            name: user?.name || user?.email || user?.phone || 'User',
                            email: user?.email,
                            phone: user?.phone,
                          })
                          setActiveTab('referrals')
                          loadReferralTree(userId)
                        }}
                      >
                        Referral tree
                      </button>
                    </div>
                  </div>
                )
              })}

              {!usersStatus.loading && usersData.items.length === 0 ? (
                <div className="users-row users-row-empty">
                  No users found for this search.
                </div>
              ) : null}
            </div>

            <div className="users-footer">
              <p className="users-count">
                Showing {usersData.items.length} of {totalUsersCount} users
              </p>
              <div className="users-pagination">
                <button
                  className="btn btn-outline btn-xs"
                  type="button"
                  onClick={() =>
                    setUsersData((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={usersData.page <= 1 || usersStatus.loading}
                >
                  Previous
                </button>
                <span className="users-page">
                  Page {usersData.page} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-xs"
                  type="button"
                  onClick={() =>
                    setUsersData((prev) => ({
                      ...prev,
                      page: Math.min(totalPages, prev.page + 1),
                    }))
                  }
                  disabled={usersData.page >= totalPages || usersStatus.loading}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'referrals' && (
          <section className="referral-panel fade-in">
            <div className="overview-header">
              <div>
                <p className="overview-kicker">Referral tree</p>
                <h3>
                  {referralFocus?.name
                    ? `Referral tree for ${referralFocus.name}`
                    : 'Referral tree'}
                </h3>
                <p>
                  {referralFocus?.id
                    ? `User ID: ${referralFocus.id}`
                    : 'Search a user from below to view their full tree.'}
                </p>
              </div>
              <div className="referral-actions">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => setActiveTab('users')}
                >
                  Back to users
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => loadReferralTree(referralFocus?.id)}
                  disabled={!referralFocus?.id || referralStatus.loading}
                >
                  {referralStatus.loading ? 'Refreshing...' : 'Refresh tree'}
                </button>
              </div>
            </div>

            <div className="referral-toolbar">
              <div className="referral-search">
                <input
                  className="search-field"
                  type="search"
                  placeholder="Search by name, email, or phone"
                  value={referralSearchInput}
                  onChange={(event) => setReferralSearchInput(event.target.value)}
                />
                {referralSearchStatus.error ? (
                  <p className="form-error">{referralSearchStatus.error}</p>
                ) : null}
                {referralSearchTerm && referralSearchStatus.loading ? (
                  <p className="search-status">Searching users...</p>
                ) : null}
                {referralSearchResults.length > 0 ? (
                  <div className="referral-results">
                    {referralSearchResults.map((user, index) => {
                      const userId = resolveUserId(user)
                      return (
                        <button
                          key={userId || user?.email || user?.phone || index}
                          type="button"
                          className="referral-result"
                          onClick={() => {
                            setReferralFocus({
                              id: userId,
                              name:
                                user?.name ||
                                user?.email ||
                                user?.phone ||
                                'User',
                              email: user?.email,
                              phone: user?.phone,
                            })
                            setReferralSearchInput(
                              user?.name || user?.email || user?.phone || '',
                            )
                            setReferralSearchResults([])
                            loadReferralTree(userId)
                          }}
                        >
                          <p className="user-primary">
                            {user?.name || user?.email || 'User'}
                          </p>
                          <p className="user-secondary">
                            {user?.email ||
                              user?.phone ||
                              user?.referralCode ||
                              '--'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                {referralSearchTerm &&
                !referralSearchStatus.loading &&
                referralSearchResults.length === 0 ? (
                  <p className="search-status">No matching users found.</p>
                ) : null}
              </div>

              <div className="referral-summary">
                <div>
                  <p className="user-secondary">Total referrals</p>
                  <p className="referral-value">
                    {formatNumber(totalReferralCount)}
                  </p>
                </div>
                <div>
                  <p className="user-secondary">Depth</p>
                  <p className="referral-value">{referralDepth}</p>
                </div>
              </div>
            </div>

            {referralStatus.error ? (
              <p className="form-error">{referralStatus.error}</p>
            ) : null}

            {referralStatus.loading && !referralTree ? (
              <div className="empty-state">
                <h3>Loading referral tree</h3>
                <p>Please wait while we fetch the full network.</p>
              </div>
            ) : null}

            {referralTree && referralLevels.length === 0 ? (
              <div className="empty-state">
                <h3>No referrals yet</h3>
                <p>This user has no referrals within the selected depth.</p>
              </div>
            ) : null}

            {referralTree && referralLevels.length > 0 ? (
              <div className="referral-tree">
                <div className="referral-root">
                  <div className="referral-node is-root">
                    <p className="referral-title">Root user</p>
                    <p className="referral-name">
                      {rootUser?.name ||
                        rootUser?.email ||
                        rootUser?.phone ||
                        'Selected user'}
                    </p>
                    <p className="referral-meta">
                      {rootUser?.email || rootUser?.phone || '--'}
                    </p>
                    <p className="referral-meta">
                      {rootUser?.id || rootUser?._id
                        ? `ID: ${rootUser?.id || rootUser?._id}`
                        : '--'}
                    </p>
                    {rootChips.length > 0 ? (
                      <div className="referral-chips">
                        {rootChips.map((chip) => (
                          <span
                            key={chip.key || chip.label || chip.value}
                            className="referral-chip"
                          >
                            {chip.label ? `${chip.label}: ` : ''}
                            {chip.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="referral-columns">
                  {referralLevels.map((level, index) => {
                    const levelNumber = level?.level ?? index + 1
                    const descendants =
                      level?.descendants || level?.users || level?.items || []
                    return (
                      <div key={`level-${levelNumber}`} className="referral-level">
                        <div className="referral-level-header">
                          <span>{`Level ${levelNumber}`}</span>
                          <span>{descendants.length} users</span>
                        </div>
                        <div className="referral-list">
                          {(expandedLevels[levelNumber]
                            ? descendants
                            : descendants.slice(0, maxReferralsPerLevel)
                          ).map((desc, descIndex) => {
                            const node = desc?.user || desc?.referral || desc || {}
                            const emailLine = node?.email || '--'
                            const phoneLine = node?.phone
                              ? `Phone: ${node.phone}`
                              : null
                            const codeLine = node?.referralCode
                              ? `Code: ${node.referralCode}`
                              : null
                            const secondLine = phoneLine || codeLine
                            const nodeWalletValue = resolveRupees(
                              node?.walletBalanceRupees,
                              node?.walletBalancePaise,
                            )
                            const nodePendingValue = resolveRupees(
                              node?.pendingReferralRupees ??
                                node?.pendingReferralApproxRupees,
                              node?.pendingReferralPaise,
                            )
                            const nodeReferralCount = parseNumericValue(
                              node?.referralCount,
                            )
                            const nodeStatus =
                              resolveUserStatusLabel(node) ||
                              resolveUserStatusLabel(desc)
                            const nodeChips = [
                              nodeWalletValue !== null
                                ? {
                                    label: 'Wallet',
                                    value: formatRupees(nodeWalletValue),
                                  }
                                : null,
                              nodePendingValue !== null
                                ? {
                                    label: 'Pending',
                                    value: formatRupees(nodePendingValue),
                                  }
                                : null,
                              nodeStatus
                                ? {
                                    key: 'status',
                                    value: nodeStatus,
                                  }
                                : null,
                              nodeReferralCount !== null
                                ? {
                                    label: 'Referrals',
                                    value: formatNumber(nodeReferralCount),
                                  }
                                : null,
                            ].filter(Boolean)
                            return (
                              <div
                                key={
                                  resolveUserId(node) ||
                                  node?.email ||
                                  node?.phone ||
                                  descIndex
                                }
                                className="referral-node"
                              >
                                <p className="referral-name">
                                  {node?.name || node?.email || 'User'}
                                </p>
                                <p className="referral-meta">{emailLine}</p>
                                {secondLine ? (
                                  <p className="referral-meta">{secondLine}</p>
                                ) : null}
                                {nodeChips.length > 0 ? (
                                  <div className="referral-chips">
                                    {nodeChips.map((chip) => (
                                      <span
                                        key={chip.key || chip.label || chip.value}
                                        className="referral-chip"
                                      >
                                        {chip.label ? `${chip.label}: ` : ''}
                                        {chip.value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      {descendants.length > maxReferralsPerLevel ? (
                        <div className="referral-level-footer">
                          <button
                            className="btn btn-outline btn-xs"
                            type="button"
                            onClick={() => toggleLevel(levelNumber)}
                          >
                            {expandedLevels[levelNumber]
                              ? 'Show less'
                              : `Show all (${descendants.length})`}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {activeTab === 'withdrawals' && (
          <section className="withdrawals-panel fade-in">
            <div className="overview-header">
              <div>
                <p className="overview-kicker">Referral payouts</p>
                <h3>Withdrawal requests</h3>
                <p>Review and update referral withdrawal requests by status.</p>
              </div>
              <div className="withdrawals-actions">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={loadWithdrawals}
                  disabled={withdrawalsStatus.loading}
                >
                  {withdrawalsStatus.loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="withdrawals-toolbar">
              <div className="withdrawals-filters">
                <p className="form-hint">Status</p>
                <div className="withdrawals-status-tabs">
                  {withdrawalStatusOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`status-button is-${option.tone} ${
                        withdrawalsFilter === option.key ? 'is-active' : ''
                      }`}
                      onClick={() => setWithdrawalsFilter(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="withdrawals-search">
                <p className="form-hint">User filter</p>
                <input
                  className="search-field"
                  type="search"
                  placeholder="Filter by user ID (optional)"
                  value={withdrawalSearchInput}
                  onChange={(event) =>
                    setWithdrawalSearchInput(event.target.value)
                  }
                />
              </div>
              <div className="withdrawals-summary">
                <p className="user-secondary">Requests</p>
                <p className="user-primary">
                  {formatNumber(withdrawalsData.items.length)}
                </p>
              </div>
              <div className="withdrawals-downloads">
                <button
                  className="btn btn-outline btn-xs btn-icon"
                  type="button"
                  onClick={() => handleWithdrawalsCsvDownload('wallet')}
                  disabled={withdrawalsCsvStatus.loadingKey === 'wallet'}
                  title="Download wallet withdrawals CSV"
                  aria-label="Download wallet withdrawals CSV"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M5 21h14" />
                  </svg>
                </button>
                <button
                  className="btn btn-outline btn-xs btn-icon"
                  type="button"
                  onClick={() => handleWithdrawalsCsvDownload('referral')}
                  disabled={withdrawalsCsvStatus.loadingKey === 'referral'}
                  title="Download referral withdrawals CSV"
                  aria-label="Download referral withdrawals CSV"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M5 21h14" />
                  </svg>
                </button>
              </div>
            </div>

            {withdrawalsStatus.error ? (
              <p className="form-error">{withdrawalsStatus.error}</p>
            ) : null}
            {withdrawalActionStatus.error ? (
              <p className="form-error">{withdrawalActionStatus.error}</p>
            ) : null}
            {withdrawalActionStatus.success ? (
              <p className="form-success">{withdrawalActionStatus.success}</p>
            ) : null}
            {withdrawalsCsvStatus.error ? (
              <p className="form-error">{withdrawalsCsvStatus.error}</p>
            ) : null}
            {withdrawalsCsvStatus.success ? (
              <p className="form-success">{withdrawalsCsvStatus.success}</p>
            ) : null}

            <div className="withdrawals-table">
              <div
                className={`withdrawals-row withdrawals-row-head ${
                  withdrawalsFilter === 'paid' ? 'is-readonly' : ''
                }`}
              >
                <span>User</span>
                <span>Amount</span>
                <span>Bank details</span>
                <span>UPI details</span>
                <span>Status</span>
                {withdrawalsFilter !== 'paid' ? <span>Actions</span> : null}
              </div>

              {withdrawalsStatus.loading && withdrawalsData.items.length === 0 ? (
                <div className="withdrawals-row withdrawals-row-empty">
                  Loading withdrawal requests...
                </div>
              ) : null}

              {withdrawalsData.items.map((withdrawal, index) => {
                const requestId = resolveWithdrawalId(withdrawal)
                const userInfo = resolveWithdrawalUserInfo(withdrawal)
                const amountValue = resolveWithdrawalAmount(withdrawal)
                const bankDetails = resolveBankDetails(withdrawal)
                const upiDetails = resolveUpiDetails(withdrawal)
                const normalizedStatus = normalizeWithdrawalStatus(
                  withdrawal?.status,
                )
                const statusTone = getWithdrawalStatusTone(withdrawal?.status)
                const payoutMethod =
                  typeof withdrawal?.method === 'string'
                    ? withdrawal.method
                    : typeof withdrawal?.paymentMethod === 'string'
                      ? withdrawal.paymentMethod
                      : typeof withdrawal?.channel === 'string'
                        ? withdrawal.channel
                        : ''
                const noteState = requestId
                  ? withdrawalNotes[requestId] ?? {
                      paymentRef: withdrawal?.paymentRef || '',
                      adminNote: withdrawal?.adminNote || '',
                    }
                  : {
                      paymentRef: withdrawal?.paymentRef || '',
                      adminNote: withdrawal?.adminNote || '',
                    }
                const isBusy = withdrawalActionStatus.loadingId === requestId
                const canUpdate =
                  requestId &&
                  !['paid', 'cancelled'].includes(normalizedStatus)
                const hideActions = withdrawalsFilter === 'paid'
                const showCopyActions = withdrawalsFilter === 'pending'
                const rowKey = requestId || `${index}`
                const accountCopyKey = `${rowKey}-account`
                const ifscCopyKey = `${rowKey}-ifsc`
                const upiCopyKey = `${rowKey}-upi`

                return (
                  <div
                    key={requestId || withdrawal?.createdAt || index}
                    className={`withdrawals-row ${
                      hideActions ? 'is-readonly' : ''
                    }`}
                  >
                    <div className="user-cell">
                      <p className="user-primary">{userInfo.name}</p>
                      <p className="user-secondary">
                        {userInfo.email || userInfo.phone || 'No contact'}
                      </p>
                      {userInfo.id ? (
                        <p className="user-secondary">ID: {userInfo.id}</p>
                      ) : null}
                    </div>
                    <div className="user-cell">
                      <p className="user-primary">
                        {formatRupees(amountValue)}
                      </p>
                      <p className="user-secondary">
                        {payoutMethod || 'Requested amount'}
                      </p>
                    </div>
                    <div className="user-cell">
                      <p className="user-primary">
                        {bankDetails.bankName || 'Bank details'}
                      </p>
                      <p className="user-secondary">
                        {bankDetails.accountName
                          ? `Name: ${bankDetails.accountName}`
                          : 'Name: --'}
                      </p>
                      <div className="withdrawal-copy-row">
                        <p className="user-secondary">
                          {bankDetails.accountNumber
                            ? `A/C: ${bankDetails.accountNumber}`
                            : 'A/C: --'}
                        </p>
                        {showCopyActions
                          ? renderCopyButton(
                              accountCopyKey,
                              bankDetails.accountNumber,
                              'account number',
                            )
                          : null}
                      </div>
                      <div className="withdrawal-copy-row">
                        <p className="user-secondary">
                          {bankDetails.ifsc ? `IFSC: ${bankDetails.ifsc}` : 'IFSC: --'}
                        </p>
                        {showCopyActions
                          ? renderCopyButton(
                              ifscCopyKey,
                              bankDetails.ifsc,
                              'IFSC code',
                            )
                          : null}
                      </div>
                    </div>
                    <div className="user-cell">
                      <p className="user-primary">UPI</p>
                      <div className="withdrawal-copy-row">
                        <p className="user-secondary">
                          {upiDetails.upiId || '--'}
                        </p>
                        {showCopyActions
                          ? renderCopyButton(upiCopyKey, upiDetails.upiId, 'UPI ID')
                          : null}
                      </div>
                      {upiDetails.upiName ? (
                        <p className="user-secondary">{upiDetails.upiName}</p>
                      ) : null}
                    </div>
                    <div className="user-cell">
                      <span className={`status-chip is-${statusTone}`}>
                        {getWithdrawalStatusLabel(normalizedStatus)}
                      </span>
                      {withdrawal?.paymentRef ? (
                        <p className="user-secondary">
                          Ref: {withdrawal.paymentRef}
                        </p>
                      ) : null}
                      {withdrawal?.adminNote ? (
                        <p className="user-secondary">
                          Note: {withdrawal.adminNote}
                        </p>
                      ) : null}
                    </div>
                    {!hideActions ? (
                      <div className="withdrawal-actions">
                        <input
                          className="withdrawal-input"
                          type="text"
                          placeholder="Payment ref (optional)"
                          value={noteState.paymentRef}
                          onChange={(event) =>
                            handleWithdrawalNoteChange(
                              requestId,
                              'paymentRef',
                              event.target.value,
                            )
                          }
                          disabled={!requestId || isBusy}
                        />
                        <input
                          className="withdrawal-input"
                          type="text"
                          placeholder="Admin note (optional)"
                          value={noteState.adminNote}
                          onChange={(event) =>
                            handleWithdrawalNoteChange(
                              requestId,
                              'adminNote',
                              event.target.value,
                            )
                          }
                          disabled={!requestId || isBusy}
                        />
                        <div className="withdrawal-action-row">
                          <button
                            className="btn btn-success btn-xs"
                            type="button"
                            onClick={() =>
                              handleWithdrawalStatusUpdate(withdrawal, 'paid')
                            }
                            disabled={!canUpdate || isBusy}
                          >
                            {isBusy ? 'Updating...' : 'Mark paid'}
                          </button>
                          <button
                            className="btn btn-danger btn-xs"
                            type="button"
                            onClick={() =>
                              handleWithdrawalStatusUpdate(
                                withdrawal,
                                'cancelled',
                              )
                            }
                            disabled={!canUpdate || isBusy}
                          >
                            {isBusy ? 'Updating...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {!withdrawalsStatus.loading &&
              withdrawalsData.items.length === 0 ? (
                <div className="withdrawals-row withdrawals-row-empty">
                  No withdrawal requests found.
                </div>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-panel fade-in">
            <div className="overview-header">
              <div>
                <p className="overview-kicker">Account</p>
                <h3>Admin settings</h3>
                <p>Review profile details and admin login activity.</p>
              </div>
            </div>

            <div className="profile-grid">
              <article className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar">{adminInitials}</div>
                  <div>
                    <p className="profile-title">Profile</p>
                    <p className="profile-subtitle">Signed-in admin account.</p>
                  </div>
                </div>
                <div className="profile-list">
                  <div>
                    <p className="profile-label">Admin name</p>
                    <p className="profile-value">{adminName}</p>
                  </div>
                  <div>
                    <p className="profile-label">Admin email</p>
                    <p className="profile-value">{adminEmail}</p>
                  </div>
                </div>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </article>

              <article className="activity-card">
                <div>
                  <p className="overview-kicker">Admins</p>
                  <h3>Login and logout details</h3>
                  <p>All admin login/logout activity at a glance.</p>
                </div>
                {adminSessionLogs.length > 0 ? (
                  <div className="activity-list">
                    {adminSessionLogs.map((session, index) => {
                      const loginLabel = formatDateTime(session.loginAt) || '--'
                      const logoutLabel = session.logoutAt
                        ? formatDateTime(session.logoutAt) || '--'
                        : 'Active'
                      const displayName =
                        session.name || session.email || 'Admin'

                      return (
                        <div
                          key={session.id || session.email || `${index}`}
                          className="activity-item"
                        >
                          <div>
                            <p className="activity-title">{displayName}</p>
                            {session.email && session.email !== displayName ? (
                              <p className="activity-detail">{session.email}</p>
                            ) : null}
                            <p className="activity-detail">
                              Login: {loginLabel}
                            </p>
                            <p className="activity-detail">
                              Logout: {logoutLabel}
                            </p>
                          </div>
                          <span className="activity-time">
                            {session.logoutAt ? 'Logged out' : 'Active'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="user-secondary">
                    No admin login activity recorded yet.
                  </p>
                )}
              </article>
            </div>
          </section>
        )}

        {activeTab === 'messages' && (
          <section className="messages-layout fade-in">
            <div className="message-categories">
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={`category-button ${
                    selectedCategory.key === category.key ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setSelectedCategory(category)
                    setStatus({ loading: false, error: '', success: '' })
                  }}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-label">{category.label}</span>
                </button>
              ))}
            </div>

            <div className="message-panel">
              <div className="message-header">
                <div>
                  <p className="message-kicker">Trade messages</p>
                  <h3>{selectedCategory.label}</h3>
                  <p>Send daily tips or trade messages to your subscribers.</p>
                </div>
                <div className="message-type-toggle">
                  <button
                    type="button"
                    className={`type-button ${
                      messageType === 'daily' ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      setMessageType('daily')
                      setStatus({ loading: false, error: '', success: '' })
                    }}
                  >
                    Daily tip
                  </button>
                  <button
                    type="button"
                    className={`type-button ${
                      messageType === 'trade' ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      setMessageType('trade')
                      setStatus({ loading: false, error: '', success: '' })
                    }}
                  >
                    Trade message
                  </button>
                </div>
              </div>

              <form className="message-form" onSubmit={handleSubmit}>
                {messageType === 'trade' ? (
                  <div className="message-grid">
                    <label className="input-field">
                      <span>Buy</span>
                      <input
                        type="text"
                        name="buy"
                        value={formValues.buy}
                        onChange={handleInputChange}
                        placeholder="100"
                      />
                    </label>
                    <label className="input-field">
                      <span>Target</span>
                      <input
                        type="text"
                        name="target"
                        value={formValues.target}
                        onChange={handleInputChange}
                        placeholder="110"
                      />
                    </label>
                    <label className="input-field">
                      <span>Stoploss</span>
                      <input
                        type="text"
                        name="stoploss"
                        value={formValues.stoploss}
                        onChange={handleInputChange}
                        placeholder="95"
                      />
                    </label>
                  </div>
                ) : null}

                <label className="input-field">
                  <span>Message text</span>
                  <textarea
                    name="text"
                    rows="4"
                    value={formValues.text}
                    onChange={handleInputChange}
                    placeholder="Type a daily tip or trade note..."
                  />
                </label>

                {status.error ? (
                  <p className="form-error">{status.error}</p>
                ) : null}
                {status.success ? (
                  <p className="form-success">{status.success}</p>
                ) : null}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={status.loading}
                >
                  {status.loading ? 'Sending...' : 'Send message'}
                </button>
              </form>

              <div className="image-upload-card">
                <div>
                  <p className="image-upload-title">Profit proof image</p>
                  <p className="image-upload-note">
                    Upload an image that will be shown to users.
                  </p>
                </div>
                <div className="image-upload-controls">
                  <input
                    ref={imageInputRef}
                    className="image-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Select image
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleImageUpload}
                    disabled={!selectedImage || uploadStatus.loading}
                  >
                    {uploadStatus.loading ? 'Uploading...' : 'Upload image'}
                  </button>
                </div>
                <p className="image-upload-filename">
                  {selectedImage ? selectedImage.name : 'No image selected.'}
                </p>
                {uploadStatus.error ? (
                  <p className="form-error">{uploadStatus.error}</p>
                ) : null}
                {uploadStatus.success ? (
                  <p className="form-success">{uploadStatus.success}</p>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
