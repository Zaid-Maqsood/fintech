import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Filter,
  X,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Transaction, Account, TransactionCategory } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'salary', name: 'Salary', type: 'income' },
  { id: 'freelance', name: 'Freelance', type: 'income' },
  { id: 'groceries', name: 'Groceries', type: 'expense' },
  { id: 'utilities', name: 'Utilities', type: 'expense' },
  { id: 'rent', name: 'Rent', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense' },
  { id: 'travel', name: 'Travel', type: 'expense' },
  { id: 'shopping', name: 'Shopping', type: 'expense' },
  { id: 'health', name: 'Health', type: 'expense' },
  { id: 'savings', name: 'Savings', type: 'transfer' },
  { id: 'transfers', name: 'Transfers', type: 'transfer' },
  { id: 'entertainment', name: 'Entertainment', type: 'expense' },
  { id: 'dining', name: 'Dining', type: 'expense' },
  { id: 'other', name: 'Other', type: 'expense' },
] as const

const PAYMENT_METHODS = [
  'bank_transfer',
  'card',
  'cash',
  'crypto',
  'mobile_money',
  'other',
] as const

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function TypeBadge({ type }: { type: Transaction['type'] }) {
  const map = {
    income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    expense: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
        map[type],
      )}
    >
      {type === 'income' ? (
        <ArrowDownLeft className="w-3 h-3" />
      ) : type === 'expense' ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <Send className="w-3 h-3" />
      )}
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    failed: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
        map[status] ?? map.cancelled,
      )}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Detail Sheet
// ---------------------------------------------------------------------------
interface DetailSheetProps {
  txn: Transaction | null
  open: boolean
  onClose: () => void
}

