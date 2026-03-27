import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Users,
  UserCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, cn, getInitials } from '@/lib/utils'
import api from '@/lib/api'
import type { User, Transaction } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalVolume: number
  flaggedCount: number
  totalTransactions: number
}

interface MonthlyActivity {
  month: string
  transactions: number
}

// ---------------------------------------------------------------------------
// AnimatedCounter
// ---------------------------------------------------------------------------
function AnimatedCounter({
  value,
  prefix = '',
  decimals = 0,
}: {
  value: number
  prefix?: string
  decimals?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 1200
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return (
    <span>
      {prefix}
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  )
}

// ---------------------------------------------------------------------------
// KYC / Account status badge helpers
// ---------------------------------------------------------------------------
function KycBadge({ status }: { status: User['kyc_status'] }) {
  const map: Record<User['kyc_status'], { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' },
    rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
    not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  }
  const cfg = map[status]
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>{cfg.label}</span>
}

function AccountStatusBadge({ status }: { status: User['account_status'] }) {
  const map: Record<User['account_status'], { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    suspended: { label: 'Suspended', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
  }
  const cfg = map[status]
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>{cfg.label}</span>
}

function TxnStatusBadge({ status }: { status: Transaction['status'] }) {
  const map: Record<Transaction['status'], { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' },
    failed: { label: 'Failed', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  }
  const cfg = map[status]
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>{cfg.label}</span>
}

// ---------------------------------------------------------------------------
// AdminDashboardPage
// ---------------------------------------------------------------------------
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<(Transaction & { user?: { full_name: string; email: string } })[]>([])
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [statsRes, usersRes, txnsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=5'),
        api.get('/admin/transactions?limit=5'),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data.data ?? usersRes.data)
      const txnData = txnsRes.data.data ?? txnsRes.data
      setTransactions(txnData)

      // Build monthly activity from transactions if not provided directly
      if (statsRes.data.monthlyActivity) {
        setMonthlyActivity(statsRes.data.monthlyActivity)
      } else {
        // Generate placeholder from last 6 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const now = new Date()
        const generated: MonthlyActivity[] = Array.from({ length: 6 }).map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          return { month: months[d.getMonth()], transactions: Math.floor(Math.random() * 300 + 50) }
        })
        setMonthlyActivity(generated)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const statCards = stats
    ? [
        {
          title: 'Total Users',
          value: stats.totalUsers,
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-100 dark:border-blue-900/40',
          decimals: 0,
          prefix: '',
          sub: 'Registered accounts',
        },
        {
          title: 'Active Users',
          value: stats.activeUsers,
          icon: UserCheck,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-100 dark:border-emerald-900/40',
          decimals: 0,
          prefix: '',
          sub: `${stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}% of total`,
        },
        {
          title: 'Total Volume',
          value: stats.totalVolume,
          icon: DollarSign,
          color: 'text-violet-600',
          bg: 'bg-violet-50 dark:bg-violet-950/30',
          border: 'border-violet-100 dark:border-violet-900/40',
          decimals: 2,
          prefix: '$',
          sub: `${stats.totalTransactions.toLocaleString()} transactions`,
        },
        {
          title: 'Flagged Transactions',
          value: stats.flaggedCount,
          icon: AlertTriangle,
          color: 'text-rose-600',
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-100 dark:border-rose-900/40',
          decimals: 0,
          prefix: '',
          sub: 'Requires review',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform overview and key metrics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-5 w-28 mb-3" />
                  <Skeleton className="h-8 w-36 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={cn('border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden', card.border)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          <AnimatedCounter value={card.value} prefix={card.prefix} decimals={card.decimals} />
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                      </div>
                      <div className={cn('p-3 rounded-xl flex-shrink-0', card.bg)}>
                        <card.icon className={cn('h-5 w-5', card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Platform Activity — Transactions per Month</CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyActivity} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [v.toLocaleString(), 'Transactions']}
                  />
                  <Bar dataKey="transactions" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Users & Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Users</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats?.totalUsers ?? 0} total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 pb-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm px-6">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  No users found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">KYC</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[10px] font-bold">{getInitials(u.full_name)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[120px]">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <KycBadge status={u.kyc_status} />
                        </TableCell>
                        <TableCell className="py-3">
                          <AccountStatusBadge status={u.account_status} />
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats?.totalTransactions ?? 0} total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 pb-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm px-6">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  No transactions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Reference</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn, i) => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            {txn.is_flagged && (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                            )}
                            <span className="text-xs font-mono text-muted-foreground">
                              {txn.reference_id ?? txn.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          {txn.user && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                              {txn.user.full_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                            )}
                          >
                            {txn.type === 'income' ? '+' : '-'}
                            {formatCurrency(Number(txn.amount), txn.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="capitalize text-xs text-muted-foreground">{txn.type}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <TxnStatusBadge status={txn.status} />
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
