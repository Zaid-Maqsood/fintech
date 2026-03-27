import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Send,
  PiggyBank,
  ArrowLeftRight,
  Bell,
  AlertTriangle,
  Flag,
  Trash2,
  CheckCheck,
  InboxIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelativeTime, cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Notification } from '@/types'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Type config
// ---------------------------------------------------------------------------
const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  payment: {
    icon: Send,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  budget_alert: {
    icon: PiggyBank,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  transaction: {
    icon: ArrowLeftRight,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  system: {
    icon: Bell,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
  },
  flag: {
    icon: Flag,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
  },
}

function getTypeConfig(type: string) {
  return typeConfig[type] ?? typeConfig['system']
}

// ---------------------------------------------------------------------------
// Date grouping helpers
// ---------------------------------------------------------------------------
type Group = 'Today' | 'Yesterday' | 'Earlier'

function getGroup(dateStr: string): Group {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)

  if (d >= todayStart) return 'Today'
  if (d >= yesterdayStart) return 'Yesterday'
  return 'Earlier'
}

function groupNotifications(notifications: Notification[]): Record<Group, Notification[]> {
  const groups: Record<Group, Notification[]> = { Today: [], Yesterday: [], Earlier: [] }
  for (const n of notifications) {
    groups[getGroup(n.created_at)].push(n)
  }
  return groups
}

// ---------------------------------------------------------------------------
// Notification Card
// ---------------------------------------------------------------------------
function NotificationCard({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const cfg = getTypeConfig(notification.type)
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-150 cursor-pointer',
        notification.is_read
          ? 'bg-card border-border/40 hover:bg-muted/30'
          : 'bg-card border-border hover:bg-muted/20',
      )}
      onClick={() => !notification.is_read && onRead(notification.id)}
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
        <Icon className={cn('h-5 w-5', cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <p className={cn('text-sm truncate', notification.is_read ? 'text-foreground' : 'font-semibold text-foreground')}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1.5">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete(notification.id)
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600"
        title="Delete notification"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeletons
// ---------------------------------------------------------------------------
function NotificationSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border border-border/40">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"
      >
        <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
      </motion.div>
      <h3 className="font-semibold text-foreground">
        {filtered ? 'No unread notifications' : 'All caught up'}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5">
        {filtered
          ? "You've read all your notifications."
          : "You don't have any notifications yet."}
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// NotificationsPage
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications')
      const data = res.data
      setNotifications(Array.isArray(data) ? data : data.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n),
    )
    try {
      await api.put(`/notifications/${id}/read`)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await api.delete(`/notifications/${id}`)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    try {
      await api.put('/notifications/read-all')
    } catch (e) {
      console.error(e)
    } finally {
      setMarkingAll(false)
    }
  }

  const filtered = tab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length
  const groups = groupNotifications(filtered)
  const groupOrder: Group[] = ['Today', 'Yesterday', 'Earlier']

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  key="badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All notifications read'}
          </p>
        </div>

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="gap-2 text-xs whitespace-nowrap"
              >
                <CheckCheck className="h-4 w-4" />
                {markingAll ? 'Marking...' : 'Mark all read'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-sm px-4">
              All
              {notifications.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({notifications.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-sm px-4">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-blue-600">({unreadCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {loading ? (
          <NotificationSkeletons />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={tab === 'unread'} />
        ) : (
          <div className="space-y-6">
            {groupOrder.map(group => {
              const items = groups[group]
              if (!items.length) return null
              return (
                <div key={group}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {items.map(notification => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          onRead={handleRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
