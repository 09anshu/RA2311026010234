import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_NOTIFICATION_API_URL || 'http://20.207.122.201/evaluation-service/notifications'
const DEFAULT_TOKEN = import.meta.env.VITE_NOTIFICATION_TOKEN || ''
const SEEN_KEY = import.meta.env.VITE_SEEN_KEY || 'hiremanager-seen-notifications'
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'hiremanager-token'
const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE || '6')

const NAV_ITEMS = [
  { to: '/all', label: 'All notifications' },
  { to: '/priority', label: 'Priority notifications' },
]

function readSeenIds() {
  try {
    const stored = window.localStorage.getItem(SEEN_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function normalizeNotification(notification, index) {
  return {
    id: String(notification?.ID ?? notification?.id ?? index),
    type: String(notification?.Type ?? notification?.type ?? 'Unknown'),
    message: String(notification?.Message ?? notification?.message ?? ''),
    timestamp: String(notification?.Timestamp ?? notification?.timestamp ?? ''),
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown time'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/all"
        element={
          <ProtectedPage>
            <AllNotificationsPage />
          </ProtectedPage>
        }
      />
      <Route
        path="/priority"
        element={
          <ProtectedPage>
            <PriorityNotificationsPage />
          </ProtectedPage>
        }
      />
      <Route path="*" element={<Navigate to="/all" replace />} />
    </Routes>
  )
}

function ProtectedPage({ children }) {
  const [token] = useStoredToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Shell>{children}</Shell>
}

function Shell({ children }) {
  const [, setToken] = useStoredToken()
  const navigate = useNavigate()

  function logout() {
    setToken('')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="top-hero">
        <div className="hero-copy">
          <p className="eyebrow">Notification Dashboard</p>
          <h1>Protected notification dashboard</h1>
          <p className="hero-text">
            Separate pages for all notifications and priority notifications, with local viewed-state and API query params.
          </p>
        </div>

        <div className="hero-card">
          <div className="hero-card__label">Authentication</div>
          <div className="hero-card__value">Bearer token active</div>
          <button type="button" className="ghost-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="tab-bar">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const [tokenInput, setTokenInput] = useState(() => window.localStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN)
  const [error, setError] = useState('')

  function submitToken(event) {
    event.preventDefault()

    const trimmed = tokenInput.trim()
    if (!trimmed) {
      setError('Paste the bearer token to continue.')
      return
    }

    window.localStorage.setItem(TOKEN_KEY, trimmed)
    navigate('/all', { replace: true })
  }

  return (
    <div className="app-shell app-shell--centered">
      <form className="login-card" onSubmit={submitToken}>
        <p className="eyebrow">Protected route</p>
        <h1>Notification Login</h1>
        <p className="hero-text">Unlock the protected API with the access token before browsing notifications.</p>

        <label className="field-label" htmlFor="tokenInput">
          Access token
        </label>
        <textarea
          id="tokenInput"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          className="text-area"
          rows={8}
          spellCheck="false"
        />

        {error ? <div className="error-box">{error}</div> : null}

        <div className="login-actions">
          <button className="primary-button" type="submit">
            Continue
          </button>
        </div>
      </form>
    </div>
  )
}

function AllNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useStoredToken()
  const [seenIds, setSeenIds] = useState(() => readSeenIds())

  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.max(1, Number(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
  const notificationType = searchParams.get('notification_type') || 'All'

  const requestType = notificationType === 'All' ? '' : notificationType
  const { notifications, loading, error, isLastPage } = useNotifications({
    token,
    page,
    limit,
    notificationType: requestType,
  })

  const seenSet = useMemo(() => new Set(seenIds), [seenIds])
  const unreadCount = notifications.filter((item) => !seenSet.has(item.id)).length
  const totalCount = notifications.length

  function updateSearch(nextValues) {
    const next = new URLSearchParams(searchParams)

    if (nextValues.page) next.set('page', String(nextValues.page))
    if (nextValues.limit) next.set('limit', String(nextValues.limit))
    if (Object.prototype.hasOwnProperty.call(nextValues, 'notification_type')) {
      const value = nextValues.notification_type
      if (!value || value === 'All') next.delete('notification_type')
      else next.set('notification_type', value)
    }

    setSearchParams(next, { replace: true })
  }

  function markSeen(id) {
    setSeenIds((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="page-grid">
      <aside className="summary-panel">
        <div className="summary-title">All Notifications</div>
        <StatBlock label="Total" value={totalCount} />
        <StatBlock label="Unread" value={unreadCount} accent />
        <StatBlock label="Page" value={page} />
      </aside>

      <div className="content-panel">
        <PanelHeader
          title="Notification API (GET)"
          subtitle="Browse the complete feed with API paging and type filters."
        />

        <Toolbar
          notificationType={notificationType}
          limit={limit}
          onTypeChange={(value) => updateSearch({ notification_type: value, page: 1 })}
          onLimitChange={(value) => updateSearch({ limit: value, page: 1 })}
          typeOptions={['All', 'Event', 'Result', 'Placement']}
        />

        {error ? <div className="error-box">{error}</div> : null}

        {loading ? (
          <EmptyState label="Loading protected notifications..." />
        ) : notifications.length ? (
          <div className="card-stack">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                seen={seenSet.has(notification.id)}
                onClick={() => markSeen(notification.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState label="No notifications found for this filter." />
        )}

        <PaginationBar
          page={page}
          isLastPage={isLastPage}
          onPrevious={() => updateSearch({ page: Math.max(1, page - 1) })}
          onNext={() => updateSearch({ page: page + 1 })}
        />
      </div>
    </section>
  )
}

function PriorityNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useStoredToken()
  const [seenIds, setSeenIds] = useState(() => readSeenIds())

  const limit = Math.max(1, Number(searchParams.get('limit') || '5'))
  const notificationType = searchParams.get('notification_type') || 'All'

  const requestType = notificationType === 'All' ? '' : notificationType
  const { notifications, loading, error } = useNotifications({
    token,
    page: 1,
    limit,
    notificationType: requestType,
  })

  const seenSet = useMemo(() => new Set(seenIds), [seenIds])

  function updateSearch(nextValues) {
    const next = new URLSearchParams(searchParams)
    if (nextValues.limit) next.set('limit', String(nextValues.limit))
    if (Object.prototype.hasOwnProperty.call(nextValues, 'notification_type')) {
      const value = nextValues.notification_type
      if (!value || value === 'All') next.delete('notification_type')
      else next.set('notification_type', value)
    }
    setSearchParams(next, { replace: true })
  }

  function markSeen(id) {
    setSeenIds((current) => {
      if (current.includes(id)) return current
      const next = [...current, id]
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="page-grid page-grid--priority">
      <aside className="summary-panel">
        <div className="summary-title">Priority Notifications</div>
        <StatBlock label="Top N" value={limit} accent />
        <StatBlock label="Visible" value={notifications.length} />
        <StatBlock label="Type" value={notificationType} />
      </aside>

      <div className="content-panel">
        <PanelHeader
          title="Priority page"
          subtitle="Display a limited top N list with type filtering on a separate page."
        />

        <Toolbar
          notificationType={notificationType}
          limit={limit}
          onTypeChange={(value) => updateSearch({ notification_type: value })}
          onLimitChange={(value) => updateSearch({ limit: value })}
          typeOptions={['All', 'Event', 'Result', 'Placement']}
        />

        {error ? <div className="error-box">{error}</div> : null}

        {loading ? (
          <EmptyState label="Loading priority notifications..." />
        ) : notifications.length ? (
          <div className="card-stack">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                seen={seenSet.has(notification.id)}
                onClick={() => markSeen(notification.id)}
                priority
              />
            ))}
          </div>
        ) : (
          <EmptyState label="No priority notifications found for this filter." />
        )}
      </div>
    </section>
  )
}

function useStoredToken() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN)

  useEffect(() => {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  }, [token])

  return [token, setToken]
}

function useNotifications({ token, page, limit, notificationType }) {
  const [state, setState] = useState({ notifications: [], loading: true, error: '', isLastPage: false })

  useEffect(() => {
    if (!token) return undefined

    const abortController = new AbortController()

    async function loadNotifications() {
      setState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const url = new URL(API_URL)
        url.searchParams.set('page', String(page))
        url.searchParams.set('limit', String(limit))
        if (notificationType) {
          url.searchParams.set('notification_type', notificationType)
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = await response.json()
        const items = Array.isArray(data?.notifications) ? data.notifications : []
        const normalized = items
          .map((notification, index) => normalizeNotification(notification, index))
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())

        setState({
          notifications: normalized,
          loading: false,
          error: '',
          isLastPage: normalized.length < limit,
        })
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setState({
            notifications: [],
            loading: false,
            error:
              requestError instanceof Error
                ? requestError.message
                : 'Unable to load protected notifications.',
            isLastPage: true,
          })
        }
      }
    }

    loadNotifications()

    return () => abortController.abort()
  }, [limit, notificationType, page, token])

  return state
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="panel-header">
      <div>
        <p className="panel-eyebrow">Notification API (GET)</p>
        <h2>{title}</h2>
        <p className="panel-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

function Toolbar({ notificationType, limit, onTypeChange, onLimitChange, typeOptions }) {
  return (
    <div className="toolbar">
      <label className="field">
        <span>notification_type</span>
        <select value={notificationType} onChange={(event) => onTypeChange(event.target.value)}>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--small">
        <span>limit</span>
        <input
          type="number"
          min="1"
          max="50"
          value={limit}
          onChange={(event) => onLimitChange(Math.max(1, Number(event.target.value) || 1))}
        />
      </label>
    </div>
  )
}

function StatBlock({ label, value, accent = false }) {
  return (
    <div className={`stat-block ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ label }) {
  return <div className="empty-state">{label}</div>
}

function NotificationCard({ notification, seen, priority = false, onClick }) {
  const normalizedType = notification.type.toLowerCase()
  const typeClass =
    normalizedType === 'result'
      ? 'result'
      : normalizedType === 'placement'
        ? 'placement'
        : normalizedType === 'event'
          ? 'event'
          : 'neutral'

  return (
    <button type="button" className={`notification-card ${seen ? 'seen' : 'unseen'} ${priority ? 'priority' : ''}`} onClick={onClick}>
      <div className="notification-card__topline">
        <span className={`notification-pill ${typeClass}`}>{notification.type}</span>
        <span className={`status-pill ${seen ? 'seen' : 'new'}`}>{seen ? 'Viewed' : 'New'}</span>
      </div>

      <p className="notification-card__message">{notification.message || 'No message provided.'}</p>

      <div className="notification-card__meta">
        <span>{notification.id}</span>
        <span>{formatTimestamp(notification.timestamp)}</span>
      </div>
    </button>
  )
}

function PaginationBar({ page, isLastPage, onPrevious, onNext }) {
  return (
    <div className="pagination-bar">
      <button type="button" className="secondary-button" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </button>
      <span className="pagination-label">Page {page}</span>
      <button type="button" className="secondary-button" onClick={onNext} disabled={isLastPage}>
        Next
      </button>
    </div>
  )
}

export default App
