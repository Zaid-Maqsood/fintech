import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Hash,
  BarChart2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'
import type { AnalyticsOverview } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

type DateRange = '1' | '3' | '6' | '12'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpendingCategory {
  category: string
  amount: number
}

interface MonthlyFlow {
  month: string
  income: number
  expenses: number
}

interface BudgetVsActual {
  category: string
  budget: number
  actual: number
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm min-w-[140px]">
      {label && <p className="font-semibold mb-1.5 text-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          <span className="font-medium">{p.name}:</span>{' '}
          {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string
  value: number
  isCurrency?: boolean
  colorClass: string
  iconBg: string
  Icon: React.ElementType
  index: number
}

function StatCard({ label, value, isCurrency = true, colorClass, iconBg, Icon, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-5 h-5', colorClass)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', colorClass)}>
            {isCurrency ? formatCurrency(value) : value.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ChartCard — consistent wrapper with loading/empty states
// ---------------------------------------------------------------------------
interface ChartCardProps {
  title: string
  loading: boolean
  empty?: boolean
  emptyMessage?: string
  height?: number
  children: React.ReactNode
}

function ChartCard({ title, loading, empty, emptyMessage, height = 220, children }: ChartCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton style={{ height }} className="w-full rounded-xl" />
        ) : empty ? (
          <div
            className="flex flex-col items-center justify-center text-muted-foreground text-sm gap-2"
            style={{ height }}
          >
            <BarChart2 className="w-8 h-8 opacity-30" />
            <p>{emptyMessage ?? 'No data available'}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DonutLegend — colour-coded list next to pie chart
// ---------------------------------------------------------------------------
function DonutLegend({ items }: { items: SpendingCategory[] }) {
  return (
    <div className="flex-1 space-y-2 overflow-hidden">
      {items.slice(0, 7).map((item, i) => (
        <div key={item.category} className="flex items-center gap-2 text-xs min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
          />
          <span className="truncate text-muted-foreground flex-1">{item.category}</span>
          <span className="font-medium flex-shrink-0">{formatCurrency(item.amount)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnalyticsPage
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('6')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [spending, setSpending] = useState<SpendingCategory[]>([])
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlow[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [ovRes, spRes, mfRes, bvaRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get(`/analytics/spending-by-category?months=${range}`),
          api.get(`/analytics/monthly-flow?months=${range}`),
          api.get('/analytics/budget-vs-actual'),
        ])
        setOverview(ovRes.data ?? null)
        setSpending(spRes.data ?? [])
        setMonthlyFlow(mfRes.data ?? [])
        setBudgetVsActual(bvaRes.data ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range])

  const statCards: StatCardProps[] = overview
    ? [
        {
          label: 'Total Income',
          value: overview.monthlyIncome,
          colorClass: 'text-emerald-600',
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/30',
          Icon: TrendingUp,
          index: 0,
        },
        {
          label: 'Total Expenses',
          value: overview.monthlyExpenses,
          colorClass: 'text-rose-600',
          iconBg: 'bg-rose-100 dark:bg-rose-950/30',
          Icon: TrendingDown,
          index: 1,
        },
        {
          label: 'Net Savings',
          value: overview.savings,
          colorClass: 'text-blue-600',
          iconBg: 'bg-blue-100 dark:bg-blue-950/30',
          Icon: PiggyBank,
          index: 2,
        },
        {
          label: 'Transactions',
          value: overview.transactionCount,
          isCurrency: false,
          colorClass: 'text-violet-600',
          iconBg: 'bg-violet-100 dark:bg-violet-950/30',
          Icon: Hash,
          index: 3,
        },
      ]
    : []

  // Net savings line data derived from monthly flow
  const netFlow: (MonthlyFlow & { net: number })[] = monthlyFlow.map((m) => ({
    ...m,
    net: m.income - m.expenses,
  }))

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header + date range filter                                          */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h2 className="text-xl font-bold">Analytics &amp; Reporting</h2>
          <p className="text-muted-foreground text-sm">
            Track your financial trends and spending patterns
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DATE_RANGE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={range === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(value)}
              className={cn(range === value && 'bg-blue-600 hover:bg-blue-700')}
            >
              {label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Summary stat cards                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts — row 1: Income vs Expenses + Spending by Category          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Income vs Expense grouped bar chart */}
        <ChartCard
          title="Income vs Expenses"
          loading={loading}
          empty={!loading && monthlyFlow.length === 0}
          emptyMessage="No data for this period"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyFlow} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spending by Category donut */}
        <ChartCard
          title="Spending by Category"
          loading={loading}
          empty={!loading && spending.length === 0}
          emptyMessage="No spending data for this period"
        >
          <div className="flex items-center gap-2">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={spending}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="category"
                >
                  {spending.map((_item, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), '']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <DonutLegend items={spending} />
          </div>
        </ChartCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts — row 2: Cash Flow Area + Budget vs Actual                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cash flow area chart */}
        <ChartCard
          title="Cash Flow Trend"
          loading={loading}
          empty={!loading && monthlyFlow.length === 0}
          emptyMessage="No cash flow data for this period"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={netFlow}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradIncome)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#gradExpenses)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradNet)"
                dot={false}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Budget vs Actual horizontal bar */}
        <ChartCard
          title="Budget vs Actual (This Month)"
          loading={loading}
          empty={!loading && budgetVsActual.length === 0}
          emptyMessage="No budget data for this month"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetVsActual} layout="vertical" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={84}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="actual" name="Actual" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Insights summary row                                                */}
      {/* ------------------------------------------------------------------ */}
      {!loading && overview && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-700 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Savings Rate</p>
                  <p className="text-3xl font-bold">
                    {overview.monthlyIncome > 0
                      ? `${Math.max(0, Math.round((overview.savings / overview.monthlyIncome) * 100))}%`
                      : '—'}
                  </p>
                  <p className="text-blue-200 text-xs mt-1">
                    {overview.savings >= 0
                      ? 'You are saving money this period'
                      : 'Expenses exceed income this period'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-200 text-xs mb-0.5">Top Expense</p>
                    <p className="font-semibold">
                      {spending[0]?.category ?? '—'}
                    </p>
                    {spending[0] && (
                      <p className="text-blue-200 text-xs">{formatCurrency(spending[0].amount)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs mb-0.5">Avg Monthly Spend</p>
                    <p className="font-semibold">
                      {monthlyFlow.length > 0
                        ? formatCurrency(
                            monthlyFlow.reduce((acc, m) => acc + m.expenses, 0) / monthlyFlow.length,
                          )
                        : '—'}
                    </p>
                    <p className="text-blue-200 text-xs">over {monthlyFlow.length} months</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
