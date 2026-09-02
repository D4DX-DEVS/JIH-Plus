import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, FilterBar, PageHeader, Pagination, Select,
  Spinner, PAGE_SIZE
} from '../../components/members/ui'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/notifications', { params: { page, limit: PAGE_SIZE, unreadOnly: unreadOnly || undefined } })
      .then(({ data }) => {
        setNotifications(data.notifications || [])
        setTotal(data.pagination?.total || 0)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load notifications')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, unreadOnly])

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)))
    } catch (err) {
      toast.error(apiError(err, 'Could not mark as read'))
    }
  }

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all')
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not mark all as read'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates on applications reaching your stage."
        actions={
          notifications.some(n => !n.read)
            ? <Button variant="secondary" onClick={markAll}>Mark all read</Button>
            : null
        }
      />

      <FilterBar
        active={Boolean(unreadOnly)}
        onClear={() => { setUnreadOnly(''); setPage(1) }}
      >
        <Select
          className="sm:w-48"
          value={unreadOnly}
          onChange={e => { setUnreadOnly(e.target.value); setPage(1) }}
        >
          <option value="">All notifications</option>
          <option value="1">Unread only</option>
        </Select>
      </FilterBar>

      <Card>
        {loading ? <Spinner /> : notifications.length === 0 ? (
          <EmptyState
            title={unreadOnly ? 'Nothing unread' : 'Nothing yet'}
            message={unreadOnly
              ? 'Everything addressed to you has been read.'
              : "You'll be notified when an application reaches your stage."}
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map(n => (
              <li key={n._id} className={`p-4 ${n.read ? '' : 'bg-[#faf5ff]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words leading-relaxed">{n.title}</p>
                    {n.body && <p className="text-sm text-gray-600 mt-0.5 break-words leading-relaxed">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {n.applicationId && (
                      <Link
                        to={`/members/applications/${n.applicationId}`}
                        className="text-sm text-[#5b21b6] hover:underline py-1.5 px-1 -mr-1"
                      >
                        Open
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => markRead(n._id)} className="text-xs text-gray-500 hover:text-gray-700 py-1.5 px-1 -mr-1">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  )
}
