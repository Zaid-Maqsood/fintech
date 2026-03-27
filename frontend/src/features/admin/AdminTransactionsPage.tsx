import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Activity,
  Calendar,
  FileText,
  User,
  Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Transaction } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminTransaction extends Transaction {
  user?: {
    id: string
    full_name: string
    email: string
  }
}

// ---------------------------------------------------------------------------
// Risk Score Indicator
// ---------------------------------------------------------------------------
function RiskScoreIndicator({ score }: { score: number }) {
  const color =
    score <= 30
      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
      : score <= 70
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
        : 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400'

  const bar =
    score <= 30
      ? 'bg-emerald-500'
      : score <= 70
        ? 'bg-amber-500'
        : 'bg-rose-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-[60px] bg-muted rounded-full h-1.5 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-semibold rounded-full px-1.5 py-0.5', color)}>{score}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Badges
// ---------------------------------------------------------------------------
function TxnStatusBadge({ status }: { status: Transaction['status'] }) {
  const map: Record<Transaction['status'], { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
    failed: { label: 'Failed', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
  }
  const cfg = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function TypeIcon({ type }: { type: Transaction['type'] }) {
  if (type === 'income') return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
  if (type === 'expense') return <ArrowUpRight className="h-4 w-4 text-rose-500" />
  return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
}

// ---------------------------------------------------------------------------
// Transaction Detail Sheet
// ---------------------------------------------------------------------------
interface TransactionDetailSheetProps {
  transaction: AdminTransaction | null
  onClose: () => void
  onFlagToggled: (id: string, flagged: boolean) => void
}

function TransactionDetailSheet({ transaction, onClose, onFlagToggled }: TransactionDetailSheetProps) {
  const [togglingFlag, setTogglingFlag] = useState(false)

  const toggleFlag = async () => {
    if (!transaction) return
    setTogglingFlag(true)
    try {
      await api.put(`/admin/transactions/${transaction.id}/flag`)
      onFlagToggled(transaction.id, !transaction.is_flagged)
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingFlag(false)
    }
  }

  return (
    <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0" side="right">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            Transaction Details
            {transaction?.is_flagged && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                <Flag className="h-3 w-3" />
                Flagged
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {!transaction ? null : (
            <div className="px-6 py-5 space-y-5">
              {/* Amount Hero */}
              <div className={cn(
                'rounded-2xl p-5 text-center',
                transaction.type === 'income'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : transaction.type === 'expense'
                    ? 'bg-rose-50 dark:bg-rose-950/20'
                    : 'bg-blue-50 dark:bg-blue-950/20',
              )}>
                <div className="flex justify-center mb-2">
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center',
                    transaction.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                    transaction.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-blue-100 dark:bg-blue-900/40',
                  )}>
                    <TypeIcon type={transaction.type} />
                  </div>
                </div>
                <p className={cn(
                  'text-3xl font-bold',
                  transaction.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' :
                  transaction.type === 'expense' ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400',
                )}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount), transaction.currency)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{transaction.type}</p>
              </div>

              <Separator />

              {/* Details */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Transaction Info
                </h4>
                <div className="space-y-2.5">
                  {[
                    { label: 'Reference ID', value: transaction.reference_id ?? transaction.id },
                    { label: 'Description', value: transaction.description ?? '—' },
                    { label: 'Payment Method', value: transaction.payment_method ?? '—' },
                    { label: 'Status', value: <TxnStatusBadge status={transaction.status} /> },
                    { label: 'Date', value: formatDate(transaction.transaction_date) },
                    { label: 'Created', value: formatRelativeTime(transaction.created_at) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
                      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                      <span className="text-sm font-medium text-foreground text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Info */}
              {transaction.user && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      User
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium">{transaction.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{transaction.user.email}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Compliance */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Compliance
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <RiskScoreIndicator score={transaction.risk_score} />
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-sm text-muted-foreground">Flagged</span>
                    <span className={cn('text-sm font-medium', transaction.is_flagged ? 'text-rose-600' : 'text-emerald-600')}>
                      {transaction.is_flagged ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {transaction.compliance_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Compliance Notes</p>
                      <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                        {transaction.compliance_notes}
                      </p>
                    </div>
                  )}
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {transaction.tags.map(tag => (
                          <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Flag Action */}
              <div className="pb-4">
                <Button
                  variant={transaction.is_flagged ? 'outline' : 'destructive'}
                  className={cn('w-full gap-2', !transaction.is_flagged && 'bg-rose-600 hover:bg-rose-700')}
                  onClick={toggleFlag}
                  disabled={togglingFlag}
                >
                  <Flag className="h-4 w-4" />
                  {togglingFlag
                    ? 'Processing...'
                    : transaction.is_flagged
                      ? 'Remove Flag'
                      : 'Flag Transaction'}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// AdminTransactionsPage
// ---------------------------------------------------------------------------
export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTxn, setSelectedTxn] = useState<AdminTransaction | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(showFlaggedOnly && { flagged: 'true' }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      })
      const res = await api.get(`/admin/transactions?${params}`)
      const d = res.data
      setTransactions(d.data ?? d)
      const tot = d.pagination?.total ?? d.total ?? (d.data ?? d).length
      setTotal(tot)
      setTotalPages(d.pagination?.pages ?? d.totalPages ?? Math.ceil(tot / 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, typeFilter, statusFilter, showFlaggedOnly, dateFrom, dateTo])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, statusFilter, showFlaggedOnly, dateFrom, dateTo])

  const handleFlagToggled = (id: string, flagged: boolean) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_flagged: flagged } : t))
    if (selectedTxn?.id === id) {
      setSelectedTxn(prev => prev ? { ...prev, is_flagged: flagged } : prev)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setShowFlaggedOnly(false)
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'all' || showFlaggedOnly || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Transaction Monitoring</h1>
        <p className="text-muted-foreground mt-1 text-sm">Monitor, review, and flag platform transactions</p>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Row 1 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference or description..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">From</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-9 w-36 text-xs"
                />
                <span className="text-muted-foreground text-xs">To</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="flagged-only" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-rose-500" />
                  Flagged Only
                </Label>
                <Switch
                  id="flagged-only"
                  checked={showFlaggedOnly}
                  onCheckedChange={setShowFlaggedOnly}
                />
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground">
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Transactions
            </CardTitle>
            <span className="text-sm text-muted-foreground">{total.toLocaleString()} total</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 pb-6 space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 text-muted-foreground px-6"
              >
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No transactions found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
                {hasFilters && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Reference</TableHead>
                      <TableHead className="text-xs font-semibold">User</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Risk</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {transactions.map((txn, i) => (
                        <motion.tr
                          key={txn.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: i * 0.035 }}
                          className={cn(
                            'group hover:bg-muted/40 transition-colors cursor-pointer',
                            Number(txn.amount) > 1000 && 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
                          )}
                          onClick={() => setSelectedTxn(txn)}
                        >
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5">
                              {txn.is_flagged && (
                                <Flag className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 fill-rose-500" />
                              )}
                              <span className="text-xs font-mono text-muted-foreground">
                                {(txn.reference_id ?? txn.id).slice(0, 12)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            {txn.user ? (
                              <div>
                                <p className="text-sm font-medium truncate max-w-[130px]">{txn.user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[130px]">{txn.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon type={txn.type} />
                              <span className="text-sm capitalize text-muted-foreground">{txn.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className={cn(
                              'text-sm font-semibold',
                              txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                            )}>
                              {txn.type === 'income' ? '+' : '-'}{formatCurrency(Number(txn.amount), txn.currency)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <TxnStatusBadge status={txn.status} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <RiskScoreIndicator score={txn.risk_score} />
                          </TableCell>
                          <TableCell className="py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(txn.transaction_date)}
                          </TableCell>
                          <TableCell className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={e => {
                                  e.stopPropagation()
                                  setSelectedTxn(txn)
                                }}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 w-8 p-0', txn.is_flagged ? 'text-rose-500 hover:text-rose-600' : 'text-muted-foreground hover:text-rose-500')}
                                onClick={async e => {
                                  e.stopPropagation()
                                  try {
                                    await api.put(`/admin/transactions/${txn.id}/flag`)
                                    handleFlagToggled(txn.id, !txn.is_flagged)
                                  } catch (err) {
                                    console.error(err)
                                  }
                                }}
                                title={txn.is_flagged ? 'Remove flag' : 'Flag transaction'}
                              >
                                <Flag className={cn('h-4 w-4', txn.is_flagged && 'fill-rose-500')} />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && transactions.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onFlagToggled={handleFlagToggled}
      />
    </div>
  )
}
