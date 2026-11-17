import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bell, BellOff, CheckCheck, ChevronRight, FileText } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Pagination, Tabs, PAGE_SIZE
} from '../../components/members/ui'
import { cx, timeAgo } from '../../utils/members/format'

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: '1', label: 'Unread' }
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/notifications', { params: { page, limit: PAGE_SIZE, unreadOnly: unreadOnly || undefined } })
      .then(({ data }) => {
        setNotifications(data.notifications || [])
        setTotal(data.pagination?.total || 0)
        setError('')
      })
      .catch(err => setError(apiError(err, 'Failed to load notifications')))
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

  const hasUnread = notifications.some(n => !n.read)

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates on applications reaching your stage."
        hideTitleOnMobile
      />

      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <Tabs tabs={FILTER_TABS} value={unreadOnly} onChange={value => { setUnreadOnly(value); setPage(1) }} className="!w-auto" />
        {hasUnread && (
          <Button variant="soft" size="sm" onClick={markAll}>
            <CheckCheck size={15} /> Mark all read
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={6} /> : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={unreadOnly ? CheckCheck : BellOff}
            title={unreadOnly ? 'Nothing unread' : 'Nothing yet'}
            message={unreadOnly
              ? 'Everything addressed to you has been read.'
              : "You'll be notified when an application reaches your stage."}
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map(n => {
              const Icon = n.applicationId ? FileText : Bell
              const body = (
                <>
                  <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-slate-100 text-slate-400' : 'bg-royal-50 text-royal-600')}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-sm leading-snug [overflow-wrap:anywhere]', n.read ? 'font-medium text-slate-700' : 'font-semibold text-ink')}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500 [overflow-wrap:anywhere]">{n.body}</span>}
                    <span className="mt-1 block text-xs text-slate-400" title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 self-center">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-royal-600" aria-label="Unread" />}
                    {n.applicationId && <ChevronRight size={16} className="text-slate-300" aria-hidden="true" />}
                  </span>
                </>
              )
              const rowClass = cx(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-mist active:bg-royal-50/60 sm:px-5',
                !n.read && 'bg-royal-50/40'
              )
              return (
                <li key={n._id}>
                  {n.applicationId ? (
                    // Opening the application counts as reading the notification.
                    <Link to={`/members/applications/${n.applicationId}`} onClick={() => { if (!n.read) markRead(n._id) }} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => { if (!n.read) markRead(n._id) }} className={rowClass} disabled={n.read}>
                      {body}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  )
}
