import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  BarChart2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UserGrowthPoint {
  month: string
  users: number
}

interface VolumePoint {
  month: string
  volume: number
}

interface StatusBreakdown {
  name: string
  value: number
}

interface CategorySpend {
  category: string
  amount: number
}

interface AdminAnalytics {
  userGrowth: UserGrowthPoint[]
  transactionVolume: VolumePoint[]
  statusBreakdown: StatusBreakdown[]
  topCategories: CategorySpend[]
  summary: {
    totalUsers: number
    totalTransactions: number
    totalVolume: number
    avgTransactionValue: number
    activeUsersPercent: number
    flaggedRate: number
  }
}

// ---------------------------------------------------------------------------
// AnimatedCounter
// ---------------------------------------------------------------------------
function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
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
      {display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[130px]">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">
            {formatter ? formatter(p.value) : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Donut Label
// ---------------------------------------------------------------------------
const RADIAN = Math.PI / 180
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ---------------------------------------------------------------------------
// AdminAnalyticsPage
// ---------------------------------------------------------------------------
const STATUS_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6b7280']

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.get('/admin/analytics')
      setData(res.data)
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

  const summaryCards = data?.summary
    ? [
        {
          title: 'Total Users',
          value: data.summary.totalUsers,
          prefix: '',
          suffix: '',
          decimals: 0,
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-100 dark:border-blue-900/40',
        },
        {
          title: 'Total Transactions',
          value: data.summary.totalTransactions,
          prefix: '',
          suffix: '',
          decimals: 0,
          icon: Activity,
          color: 'text-violet-600',
          bg: 'bg-violet-50 dark:bg-violet-950/30',
          border: 'border-violet-100 dark:border-violet-900/40',
        },
        {
          title: 'Total Volume',
          value: data.summary.totalVolume,
          prefix: '$',
          suffix: '',
          decimals: 0,
          icon: DollarSign,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-100 dark:border-emerald-900/40',
        },
        {
          title: 'Avg Transaction',
          value: data.summary.avgTransactionValue,
          prefix: '$',
          suffix: '',
          decimals: 2,
          icon: TrendingUp,
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-100 dark:border-amber-900/40',
        },
        {
          title: 'Active Users',
          value: data.summary.activeUsersPercent,
          prefix: '',
          suffix: '%',
          decimals: 1,
          icon: UserCheck,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-100 dark:border-emerald-900/40',
        },
        {
          title: 'Flagged Rate',
          value: data.summary.flaggedRate,
          prefix: '',
          suffix: '%',
          decimals: 2,
          icon: AlertTriangle,
          color: 'text-rose-600',
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-100 dark:border-rose-900/40',
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
          <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform-wide metrics and trend analysis</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-28" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className={cn('border shadow-sm hover:shadow-md transition-shadow overflow-hidden', card.border)}>
                  <CardContent className="p-5">
                    <div className={cn('inline-flex p-2 rounded-lg mb-3', card.bg)}>
                      <card.icon className={cn('h-4 w-4', card.color)} />
                    </div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      <AnimatedCounter
                        value={card.value}
                        prefix={card.prefix}
                        suffix={card.suffix}
                        decimals={card.decimals}
                      />
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* User Growth Bar Chart */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                User Growth
              </CardTitle>
              <p className="text-xs text-muted-foreground">New registrations per month</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data?.userGrowth ?? []}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    />
                    <Bar dataKey="users" name="New Users" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction Volume Line Chart */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Transaction Volume
              </CardTitle>
              <p className="text-xs text-muted-foreground">Monthly volume in USD</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data?.transactionVolume ?? []}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={
                        <CustomTooltip formatter={(v) => formatCurrency(v)} />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8b5cf6' }}
                      activeDot={{ r: 5, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment Status Donut */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Payment Status Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">Distribution by transaction status</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={data?.statusBreakdown ?? []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={DonutLabel}
                      >
                        {(data?.statusBreakdown ?? []).map((_, index) => (
                          <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2.5 flex-1">
                    {(data?.statusBreakdown ?? []).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }}
                          />
                          <span className="text-sm capitalize text-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Spending Categories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-500" />
                Top Spending Categories
              </CardTitle>
              <p className="text-xs text-muted-foreground">Platform-wide category spending</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data?.topCategories ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
                      cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    />
                    <Bar dataKey="amount" name="Spending" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