function DetailSheet({ txn, open, onClose }: DetailSheetProps) {
  if (!txn) return null

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Type', value: <TypeBadge type={txn.type} /> },
    {
      label: 'Amount',
      value: (
        <span
          className={cn(
            'font-semibold',
            txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
          )}
        >
          {txn.type === 'income' ? '+' : '-'}
          {formatCurrency(Number(txn.amount), txn.currency)}
        </span>
      ),
    },
    { label: 'Status', value: <StatusBadge status={txn.status} /> },
    { label: 'Category', value: txn.category?.name ?? '—' },
    { label: 'Description', value: txn.description || '—' },
    { label: 'Payment Method', value: txn.payment_method ?? '—' },
    { label: 'Reference ID', value: txn.reference_id ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{txn.reference_id}</code> : '—' },
    { label: 'Transaction Date', value: formatDate(txn.transaction_date) },
    { label: 'Created At', value: formatDate(txn.created_at) },
    {
      label: 'Risk Score',
      value: (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                txn.risk_score <= 30
                  ? 'bg-emerald-500'
                  : txn.risk_score <= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500',
              )}
              style={{ width: `${txn.risk_score}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{txn.risk_score}/100</span>
        </div>
      ),
    },
    {
      label: 'Flagged',
      value: txn.is_flagged ? (
        <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
          <AlertTriangle className="w-3 h-3" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <ShieldCheck className="w-3 h-3" /> No
        </span>
      ),
    },
    {
      label: 'Compliance Notes',
      value: txn.compliance_notes ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{txn.compliance_notes}</p>
      ) : (
        '—'
      ),
    },
  ]

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Transaction Details
          </SheetTitle>
        </SheetHeader>

        {/* Amount hero */}
        <div
          className={cn(
            'rounded-2xl p-6 mb-6 text-center',
            txn.type === 'income'
              ? 'bg-emerald-50 dark:bg-emerald-950/30'
              : txn.type === 'expense'
                ? 'bg-rose-50 dark:bg-rose-950/30'
                : 'bg-blue-50 dark:bg-blue-950/30',
          )}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {txn.type}
          </p>
          <p
            className={cn(
              'text-3xl font-bold',
              txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {txn.type === 'income' ? '+' : '-'}
            {formatCurrency(Number(txn.amount), txn.currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(txn.transaction_date)}
          </p>
        </div>

        {/* Detail rows */}
        <div className="space-y-3">
          {rows.map(({ label, value }, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-4 py-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {label}
                </span>
                <span className="text-sm text-right">{value}</span>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Add Transaction Dialog
// ---------------------------------------------------------------------------
interface AddTxnDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  accounts: Account[]
  serverCategories: TransactionCategory[]
}

interface TxnForm {
  type: 'income' | 'expense' | 'transfer'
  amount: string
  description: string
  category_id: string
  transaction_date: string
  payment_method: string
  account_id: string
  status: 'pending' | 'completed'
}

const defaultForm: TxnForm = {
  type: 'expense',
  amount: '',
  description: '',
  category_id: '',
  transaction_date: new Date().toISOString().split('T')[0],
  payment_method: 'card',
  account_id: '',
  status: 'completed',
}

function AddTxnDialog({ open, onClose, onCreated, accounts, serverCategories }: AddTxnDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<TxnForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof TxnForm, string>>>({})

  // reset on open
  useEffect(() => {
    if (open) {
      setForm({ ...defaultForm, account_id: accounts[0]?.id ?? '' })
      setErrors({})
    }
  }, [open, accounts])

  // Use server categories if available, otherwise fall back to hardcoded list
  const categoryOptions =
    serverCategories.length > 0
      ? serverCategories.filter((c) => c.type === form.type || form.type === 'transfer')
      : CATEGORIES.filter((c) => c.type === form.type || (form.type === 'transfer' && c.type === 'transfer'))

  function validate(): boolean {
    const errs: Partial<Record<keyof TxnForm, string>> = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = 'Enter a valid amount'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.transaction_date) errs.transaction_date = 'Date is required'
    if (!form.account_id) errs.account_id = 'Select an account'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/transactions', {
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim(),
        category_id: form.category_id || null,
        transaction_date: form.transaction_date,
        payment_method: form.payment_method,
        account_id: form.account_id,
        status: form.status,
      })
      toast({ title: 'Transaction added', description: 'Your transaction has been recorded.' })
      onCreated()
      onClose()
    } catch (e: any) {
      toast({
        title: 'Failed to add transaction',
        description: e?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof TxnForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['income', 'expense', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { set('type', t); set('category_id', '') }}
                  className={cn(
                    'py-2 rounded-lg text-xs font-medium border transition-all capitalize',
                    form.type === t
                      ? t === 'income'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : t === 'expense'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-blue-600 text-white border-blue-600'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={cn('pl-7', errors.amount && 'border-rose-500')}
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <Textarea
              placeholder="e.g. Monthly rent payment"
              rows={2}
              className={cn('resize-none', errors.description && 'border-rose-500')}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
            {errors.description && (
              <p className="text-xs text-rose-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Category + Account row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Category
              </label>
              <Select value={form.category_id} onValueChange={(v) => set('category_id', v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Account
              </label>
              <Select
                value={form.account_id}
                onValueChange={(v) => set('account_id', v)}
              >
                <SelectTrigger className={cn('text-sm', errors.account_id && 'border-rose-500')}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_id && (
                <p className="text-xs text-rose-500 mt-1">{errors.account_id}</p>
              )}
            </div>
          </div>

          {/* Date + Payment Method row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Date
              </label>
              <Input
                type="date"
                className={cn('text-sm', errors.transaction_date && 'border-rose-500')}
                value={form.transaction_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => set('transaction_date', e.target.value)}
              />
              {errors.transaction_date && (
                <p className="text-xs text-rose-500 mt-1">{errors.transaction_date}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Payment Method
              </label>
              <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Status
            </label>
            <Select value={form.status} onValueChange={(v) => set('status', v as TxnForm['status'])}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </span>
            ) : (
              'Add Transaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------
interface DeleteDialogProps {
  txn: Transaction | null
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

function DeleteDialog({ txn, open, onClose, onDeleted }: DeleteDialogProps) {
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!txn) return
    setDeleting(true)
    try {
      await api.delete(`/transactions/${txn.id}`)
      toast({ title: 'Transaction deleted' })
      onDeleted()
      onClose()
    } catch (e: any) {
      toast({
        title: 'Failed to delete',
        description: e?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Trash2 className="w-5 h-5" />
            Delete Transaction
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">
            {txn?.description || 'this transaction'}
          </span>
          ? This action cannot be undone.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Table skeleton rows
// ---------------------------------------------------------------------------
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TransactionsPage() {
  const { toast } = useToast()

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [serverCategories, setServerCategories] = useState<TransactionCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)

  // UI state
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTxn, setDeleteTxn] = useState<Transaction | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // -------------------------------------------------------------------------
  // Fetch transactions
  // -------------------------------------------------------------------------
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      params.set('sort', 'desc')
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)

      const res = await api.get(`/transactions?${params.toString()}`)
      const payload = res.data
      if (Array.isArray(payload)) {
        setTransactions(payload)
        setTotal(payload.length)
      } else {
        setTransactions(payload.data ?? [])
        setTotal(payload.pagination?.total ?? payload.total ?? 0)
      }
    } catch (e: any) {
      toast({
        title: 'Failed to load transactions',
        description: e?.response?.data?.message ?? 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, statusFilter, dateFrom, dateTo, categoryFilter, toast])

  // Initial metadata fetch
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/transactions/categories').catch(() => ({ data: [] })),
        ])
        setAccounts(accRes.data ?? [])
        setServerCategories(catRes.data ?? [])
      } catch {
        // non-fatal
      }
    }
    loadMeta()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, statusFilter, dateFrom, dateTo, categoryFilter])

  function clearFilters() {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setCategoryFilter('all')
    setPage(1)
  }

  const hasFilters =
    search || typeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || categoryFilter !== 'all'

  function openDetail(txn: Transaction) {
    setDetailTxn(txn)
    setDetailOpen(true)
  }

  function openDelete(txn: Transaction, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteTxn(txn)
    setDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total.toLocaleString()} transaction{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions…"
                  className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 bg-muted/50 border-0 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-muted/50 border-0 text-sm">
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

              {/* Category filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-muted/50 border-0 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="w-36 bg-muted/50 border-0 text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  className="w-36 bg-muted/50 border-0 text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Clear filters */}
              <AnimatePresence>
                {hasFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active filter pills */}
            <AnimatePresence>
              {hasFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border"
                >
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Active filters:
                  </span>
                  {search && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setSearch('')}>
                      Search: "{search}" <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  {typeFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1 capitalize cursor-pointer" onClick={() => setTypeFilter('all')}>
                      {typeFilter} <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1 capitalize cursor-pointer" onClick={() => setStatusFilter('all')}>
                      {statusFilter} <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  {categoryFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setCategoryFilter('all')}>
                      {CATEGORIES.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}{' '}
                      <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  {dateFrom && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setDateFrom('')}>
                      From: {dateFrom} <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setDateTo('')}>
                      To: {dateTo} <X className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                                */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Description</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                  Amount
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 opacity-50" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">No transactions found</p>
                        <p className="text-xs mt-0.5">
                          {hasFilters ? 'Try adjusting your filters' : 'Add your first transaction to get started'}
                        </p>
                      </div>
                      {hasFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-3.5 h-3.5" /> Add Transaction
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn, i) => (
                  <TableRow
                    key={txn.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/10',
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    )}
                    onClick={() => openDetail(txn)}
                  >
                    {/* Date */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-xs">
                          {formatDate(txn.transaction_date)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(txn.transaction_date)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <div className="flex items-center gap-2.5 max-w-xs">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            txn.type === 'income'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : txn.type === 'expense'
                                ? 'bg-rose-100 dark:bg-rose-950/50'
                                : 'bg-blue-100 dark:bg-blue-950/50',
                          )}
                        >
                          {txn.type === 'income' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                          ) : txn.type === 'expense' ? (
                            <ArrowUpRight className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Send className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {txn.description || txn.category?.name || 'Transaction'}
                          </p>
                          {txn.is_flagged && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-rose-500">
                              <AlertTriangle className="w-2.5 h-2.5" /> Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {txn.category?.name ?? '—'}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <TypeBadge type={txn.type} />
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-semibold text-sm',
                          txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {txn.type === 'income' ? '+' : '-'}
                        {formatCurrency(Number(txn.amount), txn.currency)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={txn.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(txn)
                          }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                          onClick={(e) => openDelete(txn, e)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && transactions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                {total.toLocaleString()} results
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (page <= 4) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = page - 3 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className={cn(
                        'h-8 w-8 text-xs',
                        page === pageNum && 'bg-blue-600 hover:bg-blue-700 border-blue-600',
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Panels / Dialogs                                                     */}
      {/* ------------------------------------------------------------------ */}
      <DetailSheet
        txn={detailTxn}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <AddTxnDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchTransactions}
        accounts={accounts}
        serverCategories={serverCategories}
      />

      <DeleteDialog
        txn={deleteTxn}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={fetchTransactions}
      />
    </div>
  )
}
