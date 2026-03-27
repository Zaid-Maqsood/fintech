import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  BarChart2,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Account, Transaction } from '@/types'

interface OverviewData {
  totalBalance: number
  availableBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savings: number
  transactionCount: number
}

interface MonthlyFlow {
  month: string
  income: number
  expenses: number
}

// ---------------------------------------------------------------------------
// AnimatedCounter
// ---------------------------------------------------------------------------
function AnimatedCounter({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = 0
    const duration = 1200
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + (value - start) * eased)
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [value])

  return (
    <span>
      {prefix}
      {display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([])
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, accountsRes, txnsRes, flowRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/accounts'),
          api.get('/transactions?limit=5&sort=desc'),
          api.get('/analytics/monthly-flow'),
        ])
        setOverview(overviewRes.data)
        setAccounts(accountsRes.data)
        setRecentTxns(txnsRes.data.data || [])
        setMonthlyFlow(flowRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  const statCards = overview
    ? [
        {
          title: 'Total Balance',
          value: overview.totalBalance,
          icon: Wallet,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          trend: null as null | 'up' | 'down',
        },
        {
          title: 'Monthly Income',
          value: overview.monthlyIncome,
          icon: TrendingUp,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          trend: 'up' as const,
        },
        {
          title: 'Monthly Expenses',
          value: overview.monthlyExpenses,
          icon: TrendingDown,
          color: 'text-rose-600',
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          trend: 'down' as const,
        },
        {
          title: 'Net Savings',
          value: overview.savings,
          icon: PiggyBank,
          color: 'text-violet-600',
          bg: 'bg-violet-50 dark:bg-violet-950/30',
          trend: 'up' as const,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Welcome banner                                                       */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-foreground">
          Good {greeting}, {firstName} 👋
        </h2>
        <p className="text-muted-foreground mt-1">Here's your financial overview for today.</p>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          <AnimatedCounter value={card.value} />
                        </p>
                      </div>
                      <div className={cn('p-3 rounded-xl', card.bg)}>
                        <card.icon className={cn('h-5 w-5', card.color)} />
                      </div>
                    </div>
                    {card.trend && (
                      <div
                        className={cn(
                          'flex items-center gap-1 mt-3 text-xs font-medium',
                          card.trend === 'up' ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {card.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                        This month
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Chart + Accounts                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area chart */}
        <Card className="xl:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cash Flow — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyFlow}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#incomeGrad)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#expensesGrad)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Accounts list */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">My Accounts</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/accounts')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No accounts found
              </div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        acc.type === 'checking'
                          ? 'bg-blue-100 dark:bg-blue-950/50'
                          : acc.type === 'savings'
                            ? 'bg-violet-100 dark:bg-violet-950/50'
                            : acc.type === 'investment'
                              ? 'bg-amber-100 dark:bg-amber-950/50'
                              : 'bg-emerald-100 dark:bg-emerald-950/50',
                      )}
                    >
                      {acc.type === 'checking' ? (
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      ) : acc.type === 'savings' ? (
                        <PiggyBank className="w-5 h-5 text-violet-600" />
                      ) : acc.type === 'investment' ? (
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Wallet className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(Number(acc.balance))}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Transactions + Quick Actions                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="xl:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/transactions')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentTxns.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxns.map((txn) => (
                  <motion.div
                    key={txn.id}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/transactions')}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        txn.type === 'income'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50'
                          : txn.type === 'expense'
                            ? 'bg-rose-100 dark:bg-rose-950/50'
                            : 'bg-blue-100 dark:bg-blue-950/50',
                      )}
                    >
                      {txn.type === 'income' ? (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      ) : txn.type === 'expense' ? (
                        <ArrowUpRight className="w-5 h-5 text-rose-600" />
                      ) : (
                        <Send className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {txn.description || txn.category?.name || 'Transaction'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(txn.transaction_date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {txn.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(txn.amount))}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Send Money',
                icon: Send,
                color: 'bg-blue-600 hover:bg-blue-700',
                onClick: () => navigate('/payments'),
              },
              {
                label: 'Add Transaction',
                icon: Plus,
                color: 'bg-emerald-600 hover:bg-emerald-700',
                onClick: () => navigate('/transactions'),
              },
              {
                label: 'View Analytics',
                icon: BarChart2,
                color: 'bg-violet-600 hover:bg-violet-700',
                onClick: () => navigate('/analytics'),
              },
              {
                label: 'Manage Budgets',
                icon: PiggyBank,
                color: 'bg-amber-600 hover:bg-amber-700',
                onClick: () => navigate('/budgets'),
              },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl text-white text-xs font-medium transition-colors',
                  action.color,
                )}
              >
                <action.icon className="w-5 h-5" />
                {action.label}
              </motion.button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
